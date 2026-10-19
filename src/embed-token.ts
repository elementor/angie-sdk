import type { EmbedTokenPayload } from './types';

export interface EmbedSessionMintRequest {
	appId: string;
}

export interface EmbedSessionMintResponse {
	embedToken: string;
	exp: number;
}

const MINT_SKEW_SECONDS = 60;

const tokenCache = new Map<string, EmbedTokenPayload>();
const mintPromises = new Map<string, Promise<EmbedTokenPayload>>();

export const getEmbedApiBaseUrl = ( iframeOrigin: string ): string => {
	return iframeOrigin;
};

const isTokenValid = ( payload: EmbedTokenPayload | undefined ): boolean => {
	if ( ! payload ) {
		return false;
	}
	const nowSeconds = Math.floor( Date.now() / 1000 );
	return payload.exp > nowSeconds + MINT_SKEW_SECONDS;
};

export const mintEmbedSession = async (
	appId: string,
	iframeOrigin: string,
): Promise<EmbedTokenPayload> => {
	const baseUrl = getEmbedApiBaseUrl( iframeOrigin );
	const endpoint = `${ baseUrl }/angie/embed/session`;

	const body: EmbedSessionMintRequest = { appId };

	try {
		const response = await fetch( endpoint, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify( body ),
			credentials: 'include',
		} );

		if ( ! response.ok ) {
			const errorText = await response.text().catch( () => 'Unknown error' );
			throw new Error( `Embed session mint failed with status ${ response.status }: ${ errorText }` );
		}

		const data: EmbedSessionMintResponse = await response.json();

		if ( ! data.embedToken || ! data.exp ) {
			throw new Error( 'Invalid embed session response: missing embedToken or exp' );
		}

		return {
			embedToken: data.embedToken,
			exp: data.exp,
		};
	} catch ( error ) {
		throw new Error( `Embed session mint error: ${ error instanceof Error ? error.message : String( error ) }` );
	}
};

export const ensureEmbedToken = async (
	appId: string,
	iframeOrigin: string,
): Promise<EmbedTokenPayload> => {
	const cached = tokenCache.get( appId );

	if ( cached && isTokenValid( cached ) ) {
		return cached;
	}

	const existingMint = mintPromises.get( appId );
	if ( existingMint ) {
		return existingMint;
	}

	const mintPromise = mintEmbedSession( appId, iframeOrigin )
		.then( ( payload ) => {
			tokenCache.set( appId, payload );
			mintPromises.delete( appId );
			return payload;
		} )
		.catch( ( error ) => {
			mintPromises.delete( appId );
			tokenCache.delete( appId );
			throw error;
		} );

	mintPromises.set( appId, mintPromise );
	return mintPromise;
};

export const clearEmbedTokenCache = ( appId?: string ): void => {
	if ( appId ) {
		tokenCache.delete( appId );
		mintPromises.delete( appId );
	} else {
		tokenCache.clear();
		mintPromises.clear();
	}
};

export { MINT_SKEW_SECONDS };
