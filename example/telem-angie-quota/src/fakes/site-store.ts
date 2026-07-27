import type { SiteRecord } from '../types.js';
import { endOfMonth, FakeClock, startOfMonth } from './clock.js';

export class SiteStore {
  private sites = new Map<string, SiteRecord>();

  constructor( private readonly clock: FakeClock ) {}

  upsert( siteId: string, plan: SiteRecord['plan'], monthlyLimit: number, usedTokens = 0 ): SiteRecord {
    const now = this.clock.getNow();
    const record: SiteRecord = {
      siteId,
      plan,
      monthlyLimit,
      usedTokens,
      cycleStart: startOfMonth( now ),
    };
    this.sites.set( siteId, record );
    return { ...record };
  }

  setUsed( siteId: string, usedTokens: number ): SiteRecord {
    const site = this.require( siteId );
    site.usedTokens = usedTokens;
    return { ...site };
  }

  get( siteId: string ): SiteRecord | undefined {
    const site = this.sites.get( siteId );
    return site ? { ...site } : undefined;
  }

  require( siteId: string ): SiteRecord {
    const site = this.sites.get( siteId );
    if ( ! site ) {
      throw new Error( `Unknown site: ${ siteId }` );
    }
    return site;
  }

  cycleEndsAt( siteId: string ): Date {
    const site = this.require( siteId );
    return endOfMonth( site.cycleStart );
  }

  maybeRollCycle( siteId: string ): void {
    const site = this.require( siteId );
    const now = this.clock.getNow();
    const currentCycleStart = startOfMonth( now );
    if ( currentCycleStart.getTime() > site.cycleStart.getTime() ) {
      site.cycleStart = currentCycleStart;
      site.usedTokens = 0;
    }
  }

  addUsage( siteId: string, tokens: number ): number {
    const site = this.require( siteId );
    site.usedTokens += tokens;
    return site.usedTokens;
  }
}
