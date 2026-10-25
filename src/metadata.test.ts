import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { buildHostEmbeddedConfigPayload } from './load-sidebar-v2/config';
import { METADATA_LIMITS, sanitizeMetadata } from './metadata';

describe( 'metadata', () => {
	let warn: jest.SpiedFunction<typeof console.warn>;

	beforeEach( () => {
		warn = jest.spyOn( console, 'warn' ).mockImplementation( () => undefined );
	} );

	afterEach( () => {
		warn.mockRestore();
	} );

	it( 'should keep flat primitive values', () => {
		const metadata = { plan: 'pro', seats: 3, trial: false, variant: null };

		expect( sanitizeMetadata( metadata ) ).toEqual( metadata );
		expect( warn ).not.toHaveBeenCalled();
	} );

	it.each( [ undefined, null ] )( 'should return undefined without warning for %p', ( value ) => {
		expect( sanitizeMetadata( value ) ).toBeUndefined();
		expect( warn ).not.toHaveBeenCalled();
	} );

	it.each( [ 'text', 42, [ 'a' ], new Date() ] )( 'should ignore non plain objects (%p)', ( value ) => {
		expect( sanitizeMetadata( value ) ).toBeUndefined();
		expect( warn ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'should return undefined for an empty or wholly invalid object', () => {
		expect( sanitizeMetadata( {} ) ).toBeUndefined();
		expect( sanitizeMetadata( { a: { nested: 1 } } ) ).toBeUndefined();
	} );

	it( 'should drop invalid values with a warning and never throw', () => {
		const result = sanitizeMetadata( {
			ok: 'yes',
			nested: { a: 1 },
			list: [ 1 ],
			nan: Number.NaN,
			inf: Number.POSITIVE_INFINITY,
			undef: undefined,
			fn: () => 1,
			long: 'x'.repeat( METADATA_LIMITS.maxStringLength + 1 ),
			max: 'x'.repeat( METADATA_LIMITS.maxStringLength ),
		} );

		expect( result ).toEqual( { ok: 'yes', max: 'x'.repeat( METADATA_LIMITS.maxStringLength ) } );
		expect( warn ).toHaveBeenCalledTimes( 7 );
	} );

	it( 'should drop empty, too long and reserved keys', () => {
		const raw = JSON.parse( '{"__proto__":"x","constructor":"x","prototype":"x","":"x","ok":"x"}' );
		raw[ 'k'.repeat( METADATA_LIMITS.maxKeyLength + 1 ) ] = 'x';

		expect( sanitizeMetadata( raw ) ).toEqual( { ok: 'x' } );
	} );

	it( 'should keep at most 20 keys in insertion order', () => {
		const raw = Object.fromEntries( Array.from( { length: 25 }, ( _, i ) => [ `k${ i }`, i ] ) );

		const result = sanitizeMetadata( raw );

		expect( Object.keys( result ?? {} ) ).toEqual( Array.from( { length: 20 }, ( _, i ) => `k${ i }` ) );
	} );

	it( 'should cap the serialized size', () => {
		const raw = Object.fromEntries( Array.from( { length: 10 }, ( _, i ) => [ `k${ i }`, 'v'.repeat( 250 ) ] ) );

		const result = sanitizeMetadata( raw );

		expect( JSON.stringify( result ).length ).toBeLessThanOrEqual( METADATA_LIMITS.maxTotalLength );
		expect( Object.keys( result ?? {} ).length ).toBe( 7 );
	} );

	it( 'should not send metadata in the HOST_READY embedded payload', () => {
		expect( buildHostEmbeddedConfigPayload( { appId: 'a', metadata: { plan: 'pro' } } as never ) ).not.toHaveProperty( 'metadata' );
	} );
} );
