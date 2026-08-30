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
 */
export const shouldInstanceHandle = ( instance: AppState, instanceId?: string ): boolean => {
	if ( instanceId && instanceId === instance.instanceId ) {
		return true;
	}

	// An unaddressed message cannot be attributed to an instance. Older SDK bundles
	// on the page still send these, so somebody has to answer -- but only one
	// instance may, or the server is created in every iframe.
	if ( ! instanceId ) {
		return getFirstIframeInstance() === instance;
	}

	// The addressed instance is on this page, so it answers for itself and nobody
	// else may answer for it. Its listener buffers the message until its iframe
	// exists, so a boot still in progress is not a reason to hand the message over.
	if ( getInstanceById( instanceId ) ) {
		return false;
	}

	// The id is unknown. The Elementor editor loads its own SDK bundle: it registers
	// MCP servers but never opens an iframe, and relies on the Angie plugin's
	// listener to pass its messages on. The first iframe owner answers for it.
	return getFirstIframeInstance() === instance;
};

export const resetInstancesForTests = (): void => {
	instances.length = 0;
	Object.assign( appState, createDefaultAppState() );
};
