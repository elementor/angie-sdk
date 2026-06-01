type HostMessageHandler = ( event: MessageEvent ) => void;

const handlers = new Set<HostMessageHandler>();
let listenerRegistered = false;

const dispatchHostMessage = ( event: MessageEvent ): void => {
	for ( const handler of handlers ) {
		handler( event );
	}
};

const ensureHostMessageListener = (): void => {
	if ( listenerRegistered ) {
		return;
	}

	listenerRegistered = true;
	window.addEventListener( 'message', dispatchHostMessage );
};

export const addHostMessageHandler = ( handler: HostMessageHandler ): ( () => void ) => {
	handlers.add( handler );
	ensureHostMessageListener();

	return () => {
		handlers.delete( handler );
	};
};

export const resetHostMessageRouterForTests = (): void => {
	handlers.clear();
	listenerRegistered = false;
};
