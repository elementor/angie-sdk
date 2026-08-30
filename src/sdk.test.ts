import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createAngieInstance, resetInstancesForTests } from './instance-registry';
import { flushPendingSdkMessages, listenToSDK, resetSdkListenersForTests } from './sdk';
import { MessageEventType } from './types';

const ANGIE_ORIGIN = 'https://angie.elementor.com';

const attachIframe = ( instance: ReturnType<typeof createAngieInstance> ) => {
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
		resetSdkListenersForTests();
		jest.clearAllMocks();
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

		listenToSDK( first );
		listenToSDK( second );
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

		listenToSDK( first );
		listenToSDK( second );
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

		listenToSDK( instance );
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

	it( 'should not double-forward when listenToSDK is called twice for the same instance', () => {
		const instance = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'aaaaaa',
			layout: 'sidebar',
		} );
		const postMessage = attachIframe( instance );

		listenToSDK( instance );
		listenToSDK( instance );
		emitHostMessage( {
			type: MessageEventType.SDK_TRIGGER_ANGIE,
			payload: { instanceId: 'aaaaaa', requestId: 'req-2', prompt: 'hello' },
		} );

		expect( postMessage ).toHaveBeenCalledTimes( 1 );
	} );
} );
