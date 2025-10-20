import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { toggleAngieSidebar, isMobile, sendSuccessMessage, sendErrorMessage, waitForDocumentReady, isSafeUrl } from './utils';

describe('utils', () => {
  let mockIframe: HTMLIFrameElement;
  let mockSidebarContainer: HTMLDivElement;

  beforeEach(() => {
    // Mock DOM elements
    mockIframe = document.createElement('iframe');
    mockSidebarContainer = document.createElement('div');
    mockSidebarContainer.id = 'angie-sidebar-container';
    
    // Setup DOM
    document.body.appendChild(mockIframe);
    document.body.appendChild(mockSidebarContainer);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('toggleAngieSidebar', () => {
    it('should set aria-hidden and tabindex correctly when toggling sidebar', () => {
      toggleAngieSidebar(mockIframe, true);
      expect(mockSidebarContainer.getAttribute('aria-hidden')).toBe('false');
      expect(mockIframe.hasAttribute('tabindex')).toBe(false);

      toggleAngieSidebar(mockIframe, false);
      expect(mockSidebarContainer.getAttribute('aria-hidden')).toBe('true');
      expect(mockIframe.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('isMobile', () => {
    it('should detect mobile vs desktop screen widths', () => {
      Object.defineProperty(window, 'screen', {
        value: { availWidth: 768 },
        writable: true,
      });
      expect(isMobile()).toBe(true);

      Object.defineProperty(window, 'screen', {
        value: { availWidth: 1024 },
        writable: true,
      });
      expect(isMobile()).toBe(false);
    });
  });

  describe('sendSuccessMessage', () => {
    it('should send success message', () => {
      const mockPort = {
        postMessage: jest.fn(),
      } as unknown as MessagePort;
      const payload = { data: 'test' };

      sendSuccessMessage(mockPort, payload);

      expect(mockPort.postMessage).toHaveBeenCalledWith({
        status: 'success',
        payload,
      });
    });
  });

  describe('sendErrorMessage', () => {
    it('should send error message', () => {
      const mockPort = {
        postMessage: jest.fn(),
      } as unknown as MessagePort;
      const error = new Error('Test error');

      sendErrorMessage(mockPort, error);

      expect(mockPort.postMessage).toHaveBeenCalledWith({
        status: 'error',
        payload: error,
      });
    });
  });

  describe('waitForDocumentReady', () => {
    it('should resolve when document is ready', async () => {
      Object.defineProperty(document, 'readyState', {
        value: 'complete',
        writable: true,
      });

      await expect(waitForDocumentReady()).resolves.toBeNull();
    });
  });

  describe('isSafeUrl', () => {
    const mockOrigin = 'https://example.com';
  
    it('allows same-origin HTTP URLs', () => {
      expect(isSafeUrl(`${mockOrigin}/page`, [mockOrigin])).toBe(true);
    });
  
    it('blocks cross-origin URLs', () => {
      expect(isSafeUrl('https://evil.com', [mockOrigin])).toBe(false);
    });
  
    it('blocks javascript: protocol', () => {
      expect(isSafeUrl('javascript:alert(1)', [mockOrigin])).toBe(false);
    });
  
    it('blocks data: protocol', () => {
      expect(isSafeUrl('data:text/html,<script>alert(1)</script>', [mockOrigin])).toBe(false);
    });
  });
});
