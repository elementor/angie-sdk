import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { closeAngieWithParams, closeAngieWithParamsForInstance, registerCloseWithParamsCallback, resetCloseWithParamsForTests } from './close-with-params';
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

	it( 'should target the correct instance when instanceId is provided', () => {
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

		closeAngieWithParams( { target: 'second' }, 'second-instance' );

		expect( secondCallback ).toHaveBeenCalledWith( { target: 'second' } );
		expect( firstCallback ).not.toHaveBeenCalled();
		expect( mockToggle ).toHaveBeenCalledWith( false );
	} );

	it( 'should invoke the callback for the correct instance in multi-instance scenario', () => {
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

		closeAngieWithParamsForInstance( second, { target: 'second' } );

		expect( secondCallback ).toHaveBeenCalledWith( { target: 'second' } );
		expect( firstCallback ).not.toHaveBeenCalled();
		expect( mockToggle ).toHaveBeenCalledWith( false );
	} );

	it( 'should close even when callback throws', () => {
		const instance = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'test-instance',
			layout: 'sidebar',
		} );

		const onCloseWithParams = jest.fn( () => {
			throw new Error( 'Callback error' );
		} );
		registerCloseWithParamsCallback( instance.instanceId, onCloseWithParams );

		expect( () => {
			closeAngieWithParams( { test: 'value' } );
		} ).not.toThrow();

		expect( onCloseWithParams ).toHaveBeenCalledWith( { test: 'value' } );
		expect( mockToggle ).toHaveBeenCalledWith( false );
	} );
} );
