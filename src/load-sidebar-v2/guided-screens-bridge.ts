import { addHostMessageHandler } from './host-message-router';
import type { CallbacksConfig, GuidedWidgetSelection } from './config';

export const GUIDED_WELCOME_CONFIRM_MESSAGE_TYPE = 'angie/guided-screens/welcome-confirm';

export const GUIDED_WIDGET_SELECT_MESSAGE_TYPE = 'angie/guided-screens/widget-select';

type GuidedScreensCallbacks = Pick<
	CallbacksConfig,
	'onGuidedWelcomeConfirm' | 'onGuidedWidgetSelect'
>;

type InitGuidedScreensBridgeArgs = {
	iframeOrigin: string;
	callbacks: GuidedScreensCallbacks;
};

let removeHandler: ( () => void ) | null = null;

export const initGuidedScreensBridge = ( args: InitGuidedScreensBridgeArgs ): void => {
	const { onGuidedWelcomeConfirm, onGuidedWidgetSelect } = args.callbacks;

	if ( ! onGuidedWelcomeConfirm && ! onGuidedWidgetSelect ) {
		return;
	}

	removeHandler?.();
	removeHandler = addHostMessageHandler( ( event: MessageEvent ) => {
		if ( event.origin !== args.iframeOrigin ) {
			return;
		}

		const { type, payload } = event.data || {};

		switch ( type ) {
			case GUIDED_WELCOME_CONFIRM_MESSAGE_TYPE:
				onGuidedWelcomeConfirm?.();
				break;

			case GUIDED_WIDGET_SELECT_MESSAGE_TYPE:
				onGuidedWidgetSelect?.( payload as GuidedWidgetSelection );
				break;
		}
	} );
};

export const resetGuidedScreensBridgeForTests = (): void => {
	removeHandler?.();
	removeHandler = null;
};
