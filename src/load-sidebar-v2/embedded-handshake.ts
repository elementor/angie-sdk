import { postMessageToAngieIframe } from '../angie-iframe-utils';
import type { HostEmbeddedConfigPayload, ResolvedConfigV2 } from './config';
import { EMBEDDED_CONFIG_MESSAGE_TYPE } from './defaults';
export const sendEmbeddedConfig = ( payload: HostEmbeddedConfigPayload ): void => {
	postMessageToAngieIframe( {
		payload,
		type: EMBEDDED_CONFIG_MESSAGE_TYPE,
	} );
};

export const sendWidgetConfig = ( widgetConfig: NonNullable<ResolvedConfigV2['widgetConfig']> ): void => {
	postMessageToAngieIframe( {
		payload: widgetConfig,
		type: 'sdk-widget-config',
	} );
};
