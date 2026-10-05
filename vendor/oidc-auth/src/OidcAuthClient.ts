import { Log, OidcClient, User, UserManager } from 'oidc-client-ts';
import { createChildLogger } from './oidc-auth-logger';
import { askHost } from './oidc-auth-host-api';
import { oidcAuthConfig } from './OidcAuthConfig';
import type { OidcAuthSettings } from './oidc-auth-types';
import { getLogoutUrl } from './oidc-auth-utils';
export {
    OIDC_AUTH_MESSAGE_TYPES,
    OIDC_AUTH_URL_PARAMS,
    OIDC_STORAGE_PREFIX,
    OAUTH_CALLBACK_PATH,
} from './oidc-auth-consts';
import {
    OIDC_AUTH_COMPLETE_EVENT,
    OIDC_AUTH_MESSAGE_TYPES,
    OIDC_AUTH_URL_PARAMS,
    OIDC_STORAGE_PREFIX,
    PROACTIVE_REFRESH_MAX_RETRIES,
    PROACTIVE_REFRESH_RETRY_DELAY_MS,
    REFRESH_LOCK_NAME,
} from './oidc-auth-consts';
import { getSafeOrigin, isSafeOrigin } from './oidc-auth-utils';
import type {
    OidcErrorEventCallback,
    OidcEventCallback,
    OidcLoginParams,
    OidcLogoutParams,
    OidcStateData,
    OidcUserData,
    OidcUserEventCallback,
} from './oidc-auth-types';
import { OidcAuthTimer } from './OidcAuthTimer';
import { OidcAuthTelemetry, OidcAuthTelemetryContext } from './oidc-auth-telemetry';

const logger = createChildLogger('oidc-auth:OidcAuthClient');

const INVALID_GRANT_ERROR = 'invalid_grant';

class OidcAuthClient {
    private static instance: OidcAuthClient | null = null;
    private userManager: UserManager | null = null;
    private initialized = false;
    private accessTokenExpiringTimer: OidcAuthTimer | null = null;
    private retryTimers: Set<ReturnType<typeof setTimeout>> = new Set();
    private telemetry: OidcAuthTelemetry | null = null;

    // eslint-disable-next-line no-useless-constructor
    private constructor() {
        // Private constructor for singleton pattern
    }

    static getInstance(): OidcAuthClient {
        if (!OidcAuthClient.instance) {
            OidcAuthClient.instance = new OidcAuthClient();
        }
        return OidcAuthClient.instance;
    }

    isInitialized(): boolean {
        return this.initialized;
    }

    private ensureInitialized(): UserManager {
        if (!this.userManager) {
            throw new Error('OidcAuthClient not initialized. Call initialize() first.');
        }
        return this.userManager;
    }

    initialize(settings?: OidcAuthSettings): void {
        if (settings) {
            this.initialized = false;
            oidcAuthConfig.configure(settings);
        }

        if (this.initialized) {
            logger.debug('OIDC: initialize() - already initialized, skipping');
            return;
        }

        if (typeof window === 'undefined') {
            logger.warn('OidcAuthClient cannot initialize on server side');
            return;
        }

        if (!oidcAuthConfig.isConfigured()) {
            logger.warn('OIDC: initialize() - skipped, config not set');
            return;
        }

        try {
            const oidcSettings = oidcAuthConfig.getOidcSettings();
            this.userManager = new UserManager(oidcSettings);
            this.telemetry = settings?.telemetry ?? null;
            Log.setLogger(logger);
            Log.setLevel(Log.ERROR);

            this.initAccessTokenExpiringTimer()
            this.initialized = true;
        } catch (error) {
            logger.error('OIDC: initialize() - FAILED:', error);
            throw error;
        }
    }

    private async initAccessTokenExpiringTimer() {
        if (!oidcAuthConfig.isAccessTokenProactiveRefreshEnabled()) {
            logger.warn('OIDC: timer - not starting, access token proactive refresh is disabled');
            return;
        }

        this.getUser().then((user) => {
            const expiresAt = user?.expires_at;

            if (!expiresAt) {
                return;
            }

            if (!this.accessTokenExpiringTimer) {
                this.accessTokenExpiringTimer = new OidcAuthTimer();
            }

            this.accessTokenExpiringTimer.init(expiresAt, oidcAuthConfig.getAccessTokenExpiringNotificationTimeInSeconds(), async () => {
                logger.info('OIDC: timer proactive refresh access token expiring timer fired', expiresAt);
                this.proactiveRefreshWithRetry();
            });
        }).catch((error) => {
            logger.error('OIDC: initAccessTokenExpiringTimer - FAILED:', error);
        });
    }

