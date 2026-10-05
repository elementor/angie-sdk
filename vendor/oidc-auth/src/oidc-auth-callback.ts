import { OIDC_AUTH_MESSAGE_TYPES, OIDC_AUTH_URL_PARAMS } from './oidc-auth-consts';
import { createChildLogger } from './oidc-auth-logger';
import { loadOidcCallbackHandoff } from './oidc-auth-pkce';
import type { OidcAuthAppWindow, OidcAuthExtractRedirectInfoArgs, OidcAuthExtractRedirectInfoResult } from './oidc-auth-types';

const logger = createChildLogger('oidc-auth:oidc-auth-redirect');

const TOKEN_SUBSTRINGS_FORBIDDEN_IN_REDIRECT_URL = [
	'access_token',
	'refresh_token',
	'id_token',
];

export function assertRedirectUrlHasNoTokens( redirectUrl: string ): void {
	const lower = redirectUrl.toLowerCase();
	for ( const tokenKey of TOKEN_SUBSTRINGS_FORBIDDEN_IN_REDIRECT_URL ) {
		if ( lower.includes( tokenKey ) ) {
			throw new Error( `Redirect URL must not contain ${ tokenKey }` );
		}
	}
}

export function buildOAuthCodeHandoffRedirectUrl( topWpUrl: string, authorizationCode: string, oidcStateId: string ): string {
	const url = new URL( topWpUrl );
	const hashParams = new URLSearchParams();
	hashParams.set( OIDC_AUTH_URL_PARAMS.LOGIN_SUCCESS, 'true' );
	hashParams.set( OIDC_AUTH_URL_PARAMS.CODE, authorizationCode );
	hashParams.set( OIDC_AUTH_URL_PARAMS.STATE, oidcStateId );
	url.hash = hashParams.toString();
	const result = url.toString();
	assertRedirectUrlHasNoTokens( result );
	return result;
}

type OAuthReturnParams = {
	loginSuccess: boolean;
	authorizationCode?: string;
	clientState?: string;
	legacyTokenStateJson?: string;
};

export function parseOAuthReturnParamsFromWindow( locationLike: Pick<Location, 'search' | 'hash'> ): OAuthReturnParams {
	const hash = locationLike.hash ?? '';
	const hashParams = new URLSearchParams( hash.startsWith( '#' ) ? hash.slice( 1 ) : hash );
	const queryParams = new URLSearchParams( locationLike.search );

	const loginSuccess = hashParams.get( OIDC_AUTH_URL_PARAMS.LOGIN_SUCCESS ) === 'true'
		|| queryParams.get( OIDC_AUTH_URL_PARAMS.LOGIN_SUCCESS ) === 'true';

	const authorizationCode = hashParams.get( OIDC_AUTH_URL_PARAMS.CODE )
		?? queryParams.get( OIDC_AUTH_URL_PARAMS.CODE )
		?? undefined;

	const stateParam = hashParams.get( OIDC_AUTH_URL_PARAMS.STATE )
		?? queryParams.get( OIDC_AUTH_URL_PARAMS.STATE )
		?? undefined;

	let legacyTokenStateJson: string | undefined;
	let clientState: string | undefined;
	if ( stateParam?.startsWith( '{' ) ) {
		legacyTokenStateJson = stateParam;
	} else {
		clientState = stateParam;
	}

	return {
		loginSuccess,
		authorizationCode,
		clientState: authorizationCode ? clientState : undefined,
		legacyTokenStateJson: authorizationCode ? undefined : legacyTokenStateJson,
	};
}

export async function oidcAuthExtractRedirectInfo(_args: OidcAuthExtractRedirectInfoArgs = {}): Promise<OidcAuthExtractRedirectInfoResult> {
	try {
		const callbackParams = new URLSearchParams(window.location.search);
		const authorizationCode = callbackParams.get('code');
		const oidcStateId = callbackParams.get('state');
		const handoff = loadOidcCallbackHandoff();

		if ( ! authorizationCode || ! oidcStateId || ! handoff?.topWpUrl ) {
			return {
				success: false,
				error: 'Missing authorization response or sign-in destination.',
			};
		}

		try {
			const handoffOrigin = new URL(handoff.topWpUrl).origin;
			if ( handoff.topOrigin !== handoffOrigin ) {
				return {
					success: false,
					error: 'Sign-in destination does not match the expected site origin.',
				};
			}
		} catch {
			return {
				success: false,
				error: 'Invalid sign-in destination.',
			};
		}

		const redirectUrl = buildOAuthCodeHandoffRedirectUrl( handoff.topWpUrl, authorizationCode, oidcStateId );

		return { success: true, redirectUrl };
	} catch ( error ) {
		logger.error('OIDC: oidcAuthExtractRedirectInfo: FAILED:', error);
		return {
			success: false,
			error: error instanceof Error ? error.message : 'Authentication failed',
		};
	}
}

function sendPortSuccess(port: MessagePort, payload?: unknown): void {
	port.postMessage({ status: 'success', payload });
}

function sendPortError(port: MessagePort, error: unknown): void {
	port.postMessage({ status: 'error', payload: error });
}

