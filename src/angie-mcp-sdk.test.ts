import { describe, expect, it, beforeEach, jest, afterEach } from '@jest/globals';
import { AngieMcpSdk, resetPromptHashListenersForTests } from './angie-mcp-sdk';
import { appState } from './config';
import * as instanceRegistry from './instance-registry';
import type { AngieServerConfig, ServerRegistration, AngieDetectionResult, ClientCreationResponse } from './types';
import { AngieServerType, MessageEventType } from './types';

// Mock dependencies
jest.mock('./angie-detector');
jest.mock('./registration-queue');
jest.mock('./client-manager');
jest.mock('./browser-context-transport');
jest.mock('./sidebar', () => ({
  initAngieSidebar: jest.fn(),
}));
jest.mock('./iframe', () => ({
  openIframe: jest.fn(),
  MessageEventType: {
    SDK_REQUEST_INIT_SERVER: 'sdk-request-init-server',
    SDK_ANGIE_REFRESH_PING: 'sdk-angie-refresh-ping',
  },
}));
jest.mock('./load-sidebar-v2/boot-sidebar', () => ({
  bootSidebar: jest.fn( () => Promise.resolve() ),
}));

describe('AngieMcpSdk', () => {
  let sdk: AngieMcpSdk;
  let mockAngieDetector: any;
  let mockRegistrationQueue: any;
  let mockClientManager: any;
  let mockBrowserContextTransport: any;
  let mockInitAngieSidebar: any;
  let mockOpenIframe: any;
  let addEventListenerSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock window.addEventListener before creating SDK instance
    addEventListenerSpy = jest.spyOn(global.window, 'addEventListener');
    
    // Mock dependencies
    mockAngieDetector = {
      waitForReady: jest.fn(),
      isReady: jest.fn(),
    };

    mockRegistrationQueue = {
      add: jest.fn(),
      getAll: jest.fn(),
      getPending: jest.fn(),
      processQueue: jest.fn(),
      updateStatus: jest.fn(),
      resetAllToPending: jest.fn(),
      clear: jest.fn(),
    };

    mockClientManager = {
      requestClientCreation: jest.fn(),
    };

    mockBrowserContextTransport = jest.fn().mockImplementation(() => ({}));

    // Mock sidebar, iframe, and postMessage functions
    mockInitAngieSidebar = require('./sidebar').initAngieSidebar as jest.MockedFunction<any>;
    mockOpenIframe = require('./iframe').openIframe as jest.MockedFunction<any>;
    mockOpenIframe.mockResolvedValue(undefined);

    // Mock the constructors
    (require('./angie-detector') as any).AngieDetector.mockImplementation(() => mockAngieDetector);
    (require('./registration-queue') as any).RegistrationQueue.mockImplementation(() => mockRegistrationQueue);
    (require('./client-manager') as any).ClientManager.mockImplementation(() => mockClientManager);
    (require('./browser-context-transport') as any).BrowserContextTransport = mockBrowserContextTransport;

    // Set up mock return values before constructor
    mockAngieDetector.waitForReady.mockResolvedValue({ isReady: false });
    mockAngieDetector.isReady.mockReturnValue(false);
    mockRegistrationQueue.getAll.mockReturnValue([]);
    mockRegistrationQueue.getPending.mockReturnValue([]);
    mockRegistrationQueue.resetAllToPending.mockReturnValue(true);
    mockRegistrationQueue.processQueue.mockResolvedValue(undefined);
    mockClientManager.requestClientCreation.mockResolvedValue({
      success: true,
      clientId: 'client_123',
    });

    sdk = new AngieMcpSdk();
  });

  afterEach(() => {
    // Detach every listener this test registered, otherwise SDK instances keep
    // reacting to events (hashchange in particular) during later tests.
    for ( const [ type, listener ] of addEventListenerSpy.mock.calls as [ string, ( event: Event ) => void ][] ) {
      window.removeEventListener( type, listener );
    }

    jest.restoreAllMocks();
    addEventListenerSpy.mockRestore();
    resetPromptHashListenersForTests();
  });

  describe('triggerAngie', () => {
    beforeEach(() => {
      appState.triggerToken = 'test-trigger-token';
      jest.spyOn(instanceRegistry, 'getInstanceById').mockReturnValue({
        ...appState,
        triggerToken: 'test-trigger-token',
      } as ReturnType<typeof instanceRegistry.getInstanceById>);
    });

    it('should send a context attachment unchanged without requiring a prompt', async () => {
      const contextAttachment = {
        label: 'Selected error',
        content: 'Checkout failed with error code PAYMENT_DECLINED.',
      };
      const postMessageSpy = jest.spyOn(window, 'postMessage').mockImplementation((message: any) => {
        if (message?.type === MessageEventType.SDK_TRIGGER_ANGIE) {
          window.dispatchEvent(new MessageEvent('message', {
            data: {
              type: MessageEventType.SDK_TRIGGER_ANGIE_RESPONSE,
              payload: {
                success: true,
                requestId: message.payload.requestId,
              },
            },
          }));
        }
      });
      mockAngieDetector.isReady.mockReturnValue(true);

      await sdk.triggerAngie({
        contextAttachment,
        context: {
          source: 'checkout-plugin',
          pageUrl: 'https://example.com/checkout',
          pageTitle: 'Checkout',
        },
      });

      const triggerMessage = postMessageSpy.mock.calls.find(
        ([message]) => message.type === MessageEventType.SDK_TRIGGER_ANGIE
      )?.[0];

      expect(triggerMessage.payload.triggerToken).toBe('test-trigger-token');

      postMessageSpy.mockRestore();
    });
  });
});
