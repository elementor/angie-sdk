import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CHAT_TOGGLE_BUTTON_CLASS } from './chat-toggle/constants';
import { ensureSidebarToggleButton, syncSidebarToggleButton, wireSidebarToggleButton } from './sidebar-toggle';

const TOGGLE_SELECTOR = '#angie-lite-toggle';

describe( 'load-sidebar-v2/sidebar-toggle', () => {
	beforeEach( () => {
		document.body.innerHTML = '';
		document.getElementById( 'angie-chat-toggle-styles' )?.remove();
		window.toggleAngieSidebar = jest.fn();
		jest.useFakeTimers();
	} );

	afterEach( () => {
		jest.useRealTimers();
	} );

	it( 'should wire host toggle button to toggleAngieSidebar', () => {
		const toggle = document.createElement( 'button' );
		toggle.id = 'angie-lite-toggle';
		document.body.appendChild( toggle );

		expect( wireSidebarToggleButton( { toggleButtonSelector: TOGGLE_SELECTOR } ) ).toBe( true );

		toggle.click();

		expect( window.toggleAngieSidebar ).toHaveBeenCalledWith( true );
	} );

	it( 'should sync aria attributes on the host toggle button', () => {
		const toggle = document.createElement( 'button' );
		toggle.id = 'angie-lite-toggle';
		document.body.appendChild( toggle );

		syncSidebarToggleButton( TOGGLE_SELECTOR, true );

		expect( toggle.getAttribute( 'aria-expanded' ) ).toBe( 'true' );
		expect( toggle.getAttribute( 'aria-label' ) ).toBe( 'Close Angie' );
	} );

	it( 'should wire host toggle button matched by attribute selector', () => {
		const toggle = document.createElement( 'button' );
		toggle.setAttribute( 'data-test', 'header-toggle-angie-chat' );
		document.body.appendChild( toggle );

		expect( wireSidebarToggleButton( { toggleButtonSelector: '[data-test="header-toggle-angie-chat"]' } ) ).toBe( true );

		toggle.click();

		expect( window.toggleAngieSidebar ).toHaveBeenCalledWith( true );
	} );

	it( 'should inject and wire toggle button when host element is missing', () => {
		ensureSidebarToggleButton( { toggleButtonSelector: TOGGLE_SELECTOR } );

		jest.runAllTimers();

		const toggle = document.querySelector( TOGGLE_SELECTOR );
		expect( toggle ).not.toBeNull();
		expect( toggle?.className ).toBe( CHAT_TOGGLE_BUTTON_CLASS );
		expect( document.getElementById( 'angie-chat-toggle-styles' ) ).not.toBeNull();

		toggle?.dispatchEvent( new MouseEvent( 'click', { bubbles: true } ) );
		expect( window.toggleAngieSidebar ).toHaveBeenCalledWith( true );
	} );
} );
