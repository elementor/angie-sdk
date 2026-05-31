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
	let mockApplyState: jest.Mock;
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
		document.getElementById( 'angie-chat-widget-styles' )?.remove();
		mockApplyState = require( '../sidebar' ).applyState as jest.Mock;
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
			container: { layout: 'sidebar' },
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
		expect( mockInitAngieSidebar ).not.toHaveBeenCalled();
	} );

	it( 'should init floating-chat layout without injecting toggle when disabled', async () => {
		await bootSidebar( {
			container: {
				chatToggleButton: { enabled: false },
				layout: 'floating-chat',
			},
			host: {
				appId: 'editor-lite',
			},
		} );

		expect( document.getElementById( 'angie-chat-widget-styles' ) ).not.toBeNull();
		expect( document.getElementById( 'angie-widget-toggle' ) ).toBeNull();
		expect( mockInitAngieSidebar ).not.toHaveBeenCalled();
	} );

	it( 'should apply closed state before iframe load when toggle is enabled', async () => {
		let applyStateCalledBeforeIframe = false;

		mockApplyState.mockImplementation( () => {
			if ( ! mockOpenEmbeddedIframe.mock.invocationCallOrder.length ) {
				applyStateCalledBeforeIframe = true;
			}
		} );

		await bootSidebar( {
			container: {
				chatToggleButton: {
					enabled: true,
					selector: '#angie-lite-toggle',
				},
				layout: 'sidebar',
			},
			host: {
				appId: 'editor-lite',
			},
		} );

		expect( mockApplyState ).toHaveBeenCalledWith( 'closed' );
		expect( applyStateCalledBeforeIframe ).toBe( true );
		expect( mockOpenEmbeddedIframe ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'should init sidebar shell and inject toggle when host button is missing', async () => {
		jest.useFakeTimers();
		document.body.innerHTML = '';

		const bootPromise = bootSidebar( {
			container: {
				chatToggleButton: {
					enabled: true,
					selector: '#angie-lite-toggle',
				},
				layout: 'sidebar',
			},
			host: {
				appId: 'editor-lite',
			},
		} );

		await jest.runAllTimersAsync();
		await bootPromise;
		jest.useRealTimers();

		expect( document.getElementById( 'angie-chat-widget-styles' ) ).toBeNull();
		expect( document.getElementById( 'angie-lite-toggle' ) ).not.toBeNull();
		expect( mockInitAngieSidebar ).toHaveBeenCalledWith(
			expect.objectContaining( { skipDefaultCss: true } ),
		);
		expect( mockApplyState ).toHaveBeenCalledWith( 'closed' );
		expect( mockLoadState ).toHaveBeenCalledWith( 'closed' );
		expect( mockInitializeResize ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'should init sidebar shell when host toggle is present', async () => {
		document.body.innerHTML = '';

		const toggle = document.createElement( 'button' );
		toggle.id = 'angie-lite-toggle';
		document.body.appendChild( toggle );

		await bootSidebar( {
			container: {
				chatToggleButton: {
					enabled: true,
					selector: '#angie-lite-toggle',
				},
				layout: 'sidebar',
			},
			host: {
				appId: 'editor-lite',
			},
		} );

		expect( document.getElementById( 'angie-chat-widget-styles' ) ).toBeNull();
		expect( mockInitAngieSidebar ).toHaveBeenCalledWith(
			expect.objectContaining( { skipDefaultCss: true } ),
		);
		expect( mockApplyState ).toHaveBeenCalledWith( 'closed' );
		expect( mockLoadState ).toHaveBeenCalledWith( 'closed' );
		expect( mockInitializeResize ).toHaveBeenCalledTimes( 1 );

		toggle.click();
		expect( mockInitAngieSidebar ).toHaveBeenCalled();
	} );

	it( 'should init chat shell when chatToggleButton is enabled', async () => {
		document.body.innerHTML = '';

		await bootSidebar( {
			container: {
				chatToggleButton: { enabled: true },
				layout: 'floating-chat',
			},
			host: {
				appId: 'editor-lite',
			},
		} );

		expect( document.getElementById( 'angie-widget-toggle' ) ).not.toBeNull();
		expect( document.getElementById( 'angie-chat-widget-styles' ) ).not.toBeNull();
		expect( mockInitAngieSidebar ).not.toHaveBeenCalled();
		expect( mockOpenEmbeddedIframe ).toHaveBeenCalled();
	} );

	it( 'should init chat shell with a custom toggle button id', async () => {
		document.body.innerHTML = '';

		await bootSidebar( {
			container: {
				chatToggleButton: {
					enabled: true,
					selector: '#angie-lite-toggle',
				},
				layout: 'floating-chat',
			},
			host: {
				appId: 'editor-lite',
			},
		} );

		expect( document.getElementById( 'angie-lite-toggle' ) ).not.toBeNull();
		expect( document.getElementById( 'angie-widget-toggle' ) ).toBeNull();
		expect( mockInitAngieSidebar ).not.toHaveBeenCalled();
	} );

	it( 'should send close widget config for floating-chat layout by default', async () => {
		await bootSidebar( {
			host: {
				appId: 'editor-lite',
			},
		} );

		expect( mockSendWidgetConfig ).toHaveBeenCalledWith( {
			closeButton: 'close',
		} );
	} );

	it( 'should send collapse widget config for sidebar layout by default', async () => {
		await bootSidebar( {
			container: { layout: 'sidebar' },
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
