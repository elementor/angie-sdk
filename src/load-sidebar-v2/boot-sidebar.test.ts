import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { bootSidebar } from './boot-sidebar';

jest.mock( '../sidebar', () => ( {
	initAngieSidebar: jest.fn(),
	initializeResize: jest.fn(),
	loadState: jest.fn(),
} ) );

jest.mock( '../iframe', () => ( {
	openIframe: jest.fn( () => Promise.resolve() ),
} ) );

jest.mock( './embedded-handshake', () => ( {
	buildEmbeddedPayload: jest.fn(),
	sendEmbeddedConfig: jest.fn(),
} ) );

describe( 'load-sidebar-v2/boot-sidebar', () => {
	let mockInitAngieSidebar: jest.Mock;
	let mockLoadState: jest.Mock;
	let mockInitializeResize: jest.Mock;
	let mockOpenIframe: jest.Mock;
	let mockBuildEmbeddedPayload: jest.Mock;
	let mockSendEmbeddedConfig: jest.Mock;

	beforeAll( () => {
		Object.defineProperty( window, 'matchMedia', {
			writable: true,
			value: jest.fn().mockImplementation( ( query: unknown ) => ( {
				matches: false,
				media: String( query ),
				onchange: null,
				addListener: jest.fn(),
				removeListener: jest.fn(),
				addEventListener: jest.fn(),
				removeEventListener: jest.fn(),
				dispatchEvent: jest.fn(),
			} ) ),
		} );
	} );

	beforeEach( () => {
		jest.clearAllMocks();
		mockInitAngieSidebar = require( '../sidebar' ).initAngieSidebar as jest.Mock;
		mockLoadState = require( '../sidebar' ).loadState as jest.Mock;
		mockInitializeResize = require( '../sidebar' ).initializeResize as jest.Mock;
		mockOpenIframe = require( '../iframe' ).openIframe as jest.Mock;
		mockBuildEmbeddedPayload = require( './embedded-handshake' ).buildEmbeddedPayload as jest.Mock;
		mockSendEmbeddedConfig = require( './embedded-handshake' ).sendEmbeddedConfig as jest.Mock;
		mockBuildEmbeddedPayload.mockReturnValue( {
			appId: 'editor-lite',
			configVersion: 2,
		} );
	} );

	it( 'should send host config via postMessage after openIframe', async () => {
		await bootSidebar( {
			container: {
				preset: 'sidebar',
				stylePreset: 'wordpress',
			},
			host: {
				appId: 'editor-lite',
			},
		} );

		expect( mockBuildEmbeddedPayload ).toHaveBeenCalledWith(
			expect.objectContaining( { appId: 'editor-lite' } ),
		);
		expect( mockOpenIframe ).toHaveBeenCalledWith(
			expect.objectContaining( {
				path: 'angie/embedded',
			} ),
		);
		expect( mockSendEmbeddedConfig ).toHaveBeenCalledWith(
			expect.objectContaining( {
				appId: 'editor-lite',
				configVersion: 2,
			} ),
		);
		expect( mockInitAngieSidebar ).toHaveBeenCalledWith(
			expect.objectContaining( { skipDefaultCss: false } ),
		);
		expect( mockLoadState ).toHaveBeenCalledTimes( 1 );
		expect( mockInitializeResize ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'should send host config for any iframe path', async () => {
		await bootSidebar( {
			container: {
				preset: 'none',
			},
			host: {
				appId: 'editor-lite',
			},
			iframe: {
				path: 'angie/wp-admin',
			},
		} );

		expect( mockOpenIframe ).toHaveBeenCalledWith(
			expect.objectContaining( {
				path: 'angie/wp-admin',
			} ),
		);
		expect( mockSendEmbeddedConfig ).toHaveBeenCalledWith(
			expect.objectContaining( {
				appId: 'editor-lite',
				configVersion: 2,
			} ),
		);
		expect( mockInitAngieSidebar ).not.toHaveBeenCalled();
	} );

	it( 'should skip default css when stylePreset is chat', async () => {
		await bootSidebar( {
			container: {
				stylePreset: 'chat',
			},
			host: {
				appId: 'editor-lite',
			},
		} );

		expect( mockInitAngieSidebar ).toHaveBeenCalledWith(
			expect.objectContaining( { skipDefaultCss: true } ),
		);
	} );

	it( 'should create sidebar container when preset is sidebar', async () => {
		document.body.innerHTML = '';

		await bootSidebar( {
			host: {
				appId: 'editor-lite',
			},
		} );

		expect( document.getElementById( 'angie-sidebar-container' ) ).not.toBeNull();
		expect( document.getElementById( 'angie-sidebar-loading' ) ).not.toBeNull();
	} );
} );
