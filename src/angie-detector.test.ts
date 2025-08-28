import { describe, expect, it, beforeEach, jest, afterEach } from '@jest/globals';
import { AngieDetector } from './angie-detector';
import type { AngieDetectionResult } from './types';

// Mock MessageChannel
const mockPort = {
  onmessage: null as any,
  postMessage: jest.fn(),
  close: jest.fn(),
};

const mockChannel = {
  port1: mockPort,
  port2: mockPort,
};

jest.mock('@modelcontextprotocol/sdk/types.js', () => ({
  MessageEventType: {
    SDK_ANGIE_READY_PING: 'sdk-angie-ready-ping',
  },
}));

describe('AngieDetector', () => {
  let detector: AngieDetector;
  let originalWindow: any;
  let originalMessageChannel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    
    // Store original globals
    originalWindow = global.window;
    originalMessageChannel = global.MessageChannel;
    
    // Mock window object
    global.window = {
      postMessage: jest.fn(),
      location: { origin: 'http://localhost:3000' },
    } as any;

    // Mock MessageChannel
    global.MessageChannel = jest.fn(() => mockChannel) as any;
  });

  afterEach(() => {
    jest.useRealTimers();
    // Restore original globals
    global.window = originalWindow;
    global.MessageChannel = originalMessageChannel;
  });

  describe('constructor', () => {
    it('should initialize with correct state', () => {
      // Act
      detector = new AngieDetector();

      // Assert
      expect(detector.isReady()).toBe(false);
    });

    it('should set up ping mechanism in browser environment', () => {
      // Act
      detector = new AngieDetector();

      // Assert
      expect(global.window.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sdk-angie-ready-ping',
          timestamp: expect.any(Number),
        }),
        'http://localhost',
        expect.any(Array)
      );
    });

    it('should not set up ping mechanism in non-browser environment', () => {
      // Arrange
      global.window = undefined as any;

      // Act
      detector = new AngieDetector();

      // Assert
      expect(detector.isReady()).toBe(false);
    });
  });

  describe('isReady', () => {
    it('should return true after Angie is detected', () => {
      // Arrange
      detector = new AngieDetector();

      // Act
      if (mockPort.onmessage) {
        mockPort.onmessage({
          data: {
            version: '1.0.0',
            capabilities: ['tool1', 'tool2'],
          },
        });
      }

      // Assert
      expect(detector.isReady()).toBe(true);
    });
  });

  describe('waitForReady', () => {
    it('should resolve when Angie is detected', async () => {
      // Arrange
      detector = new AngieDetector();

      // Act
      const promise = detector.waitForReady();
      
      // Simulate Angie ready response
      if (mockPort.onmessage) {
        mockPort.onmessage({
          data: {
            version: '1.0.0',
            capabilities: ['tool1', 'tool2'],
          },
        });
      }
      jest.runAllTimers(); // Fast-forward timers

      const result = await promise;

      // Assert
      expect(result).toEqual({
        isReady: true,
        version: '1.0.0',
        capabilities: ['tool1', 'tool2'],
      });
    });

    it('should resolve with timeout result when Angie is not detected', async () => {
      // Arrange
      detector = new AngieDetector();

      // Act
      const promise = detector.waitForReady();
      
      // Fast-forward time to trigger timeout
      jest.advanceTimersByTime(500 * 500); // 500 attempts * 500ms

      const result = await promise;

      // Assert
      expect(result).toEqual({
        isReady: false,
      });
    });

    it('should handle multiple waitForReady calls', async () => {
      // Arrange
      detector = new AngieDetector();

      // Act
      const promise1 = detector.waitForReady();
      const promise2 = detector.waitForReady();
      
      // Simulate Angie ready response
      if (mockPort.onmessage) {
        mockPort.onmessage({
          data: {
            version: '1.0.0',
            capabilities: ['tool1'],
          },
        });
      }
      jest.runAllTimers(); // Fast-forward timers

      const result1 = await promise1;
      const result2 = await promise2;

      // Assert
      expect(result1).toEqual({
        isReady: true,
        version: '1.0.0',
        capabilities: ['tool1'],
      });
      expect(result2).toEqual({
        isReady: true,
        version: '1.0.0',
        capabilities: ['tool1'],
      });
    });
  });

  describe('ping mechanism', () => {
    it('should send pings at correct intervals', () => {
      // Arrange
      detector = new AngieDetector();

      // Act
      jest.advanceTimersByTime(500); // First ping
      jest.advanceTimersByTime(500); // Second ping
      jest.advanceTimersByTime(500); // Third ping

      // Assert
      expect(global.window.postMessage).toHaveBeenCalledTimes(4); // Initial + 3 pings
    });

    it('should stop pinging after Angie is detected', () => {
      // Arrange
      detector = new AngieDetector();

      // Act
      // Simulate Angie ready response
      if (mockPort.onmessage) {
        mockPort.onmessage({
          data: {
            version: '1.0.0',
            capabilities: ['tool1'],
          },
        });
      }

      // Continue pinging after detection
      jest.advanceTimersByTime(500);
      jest.advanceTimersByTime(500);

      // Assert
      const callCount = (global.window.postMessage as jest.Mock).mock.calls.length;
      expect(callCount).toBeLessThanOrEqual(2); // Should not continue pinging
    });

    it('should stop pinging after max attempts', () => {
      // Arrange
      detector = new AngieDetector();

      // Act
      // Fast-forward to exceed max attempts (500)
      jest.advanceTimersByTime(500 * 500);

      // Assert
      expect(global.window.postMessage).toHaveBeenCalledTimes(500);
      
      // Additional pings should not be sent
      jest.advanceTimersByTime(500);
      expect(global.window.postMessage).toHaveBeenCalledTimes(500);
    });
  });
}); 