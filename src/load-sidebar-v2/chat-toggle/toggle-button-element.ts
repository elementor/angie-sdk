const ID_SELECTOR_PATTERN = /^#([^\s#.[:]+)$/;
const ATTRIBUTE_SELECTOR_PATTERN = /^\[([^\]=]+)(?:="([^"]*)")?\]$/;

export const findToggleButton = ( selector: string ): HTMLElement | null => {
	return document.querySelector<HTMLElement>( selector );
};

export const applySelectorToToggleButton = ( element: HTMLElement, selector: string ): void => {
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
