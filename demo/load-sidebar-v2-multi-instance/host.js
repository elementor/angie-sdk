import { AngieMcpSdk, LAYOUT_FLOATING_CHAT, LAYOUT_SIDEBAR } from '../../dist/index.js';

const sidebarSdk = new AngieMcpSdk();
const chatSdk = new AngieMcpSdk();
const chatSdk2 = new AngieMcpSdk();

await sidebarSdk.loadSidebarV2( {
	host: { appId: 'demo-sidebar', instanceId: 'demo-sidebar' },
	container: {
		layout: LAYOUT_SIDEBAR,
		chatToggleButton: { enabled: true, selector: '#sidebar-toggle' },
	},
	widgetConfig: { title: 'Sidebar instance' },
} );

await chatSdk.loadSidebarV2( {
	host: { appId: 'demo-chat', instanceId: 'demo-chat' },
	container: { id: 'angie-chat-container', layout: LAYOUT_FLOATING_CHAT },
	widgetConfig: { title: 'Chat A instance' },
} );

await chatSdk2.loadSidebarV2( {
	host: { appId: 'demo-chat-2', instanceId: 'demo-chat-2' },
	container: { id: 'angie-chat-container-2', layout: LAYOUT_FLOATING_CHAT },
	widgetConfig: { title: 'Chat B instance' },
} );

const iframes = () => [ ...document.querySelectorAll( 'iframe[src*="angie/"]' ) ].map(
	( frame ) => ( {
		elementId: frame.id,
		container: frame.closest( 'div[id]' )?.id,
		urlInstanceId: new URL( frame.src ).searchParams.get( 'instanceId' ),
	} ),
);

const toggles = () => [ ...document.querySelectorAll( '[id^="angie-widget-toggle"], #sidebar-toggle' ) ]
	.map( ( button ) => ( { id: button.id, expanded: button.getAttribute( 'aria-expanded' ) } ) );

const openContainers = () => [ ...document.querySelectorAll( 'div[id^="angie-"]' ) ]
	.filter( ( element ) => element.querySelector( 'iframe' ) )
	.map( ( element ) => ( {
		container: element.id,
		open: ! element.classList.contains( 'angie-widget-hidden' ),
	} ) );

const styleTags = () => [ ...document.querySelectorAll( 'style[id]' ) ].map( ( tag ) => tag.id );

const storage = () => Object.fromEntries(
	Object.keys( localStorage )
		.filter( ( key ) => key.startsWith( 'angie' ) )
		.map( ( key ) => [ key, localStorage.getItem( key ) ] ),
);

window.angieDemo = {
	AngieMcpSdk,
	LAYOUT_FLOATING_CHAT,
	LAYOUT_SIDEBAR,
	sidebarSdk,
	chatSdk,
	chatSdk2,
	iframes,
	toggles,
	openContainers,
	styleTags,
	storage,
};
