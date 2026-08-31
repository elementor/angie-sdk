import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { AppState } from './config';
import { appState } from './config';
import { createAngieInstance, resetInstancesForTests } from './instance-registry';
import {
	flushPendingSdkMessages,
	registerSdkInstance,
	startSdkMessageRouting,
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

const emitHostMessage = ( data: unknown ): void => {
	window.dispatchEvent( Object.assign( new Event( 'message' ), {
		origin: window.location.origin,
		source: window,
		data,
		ports: [ { postMessage: jest.fn() } ],
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
	} );

	it( 'should forward a trigger request only to the addressed instance', () => {
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

	it( 'should relay a context attachment unchanged to the Angie iframe', () => {
		const instance = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'aaaaaa',
			layout: 'sidebar',
		} );
		const postMessage = attachIframe( instance );
		const contextAttachment = {
			label: 'Selected error',
			content: 'Checkout failed with error code PAYMENT_DECLINED.',
		};

		registerForRouting( instance );
		emitHostMessage( {
			type: MessageEventType.SDK_TRIGGER_ANGIE,
			payload: {
				instanceId: 'aaaaaa',
				requestId: 'request-123',
				contextAttachment,
			},
		} );

		const relayedMessage = postMessage.mock.calls[ 0 ][ 0 ] as {
			payload: {
				contextAttachment?: typeof contextAttachment;
				prompt?: string;
			};
		};

		expect( relayedMessage.payload.contextAttachment ).toBe( contextAttachment );
		expect( relayedMessage.payload.prompt ).toBeUndefined();
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
			type: MessageEventType.SDK_TRIGGER_ANGIE,
			payload: { instanceId: 'aaaaaa', requestId: 'req-2', prompt: 'hello' },
		} );

		expect( postMessage ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'should forward unaddressed host messages for V1 loadSidebar when the registry is empty', () => {
		appState.instanceId = 'v1-id';
		const postMessage = attachIframe( appState );

		registerForRouting( appState );
		emitHostMessage( {
			type: MessageEventType.SDK_TRIGGER_ANGIE,
			payload: { requestId: 'req-v1', prompt: 'hello' },
		} );

		expect( postMessage ).toHaveBeenCalledWith(
			expect.objectContaining( { type: MessageEventType.SDK_TRIGGER_ANGIE } ),
			ANGIE_ORIGIN,
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
			type: MessageEventType.SDK_TRIGGER_ANGIE,
			payload: { instanceId: 'aaaaaa', requestId: 'req-2', prompt: 'hello' },
		} );
		emitHostMessage( {
			type: MessageEventType.SDK_TRIGGER_ANGIE,
			payload: { instanceId: 'bbbbbb', requestId: 'req-3', prompt: 'hello' },
		} );

		expect( firstPostMessage ).not.toHaveBeenCalled();
		expect( secondPostMessage ).toHaveBeenCalledWith(
			expect.objectContaining( { type: MessageEventType.SDK_TRIGGER_ANGIE } ),
			ANGIE_ORIGIN,
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
			type: MessageEventType.SDK_TRIGGER_ANGIE,
			payload: { instanceId: 'aaaaaa', requestId: 'req-2', prompt: 'hello' },
		} );

		expect( postMessage ).not.toHaveBeenCalled();
	} );
} );
