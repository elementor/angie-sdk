import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { AppState } from './config';
import { appState } from './config';
import { createAngieInstance, resetInstancesForTests } from './instance-registry';
import {
	bindAngieTriggerChannel,
	flushPendingSdkMessages,
	registerSdkInstance,
	resetTriggerChannelsForTests,
	startSdkMessageRouting,
	triggerAngieOnInstance,
	unregisterSdkInstance,
} from './sdk';
import { MessageEventType } from './types';

const ANGIE_ORIGIN = 'https://angie.elementor.com';

const registeredInstances: AppState[] = [];

const registerForRouting = ( instance: AppState ): void => {
	registerSdkInstance( instance );
	registeredInstances.push( instance );
	startSdkMessageRouting();
};

const attachIframe = ( instance: AppState ) => {
	const postMessage = jest.fn();
	instance.iframeUrlObject = new URL( `${ ANGIE_ORIGIN }/angie/embedded` );
	instance.iframe = { contentWindow: { postMessage } } as unknown as HTMLIFrameElement;
	return postMessage;
};

const latestTriggerPort = (): { postMessage: jest.Mock } => {
	const results = ( global.MessageChannel as jest.Mock ).mock.results;
	const channel = results[ results.length - 1 ]?.value as { port1: { postMessage: jest.Mock } };

	return channel.port1;
};

const emitHostMessage = ( data: unknown ): void => {
	window.dispatchEvent( Object.assign( new Event( 'message' ), {
		origin: window.location.origin,
		source: window,
		data,
		ports: [ { postMessage: jest.fn() } ],
	} ) );
};

const emitIframeMessage = ( instance: AppState, data: unknown ): void => {
	window.dispatchEvent( Object.assign( new Event( 'message' ), {
		origin: instance.iframeUrlObject?.origin,
		source: instance.iframe?.contentWindow,
		data,
	} ) );
};

