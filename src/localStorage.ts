import { appState, type AppState } from "./config";
import { HostLocalStorageEventType } from "./types";
import { isTrustedIframeMessage } from "./utils";

const localStorageInstances: AppState[] = [];
let localStorageListener: ( ( event: MessageEvent ) => void ) | null = null;

const resolveLocalStorageInstance = ( event: MessageEvent ): AppState | null =>
	localStorageInstances.find( ( instance ) => isTrustedIframeMessage(
		event,
		instance.iframeUrlObject?.origin,
		instance.iframe,
	) ) ?? null;

export const addLocalStorageListener = ( instance: AppState = appState ): void => {
	if ( ! localStorageInstances.includes( instance ) ) {
		localStorageInstances.push( instance );
	}

	if ( localStorageListener ) {
		return;
	}

	localStorageListener = ( event: MessageEvent ) => {
		const target = resolveLocalStorageInstance( event );

		if ( ! target ) {
			return;
		}

		switch ( event.data.type ) {
			case HostLocalStorageEventType.SET: {
				window.localStorage.setItem( event.data.key, event.data.value );
				break;
			}
			case HostLocalStorageEventType.GET: {
				const port = event.ports[ 0 ];
				const value = window.localStorage.getItem( event.data.key );
				port.postMessage( {
					value,
				} );
				break;
			}
		}
	};

	window.addEventListener( 'message', localStorageListener );
};

export const resetLocalStorageListenersForTests = (): void => {
	if ( localStorageListener ) {
		window.removeEventListener( 'message', localStorageListener );
		localStorageListener = null;
	}

	localStorageInstances.length = 0;
};
