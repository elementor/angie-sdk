import { describe, expect, it } from '@jest/globals';
import { resolveWidgetConfig } from './widget-config';

describe( 'load-sidebar-v2/widget-config', () => {
	it( 'should default closeButton to collapse for sidebar layout', () => {
		expect( resolveWidgetConfig() ).toEqual( {
			closeButton: 'collapse',
		} );
	} );

	it( 'should allow overriding sidebar widget config', () => {
		expect( resolveWidgetConfig( { closeButton: 'close' } ) ).toEqual( {
			closeButton: 'close',
		} );
	} );
} );
