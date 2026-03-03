import {
	forwardOidcLoginFlowToWindow,
	setupOidcAuthParentListener,
	type OidcAuthAppWindow,
} from "@elementor/oidc-auth";
import { appState } from "./config";
import { createChildLogger } from "./logger";
import { buildRedirectUrl, clearReferrerRedirect, executeReferrerRedirect, getReferrerRedirect } from "./referrer-redirect";

declare global {
	interface Window {
		toggleAngieSidebar: ( force?: boolean, skipTransition?: boolean ) => void;
	}
}

const logger = createChildLogger( 'oauth' );

const isPostConsentFlow = (): boolean => {
	const urlParams = new URLSearchParams( window.location.search );
	return urlParams.has( 'start-oauth' );
};

export const handlePostConsentRedirect = (): void => {
	if ( ! isPostConsentFlow() ) {
		return;
	}

	logger.log( 'Post-consent flow detected, checking for referrer redirect' );
	executeReferrerRedirect();
};

function onAuthenticationComplete(): void {
	const redirectData = getReferrerRedirect();

	if ( redirectData ) {
		clearReferrerRedirect();
		window.location.href = buildRedirectUrl( redirectData.url, redirectData.prompt );
		return;
	}

	try {
		localStorage.setItem( 'angie_sidebar_state', 'open' );
	} catch ( e ) {
		logger.warn( 'localStorage not available' );
	}
	setTimeout( () => {
		window.toggleAngieSidebar( true );
	}, 500 );
}

export const listenToOAuthFromIframe = (): void => {
	setupOidcAuthParentListener( {
		trustedOrigin: appState.iframeUrlObject?.origin ?? '',
		onOAuthParamsCleared: onAuthenticationComplete,
	} );
};

export const setupOidcLoginFlowHandler = (): void => {
	const targets: OidcAuthAppWindow = { window: appState.iframe, windowURL: appState.iframeUrlObject };

	window.addEventListener( 'load', () => {
		logger.log( 'OIDC: Window load event fired, forwarding OIDC state if present' );
		forwardOidcLoginFlowToWindow( { targets, onSuccess: onAuthenticationComplete } );
	} );

	forwardOidcLoginFlowToWindow( { targets, onSuccess: onAuthenticationComplete } );
};
