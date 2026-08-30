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
	instanceId?: string;
}

const pendingMessages = new Map<AppState, Array<() => void>>();
let listeningInstances = new WeakSet<AppState>();
const registeredListeners: Array<( event: MessageEvent ) => void> = [];

export const flushPendingSdkMessages = ( instance: AppState ): void => {
	const queued = pendingMessages.get( instance );

	if ( ! queued?.length ) {
		return;
	}

	pendingMessages.delete( instance );
	queued.forEach( ( send ) => send() );
};

export const resetSdkListenersForTests = (): void => {
	for ( const listener of registeredListeners ) {
		window.removeEventListener( 'message', listener );
	}

	registeredListeners.length = 0;
	pendingMessages.clear();
	listeningInstances = new WeakSet<AppState>();
};

const queueOrRun = ( instance: AppState, send: () => void ): void => {
	if ( instance.iframe ) {
		send();
		return;
	}

	let queue = pendingMessages.get( instance );

	if ( ! queue ) {
		queue = [];
		pendingMessages.set( instance, queue );
	}

	queue.push( send );
};

export const listenToSDK = ( instance: AppState ) => {
	if ( listeningInstances.has( instance ) ) {
		return;
	}

	listeningInstances.add( instance );

	const listener = async ( event: MessageEvent ) => {
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
				if ( ! shouldInstanceHandle( instance, event?.data?.payload?.instanceId ) ) {
					break;
				}

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
				const responsePort = event.ports[ 0 ];

				queueOrRun( instance, () => {
					try {
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
				} );
				break;
			}
			case MessageEventType.SDK_TRIGGER_ANGIE: {
				if ( ! shouldHandleMessage ) {
					break;
				}

				sdkLogger.log( 'SDK Trigger Angie received', event.data );

				// Not buffered like client creation: the caller is blocked on a
				// timeout, and on mobile no iframe is ever opened, so a queued
				// trigger would stall instead of reporting the failure.
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
	};

	registeredListeners.push( listener );
	window.addEventListener( 'message', listener );
};
