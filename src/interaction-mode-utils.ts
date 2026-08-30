import { createChildLogger } from './logger';
import { getAngieIframe, postMessageToAngieIframe } from './angie-iframe-utils';
import { MessageEventType } from './types';

const interactionModeLogger = createChildLogger( 'interaction-mode' );

export type AngieInteractionMode = 'agent' | 'plan' | 'ask' | 'super-admin';

export type SetAngieInteractionModeOptions = {
	isOpen?: boolean;
	isStudioOpen?: boolean;
	source?: string;
	prompt?: string;
};

export const setAngieInteractionMode = (
	mode: AngieInteractionMode,
	options: SetAngieInteractionModeOptions = {},
): boolean => {
	const { isOpen = false, isStudioOpen = false, source, prompt } = options;
	const angieIframe = getAngieIframe();

	if ( ! angieIframe ) {
		interactionModeLogger.error( 'Angie iframe not found' );
		return false;
	}

	if ( isOpen && window.toggleAngieSidebar ) {
		window.toggleAngieSidebar( true );
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
