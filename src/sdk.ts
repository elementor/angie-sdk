import { createChildLogger } from './logger';
import { sendSuccessMessage } from './utils';
import { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';
import { MessageEventType } from './iframe';
import { AppState } from './config';

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

export const listenToSDK = ( appState: AppState ) => {
	// Access global timing instance for SDK performance tracking
	window.addEventListener( 'message', async ( event ) => {
		const isSameOrigin = event.origin === window.location.origin;
		const isIframe = event.origin === appState.iframeUrlObject?.origin;
		if ( ! isSameOrigin && ! isIframe ) {
			return;
		}

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
							clientId: `dynamic-client-${ payload.serverName }-${ payload.serverVersion }-${ Date.now() }`,
							requestId: event.data.payload.requestId,
						},
						timestamp: Date.now(),
					};
					if ( appState.iframe ) {
						appState.iframe.contentWindow?.postMessage( message, appState.iframeUrlObject?.origin || '', [ channel.port2 ] );
					} else {
						throw new Error( 'Iframe not found' );
					}
				} catch ( error ) {
					sdkLogger.error( `Failed to create client for SDK server "${ payload.serverName }":`, error );
				}
				break;
			}
			case MessageEventType.SDK_TRIGGER_ANGIE: {

				sdkLogger.log( 'SDK Trigger Angie received', event.data );

				try {
					const { requestId, prompt, context } = event.data.payload;

					if ( appState.iframe ) {
						appState.iframe.contentWindow?.postMessage( {
							type: MessageEventType.SDK_TRIGGER_ANGIE,
							payload: {
								requestId,
								prompt,
								context,
							},
						}, appState.iframeUrlObject?.origin || '' );
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
