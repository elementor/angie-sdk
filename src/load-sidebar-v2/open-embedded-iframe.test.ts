import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { appState } from '../config';
import { CHAT_WIDGET_HIDDEN_CLASS } from './chat-toggle/constants';
import { openEmbeddedIframe } from './open-embedded-iframe';

jest.mock( '../iframe', () => ( {
	openIframe: jest.fn( () => Promise.resolve( {
		iframe: {} as HTMLIFrameElement,
		iframeOrigin: 'https://angie.elementor.com',
	} ) ),
} ) );

jest.mock( '../utils', () => ( {
	toggleAngieSidebar: jest.fn(),
} ) );

jest.mock( './chat-toggle/chat-shell', () => ( {
	setChatWidgetOpen: jest.fn(),
} ) );

jest.mock( './toggle-button', () => ( {
	syncToggleButton: jest.fn(),
} ) );

describe( 'load-sidebar-v2/open-embedded-iframe', () => {
	beforeEach( () => {
		jest.clearAllMocks();
		appState.iframe = document.createElement( 'iframe' );
		document.body.innerHTML = '';
	} );

	const sidebarContainer = {
		id: 'angie-sidebar-container',
		layout: 'sidebar',
		styleTheme: 'wordpress',
		create: true,
		skipDefaultCss: false,
		persistOpenState: true,
		resizable: true,
		chatToggleButton: {
			enabled: true,
			selector: '#demo-sidebar-toggle',
		},
	} as const;

	const iframeConfig = {
		origin: 'https://angie.elementor.com',
		path: 'angie/embedded',
		uiTheme: 'light',
		isRTL: false,
		allowMobile: false,
	} as const;

	const openFloatingChat = ( isHidden?: boolean ) => {
		if ( isHidden !== undefined ) {
			const container = document.createElement( 'div' );
			container.id = 'angie-chat-container';
			container.classList.toggle( CHAT_WIDGET_HIDDEN_CLASS, isHidden );
			document.body.appendChild( container );
		}

		return openEmbeddedIframe( {
			container: {
				...sidebarContainer,
				id: 'angie-chat-container',
				layout: 'floatingChat',
				chatToggleButton: { enabled: true, selector: '#angie-widget-toggle' },
			},
			iframe: iframeConfig,
		} );
	};

	it( 'should sync a custom host toggle when sidebar layout starts closed', async () => {
		const { toggleAngieSidebar } = require( '../utils' );
		const { syncToggleButton } = require( './toggle-button' );

		await openEmbeddedIframe( {
			container: {
				id: 'angie-sidebar-container',
				layout: 'sidebar',
				styleTheme: 'wordpress',
				create: true,
				skipDefaultCss: false,
				persistOpenState: true,
				resizable: true,
				chatToggleButton: {
					enabled: true,
					selector: '#demo-sidebar-toggle',
				},
			},
			iframe: {
				origin: 'https://angie.elementor.com',
				path: 'angie/embedded',
				uiTheme: 'light',
				isRTL: false,
				allowMobile: false,
			},
		} );

		expect( toggleAngieSidebar ).toHaveBeenCalledWith( appState.iframe, false, appState.containerId );
		expect( syncToggleButton ).toHaveBeenCalledWith( '#demo-sidebar-toggle', false );
	} );

	it( 'should forward allowMobile to openIframe', async () => {
		const { openIframe } = require( '../iframe' );

		await openEmbeddedIframe( {
			container: sidebarContainer,
			iframe: { ...iframeConfig, allowMobile: true },
		} );

		expect( openIframe ).toHaveBeenCalledWith(
			expect.objectContaining( { allowMobile: true } ),
			expect.anything(),
		);
	} );

	it( 'should keep the floating chat open when the user opened it during load', async () => {
		const { setChatWidgetOpen } = require( './chat-toggle/chat-shell' );

		await openFloatingChat( false );

		expect( setChatWidgetOpen ).toHaveBeenCalledWith( expect.objectContaining( { isOpen: true } ) );
	} );

	it( 'should keep the floating chat closed when the user did not open it', async () => {
		const { setChatWidgetOpen } = require( './chat-toggle/chat-shell' );

		await openFloatingChat( true );

		expect( setChatWidgetOpen ).toHaveBeenCalledWith( expect.objectContaining( { isOpen: false } ) );
	} );

	it( 'should keep the floating chat closed when the container is missing', async () => {
		const { setChatWidgetOpen } = require( './chat-toggle/chat-shell' );

		await openFloatingChat();

		expect( setChatWidgetOpen ).toHaveBeenCalledWith( expect.objectContaining( { isOpen: false } ) );
	} );
} );
