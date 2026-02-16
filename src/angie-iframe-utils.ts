import { createChildLogger } from './logger';

const iframeUtilsLogger = createChildLogger( 'iframe-utils' );
let angieIframeRef: HTMLIFrameElement | null = null;

export const setAngieIframeRef = ( iframe: HTMLIFrameElement | null ): void => {
	angieIframeRef = iframe;
};

export const getAngieIframe = (): HTMLIFrameElement | null => {
	if ( angieIframeRef && document.contains( angieIframeRef ) ) {
		return angieIframeRef;
	}

	angieIframeRef = document.querySelector( 'iframe[src*="angie/"]' ) as HTMLIFrameElement;
	return angieIframeRef;
};

export const angieIframeExists = (): boolean => {
	return getAngieIframe() !== null;
};

export const getAngieIframeOrigin = (): string | null => {
	const iframe = getAngieIframe();
	if ( ! iframe ) {
		return null;
	}

	try {
		return new URL( iframe.src ).origin;
	} catch ( error ) {
		iframeUtilsLogger.error( 'Error parsing iframe URL:', error );
		return null;
	}
};

export const postMessageToAngieIframe = (
	message: Record<string, unknown>,
	targetOrigin?: string
): boolean => {
	iframeUtilsLogger.log( 'postMessageToAngieIframe', message, targetOrigin );
	const iframe = getAngieIframe();
	if ( ! iframe?.contentWindow ) {
		return false;
	}

	const origin = targetOrigin || getAngieIframeOrigin();
	if ( ! origin ) {
		iframeUtilsLogger.error( 'Could not determine target origin for Angie iframe' );
		return false;
	}

	iframe.contentWindow.postMessage( message, origin );
	return true;
};
