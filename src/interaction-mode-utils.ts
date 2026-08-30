import { createChildLogger } from './logger';
import { getAngieIframe, postMessageToAngieIframe } from './angie-iframe-utils';
import { AngieInteractionMode, MessageEventType } from './types';

const interactionModeLogger = createChildLogger( 'interaction-mode' );

export const setAngieInteractionMode = ( mode: AngieInteractionMode ): boolean => {
	const angieIframe = getAngieIframe();

	if ( ! angieIframe ) {
		interactionModeLogger.error( 'Angie iframe not found' );
		return false;
	}

	const success = postMessageToAngieIframe( {
		type: MessageEventType.ANGIE_SET_INTERACTION_MODE,
		payload: { mode },
	} );

	if ( ! success ) {
		interactionModeLogger.error( 'Failed to post interaction mode message to Angie iframe' );
		return false;
	}

	return true;
};
