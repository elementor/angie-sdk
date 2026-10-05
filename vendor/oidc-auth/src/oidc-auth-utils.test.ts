import {
	beforeEach,
	describe,
	expect,
	it,
} from '@jest/globals';

import { getSafeOrigin, isSafeOrigin, isOidcFlowInUrl } from './oidc-auth-utils';

describe( 'oidc-auth-utils', () => {
	beforeEach( () => {
		Object.defineProperty( window, 'location', {
			value: { search: '' },
			writable: true,
			configurable: true,
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
} );