    async getUser(): Promise<User | null> {
        if (!this.userManager) {
            return null;
        }
        try {
            const user = await this.userManager.getUser();
            return user;
        } catch (error) {
            logger.error('OIDC: getUser - FAILED:', error);
            return null;
        }
    }

    private async storeUser(user: User): Promise<void> {
        const manager = this.ensureInitialized();
        await manager.storeUser(user);
    }

    /**
     * Returns a valid access token. If the token is expired, triggers a silent refresh.
     */
    async getAccessToken(): Promise<string | null> {
        const user = await this.getUser();

        if (!user) {
            logger.info('OIDC: getAccessToken - no user found');
            return null;
        }

        if (user.expired) {
            logger.info('OIDC: getAccessToken - user expired, attempting silent renew');

            try {
                const renewedUser = await this.signinSilent();
                return renewedUser?.access_token || null;
            } catch (error) {
                logger.error('OIDC: getAccessToken - silent renew failed:', error);
                return null;
            }
        }

        if (!this.isTokenFresh(user)) {
            this.signinSilent().catch((error) => {
                logger.error('OIDC: getAccessToken - background refresh failed:', error);
            });
        }

        return user.access_token;
    }

    getUserData(): OidcUserData | null {
        if (typeof window === 'undefined') {
            return null;
        }

        if (!oidcAuthConfig.isConfigured()) {
            return null;
        }

        try {
            const oidcSettings = oidcAuthConfig.getOidcSettings();
            const storageKey = `${OIDC_STORAGE_PREFIX}${oidcSettings.authority}:${oidcSettings.client_id}`;
            const storedUser = localStorage.getItem(storageKey);

            if (!storedUser) {
                return null;
            }

            const user = JSON.parse(storedUser);
            const profile = user?.profile;

            if (!profile?.sub) {
                return null;
            }

            return {
                id: profile.sub,
                email: profile.email || '',
                first_name: profile.given_name,
                last_name: profile.family_name,
            };
        } catch (error) {
            logger.error('OIDC: getUserData - FAILED:', error);
            return null;
        }
    }

    async isAuthenticated(): Promise<boolean> {
        const user = await this.getUser();
        const isAuth = user !== null && !user.expired;
        return isAuth;
    }

    async signinRedirect(stateData?: OidcStateData): Promise<void> {
        const manager = this.ensureInitialized();
        await manager.signinRedirect({
            state: stateData ? { data: stateData } : undefined,
            prompt: 'login',
        });
    }

    private ensureOidcConfigured(): void {
        if (!this.initialized && !oidcAuthConfig.isConfigured()) {
            throw new Error('OidcAuthClient not initialized. Call initialize() first.');
        }
    }

    private createIframeSigninOidcClient(): OidcClient {
        this.ensureOidcConfigured();
        const settings = oidcAuthConfig.getOidcSettings(window.sessionStorage, window.localStorage);
        return new OidcClient(settings);
    }

    private createIframeSigninUserManager(): UserManager {
        this.ensureOidcConfigured();
        const settings = oidcAuthConfig.getOidcSettings(window.sessionStorage, window.localStorage);
        return new UserManager(settings);
    }

    async createIframeOwnedSigninRequest(stateData: OidcStateData): Promise<{ authorizeUrl: string; oidcStateId: string }> {
        const client = this.createIframeSigninOidcClient();
        const signinRequest = await client.createSigninRequest({
            state: { data: stateData },
            prompt: 'login',
        });

        return {
            authorizeUrl: signinRequest.url,
            oidcStateId: signinRequest.state.id,
        };
    }

    async signinCallbackFromAuthorizationResponse(authorizationCode: string, oidcStateId: string): Promise<User> {
        const manager = this.createIframeSigninUserManager();
        const redirectUri = manager.settings.redirect_uri;
        if (!redirectUri) {
            throw new Error('OIDC redirect_uri is not configured');
        }

        const syntheticCallbackUrl = new URL(redirectUri);
        syntheticCallbackUrl.searchParams.set('code', authorizationCode);
        syntheticCallbackUrl.searchParams.set('state', oidcStateId);

        const user = await manager.signinCallback(syntheticCallbackUrl.toString());
        if (!user) {
            throw new Error('Signin callback failed: no user returned');
        }

        return user;
    }

