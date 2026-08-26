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

	it( 'should route messages to the matching instance when several share an origin', async () => {
		const windowA = {} as Window;
		const windowB = {} as Window;
		const instanceA = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'aaaaaa',
			layout: 'sidebar',
		} );
		const instanceB = createAngieInstance( {
			containerId: 'container-b',
			instanceId: 'bbbbbb',
			layout: 'sidebar',
		} );
		instanceA.iframe = { contentWindow: windowA } as HTMLIFrameElement;
		instanceB.iframe = { contentWindow: windowB } as HTMLIFrameElement;

		const headersA = jest.fn( async () => ( { 'X-Instance': 'a' } ) ) as jest.MockedFunction<ExternalHeadersCallback>;
		const headersB = jest.fn( async () => ( { 'X-Instance': 'b' } ) ) as jest.MockedFunction<ExternalHeadersCallback>;

		initHostApiBridge( {
			iframeOrigin: IFRAME_ORIGIN,
			getExternalHeaders: headersA,
			instance: instanceA,
		} );
		initHostApiBridge( {
			iframeOrigin: IFRAME_ORIGIN,
			getExternalHeaders: headersB,
			instance: instanceB,
		} );

		const portA = createMockPort();
		window.dispatchEvent( Object.assign( new Event( 'message' ), {
			data: { type: GET_EXTERNAL_HEADERS_MESSAGE_TYPE },
			origin: IFRAME_ORIGIN,
			source: windowA,
			ports: [ portA as unknown as MessagePort ],
		} ) );

		await flushAsync();

		expect( headersA ).toHaveBeenCalledTimes( 1 );
		expect( headersB ).not.toHaveBeenCalled();
		expect( portA.postMessage ).toHaveBeenCalledWith( {
			status: 'success',
			payload: { 'X-Instance': 'a' },
		} );

		const portUnknown = createMockPort();
		window.dispatchEvent( Object.assign( new Event( 'message' ), {
			data: { type: GET_EXTERNAL_HEADERS_MESSAGE_TYPE },
			origin: IFRAME_ORIGIN,
			source: {} as Window,
			ports: [ portUnknown as unknown as MessagePort ],
		} ) );

		await flushAsync();

		expect( headersA ).toHaveBeenCalledTimes( 1 );
		expect( headersB ).not.toHaveBeenCalled();
		expect( portUnknown.postMessage ).not.toHaveBeenCalled();
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
} );
