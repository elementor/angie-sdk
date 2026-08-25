import type { AppState } from '../../config';
import { initChatShell } from './chat-shell';
import {
	injectChatToggleButton,
	injectChatWidgetStyles,
	prepareChatWidgetContainer,
} from './widget-ui';

type InitFloatingChatLayoutArgs = {
	containerId: string;
	iframeOrigin: string;
	toggleButtonSelector: string;
	injectToggleButton: boolean;
	onClose?: () => void;
	instance: AppState;
};

export const initFloatingChatLayout = ( args: InitFloatingChatLayoutArgs ): void => {
	injectChatWidgetStyles( args.containerId );
	prepareChatWidgetContainer( args.containerId );

	if ( args.injectToggleButton ) {
		injectChatToggleButton( args.toggleButtonSelector );
	}

	initChatShell( {
		containerId: args.containerId,
		iframeOrigin: args.iframeOrigin,
		onClose: args.onClose,
		toggleButtonSelector: args.toggleButtonSelector,
		instance: args.instance,
	} );
};
