import { createChildLogger } from './logger';
import { getAngieIframe, postMessageToAngieIframe } from './angie-iframe-utils';

const navigationLogger = createChildLogger( 'navigation' );

export const navigateAngieIframe = (
	path: string,
	payload: { isStudioOpen: boolean; isOpen: boolean; source: string; isInnerPage?: boolean },
): boolean => {
	const angieIframe = getAngieIframe();

	if ( angieIframe ) {
		if ( payload.isOpen && window.toggleAngieSidebar ) {
			window.toggleAngieSidebar( true );
		}

		const success = postMessageToAngieIframe( {
			type: 'angie-route-navigation',
			path,
			payload,
		} );

		if ( ! success ) {
			navigationLogger.error( 'Failed to post navigation message to Angie iframe' );
		}

		return success;
	}

	navigationLogger.error( 'Angie iframe not found' );
	return false;
};
