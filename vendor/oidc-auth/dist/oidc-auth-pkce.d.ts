export declare const OIDC_PKCE_SESSION_STORAGE_KEY = "angie_oauth_pkce_session_v1";
export type OidcPkceSession = {
    codeVerifier: string;
    clientState: string;
    expectedTopOrigin: string;
};
export declare function generateCodeVerifier(): string;
export declare function generateCodeChallenge(codeVerifier: string): Promise<string>;
export declare function generateOAuthClientState(): string;
export declare function storeOidcPkceSession(session: OidcPkceSession): void;
export declare function loadOidcPkceSession(): OidcPkceSession | null;
export declare function clearOidcPkceSession(): void;
export declare function assertOidcPkceSessionMatches(session: OidcPkceSession, clientState: string): void;
