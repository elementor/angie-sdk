import { AngieDetector } from './angie-detector';

const DEFAULT_TIMEOUT_MS = 3000;
const POLL_INTERVAL_MS = 50;

let sharedDetector: AngieDetector | null = null;

const sleep = ( ms: number ) => new Promise<void>( ( resolve ) => setTimeout( resolve, ms ) );

const pollUntil = async (
  deadline: number,
  predicate: () => boolean,
  intervalMs = POLL_INTERVAL_MS,
): Promise<boolean> => {
  while ( Date.now() < deadline ) {
    if ( predicate() ) {
      return true;
    }
    await sleep( intervalMs );
  }
  return predicate();
};

const getSharedDetector = (): AngieDetector => {
  if ( ! sharedDetector ) {
    sharedDetector = new AngieDetector();
  }
  return sharedDetector;
};

export const isAngiePluginAvailable = (): boolean => {
  if ( typeof window === 'undefined' ) {
    return false;
  }
  return window.angiePlugin?.available === true;
};

export const isAngiePluginActive = (): boolean => {
  if ( ! isAngiePluginAvailable() ) {
    return false;
  }
  return getSharedDetector().isReady();
};

export const waitForAngiePluginAvailable = async (
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<boolean> => {
  if ( typeof window === 'undefined' ) {
    return false;
  }
  const deadline = Date.now() + timeoutMs;
  return pollUntil( deadline, isAngiePluginAvailable );
};

export const waitForAngiePluginActive = async (
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<boolean> => {
  if ( typeof window === 'undefined' ) {
    return false;
  }

  const start = Date.now();
  const available = await waitForAngiePluginAvailable( timeoutMs );
  if ( ! available ) {
    return false;
  }

  const remaining = Math.max( 0, timeoutMs - ( Date.now() - start ) );
  const result = await getSharedDetector().waitUntilReady( remaining );
  return result.isReady;
};
