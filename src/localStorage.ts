import { appState, type AppState } from "./config";
import { HostLocalStorageEventType } from "./types";
import { isTrustedIframeMessage } from "./utils";

export const addLocalStorageListener = ( instance: AppState = appState ) => {
	window.addEventListener( 'message', ( event: MessageEvent ) => {
		if ( ! isTrustedIframeMessage( event, instance.iframeUrlObject?.origin, instance.iframe ) ) {
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
	} );
};
