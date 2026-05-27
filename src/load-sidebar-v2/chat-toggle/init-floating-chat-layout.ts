import { initChatShell } from './chat-shell';
import {
	injectChatToggleButton,
	injectChatWidgetStyles,
	prepareChatWidgetContainer,
} from './widget-ui';

type InitFloatingChatLayoutArgs = {
	containerId: string;
	iframeOrigin: string;
	toggleButtonId: string;
	injectToggleButton: boolean;
	onClose?: () => void;
};

export const initFloatingChatLayout = ( args: InitFloatingChatLayoutArgs ): void => {
	injectChatWidgetStyles( args.containerId );
	prepareChatWidgetContainer( args.containerId );

	if ( args.injectToggleButton ) {
		injectChatToggleButton( args.toggleButtonId );
	}

	initChatShell( {
		containerId: args.containerId,
		iframeOrigin: args.iframeOrigin,
		onClose: args.onClose,
		toggleButtonId: args.toggleButtonId,
	} );
};
