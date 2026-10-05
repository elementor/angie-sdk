import { createChildLogger } from './oidc-auth-logger';

const logger = createChildLogger('oidc-auth:callback-handoff');

export const OIDC_CALLBACK_HANDOFF_STORAGE_KEY = 'angie_oauth_callback_handoff_v1';

export type OidcCallbackHandoff = {
	topOrigin: string;
	topWpUrl: string;
};

export function storeOidcCallbackHandoff( handoff: OidcCallbackHandoff ): void {
	sessionStorage.setItem( OIDC_CALLBACK_HANDOFF_STORAGE_KEY, JSON.stringify( handoff ) );
}

export function loadOidcCallbackHandoff(): OidcCallbackHandoff | null {
	try {
		const raw = sessionStorage.getItem( OIDC_CALLBACK_HANDOFF_STORAGE_KEY );
		if ( ! raw ) {
			return null;
		}
		return JSON.parse( raw ) as OidcCallbackHandoff;
	} catch ( error ) {
		logger.warn( 'Failed to read OAuth callback handoff from storage', error );
		return null;
	}
}

export function clearOidcCallbackHandoff(): void {
	sessionStorage.removeItem( OIDC_CALLBACK_HANDOFF_STORAGE_KEY );
}
