import { appState } from '../config';
import { openIframe } from '../iframe';
import { toggleAngieSidebar as setIframeAccessibility } from '../utils';
import type { HostEmbeddedConfigPayload, ResolvedConfigV2 } from './config';

type OpenEmbeddedIframeArgs = {
	iframe: ResolvedConfigV2['iframe'];
	hostReadyEmbedded?: HostEmbeddedConfigPayload;
};

export const openEmbeddedIframe = async ( args: OpenEmbeddedIframeArgs ): Promise<void> => {
	await openIframe( {
		isRTL: args.iframe.isRTL,
		origin: args.iframe.origin,
		path: args.iframe.path,
		uiTheme: args.iframe.uiTheme,
		hostReadyEmbedded: args.hostReadyEmbedded,
	} );

	if ( appState.iframe ) {
		setIframeAccessibility( appState.iframe, false );
	}
};
