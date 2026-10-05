import {
	beforeEach,
	describe,
	expect,
	it,
} from '@jest/globals';

import { oidcAuthConfig } from './OidcAuthConfig';
import { getSafeOrigin, isSafeOrigin, isOidcFlowInUrl, validateOAuthAuthorizeUrl } from './oidc-auth-utils';

function buildValidAuthorizeUrl( overrides: Record<string, string> = {} ): string {
	const params = new URLSearchParams( {
		client_id: 'test-client-id',
		redirect_uri: 'https://angie.example/login/oauth-callback',
		response_type: 'code',
		code_challenge_method: 'S256',
		code_challenge: 'test-challenge',
		state: 'oidc-state-id',
		scope: 'openid offline_access',
		...overrides,
	} );
	return `https://test.auth.com/oauth2/auth?${ params.toString() }`;
}

describe( 'oidc-auth-utils', () => {
	beforeEach( () => {
		Object.defineProperty( window, 'location', {
			value: { origin: 'https://angie.example', search: '' },
			writable: true,
			configurable: true,
		} );
		oidcAuthConfig.configure( {
			clientId: 'test-client-id',
			authEndpoint: 'https://test.auth.com/oauth2/auth',
			authOrigin: 'https://test.auth.com',
		} );
	} );

	describe( 'getSafeOrigin', () => {
		it( 'should return origin from URL search params', () => {
			// Arrange
			Object.defineProperty( window, 'location', {
				value: { search: '?origin=https://trusted.com' },
				writable: true,
				configurable: true,
			} );

			// Act
			const result = getSafeOrigin();

			// Assert
			expect( result ).toBe( 'https://trusted.com' );
		} );

		it( 'should return empty string when no origin param', () => {
			// Arrange
			Object.defineProperty( window, 'location', {
				value: { search: '?other=value' },
				writable: true,
				configurable: true,
			} );

			// Act
			const result = getSafeOrigin();

			// Assert
			expect( result ).toBe( '' );
		} );
	} );

	describe( 'isSafeOrigin', () => {
		it( 'should return true when origin matches', () => {
			// Arrange
			Object.defineProperty( window, 'location', {
				value: { search: '?origin=https://trusted.com' },
				writable: true,
				configurable: true,
			} );

			// Act & Assert
			expect( isSafeOrigin( 'https://trusted.com' ) ).toBe( true );
		} );

		it( 'should return false when origin does not match', () => {
			// Arrange
			Object.defineProperty( window, 'location', {
				value: { search: '?origin=https://trusted.com' },
				writable: true,
				configurable: true,
			} );

			// Act & Assert
			expect( isSafeOrigin( 'https://evil.com' ) ).toBe( false );
		} );
	} );

	describe( 'isOidcFlowInUrl', () => {
		it( 'should return true when login_success param is present', () => {
			// Arrange
			Object.defineProperty( window, 'location', {
				value: { search: '?oauth2_login_success=true' },
				writable: true,
				configurable: true,
			} );

			// Act & Assert
			expect( isOidcFlowInUrl() ).toBe( true );
		} );

		it( 'should return true when state param is present', () => {
			// Arrange
			Object.defineProperty( window, 'location', {
				value: { search: '?oauth2_state=some-state' },
				writable: true,
				configurable: true,
			} );

			// Act & Assert
			expect( isOidcFlowInUrl() ).toBe( true );
		} );

		it( 'should return true when top_origin param is present', () => {
			// Arrange
			Object.defineProperty( window, 'location', {
				value: { search: '?oauth2_top_origin=https://example.com' },
				writable: true,
				configurable: true,
			} );

			// Act & Assert
			expect( isOidcFlowInUrl() ).toBe( true );
		} );

		it( 'should return false when no OIDC params present', () => {
			// Arrange
			Object.defineProperty( window, 'location', {
				value: { search: '?page=app&other=value' },
				writable: true,
				configurable: true,
			} );

			// Act & Assert
			expect( isOidcFlowInUrl() ).toBe( false );
		} );

		it( 'should return false with empty search params', () => {
			// Arrange
			Object.defineProperty( window, 'location', {
				value: { search: '' },
				writable: true,
				configurable: true,
			} );

			// Act & Assert
			expect( isOidcFlowInUrl() ).toBe( false );
		} );
	} );

	describe( 'validateOAuthAuthorizeUrl', () => {
		it( 'should accept a valid authorize URL', () => {
			const result = validateOAuthAuthorizeUrl( buildValidAuthorizeUrl() );
			expect( result.valid ).toBe( true );
		} );

		it( 'should reject javascript: URLs', () => {
			const result = validateOAuthAuthorizeUrl( 'javascript:alert(1)' );
			expect( result.valid ).toBe( false );
		} );

		it( 'should reject a foreign authorization host', () => {
			const result = validateOAuthAuthorizeUrl(
				buildValidAuthorizeUrl().replace( 'https://test.auth.com', 'https://evil.example' ),
			);
			expect( result.valid ).toBe( false );
		} );

		it( 'should reject a mismatched redirect_uri', () => {
			const result = validateOAuthAuthorizeUrl(
				buildValidAuthorizeUrl( { redirect_uri: 'https://evil.example/callback' } ),
			);
			expect( result.valid ).toBe( false );
		} );

		it( 'should reject a missing code_challenge', () => {
			const url = buildValidAuthorizeUrl();
			const parsed = new URL( url );
			parsed.searchParams.delete( 'code_challenge' );
			const result = validateOAuthAuthorizeUrl( parsed.toString() );
			expect( result.valid ).toBe( false );
		} );
	} );
} );
