import type { OidcAuthAppWindow, OidcAuthExtractRedirectInfoArgs, OidcAuthExtractRedirectInfoResult } from './oidc-auth-types';
export declare function assertRedirectUrlHasNoTokens(redirectUrl: string): void;
export declare function buildOAuthCodeHandoffRedirectUrl(topWpUrl: string, authorizationCode: string, oidcStateId: string): string;
type OAuthReturnParams = {
    loginSuccess: boolean;
    authorizationCode?: string;
    clientState?: string;
    legacyTokenStateJson?: string;
};
export declare function parseOAuthReturnParamsFromWindow(locationLike: Pick<Location, 'search' | 'hash'>): OAuthReturnParams;
export declare function oidcAuthExtractRedirectInfo(_args?: OidcAuthExtractRedirectInfoArgs): Promise<OidcAuthExtractRedirectInfoResult>;
type SetupOidcAuthParentListenerArgs = {
    trustedOrigin: string;
    onOAuthParamsCleared?: () => void;
};
export declare function setupOidcAuthParentListener({ trustedOrigin, onOAuthParamsCleared }: SetupOidcAuthParentListenerArgs): void;
export declare function sendOidcStateToWindow(payload: Record<string, unknown>, targets: OidcAuthAppWindow): void;
type ForwardOidcLoginFlowToWindowArgs = {
    targets: OidcAuthAppWindow;
    onSuccess?: () => void;
    attempt?: number;
};
export declare function forwardOidcLoginFlowToWindow({ targets, onSuccess, attempt }: ForwardOidcLoginFlowToWindowArgs): void;
export {};
