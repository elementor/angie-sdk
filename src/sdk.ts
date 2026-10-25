import { createChildLogger } from './logger';
import { isTrustedIframeMessage, sendSuccessMessage } from './utils';
import { ServerCapabilities } from '@modelcontextprotocol/sdk/types.js';
import { AngieTriggerRequest, AngieTriggerResponse, MessageEventType } from './types';
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
const routingInstances: AppState[] = [];
let routingListener: ( ( event: MessageEvent ) => void ) | null = null;

type TriggerChannel = {
	iframe: HTMLIFrameElement;
	port: MessagePort;
};

const triggerChannels = new Map<AppState, TriggerChannel>();

const DEFAULT_TRIGGER_TIMEOUT_MS = 30000;

export type AngieTriggerDelivery = {
	requestId: string;
	instanceId: string;
	prompt?: string;
	context?: AngieTriggerRequest[ 'context' ];
	contextAttachment?: AngieTriggerRequest[ 'contextAttachment' ];
	suggestions?: AngieTriggerRequest[ 'suggestions' ];
	options?: AngieTriggerRequest[ 'options' ];
	metadata?: AngieTriggerRequest[ 'metadata' ];
};

const closeTriggerChannel = ( instance: AppState ): void => {
	const channel = triggerChannels.get( instance );

	if ( ! channel ) {
		return;
	}

	channel.port.close();
	triggerChannels.delete( instance );
};

export const resetTriggerChannelsForTests = (): void => {
	for ( const instance of triggerChannels.keys() ) {
		closeTriggerChannel( instance );
	}
};

export const bindAngieTriggerChannel = ( instance: AppState ): MessagePort | null => {
	const iframe = instance.iframe;
	const origin = instance.iframeUrlObject?.origin;

	if ( ! iframe?.contentWindow || ! origin ) {
		return null;
	}

	const current = triggerChannels.get( instance );

	if ( current?.iframe === iframe ) {
		return current.port;
	}

	closeTriggerChannel( instance );

	const channel = new MessageChannel();
	triggerChannels.set( instance, { iframe, port: channel.port1 } );

	try {
		iframe.contentWindow.postMessage( {
			type: MessageEventType.SDK_INIT_TRIGGER_ANGIE,
			payload: { instanceId: instance.instanceId },
			timestamp: Date.now(),
		}, origin, [ channel.port2 ] );
	} catch ( error ) {
		closeTriggerChannel( instance );
		throw error;
	}

	return channel.port1;
};

export const triggerAngieOnInstance = (
	instance: AppState,
	payload: AngieTriggerDelivery,
): Promise<AngieTriggerResponse> => {
	const port = triggerChannels.get( instance )?.port;

	if ( ! port ) {
		return Promise.resolve( {
			success: false,
			requestId: payload.requestId,
			error: 'Iframe not found',
		} );
	}

	const timeout = payload.options?.timeout ?? DEFAULT_TRIGGER_TIMEOUT_MS;

	return new Promise( ( resolve, reject ) => {
		const previous = port.onmessage;

		const onResponse = ( event: MessageEvent ) => {
			if ( event.data?.type !== MessageEventType.SDK_TRIGGER_ANGIE_RESPONSE ||
				event.data?.payload?.requestId !== payload.requestId ) {
				previous?.call( port, event );
				return;
			}

			clearTimeout( timeoutId );
			if ( port.onmessage === onResponse ) {
				port.onmessage = previous;
			}
			resolve( event.data.payload as AngieTriggerResponse );
		};

		const timeoutId = setTimeout( () => {
			if ( port.onmessage === onResponse ) {
				port.onmessage = previous;
			}
			reject( new Error( 'Angie trigger request timed out' ) );
		}, timeout );

		port.onmessage = onResponse;

		try {
			port.postMessage( {
				type: MessageEventType.SDK_TRIGGER_ANGIE,
				payload,
				timestamp: Date.now(),
			} );
		} catch ( error ) {
			clearTimeout( timeoutId );
			if ( port.onmessage === onResponse ) {
				port.onmessage = previous;
			}
			sdkLogger.error( 'Failed to trigger Angie:', error );

			resolve( {
				success: false,
				requestId: payload.requestId,
				error: error instanceof Error ? error.message : 'Unknown error',
			} );
		}
	} );
};

export const flushPendingSdkMessages = ( instance: AppState ): void => {
	startSdkMessageRouting();

	const queued = pendingMessages.get( instance );

	if ( ! queued?.length ) {
		return;
	}

	pendingMessages.delete( instance );
	queued.forEach( ( send ) => send() );
};

export const unregisterSdkInstance = ( instance: AppState ): void => {
	const index = routingInstances.indexOf( instance );

	if ( index !== -1 ) {
		routingInstances.splice( index, 1 );
	}

	pendingMessages.delete( instance );
	closeTriggerChannel( instance );

	if ( routingInstances.length === 0 && routingListener ) {
		window.removeEventListener( 'message', routingListener );
		routingListener = null;
	}
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

const resolveTarget = ( event: MessageEvent ): AppState | null => {
	if ( event.origin === window.location.origin ) {
		return routingInstances.find(
			( instance ) => shouldInstanceHandle( instance, event?.data?.payload?.instanceId )
		) ?? null;
	}

	const instance = routingInstances.find(
		( candidate ) => candidate.iframe?.contentWindow === event.source
	);

	if ( ! instance || ! isTrustedIframeMessage(
		event,
		instance.iframeUrlObject?.origin,
		instance.iframe,
	) ) {
		return null;
	}

	return instance;
};

export const startSdkMessageRouting = (): void => {
	if ( routingInstances.length === 0 || routingListener ) {
		return;
	}

	routingListener = ( event: MessageEvent ) => {
		const target = resolveTarget( event );

		if ( ! target ) {
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
				const responsePort = event.ports[ 0 ];

				queueOrRun( target, () => {
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
						target.iframe?.contentWindow?.postMessage( message, target.iframeUrlObject?.origin || '', [ channel.port2 ] );
					} catch ( error ) {
						sdkLogger.error( `Failed to create client for SDK server "${ payload.serverName }":`, error );
					}
				} );
				break;
			}
			case MessageEventType.SDK_TRIGGER_ANGIE: {
				sdkLogger.log( 'SDK Trigger Angie received', event.data );

				// Not buffered like client creation: the caller is blocked on a
				// timeout, and on mobile no iframe is ever opened, so a queued
				// trigger would stall instead of reporting the failure.
				try {
					const { requestId, prompt, context, contextAttachment, suggestions, options } = event.data.payload;

					if ( target.iframe ) {
						target.iframe.contentWindow?.postMessage( {
							type: MessageEventType.SDK_TRIGGER_ANGIE,
							payload: {
								requestId,
								prompt,
								context,
								contextAttachment,
								suggestions,
								options,
							},
						}, target.iframeUrlObject?.origin || '' );
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

	window.addEventListener( 'message', routingListener );
};

export const registerSdkInstance = ( instance: AppState ): void => {
	if ( routingInstances.includes( instance ) ) {
		return;
	}

	routingInstances.push( instance );
};
