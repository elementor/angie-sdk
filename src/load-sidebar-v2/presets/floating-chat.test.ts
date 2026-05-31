import { describe, expect, it } from '@jest/globals';
import { FLOATING_CHAT_LAYOUT, FLOATING_CHAT_PRESET_DEFAULTS } from './floating-chat';

describe( 'load-sidebar-v2/presets/floating-chat', () => {
	it( 'should define the floating-chat layout defaults', () => {
		expect( FLOATING_CHAT_LAYOUT ).toBe( 'floating-chat' );
		expect( FLOATING_CHAT_PRESET_DEFAULTS ).toEqual( {
			layout: 'floating-chat',
			styleTheme: '',
			persistOpenState: false,
			resizable: false,
			chatToggleButtonEnabled: true,
		} );
	} );
} );
