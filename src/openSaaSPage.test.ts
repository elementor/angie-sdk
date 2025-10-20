import { describe, expect, it, beforeEach, afterEach, jest } from '@jest/globals';
import { openSaaSPage } from './openSaaSPage';
import { HostEventType } from './types';

// Mock URL constructor
const originalURL = global.URL;
global.URL = jest.fn().mockImplementation((url, base) => {
  try {
    const mockUrl = new originalURL(url as string, base as string | undefined);
    // Create a mock searchParams object
    const mockSearchParams = {
      append: jest.fn(),
      set: jest.fn(),
      forEach: jest.fn(),
    };
    Object.defineProperty(mockUrl, 'searchParams', {
      value: mockSearchParams,
      writable: true,
    });
    return mockUrl;
  } catch (e) {
    // Fallback for invalid URLs in tests
    return {
      href: `${base}${url}`,
      origin: base || 'https://angie.elementor.com',
      pathname: url,
      searchParams: {
        append: jest.fn(),
        set: jest.fn(),
        forEach: jest.fn(),
      },
    };
  }
}) as any;

describe('openSaaSPage', () => {
  let mockWindow: any;
  let mockDocument: any;
  let mockIframe: HTMLIFrameElement;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock window object
    mockWindow = {
      matchMedia: jest.fn().mockReturnValue({ matches: false }),
      location: {
        origin: 'https://example.com',
        hostname: 'example.com',
        search: '',
      },
      addEventListener: jest.fn(),
    };

    // Extend existing window instead of replacing
    Object.assign(global.window, mockWindow);

    // Mock document object
    mockIframe = {
      setAttribute: jest.fn(),
      id: '',
      getAttribute: jest.fn(),
    } as any;

    mockDocument = {
      createElement: jest.fn().mockReturnValue(mockIframe),
      body: {
        appendChild: jest.fn(),
      },
    };
    
    // Mock only the methods we use, not the whole document
    global.document.createElement = mockDocument.createElement;
    global.document.body.appendChild = mockDocument.body.appendChild;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('openSaaSPage', () => {
    const defaultProps = {
      origin: 'https://angie.elementor.com',
      path: '/test-page',
      css: {
        width: '300px',
        height: '200px',
      },
      uiTheme: 'light',
      isRTL: false,
      sdkVersion: '1.0.0',
    };

    it('should create iframe and handle loaded message', async () => {
      const messagePromise = openSaaSPage(defaultProps);

      // Get the message listener and simulate iframe loaded
      const messageListener = mockWindow.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'message'
      )?.[1];
      
      messageListener({
        origin: 'https://angie.elementor.com',
        data: { type: HostEventType.ANGIE_READY },
      });

      const result = await messagePromise;

      expect(result.iframe).toBe(mockIframe);
      expect(mockIframe.id).toBe('angie-iframe');
      expect(mockIframe.setAttribute).toHaveBeenCalledWith('frameborder', '0');
      expect(mockIframe.setAttribute).toHaveBeenCalledWith('allow', 'clipboard-write; clipboard-read');
    });

    it('should apply CSS styles correctly', async () => {
      const cssProps = {
        width: '400px',
        height: '300px',
      };

      const messagePromise = openSaaSPage({
        ...defaultProps,
        css: cssProps,
      });

      const messageListener = mockWindow.addEventListener.mock.calls.find(
        (call: any[]) => call[0] === 'message'
      )?.[1];
      messageListener({
        origin: 'https://angie.elementor.com',
        data: { type: HostEventType.ANGIE_READY },
      });

      await messagePromise;

      const setAttributeSpy = mockIframe.setAttribute as jest.MockedFunction<typeof mockIframe.setAttribute>;
      const styleCall = setAttributeSpy.mock.calls.find(
        (call: string[]) => call[0] === 'style'
      );
      
      const styleValue = styleCall?.[1];
      expect(styleValue).toContain('width: 400px');
      expect(styleValue).toContain('height: 300px');
    });
  });
});