describe( 'sdk', () => {
	beforeEach( () => {
		resetInstancesForTests();
		jest.clearAllMocks();
	} );

	afterEach( () => {
		for ( const instance of registeredInstances.splice( 0 ) ) {
			unregisterSdkInstance( instance );
		}

		resetTriggerChannelsForTests();
	} );

	it( 'should forward a window trigger to the matching iframe', () => {
		const first = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'aaaaaa',
			layout: 'sidebar',
		} );
		const second = createAngieInstance( {
			containerId: 'container-b',
			instanceId: 'bbbbbb',
			layout: 'floatingChat',
		} );
		const firstPostMessage = attachIframe( first );
		const secondPostMessage = attachIframe( second );

		registerForRouting( first );
		registerForRouting( second );
		emitHostMessage( {
			type: MessageEventType.SDK_TRIGGER_ANGIE,
			payload: { instanceId: 'aaaaaa', requestId: 'req-2', prompt: 'hello' },
		} );

		expect( firstPostMessage ).toHaveBeenCalledWith(
			expect.objectContaining( { type: MessageEventType.SDK_TRIGGER_ANGIE } ),
			ANGIE_ORIGIN,
		);
		expect( secondPostMessage ).not.toHaveBeenCalled();
	} );

	it( 'should not open a trigger port for sdk-angie-ready-listener', () => {
		const instance = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'aaaaaa',
			layout: 'sidebar',
		} );
		const postMessage = attachIframe( instance );

		registerForRouting( instance );
		emitIframeMessage( instance, { type: MessageEventType.SDK_ANGIE_READY_LISTENER } );
		emitHostMessage( {
			type: MessageEventType.SDK_ANGIE_READY_LISTENER,
			payload: { instanceId: 'aaaaaa' },
		} );

		expect( postMessage ).not.toHaveBeenCalled();
	} );

	it( 'should send a trigger only on the private port of the addressed instance', () => {
		const first = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'aaaaaa',
			layout: 'sidebar',
		} );
		const second = createAngieInstance( {
			containerId: 'container-b',
			instanceId: 'bbbbbb',
			layout: 'floatingChat',
		} );
		const firstPostMessage = attachIframe( first );
		const secondPostMessage = attachIframe( second );
		bindAngieTriggerChannel( first );

		const response = triggerAngieOnInstance( first, {
			requestId: 'req-2',
			instanceId: 'aaaaaa',
			prompt: 'hello',
		} );

		expect( response ).toEqual( {
			success: true,
			requestId: 'req-2',
			response: 'Angie triggered successfully',
		} );
		expect( firstPostMessage ).toHaveBeenCalledTimes( 1 );
		expect( firstPostMessage ).toHaveBeenCalledWith(
			expect.objectContaining( { type: MessageEventType.SDK_INIT_TRIGGER_ANGIE } ),
			ANGIE_ORIGIN,
			expect.any( Array ),
		);
		expect( secondPostMessage ).not.toHaveBeenCalled();
		expect( latestTriggerPort().postMessage ).toHaveBeenCalledWith(
			expect.objectContaining( {
				type: MessageEventType.SDK_TRIGGER_ANGIE,
				payload: expect.objectContaining( { prompt: 'hello', instanceId: 'aaaaaa' } ),
			} ),
		);
	} );

	it( 'should relay a context attachment unchanged on the private port', () => {
		const instance = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'aaaaaa',
			layout: 'sidebar',
		} );
		attachIframe( instance );
		bindAngieTriggerChannel( instance );
		const contextAttachment = {
			label: 'Selected error',
			content: 'Checkout failed with error code PAYMENT_DECLINED.',
		};

		triggerAngieOnInstance( instance, {
			requestId: 'request-123',
			instanceId: 'aaaaaa',
			contextAttachment,
		} );

		const relayedMessage = latestTriggerPort().postMessage.mock.calls[ 0 ][ 0 ] as {
			payload: {
				contextAttachment?: typeof contextAttachment;
				prompt?: string;
			};
		};

		expect( relayedMessage.payload.contextAttachment ).toBe( contextAttachment );
		expect( relayedMessage.payload.prompt ).toBeUndefined();
	} );

	it( 'should relay conversation-starter suggestions on the private port', () => {
		const instance = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'aaaaaa',
			layout: 'sidebar',
		} );
		attachIframe( instance );
		bindAngieTriggerChannel( instance );
		const suggestions = { items: [ { label: 'Make it longer', value: 'Make it longer' } ] };

		triggerAngieOnInstance( instance, {
			requestId: 'request-123',
			instanceId: 'aaaaaa',
			suggestions,
		} );

		const relayedMessage = latestTriggerPort().postMessage.mock.calls[ 0 ][ 0 ] as {
			payload: { suggestions?: typeof suggestions };
		};

		expect( relayedMessage.payload.suggestions ).toBe( suggestions );
	} );

	it( 'should reuse the same port for a second trigger', () => {
		const instance = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'aaaaaa',
			layout: 'sidebar',
		} );
		const postMessage = attachIframe( instance );
		bindAngieTriggerChannel( instance );

		triggerAngieOnInstance( instance, { requestId: 'req-1', instanceId: 'aaaaaa', prompt: 'one' } );
		triggerAngieOnInstance( instance, { requestId: 'req-2', instanceId: 'aaaaaa', prompt: 'two' } );

		expect( postMessage ).toHaveBeenCalledTimes( 1 );
		expect( latestTriggerPort().postMessage ).toHaveBeenCalledTimes( 2 );
	} );

	it( 'should report failure when the iframe is missing', () => {
		const instance = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'aaaaaa',
			layout: 'sidebar',
		} );

		const response = triggerAngieOnInstance( instance, {
			requestId: 'req-missing',
			instanceId: 'aaaaaa',
			prompt: 'hello',
		} );

		expect( response ).toEqual( {
			success: false,
			requestId: 'req-missing',
			error: 'Iframe not found',
		} );
	} );

	it( 'should not forward client creation to a sibling while the addressed instance is still booting', () => {
		const first = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'aaaaaa',
			layout: 'sidebar',
		} );
		const second = createAngieInstance( {
			containerId: 'container-b',
			instanceId: 'bbbbbb',
			layout: 'floatingChat',
		} );
		const firstPostMessage = attachIframe( first );

		registerForRouting( first );
		registerForRouting( second );
		emitHostMessage( {
			type: MessageEventType.SDK_REQUEST_CLIENT_CREATION,
			payload: {
				instanceId: 'bbbbbb',
				serverId: 'server-1',
				serverName: 'Test Server',
				description: 'A test server',
				serverVersion: '1.0.0',
				transport: 'postMessage',
				requestId: 'req-1',
			},
		} );

		expect( firstPostMessage ).not.toHaveBeenCalled();
	} );

	it( 'should forward buffered client creation after the iframe appears', () => {
		const instance = createAngieInstance( {
			containerId: 'container-b',
			instanceId: 'bbbbbb',
			layout: 'floatingChat',
		} );

		registerForRouting( instance );
		emitHostMessage( {
			type: MessageEventType.SDK_REQUEST_CLIENT_CREATION,
			payload: {
				instanceId: 'bbbbbb',
				serverId: 'server-1',
				serverName: 'Test Server',
				description: 'A test server',
				serverVersion: '1.0.0',
				transport: 'postMessage',
				requestId: 'req-1',
			},
		} );

		const postMessage = attachIframe( instance );
		flushPendingSdkMessages( instance );

		expect( postMessage ).toHaveBeenCalledWith(
			expect.objectContaining( { type: MessageEventType.SDK_REQUEST_CLIENT_CREATION } ),
			ANGIE_ORIGIN,
			expect.any( Array ),
		);
	} );

	it( 'should not double-forward when registerSdkInstance is called twice for the same instance', () => {
		const instance = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'aaaaaa',
			layout: 'sidebar',
		} );
		const postMessage = attachIframe( instance );

		registerForRouting( instance );
		registerSdkInstance( instance );
		emitHostMessage( {
			type: MessageEventType.SDK_REQUEST_CLIENT_CREATION,
			payload: {
				instanceId: 'aaaaaa',
				serverId: 'server-1',
				serverName: 'Test Server',
				description: 'A test server',
				serverVersion: '1.0.0',
				transport: 'postMessage',
				requestId: 'req-2',
			},
		} );

		expect( postMessage ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'should forward unaddressed host messages for V1 loadSidebar when the registry is empty', () => {
		appState.instanceId = 'v1-id';
		const postMessage = attachIframe( appState );

		registerForRouting( appState );
		emitHostMessage( {
			type: MessageEventType.SDK_REQUEST_CLIENT_CREATION,
			payload: {
				serverId: 'server-1',
				serverName: 'Test Server',
				description: 'A test server',
				serverVersion: '1.0.0',
				transport: 'postMessage',
				requestId: 'req-v1',
			},
		} );

		expect( postMessage ).toHaveBeenCalledWith(
			expect.objectContaining( { type: MessageEventType.SDK_REQUEST_CLIENT_CREATION } ),
			ANGIE_ORIGIN,
			expect.any( Array ),
		);
	} );

	it( 'should stop routing to an unregistered instance while siblings keep listening', () => {
		const first = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'aaaaaa',
			layout: 'sidebar',
		} );
		const second = createAngieInstance( {
			containerId: 'container-b',
			instanceId: 'bbbbbb',
			layout: 'floatingChat',
		} );
		const firstPostMessage = attachIframe( first );
		const secondPostMessage = attachIframe( second );

		registerForRouting( first );
		registerForRouting( second );
		unregisterSdkInstance( first );
		registeredInstances.splice( registeredInstances.indexOf( first ), 1 );
		emitHostMessage( {
			type: MessageEventType.SDK_REQUEST_CLIENT_CREATION,
			payload: {
				instanceId: 'aaaaaa',
				serverId: 'server-1',
				serverName: 'Test Server',
				description: 'A test server',
				serverVersion: '1.0.0',
				transport: 'postMessage',
				requestId: 'req-2',
			},
		} );
		emitHostMessage( {
			type: MessageEventType.SDK_REQUEST_CLIENT_CREATION,
			payload: {
				instanceId: 'bbbbbb',
				serverId: 'server-1',
				serverName: 'Test Server',
				description: 'A test server',
				serverVersion: '1.0.0',
				transport: 'postMessage',
				requestId: 'req-3',
			},
		} );

		expect( firstPostMessage ).not.toHaveBeenCalled();
		expect( secondPostMessage ).toHaveBeenCalledWith(
			expect.objectContaining( { type: MessageEventType.SDK_REQUEST_CLIENT_CREATION } ),
			ANGIE_ORIGIN,
			expect.any( Array ),
		);
	} );

	it( 'should stop routing after unregisterSdkInstance removes the last instance', () => {
		const instance = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'aaaaaa',
			layout: 'sidebar',
		} );
		const postMessage = attachIframe( instance );

		registerForRouting( instance );
		unregisterSdkInstance( instance );
		registeredInstances.length = 0;
		emitHostMessage( {
			type: MessageEventType.SDK_REQUEST_CLIENT_CREATION,
			payload: {
				instanceId: 'aaaaaa',
				serverId: 'server-1',
				serverName: 'Test Server',
				description: 'A test server',
				serverVersion: '1.0.0',
				transport: 'postMessage',
				requestId: 'req-2',
			},
		} );

		expect( postMessage ).not.toHaveBeenCalled();
	} );

	it( 'should hand a replaced iframe a fresh port', () => {
		const instance = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'aaaaaa',
			layout: 'sidebar',
		} );
		const firstPostMessage = attachIframe( instance );
		bindAngieTriggerChannel( instance );

		triggerAngieOnInstance( instance, { requestId: 'req-1', instanceId: 'aaaaaa', prompt: 'one' } );

		const secondPostMessage = attachIframe( instance );
		bindAngieTriggerChannel( instance );

		triggerAngieOnInstance( instance, { requestId: 'req-2', instanceId: 'aaaaaa', prompt: 'two' } );

		expect( firstPostMessage ).toHaveBeenCalledTimes( 1 );
		expect( secondPostMessage ).toHaveBeenCalledTimes( 1 );
		expect( secondPostMessage ).toHaveBeenCalledWith(
			expect.objectContaining( { type: MessageEventType.SDK_INIT_TRIGGER_ANGIE } ),
			ANGIE_ORIGIN,
			expect.any( Array ),
		);
	} );

	it( 'should report failure when the private port send throws', () => {
		const instance = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'aaaaaa',
			layout: 'sidebar',
		} );
		attachIframe( instance );
		( global.MessageChannel as jest.Mock ).mockImplementationOnce( () => ( {
			port1: {
				postMessage: () => {
					throw new Error( 'port failed' );
				},
				close: jest.fn(),
				start: jest.fn(),
			},
			port2: { postMessage: jest.fn(), close: jest.fn(), start: jest.fn() },
		} ) );
		bindAngieTriggerChannel( instance );

		const response = triggerAngieOnInstance( instance, {
			requestId: 'req-throw',
			instanceId: 'aaaaaa',
			prompt: 'hello',
		} );

		expect( response ).toEqual( {
			success: false,
			requestId: 'req-throw',
			error: 'port failed',
		} );
	} );
} );