    async signinCallback(): Promise<User> {
        const manager = this.ensureInitialized();
        const user = await manager.signinCallback();

        if (!user) {
            logger.error('OIDC: signinCallback - FAILED: no user returned');
            throw new Error('Signin callback failed: no user returned');
        }

        return user;
    }

    /**
     * Refreshes the access token via the token endpoint using the refresh_token.
     * Uses navigator.locks for cross-tab dedup to avoid redundant token endpoint calls.
     */
    async signinSilent(freshInSeconds?: number): Promise<User | null> {
        this.ensureInitialized();

        if (typeof navigator === 'undefined' || !navigator.locks) {
            logger.warn('OIDC: signinSilent - navigator.locks not available, proceeding without lock');
            return this.doSigninSilent();
        }

        return navigator.locks.request(REFRESH_LOCK_NAME, async () => {
            const existingUser = await this.getUser();

            if (existingUser && this.isTokenFresh(existingUser, freshInSeconds)) {
                return existingUser;
            }

            return this.doSigninSilent();
        });
    }

    private isTokenFresh(user: User, freshThresholdInSeconds?: number): boolean {
        if (!user.expires_at) {
            return false;
        }

        const threshold = freshThresholdInSeconds ?? oidcAuthConfig.getAccessTokenFreshnessThresholdInSeconds();

        const now = Math.floor(Date.now() / 1000);
        const expiresIn = user.expires_at - now;

        return expiresIn > threshold;
    }

    private async doSigninSilent(): Promise<User | null> {
        const manager = this.ensureInitialized();

        try {
            const user = await manager.signinSilent();
            return user;
        } catch (error) {
            logger.error('OIDC: doSigninSilent - FAILED:', error);
            throw error;
        }
    }

    /**
     * Handles the addAccessTokenExpiring event with retry logic.
     * If the silent refresh fails (e.g., network error, iframe blocked), retries up to
     * PROACTIVE_REFRESH_MAX_RETRIES times with PROACTIVE_REFRESH_RETRY_DELAY_MS delay
     * to prevent the token from expiring without a refresh attempt.
     */
    private proactiveRefreshWithRetry(attempt = 1): void {
        this.signinSilent(oidcAuthConfig.getAccessTokenExpiringNotificationTimeInSeconds()).then(() => {
            this.initAccessTokenExpiringTimer();
        }).catch((error) => {
            logger.error(`OIDC: proactive refresh failed (attempt ${attempt}/${PROACTIVE_REFRESH_MAX_RETRIES}):`, error);
            if (
                !OidcAuthClient.isInvalidGrantError(error)
                && !OidcAuthClient.isNetworkError(error)
                && !OidcAuthClient.isLockManagerSecurityError(error)
            ) {
                this.sendTelemetryError(error, {
                    extra: { attempt: attempt, max_retries: PROACTIVE_REFRESH_MAX_RETRIES },
                });
            }
            if (attempt < PROACTIVE_REFRESH_MAX_RETRIES) {
                const timerId = setTimeout(() => {
                    this.retryTimers.delete(timerId);
                    this.proactiveRefreshWithRetry(attempt + 1);
                }, PROACTIVE_REFRESH_RETRY_DELAY_MS);
                this.retryTimers.add(timerId);
            } else {
                logger.error('OIDC: proactive refresh exhausted all retries');
            }
        });
    }

    static isInvalidGrantError(error: unknown): boolean {
        if (typeof error !== 'object' || error === null) {
            return false;
        }
        const candidate = error as { error?: unknown; message?: unknown };
        if (candidate.error === INVALID_GRANT_ERROR) {
            return true;
        }
        const message = typeof candidate.message === 'string' ? candidate.message.toLowerCase() : '';
        if (!message) {
            return false;
        }
        if (message.includes(INVALID_GRANT_ERROR)) {
            return true;
        }
        return message.includes('authorization grant') && message.includes('invalid');
    }

