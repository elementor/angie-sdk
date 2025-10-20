import { getAngieIframe, postMessageToAngieIframe } from './angie-iframe-utils';

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
			console.error( 'Failed to post navigation message to Angie iframe' );
		}

		return success;
	}

	console.error( 'Angie iframe not found' );
	return false;
};
