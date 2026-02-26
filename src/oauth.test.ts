import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';

const mockSetupOidcAuthParentListener = jest.fn();
const mockForwardOidcLoginFlowToWindow = jest.fn();

jest.mock( '@elementor/oidc-auth', () => ( {
	setupOidcAuthParentListener: mockSetupOidcAuthParentListener,
	forwardOidcLoginFlowToWindow: mockForwardOidcLoginFlowToWindow,
} ) );

const mockGetReferrerRedirect = jest.fn();
const mockClearReferrerRedirect = jest.fn();

jest.mock( './referrer-redirect', () => ( {
	getReferrerRedirect: mockGetReferrerRedirect,
	clearReferrerRedirect: mockClearReferrerRedirect,
} ) );

jest.mock( './config', () => ( {
	appState: {
		iframeUrlObject: { origin: 'https://angie.test.com' },
		iframe: document.createElement( 'iframe' ),
	},
} ) );

jest.mock( './logger', () => ( {
	createChildLogger: () => ( {
		log: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
	} ),
} ) );

import { listenToOAuthFromIframe, setupOidcLoginFlowHandler } from './oauth';

describe( 'oauth', () => {
	beforeEach( () => {
		jest.clearAllMocks();
		mockGetReferrerRedirect.mockReturnValue( null );

		Object.defineProperty( window, 'toggleAngieSidebar', {
			value: jest.fn(),
			writable: true,
			configurable: true,
		} );
	} );

	afterEach( () => {
		jest.restoreAllMocks();
	} );

	function getOidcParentCallback(): () => void {
		listenToOAuthFromIframe();
		return ( mockSetupOidcAuthParentListener.mock.calls[ 0 ][ 0 ] as any ).onOAuthParamsCleared;
	}

	function getOidcLoginFlowCallback(): () => void {
		setupOidcLoginFlowHandler();
		const lastIdx = mockForwardOidcLoginFlowToWindow.mock.calls.length - 1;
		return ( mockForwardOidcLoginFlowToWindow.mock.calls[ lastIdx ][ 0 ] as any ).onSuccess;
	}

	describe( 'listenToOAuthFromIframe', () => {
		it( 'should setup OIDC auth parent listener', () => {
			// Act
			listenToOAuthFromIframe();

			// Assert
			expect( mockSetupOidcAuthParentListener ).toHaveBeenCalledWith( {
				trustedOrigin: 'https://angie.test.com',
				onOAuthParamsCleared: expect.any( Function ),
			} );
		} );

		it( 'should open sidebar when auth completes and no referrer redirect', () => {
			// Arrange
			jest.useFakeTimers();
			const callback = getOidcParentCallback();

			// Act
			callback();
			jest.advanceTimersByTime( 500 );

			// Assert
			expect( window.toggleAngieSidebar ).toHaveBeenCalledWith( true );

			jest.useRealTimers();
		} );

		it( 'should redirect with prompt when referrer redirect with prompt exists', () => {
			// Arrange
			const returnUrl = 'http://localhost/wp-admin/post.php?post=123';
			const prompt = 'Help me create a contact page';
			mockGetReferrerRedirect.mockReturnValue( { url: returnUrl, prompt } );
			const callback = getOidcParentCallback();

			// Act
			callback();

			// Assert
			expect( mockClearReferrerRedirect ).toHaveBeenCalled();
			expect( window.toggleAngieSidebar ).not.toHaveBeenCalled();
		} );

		it( 'should redirect without prompt hash when referrer redirect exists without prompt', () => {
			// Arrange
			const returnUrl = 'http://localhost/wp-admin/post.php?post=123';
			mockGetReferrerRedirect.mockReturnValue( { url: returnUrl } );
			const callback = getOidcParentCallback();

			// Act
			callback();

			// Assert
			expect( mockClearReferrerRedirect ).toHaveBeenCalled();
			expect( window.toggleAngieSidebar ).not.toHaveBeenCalled();
		} );
	} );

	describe( 'setupOidcLoginFlowHandler', () => {
		it( 'should forward OIDC login flow with redirect callback', () => {
			// Act
			setupOidcLoginFlowHandler();

			// Assert
			expect( mockForwardOidcLoginFlowToWindow ).toHaveBeenCalledWith( {
				targets: expect.any( Object ),
				onSuccess: expect.any( Function ),
			} );
		} );

		it( 'should redirect when OIDC login succeeds and referrer redirect exists', () => {
			// Arrange
			const returnUrl = 'http://localhost/wp-admin/post.php?post=456';
			const prompt = 'Help me optimize SEO';
			mockGetReferrerRedirect.mockReturnValue( { url: returnUrl, prompt } );
			const callback = getOidcLoginFlowCallback();

			// Act
			callback();

			// Assert
			expect( mockClearReferrerRedirect ).toHaveBeenCalled();
		} );
	} );
} );