    static isNetworkError(error: unknown): boolean {
        if (typeof error !== 'object' || error === null) {
            return false;
        }
        const candidate = error as { message?: unknown; name?: unknown };
        const message = typeof candidate.message === 'string' ? candidate.message : '';

        return (
            message.includes('Failed to fetch') || // Chrome, Edge, Sentry-wrapped
            message.includes('NetworkError') || // Firefox
            message.includes('Network timed out') || // oidc-client-ts
            message.includes('Load failed') || // Safari
            message.includes('The internet connection appears to be offline') // Safari/iOS
        );
    }

    static isLockManagerSecurityError(error: unknown): boolean {
        if (typeof error !== 'object' || error === null) {
            return false;
        }

        const candidate = error as { message?: unknown; name?: unknown };
        const name = typeof candidate.name === 'string' ? candidate.name : '';
        const message = typeof candidate.message === 'string' ? candidate.message : '';

        return name === 'SecurityError' && message.includes('LockManager.request');
    }

    async removeUser(): Promise<void> {
        const manager = this.ensureInitialized();
        this.accessTokenExpiringTimer?.cancel();
        this.retryTimers.forEach(clearTimeout);
        this.retryTimers.clear();
        await manager.removeUser();
    }

    onUserLoaded(callback: OidcUserEventCallback): void {
        const manager = this.ensureInitialized();
        manager.events.addUserLoaded(callback);
    }

    offUserLoaded(callback: OidcUserEventCallback): void {
        const manager = this.ensureInitialized();
        manager.events.removeUserLoaded(callback);
    }

    onUserUnloaded(callback: OidcEventCallback): void {
        const manager = this.ensureInitialized();
        manager.events.addUserUnloaded(callback);
    }

    offUserUnloaded(callback: OidcEventCallback): void {
        const manager = this.ensureInitialized();
        manager.events.removeUserUnloaded(callback);
    }

    onSilentRenewError(callback: OidcErrorEventCallback): void {
        const manager = this.ensureInitialized();
        manager.events.addSilentRenewError(callback);
    }

    offSilentRenewError(callback: OidcErrorEventCallback): void {
        const manager = this.ensureInitialized();
        manager.events.removeSilentRenewError(callback);
    }

    onAccessTokenExpiring(callback: OidcEventCallback): void {
        const manager = this.ensureInitialized();
        manager.events.addAccessTokenExpiring(callback);
    }

    offAccessTokenExpiring(callback: OidcEventCallback): void {
        const manager = this.ensureInitialized();
        manager.events.removeAccessTokenExpiring(callback);
    }

    onAccessTokenExpired(callback: OidcEventCallback): void {
        const manager = this.ensureInitialized();
        manager.events.addAccessTokenExpired(callback);
    }

    offAccessTokenExpired(callback: OidcEventCallback): void {
        const manager = this.ensureInitialized();
        manager.events.removeAccessTokenExpired(callback);
    }

    getLogoutUrl(logoutParams: OidcLogoutParams, redirectTo?: string): string {
        const logoutUrl = new URL(getLogoutUrl(logoutParams));
        if (redirectTo) {
            logoutUrl.searchParams.set('redirect_to', redirectTo);
        }
        return logoutUrl.toString();
    }

    private getWindowOriginParam(): string {
        const iframeUrl = new URL(window.location.href);
        const origin = iframeUrl.searchParams.get(OIDC_AUTH_URL_PARAMS.ORIGIN);
        if (!origin) {
            throw new Error('iframe origin param is required');
        }
        return origin;
    }

    async getTopUrl(): Promise<string> {
        const response = await askHost<{ topUrl: string }>({
            type: OIDC_AUTH_MESSAGE_TYPES.GET_TOP_URL,
        });
        return response.topUrl;
    }

    async isOAuthFlowPending(): Promise<boolean> {
        try {
            const response = await askHost<{ isPending: boolean }>({
                type: OIDC_AUTH_MESSAGE_TYPES.CHECK_PENDING,
            });
            return response.isPending;
        } catch (error) {
            logger.warn('OIDC: isOAuthFlowPending() - failed to check, assuming not pending:', error);
            return false;
        }
    }

