import { createChildLogger } from './logger';
import { isTrustedIframeMessage, sendSuccessMessage } from './utils';
import { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';
import { MessageEventType } from './types';
import { AppState } from './config';
import { shouldInstanceHandle } from './instance-registry';

const sdkLogger = createChildLogger( 'sdk' );

export enum AngieMCPTransport {
	POST_MESSAGE = 'postMessage',
  }

export interface ClientCreationRequest {
	serverId: string;
	serverName: string;
	description: string;
	serverVersion: string;
	transport: AngieMCPTransport;
	capabilities?: ServerCapabilities;
}

export const listenToSDK = ( instance: AppState ) => {
	// Access global timing instance for SDK performance tracking
	window.addEventListener( 'message', async ( event ) => {
		const isSameOrigin = event.origin === window.location.origin;
		const isIframe = isTrustedIframeMessage(
			event,
			instance.iframeUrlObject?.origin,
			instance.iframe,
		);
		if ( ! isSameOrigin && ! isIframe ) {
			return;
		}

		// Host messages share event.source, so route them by instanceId.
		const shouldHandleMessage = shouldInstanceHandle(
			instance,
			event?.data?.payload?.instanceId
		);

		switch ( event?.data?.type ) {
			case MessageEventType.SDK_ANGIE_ALL_SERVERS_REGISTERED:
				break;

			case MessageEventType.SDK_ANGIE_READY_PING: {
				const port = event.ports[ 0 ];
				sdkLogger.log( 'Angie is ready', event );

				sendSuccessMessage( port, {
					message: 'Angie is ready',
				} );

				break;
			}
			case MessageEventType.SDK_REQUEST_CLIENT_CREATION: {
				if ( ! shouldHandleMessage ) {
					break;
				}

				const payload = event.data.payload as ClientCreationRequest;

				try {
					const responsePort = event.ports[ 0 ];
					// Create a new channel for host <-> iframe communication
					const channel = new MessageChannel();
					channel.port1.onmessage = ( portEvent: MessageEvent ) => {
						responsePort.postMessage( {
							success: true,
							data: portEvent.data,
						} );
					};

					const message = {
						type: MessageEventType.SDK_REQUEST_CLIENT_CREATION,
						payload: {
							success: true,
							...payload,
							clientId: `dynamic-client-${ payload.serverName }-${ payload.serverVersion }`,
							requestId: event.data.payload.requestId,
						},
						timestamp: Date.now(),
					};
					if ( instance.iframe ) {
						instance.iframe.contentWindow?.postMessage( message, instance.iframeUrlObject?.origin || '', [ channel.port2 ] );
					} else {
						throw new Error( 'Iframe not found' );
					}
				} catch ( error ) {
					sdkLogger.error( `Failed to create client for SDK server "${ payload.serverName }":`, error );
				}
				break;
			}
			case MessageEventType.SDK_TRIGGER_ANGIE: {
				if ( ! shouldHandleMessage ) {
					break;
				}

				sdkLogger.log( 'SDK Trigger Angie received', event.data );

				try {
					const { requestId, prompt, context, options } = event.data.payload;

					if ( instance.iframe ) {
						instance.iframe.contentWindow?.postMessage( {
							type: MessageEventType.SDK_TRIGGER_ANGIE,
							payload: {
								requestId,
								prompt,
								context,
								options,
							},
						}, instance.iframeUrlObject?.origin || '' );
					} else {
						throw new Error( 'Iframe not found' );
					}

					window.postMessage( {
						type: MessageEventType.SDK_TRIGGER_ANGIE_RESPONSE,
						payload: {
							success: true,
							requestId,
							response: 'Angie triggered successfully',
						},
					}, window.location.origin );
				} catch ( error ) {
					sdkLogger.error( 'Failed to trigger Angie:', error );

					window.postMessage( {
						type: MessageEventType.SDK_TRIGGER_ANGIE_RESPONSE,
						payload: {
							success: false,
							requestId: event.data.payload?.requestId,
							error: error instanceof Error ? error.message : 'Unknown error',
						},
					}, window.location.origin );
				}
				break;
			}
		}
	} );
};
