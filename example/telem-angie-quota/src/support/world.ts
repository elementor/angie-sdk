import { setWorldConstructor, World } from '@cucumber/cucumber';
import type { AngieQuotaService } from '../quota-service.js';
import { createQuotaHarness } from '../quota-service.js';
import type { AuditLog } from '../fakes/audit-log.js';
import type { FakeClock } from '../fakes/clock.js';
import type { FeatureFlags } from '../fakes/feature-flags.js';
import type { PromptRunner } from '../fakes/prompt-runner.js';
import type { SiteStore } from '../fakes/site-store.js';
import type { PromptResult, QuotaStatus } from '../types.js';

export class QuotaWorld extends World {
  clock!: FakeClock;
  sites!: SiteStore;
  flags!: FeatureFlags;
  audit!: AuditLog;
  promptRunner!: PromptRunner;
  service!: AngieQuotaService;
  lastResult: PromptResult | null = null;
  lastResults: PromptResult[] = [];
  lastStatus: QuotaStatus | null = null;

  resetHarness( clockIso: string ): void {
    const harness = createQuotaHarness( clockIso );
    this.clock = harness.clock;
    this.sites = harness.sites;
    this.flags = harness.flags;
    this.audit = harness.audit;
    this.promptRunner = harness.promptRunner;
    this.service = harness.service;
    this.lastResult = null;
    this.lastResults = [];
    this.lastStatus = null;
  }
}

setWorldConstructor( QuotaWorld );
