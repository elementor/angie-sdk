import { describe, expect, it, jest } from '@jest/globals';
import type { Env } from './env';
import { resolveConfig, shouldBoot } from './resolve-config';

const DEFAULT_ENV: Env = {
	browserUiTheme: 'light',
	isInIframe: false,
	isRTL: false,
};

describe( 'load-sidebar-v2/resolve-config', () => {
	it( 'should resolve floating-chat defaults', () => {
		const config = resolveConfig( { host: { appId: 'editor-lite' } }, DEFAULT_ENV );

		expect( config.container ).toEqual( {
			id: 'angie-sidebar-container',
			layout: 'floating-chat',
			styleTheme: '',
			persistOpenState: false,
			resizable: false,
			chatToggleButton: { enabled: true, selector: '#angie-widget-toggle' },
		} );
		expect( config.widgetConfig ).toEqual( { closeButton: 'close' } );
	} );

	it( 'should resolve sidebar layout defaults', () => {
		const config = resolveConfig(
			{ container: { layout: 'sidebar' }, host: { appId: 'editor-lite' } },
			DEFAULT_ENV,
		);

		expect( config.container ).toEqual( {
			id: 'angie-sidebar-container',
			layout: 'sidebar',
			styleTheme: '',
			persistOpenState: true,
			resizable: true,
			chatToggleButton: { enabled: false, selector: '#angie-widget-toggle' },
		} );
		expect( config.widgetConfig ).toEqual( { closeButton: 'collapse' } );
	} );

	it( 'should apply container and chat toggle overrides', () => {
		const config = resolveConfig(
			{
				container: {
					layout: 'sidebar',
					styleTheme: 'wordpress',
					persistOpenState: false,
					chatToggleButton: { enabled: true, selector: '#angie-lite-toggle' },
				},
				host: { appId: 'editor-lite' },
			},
			DEFAULT_ENV,
		);

		expect( config.container.styleTheme ).toBe( 'wordpress' );
		expect( config.container.persistOpenState ).toBe( false );
		expect( config.container.chatToggleButton ).toEqual( {
			enabled: true,
			selector: '#angie-lite-toggle',
		} );
	} );

	it( 'should preserve callbacks.onClose and env iframe settings', () => {
		const onClose = jest.fn();
		const config = resolveConfig(
			{
				callbacks: { onClose },
				host: { appId: 'editor-lite' },
			},
			{ ...DEFAULT_ENV, browserUiTheme: 'dark', isRTL: true },
		);

		expect( config.callbacks.onClose ).toBe( onClose );
		expect( config.iframe.uiTheme ).toBe( 'dark' );
		expect( config.iframe.isRTL ).toBe( true );
	} );

	it( 'should skip boot when embedded in iframe by default', () => {
		const config = resolveConfig( { host: { appId: 'editor-lite' } }, DEFAULT_ENV );

		expect( shouldBoot( config, { ...DEFAULT_ENV, isInIframe: true } ) ).toBe( false );
		expect( shouldBoot( config, DEFAULT_ENV ) ).toBe( true );
	} );
} );
