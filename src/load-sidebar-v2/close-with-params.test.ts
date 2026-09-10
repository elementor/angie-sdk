import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { closeAngieWithParams, registerCloseWithParamsCallback, resetCloseWithParamsForTests } from './close-with-params';
import { createAngieInstance, resetInstancesForTests } from '../instance-registry';

describe( 'load-sidebar-v2/close-with-params', () => {
	let mockToggle: jest.MockedFunction<typeof window.toggleAngieSidebar>;

	beforeEach( () => {
		jest.clearAllMocks();
		resetCloseWithParamsForTests();
		resetInstancesForTests();

		mockToggle = jest.fn() as jest.MockedFunction<typeof window.toggleAngieSidebar>;
		window.toggleAngieSidebar = mockToggle;
	} );

	it( 'should invoke the callback with params and then close', () => {
		const instance = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'test-instance',
			layout: 'sidebar',
		} );

		const onCloseWithParams = jest.fn();
		registerCloseWithParamsCallback( instance.instanceId, onCloseWithParams );

		const params = { reason: 'user-finished', orderId: '123' };
		closeAngieWithParams( params );

		expect( onCloseWithParams ).toHaveBeenCalledWith( params );
		expect( mockToggle ).toHaveBeenCalledWith( false );
	} );
} );
