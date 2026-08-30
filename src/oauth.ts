import {
	forwardOidcLoginFlowToWindow,
	setupOidcAuthParentListener,
	type OidcAuthAppWindow,
} from "@elementor/oidc-auth";
import { appState, type AppState } from "./config";
import { createChildLogger } from "./logger";
import { buildRedirectUrl, clearReferrerRedirect, executeReferrerRedirect, getReferrerRedirect } from "./referrer-redirect";

declare global {
	interface Window {
		toggleAngieSidebar: ( force?: boolean, skipTransition?: boolean ) => void;
	}
}

const logger = createChildLogger( 'oauth' );

const ANGIE_APP_PAGE_SLUG = 'angie-app';

const oauthInstances: AppState[] = [];
let oidcParentListenerRegistered = false;
let oidcLoadHandlerRegistered = false;

export const shouldExecutePostConsentRedirect = ( pageUrl?: string ): boolean => {
	try {
		const params = new URL(
			pageUrl ?? window.location.href,
			window.location.origin,
		).searchParams;

		return params.has( 'start-oauth' ) && params.get( 'page' ) === ANGIE_APP_PAGE_SLUG;
	} catch {
		return false;
	}
};

export const handlePostConsentRedirect = (): void => {
	if ( ! shouldExecutePostConsentRedirect() ) {
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

const getOidcTargets = (): OidcAuthAppWindow[] =>
	oauthInstances.flatMap( ( instance ) => {
		if ( ! instance.iframe || ! instance.iframeUrlObject ) {
			return [];
		}

		return [ {
			window: instance.iframe,
			windowURL: instance.iframeUrlObject,
		} ];
	} );

const forwardOidcLoginFlowToInstances = (): void => {
	for ( const targets of getOidcTargets() ) {
		forwardOidcLoginFlowToWindow( { targets, onSuccess: onAuthenticationComplete } );
	}
};

export const listenToOAuthFromIframe = ( instance: AppState = appState ): void => {
	if ( ! oauthInstances.includes( instance ) ) {
		oauthInstances.push( instance );
	}

	if ( oidcParentListenerRegistered ) {
		return;
	}

	oidcParentListenerRegistered = true;

	setupOidcAuthParentListener( {
		trustedOrigin: instance.iframeUrlObject?.origin ?? '',
		onOAuthParamsCleared: onAuthenticationComplete,
	} );
};

export const setupOidcLoginFlowHandler = ( instance: AppState = appState ): void => {
	if ( ! oauthInstances.includes( instance ) ) {
		oauthInstances.push( instance );
	}

	forwardOidcLoginFlowToInstances();

	if ( oidcLoadHandlerRegistered ) {
		return;
	}

	oidcLoadHandlerRegistered = true;

	window.addEventListener( 'load', () => {
		logger.log( 'OIDC: Window load event fired, forwarding OIDC state if present' );
		forwardOidcLoginFlowToInstances();
	} );
};

export const resetOAuthListenersForTests = (): void => {
	oauthInstances.length = 0;
	oidcParentListenerRegistered = false;
	oidcLoadHandlerRegistered = false;
};
