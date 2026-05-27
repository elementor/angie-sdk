import { postMessageToAngieIframe } from '../angie-iframe-utils';
import {
	buildHostEmbeddedConfigPayload,
	type HostEmbeddedConfigPayload,
	type ResolvedConfigV2,
} from './config';
import { EMBEDDED_CONFIG_MESSAGE_TYPE } from './defaults';

export const buildEmbeddedPayload = (
	host: ResolvedConfigV2['host'],
): HostEmbeddedConfigPayload => buildHostEmbeddedConfigPayload( host );

export const sendEmbeddedConfig = ( payload: HostEmbeddedConfigPayload ): void => {
	postMessageToAngieIframe( {
		payload,
		type: EMBEDDED_CONFIG_MESSAGE_TYPE,
	} );
};
