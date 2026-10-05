import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from '@jest/globals';
import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';

jest.mock('./oidc-auth-logger', () => ({
    createChildLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        log: jest.fn(),
        debug: jest.fn(),
    }),
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        log: jest.fn(),
        debug: jest.fn(),
        extend: jest.fn(() => ({
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            log: jest.fn(),
            debug: jest.fn(),
        })),
    },
}));

jest.mock('./oidc-auth-host-api', () => ({
    askHost: jest.fn(),
}));

jest.mock('./oidc-auth-utils');

import { getLogoutUrl, getWindowOrigin, getSafeOrigin, isSafeOrigin } from './oidc-auth-utils';

const mockGetWindowOrigin = getWindowOrigin as jest.MockedFunction<typeof getWindowOrigin>;
const mockGetLogoutUrl = getLogoutUrl as jest.MockedFunction<typeof getLogoutUrl>;
const mockGetSafeOrigin = getSafeOrigin as jest.MockedFunction<typeof getSafeOrigin>;
const mockIsSafeOrigin = isSafeOrigin as jest.MockedFunction<typeof isSafeOrigin>;

import OidcAuthClient, { OIDC_AUTH_MESSAGE_TYPES, OIDC_AUTH_URL_PARAMS, oidcAuthClient } from './OidcAuthClient';
import { askHost } from './oidc-auth-host-api';
import { oidcAuthConfig } from './OidcAuthConfig';

type SpyInstance = ReturnType<typeof jest.spyOn>;
const mockAskHost = askHost as jest.MockedFunction<typeof askHost>;

