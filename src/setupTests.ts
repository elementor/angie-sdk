// Mock MessageChannel and window.postMessage
global.MessageChannel = jest.fn().mockImplementation(() => ({
  port1: {
    onmessage: null,
    postMessage: jest.fn(),
    start: jest.fn(),
    close: jest.fn(),
  },
  port2: {
    onmessage: null,
    postMessage: jest.fn(),
    start: jest.fn(),
    close: jest.fn(),
  },
}));

global.window.postMessage = jest.fn();

// Mock crypto API for session ID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'mock-uuid-123'),
  },
  writable: true,
});

// Mock console methods to reduce noise in tests
global.console.log = jest.fn();
global.console.warn = jest.fn();
global.console.error = jest.fn(); 