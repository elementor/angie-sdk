import { describe, expect, it } from '@jest/globals';
import type { Env } from './env';
import { resolveConfig, shouldBoot } from './resolve-config';

const DEFAULT_ENV: Env = {
	browserUiTheme: 'light',
	isInIframe: false,
	isRTL: false,
};

describe( 'load-sidebar-v2/resolve-config', () => {
	it( 'should resolve minimal input with defaults', () => {
		const config = resolveConfig( { host: { appId: 'editor-lite' } }, DEFAULT_ENV );

		expect( config ).toEqual( {
			host: {
				appId: 'editor-lite',
			},
			boot: {
				allowInIframe: false,
			},
			container: {
				id: 'angie-sidebar-container',
				layout: 'floating-chat',
				styleTheme: '',
				persistOpenState: false,
				resizable: false,
				chatToggleButton: {
					enabled: true,
					id: 'angie-widget-toggle',
				},
			},
			iframe: {
				isRTL: false,
				origin: 'https://angie.elementor.com',
				path: 'angie/embedded',
				uiTheme: 'light',
			},
			callbacks: {
				onClose: undefined,
			},
			widgetConfig: {
				closeButton: 'close',
			},
		} );
	} );

	it( 'should resolve sidebar layout defaults', () => {
		const config = resolveConfig(
			{
				container: { layout: 'sidebar' },
				host: { appId: 'editor-lite' },
			},
			DEFAULT_ENV,
		);

		expect( config.container ).toEqual( {
			id: 'angie-sidebar-container',
			layout: 'sidebar',
			styleTheme: '',
			persistOpenState: true,
			resizable: true,
			chatToggleButton: {
				enabled: false,
				id: 'angie-widget-toggle',
			},
		} );
		expect( config.widgetConfig ).toEqual( {
			closeButton: 'collapse',
		} );
	} );

	it( 'should honor explicit chat toggle on sidebar layout', () => {
		const config = resolveConfig(
			{
				container: {
					layout: 'sidebar',
					chatToggleButton: {
						enabled: true,
						id: 'angie-lite-toggle',
					},
				},
				host: { appId: 'editor-lite' },
			},
			DEFAULT_ENV,
		);

		expect( config.container.chatToggleButton ).toEqual( {
			enabled: true,
			id: 'angie-lite-toggle',
		} );
	} );

	it( 'should preserve callbacks.onClose', () => {
		const onClose = jest.fn();
		const config = resolveConfig(
			{
				callbacks: { onClose },
				host: { appId: 'editor-lite' },
			},
			DEFAULT_ENV,
		);

		expect( config.callbacks.onClose ).toBe( onClose );
	} );

	it( 'should apply env-detected RTL and theme to iframe', () => {
		const config = resolveConfig(
			{ host: { appId: 'editor-lite' } },
			{
				...DEFAULT_ENV,
				browserUiTheme: 'dark',
				isRTL: true,
			},
		);

		expect( config.iframe ).toEqual(
			expect.objectContaining( {
				isRTL: true,
				uiTheme: 'dark',
			} ),
		);
	} );

	it( 'should enable chat toggle by default when layout is floating-chat', () => {
		const config = resolveConfig(
			{
				container: { layout: 'floating-chat' },
				host: { appId: 'editor-lite' },
			},
			DEFAULT_ENV,
		);

		expect( config.container.chatToggleButton.enabled ).toBe( true );
		expect( config.container.chatToggleButton.id ).toBe( 'angie-widget-toggle' );
	} );

	it( 'should resolve a custom chat toggle button id', () => {
		const config = resolveConfig(
			{
				container: {
					chatToggleButton: { id: 'angie-lite-toggle' },
					layout: 'floating-chat',
				},
				host: { appId: 'editor-lite' },
			},
			DEFAULT_ENV,
		);

		expect( config.container.chatToggleButton.id ).toBe( 'angie-lite-toggle' );
	} );

	it( 'should allow disabling chat toggle explicitly', () => {
		const config = resolveConfig(
			{
				container: {
					chatToggleButton: { enabled: false },
					layout: 'floating-chat',
				},
				host: { appId: 'editor-lite' },
			},
			DEFAULT_ENV,
		);

		expect( config.container.chatToggleButton.enabled ).toBe( false );
	} );

	it( 'should resolve styleTheme independently from layout', () => {
		const config = resolveConfig(
			{
				container: {
					layout: 'floating-chat',
					styleTheme: 'wordpress',
				},
				host: { appId: 'editor-lite' },
			},
			DEFAULT_ENV,
		);

		expect( config.container.styleTheme ).toBe( 'wordpress' );
	} );

	it( 'should respect boot.allowInIframe in shouldBoot', () => {
		const config = resolveConfig(
			{
				boot: { allowInIframe: false },
				host: { appId: 'editor-lite' },
			},
			DEFAULT_ENV,
		);

		expect( shouldBoot( config, { ...DEFAULT_ENV, isInIframe: true } ) ).toBe( false );
		expect( shouldBoot( config, { ...DEFAULT_ENV, isInIframe: false } ) ).toBe( true );
	} );
} );
