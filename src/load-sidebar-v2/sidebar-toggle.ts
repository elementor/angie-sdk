import {
	syncToggleButton,
	wireToggleButton,
} from './toggle-button';

type WireSidebarToggleButtonArgs = {
	toggleButtonSelector: string;
};

export const syncSidebarToggleButton = syncToggleButton;

export const wireSidebarToggleButton = ( args: WireSidebarToggleButtonArgs ): void => {
	wireToggleButton( {
		toggleButtonSelector: args.toggleButtonSelector,
		onClick: ( event ) => {
			event.preventDefault();
			window.toggleAngieSidebar?.();
		},
	} );
};
