import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { createAngieInstance, resetInstancesForTests } from './instance-registry';
import { listenToSDK } from './sdk';
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

	it( 'should forward a client creation request only to the addressed instance', () => {
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
			type: MessageEventType.SDK_REQUEST_CLIENT_CREATION,
			payload: {
				instanceId: 'aaaaaa',
				requestId: 'req-1',
				serverId: 'server-1',
				serverName: 'Test Server',
				description: 'A test server',
				serverVersion: '1.0.0',
				transport: 'postMessage',
			},
		} );

		expect( firstPostMessage ).toHaveBeenCalledWith(
			expect.objectContaining( { type: MessageEventType.SDK_REQUEST_CLIENT_CREATION } ),
			ANGIE_ORIGIN,
			expect.any( Array ),
		);
		expect( secondPostMessage ).not.toHaveBeenCalled();
	} );
} );
