import { sendErrorMessage, sendSuccessMessage } from '../utils';
import { HostLocalStorageEventType } from '../types';
import type { ExternalHeadersCallback, HostConfig } from './config';

export const GET_EXTERNAL_HEADERS_MESSAGE_TYPE = 'GET_EXTERNAL_HEADERS';

export const GET_WEBSITE_CONTEXT_MESSAGE_TYPE = 'angie/context/get-website-context';

export const GET_ANALYTICS_CONTEXT_MESSAGE_TYPE = 'angie/context/get-analytics-context';

type InitHostApiBridgeArgs = {
	iframeOrigin: string;
	host?: HostConfig;
	getExternalHeaders?: ExternalHeadersCallback;
};

let bridgeConfig: InitHostApiBridgeArgs | null = null;
let bridgeListenerRegistered = false;

const filterDefinedHeaders = (
	headers: Record<string, string | undefined>,
): Record<string, string> => Object.fromEntries(
	Object.entries( headers ).filter( ( [ , value ] ) => value !== undefined ),
) as Record<string, string>;

const getHostDateContext = (): { timezone: string; today: string } => {
	const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const today = new Date().toISOString().split( 'T' )[ 0 ];
	return { timezone, today };
};

export const buildWebsiteContextResponse = ( host?: HostConfig ) => ( {
	payload: {
		name: document.title,
		tagline: '',
		homeUrl: window.location.origin,
		siteLang: document.documentElement.lang,
		docTitle: document.title,
		platform: 'frontend',
		...getHostDateContext(),
		...host?.website,
	},
} );

export const buildAnalyticsContextResponse = ( host?: HostConfig ) => ( {
	payload: {
		screenPath: window.location.pathname,
		...host?.analytics,
	},
} );

const handleGetExternalHeaders = async (
	port: MessagePort,
	getExternalHeaders?: ExternalHeadersCallback,
): Promise<void> => {
	try {
		const headers = getExternalHeaders
			? await getExternalHeaders()
			: {};
		sendSuccessMessage( port, filterDefinedHeaders( headers ) );
	} catch ( error ) {
		sendErrorMessage( port, {
			message: error instanceof Error ? error.message : String( error ),
		} );
	}
};

const handleHostLocalStorageGet = ( port: MessagePort, key: string ): void => {
	try {
		const value = window.localStorage?.getItem( key ) ?? null;
		port.postMessage( { value } );
	} catch {
		port.postMessage( { value: null } );
	}
};

const handleHostLocalStorageSet = ( key: string, value: string ): void => {
	try {
		window.localStorage?.setItem( key, value );
	} catch {
		// localStorage unavailable (e.g. private browsing mode)
	}
};

const handleHostApiMessage = async ( event: MessageEvent ): Promise<void> => {
	if ( ! bridgeConfig || event.origin !== bridgeConfig.iframeOrigin ) {
		return;
	}

	const messageType = event.data?.type;
	const port = event.ports?.[ 0 ];

	switch ( messageType ) {
		case GET_EXTERNAL_HEADERS_MESSAGE_TYPE: {
			if ( ! port ) {
				return;
			}
			await handleGetExternalHeaders( port, bridgeConfig.getExternalHeaders );
			break;
		}

		case GET_WEBSITE_CONTEXT_MESSAGE_TYPE: {
			if ( ! port ) {
				return;
			}
			sendSuccessMessage( port, buildWebsiteContextResponse( bridgeConfig.host ) );
			break;
		}

		case GET_ANALYTICS_CONTEXT_MESSAGE_TYPE: {
			if ( ! port ) {
				return;
			}
			sendSuccessMessage( port, buildAnalyticsContextResponse( bridgeConfig.host ) );
			break;
		}

		case HostLocalStorageEventType.GET: {
			if ( ! port ) {
				return;
			}
			handleHostLocalStorageGet( port, event.data.key );
			break;
		}

		case HostLocalStorageEventType.SET: {
			handleHostLocalStorageSet( event.data.key, event.data.value );
			break;
		}
	}
};

export const initHostApiBridge = ( args: InitHostApiBridgeArgs ): void => {
	bridgeConfig = args;

	if ( bridgeListenerRegistered ) {
		return;
	}

	bridgeListenerRegistered = true;
	window.addEventListener( 'message', ( event: MessageEvent ) => {
		void handleHostApiMessage( event );
	} );
};

export const resetHostApiBridgeForTests = (): void => {
	bridgeConfig = null;
};
