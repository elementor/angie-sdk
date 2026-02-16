import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import {
	setReferrerRedirect,
	getReferrerRedirect,
	clearReferrerRedirect,
} from './referrer-redirect';

describe( 'referrer-redirect', () => {
	let mockLocalStorage: { [ key: string ]: string };
	const originalLocation = window.location;

	beforeEach( () => {
		jest.clearAllMocks();

		mockLocalStorage = {};
		Object.defineProperty( global, 'localStorage', {
			value: {
				getItem: jest.fn( ( key: string ) => mockLocalStorage[ key ] || null ),
				setItem: jest.fn( ( key: string, value: string ) => {
					mockLocalStorage[ key ] = value;
				} ),
				removeItem: jest.fn( ( key: string ) => {
					delete mockLocalStorage[ key ];
				} ),
			},
			writable: true,
		} );

		delete ( window as any ).location;
		( window as any ).location = { origin: 'http://localhost' };
	} );

	afterEach( () => {
		jest.restoreAllMocks();
		( window as any ).location = originalLocation;
	} );

	describe( 'setReferrerRedirect', () => {
		it( 'should store valid wp-admin URL', () => {
			// Arrange
			const validUrl = 'http://localhost/wp-admin/post.php?post=123&action=elementor';

			// Act
			const result = setReferrerRedirect( validUrl );

			// Assert
			expect( result ).toBe( true );
			expect( localStorage.setItem ).toHaveBeenCalledWith( 'angie_return_url', validUrl );
		} );

		it( 'should reject external domain URL', () => {
			// Arrange
			const externalUrl = 'https://evil.com/phishing';

			// Act
			const result = setReferrerRedirect( externalUrl );

			// Assert
			expect( result ).toBe( false );
			expect( localStorage.setItem ).not.toHaveBeenCalled();
		} );

		it( 'should reject URL outside wp-admin', () => {
			// Arrange
			const nonAdminUrl = 'http://localhost/some-page';

			// Act
			const result = setReferrerRedirect( nonAdminUrl );

			// Assert
			expect( result ).toBe( false );
			expect( localStorage.setItem ).not.toHaveBeenCalled();
		} );

		it( 'should reject malformed URL', () => {
			// Arrange
			const malformedUrl = 'not-a-valid-url';

			// Act
			const result = setReferrerRedirect( malformedUrl );

			// Assert
			expect( result ).toBe( false );
			expect( localStorage.setItem ).not.toHaveBeenCalled();
		} );

		it( 'should accept various valid wp-admin paths', () => {
			// Arrange
			const validUrls = [
				'http://localhost/wp-admin/post.php?post=123&action=elementor',
				'http://localhost/wp-admin/edit.php',
				'http://localhost/wp-admin/admin.php?page=some-page',
				'http://localhost/wp-admin/index.php',
			];

			// Act & Assert
			for ( const url of validUrls ) {
				mockLocalStorage = {};
				const result = setReferrerRedirect( url );
				expect( result ).toBe( true );
			}
		} );
	} );

	describe( 'getReferrerRedirect', () => {
		it( 'should return stored valid URL', () => {
			// Arrange
			const validUrl = 'http://localhost/wp-admin/post.php?post=123';
			mockLocalStorage[ 'angie_return_url' ] = validUrl;

			// Act
			const result = getReferrerRedirect();

			// Assert
			expect( result ).toBe( validUrl );
		} );

		it( 'should return null when no URL is stored', () => {
			// Act
			const result = getReferrerRedirect();

			// Assert
			expect( result ).toBeNull();
		} );

		it( 'should return null for invalid stored URL (external domain)', () => {
			// Arrange
			mockLocalStorage[ 'angie_return_url' ] = 'https://evil.com/page';

			// Act
			const result = getReferrerRedirect();

			// Assert
			expect( result ).toBeNull();
		} );

		it( 'should return null for invalid stored URL (non wp-admin path)', () => {
			// Arrange
			mockLocalStorage[ 'angie_return_url' ] = 'http://localhost/some-page';

			// Act
			const result = getReferrerRedirect();

			// Assert
			expect( result ).toBeNull();
		} );
	} );

	describe( 'clearReferrerRedirect', () => {
		it( 'should remove stored URL', () => {
			// Arrange
			mockLocalStorage[ 'angie_return_url' ] = 'http://localhost/wp-admin/post.php';

			// Act
			clearReferrerRedirect();

			// Assert
			expect( localStorage.removeItem ).toHaveBeenCalledWith( 'angie_return_url' );
		} );

		it( 'should not throw when no URL is stored', () => {
			// Act & Assert
			expect( () => clearReferrerRedirect() ).not.toThrow();
		} );
	} );
} );
