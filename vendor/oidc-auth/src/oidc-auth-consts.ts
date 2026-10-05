export const OIDC_STORAGE_PREFIX = 'oidc.user:';

export const OIDC_AUTH_MESSAGE_TYPES = {
    TOP_OPEN_URL: 'OAUTH2_TOP_OPEN_URL_EVENT',
    LOGIN_FLOW_COMPLETE: 'OAUTH2_LOGIN_FLOW_COMPLETE_EVENT',
    GET_TOP_URL: 'OAUTH_GET_TOP_URL',
    REDIRECT_TOP_WINDOW: 'OAUTH_REDIRECT_TOP_WINDOW',
    UPDATE_URL: 'OAUTH_UPDATE_URL',
    CHECK_PENDING: 'OAUTH2_CHECK_PENDING',
} as const;

export const OIDC_AUTH_URL_PARAMS = {
    ORIGIN: 'origin',
    TOP_ORIGIN: 'oauth2_top_origin',
    TOP_WP_URL: 'oauth2_top_wp_url',
    LOGIN_SUCCESS: 'oauth2_login_success',
    STATE: 'oauth2_state',
    CODE: 'oauth2_code',
    PKCE_CHALLENGE: 'oauth2_pkce_challenge',
    PKCE_CLIENT_STATE: 'oauth2_pkce_state',
    START_OAUTH: 'start-oauth',
} as const;

export const OIDC_SITE_CONSENT_ANONYMOUS_USER_SUB = '__site__';

export const OIDC_AUTH_COMPLETE_EVENT = 'oidc-auth-completed';

export const OAUTH_CALLBACK_PATH = '/login/oauth-callback';

export const DEFAULT_TOKEN_EXPIRING_NOTIFICATION_SECONDS = 60;
export const DEFAULT_TOKEN_FRESHNESS_THRESHOLD_SECONDS = Math.max(DEFAULT_TOKEN_EXPIRING_NOTIFICATION_SECONDS - 15, 20);

export const MIN_TOKEN_EXPIRING_NOTIFICATION_SECONDS = 10;
export const REFRESH_LOCK_NAME = 'oidc-token-refresh';
export const PROACTIVE_REFRESH_MAX_RETRIES = 2;
export const PROACTIVE_REFRESH_RETRY_DELAY_MS = 3000;
