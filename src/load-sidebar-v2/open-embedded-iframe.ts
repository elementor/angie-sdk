import { appState } from '../config';
import { openIframe } from '../iframe';
import { toggleAngieSidebar } from '../utils';
import type { HostEmbeddedConfigPayload, ResolvedConfigV2 } from './config';
import { setChatWidgetOpen } from './chat-toggle/chat-shell';

type OpenEmbeddedIframeArgs = {
	container: ResolvedConfigV2['container'];
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

	if (
		args.container.layout === 'floating-chat' &&
		args.container.chatToggleButton.enabled
	) {
		setChatWidgetOpen( {
			containerId: args.container.id,
			toggleButtonSelector: args.container.chatToggleButton.selector,
			isOpen: false,
		} );
		return;
	}

	if ( appState.iframe ) {
		toggleAngieSidebar( appState.iframe, false );
	}
};
