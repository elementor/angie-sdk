import { beforeEach, describe, expect, it } from '@jest/globals';
import { MessageEventType } from '../../types';
import { CHAT_WIDGET_HIDDEN_CLASS, DEFAULT_CHAT_TOGGLE_BUTTON_ID } from './constants';
import { initChatShell, setChatWidgetOpen } from './chat-shell';
import { injectChatToggleButton, prepareChatWidgetContainer } from './widget-ui';

const CONTAINER_ID = 'angie-sidebar-container';
const IFRAME_ORIGIN = 'https://angie.elementor.com';
const CUSTOM_TOGGLE_ID = 'angie-lite-toggle';

describe( 'load-sidebar-v2/chat-toggle/chat-shell', () => {
	beforeEach( () => {
		document.body.innerHTML = '';
		document.head.innerHTML = '';

		const container = document.createElement( 'div' );
		container.id = CONTAINER_ID;
		document.body.appendChild( container );

		prepareChatWidgetContainer( CONTAINER_ID );
		injectChatToggleButton( DEFAULT_CHAT_TOGGLE_BUTTON_ID );
		initChatShell( {
			containerId: CONTAINER_ID,
			iframeOrigin: IFRAME_ORIGIN,
			toggleButtonId: DEFAULT_CHAT_TOGGLE_BUTTON_ID,
		} );
	} );

	it( 'should toggle widget open/close on button click', () => {
		const toggleButton = document.getElementById( DEFAULT_CHAT_TOGGLE_BUTTON_ID )!;
		const container = document.getElementById( CONTAINER_ID )!;

		toggleButton.click();

		expect( container.classList.contains( CHAT_WIDGET_HIDDEN_CLASS ) ).toBe( false );
		expect( toggleButton.getAttribute( 'aria-expanded' ) ).toBe( 'true' );

		toggleButton.click();

		expect( container.classList.contains( CHAT_WIDGET_HIDDEN_CLASS ) ).toBe( true );
		expect( toggleButton.getAttribute( 'aria-expanded' ) ).toBe( 'false' );
	} );

	it( 'should close widget when iframe sends toggleAngieSidebar with force false', () => {
		const container = document.getElementById( CONTAINER_ID )!;
		setChatWidgetOpen( {
			containerId: CONTAINER_ID,
			toggleButtonId: DEFAULT_CHAT_TOGGLE_BUTTON_ID,
			isOpen: true,
		} );

		window.dispatchEvent( new MessageEvent( 'message', {
			origin: IFRAME_ORIGIN,
			data: {
				type: 'toggleAngieSidebar',
				payload: { force: false },
			},
		} ) );

		expect( container.classList.contains( CHAT_WIDGET_HIDDEN_CLASS ) ).toBe( true );
	} );

	it( 'should open widget when iframe sends ANGIE_SIDEBAR_TOGGLED with force true', () => {
		const container = document.getElementById( CONTAINER_ID )!;

		window.dispatchEvent( new MessageEvent( 'message', {
			origin: IFRAME_ORIGIN,
			data: {
				type: MessageEventType.ANGIE_SIDEBAR_TOGGLED,
				payload: { force: true },
			},
		} ) );

		expect( container.classList.contains( CHAT_WIDGET_HIDDEN_CLASS ) ).toBe( false );
	} );

	it( 'should ignore messages from wrong origin', () => {
		const container = document.getElementById( CONTAINER_ID )!;

		window.dispatchEvent( new MessageEvent( 'message', {
			origin: 'https://evil.example.com',
			data: {
				type: 'toggleAngieSidebar',
				payload: { force: true },
			},
		} ) );

		expect( container.classList.contains( CHAT_WIDGET_HIDDEN_CLASS ) ).toBe( true );
	} );

	it( 'should support a custom toggle button id', () => {
		document.body.innerHTML = '';

		const container = document.createElement( 'div' );
		container.id = CONTAINER_ID;
		document.body.appendChild( container );

		prepareChatWidgetContainer( CONTAINER_ID );
		injectChatToggleButton( CUSTOM_TOGGLE_ID );
		initChatShell( {
			containerId: CONTAINER_ID,
			iframeOrigin: IFRAME_ORIGIN,
			toggleButtonId: CUSTOM_TOGGLE_ID,
		} );

		const toggleButton = document.getElementById( CUSTOM_TOGGLE_ID );
		expect( toggleButton ).not.toBeNull();
		expect( toggleButton?.className ).toBe( 'angie-widget-toggle' );
	} );
} );
