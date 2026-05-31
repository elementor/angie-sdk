import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { bootSidebar } from './boot-sidebar';

jest.mock( '../sidebar', () => ( {
	ANGIE_SIDEBAR_STATE_CLOSED: 'closed',
	ANGIE_SIDEBAR_STATE_OPEN: 'open',
	applyState: jest.fn(),
	getAngieSidebarSavedState: jest.fn( () => null ),
	initAngieSidebar: jest.fn(),
	initializeResize: jest.fn(),
	loadState: jest.fn(),
} ) );

jest.mock( '../iframe', () => ( {
	openIframe: jest.fn( () => Promise.resolve() ),
} ) );

jest.mock( './open-embedded-iframe', () => ( {
	openEmbeddedIframe: jest.fn( () => Promise.resolve() ),
} ) );

jest.mock( './embedded-handshake', () => ( {
	buildEmbeddedPayload: jest.fn(),
	sendEmbeddedConfig: jest.fn(),
	sendWidgetConfig: jest.fn(),
} ) );

describe( 'load-sidebar-v2/boot-sidebar', () => {
	let mockInitAngieSidebar: jest.Mock;
	let mockLoadState: jest.Mock;
	let mockInitializeResize: jest.Mock;
	let mockOpenEmbeddedIframe: jest.Mock;
	let mockBuildEmbeddedPayload: jest.Mock;
	let mockSendEmbeddedConfig: jest.Mock;
	let mockSendWidgetConfig: jest.Mock;

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
		document.body.innerHTML = '';
		mockInitAngieSidebar = require( '../sidebar' ).initAngieSidebar as jest.Mock;
		mockLoadState = require( '../sidebar' ).loadState as jest.Mock;
		mockInitializeResize = require( '../sidebar' ).initializeResize as jest.Mock;
		mockOpenEmbeddedIframe = require( './open-embedded-iframe' ).openEmbeddedIframe as jest.Mock;
		mockBuildEmbeddedPayload = require( './embedded-handshake' ).buildEmbeddedPayload as jest.Mock;
		mockSendEmbeddedConfig = require( './embedded-handshake' ).sendEmbeddedConfig as jest.Mock;
		mockSendWidgetConfig = require( './embedded-handshake' ).sendWidgetConfig as jest.Mock;
		mockBuildEmbeddedPayload.mockReturnValue( {
			appId: 'editor-lite',
			configVersion: 2,
		} );
	} );

		it( 'should send host config via postMessage after openIframe', async () => {
		await bootSidebar( {
			host: {
				appId: 'editor-lite',
			},
		} );

		expect( mockBuildEmbeddedPayload ).toHaveBeenCalledWith(
			expect.objectContaining( { appId: 'editor-lite' } ),
		);
		expect( mockOpenEmbeddedIframe ).toHaveBeenCalledWith(
			expect.objectContaining( {
				iframe: expect.objectContaining( {
					path: 'angie/embedded',
				} ),
			} ),
		);
		expect( mockSendEmbeddedConfig ).toHaveBeenCalledWith(
			expect.objectContaining( {
				appId: 'editor-lite',
				configVersion: 2,
			} ),
		);
		expect( mockInitAngieSidebar ).toHaveBeenCalled();
		expect( mockLoadState ).toHaveBeenCalledWith( 'open' );
		expect( mockInitializeResize ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'should send host config for any iframe path', async () => {
		await bootSidebar( {
			host: {
				appId: 'editor-lite',
			},
			iframe: {
				path: 'angie/wp-admin',
			},
		} );

		expect( mockOpenEmbeddedIframe ).toHaveBeenCalledWith(
			expect.objectContaining( {
				iframe: expect.objectContaining( {
					path: 'angie/wp-admin',
				} ),
			} ),
		);
		expect( mockSendEmbeddedConfig ).toHaveBeenCalledWith(
			expect.objectContaining( {
				appId: 'editor-lite',
				configVersion: 2,
			} ),
		);
		expect( mockInitAngieSidebar ).toHaveBeenCalled();
	} );

	it( 'should send collapse widget config for sidebar layout by default', async () => {
		await bootSidebar( {
			host: {
				appId: 'editor-lite',
			},
		} );

		expect( mockSendWidgetConfig ).toHaveBeenCalledWith( {
			closeButton: 'collapse',
		} );
	} );

	it( 'should always create sidebar container', async () => {
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
