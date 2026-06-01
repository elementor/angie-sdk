import type { LoadSidebarV2ContainerStyleTheme } from './config';
import wordpressSidebarCssContent from './sidebar-wordpress.css?raw';

let wordpressCssInjected = false;

export const injectStyleThemeCss = ( styleTheme: LoadSidebarV2ContainerStyleTheme ): void => {
	if ( styleTheme !== 'wordpress' || typeof document === 'undefined' ) {
		return;
	}

	const styleId = 'angie-sidebar-wordpress-styles';

	if ( ! document.getElementById( styleId ) ) {
		wordpressCssInjected = false;
	}

	if ( wordpressCssInjected ) {
		return;
	}

	const style = document.createElement( 'style' );
	style.id = styleId;
	style.textContent = wordpressSidebarCssContent;

	const head = document.head || document.getElementsByTagName( 'head' )[ 0 ];
	head.appendChild( style );

	wordpressCssInjected = true;
};