    async triggerLoginFlowViaParent({ loginPath, windowPath }: OidcLoginParams): Promise<void> {
        logger.info('OIDC: triggerLoginFlowViaParent() - starting');

        const topUrl = await this.getTopUrl();
        const topOrigin = new URL(topUrl).origin;
        const topWpUrl = `${topOrigin}${windowPath}`;

        const stateData: OidcStateData = {
            [OIDC_AUTH_URL_PARAMS.TOP_ORIGIN]: topOrigin,
            [OIDC_AUTH_URL_PARAMS.TOP_WP_URL]: topWpUrl,
        };
        const { authorizeUrl } = await this.createIframeOwnedSigninRequest(stateData);

        const startLoginUrl = new URL(`${window.location.origin}${loginPath}`);
        startLoginUrl.searchParams.set(OIDC_AUTH_URL_PARAMS.TOP_ORIGIN, topOrigin);
        startLoginUrl.searchParams.set(OIDC_AUTH_URL_PARAMS.TOP_WP_URL, topWpUrl);
        startLoginUrl.searchParams.set(OIDC_AUTH_URL_PARAMS.AUTHORIZE_URL, authorizeUrl);

        logger.info('OIDC: triggerLoginFlowViaParent() - redirecting parent to:', startLoginUrl.toString());

        await askHost({
            type: OIDC_AUTH_MESSAGE_TYPES.REDIRECT_TOP_WINDOW,
            payload: { url: startLoginUrl.toString() },
        });
    }

    private async handleLoginFlowComplete(
        loginParams: OidcLoginParams,
        payload: Record<string, unknown>,
    ): Promise<void> {
        const topWindowOrigin = this.getWindowOriginParam();

        if (typeof payload.oauthCode === 'string' && typeof payload.oauthState === 'string') {
            try {
                const user = await this.signinCallbackFromAuthorizationResponse(payload.oauthCode, payload.oauthState);
                const stateData = user.state as { data?: Record<string, string> } | undefined;
                const oauthStateTopOrigin = stateData?.data?.[OIDC_AUTH_URL_PARAMS.TOP_ORIGIN];

                if (topWindowOrigin !== oauthStateTopOrigin) {
                    logger.error('OIDC: handleLoginFlowComplete - origin mismatch:', topWindowOrigin, '!==', oauthStateTopOrigin);
                    throw new Error('Invalid origin in OAuth state');
                }

                await this.storeUser(user);
                this.initAccessTokenExpiringTimer();
                window.dispatchEvent(new CustomEvent(OIDC_AUTH_COMPLETE_EVENT));
            } catch (error) {
                logger.error('OIDC: handleLoginFlowComplete - signinCallbackFromAuthorizationResponse FAILED:', error);
                await this.triggerLoginFlowViaParent(loginParams);
            }
            return;
        }

        const oauthUserState = payload.oauthState as Record<string, unknown> | undefined;
        if (!oauthUserState) {
            throw new Error('oauthUserState is required');
        }

        const stateData = oauthUserState.state as { data?: Record<string, string> } | undefined;
        const oauthStateTopOrigin = stateData?.data?.[OIDC_AUTH_URL_PARAMS.TOP_ORIGIN];

        if (topWindowOrigin !== oauthStateTopOrigin) {
            logger.error('OIDC: handleLoginFlowComplete - origin mismatch:', topWindowOrigin, '!==', oauthStateTopOrigin);
            throw new Error('Invalid origin in OAuth state');
        }

        try {
            const user = new User(oauthUserState as ConstructorParameters<typeof User>[0]);
            await this.storeUser(user);
            this.initAccessTokenExpiringTimer();
            window.dispatchEvent(new CustomEvent(OIDC_AUTH_COMPLETE_EVENT));
        } catch (error) {
            logger.error('OIDC: handleLoginFlowComplete - FAILED to store user:', error);
            await this.triggerLoginFlowViaParent(loginParams);
        }
    }

    async triggerLogoutViaParent(logoutParams: OidcLogoutParams, redirectToWpAdmin = true): Promise<void> {
        const topUrl = await this.getTopUrl();
        const topOrigin = new URL(topUrl).origin;
        const redirectTo = redirectToWpAdmin ? `${topOrigin}${logoutParams.windowPath}` : topOrigin;

        await this.removeUser();

        const logoutUrl = this.getLogoutUrl(logoutParams, redirectTo);

        await askHost({
            type: OIDC_AUTH_MESSAGE_TYPES.REDIRECT_TOP_WINDOW,
            payload: { url: logoutUrl },
        });
    }

    async redirectParentWindowTo(url: string): Promise<void> {
        await askHost({
            type: OIDC_AUTH_MESSAGE_TYPES.REDIRECT_TOP_WINDOW,
            payload: { url },
        });
    }

