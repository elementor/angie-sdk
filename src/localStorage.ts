import { appState } from "./config";
import { HostLocalStorageEventType } from "./types";

export const addLocalStorageListener = () => {
	window.addEventListener( 'message', ( event: MessageEvent ) => {
		if ( event.origin !== appState.iframeUrlObject?.origin ) {
			return;
		}

		switch ( event.data.type ) {
			case HostLocalStorageEventType.SET:
				window.localStorage.setItem( event.data.key, event.data.value );
				break;
			case HostLocalStorageEventType.GET:

				const port = event.ports[ 0 ];

				const value = window.localStorage.getItem( event.data.key );

				port.postMessage( {
					value,
				} );
				break;
		}
	} );
};
