import { User } from 'oidc-client-ts';
import type { OidcAuthSettings } from './oidc-auth-types';
export { OIDC_AUTH_MESSAGE_TYPES, OIDC_AUTH_URL_PARAMS, OIDC_STORAGE_PREFIX, OAUTH_CALLBACK_PATH, } from './oidc-auth-consts';
import type { OidcErrorEventCallback, OidcEventCallback, OidcLoginParams, OidcLogoutParams, OidcStateData, OidcUserData, OidcUserEventCallback } from './oidc-auth-types';
import { OidcAuthTelemetry, OidcAuthTelemetryContext } from './oidc-auth-telemetry';
declare class OidcAuthClient {
    private static instance;
    private userManager;
    private initialized;
    private accessTokenExpiringTimer;
    private retryTimers;
    private telemetry;
    private constructor();
    static getInstance(): OidcAuthClient;
    isInitialized(): boolean;
    private ensureInitialized;
    initialize(settings?: OidcAuthSettings): void;
    private initAccessTokenExpiringTimer;
    getUser(): Promise<User | null>;
    private storeUser;
    /**
     * Returns a valid access token. If the token is expired, triggers a silent refresh.
     */
    getAccessToken(): Promise<string | null>;
    getUserData(): OidcUserData | null;
    isAuthenticated(): Promise<boolean>;
    signinRedirect(stateData?: OidcStateData): Promise<void>;
    private ensureOidcConfigured;
    private createIframeSigninOidcClient;
    private createIframeSigninUserManager;
    createIframeOwnedSigninRequest(stateData: OidcStateData): Promise<{
        authorizeUrl: string;
        oidcStateId: string;
    }>;
    signinCallbackFromAuthorizationResponse(authorizationCode: string, oidcStateId: string): Promise<User>;
    signinCallback(): Promise<User>;
    /**
     * Refreshes the access token via the token endpoint using the refresh_token.
     * Uses navigator.locks for cross-tab dedup to avoid redundant token endpoint calls.
     */
    signinSilent(freshInSeconds?: number): Promise<User | null>;
    private isTokenFresh;
    private doSigninSilent;
    /**
     * Handles the addAccessTokenExpiring event with retry logic.
     * If the silent refresh fails (e.g., network error, iframe blocked), retries up to
     * PROACTIVE_REFRESH_MAX_RETRIES times with PROACTIVE_REFRESH_RETRY_DELAY_MS delay
     * to prevent the token from expiring without a refresh attempt.
     */
    private proactiveRefreshWithRetry;
    static isInvalidGrantError(error: unknown): boolean;
    static isNetworkError(error: unknown): boolean;
    static isLockManagerSecurityError(error: unknown): boolean;
    removeUser(): Promise<void>;
    onUserLoaded(callback: OidcUserEventCallback): void;
    offUserLoaded(callback: OidcUserEventCallback): void;
    onUserUnloaded(callback: OidcEventCallback): void;
    offUserUnloaded(callback: OidcEventCallback): void;
    onSilentRenewError(callback: OidcErrorEventCallback): void;
    offSilentRenewError(callback: OidcErrorEventCallback): void;
    onAccessTokenExpiring(callback: OidcEventCallback): void;
    offAccessTokenExpiring(callback: OidcEventCallback): void;
    onAccessTokenExpired(callback: OidcEventCallback): void;
    offAccessTokenExpired(callback: OidcEventCallback): void;
    getLogoutUrl(logoutParams: OidcLogoutParams, redirectTo?: string): string;
    private getWindowOriginParam;
    getTopUrl(): Promise<string>;
    isOAuthFlowPending(): Promise<boolean>;
    triggerLoginFlowViaParent({ loginPath, windowPath }: OidcLoginParams): Promise<void>;
    private handleLoginFlowComplete;
    triggerLogoutViaParent(logoutParams: OidcLogoutParams, redirectToWpAdmin?: boolean): Promise<void>;
    redirectParentWindowTo(url: string): Promise<void>;
    cleanOAuthParamsFromUrl(): Promise<void>;
    /**
     * Listens for LOGIN_FLOW_COMPLETE postMessage from the parent window after an
     * OAuth redirect login completes. Stores the user and dispatches an auth-complete event.
     * Returns a cleanup function to remove the listener.
     */
    setupLoginFlowMessageListener(loginParams: OidcLoginParams): () => void;
    getTokenExpirationInfo(): Promise<{
        expiresAt: Date | null;
        expiresInSeconds: number | null;
        isExpired: boolean;
    }>;
    forceTokenRefresh(): Promise<User | null>;
    setTelemetry(telemetry: OidcAuthTelemetry): void;
    sendTelemetryMessage(message: string | object, context?: OidcAuthTelemetryContext): void;
    sendTelemetryError(error: Error | string | object, context?: OidcAuthTelemetryContext): void;
}
export declare const oidcAuthClient: OidcAuthClient;
export default OidcAuthClient;
