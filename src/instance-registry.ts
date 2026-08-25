import {
	appState,
	createDefaultAppState,
	DEFAULT_IFRAME_ELEMENT_ID,
	type AppState,
} from './config';
import { LAYOUT_SIDEBAR } from './load-sidebar-v2/config';

export type CreateAngieInstanceArgs = Pick<AppState, 'containerId' | 'instanceId' | 'layout'>;

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

const getFirstIframeInstance = (): AppState | null =>
	instances.find( ( instance ) => instance.iframe !== null ) ?? null;

export const getInstanceById = ( instanceId: string ): AppState | null =>
	instances.find( ( instance ) => instance.instanceId === instanceId ) ?? null;

export const getInstanceByContainerId = ( containerId: string ): AppState | null =>
	instances.find( ( instance ) => instance.containerId === containerId ) ?? null;

export const hasSidebarLayoutInstance = (): boolean =>
	instances.some( ( instance ) => instance.layout === LAYOUT_SIDEBAR );

/**
 * Decides whether `instance` should act on a host-to-host message.
 *
 * The Elementor editor loads its own SDK bundle. It registers MCP servers but never
 * opens an iframe, and relies on the Angie plugin's listener to pass its messages on.
 * So a message addressed elsewhere is only ignored when that instance owns an iframe of
 * its own. Otherwise the first iframe owner answers for it.
 */
export const shouldInstanceHandle = ( instance: AppState, instanceId?: string ): boolean => {
	if ( ! instanceId || instanceId === instance.instanceId ) {
		return true;
	}

	if ( getInstanceById( instanceId )?.iframe ) {
		return false;
	}

	return getFirstIframeInstance() === instance;
};

export const resetInstancesForTests = (): void => {
	instances.length = 0;
	Object.assign( appState, createDefaultAppState() );
};
