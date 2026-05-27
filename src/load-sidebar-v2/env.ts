import { DEFAULTS } from './defaults';

export type Env = {
	browserUiTheme: 'dark' | 'light';
	isInIframe: boolean;
	isRTL: boolean;
};

const detectBrowserUiTheme = (): Env['browserUiTheme'] => {
	if ( typeof window !== 'undefined' && typeof window.matchMedia === 'function' ) {
		return window.matchMedia( '(prefers-color-scheme: dark)' ).matches ? 'dark' : 'light';
	}

	return DEFAULTS.iframe.uiTheme;
};

const detectIsRTL = (): boolean => {
	if ( typeof document === 'undefined' ) {
		return false;
	}

	return document.documentElement.dir === 'rtl';
};

const detectIsInIframe = (): boolean => {
	if ( typeof window === 'undefined' ) {
		return false;
	}

	return window !== window.top;
};

export const readEnv = (): Env => ( {
	browserUiTheme: detectBrowserUiTheme(),
	isInIframe: detectIsInIframe(),
	isRTL: detectIsRTL(),
} );
