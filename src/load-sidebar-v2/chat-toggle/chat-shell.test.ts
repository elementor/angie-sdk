import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { appState } from '../../config';
import { toggleAngieSidebar } from '../../utils';
import { syncToggleButton } from '../toggle-button';
import { CHAT_WIDGET_HIDDEN_CLASS } from './constants';
import { initChatShell, resetChatShellForTests, setChatWidgetOpen } from './chat-shell';
import { createAngieInstance, resetInstancesForTests } from '../../instance-registry';
import { resetHostMessageRouterForTests } from '../host-message-router';

jest.mock( '../../utils', () => ( {
	...( jest.requireActual( '../../utils' ) as object ),
	toggleAngieSidebar: jest.fn(),
	sendSuccessMessage: jest.fn(),
} ) );

jest.mock( '../toggle-button', () => ( {
	syncToggleButton: jest.fn(),
	wireToggleButton: jest.fn(),
} ) );

const CONTAINER_ID = 'angie-sidebar-container';
const TOGGLE_SELECTOR = '#angie-widget-toggle';

describe( 'load-sidebar-v2/chat-toggle/chat-shell', () => {
	beforeEach( () => {
		jest.clearAllMocks();
		document.body.innerHTML = `
			<div id="${ CONTAINER_ID }"></div>
			<button id="angie-widget-toggle" type="button"></button>
		`;
		appState.containerId = CONTAINER_ID;
		appState.iframe = document.createElement( 'iframe' );
	} );

	it( 'should hide the widget and delegate iframe accessibility when closed', () => {
		setChatWidgetOpen( {
			containerId: CONTAINER_ID,
			toggleButtonSelector: TOGGLE_SELECTOR,
			isOpen: false,
			instance: appState,
		} );

		const container = document.getElementById( CONTAINER_ID )!;
		expect( container.classList.contains( CHAT_WIDGET_HIDDEN_CLASS ) ).toBe( true );
		expect( toggleAngieSidebar ).toHaveBeenCalledWith( appState.iframe, false, CONTAINER_ID );
		expect( syncToggleButton ).toHaveBeenCalledWith( TOGGLE_SELECTOR, false );
	} );

	it( 'should show the widget and delegate iframe accessibility when open', () => {
		const container = document.getElementById( CONTAINER_ID )!;
		container.classList.add( CHAT_WIDGET_HIDDEN_CLASS );

		setChatWidgetOpen( {
			containerId: CONTAINER_ID,
			toggleButtonSelector: TOGGLE_SELECTOR,
			isOpen: true,
			instance: appState,
		} );

		expect( container.classList.contains( CHAT_WIDGET_HIDDEN_CLASS ) ).toBe( false );
		expect( toggleAngieSidebar ).toHaveBeenCalledWith( appState.iframe, true, CONTAINER_ID );
		expect( syncToggleButton ).toHaveBeenCalledWith( TOGGLE_SELECTOR, true );
	} );
} );

describe( 'load-sidebar-v2/chat-toggle/chat-shell multi-instance', () => {
	const IFRAME_ORIGIN = 'https://angie.elementor.com';

	beforeEach( () => {
		jest.clearAllMocks();
		resetChatShellForTests();
		resetHostMessageRouterForTests();
		resetInstancesForTests();
		document.body.innerHTML = `
			<div id="chat-a" class="${ CHAT_WIDGET_HIDDEN_CLASS }"></div>
			<div id="chat-b" class="${ CHAT_WIDGET_HIDDEN_CLASS }"></div>
			<button id="toggle-a" type="button"></button>
			<button id="toggle-b" type="button"></button>
		`;
	} );

	it( 'should open only the widget whose iframe sent the toggle message', () => {
		const first = createAngieInstance( {
			containerId: 'chat-a',
			instanceId: 'aaaaaa',
			layout: 'floatingChat',
		} );
		const second = createAngieInstance( {
			containerId: 'chat-b',
			instanceId: 'bbbbbb',
			layout: 'floatingChat',
		} );
		const secondWindow = {} as Window;
		first.iframe = { contentWindow: {} as Window } as HTMLIFrameElement;
		second.iframe = { contentWindow: secondWindow } as HTMLIFrameElement;

		initChatShell( {
			containerId: 'chat-a',
			iframeOrigin: IFRAME_ORIGIN,
			toggleButtonSelector: '#toggle-a',
			instance: first,
		} );
		initChatShell( {
			containerId: 'chat-b',
			iframeOrigin: IFRAME_ORIGIN,
			toggleButtonSelector: '#toggle-b',
			instance: second,
		} );

		window.dispatchEvent( new MessageEvent( 'message', {
			origin: IFRAME_ORIGIN,
			source: secondWindow,
			data: { type: 'toggleAngieSidebar', payload: { force: true } },
		} ) );

		expect( document.getElementById( 'chat-b' )!.classList.contains( CHAT_WIDGET_HIDDEN_CLASS ) )
			.toBe( false );
		expect( document.getElementById( 'chat-a' )!.classList.contains( CHAT_WIDGET_HIDDEN_CLASS ) )
			.toBe( true );
	} );

	it( 'should keep the first widget listening after a second one starts', () => {
		const first = createAngieInstance( {
			containerId: 'chat-a',
			instanceId: 'aaaaaa',
			layout: 'floatingChat',
		} );
		const second = createAngieInstance( {
			containerId: 'chat-b',
			instanceId: 'bbbbbb',
			layout: 'floatingChat',
		} );
		const firstWindow = {} as Window;
		first.iframe = { contentWindow: firstWindow } as HTMLIFrameElement;
		second.iframe = { contentWindow: {} as Window } as HTMLIFrameElement;

		initChatShell( {
			containerId: 'chat-a',
			iframeOrigin: IFRAME_ORIGIN,
			toggleButtonSelector: '#toggle-a',
			instance: first,
		} );
		initChatShell( {
			containerId: 'chat-b',
			iframeOrigin: IFRAME_ORIGIN,
			toggleButtonSelector: '#toggle-b',
			instance: second,
		} );

		window.dispatchEvent( new MessageEvent( 'message', {
			origin: IFRAME_ORIGIN,
			source: firstWindow,
			data: { type: 'toggleAngieSidebar', payload: { force: true } },
		} ) );

		expect( document.getElementById( 'chat-a' )!.classList.contains( CHAT_WIDGET_HIDDEN_CLASS ) )
			.toBe( false );
	} );
} );
