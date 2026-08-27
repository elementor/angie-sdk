import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { LAYOUT_FLOATING_CHAT, LAYOUT_SIDEBAR } from './config';
import { bootSidebar } from './boot-sidebar';
import { getFirstInstance, resetInstancesForTests } from '../instance-registry';

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
	openEmbeddedIframe: jest.fn( () => Promise.resolve( true ) ),
} ) );

jest.mock( './embedded-handshake', () => ( {
	sendEmbeddedConfig: jest.fn(),
	sendWidgetConfig: jest.fn(),
} ) );

jest.mock( './host-api-bridge', () => ( {
	initHostApiBridge: jest.fn(),
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
		document.head.innerHTML = '';
		resetInstancesForTests();
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
			expect.objectContaining( { instanceId: expect.any( String ) } ),
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

	it( 'should refuse a second sidebar layout instance', async () => {
		await bootSidebar( { container: { layout: LAYOUT_SIDEBAR }, host: { appId: 'app-a' } } );

		await expect( bootSidebar( {
			container: { layout: LAYOUT_SIDEBAR, id: 'sidebar-b' },
			host: { appId: 'app-b' },
		} ) ).rejects.toThrow( /sidebar/i );
	} );

	it( 'should refuse a container id that another instance already uses', async () => {
		await bootSidebar( {
			container: { layout: LAYOUT_FLOATING_CHAT },
			host: { appId: 'app-a' },
		} );

		await expect( bootSidebar( {
			container: { layout: LAYOUT_FLOATING_CHAT },
			host: { appId: 'app-b' },
		} ) ).rejects.toThrow( /angie-sidebar-container/ );
	} );

	it( 'should refuse an instance id that another instance already uses', async () => {
		await bootSidebar( {
			container: { id: 'chat-a', layout: LAYOUT_FLOATING_CHAT },
			host: { appId: 'app-a', instanceId: 'shared-id' },
		} );

		await expect( bootSidebar( {
			container: { id: 'chat-b', layout: LAYOUT_FLOATING_CHAT },
			host: { appId: 'app-b', instanceId: 'shared-id' },
		} ) ).rejects.toThrow( /shared-id/ );
	} );

	it( 'should name the instance after the sdk id, or the host id when given', async () => {
		await bootSidebar(
			{ container: { layout: LAYOUT_SIDEBAR }, host: { appId: 'app-a' } },
			'sdk123',
		);
		expect( getFirstInstance()?.instanceId ).toBe( 'sdk123' );

		resetInstancesForTests();
		document.body.innerHTML = '';

		await bootSidebar(
			{ container: { layout: LAYOUT_SIDEBAR }, host: { appId: 'app-a', instanceId: 'stable' } },
			'sdk123',
		);
		expect( getFirstInstance()?.instanceId ).toBe( 'stable' );
	} );
} );
