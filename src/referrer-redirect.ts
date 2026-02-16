import { createChildLogger } from './logger';

const REFERRER_REDIRECT_KEY = 'angie_return_url';

const referrerLogger = createChildLogger( 'referrer-redirect' );

function isValidRedirectUrl( url: string ): boolean {
	try {
		const parsed = new URL( url, window.location.origin );
		return parsed.origin === window.location.origin && parsed.pathname.startsWith( '/wp-admin/' );
	} catch {
		return false;
	}
}

export function setReferrerRedirect( url: string ): boolean {
	if ( ! isValidRedirectUrl( url ) ) {
		referrerLogger.warn( 'Invalid redirect URL rejected:', url );
		return false;
	}

	try {
		localStorage.setItem( REFERRER_REDIRECT_KEY, url );
		return true;
	} catch ( e ) {
		referrerLogger.warn( 'localStorage not available' );
		return false;
	}
}

export function getReferrerRedirect(): string | null {
	try {
		const url = localStorage.getItem( REFERRER_REDIRECT_KEY );
		if ( url && isValidRedirectUrl( url ) ) {
			return url;
		}
		if ( url ) {
			referrerLogger.warn( 'Stored redirect URL is invalid, returning null:', url );
		}
		return null;
	} catch ( e ) {
		referrerLogger.warn( 'localStorage not available' );
		return null;
	}
}

export function clearReferrerRedirect(): void {
	try {
		localStorage.removeItem( REFERRER_REDIRECT_KEY );
	} catch ( e ) {
		referrerLogger.warn( 'localStorage not available' );
	}
}
