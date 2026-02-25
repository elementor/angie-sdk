import {
	forwardOidcLoginFlowToWindow,
	setupOidcAuthParentListener,
	type OidcAuthAppWindow,
} from "@elementor/oidc-auth";
import { appState } from "./config";
import { createChildLogger } from "./logger";

declare global {
	interface Window {
		toggleAngieSidebar: ( force?: boolean, skipTransition?: boolean ) => void;
	}
}

const logger = createChildLogger( 'oauth' );

function openSidebarAfterAuthentication(): void {
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
		onOAuthParamsCleared: openSidebarAfterAuthentication,
	} );
};

export const setupOidcLoginFlowHandler = (): void => {
	const targets: OidcAuthAppWindow = { window: appState.iframe, windowURL: appState.iframeUrlObject };

	window.addEventListener( 'load', () => {
		logger.log( 'OIDC: Window load event fired, forwarding OIDC state if present' );
		forwardOidcLoginFlowToWindow( { targets, onSuccess: openSidebarAfterAuthentication } );
	} );

	forwardOidcLoginFlowToWindow( { targets, onSuccess: openSidebarAfterAuthentication } );
};
