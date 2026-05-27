import { SIDEBAR_LOADING_ID } from './defaults';

export const ensureSidebarContainer = ( containerId: string, isRTL: boolean ): void => {
	if ( document.getElementById( containerId ) ) {
		return;
	}

	const container = document.createElement( 'div' );
	container.id = containerId;
	container.dir = isRTL ? 'rtl' : 'ltr';

	const loading = document.createElement( 'div' );
	loading.id = SIDEBAR_LOADING_ID;
	loading.setAttribute( 'aria-live', 'polite' );
	loading.className = 'angie-sr-only';
	container.appendChild( loading );
	document.body.appendChild( container );
};
