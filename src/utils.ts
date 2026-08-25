import { appState } from './config';

export const toggleAngieSidebar = (
	iframe: HTMLIFrameElement,
	isOpen: boolean,
	containerId: string = appState.containerId
) => {
	const sidebarContainer = document.getElementById( containerId );
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

/**
 * Two instances on a page usually share one iframe origin, so `event.origin` cannot tell
 * their iframes apart. The source window can.
 *
 * Returns true when there is nothing to compare against, so single-instance hosts behave
 * exactly as before.
 */
export const isFromIframe = ( event: MessageEvent, iframe: HTMLIFrameElement | null ) => {
	const ownWindow = iframe?.contentWindow;

	if ( ! ownWindow || ! event.source ) {
		return true;
	}

	return event.source === ownWindow;
};

export const isTrustedIframeMessage = (
	event: MessageEvent,
	iframeOrigin: string | undefined,
	iframe: HTMLIFrameElement | null
): boolean => event.origin === iframeOrigin && isFromIframe( event, iframe );

export const generateInstanceId = (): string => Math.random().toString( 36 ).substring( 2, 8 );

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
