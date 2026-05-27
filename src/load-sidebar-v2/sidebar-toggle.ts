import { injectChatToggleButton, injectChatToggleButtonStyles } from './chat-toggle/widget-ui';

type WireSidebarToggleButtonArgs = {
	toggleButtonId: string;
};

export const syncSidebarToggleButton = ( toggleButtonId: string, isOpen: boolean ): void => {
	const toggleEl = document.getElementById( toggleButtonId );

	if ( ! toggleEl ) {
		return;
	}

	toggleEl.setAttribute( 'aria-expanded', isOpen ? 'true' : 'false' );
	toggleEl.setAttribute( 'aria-label', isOpen ? 'Close Angie' : 'Open Angie' );
};

const SIDEBAR_TOGGLE_WIRED_ATTR = 'data-angie-sidebar-toggle-wired';

const attachSidebarToggleClickHandler = ( toggleEl: HTMLElement ): void => {
	if ( toggleEl.getAttribute( SIDEBAR_TOGGLE_WIRED_ATTR ) === 'true' ) {
		return;
	}

	toggleEl.setAttribute( SIDEBAR_TOGGLE_WIRED_ATTR, 'true' );
	toggleEl.addEventListener( 'click', ( event ) => {
		event.preventDefault();
		const isOpen = toggleEl.getAttribute( 'aria-expanded' ) === 'true';
		window.toggleAngieSidebar?.( ! isOpen );
	} );
};

export const wireSidebarToggleButton = ( args: WireSidebarToggleButtonArgs ): boolean => {
	const toggleEl = document.getElementById( args.toggleButtonId );

	if ( ! toggleEl ) {
		return false;
	}

	attachSidebarToggleClickHandler( toggleEl );
	return true;
};

const injectSidebarToggleButton = ( toggleButtonId: string ): void => {
	injectChatToggleButtonStyles();
	injectChatToggleButton( toggleButtonId );
};

export const ensureSidebarToggleButton = ( args: WireSidebarToggleButtonArgs ): void => {
	const attempt = (): void => {
		if ( wireSidebarToggleButton( args ) ) {
			return;
		}

		injectSidebarToggleButton( args.toggleButtonId );

		if ( wireSidebarToggleButton( args ) ) {
			return;
		}

		setTimeout( attempt, 500 );
	};

	setTimeout( attempt, 100 );
};
