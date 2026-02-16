import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { JSONRPCMessage, JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js';

/**
 * Transport implementation that uses the browser's MessageChannel API for communication
 * between different browser contexts (iframes, workers, tabs, windows, etc.).
 */
export class BrowserContextTransport implements Transport {
	sessionId?: string;
	onmessage?: ( message: JSONRPCMessage ) => void;
	onerror?: ( error: Error ) => void;
	onclose?: () => void;
	private _port: MessagePort;
	private _started = false;
	private _closed = false;

	/**
	 * Creates a new BrowserContextTransport using an existing MessagePort.
	 *
	 * @param { MessagePort } port      The MessagePort to use for communication.
	 */
	constructor( port: MessagePort ) {
		if ( ! port ) {
			throw new Error( 'MessagePort is required' );
		}

		this._port = port;

		// Set up event listeners
		this._port.onmessage = ( event ) => {
			try {
				const message = JSONRPCMessageSchema.parse( event.data );
				this.onmessage?.( message );
			} catch ( error ) {
				const parseError = new Error( `Failed to parse message: ${ error }` );
				this.onerror?.( parseError );
			}
		};

		this._port.onmessageerror = ( event ) => {
			const messageError = new Error( `MessagePort error: ${ JSON.stringify( event ) }` );
			this.onerror?.( messageError );
		};
	}

	/**
	 * Starts processing messages on the transport.
	 * This starts the underlying MessagePort if it hasn't been started yet.
	 *
	 * @throws Error if the transport is already started or has been closed.
	 */
	async start(): Promise<void> {
		if ( this._started ) {
			throw new Error(
				'BrowserContextTransport already started! If using Client or Server class, note that connect() calls start() automatically.'
			);
		}

		if ( this._closed ) {
			throw new Error( 'Cannot start a closed BrowserContextTransport' );
		}

		this._started = true;
		this._port.start();
	}

	/**
	 * Sends a JSON-RPC message over the MessagePort.
	 *
	 * @param { JSONRPCMessage } message The JSON-RPC message to send.
	 * @throws Error if the transport is closed or the message cannot be sent.
	 */
	async send( message: JSONRPCMessage ): Promise<void> {
		if ( this._closed ) {
			throw new Error( 'Cannot send on a closed BrowserContextTransport' );
		}

		return new Promise( ( resolve, reject ) => {
			try {
				this._port.postMessage( message );
				resolve();
			} catch ( error ) {
				const sendError = error instanceof Error ? error : new Error( String( error ) );
				this.onerror?.( sendError );
				reject( sendError );
			}
		} );
	}

	/**
	 * Closes the MessagePort and marks the transport as closed.
	 * This method will call onclose if it's defined.
	 */
	async close(): Promise<void> {
		if ( this._closed ) {
			return;
		}

		this._closed = true;
		this._port.close();
		this.onclose?.();
	}
}
