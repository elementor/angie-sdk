import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { toggleAngieSidebar, isMobile, sendSuccessMessage, sendErrorMessage, waitForDocumentReady, isSafeUrl, isFromIframe, isTrustedIframeMessage } from './utils';

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

    it('should target the given container instead of the shared default', () => {
      const otherContainer = document.createElement('div');
      otherContainer.id = 'container-b';
      document.body.appendChild(otherContainer);

      toggleAngieSidebar(mockIframe, false, 'container-b');

      expect(otherContainer.getAttribute('aria-hidden')).toBe('true');
      expect(mockSidebarContainer.hasAttribute('aria-hidden')).toBe(false);
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

  describe('isFromIframe', () => {
    it('should return true when event.source is the iframe contentWindow', () => {
      const fakeWindow = {} as Window;
      const iframe = { contentWindow: fakeWindow } as HTMLIFrameElement;
      const event = { source: fakeWindow } as MessageEvent;

      expect(isFromIframe(event, iframe)).toBe(true);
    });

    it('should return false when event.source is a different window', () => {
      const fakeWindow = {} as Window;
      const otherWindow = {} as Window;
      const iframe = { contentWindow: fakeWindow } as HTMLIFrameElement;
      const event = { source: otherWindow } as MessageEvent;

      expect(isFromIframe(event, iframe)).toBe(false);
    });

    it('should return false when iframe is null', () => {
      const event = { source: {} as Window } as MessageEvent;

      expect(isFromIframe(event, null)).toBe(false);
    });

    it('should return false when event.source is missing/null', () => {
      const fakeWindow = {} as Window;
      const iframe = { contentWindow: fakeWindow } as HTMLIFrameElement;
      const event = { source: null } as MessageEvent;

      expect(isFromIframe(event, iframe)).toBe(false);
    });
  });

  describe('isTrustedIframeMessage', () => {
    const iframeOrigin = 'https://angie.elementor.com';

    it('should return true when origin matches and source is the iframe window', () => {
      const fakeWindow = {} as Window;
      const iframe = { contentWindow: fakeWindow } as HTMLIFrameElement;
      const event = { origin: iframeOrigin, source: fakeWindow } as MessageEvent;

      expect(isTrustedIframeMessage(event, iframeOrigin, iframe)).toBe(true);
    });

    it('should return false when origin mismatches even if source matches', () => {
      const fakeWindow = {} as Window;
      const iframe = { contentWindow: fakeWindow } as HTMLIFrameElement;
      const event = { origin: 'https://evil.com', source: fakeWindow } as MessageEvent;

      expect(isTrustedIframeMessage(event, iframeOrigin, iframe)).toBe(false);
    });

    it('should return false when origin matches but source is a different window', () => {
      const fakeWindow = {} as Window;
      const otherWindow = {} as Window;
      const iframe = { contentWindow: fakeWindow } as HTMLIFrameElement;
      const event = { origin: iframeOrigin, source: otherWindow } as MessageEvent;

      expect(isTrustedIframeMessage(event, iframeOrigin, iframe)).toBe(false);
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
