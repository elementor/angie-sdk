import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { HOST_METADATA_LIMITS, sanitizeHostAnalytics, sanitizeHostMetadata } from './host-metadata';

describe( 'load-sidebar-v2/host-metadata', () => {
	let warnSpy: ReturnType<typeof jest.spyOn>;

	beforeEach( () => {
		// eslint-disable-next-line no-console
		warnSpy = jest.spyOn( console, 'warn' ).mockImplementation( () => undefined );
	} );

	afterEach( () => {
		warnSpy.mockRestore();
	} );

	it( 'should keep valid primitive entries as they are', () => {
		const metadata = { plan: 'pro', seats: 3, trial: false, partner: null };

		expect( sanitizeHostMetadata( metadata ) ).toEqual( metadata );
		expect( warnSpy ).not.toHaveBeenCalled();
	} );

	it( 'should return undefined without warning when metadata is missing', () => {
		expect( sanitizeHostMetadata( undefined ) ).toBeUndefined();
		expect( sanitizeHostMetadata( null ) ).toBeUndefined();
		expect( sanitizeHostMetadata( {} ) ).toBeUndefined();
		expect( warnSpy ).not.toHaveBeenCalled();
	} );

	it.each( [
		[ 'array', [ 'a' ] ],
		[ 'string', 'plan=pro' ],
		[ 'number', 1 ],
		[ 'class instance', new Date() ],
	] )( 'should ignore a non plain object (%s) with a warning', ( _label, input ) => {
		expect( sanitizeHostMetadata( input ) ).toBeUndefined();
		expect( warnSpy ).toHaveBeenCalledTimes( 1 );
	} );

	it( 'should drop invalid values and keep the rest', () => {
		const result = sanitizeHostMetadata( {
			plan: 'pro',
			nested: { a: 1 },
			list: [ 1 ],
			fn: () => 1,
			nan: Number.NaN,
			infinite: Number.POSITIVE_INFINITY,
			missing: undefined,
			long: 'x'.repeat( HOST_METADATA_LIMITS.maxStringLength + 1 ),
		} );

		expect( result ).toEqual( { plan: 'pro' } );
		expect( warnSpy ).toHaveBeenCalledTimes( 7 );
	} );

	it( 'should drop keys that are too long', () => {
		const longKey = 'k'.repeat( HOST_METADATA_LIMITS.maxKeyLength + 1 );

		expect( sanitizeHostMetadata( { [ longKey ]: 1, ok: 2 } ) ).toEqual( { ok: 2 } );
	} );

	it( 'should keep only the first maxKeys entries', () => {
		const input = Object.fromEntries(
			Array.from( { length: HOST_METADATA_LIMITS.maxKeys + 5 }, ( _, i ) => [ `k${ i }`, i ] ),
		);

		const result = sanitizeHostMetadata( input ) ?? {};

		expect( Object.keys( result ) ).toHaveLength( HOST_METADATA_LIMITS.maxKeys );
		expect( result.k0 ).toBe( 0 );
		expect( result[ `k${ HOST_METADATA_LIMITS.maxKeys }` ] ).toBeUndefined();
	} );

	it( 'should drop entries once the serialized size limit is reached', () => {
		const value = 'v'.repeat( HOST_METADATA_LIMITS.maxStringLength );
		const input = Object.fromEntries(
			Array.from( { length: 15 }, ( _, i ) => [ `k${ i }`, value ] ),
		);

		const result = sanitizeHostMetadata( input ) ?? {};

		expect( JSON.stringify( result ).length ).toBeLessThanOrEqual( HOST_METADATA_LIMITS.maxSerializedLength );
		expect( Object.keys( result ).length ).toBeGreaterThan( 0 );
		expect( Object.keys( result ).length ).toBeLessThan( 15 );
	} );

	it( 'should sanitize metadata inside analytics and keep other fields', () => {
		expect( sanitizeHostAnalytics( {
			siteKey: 'abc',
			metadata: { plan: 'pro', bad: { a: 1 } } as never,
		} ) ).toEqual( { siteKey: 'abc', metadata: { plan: 'pro' } } );
	} );

	it( 'should remove metadata from analytics when nothing valid is left', () => {
		expect( sanitizeHostAnalytics( { siteKey: 'abc', metadata: 'oops' as never } ) ).toEqual( { siteKey: 'abc' } );
	} );

	it( 'should return analytics unchanged when it has no metadata', () => {
		const analytics = { siteKey: 'abc' };

		expect( sanitizeHostAnalytics( analytics ) ).toBe( analytics );
		expect( sanitizeHostAnalytics( undefined ) ).toBeUndefined();
	} );
} );
