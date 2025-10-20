import { describe, expect, it, beforeEach, jest, afterEach } from '@jest/globals';
import { AngieMcpSdk } from './angie-mcp-sdk';
import type { AngieServerConfig, ServerRegistration, AngieDetectionResult, ClientCreationResponse } from './types';
import { AngieServerType } from './types';

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
      processQueue: jest.fn(),
      updateStatus: jest.fn(),
      clear: jest.fn(),
    };

    mockClientManager = {
      requestClientCreation: jest.fn(),
    };

    mockBrowserContextTransport = jest.fn().mockImplementation(() => ({}));

    // Mock sidebar and iframe functions
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

  describe('loadSidebar', () => {
    it('should call initAngieSidebar and openIframe with default options', async () => {
      // Act
      await sdk.loadSidebar();

      // Assert
      expect(mockInitAngieSidebar).toHaveBeenCalledTimes(1);
      expect(mockOpenIframe).toHaveBeenCalledTimes(1);
      expect(mockOpenIframe).toHaveBeenCalledWith({
        origin: 'https://angie.elementor.com',
        uiTheme: 'light',
        isRTL: false,
      });
    });

    it('should call initAngieSidebar and openIframe with custom options', async () => {
      // Arrange
      const customOptions = {
        origin: 'https://custom-origin.example.com',
        uiTheme: 'dark',
        isRTL: true,
      };

      // Act
      await sdk.loadSidebar(customOptions);

      // Assert
      expect(mockInitAngieSidebar).toHaveBeenCalledTimes(1);
      expect(mockOpenIframe).toHaveBeenCalledTimes(1);
      expect(mockOpenIframe).toHaveBeenCalledWith({
        origin: 'https://custom-origin.example.com',
        uiTheme: 'dark',
        isRTL: true,
      });
    });
  });
}); 