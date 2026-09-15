import { getFirstInstance, getInstanceById } from '../instance-registry';
import type { AppState } from '../config';
import type { CallbacksConfig } from './config';
import { createChildLogger } from '../logger';

const logger = createChildLogger( 'close' );

/** Closes one instance's UI and reports `params` to its `onClose`. Owned by the layout shell. */
type InstanceCloser = ( params: Record<string, unknown> ) => void;

const closers = new Map<string, InstanceCloser>();

export const registerInstanceCloser = ( instanceId: string, closer: InstanceCloser ): void => {
	closers.set( instanceId, closer );
};

/** A throwing host callback must not abort the close it was called from. */
export const notifyClose = (
	onClose: CallbacksConfig['onClose'],
	params: Record<string, unknown>
): void => {
	try {
		onClose?.( params );
	} catch ( error ) {
		logger.error( 'onClose callback threw:', error );
	}
};

/**
 * Close Angie for a specific instance.
 * Internal: used by host bridge when it knows the source instance.
 */
export const closeAngieForInstance = (
	instance: AppState,
	params: Record<string, unknown> = {}
): void => {
	const closer = closers.get( instance.instanceId );

	if ( ! closer ) {
		logger.warn( 'Cannot close: instance has no layout shell', {
			instanceId: instance.instanceId,
		} );
		return;
	}

	closer( params );
};

/**
 * Close Angie and pass params to `callbacks.onClose`.
 * Public API: host MCP tools call this directly.
 *
 * @param params - Parameters to pass to onClose. Defaults to `{}`.
 * @param instanceId - Optional instance ID to target a specific Angie instance.
 *                     If omitted, targets the first registered instance.
 */
export const closeAngie = (
	params: Record<string, unknown> = {},
	instanceId?: string
): void => {
	const instance = instanceId ? getInstanceById( instanceId ) : getFirstInstance();

	if ( ! instance ) {
		logger.warn( 'Cannot close: no Angie instance found', { instanceId } );
		return;
	}

	closeAngieForInstance( instance, params );
};

export const resetCloseForTests = (): void => {
	closers.clear();
};
