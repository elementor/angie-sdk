import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { appState } from '../config';
import { openEmbeddedIframe } from './open-embedded-iframe';

jest.mock( '../iframe', () => ( {
	openIframe: jest.fn( () => Promise.resolve() ),
} ) );

jest.mock( '../utils', () => ( {
	toggleAngieSidebar: jest.fn(),
} ) );

jest.mock( './chat-toggle/chat-shell', () => ( {
	setChatWidgetOpen: jest.fn(),
} ) );

jest.mock( './sidebar-toggle', () => ( {
	syncSidebarToggleButton: jest.fn(),
} ) );

describe( 'load-sidebar-v2/open-embedded-iframe', () => {
	beforeEach( () => {
		jest.clearAllMocks();
		appState.iframe = document.createElement( 'iframe' );
	} );

	it( 'should sync a custom host toggle when sidebar layout starts closed', async () => {
		const { toggleAngieSidebar } = require( '../utils' );
		const { syncSidebarToggleButton } = require( './sidebar-toggle' );

		await openEmbeddedIframe( {
			container: {
				id: 'angie-sidebar-container',
				layout: 'sidebar',
				styleTheme: 'wordpress',
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
			},
		} );

		expect( toggleAngieSidebar ).toHaveBeenCalledWith( appState.iframe, false );
		expect( syncSidebarToggleButton ).toHaveBeenCalledWith( '#demo-sidebar-toggle', false );
	} );
} );
