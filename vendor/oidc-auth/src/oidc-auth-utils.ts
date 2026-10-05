import { OIDC_AUTH_URL_PARAMS } from './oidc-auth-consts';
import { oidcAuthConfig } from './OidcAuthConfig';
import { OidcLogoutParams } from './oidc-auth-types';
import { createLogger } from '@elementor/angie-logger';

const logger = createLogger('oidc-auth-utils');

export function getWindowOrigin(): string {
    if (typeof window === 'undefined') {
        return '';
    }
    return window.location.origin;
}

export function getLogoutUrl(logoutParams: OidcLogoutParams): string {
    const authOrigin = oidcAuthConfig.getAuthOrigin();
    return `${authOrigin}${logoutParams.logoutPath}`;
}

export const getSafeOrigin = () => {
    if (typeof window === 'undefined') {
        return '';
    }
    const searchParams = new URLSearchParams(window.location.search);
    const originParam = searchParams.get('origin');
    return originParam || '';
};

export const isSafeOrigin = (origin: string) => {
    return origin === getSafeOrigin();
};

export type ValidateOAuthAuthorizeUrlResult =
	| { valid: true; url: URL }
	| { valid: false; error: string };

export function validateOAuthAuthorizeUrl( authorizeUrl: string ): ValidateOAuthAuthorizeUrlResult {
	let parsed: URL;
	try {
		parsed = new URL( authorizeUrl );
	} catch {
		return { valid: false, error: 'Invalid authorize URL.' };
	}

	if ( parsed.protocol !== 'https:' ) {
		return { valid: false, error: 'Authorize URL must use HTTPS.' };
	}

	if ( ! oidcAuthConfig.isConfigured() ) {
		return { valid: false, error: 'OIDC is not configured.' };
	}

	const settings = oidcAuthConfig.getOidcSettings();
	const authorizationEndpoint = settings.metadata?.authorization_endpoint;
	if ( ! authorizationEndpoint ) {
		return { valid: false, error: 'Authorization endpoint is not configured.' };
	}

	const expectedEndpoint = new URL( authorizationEndpoint );
	if ( parsed.origin !== expectedEndpoint.origin || parsed.pathname !== expectedEndpoint.pathname ) {
		return { valid: false, error: 'Authorize URL does not match the configured authorization endpoint.' };
	}

	if ( parsed.searchParams.get( 'client_id' ) !== settings.client_id ) {
		return { valid: false, error: 'Authorize URL client_id is invalid.' };
	}

	if ( parsed.searchParams.get( 'redirect_uri' ) !== settings.redirect_uri ) {
		return { valid: false, error: 'Authorize URL redirect_uri is invalid.' };
	}

	if ( parsed.searchParams.get( 'response_type' ) !== 'code' ) {
		return { valid: false, error: 'Authorize URL response_type must be code.' };
	}

	if ( parsed.searchParams.get( 'code_challenge_method' ) !== 'S256' ) {
		return { valid: false, error: 'Authorize URL must use PKCE S256.' };
	}

	if ( ! parsed.searchParams.get( 'code_challenge' ) ) {
		return { valid: false, error: 'Authorize URL is missing code_challenge.' };
	}

	return { valid: true, url: parsed };
}

export function isOidcFlowInUrl(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has(OIDC_AUTH_URL_PARAMS.LOGIN_SUCCESS) ||
        urlParams.has(OIDC_AUTH_URL_PARAMS.STATE) ||
        urlParams.has(OIDC_AUTH_URL_PARAMS.TOP_ORIGIN);
}
