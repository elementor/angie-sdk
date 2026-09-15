import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { closeAngieWithParams, closeAngieWithParamsForInstance, registerInstanceCloser, resetCloseWithParamsForTests } from './close-with-params';
import { createAngieInstance, resetInstancesForTests } from '../instance-registry';

describe( 'load-sidebar-v2/close-with-params', () => {
	beforeEach( () => {
		jest.clearAllMocks();
		resetCloseWithParamsForTests();
		resetInstancesForTests();
	} );

	it( 'should close the first instance with the given params', () => {
		const instance = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'test-instance',
			layout: 'sidebar',
		} );

		const closer = jest.fn();
		registerInstanceCloser( instance.instanceId, closer );

		const params = { reason: 'user-finished', orderId: '123' };
		closeAngieWithParams( params );

		expect( closer ).toHaveBeenCalledWith( params );
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

		const firstCloser = jest.fn();
		const secondCloser = jest.fn();
		registerInstanceCloser( first.instanceId, firstCloser );
		registerInstanceCloser( second.instanceId, secondCloser );

		closeAngieWithParams( { target: 'second' }, 'second-instance' );

		expect( secondCloser ).toHaveBeenCalledWith( { target: 'second' } );
		expect( firstCloser ).not.toHaveBeenCalled();
	} );

	it( 'should close the instance the bridge names', () => {
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

		const firstCloser = jest.fn();
		const secondCloser = jest.fn();
		registerInstanceCloser( first.instanceId, firstCloser );
		registerInstanceCloser( second.instanceId, secondCloser );

		closeAngieWithParamsForInstance( second, { target: 'second' } );

		expect( secondCloser ).toHaveBeenCalledWith( { target: 'second' } );
		expect( firstCloser ).not.toHaveBeenCalled();
	} );

	it( 'should default to empty params', () => {
		const instance = createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'test-instance',
			layout: 'sidebar',
		} );

		const closer = jest.fn();
		registerInstanceCloser( instance.instanceId, closer );

		closeAngieWithParams();

		expect( closer ).toHaveBeenCalledWith( {} );
	} );

	it( 'should not throw when the instance has no layout shell', () => {
		createAngieInstance( {
			containerId: 'container-a',
			instanceId: 'test-instance',
			layout: 'sidebar',
		} );

		expect( () => closeAngieWithParams( { test: 'value' } ) ).not.toThrow();
	} );
} );
