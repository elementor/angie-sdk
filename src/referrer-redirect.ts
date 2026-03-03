import { createChildLogger } from './logger';

const REFERRER_REDIRECT_KEY = 'angie_return_url';

const referrerLogger = createChildLogger( 'referrer-redirect' );

export type ReferrerRedirectData = {
	url: string;
	prompt?: string;
};

function isValidRedirectUrl( url: string ): boolean {
	try {
		const parsed = new URL( url, window.location.origin );
		return parsed.origin === window.location.origin;
	} catch {
		return false;
	}
}

export function setReferrerRedirect( url: string, prompt?: string ): boolean {
	if ( ! isValidRedirectUrl( url ) ) {
		referrerLogger.warn( 'Invalid redirect URL rejected:', url );
		return false;
	}

	try {
		const data: ReferrerRedirectData = { url };

		if ( prompt ) {
			data.prompt = prompt;
		}

		localStorage.setItem( REFERRER_REDIRECT_KEY, JSON.stringify( data ) );
		return true;
	} catch ( e ) {
		referrerLogger.warn( 'localStorage not available' );
		return false;
	}
}

export function getReferrerRedirect(): ReferrerRedirectData | null {
	try {
		const raw = localStorage.getItem( REFERRER_REDIRECT_KEY );
		if ( ! raw ) {
			return null;
		}

		let data: ReferrerRedirectData;
		try {
			data = JSON.parse( raw );
		} catch {
			referrerLogger.warn( 'Stored redirect data is not valid JSON, returning null' );
			return null;
		}

		if ( ! data.url || typeof data.url !== 'string' ) {
			referrerLogger.warn( 'Stored redirect data missing url field, returning null' );
			return null;
		}

		if ( ! isValidRedirectUrl( data.url ) ) {
			referrerLogger.warn( 'Stored redirect URL is invalid, returning null:', data.url );
			return null;
		}

		return data;
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

function buildRedirectUrl( url: string, prompt?: string ): string {
	if ( ! prompt ) {
		return url;
	}
	return `${ url }#angie-prompt=${ encodeURIComponent( prompt ) }`;
}

export function executeReferrerRedirect(): boolean {
	const redirectData = getReferrerRedirect();

	if ( ! redirectData ) {
		return false;
	}

	clearReferrerRedirect();
	window.location.href = buildRedirectUrl( redirectData.url, redirectData.prompt );
	return true;
}
