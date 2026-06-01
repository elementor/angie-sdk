import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LAYOUT_FLOATING_CHAT, LAYOUT_SIDEBAR } from './config';
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
	let mockApplyState: jest.Mock;
	let mockInitAngieSidebar: jest.Mock;
	let mockLoadState: jest.Mock;
	let mockInitializeResize: jest.Mock;
	let mockOpenEmbeddedIframe: jest.Mock;
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
		document.body.innerHTML = '';
		mockApplyState = require( '../sidebar' ).applyState as jest.Mock;
		mockInitAngieSidebar = require( '../sidebar' ).initAngieSidebar as jest.Mock;
		mockLoadState = require( '../sidebar' ).loadState as jest.Mock;
		mockInitializeResize = require( '../sidebar' ).initializeResize as jest.Mock;
		mockOpenEmbeddedIframe = require( './open-embedded-iframe' ).openEmbeddedIframe as jest.Mock;
		mockSendEmbeddedConfig = require( './embedded-handshake' ).sendEmbeddedConfig as jest.Mock;
	} );

	it( 'should boot sidebar shell, iframe, and embedded config', async () => {
		await bootSidebar( {
			container: { layout: LAYOUT_SIDEBAR },
			host: { appId: 'editor-lite' },
			iframe: { path: 'angie/wp-admin' },
		} );

		expect( document.getElementById( 'angie-sidebar-container' ) ).not.toBeNull();
		expect( mockInitAngieSidebar ).toHaveBeenCalled();
		expect( mockOpenEmbeddedIframe ).toHaveBeenCalledWith(
			expect.objectContaining( {
				embeddedConfig: expect.objectContaining( { appId: 'editor-lite', configVersion: 2 } ),
				iframe: expect.objectContaining( { path: 'angie/wp-admin' } ),
			} ),
		);
		expect( mockSendEmbeddedConfig ).toHaveBeenCalledWith(
			expect.objectContaining( { appId: 'editor-lite', configVersion: 2 } ),
		);
		expect( mockLoadState ).toHaveBeenCalledWith( 'open' );
		expect( mockInitializeResize ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'should boot floating-chat without sidebar shell', async () => {
		await bootSidebar( {
			container: {
				layout: LAYOUT_FLOATING_CHAT,
				chatToggleButton: { enabled: false, selector: '#angie-widget-toggle' },
			},
			host: { appId: 'editor-lite' },
		} );

		expect( document.getElementById( 'angie-chat-widget-styles' ) ).not.toBeNull();
		expect( mockInitAngieSidebar ).not.toHaveBeenCalled();
		expect( mockLoadState ).not.toHaveBeenCalled();
	} );

	it( 'should start closed when host toggle is enabled', async () => {
		const toggle = document.createElement( 'button' );
		toggle.id = 'angie-lite-toggle';
		document.body.appendChild( toggle );

		await bootSidebar( {
			container: {
				layout: LAYOUT_SIDEBAR,
				chatToggleButton: { enabled: true, selector: '#angie-lite-toggle' },
			},
			host: { appId: 'editor-lite' },
		} );

		expect( mockApplyState ).toHaveBeenCalledWith( 'closed' );
		expect( mockLoadState ).toHaveBeenCalledWith( 'closed' );
		expect( mockInitAngieSidebar ).toHaveBeenCalled();
	} );
} );
