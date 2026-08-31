import { appState, type AppState } from '../config';
import { openIframe } from '../iframe';
import { toggleAngieSidebar } from '../utils';
import { LAYOUT_FLOATING_CHAT, type HostEmbeddedConfigPayload, type ResolvedConfigV2 } from './config';
import { setChatWidgetOpen } from './chat-toggle/chat-shell';
import { syncToggleButton } from './toggle-button';

type OpenEmbeddedIframeArgs = {
	container: ResolvedConfigV2['container'];
	iframe: ResolvedConfigV2['iframe'];
	embeddedConfig?: HostEmbeddedConfigPayload;
	instance?: AppState;
};

export const openEmbeddedIframe = async ( args: OpenEmbeddedIframeArgs ): Promise<boolean> => {
	const instance = args.instance ?? appState;

	const opened = await openIframe( {
		isRTL: args.iframe.isRTL,
		origin: args.iframe.origin,
		path: args.iframe.path,
		uiTheme: args.iframe.uiTheme,
		embeddedConfig: args.embeddedConfig,
	}, instance );

	// No iframe on mobile, so there is nothing to configure or toggle.
	if ( ! opened ) {
		return false;
	}

	if (
		args.container.layout === LAYOUT_FLOATING_CHAT &&
		args.container.chatToggleButton.enabled
	) {
		setChatWidgetOpen( {
			containerId: args.container.id,
			toggleButtonSelector: args.container.chatToggleButton.selector,
			isOpen: false,
			instance,
		} );
		return true;
	}

	if ( instance.iframe ) {
		toggleAngieSidebar( instance.iframe, false, instance.containerId );
	}

	if ( args.container.chatToggleButton.enabled ) {
		syncToggleButton( args.container.chatToggleButton.selector, false );
	}

	return true;
};
