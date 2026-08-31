import type { AppState } from './config';
import { createChildLogger } from './logger';
import { getAngieIframe, postMessageToAngieIframe, postMessageToInstance } from './angie-iframe-utils';

const navigationLogger = createChildLogger( 'navigation' );

export const navigateAngieIframe = (
	path: string,
	payload: { isStudioOpen: boolean; isOpen: boolean; source: string; isInnerPage?: boolean },
	instance?: AppState,
): boolean => {
	const angieIframe = instance?.iframe ?? getAngieIframe();

	if ( angieIframe ) {
		if ( payload.isOpen && window.toggleAngieSidebar ) {
			window.toggleAngieSidebar( true );
		}

		const message = {
			type: 'angie-route-navigation',
			path,
			payload,
		};

		const success = instance
			? postMessageToInstance( instance, message )
			: postMessageToAngieIframe( message );

		if ( ! success ) {
			navigationLogger.error( 'Failed to post navigation message to Angie iframe' );
		}

		return success;
	}

	navigationLogger.error( 'Angie iframe not found' );
	return false;
};
