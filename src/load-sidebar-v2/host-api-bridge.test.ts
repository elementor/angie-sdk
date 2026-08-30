import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { HostLocalStorageEventType } from '../types';
import type { ExternalHeadersCallback } from './config';
import {
	GET_ANALYTICS_CONTEXT_MESSAGE_TYPE,
	GET_EXTERNAL_HEADERS_MESSAGE_TYPE,
	GET_WEBSITE_CONTEXT_MESSAGE_TYPE,
	initHostApiBridge,
	resetHostApiBridgeForTests,
} from './host-api-bridge';
import { appState } from '../config';
import { createAngieInstance, resetInstancesForTests } from '../instance-registry';

const IFRAME_ORIGIN = 'http://localhost:4000';
const SCOPED_KEY = ( key: string, instanceId: string ) => `${ key }::__angie::${ instanceId }`;

const createMockPort = () => ( {
	postMessage: jest.fn(),
} );

const flushAsync = () => new Promise( ( resolve ) => {
	setTimeout( resolve, 0 );
} );

describe( 'load-sidebar-v2/host-api-bridge', () => {
	beforeEach( () => {
		jest.clearAllMocks();
		resetHostApiBridgeForTests();
		resetInstancesForTests();
	} );

	it( 'should answer each instance with its own host config', async () => {
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
		const secondWindow = {} as Window;
		first.iframe = { contentWindow: {} as Window } as HTMLIFrameElement;
		second.iframe = { contentWindow: secondWindow } as HTMLIFrameElement;

		initHostApiBridge( {
			iframeOrigin: IFRAME_ORIGIN,
			host: { appId: 'app-a', analytics: { screenPath: '/a' } },
			instance: first,
		} );
		initHostApiBridge( {
			iframeOrigin: IFRAME_ORIGIN,
			host: { appId: 'app-b', analytics: { screenPath: '/b' } },
			instance: second,
		} );

		const port = createMockPort();
		window.dispatchEvent( new MessageEvent( 'message', {
			data: { type: GET_ANALYTICS_CONTEXT_MESSAGE_TYPE },
			origin: IFRAME_ORIGIN,
			source: secondWindow,
			ports: [ port as unknown as MessagePort ],
		} ) );

		await flushAsync();

		expect( port.postMessage ).toHaveBeenCalledWith( {
			status: 'success',
			payload: { payload: expect.objectContaining( { screenPath: '/b' } ) },
		} );
	} );

	it( 'should respond with empty headers when no callback is provided', async () => {
		initHostApiBridge( { iframeOrigin: IFRAME_ORIGIN, instance: appState } );

		const port = createMockPort();
		window.dispatchEvent( new MessageEvent( 'message', {
			data: { type: GET_EXTERNAL_HEADERS_MESSAGE_TYPE },
			origin: IFRAME_ORIGIN,
			ports: [ port as unknown as MessagePort ],
		} ) );

		await flushAsync();

		expect( port.postMessage ).toHaveBeenCalledWith( {
			status: 'success',
			payload: {},
		} );
	} );

	it( 'should invoke getExternalHeaders callback on each request', async () => {
		let callCount = 0;
		const getExternalHeaders: ExternalHeadersCallback = async () => {
			callCount += 1;
			return { 'X-Custom-Token': callCount === 1 ? 'first' : 'second' };
		};

		initHostApiBridge( {
			iframeOrigin: IFRAME_ORIGIN,
			getExternalHeaders,
			instance: appState,
		} );

		const firstPort = createMockPort();
		window.dispatchEvent( new MessageEvent( 'message', {
			data: { type: GET_EXTERNAL_HEADERS_MESSAGE_TYPE },
			origin: IFRAME_ORIGIN,
			ports: [ firstPort as unknown as MessagePort ],
		} ) );

		await flushAsync();

		expect( callCount ).toBe( 1 );
		expect( firstPort.postMessage ).toHaveBeenCalledWith( {
			status: 'success',
			payload: { 'X-Custom-Token': 'first' },
		} );

		const secondPort = createMockPort();
		window.dispatchEvent( new MessageEvent( 'message', {
			data: { type: GET_EXTERNAL_HEADERS_MESSAGE_TYPE },
			origin: IFRAME_ORIGIN,
			ports: [ secondPort as unknown as MessagePort ],
		} ) );

		await flushAsync();

		expect( callCount ).toBe( 2 );
		expect( secondPort.postMessage ).toHaveBeenCalledWith( {
			status: 'success',
			payload: { 'X-Custom-Token': 'second' },
		} );
	} );

	it( 'should ignore messages from other origins', async () => {
		const getExternalHeaders = jest.fn( async () => ( { 'X-Custom-Token': 'token' } ) ) as jest.MockedFunction<ExternalHeadersCallback>;

		initHostApiBridge( {
			iframeOrigin: IFRAME_ORIGIN,
			getExternalHeaders,
			instance: appState,
		} );

		const port = createMockPort();
		window.dispatchEvent( new MessageEvent( 'message', {
			data: { type: GET_EXTERNAL_HEADERS_MESSAGE_TYPE },
			origin: 'https://evil.example',
			ports: [ port as unknown as MessagePort ],
		} ) );

		await flushAsync();

		expect( getExternalHeaders ).not.toHaveBeenCalled();
		expect( port.postMessage ).not.toHaveBeenCalled();
	} );

	it( 'should respond with error when callback throws', async () => {
		initHostApiBridge( {
			iframeOrigin: IFRAME_ORIGIN,
			getExternalHeaders: async () => {
				throw new Error( 'Token unavailable' );
			},
			instance: appState,
		} );

		const port = createMockPort();
		window.dispatchEvent( new MessageEvent( 'message', {
			data: { type: GET_EXTERNAL_HEADERS_MESSAGE_TYPE },
			origin: IFRAME_ORIGIN,
			ports: [ port as unknown as MessagePort ],
		} ) );

		await flushAsync();

		expect( port.postMessage ).toHaveBeenCalledWith( {
			status: 'error',
			payload: { message: 'Token unavailable' },
		} );
	} );

	it( 'should respond with website context from host config', async () => {
		initHostApiBridge( {
			iframeOrigin: IFRAME_ORIGIN,
			host: {
				appId: 'test-app',
				website: { name: 'Custom Site', wpVersion: '6.4' },
			},
			instance: appState,
		} );

		const port = createMockPort();
		window.dispatchEvent( new MessageEvent( 'message', {
			data: { type: GET_WEBSITE_CONTEXT_MESSAGE_TYPE },
			origin: IFRAME_ORIGIN,
			ports: [ port as unknown as MessagePort ],
		} ) );

		await flushAsync();

		expect( port.postMessage ).toHaveBeenCalledWith( {
			status: 'success',
			payload: expect.objectContaining( {
				payload: expect.objectContaining( {
					name: 'Custom Site',
					wpVersion: '6.4',
					platform: 'frontend',
					homeUrl: expect.any( String ),
					timezone: expect.any( String ),
					today: expect.stringMatching( /^\d{4}-\d{2}-\d{2}$/ ),
				} ),
			} ),
		} );
	} );

	it( 'should respond with analytics context from host config', async () => {
		initHostApiBridge( {
			iframeOrigin: IFRAME_ORIGIN,
			host: {
				appId: 'test-app',
				analytics: {
					pluginVersion: '1.0.0',
					siteKey: 'test-key',
					plugins: { elementor: true },
				},
			},
			instance: appState,
		} );

		const port = createMockPort();
		window.dispatchEvent( new MessageEvent( 'message', {
			data: { type: GET_ANALYTICS_CONTEXT_MESSAGE_TYPE },
			origin: IFRAME_ORIGIN,
			ports: [ port as unknown as MessagePort ],
		} ) );

		await flushAsync();

		expect( port.postMessage ).toHaveBeenCalledWith( {
			status: 'success',
			payload: expect.objectContaining( {
				payload: expect.objectContaining( {
					pluginVersion: '1.0.0',
					siteKey: 'test-key',
					screenPath: expect.any( String ),
					plugins: { elementor: true },
				} ),
			} ),
		} );
	} );

	it( 'should handle localStorage GET', async () => {
		window.localStorage.setItem( 'angie-test-key', 'stored-value' );

		initHostApiBridge( { iframeOrigin: IFRAME_ORIGIN, instance: appState } );

		const port = createMockPort();
		window.dispatchEvent( new MessageEvent( 'message', {
			data: { type: HostLocalStorageEventType.GET, key: 'angie-test-key' },
			origin: IFRAME_ORIGIN,
			ports: [ port as unknown as MessagePort ],
		} ) );

		await flushAsync();

		expect( port.postMessage ).toHaveBeenCalledWith( { value: 'stored-value' } );

		window.localStorage.removeItem( 'angie-test-key' );
	} );

	it( 'should handle localStorage SET', async () => {
		initHostApiBridge( { iframeOrigin: IFRAME_ORIGIN, instance: appState } );

		window.dispatchEvent( new MessageEvent( 'message', {
			data: {
				type: HostLocalStorageEventType.SET,
				key: 'angie-set-key',
				value: 'new-value',
			},
			origin: IFRAME_ORIGIN,
		} ) );

		await flushAsync();

		expect( window.localStorage.getItem( 'angie-set-key' ) ).toBe( 'new-value' );
		window.localStorage.removeItem( 'angie-set-key' );
	} );

	it( 'should ignore localStorage SET when two bridges share an origin but event.source matches neither iframe', async () => {
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
		const firstWindow = {} as Window;
		const secondWindow = {} as Window;

		first.iframe = { contentWindow: firstWindow } as HTMLIFrameElement;
		second.iframe = { contentWindow: secondWindow } as HTMLIFrameElement;

		initHostApiBridge( { iframeOrigin: IFRAME_ORIGIN, instance: first } );
		initHostApiBridge( { iframeOrigin: IFRAME_ORIGIN, instance: second } );

		window.dispatchEvent( new MessageEvent( 'message', {
			data: {
				type: HostLocalStorageEventType.SET,
				key: 'angie-wrong-source',
				value: 'ignored',
			},
			origin: IFRAME_ORIGIN,
			source: {} as Window,
		} ) );

		await flushAsync();

		expect( window.localStorage.getItem( 'angie-wrong-source' ) ).toBeNull();

		window.dispatchEvent( new MessageEvent( 'message', {
			data: {
				type: HostLocalStorageEventType.SET,
				key: 'angie-right-source',
				value: 'stored',
			},
			origin: IFRAME_ORIGIN,
			source: secondWindow,
		} ) );

		await flushAsync();

		expect( window.localStorage.getItem( 'angie-right-source' ) ).toBe( 'stored' );
		window.localStorage.removeItem( 'angie-right-source' );
	} );

	it( 'should handle localStorage GET from the matching iframe source', async () => {
		const instance = createAngieInstance( {
			containerId: 'container-b',
			instanceId: 'bbbbbb',
			layout: 'floatingChat',
		} );
		const ownWindow = {} as Window;

		instance.iframe = { contentWindow: ownWindow } as HTMLIFrameElement;
		window.localStorage.setItem( 'angie-chat-key', 'chat-value' );

		initHostApiBridge( { iframeOrigin: IFRAME_ORIGIN, instance } );

		const port = createMockPort();
		window.dispatchEvent( new MessageEvent( 'message', {
			data: { type: HostLocalStorageEventType.GET, key: 'angie-chat-key' },
			origin: IFRAME_ORIGIN,
			source: ownWindow,
			ports: [ port as unknown as MessagePort ],
		} ) );

		await flushAsync();

		expect( port.postMessage ).toHaveBeenCalledWith( { value: 'chat-value' } );
		window.localStorage.removeItem( 'angie-chat-key' );
	} );

	it( 'should namespace localStorage by host.instanceId', async () => {
		const instance = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'help-center',
			layout: 'floatingChat',
		} );
		instance.iframe = { contentWindow: {} as Window } as HTMLIFrameElement;

		initHostApiBridge( {
			iframeOrigin: IFRAME_ORIGIN,
			host: { appId: 'help-center', instanceId: 'help-center' },
			instance,
		} );

		window.dispatchEvent( new MessageEvent( 'message', {
			data: {
				type: HostLocalStorageEventType.SET,
				key: 'angie_active_chat_id',
				value: 'chat-a',
			},
			origin: IFRAME_ORIGIN,
		} ) );

		await flushAsync();

		expect( window.localStorage.getItem( 'angie_active_chat_id' ) ).toBeNull();
		expect( window.localStorage.getItem(
			SCOPED_KEY( 'angie_active_chat_id', 'help-center' ),
		) ).toBe( 'chat-a' );

		window.localStorage.setItem( 'angie_active_chat_id', 'legacy-chat' );
		const port = createMockPort();
		window.dispatchEvent( new MessageEvent( 'message', {
			data: { type: HostLocalStorageEventType.GET, key: 'angie_active_chat_id' },
			origin: IFRAME_ORIGIN,
			ports: [ port as unknown as MessagePort ],
		} ) );

		await flushAsync();

		expect( port.postMessage ).toHaveBeenCalledWith( { value: 'chat-a' } );
		window.localStorage.removeItem( 'angie_active_chat_id' );
		window.localStorage.removeItem(
			SCOPED_KEY( 'angie_active_chat_id', 'help-center' ),
		);
	} );

	it( 'should isolate the same logical key across two instances', async () => {
		const first = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'help-center',
			layout: 'sidebar',
		} );
		const second = createAngieInstance( {
			containerId: 'container-b',
			instanceId: 'context-menu',
			layout: 'floatingChat',
		} );
		const firstWindow = {} as Window;
		const secondWindow = {} as Window;
		first.iframe = { contentWindow: firstWindow } as HTMLIFrameElement;
		second.iframe = { contentWindow: secondWindow } as HTMLIFrameElement;

		initHostApiBridge( {
			iframeOrigin: IFRAME_ORIGIN,
			host: { appId: 'help-center', instanceId: 'help-center' },
			instance: first,
		} );
		initHostApiBridge( {
			iframeOrigin: IFRAME_ORIGIN,
			host: { appId: 'context-menu', instanceId: 'context-menu' },
			instance: second,
		} );

		window.dispatchEvent( new MessageEvent( 'message', {
			data: {
				type: HostLocalStorageEventType.SET,
				key: 'angie_active_chat_id',
				value: 'chat-a',
			},
			origin: IFRAME_ORIGIN,
			source: firstWindow,
		} ) );
		window.dispatchEvent( new MessageEvent( 'message', {
			data: {
				type: HostLocalStorageEventType.SET,
				key: 'angie_active_chat_id',
				value: 'chat-b',
			},
			origin: IFRAME_ORIGIN,
			source: secondWindow,
		} ) );

		await flushAsync();

		expect( window.localStorage.getItem(
			SCOPED_KEY( 'angie_active_chat_id', 'help-center' ),
		) ).toBe( 'chat-a' );
		expect( window.localStorage.getItem(
			SCOPED_KEY( 'angie_active_chat_id', 'context-menu' ),
		) ).toBe( 'chat-b' );

		const port = createMockPort();
		window.dispatchEvent( new MessageEvent( 'message', {
			data: { type: HostLocalStorageEventType.GET, key: 'angie_active_chat_id' },
			origin: IFRAME_ORIGIN,
			source: firstWindow,
			ports: [ port as unknown as MessagePort ],
		} ) );

		await flushAsync();

		expect( port.postMessage ).toHaveBeenCalledWith( { value: 'chat-a' } );
		window.localStorage.removeItem(
			SCOPED_KEY( 'angie_active_chat_id', 'help-center' ),
		);
		window.localStorage.removeItem(
			SCOPED_KEY( 'angie_active_chat_id', 'context-menu' ),
		);
	} );
} );
