import { describe, expect, it, jest } from '@jest/globals';
import type { Env } from './env';
import { resolveConfig, shouldBoot } from './resolve-config';

const DEFAULT_ENV: Env = {
	browserUiTheme: 'light',
	isInIframe: false,
	isRTL: false,
};

describe( 'load-sidebar-v2/resolve-config', () => {
	it( 'should resolve host and iframe defaults', () => {
		const config = resolveConfig( { host: { appId: 'editor-lite' } }, DEFAULT_ENV );

		expect( config.host.appId ).toBe( 'editor-lite' );
		expect( config.boot.allowInIframe ).toBe( false );
		expect( config.container.id ).toBe( 'angie-sidebar-container' );
		expect( config.container.persistOpenState ).toBe( true );
		expect( config.iframe.path ).toBe( 'angie/embedded' );
		expect( config.iframe.uiTheme ).toBe( 'light' );
		expect( config.widgetConfig ).toEqual( { closeButton: 'collapse' } );
	} );

	it( 'should apply container overrides', () => {
		const config = resolveConfig(
			{
				container: { persistOpenState: false, resizable: false },
				host: { appId: 'editor-lite' },
			},
			DEFAULT_ENV,
		);

		expect( config.container.persistOpenState ).toBe( false );
		expect( config.container.resizable ).toBe( false );
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

		expect( config.iframe.isRTL ).toBe( true );
		expect( config.iframe.uiTheme ).toBe( 'dark' );
	} );

	it( 'should skip boot when embedded in iframe by default', () => {
		const config = resolveConfig( { host: { appId: 'editor-lite' } }, DEFAULT_ENV );

		expect( shouldBoot( config, { ...DEFAULT_ENV, isInIframe: true } ) ).toBe( false );
		expect( shouldBoot( config, DEFAULT_ENV ) ).toBe( true );
	} );
} );
