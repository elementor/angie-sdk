import { createChildLogger } from './logger';

const logger = createChildLogger( 'oidc-auth' );

const OIDC_AUTH_URL_PARAMS = {
	LOGIN_SUCCESS: 'oauth2_login_success',
	STATE: 'oauth2_state',
	TOP_ORIGIN: 'oauth2_top_origin',
} as const;

const OIDC_AUTH_MESSAGE_TYPES = {
	LOGIN_FLOW_COMPLETE: 'OAUTH2_LOGIN_FLOW_COMPLETE_EVENT',
	GET_TOP_URL: 'OAUTH_GET_TOP_URL',
	REDIRECT_TOP_WINDOW: 'OAUTH_REDIRECT_TOP_WINDOW',
	UPDATE_URL: 'OAUTH_UPDATE_URL',
	CHECK_PENDING: 'OAUTH2_CHECK_PENDING',
} as const;

export type OidcAuthAppWindow = {
	window: HTMLIFrameElement | null;
	windowURL: URL | null;
};

export function isOidcFlowInUrl(): boolean {
	if ( typeof window === 'undefined' ) {
		return false;
	}
	const urlParams = new URLSearchParams( window.location.search );
	return urlParams.has( OIDC_AUTH_URL_PARAMS.LOGIN_SUCCESS ) ||
		urlParams.has( OIDC_AUTH_URL_PARAMS.STATE ) ||
		urlParams.has( OIDC_AUTH_URL_PARAMS.TOP_ORIGIN );
}

function sendPortSuccess( port: MessagePort, payload?: unknown ): void {
	port.postMessage( { status: 'success', payload } );
}

function sendPortError( port: MessagePort, error: unknown ): void {
	port.postMessage( { status: 'error', payload: error } );
}

function checkOAuthParamsCleared( oldUrl: string, newUrl: string ): boolean {
	const oldParams = new URL( oldUrl ).searchParams;
	const newParams = new URL( newUrl ).searchParams;
	const oidcParams = [ OIDC_AUTH_URL_PARAMS.LOGIN_SUCCESS, OIDC_AUTH_URL_PARAMS.STATE, OIDC_AUTH_URL_PARAMS.TOP_ORIGIN ];
	return oidcParams.some( param => oldParams.has( param ) ) &&
		! oidcParams.some( param => newParams.has( param ) );
}

type SetupOidcAuthParentListenerArgs = {
	trustedOrigin: string;
	onOAuthParamsCleared?: () => void;
};

export function setupOidcAuthParentListener( { trustedOrigin, onOAuthParamsCleared }: SetupOidcAuthParentListenerArgs ): void {
	window.addEventListener( 'message', ( event ) => {
		if ( event.origin !== trustedOrigin ) {
			return;
		}

		const port = event.ports?.[ 0 ];

		switch ( event.data.type ) {
			case OIDC_AUTH_MESSAGE_TYPES.GET_TOP_URL:
				if ( ! port ) {
					return;
				}
				sendPortSuccess( port, { topUrl: window.location.href } );
				break;

			case OIDC_AUTH_MESSAGE_TYPES.REDIRECT_TOP_WINDOW:
				window.location.href = event.data.payload.url;
				break;

			case OIDC_AUTH_MESSAGE_TYPES.UPDATE_URL: {
				if ( ! port ) {
					return;
				}
				const newUrl = event.data.payload.url;
				if ( ! history?.replaceState ) {
					sendPortError( port, { message: 'URL update not supported in this browser' } );
					return;
				}
				try {
					const oldUrl = window.location.href;
					history.replaceState( {}, '', newUrl );

					if ( checkOAuthParamsCleared( oldUrl, newUrl ) ) {
						onOAuthParamsCleared?.();
					}

					sendPortSuccess( port, { message: 'URL updated successfully' } );
				} catch ( error ) {
					sendPortError( port, {
						message: 'URL update failed: ' + ( error instanceof Error ? error.message : 'Unknown error' ),
					} );
				}
				break;
			}

			case OIDC_AUTH_MESSAGE_TYPES.CHECK_PENDING: {
				if ( ! port ) {
					return;
				}
				const searchParams = new URLSearchParams( window.location.search );
				const isPending = searchParams.get( OIDC_AUTH_URL_PARAMS.LOGIN_SUCCESS ) === 'true';
				sendPortSuccess( port, { isPending } );
				break;
			}
		}
	} );
}

function sendOidcStateToWindow( payload: Record<string, unknown>, targets: OidcAuthAppWindow ): void {
	const targetWindow = targets.window?.contentWindow;
	const targetOrigin = targets.windowURL?.origin;

	if ( ! targetWindow || ! targetOrigin ) {
		logger.warn( 'Cannot send OIDC state: window or origin not available' );
		return;
	}

	targetWindow.postMessage( {
		type: OIDC_AUTH_MESSAGE_TYPES.LOGIN_FLOW_COMPLETE,
		payload,
	}, targetOrigin );
}

type ForwardOidcLoginFlowToWindowArgs = {
	targets: OidcAuthAppWindow;
	onSuccess?: () => void;
	attempt?: number;
};

const MAX_FORWARD_ATTEMPTS = 5;
const FORWARD_RETRY_DELAY_MS = 500;

export function forwardOidcLoginFlowToWindow( { targets, onSuccess, attempt = 1 }: ForwardOidcLoginFlowToWindowArgs ): void {
	const searchParams = new URLSearchParams( window.location.search );
	const loginComplete = searchParams.get( OIDC_AUTH_URL_PARAMS.LOGIN_SUCCESS );

	if ( ! loginComplete ) {
		return;
	}

	const oauthStateParam = searchParams.get( OIDC_AUTH_URL_PARAMS.STATE );
	if ( ! oauthStateParam ) {
		logger.warn( 'OIDC login complete but no state found in URL' );
		return;
	}

	if ( ! targets.window?.contentWindow || ! targets.windowURL ) {
		if ( attempt < MAX_FORWARD_ATTEMPTS ) {
			setTimeout( () => {
				forwardOidcLoginFlowToWindow( { targets, onSuccess, attempt: attempt + 1 } );
			}, FORWARD_RETRY_DELAY_MS );
		} else {
			logger.error( 'OIDC: Failed to forward login flow after', MAX_FORWARD_ATTEMPTS, 'attempts - iframe never became available' );
		}
		return;
	}

	try {
		const oauthState = JSON.parse( oauthStateParam );
		const topOrigin = oauthState.state?.data?.[ OIDC_AUTH_URL_PARAMS.TOP_ORIGIN ];

		if ( topOrigin && topOrigin !== window.location.origin ) {
			logger.error( 'Origin mismatch in OIDC state:', topOrigin, 'vs', window.location.origin );
			return;
		}

		sendOidcStateToWindow( { oauthState }, targets );

		const cleanUrl = new URL( window.location.href );
		cleanUrl.searchParams.delete( OIDC_AUTH_URL_PARAMS.LOGIN_SUCCESS );
		cleanUrl.searchParams.delete( OIDC_AUTH_URL_PARAMS.STATE );
		history.replaceState( {}, '', cleanUrl.toString() );

		onSuccess?.();
	} catch ( error ) {
		logger.error( 'Failed to parse or forward OIDC state:', error );
	}
}
