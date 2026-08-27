import { postMessageToInstance } from '../angie-iframe-utils';
import { appState, type AppState } from '../config';
import type { HostEmbeddedConfigPayload, ResolvedConfigV2 } from './config';
import { EMBEDDED_CONFIG_MESSAGE_TYPE } from './defaults';

export const sendEmbeddedConfig = (
	payload: HostEmbeddedConfigPayload,
	instance: AppState = appState
): void => {
	postMessageToInstance( instance, {
		payload,
		type: EMBEDDED_CONFIG_MESSAGE_TYPE,
	} );
};

export const sendWidgetConfig = (
	widgetConfig: NonNullable<ResolvedConfigV2['widgetConfig']>,
	instance: AppState = appState
): void => {
	postMessageToInstance( instance, {
		payload: widgetConfig,
		type: 'sdk-widget-config',
	} );
};
