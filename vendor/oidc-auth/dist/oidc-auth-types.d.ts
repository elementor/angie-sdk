import type { User } from 'oidc-client-ts';
import { OidcAuthTelemetry } from './oidc-auth-telemetry';
export type OidcAuthSettings = {
    clientId: string;
    authEndpoint: string;
    authOrigin?: string;
    allowedParentOrigins?: string[];
    accessTokenProactiveRefreshEnabled?: boolean;
    accessTokenExpiringNotificationTimeInSeconds?: number;
    accessTokenFreshnessThresholdInSeconds?: number;
    telemetry?: OidcAuthTelemetry;
};
export interface OidcConfig {
    clientId: string;
    authority: string;
    redirectUri: string;
    silentRedirectUri: string;
    postLogoutRedirectUri: string;
    logoutUrl: string;
    metadata: {
        issuer: string;
        authorizationEndpoint: string;
        tokenEndpoint: string;
        endSessionEndpoint: string;
    };
}
export type OidcUserData = {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
};
export type OidcStateData = Record<string, string>;
export interface OidcUserState {
    data?: OidcStateData;
}
export type OidcUser = User & {
    state?: OidcUserState;
};
export type OidcLoginParams = {
    loginPath: string;
    windowPath: string;
};
export type OidcLogoutParams = {
    logoutPath: string;
    windowPath: string;
};
export interface OidcAuthExtractRedirectInfoResult {
    success: boolean;
    redirectUrl?: string;
    error?: string;
    userSub?: string;
}
export type OidcAuthAppWindow = {
    window: HTMLIFrameElement | null;
    windowURL: URL | null;
};
export type OidcAuthExtractRedirectInfoArgs = {
    fallbackPath?: string;
};
export type AskHostMessageObject = {
    type: string;
    payload?: unknown;
    origin?: string;
    data?: Record<string, unknown>;
};
export type AskHostMessageResponse = {
    status: 'success' | 'error';
    payload?: unknown;
};
export type OidcEventCallback = () => void;
export type OidcUserEventCallback = (user: User) => void;
export type OidcErrorEventCallback = (error: Error) => void;
export interface OidcEvents {
    onUserLoaded: (callback: OidcUserEventCallback) => void;
    onUserUnloaded: (callback: OidcEventCallback) => void;
    onSilentRenewError: (callback: OidcErrorEventCallback) => void;
    onAccessTokenExpiring: (callback: OidcEventCallback) => void;
    onAccessTokenExpired: (callback: OidcEventCallback) => void;
}
