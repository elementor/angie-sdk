import { getFirstInstance } from '../instance-registry';
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

export const closeAngieWithParams = ( params: Record<string, unknown> = {} ): void => {
	const instance = getFirstInstance();

	if ( ! instance ) {
		return;
	}

	const callback = callbacksMap.get( instance.instanceId );

	if ( callback ) {
		callback( params );
	}

	window.toggleAngieSidebar?.( false );
};

export const resetCloseWithParamsForTests = (): void => {
	callbacksMap.clear();
};
