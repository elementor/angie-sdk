export declare const OIDC_STORAGE_PREFIX = "oidc.user:";
export declare const OIDC_AUTH_MESSAGE_TYPES: {
    readonly TOP_OPEN_URL: "OAUTH2_TOP_OPEN_URL_EVENT";
    readonly LOGIN_FLOW_COMPLETE: "OAUTH2_LOGIN_FLOW_COMPLETE_EVENT";
    readonly GET_TOP_URL: "OAUTH_GET_TOP_URL";
    readonly REDIRECT_TOP_WINDOW: "OAUTH_REDIRECT_TOP_WINDOW";
    readonly UPDATE_URL: "OAUTH_UPDATE_URL";
    readonly CHECK_PENDING: "OAUTH2_CHECK_PENDING";
};
export declare const OIDC_AUTH_URL_PARAMS: {
    readonly ORIGIN: "origin";
    readonly TOP_ORIGIN: "oauth2_top_origin";
    readonly TOP_WP_URL: "oauth2_top_wp_url";
    readonly LOGIN_SUCCESS: "oauth2_login_success";
    readonly STATE: "oauth2_state";
    readonly CODE: "oauth2_code";
    readonly AUTHORIZE_URL: "oauth2_authorize_url";
    readonly START_OAUTH: "start-oauth";
};
export declare const OIDC_SITE_CONSENT_ANONYMOUS_USER_SUB = "__site__";
export declare const OIDC_AUTH_COMPLETE_EVENT = "oidc-auth-completed";
export declare const OAUTH_CALLBACK_PATH = "/login/oauth-callback";
export declare const DEFAULT_TOKEN_EXPIRING_NOTIFICATION_SECONDS = 60;
export declare const DEFAULT_TOKEN_FRESHNESS_THRESHOLD_SECONDS: number;
export declare const MIN_TOKEN_EXPIRING_NOTIFICATION_SECONDS = 10;
export declare const REFRESH_LOCK_NAME = "oidc-token-refresh";
export declare const PROACTIVE_REFRESH_MAX_RETRIES = 2;
export declare const PROACTIVE_REFRESH_RETRY_DELAY_MS = 3000;
