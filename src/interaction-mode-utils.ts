import { createChildLogger } from './logger';
import { getAngieIframe, postMessageToAngieIframe } from './angie-iframe-utils';
import { AngieInteractionMode, MessageEventType } from './types';

const interactionModeLogger = createChildLogger( 'interaction-mode' );

export type SetAngieInteractionModeOptions = {
	isStudioOpen?: boolean;
	source?: string;
	prompt?: string;
};

export const setAngieInteractionMode = (
	mode: AngieInteractionMode,
	options: SetAngieInteractionModeOptions = {},
): boolean => {
	const { isStudioOpen = false, source, prompt } = options;
	const angieIframe = getAngieIframe();

	if ( ! angieIframe ) {
		interactionModeLogger.error( 'Angie iframe not found' );
		return false;
	}

	const success = postMessageToAngieIframe( {
		type: MessageEventType.ANGIE_SET_INTERACTION_MODE,
		payload: { mode, source, isStudioOpen },
	} );

	if ( ! success ) {
		interactionModeLogger.error( 'Failed to post interaction mode message to Angie iframe' );
		return false;
	}

	if ( prompt ) {
		window.location.hash = `angie-prompt=${ encodeURIComponent( prompt ) }`;
	}

	return true;
};
