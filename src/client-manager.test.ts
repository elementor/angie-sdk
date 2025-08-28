import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { ClientManager } from './client-manager';
import { type ServerRegistration, type ClientCreationResponse, AngieMCPTransport } from './types';

describe('ClientManager', () => {
  let clientManager: ClientManager;
  let mockRegistration: ServerRegistration & { instanceId?: string };

  beforeEach(() => {
    // Use fake timers for precise time control
    jest.useFakeTimers();
    
    // Clear all mocks before each test
    jest.clearAllMocks();
    
    clientManager = new ClientManager();
    mockRegistration = {
      id: 'server_123',
      config: {
        name: 'test-server',
        version: '1.0.0',
        description: 'Test server description',
        server: {} as any,
        capabilities: {},
      },
      timestamp: Date.now(),
      status: 'pending',
      instanceId: 'test-instance-123',
    };
  });

  afterEach(() => {
    // Restore real timers after each test
    jest.useRealTimers();
  });

  // Helper functions
  const setupMockMessageChannel = () => {
    const mockPort = {
      onmessage: null as ((this: MessagePort, ev: MessageEvent) => any) | null,
      postMessage: jest.fn(),
      start: jest.fn(),
      close: jest.fn(),
    };
    
    const mockChannel = {
      port1: mockPort,
      port2: mockPort,
    };
    
    (global.MessageChannel as jest.Mock).mockImplementation(() => mockChannel);
    
    return { mockPort, mockChannel };
  };

  const simulateClientCreationResponse = (mockPort: any, response: any, delay = 0): void => {
    setTimeout(() => {
      if (mockPort.onmessage) {
        mockPort.onmessage({ data: response } as MessageEvent);
      }
    }, delay);
  };

  const expectPostMessageCall = (expectedPayload: any) => {
    expect(global.window.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'sdk-request-client-creation',
        payload: expect.objectContaining(expectedPayload),
        timestamp: expect.any(Number),
      }),
      expect.any(String),
      expect.any(Array)
    );
  };

  describe('requestClientCreation', () => {
    it('should send correct message format', async () => {
      // Arrange
      const { mockPort } = setupMockMessageChannel();

      // Act
      const promise = clientManager.requestClientCreation(mockRegistration);
      
      // Simulate response - schedule the response, then advance timers
      simulateClientCreationResponse(mockPort, {
        success: true,
        clientId: 'client_123',
      });

      // Advance timers to trigger the response
      jest.runAllTimers();

      const response = await promise;

      // Assert
      expect(response.success).toBe(true);
      expect(response.clientId).toBe('client_123');
      expectPostMessageCall({
        serverId: 'server_123',
        serverName: 'test-server',
        serverVersion: '1.0.0',
        description: 'Test server description',
        transport: AngieMCPTransport.POST_MESSAGE,
        capabilities: {},
        instanceId: 'test-instance-123',
      });
    });

    it('should handle failed client creation response', async () => {
      // Arrange
      const { mockPort } = setupMockMessageChannel();

      // Act
      const promise = clientManager.requestClientCreation(mockRegistration);
      
      // Simulate error response - schedule the response, then advance timers
      simulateClientCreationResponse(mockPort, {
        success: false,
        error: 'Client creation failed',
      });

      // Advance timers to trigger the response
      jest.runAllTimers();

      const response = await promise;

      // Assert
      expect(response).toEqual({
        success: false,
        error: 'Client creation failed',
      });
    });

    it('should timeout after 15 seconds if no response received', async () => {
      // Arrange
      const { mockPort } = setupMockMessageChannel();

      // Act
      const promise = clientManager.requestClientCreation(mockRegistration);
      
      // Fast-forward time to trigger timeout (15 seconds = 15000ms)
      jest.advanceTimersByTime(15_000);

      // Assert
      await expect(promise)
        .rejects
        .toThrow('Client creation request timed out after 15000ms');
    });

    it('should handle multiple concurrent client creation requests', async () => {
      // Arrange
      const setupMockPortForRequest = () => {
        const mockPort = {
          onmessage: null as ((this: MessagePort, ev: MessageEvent) => any) | null,
          postMessage: jest.fn(),
          start: jest.fn(),
          close: jest.fn(),
        };
        
        const mockChannel = {
          port1: mockPort,
          port2: mockPort,
        };
        
        return { mockPort, mockChannel };
      };

      const { mockPort: mockPort1, mockChannel: mockChannel1 } = setupMockPortForRequest();
      const { mockPort: mockPort2, mockChannel: mockChannel2 } = setupMockPortForRequest();
      const { mockPort: mockPort3, mockChannel: mockChannel3 } = setupMockPortForRequest();

      // Mock MessageChannel to return different channels for each call
      let callCount = 0;
      (global.MessageChannel as jest.Mock).mockImplementation(() => {
        const channels = [mockChannel1, mockChannel2, mockChannel3];
        return channels[callCount++] || mockChannel1;
      });

      const registration1 = { ...mockRegistration, id: 'server_1' };
      const registration2 = { ...mockRegistration, id: 'server_2' };
      const registration3 = { ...mockRegistration, id: 'server_3' };

      // Act
      const promise1 = clientManager.requestClientCreation(registration1);
      const promise2 = clientManager.requestClientCreation(registration2);
      const promise3 = clientManager.requestClientCreation(registration3);

      // Simulate responses with different delays
      simulateClientCreationResponse(mockPort1, { success: true, clientId: 'client_1' }, 10);
      simulateClientCreationResponse(mockPort2, { success: true, clientId: 'client_2' }, 5);
      simulateClientCreationResponse(mockPort3, { success: false, error: 'Failed' }, 15);

      // Advance time to trigger all responses (advance to the maximum delay)
      jest.advanceTimersByTime(15);

      const [response1, response2, response3] = await Promise.all([promise1, promise2, promise3]);

      // Assert
      expect(response1).toEqual({ success: true, clientId: 'client_1' });
      expect(response2).toEqual({ success: true, clientId: 'client_2' });
      expect(response3).toEqual({ success: false, error: 'Failed' });
    });
  });
}); 