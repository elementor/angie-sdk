import { describe, expect, it } from '@jest/globals';
import { resolveWidgetConfig } from './widget-config';

describe( 'load-sidebar-v2/widget-config', () => {
	it( 'should default closeButton to close for floating-chat layout', () => {
		expect( resolveWidgetConfig( 'floating-chat' ) ).toEqual( {
			closeButton: 'close',
		} );
	} );

	it( 'should allow overriding floating-chat widget config', () => {
		expect( resolveWidgetConfig( 'floating-chat', { closeButton: 'collapse', title: 'Angie' } ) ).toEqual( {
			closeButton: 'collapse',
			title: 'Angie',
		} );
	} );

	it( 'should default closeButton to collapse for sidebar layout', () => {
		expect( resolveWidgetConfig( 'sidebar' ) ).toEqual( {
			closeButton: 'collapse',
		} );
	} );

	it( 'should allow overriding sidebar widget config', () => {
		expect( resolveWidgetConfig( 'sidebar', { closeButton: 'close' } ) ).toEqual( {
			closeButton: 'close',
		} );
	} );
} );
