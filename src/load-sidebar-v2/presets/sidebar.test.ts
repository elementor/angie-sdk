import { describe, expect, it } from '@jest/globals';
import { SIDEBAR_LAYOUT, SIDEBAR_PRESET_DEFAULTS } from './sidebar';

describe( 'load-sidebar-v2/presets/sidebar', () => {
	it( 'should define the sidebar layout defaults', () => {
		expect( SIDEBAR_LAYOUT ).toBe( 'sidebar' );
		expect( SIDEBAR_PRESET_DEFAULTS ).toEqual( {
			layout: 'sidebar',
			styleTheme: '',
			persistOpenState: true,
			resizable: true,
			chatToggleButtonEnabled: false,
		} );
	} );
} );
