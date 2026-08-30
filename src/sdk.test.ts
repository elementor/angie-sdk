import { describe, expect, it, jest } from '@jest/globals';
import type { AppState } from './config';
import { listenToSDK } from './sdk';
import { MessageEventType } from './types';

jest.mock('./logger', () => ({
	createChildLogger: jest.fn(() => ({
		log: jest.fn(),
		error: jest.fn(),
	})),
}));

describe('listenToSDK', () => {
	it('should relay message context unchanged to the Angie iframe', async () => {
		const iframePostMessage = jest.fn();
		const appState = {
			open: false,
			iframe: {
				contentWindow: {
					postMessage: iframePostMessage,
				},
			} as unknown as HTMLIFrameElement,
			iframeUrlObject: new URL('https://angie.elementor.com'),
			containerId: 'angie-sidebar-container',
		} satisfies AppState;
		const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
		const messageContext = {
			label: 'Selected error',
			content: 'Checkout failed with error code PAYMENT_DECLINED.',
		};

		listenToSDK(appState);

		const messageHandler = addEventListenerSpy.mock.calls.find(
			([type]) => type === 'message'
		)?.[1] as unknown as (event: MessageEvent) => Promise<void>;

		await messageHandler({
			origin: window.location.origin,
			data: {
				type: MessageEventType.SDK_TRIGGER_ANGIE,
				payload: {
					requestId: 'request-123',
					messageContext,
				},
			},
		} as MessageEvent);

		const relayedMessage = iframePostMessage.mock.calls[0][0] as {
			payload: {
				messageContext?: typeof messageContext;
				prompt?: string;
			};
		};

		expect(relayedMessage.payload.messageContext).toBe(messageContext);
		expect(relayedMessage.payload.prompt).toBeUndefined();
		expect(iframePostMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				type: MessageEventType.SDK_TRIGGER_ANGIE,
			}),
			appState.iframeUrlObject.origin
		);

		window.removeEventListener('message', messageHandler);
		addEventListenerSpy.mockRestore();
	});
});
