import { appState } from "./config";
import { sendErrorMessage, sendSuccessMessage } from "./utils";

declare global {
	interface Window {
		toggleAngieSidebar: ( force?: boolean, skipTransition?: boolean ) => void;
	}
}

// OAuth message types for iframe communication
export const OAUTH_MESSAGE_TYPES = {
	OAUTH_GET_CODE_AND_STATE: 'OAUTH_GET_CODE_AND_STATE',
	OAUTH_GET_TOP_URL: 'OAUTH_GET_TOP_URL',
	OAUTH_REDIRECT_TOP_WINDOW: 'OAUTH_REDIRECT_TOP_WINDOW',
	OAUTH_UPDATE_URL: 'OAUTH_UPDATE_URL',
	ANGIE_REDIRECT_TO_WP_ADMIN_WITH_OAUTH: 'ANGIE_REDIRECT_TO_WP_ADMIN_WITH_OAUTH',
	ANGIE_REDIRECT_TO_AUTH_ORIGIN_LOGOUT: 'ANGIE_REDIRECT_TO_AUTH_ORIGIN_LOGOUT',
} as const;

function checkOAuthParameterCleanup( oldUrl: string, newUrl: string ): boolean {
	const newUrlObject = new URL( newUrl );
	const oldUrlObject = new URL( oldUrl );
	const newUrlParams = newUrlObject.searchParams;
	const oldUrlParams = oldUrlObject.searchParams;
	const oauthParams = [ 'oauth_code', 'oauth_state', 'start-oauth' ];
	return oauthParams.some( param => oldUrlParams?.has( param ) ) &&
		! oauthParams.some( param => newUrlParams?.has( param ) );
}

function openSidebarAfterAuthentication(): void {
	console.log( 'OAuth parameters cleaned, opening sidebar' );
	try {
		localStorage.setItem( 'angie_sidebar_state', 'open' );
	} catch ( e ) {
		console.warn( 'localStorage not available' );
	}
	setTimeout( () => {
		window.toggleAngieSidebar( true );
	}, 500 );
}

function handleUrlUpdate( newUrl: string, port: MessagePort ): void {
	if ( ! history?.replaceState ) {
		console.warn( 'history.replaceState not supported in this browser' );
		sendErrorMessage( port, { message: 'URL update not supported in this browser' } );
		return;
	}

	try {
		const oldUrl = window.location.href;
		history.replaceState( {}, '', newUrl );

		if ( checkOAuthParameterCleanup( oldUrl, newUrl ) ) {
			openSidebarAfterAuthentication();
		}

		sendSuccessMessage( port, {
			message: 'URL updated successfully',
		} );
	} catch ( error ) {
		console.warn( 'Failed to update URL via history.replaceState:', error );
		sendErrorMessage( port, { message: 'URL update failed: ' + ( error instanceof Error ? error.message : 'Unknown error' ) } );
	}
}

function redirectToWpAdminWithOAuth(): void {
	const currentUrl = new URL( window.location.href );
	currentUrl.searchParams.set( 'start-oauth', '1' );
	console.log( 'OAuth: Redirecting to wp-admin with OAuth:', currentUrl.toString() );
	window.location.href = currentUrl.toString();
}

export const getOAuthCodeAndState = ( port: MessagePort ): void => {
	const urlParams = new URLSearchParams( window.location.search );
	const oauthCode = urlParams.get( 'oauth_code' );
	const oauthState = urlParams.get( 'oauth_state' );

	if ( oauthCode && oauthState ) {
		sendSuccessMessage( port, {
			code: oauthCode,
			state: oauthState,
		} );
	} else {
		const oauthError = urlParams.get( 'oauth_error' );
		if ( oauthError ) {
			sendErrorMessage( port, {
				message: oauthError,
				code: oauthCode || null,
				state: oauthState || null,
			} );
			const cleanUrl = new URL( window.location.href );
			cleanUrl.searchParams.delete( 'oauth_error' );
			history.replaceState( {}, '', cleanUrl.toString() );
		} else {
			sendSuccessMessage( port, {
				message: 'No OAuth error found',
			} );
		}
	}
};

export const listenToOAuthFromIframe = (): void => {
	window.addEventListener( 'message', ( event ) => {
		if ( event.origin !== appState.iframeUrlObject?.origin ) {
			return;
		}

		switch ( event.data.type ) {
			case OAUTH_MESSAGE_TYPES.OAUTH_GET_CODE_AND_STATE:
				getOAuthCodeAndState( event.ports[ 0 ] );
				break;

			case OAUTH_MESSAGE_TYPES.OAUTH_GET_TOP_URL:
				console.log( 'OAuth: Iframe requested top window URL via MessageChannel' );
				sendSuccessMessage( event.ports[ 0 ], {
					topUrl: window.location.href,
				} );
				break;

			case OAUTH_MESSAGE_TYPES.OAUTH_REDIRECT_TOP_WINDOW:
				console.log( 'OAuth: Iframe requested top window redirect to:', event.data.payload.url );
				window.location.href = event.data.payload.url;
				break;

			case OAUTH_MESSAGE_TYPES.OAUTH_UPDATE_URL:
				console.log( 'OAuth: Iframe requested URL update to:', event.data.payload.url );
				handleUrlUpdate( event.data.payload.url, event.ports[ 0 ] );
				break;

			case OAUTH_MESSAGE_TYPES.ANGIE_REDIRECT_TO_WP_ADMIN_WITH_OAUTH:
				redirectToWpAdminWithOAuth();
				break;

			case OAUTH_MESSAGE_TYPES.ANGIE_REDIRECT_TO_AUTH_ORIGIN_LOGOUT:
				try {
					redirectToWpAdminWithOAuth();
				} catch ( error ) {
					console.error( 'OAuth: Auth origin logout fallback failed:', error );
					window.location.reload();
				}
				break;
		}
	} );
};
