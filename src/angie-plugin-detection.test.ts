import { describe, expect, it, beforeEach, jest, afterEach } from '@jest/globals';

const mockPort = {
  onmessage: null as any,
  postMessage: jest.fn(),
  close: jest.fn(),
};

const mockChannel = {
  port1: mockPort,
  port2: mockPort,
};

describe( 'angie-plugin-detection', () => {
  let detection: typeof import( './angie-plugin-detection' );
  let originalMessageChannel: typeof global.MessageChannel;

  beforeEach( async () => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();

    originalMessageChannel = global.MessageChannel;
    global.MessageChannel = jest.fn( () => mockChannel ) as any;
    mockPort.onmessage = null;

    delete ( window as any ).angiePlugin;
    ( window.postMessage as jest.Mock ).mockClear();

    detection = await import( './angie-plugin-detection' );
  } );

  afterEach( () => {
    jest.useRealTimers();
    global.MessageChannel = originalMessageChannel;
    delete ( window as any ).angiePlugin;
  } );

  describe( 'isAngiePluginAvailable', () => {
    it( 'should return false when marker is absent', () => {
      expect( detection.isAngiePluginAvailable() ).toBe( false );
    } );

    it( 'should return false when marker available is false', () => {
      window.angiePlugin = { available: false };

      expect( detection.isAngiePluginAvailable() ).toBe( false );
    } );

    it( 'should return true when marker available is true', () => {
      window.angiePlugin = { available: true, version: '1.0.0' };

      expect( detection.isAngiePluginAvailable() ).toBe( true );
    } );
  } );

  describe( 'isAngiePluginActive', () => {
    it( 'should return false when plugin is not available', () => {
      expect( detection.isAngiePluginActive() ).toBe( false );
      expect( window.postMessage ).not.toHaveBeenCalled();
    } );

    it( 'should return false when plugin is available but runtime is not ready', () => {
      window.angiePlugin = { available: true };

      expect( detection.isAngiePluginActive() ).toBe( false );
      expect( window.postMessage ).toHaveBeenCalled();
    } );

    it( 'should return true when plugin is available and runtime responds to ping', () => {
      window.angiePlugin = { available: true };
      detection.isAngiePluginActive();

      if ( mockPort.onmessage ) {
        mockPort.onmessage( {
          data: {
            version: '1.0.0',
            capabilities: [ 'tool1' ],
          },
        } );
      }

      expect( detection.isAngiePluginActive() ).toBe( true );
    } );
  } );

  describe( 'waitForAngiePluginAvailable', () => {
    it( 'should resolve true immediately when marker is already present', async () => {
      window.angiePlugin = { available: true };

      const promise = detection.waitForAngiePluginAvailable( 1000 );
      await jest.runAllTimersAsync();

      await expect( promise ).resolves.toBe( true );
    } );

    it( 'should resolve false when marker never appears within timeout', async () => {
      const promise = detection.waitForAngiePluginAvailable( 1000 );

      await jest.advanceTimersByTimeAsync( 1000 );

      await expect( promise ).resolves.toBe( false );
    } );

    it( 'should resolve true when marker appears during polling', async () => {
      const promise = detection.waitForAngiePluginAvailable( 1000 );

      await jest.advanceTimersByTimeAsync( 100 );
      window.angiePlugin = { available: true };
      await jest.runAllTimersAsync();

      await expect( promise ).resolves.toBe( true );
    } );
  } );

  describe( 'waitForAngiePluginActive', () => {
    it( 'should resolve false quickly when plugin is not available', async () => {
      const promise = detection.waitForAngiePluginActive( 1000 );

      await jest.advanceTimersByTimeAsync( 1000 );

      await expect( promise ).resolves.toBe( false );
      expect( window.postMessage ).not.toHaveBeenCalled();
    } );

    it( 'should resolve true when plugin is available and runtime responds', async () => {
      window.angiePlugin = { available: true };

      const promise = detection.waitForAngiePluginActive( 1000 );
      await jest.advanceTimersByTimeAsync( 0 );

      if ( mockPort.onmessage ) {
        mockPort.onmessage( {
          data: {
            version: '1.0.0',
            capabilities: [ 'tool1' ],
          },
        } );
      }

      await expect( promise ).resolves.toBe( true );
    } );

    it( 'should resolve false when plugin is available but runtime does not respond in time', async () => {
      window.angiePlugin = { available: true };

      const promise = detection.waitForAngiePluginActive( 1000 );
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync( 1000 );

      await expect( promise ).resolves.toBe( false );
    } );
  } );
} );
