const ID_SELECTOR_PATTERN = /^#([^\s#.[:]+)$/;
const ATTRIBUTE_SELECTOR_PATTERN = /^\[([^\]=]+)(?:="([^"]*)")?\]$/;

export const findToggleButton = ( selector: string ): HTMLElement | null => {
	return document.querySelector<HTMLElement>( selector );
};

const applySelectorToToggleButton = ( element: HTMLElement, selector: string ): void => {
	const idMatch = selector.match( ID_SELECTOR_PATTERN );

	if ( idMatch ) {
		element.id = idMatch[ 1 ];
		return;
	}

	const attributeMatch = selector.match( ATTRIBUTE_SELECTOR_PATTERN );

	if ( attributeMatch ) {
		element.setAttribute( attributeMatch[ 1 ], attributeMatch[ 2 ] ?? '' );
	}
};

const TOGGLE_BUTTON_CLASS = 'angie-widget-toggle';
const TOGGLE_STYLES_ID = 'angie-chat-toggle-styles';

const ANGIE_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 16 16" fill="none">
	<path d="M15.0998 8.00414L14.622 8.18282C13.4991 8.60516 12.8142 9.50669 12.4001 10.6519L12.2249 11.1392L12.0497 10.6519C11.6356 9.50669 10.9109 8.60516 9.78801 8.18282L9.31018 8.00414L9.78801 7.82546C10.9109 7.40312 11.6356 6.50159 12.0497 5.3564L12.2249 4.86909L12.4001 5.3564C12.8142 6.50159 13.4991 7.40312 14.622 7.82546L15.0998 8.00414Z" fill="white"/>
	<path d="M2 8.42721C5.5608 8.42721 8.44479 11.3685 8.44479 15" stroke="white" stroke-width="2.05092" stroke-miterlimit="10"/>
	<path d="M2 7.57275C5.5608 7.57275 8.44479 4.6315 8.44479 0.999991" stroke="white" stroke-width="2.05092" stroke-miterlimit="10"/>
</svg>`;

const buildToggleButtonCss = (): string => `
.${ TOGGLE_BUTTON_CLASS } {
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

.${ TOGGLE_BUTTON_CLASS }:hover {
	background: #E070F5;
	transform: scale(1.05);
}

.${ TOGGLE_BUTTON_CLASS }:active {
	transform: scale(0.95);
}

.${ TOGGLE_BUTTON_CLASS }[aria-expanded="true"] {
	display: none;
}
`;

const injectToggleButtonStyles = (): void => {
	if ( document.getElementById( TOGGLE_STYLES_ID ) ) {
		return;
	}

	const style = document.createElement( 'style' );
	style.id = TOGGLE_STYLES_ID;
	style.textContent = buildToggleButtonCss();
	document.head.appendChild( style );
};

export const injectToggleButton = ( toggleButtonSelector: string ): void => {
	if ( findToggleButton( toggleButtonSelector ) ) {
		return;
	}

	injectToggleButtonStyles();

	const toggleButton = document.createElement( 'button' );
	applySelectorToToggleButton( toggleButton, toggleButtonSelector );
	toggleButton.className = TOGGLE_BUTTON_CLASS;
	toggleButton.setAttribute( 'aria-label', 'Open Angie' );
	toggleButton.setAttribute( 'aria-expanded', 'false' );
	toggleButton.type = 'button';
	toggleButton.innerHTML = ANGIE_ICON_SVG;

	document.body.appendChild( toggleButton );
};
