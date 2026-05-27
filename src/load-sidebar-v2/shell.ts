import { initAngieSidebar, initializeResize, loadState } from '../sidebar';
import type { ResolvedConfigV2 } from './config';

export const initSidebarShell = (
	container: ResolvedConfigV2['container'],
	callbacks: ResolvedConfigV2['callbacks'],
): void => {
	const skipDefaultCss = container.stylePreset === 'chat';

	initAngieSidebar( {
		onToggle: ( isOpen ) => {
			if ( ! isOpen && callbacks.onClose ) {
				callbacks.onClose();
			}
		},
		skipDefaultCss,
	} );

	if ( container.persistOpenState ) {
		loadState();
	}

	if ( container.resizable ) {
		initializeResize();
	}
};
