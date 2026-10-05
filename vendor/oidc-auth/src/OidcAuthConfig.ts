import { type UserManagerSettings, WebStorageStateStore } from 'oidc-client-ts';
import { getWindowOrigin } from './oidc-auth-utils';
import type { OidcAuthSettings } from './oidc-auth-types';
import { DEFAULT_TOKEN_EXPIRING_NOTIFICATION_SECONDS, DEFAULT_TOKEN_FRESHNESS_THRESHOLD_SECONDS } from './oidc-auth-consts';

class OidcAuthConfig {
    private static instance: OidcAuthConfig | null = null;
    private settings: OidcAuthSettings | null = null;

    private constructor() {}

    static getInstance(): OidcAuthConfig {
        if (!OidcAuthConfig.instance) {
            OidcAuthConfig.instance = new OidcAuthConfig();
        }
        return OidcAuthConfig.instance;
    }

    configure(settings: OidcAuthSettings): void {
        this.settings = settings;
    }

    isConfigured(): boolean {
        return this.settings !== null;
    }

    getSettings(): OidcAuthSettings {
        if (!this.settings) {
            throw new Error('OidcAuthConfig not configured. Call configure() or pass settings to OidcAuthClient.initialize().');
        }
        return this.settings;
    }

    getAuthOrigin(): string {
        const { authOrigin, authEndpoint } = this.getSettings();
        return authOrigin || new URL(authEndpoint).origin;
    }

    isAccessTokenProactiveRefreshEnabled(): boolean {
        return this.settings?.accessTokenProactiveRefreshEnabled ?? true;
    }

    getOidcSettings(): UserManagerSettings {
        const origin = getWindowOrigin();
        const { clientId, authEndpoint } = this.getSettings();
        const authOrigin = this.getAuthOrigin();

        const store = typeof window !== 'undefined'
            ? new WebStorageStateStore({ store: window.localStorage })
            : undefined;

        const { accessTokenExpiringNotificationTimeInSeconds = DEFAULT_TOKEN_EXPIRING_NOTIFICATION_SECONDS } = this.getSettings();

        return {
            client_id: clientId,
            authority: authOrigin,
            redirect_uri: `${origin}/login/oauth-callback`,
            post_logout_redirect_uri: origin,
            response_type: 'code',
            scope: 'openid offline_access',
            automaticSilentRenew: false,
            accessTokenExpiringNotificationTimeInSeconds,
            stateStore: store,
            userStore: store,
            metadata: {
                issuer: authOrigin,
                authorization_endpoint: authEndpoint,
                token_endpoint: `${authOrigin}/connect/api/v1/oauth2/token`,
                end_session_endpoint: `${authOrigin}/logout/`,
            },
        };
    }

    getAccessTokenExpiringNotificationTimeInSeconds(): number {
        return this.getSettings().accessTokenExpiringNotificationTimeInSeconds ?? DEFAULT_TOKEN_EXPIRING_NOTIFICATION_SECONDS;
    }

    getAccessTokenFreshnessThresholdInSeconds(): number {
        return this.getSettings().accessTokenFreshnessThresholdInSeconds ?? DEFAULT_TOKEN_FRESHNESS_THRESHOLD_SECONDS;
    }

    getAllowedParentOrigins(): string[] | undefined {
        return this.settings?.allowedParentOrigins;
    }

}

export const oidcAuthConfig = OidcAuthConfig.getInstance();

export default OidcAuthConfig;
