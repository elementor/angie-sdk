import { OidcLogoutParams } from './oidc-auth-types';
export declare function getWindowOrigin(): string;
export declare function getLogoutUrl(logoutParams: OidcLogoutParams): string;
export declare const getSafeOrigin: () => string;
export declare const isSafeOrigin: (origin: string) => boolean;
export declare function isOidcFlowInUrl(): boolean;
