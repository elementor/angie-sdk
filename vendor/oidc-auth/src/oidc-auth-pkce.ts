import { createChildLogger } from './oidc-auth-logger';

const logger = createChildLogger('oidc-auth:pkce');

export const OIDC_PKCE_SESSION_STORAGE_KEY = 'angie_oauth_pkce_session_v1';

export type OidcPkceSession = {
	codeVerifier: string;
	clientState: string;
	expectedTopOrigin: string;
};

function getCrypto(): Crypto {
	if ( typeof globalThis.crypto === 'undefined' || ! globalThis.crypto.subtle ) {
		throw new Error( 'Web Crypto is not available' );
	}
	return globalThis.crypto;
}

function base64UrlEncode( buffer: ArrayBuffer ): string {
	const bytes = new Uint8Array( buffer );
	let binary = '';
	for ( const byte of bytes ) {
		binary += String.fromCharCode( byte );
	}
	return btoa( binary ).replace( /\+/g, '-' ).replace( /\//g, '_' ).replace( /=+$/u, '' );
}

export function generateCodeVerifier(): string {
	const random = new Uint8Array( 32 );
	getCrypto().getRandomValues( random );
	return base64UrlEncode( random.buffer );
}

export async function generateCodeChallenge( codeVerifier: string ): Promise<string> {
	const data = new TextEncoder().encode( codeVerifier );
	const digest = await getCrypto().subtle.digest( 'SHA-256', data );
	return base64UrlEncode( digest );
}

export function generateOAuthClientState(): string {
	const random = new Uint8Array( 16 );
	getCrypto().getRandomValues( random );
	return base64UrlEncode( random.buffer );
}

export function storeOidcPkceSession( session: OidcPkceSession ): void {
	sessionStorage.setItem( OIDC_PKCE_SESSION_STORAGE_KEY, JSON.stringify( session ) );
}

export function loadOidcPkceSession(): OidcPkceSession | null {
	try {
		const raw = sessionStorage.getItem( OIDC_PKCE_SESSION_STORAGE_KEY );
		if ( ! raw ) {
			return null;
		}
		return JSON.parse( raw ) as OidcPkceSession;
	} catch ( error ) {
		logger.warn( 'Failed to read PKCE session from storage', error );
		return null;
	}
}

export function clearOidcPkceSession(): void {
	sessionStorage.removeItem( OIDC_PKCE_SESSION_STORAGE_KEY );
}

export function assertOidcPkceSessionMatches( session: OidcPkceSession, clientState: string ): void {
	if ( session.clientState !== clientState ) {
		throw new Error( 'OAuth state mismatch' );
	}
}
