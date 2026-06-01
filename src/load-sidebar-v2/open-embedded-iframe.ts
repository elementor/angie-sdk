import { appState } from '../config';
import { openIframe } from '../iframe';
import { toggleAngieSidebar } from '../utils';
import { LAYOUT_FLOATING_CHAT, type HostEmbeddedConfigPayload, type ResolvedConfigV2 } from './config';
import { setChatWidgetOpen } from './chat-toggle/chat-shell';
import { syncToggleButton } from './toggle-button';

type OpenEmbeddedIframeArgs = {
	container: ResolvedConfigV2['container'];
	iframe: ResolvedConfigV2['iframe'];
	embeddedConfig?: HostEmbeddedConfigPayload;
};

export const openEmbeddedIframe = async ( args: OpenEmbeddedIframeArgs ): Promise<void> => {
	await openIframe( {
		isRTL: args.iframe.isRTL,
		origin: args.iframe.origin,
		path: args.iframe.path,
		uiTheme: args.iframe.uiTheme,
		embeddedConfig: args.embeddedConfig,
	} );

	if (
		args.container.layout === LAYOUT_FLOATING_CHAT &&
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

	if ( args.container.chatToggleButton.enabled ) {
		syncToggleButton( args.container.chatToggleButton.selector, false );
	}
};
