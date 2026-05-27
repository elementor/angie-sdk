import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CHAT_TOGGLE_BUTTON_CLASS } from './chat-toggle/constants';
import { ensureSidebarToggleButton, syncSidebarToggleButton, wireSidebarToggleButton } from './sidebar-toggle';

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

		expect( wireSidebarToggleButton( { toggleButtonId: 'angie-lite-toggle' } ) ).toBe( true );

		toggle.click();

		expect( window.toggleAngieSidebar ).toHaveBeenCalledWith( true );
	} );

	it( 'should sync aria attributes on the host toggle button', () => {
		const toggle = document.createElement( 'button' );
		toggle.id = 'angie-lite-toggle';
		document.body.appendChild( toggle );

		syncSidebarToggleButton( 'angie-lite-toggle', true );

		expect( toggle.getAttribute( 'aria-expanded' ) ).toBe( 'true' );
		expect( toggle.getAttribute( 'aria-label' ) ).toBe( 'Close Angie' );
	} );

	it( 'should inject and wire toggle button when host element is missing', () => {
		ensureSidebarToggleButton( { toggleButtonId: 'angie-lite-toggle' } );

		jest.runAllTimers();

		const toggle = document.getElementById( 'angie-lite-toggle' );
		expect( toggle ).not.toBeNull();
		expect( toggle?.className ).toBe( CHAT_TOGGLE_BUTTON_CLASS );
		expect( document.getElementById( 'angie-chat-toggle-styles' ) ).not.toBeNull();

		toggle?.click();
		expect( window.toggleAngieSidebar ).toHaveBeenCalledWith( true );
	} );
} );
