import {
	mintEmbedSession,
	ensureEmbedToken,
	clearEmbedTokenCache,
	getEmbedApiBaseUrl,
	MINT_SKEW_SECONDS,
} from './embed-token';

describe( 'embed-token', () => {
	const mockAppId = 'NG-test-app-123';
	const mockIframeOrigin = 'https://angie.elementor.com';
	const mockEmbedToken = 'mock-embed-token-jwt';
	const nowSeconds = Math.floor( Date.now() / 1000 );
	const mockExp = nowSeconds + 300;

	beforeEach( () => {
		clearEmbedTokenCache();
		jest.clearAllMocks();
		global.fetch = jest.fn();
	} );

	afterEach( () => {
		jest.restoreAllMocks();
	} );

	describe( 'getEmbedApiBaseUrl', () => {
		it( 'should return the iframe origin as the base URL', () => {
			expect( getEmbedApiBaseUrl( mockIframeOrigin ) ).toBe( mockIframeOrigin );
		} );
	} );

	describe( 'mintEmbedSession', () => {
		it( 'should successfully mint an embed session', async () => {
			( global.fetch as jest.Mock ).mockResolvedValue( {
				ok: true,
				json: async () => ( {
					embedToken: mockEmbedToken,
					exp: mockExp,
				} ),
			} );

			const result = await mintEmbedSession( mockAppId, mockIframeOrigin );

			expect( result ).toEqual( {
				embedToken: mockEmbedToken,
				exp: mockExp,
			} );

			expect( global.fetch ).toHaveBeenCalledWith(
				`${ mockIframeOrigin }/angie/embed/session`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify( { appId: mockAppId } ),
					credentials: 'include',
				}
			);
		} );

		it( 'should throw an error when the response is not ok', async () => {
			( global.fetch as jest.Mock ).mockResolvedValue( {
				ok: false,
				status: 403,
				text: async () => 'Forbidden',
			} );

			await expect( mintEmbedSession( mockAppId, mockIframeOrigin ) )
				.rejects.toThrow( 'Embed session mint failed with status 403: Forbidden' );
		} );

		it( 'should throw an error when the response is missing embedToken', async () => {
			( global.fetch as jest.Mock ).mockResolvedValue( {
				ok: true,
				json: async () => ( {
					exp: mockExp,
				} ),
			} );

			await expect( mintEmbedSession( mockAppId, mockIframeOrigin ) )
				.rejects.toThrow( 'Invalid embed session response: missing embedToken or exp' );
		} );

		it( 'should throw an error when the response is missing exp', async () => {
			( global.fetch as jest.Mock ).mockResolvedValue( {
				ok: true,
				json: async () => ( {
					embedToken: mockEmbedToken,
				} ),
			} );

			await expect( mintEmbedSession( mockAppId, mockIframeOrigin ) )
				.rejects.toThrow( 'Invalid embed session response: missing embedToken or exp' );
		} );

		it( 'should handle fetch network errors', async () => {
			( global.fetch as jest.Mock ).mockRejectedValue( new Error( 'Network error' ) );

			await expect( mintEmbedSession( mockAppId, mockIframeOrigin ) )
				.rejects.toThrow( 'Embed session mint error: Network error' );
		} );
	} );

	describe( 'ensureEmbedToken', () => {
		it( 'should mint a new token when cache is empty', async () => {
			( global.fetch as jest.Mock ).mockResolvedValue( {
				ok: true,
				json: async () => ( {
					embedToken: mockEmbedToken,
					exp: mockExp,
				} ),
			} );

			const result = await ensureEmbedToken( mockAppId, mockIframeOrigin );

			expect( result ).toEqual( {
				embedToken: mockEmbedToken,
				exp: mockExp,
			} );

			expect( global.fetch ).toHaveBeenCalledTimes( 1 );
		} );

		it( 'should return cached token when it is still valid', async () => {
			( global.fetch as jest.Mock ).mockResolvedValue( {
				ok: true,
				json: async () => ( {
					embedToken: mockEmbedToken,
					exp: mockExp,
				} ),
			} );

			const firstResult = await ensureEmbedToken( mockAppId, mockIframeOrigin );
			const secondResult = await ensureEmbedToken( mockAppId, mockIframeOrigin );

			expect( firstResult ).toEqual( secondResult );
			expect( global.fetch ).toHaveBeenCalledTimes( 1 );
		} );

		it( 'should remint when cached token is expired', async () => {
			const expiredExp = nowSeconds - 100;
			const newExp = nowSeconds + 300;

			let callCount = 0;
			( global.fetch as jest.Mock ).mockImplementation( async () => {
				callCount++;
				return {
					ok: true,
					json: async () => ( {
						embedToken: callCount === 1 ? 'old-token' : 'new-token',
						exp: callCount === 1 ? expiredExp : newExp,
					} ),
				};
			} );

			const firstResult = await ensureEmbedToken( mockAppId, mockIframeOrigin );
			expect( firstResult.embedToken ).toBe( 'old-token' );

			const secondResult = await ensureEmbedToken( mockAppId, mockIframeOrigin );
			expect( secondResult.embedToken ).toBe( 'new-token' );

			expect( global.fetch ).toHaveBeenCalledTimes( 2 );
		} );

		it( 'should remint when cached token is within skew window', async () => {
			const nearExpiryExp = nowSeconds + MINT_SKEW_SECONDS - 10;
			const newExp = nowSeconds + 300;

			let callCount = 0;
			( global.fetch as jest.Mock ).mockImplementation( async () => {
				callCount++;
				return {
					ok: true,
					json: async () => ( {
						embedToken: callCount === 1 ? 'near-expiry-token' : 'fresh-token',
						exp: callCount === 1 ? nearExpiryExp : newExp,
					} ),
				};
			} );

			const firstResult = await ensureEmbedToken( mockAppId, mockIframeOrigin );
			expect( firstResult.embedToken ).toBe( 'near-expiry-token' );

			const secondResult = await ensureEmbedToken( mockAppId, mockIframeOrigin );
			expect( secondResult.embedToken ).toBe( 'fresh-token' );

			expect( global.fetch ).toHaveBeenCalledTimes( 2 );
		} );

		it( 'should coalesce concurrent mint requests', async () => {
			( global.fetch as jest.Mock ).mockImplementation( async () => {
				await new Promise( ( resolve ) => setTimeout( resolve, 50 ) );
				return {
					ok: true,
					json: async () => ( {
						embedToken: mockEmbedToken,
						exp: mockExp,
					} ),
				};
			} );

			const [ result1, result2, result3 ] = await Promise.all( [
				ensureEmbedToken( mockAppId, mockIframeOrigin ),
				ensureEmbedToken( mockAppId, mockIframeOrigin ),
				ensureEmbedToken( mockAppId, mockIframeOrigin ),
			] );

			expect( result1 ).toEqual( result2 );
			expect( result2 ).toEqual( result3 );
			expect( global.fetch ).toHaveBeenCalledTimes( 1 );
		} );

		it( 'should clear in-flight promise on error', async () => {
			( global.fetch as jest.Mock )
				.mockRejectedValueOnce( new Error( 'Network error' ) )
				.mockResolvedValueOnce( {
					ok: true,
					json: async () => ( {
						embedToken: mockEmbedToken,
						exp: mockExp,
					} ),
				} );

			await expect( ensureEmbedToken( mockAppId, mockIframeOrigin ) )
				.rejects.toThrow( 'Network error' );

			const result = await ensureEmbedToken( mockAppId, mockIframeOrigin );
			expect( result.embedToken ).toBe( mockEmbedToken );
			expect( global.fetch ).toHaveBeenCalledTimes( 2 );
		} );
	} );

	describe( 'clearEmbedTokenCache', () => {
		beforeEach( async () => {
			( global.fetch as jest.Mock ).mockResolvedValue( {
				ok: true,
				json: async () => ( {
					embedToken: mockEmbedToken,
					exp: mockExp,
				} ),
			} );

			await ensureEmbedToken( mockAppId, mockIframeOrigin );
			await ensureEmbedToken( 'NG-another-app', mockIframeOrigin );
		} );

		it( 'should clear cache for a specific appId', async () => {
			clearEmbedTokenCache( mockAppId );

			( global.fetch as jest.Mock ).mockClear();
			( global.fetch as jest.Mock ).mockResolvedValue( {
				ok: true,
				json: async () => ( {
					embedToken: 'new-token',
					exp: mockExp,
				} ),
			} );

			await ensureEmbedToken( mockAppId, mockIframeOrigin );
			expect( global.fetch ).toHaveBeenCalledTimes( 1 );

			await ensureEmbedToken( 'NG-another-app', mockIframeOrigin );
			expect( global.fetch ).toHaveBeenCalledTimes( 1 );
		} );

		it( 'should clear all caches when no appId is provided', async () => {
			clearEmbedTokenCache();

			( global.fetch as jest.Mock ).mockClear();
			( global.fetch as jest.Mock ).mockResolvedValue( {
				ok: true,
				json: async () => ( {
					embedToken: 'new-token',
					exp: mockExp,
				} ),
			} );

			await ensureEmbedToken( mockAppId, mockIframeOrigin );
			expect( global.fetch ).toHaveBeenCalledTimes( 1 );

			await ensureEmbedToken( 'NG-another-app', mockIframeOrigin );
			expect( global.fetch ).toHaveBeenCalledTimes( 2 );
		} );
	} );
} );
