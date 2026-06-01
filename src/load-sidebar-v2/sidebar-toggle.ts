type WireSidebarToggleButtonArgs = {
	toggleButtonSelector: string;
};

export const syncSidebarToggleButton = ( toggleButtonSelector: string, isOpen: boolean ): void => {
	const toggleEl = document.querySelector<HTMLElement>( toggleButtonSelector );

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
		window.toggleAngieSidebar?.();
	} );
};

export const wireSidebarToggleButton = ( args: WireSidebarToggleButtonArgs ): void => {
	const toggleEl = document.querySelector<HTMLElement>( args.toggleButtonSelector );

	if ( ! toggleEl ) {
		return;
	}

	attachSidebarToggleClickHandler( toggleEl );
};
