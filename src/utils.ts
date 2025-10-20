export const toggleAngieSidebar = ( iframe: HTMLIFrameElement, isOpen: boolean ) => {
	const sidebarContainer = document.getElementById( 'angie-sidebar-container' );
	if ( sidebarContainer ) {
		sidebarContainer.setAttribute( 'aria-hidden', isOpen ? 'false' : 'true' );
	}

	// Update iframe accessibility when sidebar state changes
	if ( isOpen ) {
		iframe.removeAttribute( 'tabindex' );
	} else {
		iframe.setAttribute( 'tabindex', '-1' );
	}
};

export const isMobile = () => {
	return window.screen.availWidth <= 768;
};

export const sendSuccessMessage = ( port: MessagePort, payload?: unknown ) => {
	port.postMessage( {
		status: 'success',
		payload,
	} );
};

export const sendErrorMessage = ( port: MessagePort, error: unknown ) => {
	port.postMessage( {
		status: 'error',
		payload: error,
	} );
};

export const waitForDocumentReady = () => {
	return new Promise( ( resolve ) => {
		if ( document.readyState === 'loading' ) {
			document.addEventListener( 'DOMContentLoaded', resolve );
		} else {
			resolve( null );
		}
	} );
};

export const isSafeUrl = ( url: string, trustedOrigins: string[] = [] ) => {
	const origins = trustedOrigins.length === 0 && typeof window !== 'undefined' 
		? [ window.location.origin ]
		: trustedOrigins;

	if ( ! url.startsWith( 'http' ) ) {
		return false;
	}

	try {
		const urlObject = new URL( url );
		return origins.includes( urlObject.origin );
	} catch {
		return false;
	}
};
