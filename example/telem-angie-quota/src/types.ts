export type PlanId = 'starter' | 'premium';

export type QuotaErrorCode = 'quota_exceeded' | 'prompt_failed' | 'site_not_found';

export type SiteRecord = {
  siteId: string;
  plan: PlanId;
  monthlyLimit: number;
  usedTokens: number;
  cycleStart: Date;
};

export type PromptRequest = {
  siteId: string;
  tokens: number;
};

export type PromptResult =
  | { ok: true; usageAfter: number }
  | { ok: false; code: QuotaErrorCode; resetAt?: Date; message: string };

export type QuotaStatus = {
  siteId: string;
  used: number;
  remaining: number;
  limit: number;
  cycleEndsAt: Date;
};

export type AuditEvent = {
  type: string;
  siteId: string;
  at: Date;
  payload?: Record<string, unknown>;
};

export const PLAN_DEFAULTS: Record<PlanId, number> = {
  starter: 10_000,
  premium: 100_000,
};

export const WARNING_THRESHOLD_RATIO = 0.8;
