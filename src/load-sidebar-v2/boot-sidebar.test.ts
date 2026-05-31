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
	let mockApplyState: jest.Mock;
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
		document.getElementById( 'angie-chat-widget-styles' )?.remove();
		mockApplyState = require( '../sidebar' ).applyState as jest.Mock;
		mockInitAngieSidebar = require( '../sidebar' ).initAngieSidebar as jest.Mock;
		mockLoadState = require( '../sidebar' ).loadState as jest.Mock;
		mockInitializeResize = require( '../sidebar' ).initializeResize as jest.Mock;
		mockOpenEmbeddedIframe = require( './open-embedded-iframe' ).openEmbeddedIframe as jest.Mock;
		mockSendEmbeddedConfig = require( './embedded-handshake' ).sendEmbeddedConfig as jest.Mock;
		mockSendWidgetConfig = require( './embedded-handshake' ).sendWidgetConfig as jest.Mock;
	} );

	it( 'should boot sidebar layout with shell, iframe, and embedded config', async () => {
		await bootSidebar( {
			container: { layout: 'sidebar' },
			host: { appId: 'editor-lite' },
		} );

		expect( mockOpenEmbeddedIframe ).toHaveBeenCalledWith(
			expect.objectContaining( {
				hostReadyEmbedded: expect.objectContaining( {
					appId: 'editor-lite',
					configVersion: 2,
				} ),
				iframe: expect.objectContaining( { path: 'angie/embedded' } ),
			} ),
		);
		expect( mockSendEmbeddedConfig ).toHaveBeenCalledWith(
			expect.objectContaining( { appId: 'editor-lite', configVersion: 2 } ),
		);
		expect( mockInitAngieSidebar ).toHaveBeenCalled();
		expect( mockLoadState ).toHaveBeenCalledWith( 'open' );
		expect( mockInitializeResize ).toHaveBeenCalledTimes( 1 );
		expect( mockSendWidgetConfig ).toHaveBeenCalledWith( { closeButton: 'collapse' } );
	} );

	it( 'should boot floating-chat without sidebar shell', async () => {
		await bootSidebar( {
			host: { appId: 'editor-lite' },
			iframe: { path: 'angie/wp-admin' },
		} );

		expect( mockOpenEmbeddedIframe ).toHaveBeenCalledWith(
			expect.objectContaining( {
				iframe: expect.objectContaining( { path: 'angie/wp-admin' } ),
			} ),
		);
		expect( mockInitAngieSidebar ).not.toHaveBeenCalled();
		expect( mockSendWidgetConfig ).toHaveBeenCalledWith( { closeButton: 'close' } );
	} );

	it( 'should skip floating-chat toggle injection when disabled', async () => {
		await bootSidebar( {
			container: {
				chatToggleButton: { enabled: false },
				layout: 'floating-chat',
			},
			host: { appId: 'editor-lite' },
		} );

		expect( document.getElementById( 'angie-chat-widget-styles' ) ).not.toBeNull();
		expect( document.getElementById( 'angie-widget-toggle' ) ).toBeNull();
	} );

	it( 'should close sidebar before iframe when host toggle is enabled', async () => {
		let applyStateCalledBeforeIframe = false;

		mockApplyState.mockImplementation( () => {
			if ( ! mockOpenEmbeddedIframe.mock.invocationCallOrder.length ) {
				applyStateCalledBeforeIframe = true;
			}
		} );

		await bootSidebar( {
			container: {
				chatToggleButton: { enabled: true, selector: '#angie-lite-toggle' },
				layout: 'sidebar',
			},
			host: { appId: 'editor-lite' },
		} );

		expect( mockApplyState ).toHaveBeenCalledWith( 'closed' );
		expect( applyStateCalledBeforeIframe ).toBe( true );
	} );

	it( 'should inject host toggle when missing on sidebar layout', async () => {
		jest.useFakeTimers();

		const bootPromise = bootSidebar( {
			container: {
				chatToggleButton: { enabled: true, selector: '#angie-lite-toggle' },
				layout: 'sidebar',
			},
			host: { appId: 'editor-lite' },
		} );

		await jest.runAllTimersAsync();
		await bootPromise;
		jest.useRealTimers();

		expect( document.getElementById( 'angie-lite-toggle' ) ).not.toBeNull();
		expect( mockInitAngieSidebar ).toHaveBeenCalledWith(
			expect.objectContaining( { skipDefaultCss: true } ),
		);
		expect( mockLoadState ).toHaveBeenCalledWith( 'closed' );
	} );

	it( 'should wire existing host toggle on sidebar layout', async () => {
		const toggle = document.createElement( 'button' );
		toggle.id = 'angie-lite-toggle';
		document.body.appendChild( toggle );

		await bootSidebar( {
			container: {
				chatToggleButton: { enabled: true, selector: '#angie-lite-toggle' },
				layout: 'sidebar',
			},
			host: { appId: 'editor-lite' },
		} );

		expect( mockInitAngieSidebar ).toHaveBeenCalledWith(
			expect.objectContaining( { skipDefaultCss: true } ),
		);
		expect( mockLoadState ).toHaveBeenCalledWith( 'closed' );
	} );

	it( 'should inject floating-chat toggle with default or custom selector', async () => {
		await bootSidebar( {
			container: { chatToggleButton: { enabled: true }, layout: 'floating-chat' },
			host: { appId: 'editor-lite' },
		} );
		expect( document.getElementById( 'angie-widget-toggle' ) ).not.toBeNull();

		document.body.innerHTML = '';
		await bootSidebar( {
			container: {
				chatToggleButton: { enabled: true, selector: '#angie-lite-toggle' },
				layout: 'floating-chat',
			},
			host: { appId: 'editor-lite' },
		} );
		expect( document.getElementById( 'angie-lite-toggle' ) ).not.toBeNull();
		expect( document.getElementById( 'angie-widget-toggle' ) ).toBeNull();
	} );
} );
