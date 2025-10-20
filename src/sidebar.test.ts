import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { 
  initAngieSidebar, 
  loadWidth, 
  getAngieSidebarSavedState,
  ANGIE_SIDEBAR_STATE_OPEN,
  ANGIE_SIDEBAR_STATE_CLOSED,
} from './sidebar';

// CSS is mocked globally in setupTests.ts

// Mock dependencies
jest.mock('./angie-iframe-utils', () => ({
  postMessageToAngieIframe: jest.fn(),
}));

jest.mock('./iframe', () => ({
  MessageEventType: {
    ANGIE_SIDEBAR_TOGGLED: 'angie-sidebar-toggled',
    ANGIE_SIDEBAR_RESIZED: 'angie-sidebar-resized',
  },
}));

jest.mock('./utils', () => ({
  waitForDocumentReady: jest.fn().mockImplementation(() => Promise.resolve()),
}));

describe('sidebar', () => {
  let mockLocalStorage: { [key: string]: string };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock localStorage
    mockLocalStorage = {};
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
        setItem: jest.fn((key: string, value: string) => {
          mockLocalStorage[key] = value;
        }),
      },
      writable: true,
    });

    // Mock console methods
    global.console.warn = jest.fn();

    // Mock document
    if (!document.head) {
      Object.defineProperty(document, 'head', {
        value: document.createElement('head'),
        writable: true,
      });
    }
    if (!document.body) {
      Object.defineProperty(document, 'body', {
        value: document.createElement('body'),
        writable: true,
      });
    }
    
    // Reset document
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    document.body.className = '';

    // Clear global state
    delete (global.window as any).initAngieSidebar;
    delete (global.window as any).toggleAngieSidebar;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.head.innerHTML = '';
    document.body.innerHTML = '';
    document.body.className = '';
  });

  describe('loadWidth', () => {
    it('should return saved width when valid', () => {
      mockLocalStorage['angie_sidebar_width'] = '350';
      expect(loadWidth()).toBe(350);
    });

    it('should return default width when no saved width exists', () => {
      expect(loadWidth()).toBe(370); // DEFAULT_WIDTH
    });
  });

  describe('getAngieSidebarSavedState', () => {
    it('should return saved state when it exists', () => {
      mockLocalStorage['angie_sidebar_state'] = ANGIE_SIDEBAR_STATE_CLOSED;
      expect(getAngieSidebarSavedState()).toBe(ANGIE_SIDEBAR_STATE_CLOSED);
    });

    it('should return null when no saved state exists', () => {
      expect(getAngieSidebarSavedState()).toBeNull();
    });
  });

  describe('initAngieSidebar', () => {
    beforeEach(() => {
      // Create sidebar container
      const sidebarContainer = document.createElement('div');
      sidebarContainer.id = 'angie-sidebar-container';
      document.body.appendChild(sidebarContainer);
    });

    it('should inject CSS when initialized', () => {
      initAngieSidebar();
      
      const styleElement = document.getElementById('angie-sidebar-styles');
      expect(styleElement).toBeTruthy();
      expect(styleElement?.textContent).toContain('angie-sidebar');
    });

    it('should set up window.toggleAngieSidebar', () => {
      initAngieSidebar();
      
      expect((global.window as any).toggleAngieSidebar).toBeDefined();
      expect(typeof (global.window as any).toggleAngieSidebar).toBe('function');
    });
  });

  describe('sidebar functionality', () => {
    beforeEach(() => {
      const sidebarContainer = document.createElement('div');
      sidebarContainer.id = 'angie-sidebar-container';
      document.body.appendChild(sidebarContainer);
    });

    it('should set up sidebar functionality when initialized', () => {
      expect(() => initAngieSidebar()).not.toThrow();
      expect((global.window as any).toggleAngieSidebar).toBeDefined();
    });

    it('should call custom onToggle callback when provided', () => {
      const mockOnToggle = jest.fn();
      initAngieSidebar(mockOnToggle);
      
      const toggleFunction = (global.window as any).toggleAngieSidebar;
      expect(toggleFunction).toBeDefined();
      
      toggleFunction(true);
      
      expect(mockOnToggle).toHaveBeenCalledWith(
        true,
        expect.any(Object),
        undefined
      );
    });
  });
});