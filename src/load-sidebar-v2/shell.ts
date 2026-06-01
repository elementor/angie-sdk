import {
	ANGIE_SIDEBAR_STATE_CLOSED,
	ANGIE_SIDEBAR_STATE_OPEN,
	applyState,
	getAngieSidebarSavedState,
	initAngieSidebar,
	initializeResize,
	loadState,
} from '../sidebar';
import type { ContainerConfig, ResolvedConfigV2 } from './config';
import {
	syncToggleButton,
	wireToggleButton,
} from './toggle-button';
import { injectStyleThemeCss } from './inject-style-theme';

export const initSidebarShell = (
	container: ContainerConfig,
	callbacks: ResolvedConfigV2['callbacks'],
): void => {
	const toggleButtonSelector = container.chatToggleButton.enabled
		? container.chatToggleButton.selector
		: undefined;

	initAngieSidebar( {
		onToggle: ( isOpen ) => {
			if ( toggleButtonSelector ) {
				syncToggleButton( toggleButtonSelector, isOpen );
			}

			if ( ! isOpen && callbacks.onClose ) {
				callbacks.onClose();
			}
		},
	} );

	injectStyleThemeCss( container.styleTheme );

	if ( toggleButtonSelector ) {
		wireToggleButton( {
			toggleButtonSelector,
			onClick: ( event ) => {
				event.preventDefault();
				window.toggleAngieSidebar?.();
			},
		} );
	}
};

export const applyInitialSidebarShellState = (
	container: ContainerConfig,
): void => {
	if ( ! container.chatToggleButton.enabled ) {
		return;
	}

	if (
		container.persistOpenState &&
		getAngieSidebarSavedState() === ANGIE_SIDEBAR_STATE_OPEN
	) {
		return;
	}

	applyState( ANGIE_SIDEBAR_STATE_CLOSED );
};

export const finalizeSidebarShellState = (
	container: ContainerConfig,
): void => {
	if ( container.persistOpenState ) {
		loadState(
			container.chatToggleButton.enabled
				? ANGIE_SIDEBAR_STATE_CLOSED
				: ANGIE_SIDEBAR_STATE_OPEN,
		);
	}

	if ( container.resizable ) {
		initializeResize();
	}
};