describe('OidcAuthClient', () => {
    let client: OidcAuthClient;

    beforeEach(() => {
        Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
        Object.defineProperty(globalThis, 'TextEncoder', { value: TextEncoder, configurable: true });
        Object.defineProperty(globalThis, 'TextDecoder', { value: TextDecoder, configurable: true });
        (OidcAuthClient as unknown as { instance: null }).instance = null;
        mockGetWindowOrigin.mockReturnValue('http://localhost:4000');
        mockGetLogoutUrl.mockImplementation((params) => `https://test.auth.com${params.logoutPath}`);
        mockGetSafeOrigin.mockReturnValue('');
        mockIsSafeOrigin.mockReturnValue(true);
        oidcAuthClient.initialize({
            clientId: 'test-client-id',
            authEndpoint: 'https://test.auth.com/oauth2/auth',
            authOrigin: 'https://test.auth.com',
        });
        client = OidcAuthClient.getInstance();
    });

    describe('singleton pattern', () => {
        it('should return the same instance on multiple calls', () => {
            // Arrange & Act
            const instance1 = OidcAuthClient.getInstance();
            const instance2 = OidcAuthClient.getInstance();

            // Assert
            expect(instance1).toBe(instance2);
            expect(instance1).toBe(client);
        });
    });

    describe('initialize', () => {
        it('should initialize successfully', () => {
            // Act
            client.initialize();

            // Assert
            expect(client.isInitialized()).toBe(true);
        });

        it('should not throw on repeated initialization', () => {
            // Arrange
            client.initialize();

            // Act & Assert
            expect(() => client.initialize()).not.toThrow();
            expect(client.isInitialized()).toBe(true);
        });

        it('should reinitialize with new settings', () => {
            // Arrange
            client.initialize();

            // Act & Assert
            expect(() => client.initialize({
                clientId: 'test-client-id-new',
                authEndpoint: 'https://test.auth.com/oauth2/auth-new',
                authOrigin: 'https://test.auth.com-new',
            })).not.toThrow();

            // Assert
            const setting = oidcAuthConfig.getSettings();
            expect(setting).toEqual({
                clientId: 'test-client-id-new',
                authEndpoint: 'https://test.auth.com/oauth2/auth-new',
                authOrigin: 'https://test.auth.com-new',
            });
        });
    });

    describe('getUser without authentication', () => {
        it('should return null when no user is logged in', async () => {
            // Arrange
            client.initialize();

            // Act
            const user = await client.getUser();

            // Assert
            expect(user).toBeNull();
        });
    });

    describe('getAccessToken without authentication', () => {
        it('should return null when no user is logged in', async () => {
            // Arrange
            client.initialize();

            // Act
            const token = await client.getAccessToken();

            // Assert
            expect(token).toBeNull();
        });
    });

    describe('getAccessToken background refresh', () => {
        const createMockUser = (overrides: Record<string, unknown> = {}) => ({
            expired: false,
            access_token: 'test-access-token',
            ...overrides,
        });

        it('should trigger background refresh when token is not fresh', async () => {
            // Arrange: user with token expiring in 15s (below 20s threshold)
            client.initialize();
            const user = createMockUser({ expires_at: Math.floor(Date.now() / 1000) + 15 });
            jest.spyOn(client, 'getUser').mockResolvedValue(user as never);
            const signinSilentSpy = jest.spyOn(client, 'signinSilent').mockResolvedValue(null);

            // Act
            const token = await client.getAccessToken();

            // Assert: signinSilent called in background, current token still returned
            expect(signinSilentSpy).toHaveBeenCalled();
            expect(token).toBe('test-access-token');
        });

        it('should not trigger background refresh when token is fresh', async () => {
            // Arrange: user with token expiring in 60s (above 20s threshold)
            client.initialize();
            const user = createMockUser({ expires_at: Math.floor(Date.now() / 1000) + 60 });
            jest.spyOn(client, 'getUser').mockResolvedValue(user as never);
            const signinSilentSpy = jest.spyOn(client, 'signinSilent').mockResolvedValue(null);

            // Act
            const token = await client.getAccessToken();

            // Assert: no background refresh needed, current token returned
            expect(signinSilentSpy).not.toHaveBeenCalled();
            expect(token).toBe('test-access-token');
        });

        it('should still return token when background refresh fails', async () => {
            // Arrange: user with token expiring in 10s, signinSilent will fail
            client.initialize();
            const user = createMockUser({ expires_at: Math.floor(Date.now() / 1000) + 10 });
            jest.spyOn(client, 'getUser').mockResolvedValue(user as never);
            jest.spyOn(client, 'signinSilent').mockRejectedValue(new Error('refresh failed'));

            // Act
            const token = await client.getAccessToken();

            // Assert: error is swallowed, current token still returned
            expect(token).toBe('test-access-token');
        });
    });

    describe('isAuthenticated', () => {
        it('should return false when no user is logged in', async () => {
            // Arrange
            client.initialize();

            // Act
            const isAuth = await client.isAuthenticated();

            // Assert
            expect(isAuth).toBe(false);
        });
    });

    describe('getLogoutUrl', () => {
        it('should return a valid logout URL', () => {
            // Arrange
            client.initialize();

            // Act
            const url = client.getLogoutUrl({ logoutPath: '/logout/', windowPath: '/wp-admin/' });

            // Assert
            expect(url).toContain('test.auth.com');
            expect(url).toContain('logout');
        });

        it('should append redirect_to param when provided', () => {
            // Arrange
            client.initialize();

            // Act
            const url = client.getLogoutUrl({ logoutPath: '/logout/', windowPath: '/wp-admin/' }, 'https://mysite.com/callback');

            // Assert
            expect(url).toContain('redirect_to=');
            expect(url).toContain(encodeURIComponent('https://mysite.com/callback'));
        });
    });

    describe('setupLoginFlowMessageListener', () => {
        let addEventListenerSpy: SpyInstance;
        let removeEventListenerSpy: SpyInstance;

        beforeEach(() => {
            addEventListenerSpy = jest.spyOn(window, 'addEventListener');
            removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
        });

        afterEach(() => {
            addEventListenerSpy.mockRestore();
            removeEventListenerSpy.mockRestore();
        });

        it('should add message event listener', () => {
            // Arrange
            client.initialize();

            // Act
            client.setupLoginFlowMessageListener({ loginPath: '/login/start', windowPath: '/wp-admin/' });

            // Assert
            expect(addEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
        });

        it('should return cleanup function that removes listener', () => {
            // Arrange
            client.initialize();

            // Act
            const cleanup = client.setupLoginFlowMessageListener({ loginPath: '/login/start', windowPath: '/wp-admin/' });
            cleanup();

            // Assert
            expect(removeEventListenerSpy).toHaveBeenCalledWith('message', expect.any(Function));
        });

    });

    describe('ensureInitialized guard', () => {
        it('should return null when calling getUser before initialize', async () => {
            // Act
            const result = await client.getUser();

            // Assert
            expect(result).toBeNull();
        });

        it('should return null when calling getAccessToken before initialize', async () => {
            // Act
            const result = await client.getAccessToken();

            // Assert
            expect(result).toBeNull();
        });

        it('should throw when calling removeUser before initialize', async () => {
            // Act & Assert
            await expect(client.removeUser()).rejects.toThrow('OidcAuthClient not initialized');
        });
    });

    describe('getUserData', () => {
        it('should return user data from localStorage', () => {
            // Arrange
            client.initialize();
            const storedUser = {
                profile: {
                    sub: 'user-123',
                    email: 'test@example.com',
                    given_name: 'John',
                    family_name: 'Doe',
                },
            };
            jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(storedUser));

            // Act
            const userData = client.getUserData();

            // Assert
            expect(userData).toEqual({
                id: 'user-123',
                email: 'test@example.com',
                first_name: 'John',
                last_name: 'Doe',
            });
        });

        it('should return null when no user is stored', () => {
            // Arrange
            client.initialize();
            jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);

            // Act
            const userData = client.getUserData();

            // Assert
            expect(userData).toBeNull();
        });

        it('should return null when profile has no sub', () => {
            // Arrange
            client.initialize();
            const storedUser = { profile: { email: 'test@example.com' } };
            jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(storedUser));

            // Act
            const userData = client.getUserData();

            // Assert
            expect(userData).toBeNull();
        });

        it('should return empty email when profile has no email', () => {
            // Arrange
            client.initialize();
            const storedUser = { profile: { sub: 'user-123' } };
            jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(storedUser));

            // Act
            const userData = client.getUserData();

            // Assert
            expect(userData).toEqual({
                id: 'user-123',
                email: '',
                first_name: undefined,
                last_name: undefined,
            });
        });

        it('should return null on invalid JSON', () => {
            // Arrange
            client.initialize();
            jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('invalid-json');

            // Act
            const userData = client.getUserData();

            // Assert
            expect(userData).toBeNull();
        });
    });

    describe('triggerLoginFlowViaParent', () => {
        it('should build correct login URL and redirect via parent', async () => {
            // Arrange
            client.initialize();
            mockAskHost
                .mockResolvedValueOnce({ topUrl: 'https://example.com/wp-admin/admin.php?page=app' } as never)
                .mockResolvedValueOnce(undefined as never);

            // Act
            await client.triggerLoginFlowViaParent({ loginPath: '/login/start', windowPath: '/wp-admin/' });

            // Assert
            expect(mockAskHost).toHaveBeenCalledTimes(2);

            const redirectCall = mockAskHost.mock.calls[1];
            expect(redirectCall[0]).toMatchObject({
                type: OIDC_AUTH_MESSAGE_TYPES.REDIRECT_TOP_WINDOW,
            });

            const redirectUrl = new URL((redirectCall[0] as { payload: { url: string } }).payload.url);
            expect(redirectUrl.pathname).toBe('/login/start');
            expect(redirectUrl.searchParams.get('oauth2_top_origin')).toBe('https://example.com');
            expect(redirectUrl.searchParams.get('oauth2_top_wp_url')).toBe('https://example.com/wp-admin/');
            expect(redirectUrl.searchParams.get('oauth2_pkce_challenge')).toBeTruthy();
            expect(redirectUrl.searchParams.get('oauth2_pkce_state')).toBeTruthy();
        });
    });

    describe('triggerLogoutViaParent', () => {
        it('should remove user and redirect to logout URL with wp-admin redirect', async () => {
            // Arrange
            client.initialize();
            mockAskHost
                .mockResolvedValueOnce({ topUrl: 'https://example.com/wp-admin/' } as never)
                .mockResolvedValueOnce(undefined as never);

            // Act
            await client.triggerLogoutViaParent({ logoutPath: '/logout/', windowPath: '/wp-admin/' });

            // Assert
            const redirectCall = mockAskHost.mock.calls[1];
            const redirectPayload = (redirectCall[0] as { payload: { url: string } }).payload;
            const logoutUrl = new URL(redirectPayload.url);
            expect(logoutUrl.pathname).toBe('/logout/');
            expect(logoutUrl.searchParams.get('redirect_to')).toBe('https://example.com/wp-admin/');
        });

        it('should redirect to origin only when redirectToWpAdmin is false', async () => {
            // Arrange
            client.initialize();
            mockAskHost
                .mockResolvedValueOnce({ topUrl: 'https://example.com/wp-admin/' } as never)
                .mockResolvedValueOnce(undefined as never);

            // Act
            await client.triggerLogoutViaParent({ logoutPath: '/logout/', windowPath: '/wp-admin/' }, false);

            // Assert
            const redirectCall = mockAskHost.mock.calls[1];
            const redirectPayload = (redirectCall[0] as { payload: { url: string } }).payload;
            const logoutUrl = new URL(redirectPayload.url);
            expect(logoutUrl.searchParams.get('redirect_to')).toBe('https://example.com');
        });
    });

    describe('getTokenExpirationInfo', () => {
        it('should return expired info when no user exists', async () => {
            // Arrange
            client.initialize();

            // Act
            const info = await client.getTokenExpirationInfo();

            // Assert
            expect(info).toEqual({
                expiresAt: null,
                expiresInSeconds: null,
                isExpired: true,
            });
        });
    });

    describe('isOAuthFlowPending', () => {
        it('should return true when flow is pending', async () => {
            // Arrange
            client.initialize();
            mockAskHost.mockResolvedValueOnce({ isPending: true } as never);

            // Act
            const result = await client.isOAuthFlowPending();

            // Assert
            expect(result).toBe(true);
        });

        it('should return false when flow is not pending', async () => {
            // Arrange
            client.initialize();
            mockAskHost.mockResolvedValueOnce({ isPending: false } as never);

            // Act
            const result = await client.isOAuthFlowPending();

            // Assert
            expect(result).toBe(false);
        });

        it('should return false on error (graceful degradation)', async () => {
            // Arrange
            client.initialize();
            mockAskHost.mockRejectedValueOnce(new Error('connection failed') as never);

            // Act
            const result = await client.isOAuthFlowPending();

            // Assert
            expect(result).toBe(false);
        });
    });

    describe('proactiveRefreshWithRetry', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            client.initialize();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should not schedule retries on successful refresh', async () => {
            // Arrange
            const signinSilentSpy = jest.spyOn(client, 'signinSilent').mockResolvedValue(null);
            const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

            // Act
            (client as unknown as { proactiveRefreshWithRetry: () => void }).proactiveRefreshWithRetry();
            await jest.runAllTimersAsync();

            // Assert
            expect(signinSilentSpy).toHaveBeenCalledTimes(1);
            expect(setTimeoutSpy).not.toHaveBeenCalledWith(expect.any(Function), 3000);
        });

        it('should refresh immediately when document is hidden (no defer until visible)', async () => {
            const originalVisibility = document.visibilityState;
            Object.defineProperty(document, 'visibilityState', {
                configurable: true,
                get: () => 'hidden',
            });
            const signinSilentSpy = jest.spyOn(client, 'signinSilent').mockResolvedValue(null);

            try {
                (client as unknown as { proactiveRefreshWithRetry: () => void }).proactiveRefreshWithRetry();
                await jest.runAllTimersAsync();
                expect(signinSilentSpy).toHaveBeenCalledTimes(1);
            } finally {
                Object.defineProperty(document, 'visibilityState', {
                    configurable: true,
                    get: () => originalVisibility,
                });
            }
        });

        it('should retry with correct delay after failure', async () => {
            // Arrange
            const signinSilentSpy = jest.spyOn(client, 'signinSilent')
                .mockRejectedValueOnce(new Error('network error'))
                .mockResolvedValueOnce(null);
            const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

            // Act
            (client as unknown as { proactiveRefreshWithRetry: () => void }).proactiveRefreshWithRetry();
            await jest.advanceTimersByTimeAsync(3000);

            // Assert
            expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 3000);
            expect(signinSilentSpy).toHaveBeenCalledTimes(2);
        });

        it('should stop retrying after exhausting all attempts', async () => {
            // Arrange: MAX_RETRIES = 2, so both attempts fail
            const signinSilentSpy = jest.spyOn(client, 'signinSilent')
                .mockRejectedValueOnce(new Error('attempt 1 failed'))
                .mockRejectedValueOnce(new Error('attempt 2 failed'));

            // Act
            (client as unknown as { proactiveRefreshWithRetry: () => void }).proactiveRefreshWithRetry();
            await jest.advanceTimersByTimeAsync(3000);
            await jest.advanceTimersByTimeAsync(3000);

            // Assert: called exactly MAX_RETRIES times, no more retries scheduled
            expect(signinSilentSpy).toHaveBeenCalledTimes(2);
        });

        it('on invalid_grant terminal failure, should NOT send error telemetry to Sentry (expected RT death)', async () => {
            // Arrange
            const invalidGrant = Object.assign(new Error('invalid_grant'), { error: 'invalid_grant' });
            jest.spyOn(client, 'signinSilent')
                .mockRejectedValueOnce(invalidGrant)
                .mockRejectedValueOnce(invalidGrant);
            const telemetrySpy = jest.spyOn(client, 'sendTelemetryError').mockImplementation(() => {});

            // Act
            (client as unknown as { proactiveRefreshWithRetry: () => void }).proactiveRefreshWithRetry();
            await jest.advanceTimersByTimeAsync(3000);
            await jest.advanceTimersByTimeAsync(3000);

            // Assert
            expect(telemetrySpy).not.toHaveBeenCalled();
        });

        it('on network error terminal failure, should NOT send error telemetry to Sentry (expected noise)', async () => {
            // Arrange
            const networkError = new TypeError('Failed to fetch');
            jest.spyOn(client, 'signinSilent')
                .mockRejectedValueOnce(networkError)
                .mockRejectedValueOnce(networkError);
            const telemetrySpy = jest.spyOn(client, 'sendTelemetryError').mockImplementation(() => {});

            // Act
            (client as unknown as { proactiveRefreshWithRetry: () => void }).proactiveRefreshWithRetry();
            await jest.advanceTimersByTimeAsync(3000);
            await jest.advanceTimersByTimeAsync(3000);

            // Assert
            expect(telemetrySpy).not.toHaveBeenCalled();
        });

        it('on LockManager SecurityError terminal failure, should NOT send error telemetry to Sentry (expected iframe noise)', async () => {
            const lockError = new DOMException(
                'LockManager.request: request() is not allowed in this context',
                'SecurityError',
            );
            jest.spyOn(client, 'signinSilent')
                .mockRejectedValueOnce(lockError)
                .mockRejectedValueOnce(lockError);
            const telemetrySpy = jest.spyOn(client, 'sendTelemetryError').mockImplementation(() => {});

            (client as unknown as { proactiveRefreshWithRetry: () => void }).proactiveRefreshWithRetry();
            await jest.advanceTimersByTimeAsync(3000);
            await jest.advanceTimersByTimeAsync(3000);

            expect(telemetrySpy).not.toHaveBeenCalled();
        });

        it('on non-network, non-invalid_grant error, SHOULD send error telemetry (actionable)', async () => {
            // Arrange
            const genericError = new Error('Unexpected server error');
            jest.spyOn(client, 'signinSilent')
                .mockRejectedValueOnce(genericError);
            const telemetrySpy = jest.spyOn(client, 'sendTelemetryError').mockImplementation(() => {});

            // Act
            (client as unknown as { proactiveRefreshWithRetry: () => void }).proactiveRefreshWithRetry();
            await jest.advanceTimersByTimeAsync(3000);

            // Assert
            expect(telemetrySpy).toHaveBeenCalled();
        });

        it('should not retry when refresh succeeds on second attempt', async () => {
            // Arrange: first attempt fails, second succeeds (e.g., another tab refreshed)
            const signinSilentSpy = jest.spyOn(client, 'signinSilent')
                .mockRejectedValueOnce(new Error('network error'))
                .mockResolvedValueOnce(null);

            // Act
            (client as unknown as { proactiveRefreshWithRetry: () => void }).proactiveRefreshWithRetry();
            await jest.advanceTimersByTimeAsync(3000);
            await jest.advanceTimersByTimeAsync(3000);

            // Assert: only 2 calls (initial + 1 retry that succeeded), no further retries
            expect(signinSilentSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe('isInvalidGrantError (static)', () => {
        it.each([
            [{ error: 'invalid_grant' }, true],
            [new Error('invalid_grant: token expired'), true],
            [new Error('The provided authorization grant is invalid'), true],
            [new Error('Network error'), false],
            [new TypeError('Failed to fetch'), false],
            [new Error(''), false],
            [null, false],
            [undefined, false],
            ['invalid_grant', false],
        ])('classifies %p correctly', (input, expected) => {
            expect(OidcAuthClient.isInvalidGrantError(input)).toBe(expected);
        });
    });

    describe('isNetworkError (static)', () => {
        it.each([
            [new TypeError('Failed to fetch'), true],
            [new Error('Failed to fetch (my.elementor.com)'), true],
            [new Error('NetworkError when attempting to fetch resource'), true],
            [new Error('Network timed out'), true],
            [new Error('Load failed'), true],
            [new Error('The internet connection appears to be offline'), true],
            [new Error('invalid_grant'), false],
            [new Error('Unexpected server error'), false],
            [null, false],
            [undefined, false],
        ])('classifies %p correctly', (input, expected) => {
            expect(OidcAuthClient.isNetworkError(input)).toBe(expected);
        });
    });

    describe('isLockManagerSecurityError (static)', () => {
        it.each([
            [new DOMException('LockManager.request: request() is not allowed in this context', 'SecurityError'), true],
            [Object.assign(new Error('LockManager.request: request() is not allowed in this context'), { name: 'SecurityError' }), true],
            [new Error('SecurityError: unrelated'), false],
            [new TypeError('Failed to fetch'), false],
            [null, false],
            [undefined, false],
        ])('classifies %p correctly', (input, expected) => {
            expect(OidcAuthClient.isLockManagerSecurityError(input)).toBe(expected);
        });
    });

    describe('getAccessToken telemetry suppression (AI-8178)', () => {
        it('does NOT send telemetry message when user is expired', async () => {
            // Arrange
            const telemetrySpy = jest.spyOn(client, 'sendTelemetryMessage').mockImplementation(() => {});
            const expiredUser = { expired: true, profile: { email: 'a@b.c' }, expires_at: 0, access_token: '' };
            jest.spyOn(client, 'getUser').mockResolvedValue(expiredUser as never);
            jest.spyOn(client, 'signinSilent').mockResolvedValue(null);

            // Act
            await client.getAccessToken();

            // Assert
            expect(telemetrySpy).not.toHaveBeenCalled();
        });
    });

    describe('constants', () => {
        it('should export OIDC_AUTH_MESSAGE_TYPES', () => {
            // Assert
            expect(OIDC_AUTH_MESSAGE_TYPES).toBeDefined();
            expect(OIDC_AUTH_MESSAGE_TYPES.LOGIN_FLOW_COMPLETE).toBeDefined();
            expect(OIDC_AUTH_MESSAGE_TYPES.REDIRECT_TOP_WINDOW).toBeDefined();
        });

        it('should export OIDC_AUTH_URL_PARAMS', () => {
            // Assert
            expect(OIDC_AUTH_URL_PARAMS).toBeDefined();
            expect(OIDC_AUTH_URL_PARAMS.TOP_ORIGIN).toBeDefined();
            expect(OIDC_AUTH_URL_PARAMS.TOP_WP_URL).toBeDefined();
            expect(OIDC_AUTH_URL_PARAMS.LOGIN_SUCCESS).toBeDefined();
        });
    });
});
