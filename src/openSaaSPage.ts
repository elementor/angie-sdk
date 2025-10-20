import { HostEventType } from "./types";

type OpenSaaSPageInput = {
	origin: string;
	path: string;
	parent?: Document;
	insertCallback?: ( iframe: HTMLIFrameElement ) => void;
	css: {
		[key: string]: string | number;
	},
	uiTheme?: string;
	isRTL?: boolean;
	sdkVersion: string;
};

type OpenSaaSPageOutput = {
	iframe: HTMLIFrameElement;
	iframeUrlObject: URL;
};

export const openSaaSPage = async ( props: OpenSaaSPageInput ): Promise<OpenSaaSPageOutput> => {
	const origin = props.origin;
	const pathUrl = new URL( props.path, origin );
	// e.g. "text-to-elementor-vm2qhj"
	const instanceId = pathUrl.pathname.slice( 1 ).replace( /\//, '--' ) + '-' + Math.random().toString( 36 ).substring( 7 );

	return new Promise( ( resolve ) => {
		const iframeUrlObject = new URL( origin );
		iframeUrlObject.pathname = pathUrl.pathname;

		const browserTheme = window.matchMedia( '(prefers-color-scheme: dark)' ).matches ? 'dark' : 'light';

		iframeUrlObject.searchParams.append( 'colorScheme', props.uiTheme || browserTheme || 'light' );
		iframeUrlObject.searchParams.append( 'sdkVersion', props.sdkVersion );
		iframeUrlObject.searchParams.append( 'instanceId', instanceId );
		iframeUrlObject.searchParams.append( 'origin', window.location.origin );

		if ( props.isRTL ) {
			iframeUrlObject.searchParams.append( 'isRTL', props.isRTL ? 'true' : 'false' );
		}

		// pass testing error messages to iframe
		if ( window.location.hostname === 'localhost' && window.location.search.includes( 'debug_error' ) ) {
			const debugError = new URLSearchParams( window.location.search ).get( 'debug_error' );
			if ( debugError ) {
				iframeUrlObject.searchParams.append( 'debug_error', debugError );
			}
		}

		pathUrl.searchParams.forEach( ( value, key ) => {
			iframeUrlObject.searchParams.set( key, value );
		} );

		iframeUrlObject.searchParams.set( 'ver', new Date().getTime().toString() );

		const parent = props.parent || document;
		const iframe = parent.createElement( 'iframe' );
		const css = {
			'background-color': 'transparent',
			'color-scheme': 'normal',
			...props.css,
		};

		const onMessage = async ( event: MessageEvent ) => {
			if ( event.origin !== iframeUrlObject.origin ) {
				return;
			}

			switch ( event.data.type ) {
				case HostEventType.ANGIE_READY:
					resolve( {
						iframe,
						iframeUrlObject,
					} );
					break;
				case HostEventType.ANGIE_LOADED:
					iframe.contentWindow?.postMessage( {
						type: HostEventType.HOST_READY,
						instanceId,
					}, iframeUrlObject.origin );
					break;
				default:
					break;
			}
		};

		window.addEventListener( 'message', onMessage );


		iframe.setAttribute( 'src', iframeUrlObject.href );
		iframe.id = 'angie-iframe';
		iframe.setAttribute( 'frameborder', '0' );
		iframe.setAttribute( 'scrolling', 'no' );
		iframe.setAttribute( 'style', Object.entries( css ).map( ( [ key, value ] ) => `${ key }: ${ value }` ).join( '; ' ) );
		iframe.setAttribute( 'allow', 'clipboard-write; clipboard-read' );

		if ( props.insertCallback ) {
			props.insertCallback( iframe );
		} else {
			parent.body.appendChild( iframe );
		}
	} );
};
