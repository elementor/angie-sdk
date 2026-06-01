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
	} );

	it( 'should respond with empty headers when no callback is provided', async () => {
		initHostApiBridge( { iframeOrigin: IFRAME_ORIGIN } );

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

		initHostApiBridge( { iframeOrigin: IFRAME_ORIGIN } );

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
		initHostApiBridge( { iframeOrigin: IFRAME_ORIGIN } );

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
