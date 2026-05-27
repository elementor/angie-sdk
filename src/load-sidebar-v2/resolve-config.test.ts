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
				persistOpenState: true,
				preset: 'sidebar',
				resizable: true,
				stylePreset: 'wordpress',
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
