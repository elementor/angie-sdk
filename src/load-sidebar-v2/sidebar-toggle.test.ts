import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { wireSidebarToggleButton } from './sidebar-toggle';

describe( 'load-sidebar-v2/sidebar-toggle', () => {
	beforeEach( () => {
		document.body.innerHTML = '';
		window.toggleAngieSidebar = jest.fn();
	} );

	it( 'should toggle sidebar from body state when aria-expanded is stale', () => {
		document.body.classList.add( 'angie-sidebar-active' );
		const toggleEl = document.createElement( 'button' );
		toggleEl.id = 'demo-sidebar-toggle';
		toggleEl.setAttribute( 'aria-expanded', 'false' );
		document.body.appendChild( toggleEl );

		wireSidebarToggleButton( { toggleButtonSelector: '#demo-sidebar-toggle' } );
		toggleEl.click();

		expect( window.toggleAngieSidebar ).toHaveBeenCalledWith();
	} );

	it( 'should wire the host toggle button only once', () => {
		const toggleEl = document.createElement( 'button' );
		toggleEl.id = 'demo-sidebar-toggle';
		document.body.appendChild( toggleEl );

		wireSidebarToggleButton( { toggleButtonSelector: '#demo-sidebar-toggle' } );
		wireSidebarToggleButton( { toggleButtonSelector: '#demo-sidebar-toggle' } );
		toggleEl.click();

		expect( window.toggleAngieSidebar ).toHaveBeenCalledTimes( 1 );
	} );
} );
