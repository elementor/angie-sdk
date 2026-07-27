import type { PromptRequest, PromptResult, QuotaStatus } from './types.js';
import { WARNING_THRESHOLD_RATIO } from './types.js';
import { AuditLog } from './fakes/audit-log.js';
import { FakeClock } from './fakes/clock.js';
import { FeatureFlags } from './fakes/feature-flags.js';
import { PromptRunner } from './fakes/prompt-runner.js';
import { SiteStore } from './fakes/site-store.js';

const QUOTA_ENFORCEMENT_FLAG = 'quota-enforcement';

export class AngieQuotaService {
  private readonly siteLocks = new Map<string, Promise<unknown>>();

  constructor(
    private readonly clock: FakeClock,
    private readonly sites: SiteStore,
    private readonly flags: FeatureFlags,
    private readonly audit: AuditLog,
    private readonly promptRunner: PromptRunner,
  ) {}

  getStatus( siteId: string ): QuotaStatus {
    this.sites.maybeRollCycle( siteId );
    const site = this.sites.require( siteId );
    return {
      siteId,
      used: site.usedTokens,
      remaining: Math.max( 0, site.monthlyLimit - site.usedTokens ),
      limit: site.monthlyLimit,
      cycleEndsAt: this.sites.cycleEndsAt( siteId ),
    };
  }

  async requestPrompt( request: PromptRequest ): Promise<PromptResult> {
    return this.withSiteLock( request.siteId, () => this.executePrompt( request ) );
  }

  private async withSiteLock<T>( siteId: string, work: () => Promise<T> ): Promise<T> {
    const previous = this.siteLocks.get( siteId ) ?? Promise.resolve();
    const run = previous.then( work, work );
    this.siteLocks.set( siteId, run );
    return run;
  }

  private async executePrompt( request: PromptRequest ): Promise<PromptResult> {
    this.sites.maybeRollCycle( request.siteId );
    const site = this.sites.get( request.siteId );
    if ( ! site ) {
      return { ok: false, code: 'site_not_found', message: `Unknown site ${ request.siteId }` };
    }

    const enforcementOn = this.flags.isEnabled( QUOTA_ENFORCEMENT_FLAG );
    const projected = site.usedTokens + request.tokens;

    if ( enforcementOn && projected > site.monthlyLimit ) {
      return {
        ok: false,
        code: 'quota_exceeded',
        resetAt: this.sites.cycleEndsAt( request.siteId ),
        message: 'Monthly Angie token quota exceeded',
      };
    }

    const run = await this.promptRunner.run( request.siteId );
    if ( ! run.ok ) {
      return { ok: false, code: 'prompt_failed', message: run.message };
    }

    const usageAfter = this.sites.addUsage( request.siteId, request.tokens );
    this.audit.record( 'quota.consumed', request.siteId, { tokens: request.tokens, usageAfter } );

    const ratio = usageAfter / site.monthlyLimit;
    if ( ratio >= WARNING_THRESHOLD_RATIO && usageAfter - request.tokens < site.monthlyLimit * WARNING_THRESHOLD_RATIO ) {
      this.audit.record( 'quota.warning_threshold', request.siteId, { usageAfter, limit: site.monthlyLimit } );
    }

    return { ok: true, usageAfter };
  }

  async requestPromptConcurrent( requests: PromptRequest[] ): Promise<PromptResult[]> {
    return Promise.all( requests.map( ( request ) => this.requestPrompt( request ) ) );
  }
}

export function createQuotaHarness( clockIso: string ) {
  const clock = new FakeClock( clockIso );
  const sites = new SiteStore( clock );
  const flags = new FeatureFlags();
  const audit = new AuditLog( clock );
  const promptRunner = new PromptRunner();
  const service = new AngieQuotaService( clock, sites, flags, audit, promptRunner );

  return { clock, sites, flags, audit, promptRunner, service };
}
