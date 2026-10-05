import { type UserManagerSettings } from 'oidc-client-ts';
import type { OidcAuthSettings } from './oidc-auth-types';
declare class OidcAuthConfig {
    private static instance;
    private settings;
    private constructor();
    static getInstance(): OidcAuthConfig;
    configure(settings: OidcAuthSettings): void;
    isConfigured(): boolean;
    getSettings(): OidcAuthSettings;
    getAuthOrigin(): string;
    isAccessTokenProactiveRefreshEnabled(): boolean;
    getOidcSettings(stateStore?: Storage, userStore?: Storage): UserManagerSettings;
    getAccessTokenExpiringNotificationTimeInSeconds(): number;
    getAccessTokenFreshnessThresholdInSeconds(): number;
    getAllowedParentOrigins(): string[] | undefined;
}
export declare const oidcAuthConfig: OidcAuthConfig;
export default OidcAuthConfig;
