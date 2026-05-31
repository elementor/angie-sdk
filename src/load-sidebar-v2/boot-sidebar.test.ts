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

jest.mock( './open-embedded-iframe', () => ( {
	openEmbeddedIframe: jest.fn( () => Promise.resolve() ),
} ) );

jest.mock( './embedded-handshake', () => ( {
	sendEmbeddedConfig: jest.fn(),
	sendWidgetConfig: jest.fn(),
} ) );

describe( 'load-sidebar-v2/boot-sidebar', () => {
	let mockInitAngieSidebar: jest.Mock;
	let mockLoadState: jest.Mock;
	let mockInitializeResize: jest.Mock;
	let mockOpenEmbeddedIframe: jest.Mock;
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
		mockSendEmbeddedConfig = require( './embedded-handshake' ).sendEmbeddedConfig as jest.Mock;
		mockSendWidgetConfig = require( './embedded-handshake' ).sendWidgetConfig as jest.Mock;
	} );

	it( 'should boot sidebar shell, iframe, and embedded config', async () => {
		await bootSidebar( {
			host: {
				appId: 'editor-lite',
			},
			iframe: {
				path: 'angie/wp-admin',
			},
		} );

		expect( document.getElementById( 'angie-sidebar-container' ) ).not.toBeNull();
		expect( mockInitAngieSidebar ).toHaveBeenCalled();
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
		expect( mockSendWidgetConfig ).toHaveBeenCalledWith( { closeButton: 'collapse' } );
		expect( mockLoadState ).toHaveBeenCalledWith( 'open' );
		expect( mockInitializeResize ).toHaveBeenCalledTimes( 1 );
	} );
} );
