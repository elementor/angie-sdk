import { sendErrorMessage, sendSuccessMessage } from '../utils';
import type { ExternalHeadersCallback } from './config';

export const GET_EXTERNAL_HEADERS_MESSAGE_TYPE = 'GET_EXTERNAL_HEADERS';

type InitHostApiBridgeArgs = {
	iframeOrigin: string;
	getExternalHeaders?: ExternalHeadersCallback;
};

let bridgeConfig: InitHostApiBridgeArgs | null = null;
let bridgeListenerRegistered = false;

const filterDefinedHeaders = (
	headers: Record<string, string | undefined>,
): Record<string, string> => Object.fromEntries(
	Object.entries( headers ).filter( ( [ , value ] ) => value !== undefined ),
) as Record<string, string>;

export const initHostApiBridge = ( args: InitHostApiBridgeArgs ): void => {
	bridgeConfig = args;

	if ( bridgeListenerRegistered ) {
		return;
	}

	bridgeListenerRegistered = true;

	window.addEventListener( 'message', async ( event: MessageEvent ) => {
		if ( ! bridgeConfig || event.origin !== bridgeConfig.iframeOrigin ) {
			return;
		}

		if ( event.data?.type !== GET_EXTERNAL_HEADERS_MESSAGE_TYPE ) {
			return;
		}

		const port = event.ports?.[ 0 ];
		if ( ! port ) {
			return;
		}

		try {
			const headers = bridgeConfig.getExternalHeaders
				? await bridgeConfig.getExternalHeaders()
				: {};
			sendSuccessMessage( port, filterDefinedHeaders( headers ) );
		} catch ( error ) {
			sendErrorMessage( port, {
				message: error instanceof Error ? error.message : String( error ),
			} );
		}
	} );
};

export const resetHostApiBridgeForTests = (): void => {
	bridgeConfig = null;
};
