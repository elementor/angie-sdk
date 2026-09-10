import { getFirstInstance } from '../instance-registry';
import type { AppState } from '../config';
import type { CallbacksConfig } from './config';

const callbacksMap = new Map<string, CallbacksConfig['onCloseWithParams']>();

export const registerCloseWithParamsCallback = (
	instanceId: string,
	callback: CallbacksConfig['onCloseWithParams']
): void => {
	if ( callback ) {
		callbacksMap.set( instanceId, callback );
	}
};

/**
 * Close Angie and invoke the onCloseWithParams callback for a specific instance.
 * Internal: used by host bridge when it knows the source instance.
 */
export const closeAngieWithParamsForInstance = (
	instance: AppState,
	params: Record<string, unknown> = {}
): void => {
	const callback = callbacksMap.get( instance.instanceId );

	try {
		if ( callback ) {
			callback( params );
		}
	} catch {
		// Suppress callback errors but still close
	} finally {
		window.toggleAngieSidebar?.( false );
	}
};

/**
 * Close Angie and invoke the onCloseWithParams callback.
 * Public API: host MCP tools call this directly.
 */
export const closeAngieWithParams = ( params: Record<string, unknown> = {} ): void => {
	const instance = getFirstInstance();

	if ( ! instance ) {
		return;
	}

	closeAngieWithParamsForInstance( instance, params );
};

export const resetCloseWithParamsForTests = (): void => {
	callbacksMap.clear();
};
