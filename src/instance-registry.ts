import {
	appState,
	createDefaultAppState,
	DEFAULT_IFRAME_ELEMENT_ID,
	type AppState,
} from './config';
import { LAYOUT_SIDEBAR, type LoadSidebarV2Layout } from './load-sidebar-v2/config';

export type CreateAngieInstanceArgs = Pick<AppState, 'containerId' | 'instanceId'> & {
	layout: LoadSidebarV2Layout;
};

const instances: AppState[] = [];

export const createAngieInstance = ( args: CreateAngieInstanceArgs ): AppState => {
	// Instance #1 is the shared `appState` object itself, so every existing reader of
	// `appState` follows it and single-instance behaviour is unchanged. It keeps the
	// legacy iframe id too, so host CSS targeting `#angie-iframe` still matches.
	const reuseSharedAppState = instances.length === 0;

	const state: AppState = {
		...createDefaultAppState(),
		...args,
		iframeElementId: reuseSharedAppState
			? DEFAULT_IFRAME_ELEMENT_ID
			: `${ DEFAULT_IFRAME_ELEMENT_ID }-${ args.instanceId }`,
	};

	const instance = reuseSharedAppState ? Object.assign( appState, state ) : state;

	instances.push( instance );

	return instance;
};

export const getFirstInstance = (): AppState | null => instances[ 0 ] ?? null;

export const getInstanceCount = (): number => instances.length;

const getFirstIframeInstance = (): AppState | null => {
	const registered = instances.find( ( instance ) => instance.iframe !== null );

	if ( registered ) {
		return registered;
	}

	// V1 loadSidebar never calls createAngieInstance; legacy messages without
	// instanceId still route through the shared appState iframe.
	if ( instances.length === 0 && appState.iframe ) {
		return appState;
	}

	return null;
};

export const getInstanceById = ( instanceId: string ): AppState | null =>
	instances.find( ( instance ) => instance.instanceId === instanceId ) ?? null;

export const getInstanceByContainerId = ( containerId: string ): AppState | null =>
	instances.find( ( instance ) => instance.containerId === containerId ) ?? null;

export const hasSidebarLayoutInstance = (): boolean =>
	instances.some( ( instance ) => instance.layout === LAYOUT_SIDEBAR );

/**
 * Decides whether `instance` should act on a host-to-host message.
 */
export const shouldInstanceHandle = ( instance: AppState, instanceId?: string ): boolean => {
	if ( instanceId && instanceId === instance.instanceId ) {
		return true;
	}

	// Known sibling: it answers for itself, even while its iframe is still booting.
	if ( instanceId && getInstanceById( instanceId ) ) {
		return false;
	}

	// Missing id (old SDK) or unknown id (editor bundle): one iframe owner answers.
	return getFirstIframeInstance() === instance;
};

export const resetInstancesForTests = (): void => {
	instances.length = 0;
	Object.assign( appState, createDefaultAppState() );
};
