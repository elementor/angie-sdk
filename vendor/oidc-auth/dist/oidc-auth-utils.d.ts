import { OidcLogoutParams } from './oidc-auth-types';
export declare function getWindowOrigin(): string;
export declare function getLogoutUrl(logoutParams: OidcLogoutParams): string;
export declare const getSafeOrigin: () => string;
export declare const isSafeOrigin: (origin: string) => boolean;
export type ValidateOAuthAuthorizeUrlResult = {
    valid: true;
    url: URL;
} | {
    valid: false;
    error: string;
};
export declare function validateOAuthAuthorizeUrl(authorizeUrl: string): ValidateOAuthAuthorizeUrlResult;
export declare function isOidcFlowInUrl(): boolean;
