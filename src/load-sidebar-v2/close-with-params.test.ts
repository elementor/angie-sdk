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

	it( 'should close even when no callback is registered', () => {
		createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'test-instance',
			layout: 'sidebar',
		} );

		closeAngieWithParams( { test: 'value' } );

		expect( mockToggle ).toHaveBeenCalledWith( false );
	} );

	it( 'should default to empty object when params are omitted', () => {
		const instance = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'test-instance',
			layout: 'sidebar',
		} );

		const onCloseWithParams = jest.fn();
		registerCloseWithParamsCallback( instance.instanceId, onCloseWithParams );

		closeAngieWithParams();

		expect( onCloseWithParams ).toHaveBeenCalledWith( {} );
		expect( mockToggle ).toHaveBeenCalledWith( false );
	} );

	it( 'should do nothing when no instance is registered', () => {
		const onCloseWithParams = jest.fn();
		registerCloseWithParamsCallback( 'non-existent', onCloseWithParams );

		closeAngieWithParams( { test: 'value' } );

		expect( onCloseWithParams ).not.toHaveBeenCalled();
		expect( mockToggle ).not.toHaveBeenCalled();
	} );

	it( 'should target the first instance when multiple instances exist', () => {
		const first = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'first-instance',
			layout: 'sidebar',
		} );

		const second = createAngieInstance( {
			containerId: 'container-b',
			instanceId: 'second-instance',
			layout: 'floatingChat',
		} );

		const firstCallback = jest.fn();
		const secondCallback = jest.fn();
		registerCloseWithParamsCallback( first.instanceId, firstCallback );
		registerCloseWithParamsCallback( second.instanceId, secondCallback );

		closeAngieWithParams( { target: 'first' } );

		expect( firstCallback ).toHaveBeenCalledWith( { target: 'first' } );
		expect( secondCallback ).not.toHaveBeenCalled();
		expect( mockToggle ).toHaveBeenCalledWith( false );
	} );
} );
