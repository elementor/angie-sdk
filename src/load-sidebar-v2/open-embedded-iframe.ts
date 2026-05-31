import { appState } from '../config';
import { openIframe } from '../iframe';
import { toggleAngieSidebar as setIframeAccessibility } from '../utils';
import type { ResolvedConfigV2 } from './config';

type OpenEmbeddedIframeArgs = {
	container: ResolvedConfigV2['container'];
	iframe: ResolvedConfigV2['iframe'];
};

export const openEmbeddedIframe = async ( args: OpenEmbeddedIframeArgs ): Promise<void> => {
	await openIframe( {
		isRTL: args.iframe.isRTL,
		origin: args.iframe.origin,
		path: args.iframe.path,
		uiTheme: args.iframe.uiTheme,
	} );

	if ( appState.iframe ) {
		setIframeAccessibility( appState.iframe, false );
	}
};
