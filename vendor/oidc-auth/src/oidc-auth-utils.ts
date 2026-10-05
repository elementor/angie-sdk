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

export function isOidcFlowInUrl(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has(OIDC_AUTH_URL_PARAMS.LOGIN_SUCCESS) ||
        urlParams.has(OIDC_AUTH_URL_PARAMS.STATE) ||
        urlParams.has(OIDC_AUTH_URL_PARAMS.TOP_ORIGIN);
}
