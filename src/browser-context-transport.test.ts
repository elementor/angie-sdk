import { describe, expect, it, beforeEach, jest, afterEach } from '@jest/globals';
import { BrowserContextTransport } from './browser-context-transport';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';

describe('BrowserContextTransport', () => {
  let mockPort: any;
  let transport: BrowserContextTransport;
  let originalCrypto: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPort = {
      onmessage: null,
      onmessageerror: null,
      postMessage: jest.fn(),
      start: jest.fn(),
      close: jest.fn(),
    };

    // Store original crypto
    originalCrypto = global.crypto;
  });

  afterEach(() => {
    if (transport) {
      transport.close().catch(() => {});
    }
    // Restore original crypto
    global.crypto = originalCrypto;
  });

  describe('constructor', () => {
    it('should throw error when MessagePort is not provided', () => {
      // Act & Assert
      expect(() => {
        new BrowserContextTransport(null as any);
      }).toThrow('MessagePort is required');
    });

    it('should set up message event listeners', () => {
      // Act
      transport = new BrowserContextTransport(mockPort);

      // Assert
      expect(mockPort.onmessage).toBeDefined();
      expect(mockPort.onmessageerror).toBeDefined();
    });
  });

  describe('start', () => {
    it('should start the transport successfully', async () => {
      // Arrange
      transport = new BrowserContextTransport(mockPort);

      // Act
      await transport.start();

      // Assert
      expect(mockPort.start).toHaveBeenCalled();
    });

    it('should throw error when already started', async () => {
      // Arrange
      transport = new BrowserContextTransport(mockPort);
      await transport.start();

      // Act & Assert
      await expect(transport.start()).rejects.toThrow(
        'BrowserContextTransport already started! If using Client or Server class, note that connect() calls start() automatically.'
      );
    });

    it('should throw error when transport is closed', async () => {
      // Arrange
      transport = new BrowserContextTransport(mockPort);
      await transport.close();

      // Act & Assert
      await expect(transport.start()).rejects.toThrow(
        'Cannot start a closed BrowserContextTransport'
      );
    });
  });

  describe('send', () => {
    it('should send message successfully', async () => {
      // Arrange
      transport = new BrowserContextTransport(mockPort);
      const message: JSONRPCMessage = {
        jsonrpc: '2.0',
        id: '1',
        method: 'test',
        params: { data: 'test' },
      };

      // Act
      await transport.send(message);

      // Assert
      expect(mockPort.postMessage).toHaveBeenCalledWith(message);
    });

    it('should throw error when transport is closed', async () => {
      // Arrange
      transport = new BrowserContextTransport(mockPort);
      await transport.close();
      
      const message: JSONRPCMessage = {
        jsonrpc: '2.0',
        id: '1',
        method: 'test',
        params: {},
      };

      // Act & Assert
      await expect(transport.send(message)).rejects.toThrow(
        'Cannot send on a closed BrowserContextTransport'
      );
    });

    it('should handle postMessage errors', async () => {
      // Arrange
      transport = new BrowserContextTransport(mockPort);
      const error = new Error('PostMessage error');
      mockPort.postMessage.mockImplementation(() => {
        throw error;
      });

      const message: JSONRPCMessage = {
        jsonrpc: '2.0',
        id: '1',
        method: 'test',
        params: {},
      };

      // Act & Assert
      await expect(transport.send(message)).rejects.toThrow('PostMessage error');
    });
  });

  describe('close', () => {
    it('should close transport successfully', async () => {
      // Arrange
      transport = new BrowserContextTransport(mockPort);

      // Act
      await transport.close();

      // Assert
      expect(mockPort.close).toHaveBeenCalled();
    });

    it('should call onclose callback when defined', async () => {
      // Arrange
      transport = new BrowserContextTransport(mockPort);
      const oncloseMock = jest.fn();
      transport.onclose = oncloseMock;

      // Act
      await transport.close();

      // Assert
      expect(oncloseMock).toHaveBeenCalled();
    });
  });

  describe('message handling', () => {
    it('should handle valid JSON-RPC messages', () => {
      // Arrange
      transport = new BrowserContextTransport(mockPort);
      const onmessageMock = jest.fn();
      transport.onmessage = onmessageMock;

      const message: JSONRPCMessage = {
        jsonrpc: '2.0',
        id: '1',
        method: 'test',
        params: { data: 'test' },
      };

      // Act
      if (mockPort.onmessage) {
        mockPort.onmessage({ data: message });
      }

      // Assert
      expect(onmessageMock).toHaveBeenCalledWith(message);
    });

    it('should handle message parsing errors', () => {
      // Arrange
      transport = new BrowserContextTransport(mockPort);
      const onerrorMock = jest.fn();
      transport.onerror = onerrorMock;

      // Act
      if (mockPort.onmessage) {
        mockPort.onmessage({ data: 'invalid-json' });
      }

      // Assert
      expect(onerrorMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Failed to parse message'),
        })
      );
    });

    it('should handle message port errors', () => {
      // Arrange
      transport = new BrowserContextTransport(mockPort);
      const onerrorMock = jest.fn();
      transport.onerror = onerrorMock;

      // Act
      if (mockPort.onmessageerror) {
        mockPort.onmessageerror({ error: 'port error' });
      }

      // Assert
      expect(onerrorMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('MessagePort error'),
        })
      );
    });
  });

  describe('edge cases', () => {
    it('should handle rapid message sending', async () => {
      // Arrange
      transport = new BrowserContextTransport(mockPort);
      const messages: JSONRPCMessage[] = [
        { jsonrpc: '2.0', id: '1', method: 'test1' },
        { jsonrpc: '2.0', id: '2', method: 'test2' },
        { jsonrpc: '2.0', id: '3', method: 'test3' },
      ];

      // Act
      await Promise.all(messages.map(msg => transport.send(msg)));

      // Assert
      expect(mockPort.postMessage).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent close operations', async () => {
      // Arrange
      transport = new BrowserContextTransport(mockPort);

      // Act
      await Promise.all([
        transport.close(),
        transport.close(),
        transport.close(),
      ]);

      // Assert
      expect(mockPort.close).toHaveBeenCalledTimes(1);
    });
  });
}); 