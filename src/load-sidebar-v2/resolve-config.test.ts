import { describe, expect, it, jest } from '@jest/globals';
import type { FirstTimeExperienceConfig } from '../angie-mcp-sdk';
import { LAYOUT_FLOATING_CHAT, LAYOUT_SIDEBAR } from './config';
import type { Env } from './env';
import { resolveConfig, shouldBoot } from './resolve-config';

const DEFAULT_ENV: Env = {
	browserUiTheme: 'light',
	isInIframe: false,
	isRTL: false,
};

describe( 'load-sidebar-v2/resolve-config', () => {
	it( 'should resolve sidebar defaults when layout is omitted', () => {
		const config = resolveConfig( { host: { appId: 'editor-lite' } }, DEFAULT_ENV );

		expect( config.container.layout ).toBe( LAYOUT_SIDEBAR );
		expect( config.container.styleTheme ).toBe( '' );
		expect( config.container.persistOpenState ).toBe( true );
		expect( config.container.chatToggleButton.enabled ).toBe( false );
		expect( config.widgetConfig ).toEqual( { closeButton: 'collapse' } );
	} );

	it( 'should resolve floating-chat defaults', () => {
		const config = resolveConfig(
			{ container: { layout: LAYOUT_FLOATING_CHAT }, host: { appId: 'editor-lite' } },
			DEFAULT_ENV,
		);

		expect( config.container.layout ).toBe( LAYOUT_FLOATING_CHAT );
		expect( config.container.styleTheme ).toBe( '' );
		expect( config.container.persistOpenState ).toBe( false );
		expect( config.container.chatToggleButton.enabled ).toBe( true );
		expect( config.widgetConfig ).toEqual( { closeButton: 'close' } );
	} );

	it( 'should resolve sidebar layout defaults', () => {
		const config = resolveConfig(
			{ container: { layout: LAYOUT_SIDEBAR }, host: { appId: 'editor-lite' } },
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

	it( 'should preserve callbacks.getExternalHeaders', () => {
		const getExternalHeaders = jest.fn<() => Record<string, string>>();
		const config = resolveConfig(
			{ callbacks: { getExternalHeaders }, host: { appId: 'editor-lite' } },
			DEFAULT_ENV,
		);

		expect( config.callbacks.getExternalHeaders ).toBe( getExternalHeaders );
	} );

	it( 'should apply env-detected RTL and theme to iframe', () => {
		const config = resolveConfig(
			{ host: { appId: 'editor-lite' } },
			{ ...DEFAULT_ENV, browserUiTheme: 'dark', isRTL: true },
		);

		expect( config.iframe.isRTL ).toBe( true );
		expect( config.iframe.uiTheme ).toBe( 'dark' );
	} );

	it( 'should preserve widgetConfig.firstTimeExperience', () => {
		const firstTimeExperience: FirstTimeExperienceConfig = {
			screens: [
				{
					type: 'welcome',
					title: 'Meet Angie',
					subtitle: 'An active experiment.',
					highlights: [
						{ title: 'Angie is in beta', description: 'Features evolve quickly.' },
						{ title: 'You stay in control' },
					],
					ctaLabel: 'I understand',
				},
				{
					type: 'widget-picker',
					title: 'Create your first widget',
					subtitle: 'Start with an example or describe what you need.',
					items: [
						{
							id: 'hero',
							label: 'Hero',
							prompt: 'Create a hero section',
							description: 'A bold above-the-fold section.',
							image: 'https://example.com/hero.png',
						},
					],
				},
			],
		};
		const config = resolveConfig(
			{ host: { appId: 'editor-lite' }, widgetConfig: { firstTimeExperience } },
			DEFAULT_ENV,
		);

		expect( config.widgetConfig?.firstTimeExperience ).toEqual( firstTimeExperience );
		expect( config.widgetConfig?.closeButton ).toBe( 'collapse' );
	} );

	it( 'should skip boot when embedded in iframe by default', () => {
		const config = resolveConfig( { host: { appId: 'editor-lite' } }, DEFAULT_ENV );

		expect( shouldBoot( config, { ...DEFAULT_ENV, isInIframe: true } ) ).toBe( false );
		expect( shouldBoot( config, DEFAULT_ENV ) ).toBe( true );
	} );
} );
