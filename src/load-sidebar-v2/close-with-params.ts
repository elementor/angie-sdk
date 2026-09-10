import { getFirstInstance, getInstanceById } from '../instance-registry';
import type { AppState } from '../config';
import type { CallbacksConfig } from './config';
import { createChildLogger } from '../logger';

const logger = createChildLogger( 'close-with-params' );

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
	} catch ( error ) {
		logger.error( 'onCloseWithParams callback threw:', error );
	} finally {
		window.toggleAngieSidebar?.( false );
	}
};

/**
 * Close Angie and invoke the onCloseWithParams callback.
 * Public API: host MCP tools call this directly.
 *
 * @param params - Parameters to pass to the onCloseWithParams callback
 * @param instanceId - Optional instance ID to target a specific Angie instance.
 *                     If omitted, targets the first registered instance.
 */
export const closeAngieWithParams = (
	params: Record<string, unknown> = {},
	instanceId?: string
): void => {
	const instance = instanceId ? getInstanceById( instanceId ) : getFirstInstance();

	if ( ! instance ) {
		logger.warn(
			instanceId
				? `Cannot close: instance "${ instanceId }" not found`
				: 'Cannot close: no instance registered'
		);
		return;
	}

	closeAngieWithParamsForInstance( instance, params );
};

export const resetCloseWithParamsForTests = (): void => {
	callbacksMap.clear();
};
