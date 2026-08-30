import { appState, type AppState } from './config';
import { createChildLogger } from './logger';

const iframeUtilsLogger = createChildLogger( 'iframe-utils' );

/** Cached DOM lookup when no registered instance owns an iframe. */
let angieIframeRef: HTMLIFrameElement | null = null;

const isInDocument = ( iframe: HTMLIFrameElement | null ): iframe is HTMLIFrameElement =>
	!! iframe && document.contains( iframe );

const originOf = ( iframe: HTMLIFrameElement ): string | null => {
	try {
		return new URL( iframe.src ).origin;
	} catch ( error ) {
		iframeUtilsLogger.error( 'Error parsing iframe URL:', error );
		return null;
	}
};

const sendToIframe = (
	iframe: HTMLIFrameElement | null,
	origin: string | null,
	message: Record<string, unknown>
): boolean => {
	if ( ! iframe?.contentWindow ) {
		return false;
	}

	if ( ! origin ) {
		iframeUtilsLogger.error( 'Could not determine target origin for Angie iframe' );
		return false;
	}

	iframe.contentWindow.postMessage( message, origin );
	return true;
};

const getInstanceIframe = ( instance: AppState ): HTMLIFrameElement | null =>
	isInDocument( instance.iframe ) ? instance.iframe : null;

const getInstanceIframeOrigin = ( instance: AppState ): string | null => {
	if ( instance.iframeUrlObject ) {
		return instance.iframeUrlObject.origin;
	}

	const iframe = getInstanceIframe( instance );
	return iframe ? originOf( iframe ) : null;
};

/**
 * Sends a message to one instance's iframe only. Every internal caller uses this, so two
 * instances on the same page can never receive each other's messages.
 */
export const postMessageToInstance = (
	instance: AppState,
	message: Record<string, unknown>
): boolean => sendToIframe(
	getInstanceIframe( instance ),
	getInstanceIframeOrigin( instance ),
	message
);

/**
 * Kept for callers outside the SDK, which have no instance to name. Resolves to instance
 * #1. Nothing inside the SDK uses it, so an ambiguous answer cannot corrupt routing.
 */
export const getAngieIframe = (): HTMLIFrameElement | null => {
	const instanceIframe = getInstanceIframe( appState );

	if ( instanceIframe ) {
		return instanceIframe;
	}

	if ( isInDocument( angieIframeRef ) ) {
		return angieIframeRef;
	}

	angieIframeRef = document.querySelector( 'iframe[src*="angie/"]' ) as HTMLIFrameElement;
	return angieIframeRef;
};

export const getAngieIframeOrigin = (): string | null => {
	const iframe = getAngieIframe();
	return iframe ? originOf( iframe ) : null;
};

export const postMessageToAngieIframe = (
	message: Record<string, unknown>,
	targetOrigin?: string
): boolean => {
	iframeUtilsLogger.log( 'postMessageToAngieIframe', message, targetOrigin );
	return sendToIframe( getAngieIframe(), targetOrigin || getAngieIframeOrigin(), message );
};
