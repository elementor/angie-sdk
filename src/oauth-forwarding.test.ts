import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
	forwardOidcLoginFlowToWindow,
	OIDC_AUTH_MESSAGE_TYPES,
	OIDC_AUTH_URL_PARAMS,
} from '@elementor/oidc-auth';

describe( 'oidc-auth parent forwarding (integration)', () => {
	const iframeOrigin = 'https://angie.test.com';
	let postMessage: ReturnType<typeof jest.fn>;
	let replaceStateSpy: ReturnType<typeof jest.spyOn>;

	beforeEach( () => {
		postMessage = jest.fn();
		replaceStateSpy = jest.spyOn( history, 'replaceState' ).mockImplementation( () => {} );
	} );

	afterEach( () => {
		replaceStateSpy.mockRestore();
		jest.restoreAllMocks();
	} );

	function runForward( url: string ) {
		window.history.pushState( {}, '', url );

		forwardOidcLoginFlowToWindow( {
			targets: {
				window: { contentWindow: { postMessage } } as unknown as HTMLIFrameElement,
				windowURL: new URL( iframeOrigin ),
			},
		} );
	}

	it( 'forwards authorization code and client state from the URL hash', () => {
		runForward(
			`http://localhost/wp-admin/#${ OIDC_AUTH_URL_PARAMS.LOGIN_SUCCESS }=true&${ OIDC_AUTH_URL_PARAMS.CODE }=abc&${ OIDC_AUTH_URL_PARAMS.STATE }=xyz`,
		);

		expect( postMessage ).toHaveBeenCalledWith(
			{
				type: OIDC_AUTH_MESSAGE_TYPES.LOGIN_FLOW_COMPLETE,
				payload: { oauthCode: 'abc', oauthState: 'xyz' },
			},
			iframeOrigin,
		);
		expect( replaceStateSpy ).toHaveBeenCalled();
	} );

	it( 'forwards legacy token oauthState JSON from the query string', () => {
		const legacyState = JSON.stringify( {
			access_token: 'legacy-token',
			state: {
				data: {
					[ OIDC_AUTH_URL_PARAMS.TOP_ORIGIN ]: 'http://localhost',
				},
			},
		} );

		runForward(
			`http://localhost/wp-admin/?${ OIDC_AUTH_URL_PARAMS.LOGIN_SUCCESS }=true&${ OIDC_AUTH_URL_PARAMS.STATE }=${ encodeURIComponent( legacyState ) }`,
		);

		expect( postMessage ).toHaveBeenCalledWith(
			{
				type: OIDC_AUTH_MESSAGE_TYPES.LOGIN_FLOW_COMPLETE,
				payload: { oauthState: JSON.parse( legacyState ) },
			},
			iframeOrigin,
		);
	} );

	it( 'does not require tokens in the URL for the hash code handoff path', () => {
		const href = `http://localhost/#${ OIDC_AUTH_URL_PARAMS.LOGIN_SUCCESS }=true&${ OIDC_AUTH_URL_PARAMS.CODE }=only-code&${ OIDC_AUTH_URL_PARAMS.STATE }=only-state`;

		runForward( href );

		const payload = ( postMessage.mock.calls[ 0 ]?.[ 0 ] as { payload?: Record<string, string> } )?.payload;
		expect( payload?.oauthCode ).toBe( 'only-code' );
		expect( payload?.oauthState ).toBe( 'only-state' );
		expect( href.toLowerCase() ).not.toContain( 'access_token' );
		expect( href.toLowerCase() ).not.toContain( 'refresh_token' );
	} );
} );
