export declare const OIDC_CALLBACK_HANDOFF_STORAGE_KEY = "angie_oauth_callback_handoff_v1";
export type OidcCallbackHandoff = {
    topOrigin: string;
    topWpUrl: string;
};
export declare function storeOidcCallbackHandoff(handoff: OidcCallbackHandoff): void;
export declare function loadOidcCallbackHandoff(): OidcCallbackHandoff | null;
export declare function clearOidcCallbackHandoff(): void;
