import {
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from '@jest/globals';

import { oidcAuthConfig } from './OidcAuthConfig';

oidcAuthConfig.configure({
    clientId: 'test-client-id',
    authEndpoint: 'https://test.auth.com/oauth2/auth',
    authOrigin: 'https://test.auth.com',
});

jest.mock('./oidc-auth-logger', () => ({
    createChildLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        log: jest.fn(),
    }),
}));

const mockReadSigninRedirectCallback = jest.fn<() => Promise<unknown>>();
const mockInitialize = jest.fn();
jest.mock('./OidcAuthClient', () => {
    const oidcAuthClient = {
        initialize: mockInitialize,
        readSigninRedirectCallback: mockReadSigninRedirectCallback,
    };
    return { oidcAuthClient };
});

import {
    assertRedirectUrlHasNoTokens,
    buildOAuthCodeHandoffRedirectUrl,
    forwardOidcLoginFlowToWindow,
    parseOAuthReturnParamsFromWindow,
    sendOidcStateToWindow,
    setupOidcAuthParentListener,
    oidcAuthExtractRedirectInfo,
} from './oidc-auth-callback';
import { OIDC_AUTH_MESSAGE_TYPES, OIDC_AUTH_URL_PARAMS } from './oidc-auth-consts';

describe('oidc-auth-callback', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('buildOAuthCodeHandoffRedirectUrl', () => {
        it('should place code and state in the URL hash without token fields', () => {
            const redirectUrl = buildOAuthCodeHandoffRedirectUrl(
                'https://customer.example/wp-admin/',
                'auth-code-123',
                'client-state-456',
            );

            const parsed = new URL(redirectUrl);
            expect(parsed.origin).toBe('https://customer.example');
            expect(parsed.searchParams.has('access_token')).toBe(false);
            const hashParams = new URLSearchParams(parsed.hash.slice(1));
            expect(hashParams.get(OIDC_AUTH_URL_PARAMS.CODE)).toBe('auth-code-123');
            expect(hashParams.get(OIDC_AUTH_URL_PARAMS.STATE)).toBe('client-state-456');
            expect(hashParams.get(OIDC_AUTH_URL_PARAMS.LOGIN_SUCCESS)).toBe('true');
            assertRedirectUrlHasNoTokens(redirectUrl);
        });
    });

    describe('oidcAuthExtractRedirectInfo', () => {
        it('should build a code handoff redirect URL without exchanging tokens', async () => {
            mockReadSigninRedirectCallback.mockResolvedValue({
                authorizationCode: 'auth-code-123',
                customState: {
                    [OIDC_AUTH_URL_PARAMS.TOP_WP_URL]: 'https://example.com/wp-admin/',
                    [OIDC_AUTH_URL_PARAMS.PKCE_CLIENT_STATE]: 'client-state-456',
                },
            });

            const result = await oidcAuthExtractRedirectInfo();

            expect(result.success).toBe(true);
            expect(result.redirectUrl).toContain('#');
            assertRedirectUrlHasNoTokens(result.redirectUrl!);
        });

        it('should return error when PKCE client state is missing', async () => {
            mockReadSigninRedirectCallback.mockResolvedValue({
                authorizationCode: 'auth-code-123',
                customState: {
                    [OIDC_AUTH_URL_PARAMS.TOP_WP_URL]: 'https://example.com/wp-admin/',
                },
            });

            const result = await oidcAuthExtractRedirectInfo();

            expect(result.success).toBe(false);
        });

        it('should return error on callback read failure', async () => {
            mockReadSigninRedirectCallback.mockRejectedValue(new Error('Auth failed'));

            const result = await oidcAuthExtractRedirectInfo();

            expect(result.success).toBe(false);
            expect(result.error).toBe('Auth failed');
        });

        it('should return generic error message for non-Error throws', async () => {
            mockReadSigninRedirectCallback.mockRejectedValue('unknown error');

            const result = await oidcAuthExtractRedirectInfo();

            expect(result.success).toBe(false);
            expect(result.error).toBe('Authentication failed');
        });
    });

    describe('parseOAuthReturnParamsFromWindow', () => {
        it('should read authorization code and state from the URL hash', () => {
            const params = parseOAuthReturnParamsFromWindow({
                search: '',
                hash: '#oauth2_login_success=true&oauth2_code=abc&oauth2_state=xyz',
            });

            expect(params.loginSuccess).toBe(true);
            expect(params.authorizationCode).toBe('abc');
            expect(params.clientState).toBe('xyz');
        });
    });

    describe('setupOidcAuthParentListener', () => {
        it('should respond with top URL on GET_TOP_URL message', () => {
            // Arrange
            const messageHandler = captureMessageHandler(() => {
                setupOidcAuthParentListener({ trustedOrigin: 'https://trusted.com' });
            });
            const mockPort = createMockPort();

            // Act
            messageHandler({
                origin: 'https://trusted.com',
                data: { type: OIDC_AUTH_MESSAGE_TYPES.GET_TOP_URL },
                ports: [mockPort],
            } as unknown as MessageEvent);

            // Assert
            expect(mockPort.postMessage).toHaveBeenCalledWith({
                status: 'success',
                payload: { topUrl: window.location.href },
            });
        });

        it('should ignore messages from untrusted origins', () => {
            // Arrange
            const messageHandler = captureMessageHandler(() => {
                setupOidcAuthParentListener({ trustedOrigin: 'https://trusted.com' });
            });
            const mockPort = createMockPort();

            // Act
            messageHandler({
                origin: 'https://evil.com',
                data: { type: OIDC_AUTH_MESSAGE_TYPES.GET_TOP_URL },
                ports: [mockPort],
            } as unknown as MessageEvent);

            // Assert
            expect(mockPort.postMessage).not.toHaveBeenCalled();
        });

        it('should redirect on REDIRECT_TOP_WINDOW message', () => {
            // Arrange
            const messageHandler = captureMessageHandler(() => {
                setupOidcAuthParentListener({ trustedOrigin: 'https://trusted.com' });
            });
            const hrefSetter = jest.fn();
            Object.defineProperty(window, 'location', {
                value: { ...window.location, href: 'https://current.com' },
                writable: true,
                configurable: true,
            });
            Object.defineProperty(window.location, 'href', {
                set: hrefSetter,
                get: () => 'https://current.com',
                configurable: true,
            });

            // Act
            messageHandler({
                origin: 'https://trusted.com',
                data: {
                    type: OIDC_AUTH_MESSAGE_TYPES.REDIRECT_TOP_WINDOW,
                    payload: { url: 'https://example.com/login' },
                },
                ports: [],
            } as unknown as MessageEvent);

            // Assert
            expect(hrefSetter).toHaveBeenCalledWith('https://example.com/login');
        });

        it('should respond with isPending on CHECK_PENDING message', () => {
            // Arrange
            Object.defineProperty(window, 'location', {
                value: { ...window.location, search: '' },
                writable: true,
                configurable: true,
            });
            const messageHandler = captureMessageHandler(() => {
                setupOidcAuthParentListener({ trustedOrigin: 'https://trusted.com' });
            });
            const mockPort = createMockPort();

            // Act
            messageHandler({
                origin: 'https://trusted.com',
                data: { type: OIDC_AUTH_MESSAGE_TYPES.CHECK_PENDING },
                ports: [mockPort],
            } as unknown as MessageEvent);

            // Assert
            expect(mockPort.postMessage).toHaveBeenCalledWith({
                status: 'success',
                payload: { isPending: false },
            });
        });
    });

    describe('sendOidcStateToWindow', () => {
        it('should post message to target window', () => {
            // Arrange
            const mockPostMessage = jest.fn();
            const targets = {
                window: { contentWindow: { postMessage: mockPostMessage } } as unknown as HTMLIFrameElement,
                windowURL: new URL('https://app.example.com'),
            };
            const payload = { oauthState: { access_token: 'token' } };

            // Act
            sendOidcStateToWindow(payload, targets);

            // Assert
            expect(mockPostMessage).toHaveBeenCalledWith(
                {
                    type: OIDC_AUTH_MESSAGE_TYPES.LOGIN_FLOW_COMPLETE,
                    payload,
                },
                'https://app.example.com',
            );
        });

        it('should not throw when window is null', () => {
            // Arrange
            const targets = {
                window: null,
                windowURL: null,
            };

            // Act & Assert
            expect(() => sendOidcStateToWindow({ data: 'test' }, targets)).not.toThrow();
        });
    });

    describe('forwardOidcLoginFlowToWindow', () => {
        it('should not forward when no login_success param in URL', () => {
            // Arrange
            Object.defineProperty(window, 'location', {
                value: { ...window.location, search: '', href: 'https://example.com' },
                writable: true,
                configurable: true,
            });
            const mockPostMessage = jest.fn();
            const targets = {
                window: { contentWindow: { postMessage: mockPostMessage } } as unknown as HTMLIFrameElement,
                windowURL: new URL('https://app.example.com'),
            };

            // Act
            forwardOidcLoginFlowToWindow({ targets });

            // Assert
            expect(mockPostMessage).not.toHaveBeenCalled();
        });

        it('should forward authorization code and client state from the URL hash', () => {
            Object.defineProperty(window, 'location', {
                value: {
                    search: '',
                    hash: '#oauth2_login_success=true&oauth2_code=abc&oauth2_state=xyz',
                    href: 'https://example.com/wp-admin/#oauth2_login_success=true&oauth2_code=abc&oauth2_state=xyz',
                    origin: 'https://example.com',
                },
                writable: true,
                configurable: true,
            });

            const replaceStateSpy = jest.spyOn(history, 'replaceState').mockImplementation(() => { });
            const mockPostMessage = jest.fn();
            const targets = {
                window: { contentWindow: { postMessage: mockPostMessage } } as unknown as HTMLIFrameElement,
                windowURL: new URL('https://app.example.com'),
            };

            forwardOidcLoginFlowToWindow({ targets });

            expect(mockPostMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: OIDC_AUTH_MESSAGE_TYPES.LOGIN_FLOW_COMPLETE,
                    payload: { oauthCode: 'abc', oauthState: 'xyz' },
                }),
                'https://app.example.com',
            );
            expect(replaceStateSpy).toHaveBeenCalled();
            replaceStateSpy.mockRestore();
        });

        it('should forward legacy OIDC token state to window and clean URL', () => {
            // Arrange
            const oauthState = {
                access_token: 'token',
                state: { data: { [OIDC_AUTH_URL_PARAMS.TOP_ORIGIN]: 'https://example.com' } },
            };
            const searchParams = new URLSearchParams();
            searchParams.set(OIDC_AUTH_URL_PARAMS.LOGIN_SUCCESS, 'true');
            searchParams.set(OIDC_AUTH_URL_PARAMS.STATE, JSON.stringify(oauthState));

            Object.defineProperty(window, 'location', {
                value: {
                    search: `?${searchParams.toString()}`,
                    href: `https://example.com?${searchParams.toString()}`,
                    origin: 'https://example.com',
                },
                writable: true,
                configurable: true,
            });

            const replaceStateSpy = jest.spyOn(history, 'replaceState').mockImplementation(() => { });
            const mockPostMessage = jest.fn();
            const targets = {
                window: { contentWindow: { postMessage: mockPostMessage } } as unknown as HTMLIFrameElement,
                windowURL: new URL('https://app.example.com'),
            };
            const onSuccess = jest.fn();

            // Act
            forwardOidcLoginFlowToWindow({ targets, onSuccess });

            // Assert
            expect(mockPostMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: OIDC_AUTH_MESSAGE_TYPES.LOGIN_FLOW_COMPLETE,
                }),
                'https://app.example.com',
            );
            expect(replaceStateSpy).toHaveBeenCalled();
            expect(onSuccess).toHaveBeenCalled();

            replaceStateSpy.mockRestore();
        });

        it('should reject when origin in state does not match window origin', () => {
            // Arrange
            const oauthState = {
                state: { data: { [OIDC_AUTH_URL_PARAMS.TOP_ORIGIN]: 'https://evil.com' } },
            };
            const searchParams = new URLSearchParams();
            searchParams.set(OIDC_AUTH_URL_PARAMS.LOGIN_SUCCESS, 'true');
            searchParams.set(OIDC_AUTH_URL_PARAMS.STATE, JSON.stringify(oauthState));

            Object.defineProperty(window, 'location', {
                value: {
                    search: `?${searchParams.toString()}`,
                    href: `https://example.com?${searchParams.toString()}`,
                    origin: 'https://example.com',
                },
                writable: true,
                configurable: true,
            });

            const mockPostMessage = jest.fn();
            const targets = {
                window: { contentWindow: { postMessage: mockPostMessage } } as unknown as HTMLIFrameElement,
                windowURL: new URL('https://app.example.com'),
            };

            // Act
            forwardOidcLoginFlowToWindow({ targets });

            // Assert
            expect(mockPostMessage).not.toHaveBeenCalled();
        });

        it('should retry when iframe is not available', () => {
            // Arrange
            jest.useFakeTimers();
            const searchParams = new URLSearchParams();
            searchParams.set(OIDC_AUTH_URL_PARAMS.LOGIN_SUCCESS, 'true');
            searchParams.set(OIDC_AUTH_URL_PARAMS.STATE, JSON.stringify({ access_token: 'token' }));

            Object.defineProperty(window, 'location', {
                value: {
                    search: `?${searchParams.toString()}`,
                    href: `https://example.com?${searchParams.toString()}`,
                    origin: 'https://example.com',
                },
                writable: true,
                configurable: true,
            });

            const targets = {
                window: null,
                windowURL: null,
            };

            // Act
            forwardOidcLoginFlowToWindow({ targets, attempt: 1 });

            // Assert
            expect(jest.getTimerCount()).toBe(1);

            jest.useRealTimers();
        });
    });
});

function captureMessageHandler(setup: () => void): (event: MessageEvent) => void {
    let handler: ((event: MessageEvent) => void) | null = null;
    const addSpy = jest.spyOn(window, 'addEventListener').mockImplementation(
        (type: string, cb: unknown) => {
            if (type === 'message') {
                handler = cb as (event: MessageEvent) => void;
            }
        },
    );
    setup();
    addSpy.mockRestore();
    return handler!;
}

function createMockPort(): MessagePort {
    return { postMessage: jest.fn() } as unknown as MessagePort;
}
