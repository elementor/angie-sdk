import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { appState } from '../../config';
import { toggleAngieSidebar } from '../../utils';
import { syncToggleButton } from '../toggle-button';
import { CHAT_WIDGET_HIDDEN_CLASS } from './constants';
import { setChatWidgetOpen } from './chat-shell';

jest.mock( '../../utils', () => ( {
	toggleAngieSidebar: jest.fn(),
} ) );

jest.mock( '../toggle-button', () => ( {
	syncToggleButton: jest.fn(),
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
		} );

		const container = document.getElementById( CONTAINER_ID )!;
		expect( container.classList.contains( CHAT_WIDGET_HIDDEN_CLASS ) ).toBe( true );
		expect( toggleAngieSidebar ).toHaveBeenCalledWith( appState.iframe, false );
		expect( syncToggleButton ).toHaveBeenCalledWith( TOGGLE_SELECTOR, false );
	} );

	it( 'should show the widget and delegate iframe accessibility when open', () => {
		const container = document.getElementById( CONTAINER_ID )!;
		container.classList.add( CHAT_WIDGET_HIDDEN_CLASS );

		setChatWidgetOpen( {
			containerId: CONTAINER_ID,
			toggleButtonSelector: TOGGLE_SELECTOR,
			isOpen: true,
		} );

		expect( container.classList.contains( CHAT_WIDGET_HIDDEN_CLASS ) ).toBe( false );
		expect( toggleAngieSidebar ).toHaveBeenCalledWith( appState.iframe, true );
		expect( syncToggleButton ).toHaveBeenCalledWith( TOGGLE_SELECTOR, true );
	} );
} );
