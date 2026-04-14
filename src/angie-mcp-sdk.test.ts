import { describe, expect, it, beforeEach, jest, afterEach } from '@jest/globals';
import { AngieMcpSdk } from './angie-mcp-sdk';
import type { AngieServerConfig, ServerRegistration, AngieDetectionResult, ClientCreationResponse } from './types';
import { AngieServerType } from './types';

// Mock dependencies
jest.mock('./angie-detector');
jest.mock('./registration-queue');
jest.mock('./client-manager');
jest.mock('./browser-context-transport');
jest.mock('./angie-iframe-utils', () => ({
  postMessageToAngieIframe: jest.fn(),
}));
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

describe('AngieMcpSdk', () => {
  let sdk: AngieMcpSdk;
  let mockAngieDetector: any;
  let mockRegistrationQueue: any;
  let mockClientManager: any;
  let mockBrowserContextTransport: any;
  let mockInitAngieSidebar: any;
  let mockOpenIframe: any;
  let mockPostMessageToAngieIframe: any;
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
      processQueue: jest.fn(),
      updateStatus: jest.fn(),
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
    mockPostMessageToAngieIframe = require('./angie-iframe-utils').postMessageToAngieIframe as jest.MockedFunction<any>;

    // Mock the constructors
    (require('./angie-detector') as any).AngieDetector.mockImplementation(() => mockAngieDetector);
    (require('./registration-queue') as any).RegistrationQueue.mockImplementation(() => mockRegistrationQueue);
    (require('./client-manager') as any).ClientManager.mockImplementation(() => mockClientManager);
    (require('./browser-context-transport') as any).BrowserContextTransport = mockBrowserContextTransport;

    // Set up mock return values before constructor
    mockAngieDetector.waitForReady.mockResolvedValue({ isReady: false });
    mockAngieDetector.isReady.mockReturnValue(false);
    mockRegistrationQueue.getAll.mockReturnValue([]);
    mockRegistrationQueue.processQueue.mockResolvedValue(undefined);
    mockClientManager.requestClientCreation.mockResolvedValue({
      success: true,
      clientId: 'client_123',
    });

    sdk = new AngieMcpSdk();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    addEventListenerSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should set up message event listeners', () => {
      // Assert
      expect(global.window.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });

  describe('registerServer', () => {
    const mockServerConfig: AngieServerConfig = {
      name: 'test-server',
      version: '1.0.0',
      description: 'Test server',
      server: {} as any, // Mock server instance
      type: AngieServerType.LOCAL,
    };

    it('should register server successfully when Angie is ready', async () => {
      // Arrange
      mockAngieDetector.isReady.mockReturnValue(true);
      mockRegistrationQueue.add.mockReturnValue({
        id: 'reg_123',
        config: mockServerConfig,
        timestamp: Date.now(),
        status: 'pending',
      });

      // Act
      await sdk.registerServer(mockServerConfig);

      // Assert
      expect(mockRegistrationQueue.add).toHaveBeenCalledWith(mockServerConfig);
      expect(mockClientManager.requestClientCreation).toHaveBeenCalled();
      expect(mockRegistrationQueue.updateStatus).toHaveBeenCalledWith('reg_123', 'registered');
    });

    it('should queue server when Angie is not ready', async () => {
      // Arrange
      mockAngieDetector.isReady.mockReturnValue(false);
      mockRegistrationQueue.add.mockReturnValue({
        id: 'reg_123',
        config: mockServerConfig,
        timestamp: Date.now(),
        status: 'pending',
      });

      // Act
      await sdk.registerServer(mockServerConfig);

      // Assert
      expect(mockRegistrationQueue.add).toHaveBeenCalledWith(mockServerConfig);
      expect(mockClientManager.requestClientCreation).not.toHaveBeenCalled();
    });

    it('should throw error when server instance is missing', async () => {
      // Arrange
      const invalidConfig = {
        ...mockServerConfig,
        server: undefined,
      };

      // Act & Assert
      await expect(sdk.registerServer(invalidConfig as any)).rejects.toThrow(
        'Server instance is required'
      );
    });



    it('should handle registration errors', async () => {
      // Arrange
      mockAngieDetector.isReady.mockReturnValue(true);
      mockRegistrationQueue.add.mockReturnValue({
        id: 'reg_123',
        config: mockServerConfig,
        timestamp: Date.now(),
        status: 'pending',
      });
      mockClientManager.requestClientCreation.mockRejectedValue(new Error('Registration failed'));

      // Act & Assert
      await expect(sdk.registerServer(mockServerConfig)).rejects.toThrow('Registration failed');
      expect(mockRegistrationQueue.updateStatus).toHaveBeenCalledWith('reg_123', 'failed', 'Registration failed');
    });
  });

  describe('isAngieReady', () => {
    it('should return Angie ready status', () => {
      // Arrange
      mockAngieDetector.isReady.mockReturnValue(true);

      // Act
      const result = sdk.isAngieReady();

      // Assert
      expect(result).toBe(true);
      expect(mockAngieDetector.isReady).toHaveBeenCalled();
    });
  });

  describe('isReady', () => {
    it('should return initialization status', () => {
      // Act
      const result = sdk.isReady();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('waitForReady', () => {
    it('should wait for Angie and initialization', async () => {
      // Arrange
      mockAngieDetector.waitForReady.mockResolvedValue({ isReady: true });

      // Act
      const promise = sdk.waitForReady();
      
      // Simulate initialization completion
      setTimeout(() => {
        // This would normally be set by handleAngieReady
        (sdk as any).isInitialized = true;
      }, 0);

      await promise;

      // Assert
      expect(mockAngieDetector.waitForReady).toHaveBeenCalled();
    });

    it('should throw error when Angie is not available', async () => {
      // Arrange
      mockAngieDetector.waitForReady.mockResolvedValue({ isReady: false });

      // Act & Assert
      await expect(sdk.waitForReady()).rejects.toThrow('Angie is not available');
    });
  });

  describe('destroy', () => {
    it('should clear registration queue', () => {
      // Act
      sdk.destroy();

      // Assert
      expect(mockRegistrationQueue.clear).toHaveBeenCalled();
    });
  });

  describe('message handling', () => {
    let messageHandler: (event: MessageEvent<any>) => void;

    beforeEach(() => {
      // Extract the message handler that was registered
      const calls = addEventListenerSpy.mock.calls;
      
      // Find the message event handler from the SDK constructor call
      const messageCall = calls.find((call: any[]) => call[0] === 'message');
      messageHandler = messageCall?.[1] as (event: MessageEvent<any>) => void;
      
      // Ensure we have a valid message handler
      if (!messageHandler) {
        throw new Error('Message handler not found in addEventListener calls');
      }
    });

    it('should handle server init request', () => {
      // Arrange
      const mockPort = {
        postMessage: jest.fn(),
      };

      const mockServer = {
        connect: jest.fn(),
      };

      const mockRegistration: ServerRegistration = {
        id: 'server_123',
        config: {
          name: 'test-server',
          version: '1.0.0',
          description: 'Test server',
          server: mockServer as any,
        },
        timestamp: Date.now(),
        status: 'registered',
      };

      mockRegistrationQueue.getAll.mockReturnValue([mockRegistration]);

      // Act
      const event = {
        data: {
          type: 'sdk-request-init-server',
          payload: {
            clientId: 'client_123',
            serverId: 'server_123',
          },
        },
        ports: [mockPort],
      } as unknown as MessageEvent<any>;

      messageHandler(event);

      // Assert
      expect(mockBrowserContextTransport).toHaveBeenCalledWith(mockPort);
      expect(mockServer.connect).toHaveBeenCalled();
    });



    it('should handle server init request with non-existent server', () => {
      // Arrange
      mockRegistrationQueue.getAll.mockReturnValue([]);

      // Act
      const event = {
        data: {
          type: 'sdk-request-init-server',
          payload: {
            clientId: 'client_123',
            serverId: 'non_existent_server',
          },
        },
        ports: [],
      } as unknown as MessageEvent<any>;

      messageHandler(event);

      // Assert
      expect(mockBrowserContextTransport).not.toHaveBeenCalled();
    });



    it('should handle server init request with server connection error', () => {
      // Arrange
      const mockPort = {
        postMessage: jest.fn(),
      };

      const mockServer = {
        connect: jest.fn().mockImplementation(() => {
          throw new Error('Connection failed');
        }),
      };

      const mockRegistration: ServerRegistration = {
        id: 'server_123',
        config: {
          name: 'test-server',
          version: '1.0.0',
          description: 'Test server',
          server: mockServer as any,
        },
        timestamp: Date.now(),
        status: 'registered',
      };

      mockRegistrationQueue.getAll.mockReturnValue([mockRegistration]);

      // Act
      const event = {
        data: {
          type: 'sdk-request-init-server',
          payload: {
            clientId: 'client_123',
            serverId: 'server_123',
          },
        },
        ports: [mockPort],
      } as unknown as MessageEvent<any>;

      messageHandler(event);

      // Assert
      expect(mockBrowserContextTransport).toHaveBeenCalledWith(mockPort);
      expect(mockServer.connect).toHaveBeenCalled();
    });

    it('should ignore non-server-init messages', () => {
      // Act
      const event = {
        data: {
          type: 'other-message-type',
          payload: {},
        },
        ports: [],
      } as unknown as MessageEvent<any>;

      messageHandler(event);

      // Assert
      expect(mockBrowserContextTransport).not.toHaveBeenCalled();
    });
  });

  describe('migrateInstructionsCompat (backward compatibility)', () => {
    it('should migrate instructions from serverInfo to _instructions when _instructions is absent', () => {
      const mockServer = {
        _serverInfo: { instructions: 'do the thing' },
      };

      (sdk as any).migrateInstructionsCompat(mockServer);

      expect(mockServer).toHaveProperty('_instructions', 'do the thing');
    });

    it('should NOT overwrite _instructions when it already exists', () => {
      const mockServer = {
        _serverInfo: { instructions: 'new instructions' },
        _instructions: 'original instructions',
      };

      (sdk as any).migrateInstructionsCompat(mockServer);

      expect((mockServer as any)._instructions).toBe('original instructions');
    });

    it('should do nothing when serverInfo has no instructions', () => {
      const mockServer: any = {
        _serverInfo: {},
      };

      (sdk as any).migrateInstructionsCompat(mockServer);

      expect(mockServer._instructions).toBeUndefined();
    });

    it('should do nothing when _serverInfo is absent', () => {
      const mockServer: any = {};

      (sdk as any).migrateInstructionsCompat(mockServer);

      expect(mockServer._instructions).toBeUndefined();
    });

    it('should operate on the nested server.server when present', () => {
      const innerServer: any = {
        _serverInfo: { instructions: 'nested instructions' },
      };
      const mockServer = {
        server: innerServer,
      };

      (sdk as any).migrateInstructionsCompat(mockServer);

      expect(innerServer._instructions).toBe('nested instructions');
    });

    it('should not throw when an unexpected error occurs (best-effort)', () => {
      const brokenServer = Object.create(null);
      Object.defineProperty(brokenServer, '_serverInfo', {
        get() { throw new Error('Unexpected access error'); },
      });

      expect(() => (sdk as any).migrateInstructionsCompat(brokenServer)).not.toThrow();
    });
  });

  describe('loadSidebar', () => {
    it('should call initAngieSidebar and openIframe with default options', async () => {
      // Act
      await sdk.loadSidebar();

      // Assert
      expect(mockInitAngieSidebar).toHaveBeenCalledTimes(1);
      expect(mockInitAngieSidebar).toHaveBeenCalledWith({
        skipDefaultCss: false,
      });
      expect(mockOpenIframe).toHaveBeenCalledTimes(1);
      expect(mockOpenIframe).toHaveBeenCalledWith({
        origin: 'https://angie.elementor.com',
        uiTheme: 'light',
        isRTL: false,
        containerId: 'angie-sidebar-container',
        skipDefaultCss: false,
        path: 'angie/wp-admin',
      });
    });

    it('should call initAngieSidebar and openIframe with custom options', async () => {
      // Arrange
      const customOptions = {
        origin: 'https://custom-origin.example.com',
        uiTheme: 'dark',
        isRTL: true,
        containerId: 'my-custom-container',
        skipDefaultCss: true,
      };

      // Act
      await sdk.loadSidebar(customOptions);

      // Assert
      expect(mockInitAngieSidebar).toHaveBeenCalledTimes(1);
      expect(mockInitAngieSidebar).toHaveBeenCalledWith({
        skipDefaultCss: true,
      });
      expect(mockOpenIframe).toHaveBeenCalledTimes(1);
      expect(mockOpenIframe).toHaveBeenCalledWith({
        origin: 'https://custom-origin.example.com',
        uiTheme: 'dark',
        isRTL: true,
        containerId: 'my-custom-container',
        skipDefaultCss: true,
        path: 'angie/wp-admin',
      });
    });

    it('should send widget config via postMessage when provided', async () => {
      // Arrange
      const widgetConfig = {
        title: 'Custom Title',
        subtitle: 'Custom Subtitle',
        promptLibrary: { enabled: false },
        fileUpload: { enabled: false },
        feedback: { enabled: false },
        featuredMcpServer: 'wp-search',
        suggestions: { items: [{ label: 'Search', value: 'search for' }] },
      };

      // Act
      await sdk.loadSidebar({ widgetConfig });

      // Assert
      expect(mockPostMessageToAngieIframe).toHaveBeenCalledWith({
        type: 'sdk-widget-config',
        payload: widgetConfig,
      });
    });

    it('should send widget config with modeSwitcher and closeButton via postMessage', async () => {
      // Arrange
      const widgetConfig = {
        title: 'Custom Title',
        modeSwitcher: { enabled: true, default: 'plan' as const },
        closeButton: 'collapse' as const,
      };

      // Act
      await sdk.loadSidebar({ widgetConfig });

      // Assert
      expect(mockPostMessageToAngieIframe).toHaveBeenCalledWith({
        type: 'sdk-widget-config',
        payload: widgetConfig,
      });
    });

    it('should not send widget config when not provided', async () => {
      // Act
      await sdk.loadSidebar();

      // Assert
      expect(mockPostMessageToAngieIframe).not.toHaveBeenCalled();
    });
  });

  describe('parseHashParams', () => {
    it('should parse prompt from hash', () => {
      const params = (sdk as any).parseHashParams('#angie-prompt=Hello%20world');
      expect(params.get('angie-prompt')).toBe('Hello world');
    });

    it('should parse prompt with newChat and autoSend', () => {
      const params = (sdk as any).parseHashParams('#angie-prompt=Fix%20error&angie-newChat=true&angie-autoSend=true');
      expect(params.get('angie-prompt')).toBe('Fix error');
      expect(params.get('angie-newChat')).toBe('true');
      expect(params.get('angie-autoSend')).toBe('true');
    });

    it('should return null for missing params', () => {
      const params = (sdk as any).parseHashParams('#angie-prompt=Hello');
      expect(params.get('angie-newChat')).toBeNull();
      expect(params.get('angie-autoSend')).toBeNull();
    });

    it('should handle hash without # prefix', () => {
      const params = (sdk as any).parseHashParams('angie-prompt=Test');
      expect(params.get('angie-prompt')).toBe('Test');
    });
  });

  describe('handlePromptHash', () => {
    let postMessageSpy: ReturnType<typeof jest.spyOn>;

    beforeEach(() => {
      postMessageSpy = jest.spyOn(window, 'postMessage').mockImplementation((message: any) => {
        if (message?.type === 'sdk-trigger-angie') {
          const responseEvent = new MessageEvent('message', {
            data: {
              type: 'sdk-trigger-angie-response',
              payload: {
                success: true,
                requestId: message.payload.requestId,
                response: 'Triggered',
              },
            },
          });
          window.dispatchEvent(responseEvent);
        }
      });
      mockAngieDetector.isReady.mockReturnValue(true);
      mockAngieDetector.waitForReady.mockResolvedValue({ isReady: true });
      (sdk as any).isInitialized = true;
    });

    afterEach(() => {
      window.location.hash = '';
      postMessageSpy.mockRestore();
    });

    it('should do nothing when hash has no angie-prompt', async () => {
      window.location.hash = '#other-param=value';

      await (sdk as any).handlePromptHash();

      expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it('should do nothing for empty prompt', async () => {
      window.location.hash = '#angie-prompt=';

      await (sdk as any).handlePromptHash();

      expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it('should trigger with newChat=true and autoSend=true when params are set', async () => {
      window.location.hash = '#angie-prompt=Fix%20error&angie-newChat=true&angie-autoSend=true';

      await (sdk as any).handlePromptHash();

      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sdk-trigger-angie',
          payload: expect.objectContaining({
            prompt: 'Fix error',
            options: expect.objectContaining({
              newChat: true,
              autoSend: true,
            }),
          }),
        }),
        expect.anything()
      );
    });

    it('should default newChat and autoSend to false when not in hash', async () => {
      window.location.hash = '#angie-prompt=Just%20a%20prompt';

      await (sdk as any).handlePromptHash();

      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sdk-trigger-angie',
          payload: expect.objectContaining({
            prompt: 'Just a prompt',
            options: expect.objectContaining({
              newChat: false,
              autoSend: false,
            }),
          }),
        }),
        expect.anything()
      );
    });

    it('should support newChat=true without autoSend', async () => {
      window.location.hash = '#angie-prompt=Hello&angie-newChat=true';

      await (sdk as any).handlePromptHash();

      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sdk-trigger-angie',
          payload: expect.objectContaining({
            prompt: 'Hello',
            options: expect.objectContaining({
              newChat: true,
              autoSend: false,
            }),
          }),
        }),
        expect.anything()
      );
    });

    it('should clear hash after successful trigger', async () => {
      window.location.hash = '#angie-prompt=Test&angie-newChat=true&angie-autoSend=true';

      await (sdk as any).handlePromptHash();

      expect(window.location.hash).toBe('');
    });
  });
}); 