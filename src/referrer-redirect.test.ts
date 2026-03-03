import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import {
	setReferrerRedirect,
	getReferrerRedirect,
	clearReferrerRedirect,
	executeReferrerRedirect,
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
		it( 'should store valid same-origin URL as JSON', () => {
			// Arrange
			const validUrl = 'http://localhost/some-page?id=123';

			// Act
			const result = setReferrerRedirect( validUrl );

			// Assert
			expect( result ).toBe( true );
			expect( localStorage.setItem ).toHaveBeenCalledWith(
				'angie_return_url',
				JSON.stringify( { url: validUrl } )
			);
		} );

		it( 'should store URL with prompt as JSON', () => {
			// Arrange
			const validUrl = 'http://localhost/some-page?id=123';
			const prompt = 'Help me create a contact page';

			// Act
			const result = setReferrerRedirect( validUrl, prompt );

			// Assert
			expect( result ).toBe( true );
			expect( localStorage.setItem ).toHaveBeenCalledWith(
				'angie_return_url',
				JSON.stringify( { url: validUrl, prompt } )
			);
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

		it( 'should reject external domain URL even with prompt', () => {
			// Arrange
			const externalUrl = 'https://evil.com/phishing';

			// Act
			const result = setReferrerRedirect( externalUrl, 'some prompt' );

			// Assert
			expect( result ).toBe( false );
			expect( localStorage.setItem ).not.toHaveBeenCalled();
		} );

		it( 'should accept relative paths as same-origin', () => {
			// Arrange
			const relativePath = 'not-a-valid-url';

			// Act
			const result = setReferrerRedirect( relativePath );

			// Assert — relative paths resolve to same origin
			expect( result ).toBe( true );
		} );

		it( 'should accept various same-origin paths', () => {
			// Arrange
			const validUrls = [
				'http://localhost/admin/post.php?post=123',
				'http://localhost/dashboard',
				'http://localhost/settings?page=general',
				'http://localhost/',
			];

			// Act & Assert
			for ( const url of validUrls ) {
				mockLocalStorage = {};
				const result = setReferrerRedirect( url );
				expect( result ).toBe( true );
			}
		} );

		it( 'should not store prompt when it is an empty string', () => {
			// Arrange
			const validUrl = 'http://localhost/some-page';

			// Act
			const result = setReferrerRedirect( validUrl, '' );

			// Assert
			expect( result ).toBe( true );
			expect( localStorage.setItem ).toHaveBeenCalledWith(
				'angie_return_url',
				JSON.stringify( { url: validUrl } )
			);
		} );
	} );

	describe( 'getReferrerRedirect', () => {
		it( 'should return stored valid same-origin URL as object', () => {
			// Arrange
			const validUrl = 'http://localhost/dashboard?post=123';
			mockLocalStorage[ 'angie_return_url' ] = JSON.stringify( { url: validUrl } );

			// Act
			const result = getReferrerRedirect();

			// Assert
			expect( result ).toEqual( { url: validUrl } );
		} );

		it( 'should return stored URL with prompt as object', () => {
			// Arrange
			const validUrl = 'http://localhost/dashboard?post=123';
			const prompt = 'Help me with SEO';
			mockLocalStorage[ 'angie_return_url' ] = JSON.stringify( { url: validUrl, prompt } );

			// Act
			const result = getReferrerRedirect();

			// Assert
			expect( result ).toEqual( { url: validUrl, prompt } );
		} );

		it( 'should return null when no URL is stored', () => {
			// Act
			const result = getReferrerRedirect();

			// Assert
			expect( result ).toBeNull();
		} );

		it( 'should return null for invalid stored URL (external domain)', () => {
			// Arrange
			mockLocalStorage[ 'angie_return_url' ] = JSON.stringify( { url: 'https://evil.com/page' } );

			// Act
			const result = getReferrerRedirect();

			// Assert
			expect( result ).toBeNull();
		} );

		it( 'should return null for malformed JSON', () => {
			// Arrange
			mockLocalStorage[ 'angie_return_url' ] = 'not-json';

			// Act
			const result = getReferrerRedirect();

			// Assert
			expect( result ).toBeNull();
		} );

		it( 'should return null for JSON without url field', () => {
			// Arrange
			mockLocalStorage[ 'angie_return_url' ] = JSON.stringify( { prompt: 'orphan prompt' } );

			// Act
			const result = getReferrerRedirect();

			// Assert
			expect( result ).toBeNull();
		} );
	} );

	describe( 'clearReferrerRedirect', () => {
		it( 'should remove stored URL', () => {
			// Arrange
			mockLocalStorage[ 'angie_return_url' ] = JSON.stringify( { url: 'http://localhost/dashboard' } );

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

	describe( 'executeReferrerRedirect', () => {
		it( 'should clear redirect data and return true when valid redirect data exists', () => {
			// Arrange
			const validUrl = 'http://localhost/dashboard?post=123';
			mockLocalStorage[ 'angie_return_url' ] = JSON.stringify( { url: validUrl } );

			// Act
			const result = executeReferrerRedirect();

			// Assert
			expect( result ).toBe( true );
			expect( localStorage.removeItem ).toHaveBeenCalledWith( 'angie_return_url' );
		} );

		it( 'should clear redirect data and return true when prompt exists', () => {
			// Arrange
			const validUrl = 'http://localhost/dashboard?post=123';
			const prompt = 'Help me create a contact page';
			mockLocalStorage[ 'angie_return_url' ] = JSON.stringify( { url: validUrl, prompt } );

			// Act
			const result = executeReferrerRedirect();

			// Assert
			expect( result ).toBe( true );
			expect( localStorage.removeItem ).toHaveBeenCalledWith( 'angie_return_url' );
		} );

		it( 'should return false when no redirect data exists', () => {
			// Act
			const result = executeReferrerRedirect();

			// Assert
			expect( result ).toBe( false );
			expect( localStorage.removeItem ).not.toHaveBeenCalled();
		} );

		it( 'should return false when stored URL is invalid (external domain)', () => {
			// Arrange
			mockLocalStorage[ 'angie_return_url' ] = JSON.stringify( { url: 'https://evil.com/page' } );

			// Act
			const result = executeReferrerRedirect();

			// Assert
			expect( result ).toBe( false );
			expect( localStorage.removeItem ).not.toHaveBeenCalled();
		} );
	} );
} );
