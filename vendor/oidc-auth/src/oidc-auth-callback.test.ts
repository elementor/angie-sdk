import {
    beforeEach,
    describe,
    expect,
    it,
    jest,
} from '@jest/globals';

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
import { storeOidcCallbackHandoff } from './oidc-auth-pkce';

jest.mock('./oidc-auth-logger', () => ({
    createChildLogger: () => ({
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        log: jest.fn(),
    }),
}));

describe('oidc-auth-callback', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        sessionStorage.clear();
    });

    describe('buildOAuthCodeHandoffRedirectUrl', () => {
        it('should place code and oidc state id in the URL hash without token fields', () => {
            const redirectUrl = buildOAuthCodeHandoffRedirectUrl(
                'https://customer.example/wp-admin/',
                'auth-code-123',
                'oidc-state-id-456',
            );

            const parsed = new URL(redirectUrl);
            expect(parsed.origin).toBe('https://customer.example');
            const hashParams = new URLSearchParams(parsed.hash.slice(1));
            expect(hashParams.get(OIDC_AUTH_URL_PARAMS.CODE)).toBe('auth-code-123');
            expect(hashParams.get(OIDC_AUTH_URL_PARAMS.STATE)).toBe('oidc-state-id-456');
            assertRedirectUrlHasNoTokens(redirectUrl);
        });
    });

    describe('oidcAuthExtractRedirectInfo', () => {
        it('should build a code handoff redirect URL without exchanging tokens', async () => {
            storeOidcCallbackHandoff({
                topOrigin: 'https://example.com',
                topWpUrl: 'https://example.com/wp-admin/',
            });

            Object.defineProperty(window, 'location', {
                value: {
                    search: '?code=auth-code-123&state=oidc-state-id',
                    href: 'https://angie.example/login/oauth-callback?code=auth-code-123&state=oidc-state-id',
                },
                writable: true,
                configurable: true,
            });

            const result = await oidcAuthExtractRedirectInfo();

            expect(result.success).toBe(true);
            expect(result.redirectUrl).toContain('#');
            assertRedirectUrlHasNoTokens(result.redirectUrl!);
        });

        it('should return error when callback handoff is missing', async () => {
            Object.defineProperty(window, 'location', {
                value: { search: '?code=auth-code&state=oidc-state-id', href: '' },
                writable: true,
                configurable: true,
            });

            const result = await oidcAuthExtractRedirectInfo();

            expect(result.success).toBe(false);
        });
    });

    describe('parseOAuthReturnParamsFromWindow', () => {
        it('should read authorization code and oidc state id from the URL hash', () => {
            const params = parseOAuthReturnParamsFromWindow({
                search: '',
                hash: '#oauth2_login_success=true&oauth2_code=abc&oauth2_state=oidc-state',
            });

            expect(params.loginSuccess).toBe(true);
            expect(params.authorizationCode).toBe('abc');
            expect(params.clientState).toBe('oidc-state');
        });
    });

    describe('forwardOidcLoginFlowToWindow', () => {
        it('should not forward when no login_success param in URL', () => {
            Object.defineProperty(window, 'location', {
                value: { search: '', hash: '', href: 'https://example.com', origin: 'https://example.com' },
                writable: true,
                configurable: true,
            });
            const mockPostMessage = jest.fn();
            const targets = {
                window: { contentWindow: { postMessage: mockPostMessage } } as unknown as HTMLIFrameElement,
                windowURL: new URL('https://app.example.com'),
            };

            forwardOidcLoginFlowToWindow({ targets });

            expect(mockPostMessage).not.toHaveBeenCalled();
        });

        it('should forward authorization code and oidc state id from the URL hash', () => {
            Object.defineProperty(window, 'location', {
                value: {
                    search: '',
                    hash: '#oauth2_login_success=true&oauth2_code=abc&oauth2_state=oidc-state',
                    href: 'https://example.com/wp-admin/#oauth2_login_success=true&oauth2_code=abc&oauth2_state=oidc-state',
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
                    payload: { oauthCode: 'abc', oauthState: 'oidc-state' },
                }),
                'https://app.example.com',
            );
            replaceStateSpy.mockRestore();
        });
    });

    describe('setupOidcAuthParentListener', () => {
        it('should respond with top URL on GET_TOP_URL message', () => {
            const messageHandler = captureMessageHandler(() => {
                setupOidcAuthParentListener({ trustedOrigin: 'https://trusted.com' });
            });
            const mockPort = createMockPort();

            messageHandler({
                origin: 'https://trusted.com',
                data: { type: OIDC_AUTH_MESSAGE_TYPES.GET_TOP_URL },
                ports: [mockPort],
            } as unknown as MessageEvent);

            expect(mockPort.postMessage).toHaveBeenCalledWith({
                status: 'success',
                payload: { topUrl: expect.any(String) },
            });
        });
    });

    describe('sendOidcStateToWindow', () => {
        it('should post LOGIN_FLOW_COMPLETE to iframe', () => {
            const mockPostMessage = jest.fn();
            const targets = {
                window: { contentWindow: { postMessage: mockPostMessage } } as unknown as HTMLIFrameElement,
                windowURL: new URL('https://app.example.com'),
            };

            sendOidcStateToWindow({ oauthCode: 'code', oauthState: 'state' }, targets);

            expect(mockPostMessage).toHaveBeenCalledWith(
                {
                    type: OIDC_AUTH_MESSAGE_TYPES.LOGIN_FLOW_COMPLETE,
                    payload: { oauthCode: 'code', oauthState: 'state' },
                },
                'https://app.example.com',
            );
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