function checkOAuthParamsCleared(oldUrl: string, newUrl: string): boolean {
	const oldParams = parseOAuthReturnParamsFromWindow( new URL( oldUrl ) );
	const newParams = parseOAuthReturnParamsFromWindow( new URL( newUrl ) );
	return oldParams.loginSuccess && ! newParams.loginSuccess;
}

type SetupOidcAuthParentListenerArgs = {
	trustedOrigin: string;
	onOAuthParamsCleared?: () => void;
}

export function setupOidcAuthParentListener({ trustedOrigin, onOAuthParamsCleared }: SetupOidcAuthParentListenerArgs): void {
	window.addEventListener('message', (event) => {
		if (event.origin !== trustedOrigin) {
			return;
		}

		const port = event.ports?.[0];

		switch (event.data.type) {
			case OIDC_AUTH_MESSAGE_TYPES.GET_TOP_URL:
				if (!port) { return; }
				sendPortSuccess(port, { topUrl: window.location.href });
				break;

			case OIDC_AUTH_MESSAGE_TYPES.REDIRECT_TOP_WINDOW:
				window.location.href = event.data.payload.url;
				break;

			case OIDC_AUTH_MESSAGE_TYPES.UPDATE_URL: {
				if (!port) { return; }
				const newUrl = event.data.payload.url;
				if (!history?.replaceState) {
					sendPortError(port, { message: 'URL update not supported in this browser' });
					return;
				}
				try {
					const oldUrl = window.location.href;
					history.replaceState({}, '', newUrl);

					if (checkOAuthParamsCleared(oldUrl, newUrl)) {
						onOAuthParamsCleared?.();
					}

					sendPortSuccess(port, { message: 'URL updated successfully' });
				} catch (error) {
					sendPortError(port, {
						message: 'URL update failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
					});
				}
				break;
			}

			case OIDC_AUTH_MESSAGE_TYPES.CHECK_PENDING: {
				if (!port) { return; }
				const isPending = parseOAuthReturnParamsFromWindow( window.location ).loginSuccess;
				sendPortSuccess(port, { isPending });
				break;
			}
		}
	});
}

export function sendOidcStateToWindow(payload: Record<string, unknown>, targets: OidcAuthAppWindow): void {
	const targetWindow = targets.window?.contentWindow;
	const targetOrigin = targets.windowURL?.origin;

	if (!targetWindow || !targetOrigin) {
		logger.warn('Cannot send OIDC state: window or origin not available');
		return;
	}

	targetWindow.postMessage({
		type: OIDC_AUTH_MESSAGE_TYPES.LOGIN_FLOW_COMPLETE,
		payload,
	}, targetOrigin);
}

type ForwardOidcLoginFlowToWindowArgs = {
	targets: OidcAuthAppWindow;
	onSuccess?: () => void;
	attempt?: number;
}

function cleanOAuthReturnFromParentUrl(): void {
	const url = new URL( window.location.href );
	url.searchParams.delete( OIDC_AUTH_URL_PARAMS.LOGIN_SUCCESS );
	url.searchParams.delete( OIDC_AUTH_URL_PARAMS.STATE );
	url.searchParams.delete( OIDC_AUTH_URL_PARAMS.CODE );
	url.hash = '';
	history.replaceState( {}, '', url.toString() );
}

export function forwardOidcLoginFlowToWindow({ targets, onSuccess, attempt = 1 }: ForwardOidcLoginFlowToWindowArgs): void {
	const oauthReturn = parseOAuthReturnParamsFromWindow( window.location );
	const maxAttempts = 5;
	const delayMs = 500;

	if ( ! oauthReturn.loginSuccess ) {
		logger.warn('OIDC: No login_success param found, skipping');
		return;
	}

	if ( ! targets.window?.contentWindow || ! targets.windowURL ) {
		logger.warn('Cannot forward OIDC state: iframe not available');

		if (attempt < maxAttempts) {
			setTimeout(() => {
				forwardOidcLoginFlowToWindow({ targets, onSuccess, attempt: attempt + 1 });
			}, delayMs);
		} else {
			logger.error('OIDC: Failed to forward login flow after', maxAttempts, 'attempts - iframe never became available');
		}
		return;
	}

	try {
		if ( oauthReturn.authorizationCode && oauthReturn.clientState ) {
			sendOidcStateToWindow( {
				oauthCode: oauthReturn.authorizationCode,
				oauthState: oauthReturn.clientState,
			}, targets );
			cleanOAuthReturnFromParentUrl();
			onSuccess?.();
			return;
		}

		if ( ! oauthReturn.legacyTokenStateJson ) {
			logger.warn('OIDC login complete but no authorization code or legacy state found in URL');
			return;
		}

		const oauthState = JSON.parse( oauthReturn.legacyTokenStateJson );
		const topOrigin = oauthState.state?.data?.[ OIDC_AUTH_URL_PARAMS.TOP_ORIGIN ];

		if (topOrigin && topOrigin !== window.location.origin) {
			logger.error('Origin mismatch in OIDC state:', topOrigin, 'vs', window.location.origin);
			return;
		}

		sendOidcStateToWindow({ oauthState }, targets);
		cleanOAuthReturnFromParentUrl();
		onSuccess?.();
	} catch (error) {
		logger.error('Failed to parse or forward OIDC state:', error);
	}
}
