import { beforeEach, describe, expect, it } from '@jest/globals';
import { webcrypto } from 'node:crypto';
import { TextDecoder, TextEncoder } from 'node:util';
import {
	assertOidcPkceSessionMatches,
	clearOidcPkceSession,
	generateCodeChallenge,
	generateCodeVerifier,
	generateOAuthClientState,
	loadOidcPkceSession,
	OIDC_PKCE_SESSION_STORAGE_KEY,
	storeOidcPkceSession,
} from './oidc-auth-pkce';

describe('oidc-auth-pkce', () => {
	beforeEach(() => {
		Object.defineProperty( globalThis, 'crypto', { value: webcrypto, configurable: true } );
		Object.defineProperty( globalThis, 'TextEncoder', { value: TextEncoder, configurable: true } );
		Object.defineProperty( globalThis, 'TextDecoder', { value: TextDecoder, configurable: true } );
		sessionStorage.clear();
	} );

	it('should persist the PKCE session in sessionStorage for the same document', () => {
		const session = {
			codeVerifier: generateCodeVerifier(),
			clientState: generateOAuthClientState(),
			expectedTopOrigin: 'https://customer.example',
		};
		storeOidcPkceSession( session );

		expect( sessionStorage.getItem( OIDC_PKCE_SESSION_STORAGE_KEY ) ).toBeTruthy();
		expect( loadOidcPkceSession() ).toEqual( session );
	} );

	it('should reject a client state mismatch', () => {
		const session = {
			codeVerifier: generateCodeVerifier(),
			clientState: 'state-a',
			expectedTopOrigin: 'https://customer.example',
		};

		expect( () => assertOidcPkceSessionMatches( session, 'state-b' ) ).toThrow( 'OAuth state mismatch' );
	} );

	it('should generate a challenge from a verifier', async () => {
		const verifier = generateCodeVerifier();
		const challenge = await generateCodeChallenge( verifier );

		expect( challenge ).toBeTruthy();
		expect( challenge ).not.toBe( verifier );
	} );

	it('should clear the stored session after redemption', () => {
		storeOidcPkceSession( {
			codeVerifier: 'verifier',
			clientState: 'state',
			expectedTopOrigin: 'https://customer.example',
		} );
		clearOidcPkceSession();
		expect( loadOidcPkceSession() ).toBeNull();
	} );
} );
