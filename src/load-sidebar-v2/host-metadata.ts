import type { HostAnalyticsConfig, HostMetadata } from './config';

export const HOST_METADATA_LIMITS = {
	maxKeys: 20,
	maxKeyLength: 64,
	maxStringLength: 256,
	maxSerializedLength: 2048,
} as const;

const FORBIDDEN_KEYS = new Set( [ '__proto__', 'constructor', 'prototype' ] );

const warn = ( message: string ): void => {
	// Not the SDK logger: it is silenced in production builds and hosts need to see this.
	// eslint-disable-next-line no-console
	console.warn( `[angie-sdk] host.analytics.metadata: ${ message }` );
};

const isPlainObject = ( value: unknown ): value is Record<string, unknown> => {
	if ( value === null || typeof value !== 'object' || Array.isArray( value ) ) {
		return false;
	}

	const proto = Object.getPrototypeOf( value );

	return proto === Object.prototype || proto === null;
};

const isAllowedValue = ( value: unknown ): value is HostMetadata[ string ] => (
	value === null ||
	typeof value === 'boolean' ||
	( typeof value === 'number' && Number.isFinite( value ) ) ||
	( typeof value === 'string' && value.length <= HOST_METADATA_LIMITS.maxStringLength )
);

/**
 * Keeps only valid entries of host-provided metadata. Never throws.
 * Returns `undefined` when nothing valid is left.
 */
export const sanitizeHostMetadata = ( input: unknown ): HostMetadata | undefined => {
	if ( input === undefined || input === null ) {
		return undefined;
	}

	if ( ! isPlainObject( input ) ) {
		warn( 'expected a plain object, ignoring it' );
		return undefined;
	}

	const result: HostMetadata = {};
	let keyCount = 0;

	for ( const [ key, value ] of Object.entries( input ) ) {
		if ( keyCount >= HOST_METADATA_LIMITS.maxKeys ) {
			warn( `more than ${ HOST_METADATA_LIMITS.maxKeys } keys, dropping "${ key }"` );
			continue;
		}

		if ( ! key || key.length > HOST_METADATA_LIMITS.maxKeyLength || FORBIDDEN_KEYS.has( key ) ) {
			warn( `invalid key "${ key.slice( 0, HOST_METADATA_LIMITS.maxKeyLength ) }", dropping it` );
			continue;
		}

		if ( ! isAllowedValue( value ) ) {
			warn( `value of "${ key }" must be a string (max ${ HOST_METADATA_LIMITS.maxStringLength } chars), finite number, boolean or null, dropping it` );
			continue;
		}

		if ( JSON.stringify( { ...result, [ key ]: value } ).length > HOST_METADATA_LIMITS.maxSerializedLength ) {
			warn( `total size over ${ HOST_METADATA_LIMITS.maxSerializedLength } chars, dropping "${ key }"` );
			continue;
		}

		result[ key ] = value;
		keyCount++;
	}

	return keyCount > 0 ? result : undefined;
};

/** Returns `analytics` with `metadata` sanitized, or removed when nothing valid is left. */
export const sanitizeHostAnalytics = (
	analytics?: HostAnalyticsConfig,
): HostAnalyticsConfig | undefined => {
	if ( ! analytics || ! ( 'metadata' in analytics ) ) {
		return analytics;
	}

	const { metadata, ...rest } = analytics;
	const sanitized = sanitizeHostMetadata( metadata );

	return sanitized ? { ...rest, metadata: sanitized } : rest;
};
