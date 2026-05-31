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

		expect( config.container.layout ).toBe( 'floating-chat' );
		expect( config.container.persistOpenState ).toBe( false );
		expect( config.container.chatToggleButton.enabled ).toBe( true );
		expect( config.widgetConfig ).toEqual( { closeButton: 'close' } );
	} );

	it( 'should resolve sidebar layout defaults', () => {
		const config = resolveConfig(
			{ container: { layout: 'sidebar' }, host: { appId: 'editor-lite' } },
			DEFAULT_ENV,
		);

		expect( config.container.persistOpenState ).toBe( true );
		expect( config.container.chatToggleButton.enabled ).toBe( false );
		expect( config.widgetConfig ).toEqual( { closeButton: 'collapse' } );
	} );

	it( 'should apply container overrides', () => {
		const config = resolveConfig(
			{
				container: {
					styleTheme: 'wordpress',
					persistOpenState: false,
					resizable: false,
					chatToggleButton: { enabled: true, selector: '#angie-lite-toggle' },
				},
				host: { appId: 'editor-lite' },
			},
			DEFAULT_ENV,
		);

		expect( config.container.styleTheme ).toBe( 'wordpress' );
		expect( config.container.persistOpenState ).toBe( false );
		expect( config.container.resizable ).toBe( false );
		expect( config.container.chatToggleButton ).toEqual( {
			enabled: true,
			selector: '#angie-lite-toggle',
		} );
	} );

	it( 'should preserve callbacks.onClose', () => {
		const onClose = jest.fn();
		const config = resolveConfig(
			{ callbacks: { onClose }, host: { appId: 'editor-lite' } },
			DEFAULT_ENV,
		);

		expect( config.callbacks.onClose ).toBe( onClose );
	} );

	it( 'should apply env-detected RTL and theme to iframe', () => {
		const config = resolveConfig(
			{ host: { appId: 'editor-lite' } },
			{ ...DEFAULT_ENV, browserUiTheme: 'dark', isRTL: true },
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
