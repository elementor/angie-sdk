export type MetadataValue = string | number | boolean | null;

export type Metadata = Record<string, MetadataValue>;

export const METADATA_LIMITS = {
	maxKeys: 20,
	maxKeyLength: 64,
	maxStringLength: 256,
	maxTotalLength: 2048,
} as const;

const RESERVED_KEYS = new Set( [ '__proto__', 'constructor', 'prototype' ] );

const warn = ( message: string ): void => {
	// eslint-disable-next-line no-console
	console.warn( `[angie-sdk] host.metadata: ${ message }` );
};

const isPlainObject = ( value: unknown ): value is Record<string, unknown> => {
	if ( typeof value !== 'object' || value === null || Array.isArray( value ) ) {
		return false;
	}
	const proto = Object.getPrototypeOf( value );
	return proto === Object.prototype || proto === null;
};

const isValidValue = ( value: unknown ): value is MetadataValue => {
	if ( value === null || typeof value === 'boolean' ) {
		return true;
	}
	if ( typeof value === 'number' ) {
		return Number.isFinite( value );
	}
	if ( typeof value === 'string' ) {
		return value.length <= METADATA_LIMITS.maxStringLength;
	}
	return false;
};

/**
 * Keeps only flat primitive entries within the limits. Invalid entries are dropped with a warning.
 * Never throws. Returns undefined when nothing valid is left.
 */
export const sanitizeMetadata = ( raw: unknown ): Metadata | undefined => {
	if ( raw === undefined || raw === null ) {
		return undefined;
	}
	if ( ! isPlainObject( raw ) ) {
		warn( 'expected a plain object, ignoring' );
		return undefined;
	}

	const result: Metadata = {};
	let keyCount = 0;
	let totalLength = 2; // "{}"

	for ( const [ key, value ] of Object.entries( raw ) ) {
		if ( key.length < 1 || key.length > METADATA_LIMITS.maxKeyLength || RESERVED_KEYS.has( key ) ) {
			warn( `dropped invalid key "${ key.slice( 0, METADATA_LIMITS.maxKeyLength ) }"` );
			continue;
		}
		if ( ! isValidValue( value ) ) {
			warn( `dropped "${ key }": value must be a string (max ${ METADATA_LIMITS.maxStringLength } chars), finite number, boolean or null` );
			continue;
		}
		if ( keyCount >= METADATA_LIMITS.maxKeys ) {
			warn( `dropped "${ key }": max ${ METADATA_LIMITS.maxKeys } keys` );
			continue;
		}
		const entryLength = JSON.stringify( key ).length + 1 + JSON.stringify( value ).length + ( keyCount > 0 ? 1 : 0 );
		if ( totalLength + entryLength > METADATA_LIMITS.maxTotalLength ) {
			warn( `dropped "${ key }": max ${ METADATA_LIMITS.maxTotalLength } chars in total` );
			continue;
		}
		result[ key ] = value;
		keyCount++;
		totalLength += entryLength;
	}

	return keyCount > 0 ? result : undefined;
};
