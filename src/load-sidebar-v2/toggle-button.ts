export const TOGGLE_BUTTON_WIRED_ATTR = 'data-angie-toggle-wired';

export const syncToggleButton = ( toggleButtonSelector: string, isOpen: boolean ): void => {
	const toggleEl = document.querySelector<HTMLElement>( toggleButtonSelector );

	if ( ! toggleEl ) {
		return;
	}

	toggleEl.setAttribute( 'aria-expanded', isOpen ? 'true' : 'false' );
	toggleEl.setAttribute( 'aria-label', isOpen ? 'Close Angie' : 'Open Angie' );
};

type WireToggleButtonArgs = {
	toggleButtonSelector: string;
	onClick: ( event: Event ) => void;
};

export const wireToggleButton = ( args: WireToggleButtonArgs ): void => {
	const toggleEl = document.querySelector<HTMLElement>( args.toggleButtonSelector );

	if ( ! toggleEl || toggleEl.getAttribute( TOGGLE_BUTTON_WIRED_ATTR ) === 'true' ) {
		return;
	}

	toggleEl.setAttribute( TOGGLE_BUTTON_WIRED_ATTR, 'true' );
	toggleEl.addEventListener( 'click', args.onClick );
};
