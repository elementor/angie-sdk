import { findToggleButton, injectToggleButton } from './toggle-button';

type WireSidebarToggleButtonArgs = {
	toggleButtonSelector: string;
};

export const syncSidebarToggleButton = ( toggleButtonSelector: string, isOpen: boolean ): void => {
	const toggleEl = findToggleButton( toggleButtonSelector );

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
	const toggleEl = findToggleButton( args.toggleButtonSelector );

	if ( ! toggleEl ) {
		return false;
	}

	attachSidebarToggleClickHandler( toggleEl );
	return true;
};

export const ensureSidebarToggleButton = ( args: WireSidebarToggleButtonArgs ): void => {
	const attempt = (): void => {
		if ( wireSidebarToggleButton( args ) ) {
			return;
		}

		injectToggleButton( args.toggleButtonSelector );

		if ( wireSidebarToggleButton( args ) ) {
			return;
		}

		setTimeout( attempt, 500 );
	};

	setTimeout( attempt, 100 );
};
