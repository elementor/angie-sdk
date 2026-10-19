import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import {
	disableNavigationPrevention,
	isValidPath,
	openIframe,
	registerIframeHostHandler,
	resetIframeHostHandlersForTests,
} from './iframe';
import { appState } from './config';
import { createAngieInstance, resetInstancesForTests } from './instance-registry';
import { MessageEventType } from './types';

jest.mock( './logger', () => ( {
	createChildLogger: jest.fn( () => ( {
		log: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	} ) ),
} ) );

jest.mock( './openSaaSPage', () => ( {
	openSaaSPage: jest.fn( () => Promise.resolve( {
		iframe: document.createElement( 'iframe' ),
		iframeUrlObject: new URL( 'https://angie.elementor.com/angie/embedded' ),
	} ) ),
} ) );

jest.mock( './sdk', () => ( {
	bindAngieTriggerChannel: jest.fn(),
	flushPendingSdkMessages: jest.fn(),
	registerSdkInstance: jest.fn(),
	startSdkMessageRouting: jest.fn(),
} ) );

jest.mock( './oauth', () => ( {
	listenToOAuthFromIframe: jest.fn(),
	setupOidcLoginFlowHandler: jest.fn(),
} ) );

describe( 'disableNavigationPrevention', () => {
	let mockContentWindow: { postMessage: jest.Mock };
	let mockIframe: HTMLIFrameElement;
	let mockOrigin: URL;
	let originalSetTimeout: typeof setTimeout;

	beforeEach( () => {
		jest.clearAllMocks();
		resetInstancesForTests();
		resetIframeHostHandlersForTests();
		
		originalSetTimeout = global.setTimeout;
		
		global.setTimeout = jest.fn( ( callback: () => void ) => {
			callback();
			return 0 as unknown as ReturnType<typeof setTimeout>;
		} ) as unknown as typeof setTimeout;

		mockContentWindow = {
			postMessage: jest.fn(),
		};

		mockIframe = {
			contentWindow: mockContentWindow as unknown as Window,
		} as HTMLIFrameElement;

		mockOrigin = new URL( 'https://angie.elementor.com' );

		appState.iframe = mockIframe;
		appState.iframeUrlObject = mockOrigin;
	} );

	afterEach( () => {
		global.setTimeout = originalSetTimeout;
		
		appState.iframe = null;
		appState.iframeUrlObject = null;
	} );

	it( 'should successfully post message when iframe and origin are available', async () => {
		// Act
		await disableNavigationPrevention();

		// Assert
		expect( mockContentWindow.postMessage ).toHaveBeenCalledWith(
			{ type: MessageEventType.ANGIE_DISABLE_NAVIGATION_PREVENTION },
			mockOrigin.origin
		);
		expect( mockContentWindow.postMessage ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'should not post message when iframe is null', async () => {
		// Arrange
		appState.iframe = null;

		// Act
		await disableNavigationPrevention();

		// Assert
		expect( mockContentWindow.postMessage ).not.toHaveBeenCalled();
	} );

	it( 'should throw error when postMessage fails', async () => {
		// Arrange
		const mockError = new Error( 'postMessage failed' );
		mockContentWindow.postMessage.mockImplementation( () => {
			throw mockError;
		} );

		// Act & Assert
		await expect( disableNavigationPrevention() ).rejects.toThrow( 'postMessage failed' );
	} );

	it( 'should post to the provided instance iframe, not global appState', async () => {
		const sidebarWindow = { postMessage: jest.fn() };
		const chatWindow = { postMessage: jest.fn() };
		const origin = new URL( 'https://angie.elementor.com' );

		const sidebarInstance = createAngieInstance( {
			containerId: 'sidebar-container',
			instanceId: 'demo-sidebar',
			layout: 'sidebar',
		} );
		const chatInstance = createAngieInstance( {
			containerId: 'chat-container',
			instanceId: 'demo-chat',
			layout: 'floatingChat',
		} );

		sidebarInstance.iframe = { contentWindow: sidebarWindow } as unknown as HTMLIFrameElement;
		sidebarInstance.iframeUrlObject = origin;
		chatInstance.iframe = { contentWindow: chatWindow } as unknown as HTMLIFrameElement;
		chatInstance.iframeUrlObject = origin;

		appState.iframe = sidebarInstance.iframe;
		appState.iframeUrlObject = origin;

		await disableNavigationPrevention( chatInstance );

		expect( chatWindow.postMessage ).toHaveBeenCalledWith(
			{ type: MessageEventType.ANGIE_DISABLE_NAVIGATION_PREVENTION },
			origin.origin,
		);
		expect( sidebarWindow.postMessage ).not.toHaveBeenCalled();
	} );
} );

describe( 'iframe host message routing', () => {
	let originalSetTimeout: typeof setTimeout;

	beforeEach( () => {
		jest.clearAllMocks();
		resetInstancesForTests();
		resetIframeHostHandlersForTests();

		originalSetTimeout = global.setTimeout;
		global.setTimeout = jest.fn( ( callback: () => void ) => {
			callback();
			return 0 as unknown as ReturnType<typeof setTimeout>;
		} ) as unknown as typeof setTimeout;
	} );

	afterEach( () => {
		global.setTimeout = originalSetTimeout;
		resetIframeHostHandlersForTests();
	} );

	it( 'should disable navigation prevention on the iframe that sent the reload message', () => {
		const sidebarWindow = { postMessage: jest.fn() };
		const chatWindow = { postMessage: jest.fn() };
		const origin = 'https://angie.elementor.com';

		const sidebarInstance = createAngieInstance( {
			containerId: 'sidebar-container',
			instanceId: 'demo-sidebar',
			layout: 'sidebar',
		} );
		const chatInstance = createAngieInstance( {
			containerId: 'chat-container',
			instanceId: 'demo-chat',
			layout: 'floatingChat',
		} );

		const sidebarIframe = { contentWindow: sidebarWindow } as unknown as HTMLIFrameElement;
		const chatIframe = { contentWindow: chatWindow } as unknown as HTMLIFrameElement;

		sidebarInstance.iframe = sidebarIframe;
		sidebarInstance.iframeUrlObject = new URL( `${ origin }/angie/embedded` );
		chatInstance.iframe = chatIframe;
		chatInstance.iframeUrlObject = new URL( `${ origin }/angie/embedded` );

		registerIframeHostHandler( {
			instance: sidebarInstance,
			trustedOrigins: [ window.location.origin, origin ],
		} );
		registerIframeHostHandler( {
			instance: chatInstance,
			trustedOrigins: [ window.location.origin, origin ],
		} );

		window.dispatchEvent( Object.assign( new Event( 'message' ), {
			origin,
			source: chatWindow,
			data: {
				type: MessageEventType.ANGIE_PAGE_RELOAD,
				payload: { confirmed: true },
			},
		} ) );

		expect( chatWindow.postMessage ).toHaveBeenCalledWith(
			{ type: MessageEventType.ANGIE_DISABLE_NAVIGATION_PREVENTION },
			origin,
		);
		expect( sidebarWindow.postMessage ).not.toHaveBeenCalled();
	} );
} );

describe( 'openIframe appId', () => {
	let mockOpenSaaSPage: jest.Mock;

	beforeEach( () => {
		jest.clearAllMocks();
		resetInstancesForTests();
		resetIframeHostHandlersForTests();
		// jsdom reports availWidth 0, which openIframe treats as mobile and skips.
		Object.defineProperty( window.screen, 'availWidth', { value: 1280, configurable: true } );
		document.body.innerHTML = '<div id="angie-sidebar-container"></div>';
		mockOpenSaaSPage = require( './openSaaSPage' ).openSaaSPage as jest.Mock;
	} );

	afterEach( () => {
		document.body.innerHTML = '';
		resetIframeHostHandlersForTests();
	} );

	it( 'should forward the instance appId to the iframe url builder', async () => {
		const instance = createAngieInstance( {
			containerId: 'angie-sidebar-container',
			instanceId: 'demo-sidebar',
			appId: 'NG-ab35bf57',
			layout: 'sidebar',
		} );

		await openIframe( { uiTheme: 'light', isRTL: false }, instance );

		expect( mockOpenSaaSPage ).toHaveBeenCalledWith(
			expect.objectContaining( { appId: 'NG-ab35bf57' } ),
		);
	} );

	it( 'should forward no appId when the instance has none', async () => {
		const instance = createAngieInstance( {
			containerId: 'angie-sidebar-container',
			instanceId: 'demo-sidebar',
			layout: 'sidebar',
		} );

		await openIframe( { uiTheme: 'light', isRTL: false }, instance );

		expect( mockOpenSaaSPage ).toHaveBeenCalledWith(
			expect.objectContaining( { appId: undefined } ),
		);
	} );
} );

describe( 'openIframe on mobile', () => {
	let mockOpenSaaSPage: jest.Mock;

	beforeEach( () => {
		jest.clearAllMocks();
		resetInstancesForTests();
		resetIframeHostHandlersForTests();
		Object.defineProperty( window.screen, 'availWidth', { value: 375, configurable: true } );
		document.body.innerHTML = '<div id="angie-sidebar-container"></div>';
		mockOpenSaaSPage = require( './openSaaSPage' ).openSaaSPage as jest.Mock;
	} );

	afterEach( () => {
		document.body.innerHTML = '';
		resetIframeHostHandlersForTests();
	} );

	const createInstance = () => createAngieInstance( {
		containerId: 'angie-sidebar-container',
		instanceId: 'mobile-test',
		layout: 'sidebar',
	} );

	it( 'should skip the iframe on mobile by default', async () => {
		const result = await openIframe( { uiTheme: 'light', isRTL: false }, createInstance() );

		expect( result ).toBeUndefined();
		expect( mockOpenSaaSPage ).not.toHaveBeenCalled();
	} );

	it( 'should open the iframe on mobile when allowMobile is set', async () => {
		await openIframe( { uiTheme: 'light', isRTL: false, allowMobile: true }, createInstance() );

		expect( mockOpenSaaSPage ).toHaveBeenCalled();
	} );
} );

describe( 'openIframe trigger channel', () => {
	let mockOpenSaaSPage: jest.Mock;
	let mockBindAngieTriggerChannel: jest.Mock;
	let mockStartSdkMessageRouting: jest.Mock;
	let mockRegisterSdkInstance: jest.Mock;

	beforeEach( () => {
		jest.clearAllMocks();
		resetInstancesForTests();
		resetIframeHostHandlersForTests();
		Object.defineProperty( window.screen, 'availWidth', { value: 1280, configurable: true } );
		document.body.innerHTML = '<div id="angie-sidebar-container"></div>';
		mockOpenSaaSPage = require( './openSaaSPage' ).openSaaSPage as jest.Mock;
		mockBindAngieTriggerChannel = require( './sdk' ).bindAngieTriggerChannel as jest.Mock;
		mockStartSdkMessageRouting = require( './sdk' ).startSdkMessageRouting as jest.Mock;
		mockRegisterSdkInstance = require( './sdk' ).registerSdkInstance as jest.Mock;
	} );

	afterEach( () => {
		document.body.innerHTML = '';
		resetIframeHostHandlersForTests();
	} );

	it( 'should open the trigger port when angie/ready resolves', async () => {
		const instance = createAngieInstance( {
			containerId: 'angie-sidebar-container',
			instanceId: 'aaaaaa',
			layout: 'sidebar',
		} );
		const iframe = document.createElement( 'iframe' );
		const contentWindow = { postMessage: jest.fn() };
		Object.defineProperty( iframe, 'contentWindow', { value: contentWindow } );
		iframe.setAttribute( 'src', 'https://angie.elementor.com/angie/embedded' );

		let resolveOpen: ( value: { iframe: HTMLIFrameElement; iframeUrlObject: URL } ) => void = () => {};
		mockOpenSaaSPage.mockImplementation( ( ...args: unknown[] ) => {
			const props = args[ 0 ] as { insertCallback?: ( frame: HTMLIFrameElement ) => void };
			props.insertCallback?.( iframe );
			return new Promise( ( resolve ) => {
				resolveOpen = resolve;
			} );
		} );

		const pending = openIframe( { uiTheme: 'light', isRTL: false }, instance );

		expect( instance.iframe ).toBeNull();
		expect( mockRegisterSdkInstance ).not.toHaveBeenCalled();
		expect( mockStartSdkMessageRouting ).not.toHaveBeenCalled();
		expect( mockBindAngieTriggerChannel ).not.toHaveBeenCalled();

		resolveOpen( {
			iframe,
			iframeUrlObject: new URL( iframe.src ),
		} );
		await pending;

		expect( instance.iframe ).toBe( iframe );
		expect( mockBindAngieTriggerChannel ).toHaveBeenCalledTimes( 1 );
		expect( mockBindAngieTriggerChannel ).toHaveBeenCalledWith( instance );
		expect( mockRegisterSdkInstance ).toHaveBeenCalledWith( instance );
		expect( mockStartSdkMessageRouting ).toHaveBeenCalled();
	} );
} );

describe( 'isValidPath', () => {
	it.each( [
		'angie/wp-admin',
		'custom/path',
		'/angie/wp-admin',
		'angie',
	] )( 'should accept valid relative path: %s', ( path ) => {
		expect( isValidPath( path ) ).toBe( true );
	} );

	it.each( [
		'https://evil.com',
		'http://evil.com/path',
		'//evil.com',
		'https://evil.com/angie/wp-admin',
	] )( 'should reject absolute URL or protocol-relative path: %s', ( path ) => {
		expect( isValidPath( path ) ).toBe( false );
	} );
} );
