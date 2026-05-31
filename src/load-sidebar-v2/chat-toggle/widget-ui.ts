import {
	CHAT_TOGGLE_BUTTON_CLASS,
	CHAT_TOGGLE_STYLES_ID,
	CHAT_WIDGET_CONTAINER_CLASS,
	CHAT_WIDGET_FULLSCREEN_CLASS,
	CHAT_WIDGET_HIDDEN_CLASS,
	CHAT_WIDGET_STYLES_ID,
} from './constants';
import { applySelectorToToggleButton, findToggleButton } from './toggle-button-element';

const ANGIE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 16 16" fill="none">
	<path d="M15.0998 8.00414L14.622 8.18282C13.4991 8.60516 12.8142 9.50669 12.4001 10.6519L12.2249 11.1392L12.0497 10.6519C11.6356 9.50669 10.9109 8.60516 9.78801 8.18282L9.31018 8.00414L9.78801 7.82546C10.9109 7.40312 11.6356 6.50159 12.0497 5.3564L12.2249 4.86909L12.4001 5.3564C12.8142 6.50159 13.4991 7.40312 14.622 7.82546L15.0998 8.00414Z" fill="white"/>
	<path d="M2 8.42721C5.5608 8.42721 8.44479 11.3685 8.44479 15" stroke="white" stroke-width="2.05092" stroke-miterlimit="10"/>
	<path d="M2 7.57275C5.5608 7.57275 8.44479 4.6315 8.44479 0.999991" stroke="white" stroke-width="2.05092" stroke-miterlimit="10"/>
</svg>`;

const buildChatToggleButtonCss = (): string => `
.${ CHAT_TOGGLE_BUTTON_CLASS } {
	--angie-toggle-size: 56px;
	--angie-widget-z-index: 99999;

	position: fixed;
	bottom: 20px;
	inset-inline-end: 20px;
	width: var(--angie-toggle-size);
	height: var(--angie-toggle-size);
	border-radius: 50%;
	border: none;
	background: #EB8EFB;
	color: white;
	cursor: pointer;
	z-index: var(--angie-widget-z-index);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	transition: background 0.2s ease, transform 0.15s ease;
	padding: 0;
}

.${ CHAT_TOGGLE_BUTTON_CLASS }:hover {
	background: #E070F5;
	transform: scale(1.05);
}

.${ CHAT_TOGGLE_BUTTON_CLASS }:active {
	transform: scale(0.95);
}

.${ CHAT_TOGGLE_BUTTON_CLASS }[aria-expanded="true"] {
	display: none;
}
`;

const buildWidgetCss = ( containerId: string ): string => `
#${ containerId }.${ CHAT_WIDGET_CONTAINER_CLASS } {
	--angie-widget-width: 400px;
	--angie-widget-height: 600px;
	--angie-widget-z-index: 99999;

	position: fixed !important;
	top: auto !important;
	bottom: 20px !important;
	inset-inline-start: auto !important;
	inset-inline-end: 20px !important;
	width: var(--angie-widget-width) !important;
	height: var(--angie-widget-height) !important;
	max-height: calc(100vh - 40px) !important;
	max-width: calc(100vw - 40px) !important;
	z-index: var(--angie-widget-z-index) !important;
	transform: none !important;
	border-radius: 12px !important;
	overflow: hidden !important;
	box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15) !important;
	transition: opacity 0.2s ease, transform 0.2s ease !important;
}

#${ containerId }.${ CHAT_WIDGET_CONTAINER_CLASS }.${ CHAT_WIDGET_HIDDEN_CLASS } {
	display: none !important;
}

#${ containerId }.${ CHAT_WIDGET_CONTAINER_CLASS } iframe {
	width: 100% !important;
	height: 100% !important;
	border: none !important;
	border-radius: 12px !important;
}

${ buildChatToggleButtonCss() }

#${ containerId }.${ CHAT_WIDGET_CONTAINER_CLASS }.${ CHAT_WIDGET_FULLSCREEN_CLASS } {
	bottom: 0 !important;
	inset-inline-end: 0 !important;
	width: 100vw !important;
	height: 100vh !important;
	max-height: 100vh !important;
	max-width: 100vw !important;
	border-radius: 0 !important;
}

#${ containerId }.${ CHAT_WIDGET_CONTAINER_CLASS }.${ CHAT_WIDGET_FULLSCREEN_CLASS } iframe {
	border-radius: 0 !important;
}

@media (max-width: 480px) {
	#${ containerId }.${ CHAT_WIDGET_CONTAINER_CLASS } {
		bottom: 0 !important;
		inset-inline-end: 0 !important;
		width: 100vw !important;
		height: 100vh !important;
		max-height: 100vh !important;
		max-width: 100vw !important;
		border-radius: 0 !important;
	}

	#${ containerId }.${ CHAT_WIDGET_CONTAINER_CLASS } iframe {
		border-radius: 0 !important;
	}
}
`;

export const injectChatToggleButtonStyles = (): void => {
	if ( document.getElementById( CHAT_TOGGLE_STYLES_ID ) ) {
		return;
	}

	const style = document.createElement( 'style' );
	style.id = CHAT_TOGGLE_STYLES_ID;
	style.textContent = buildChatToggleButtonCss();
	document.head.appendChild( style );
};

export const injectChatWidgetStyles = ( containerId: string ): void => {
	if ( document.getElementById( CHAT_WIDGET_STYLES_ID ) ) {
		return;
	}

	const style = document.createElement( 'style' );
	style.id = CHAT_WIDGET_STYLES_ID;
	style.textContent = buildWidgetCss( containerId );
	document.head.appendChild( style );
};

export const prepareChatWidgetContainer = ( containerId: string ): void => {
	const container = document.getElementById( containerId );

	if ( ! container ) {
		return;
	}

	container.classList.add( CHAT_WIDGET_CONTAINER_CLASS, CHAT_WIDGET_HIDDEN_CLASS );
	container.setAttribute( 'role', 'complementary' );
	container.setAttribute( 'aria-label', 'Angie' );
	container.setAttribute( 'aria-hidden', 'true' );
	container.setAttribute( 'tabindex', '-1' );
};

export const injectChatToggleButton = ( toggleButtonSelector: string ): void => {
	if ( findToggleButton( toggleButtonSelector ) ) {
		return;
	}

	const toggleButton = document.createElement( 'button' );
	applySelectorToToggleButton( toggleButton, toggleButtonSelector );
	toggleButton.className = CHAT_TOGGLE_BUTTON_CLASS;
	toggleButton.setAttribute( 'aria-label', 'Open Angie' );
	toggleButton.setAttribute( 'aria-expanded', 'false' );
	toggleButton.type = 'button';
	toggleButton.innerHTML = ANGIE_ICON_SVG;

	document.body.appendChild( toggleButton );
};