    async cleanOAuthParamsFromUrl(): Promise<void> {
        try {
            const topUrl = await this.getTopUrl();
            const cleanUrl = new URL(topUrl);
            cleanUrl.searchParams.delete('oauth_code');
            cleanUrl.searchParams.delete('oauth_state');
            cleanUrl.searchParams.delete(OIDC_AUTH_URL_PARAMS.CODE);
            cleanUrl.searchParams.delete(OIDC_AUTH_URL_PARAMS.START_OAUTH);
            cleanUrl.searchParams.delete(OIDC_AUTH_URL_PARAMS.LOGIN_SUCCESS);
            cleanUrl.searchParams.delete(OIDC_AUTH_URL_PARAMS.STATE);
            cleanUrl.hash = '';

            await askHost({
                type: OIDC_AUTH_MESSAGE_TYPES.UPDATE_URL,
                payload: { url: cleanUrl.toString() },
            });
        } catch (error) {
            logger.warn('Failed to clean OAuth params from URL:', error);
        }
    }

    /**
     * Listens for LOGIN_FLOW_COMPLETE postMessage from the parent window after an
     * OAuth redirect login completes. Stores the user and dispatches an auth-complete event.
     * Returns a cleanup function to remove the listener.
     */
    setupLoginFlowMessageListener(loginParams: OidcLoginParams): () => void {
        let loginFlowProcessed = false;

        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type !== OIDC_AUTH_MESSAGE_TYPES.LOGIN_FLOW_COMPLETE) {
                return;
            }

            if (!isSafeOrigin(event.origin)) {
                logger.error('OIDC: origin mismatch - expected:', getSafeOrigin(), 'received:', event.origin);
                return;
            }

            if (loginFlowProcessed) {
                logger.debug('OIDC: LOGIN_FLOW_COMPLETE already processed, ignoring duplicate');
                return;
            }

            const payload = event.data.payload as Record<string, unknown> | undefined;
            if (payload?.oauthCode || payload?.oauthState) {
                loginFlowProcessed = true;
                this.handleLoginFlowComplete(loginParams, payload).catch((error) => {
                    logger.error('OIDC: Failed to handle login flow complete:', error);
                    loginFlowProcessed = false;
                });
            } else {
                logger.warn('OIDC: LOGIN_FLOW_COMPLETE but no oauth payload in message');
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }

    async getTokenExpirationInfo(): Promise<{
        expiresAt: Date | null;
        expiresInSeconds: number | null;
        isExpired: boolean;
    }> {
        const user = await this.getUser();
        if (!user || !user.expires_at) {
            return { expiresAt: null, expiresInSeconds: null, isExpired: true };
        }

        const expiresAt = new Date(user.expires_at * 1000);
        const now = Date.now();
        const expiresInSeconds = Math.floor(((user.expires_at * 1000) - now) / 1000);

        return {
            expiresAt,
            expiresInSeconds,
            isExpired: expiresInSeconds <= 0,
        };
    }

    async forceTokenRefresh(): Promise<User | null> {
        return this.signinSilent();
    }

    setTelemetry(telemetry: OidcAuthTelemetry) {
        logger.info('OIDC: setTelemetry() - setting telemetry');
        this.telemetry = telemetry;
    }

    sendTelemetryMessage(message: string | object, context?: OidcAuthTelemetryContext): void {
        if (!this.telemetry) {
            return;
        }

        const captureContext = {
            ...context,
            level: context?.level ?? 'info',
            tags: {
                source: 'oidc-auth',
                ...context?.tags,
            },
        }

        this.telemetry.message(message, captureContext);
    }

    sendTelemetryError(error: Error | string | object, context?: OidcAuthTelemetryContext): void {
        if (!this.telemetry) {
            return;
        }

        const captureContext = {
            ...context,
            level: context?.level ?? 'error',
            tags: {
                source: 'oidc-auth',
                ...context?.tags,
            },
        }

        this.telemetry.error(error, captureContext);
    }
}

export const oidcAuthClient = OidcAuthClient.getInstance();

if (typeof window !== 'undefined') {
    (window as Window & { oidcAuthClient?: typeof oidcAuthClient }).oidcAuthClient = oidcAuthClient;
}

export default OidcAuthClient;
