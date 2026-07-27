import { Given, Then, When } from '@cucumber/cucumber';
import assert from 'node:assert/strict';
import type { PlanId } from '../types.js';
import type { QuotaWorld } from '../support/world.js';

Given(
  'the Angie quota service is running with in-memory fakes',
  function ( this: QuotaWorld ) {
    if ( ! this.service ) {
      this.resetHarness( '2026-07-15T10:00:00.000Z' );
    }
  },
);

Given(
  'the clock is {string}',
  function ( this: QuotaWorld, iso: string ) {
    this.resetHarness( iso );
  },
);

Given(
  'site {string} has plan {string} with monthly tokens {int}',
  function ( this: QuotaWorld, siteId: string, plan: string, monthlyLimit: number ) {
    this.sites.upsert( siteId, plan as PlanId, monthlyLimit, 0 );
  },
);

Given(
  'site {string} has used {int} tokens this cycle',
  function ( this: QuotaWorld, siteId: string, used: number ) {
    this.sites.setUsed( siteId, used );
  },
);

Given(
  'the quota-enforcement flag is disabled',
  function ( this: QuotaWorld ) {
    this.flags.set( 'quota-enforcement', false );
  },
);

Given(
  'the prompt runner will fail for site {string}',
  function ( this: QuotaWorld, siteId: string ) {
    this.promptRunner.failForSite( siteId );
  },
);

When(
  'site {string} requests a prompt consuming {int} tokens',
  async function ( this: QuotaWorld, siteId: string, tokens: number ) {
    this.lastResult = await this.service.requestPrompt( { siteId, tokens } );
  },
);

When(
  'the clock advances to {string}',
  function ( this: QuotaWorld, iso: string ) {
    this.clock.advanceTo( iso );
  },
);

When(
  'an admin requests quota status for site {string}',
  function ( this: QuotaWorld, siteId: string ) {
    this.lastStatus = this.service.getStatus( siteId );
  },
);

When(
  'site {string} requests two prompts each consuming {int} tokens concurrently',
  async function ( this: QuotaWorld, siteId: string, tokens: number ) {
    this.lastResults = await this.service.requestPromptConcurrent( [
      { siteId, tokens },
      { siteId, tokens },
    ] );
  },
);

Then( 'the request is allowed', function ( this: QuotaWorld ) {
  assert.equal( this.lastResult?.ok, true );
} );

Then(
  'site {string} usage is {int} tokens',
  function ( this: QuotaWorld, siteId: string, expected: number ) {
    const site = this.sites.get( siteId );
    assert.equal( site?.usedTokens, expected );
  },
);

Then(
  'site {string} remaining tokens are {int}',
  function ( this: QuotaWorld, siteId: string, expected: number ) {
    const status = this.service.getStatus( siteId );
    assert.equal( status.remaining, expected );
  },
);

Then(
  'the request is rejected with code {string}',
  function ( this: QuotaWorld, code: string ) {
    assert.equal( this.lastResult?.ok, false );
    if ( this.lastResult && ! this.lastResult.ok ) {
      assert.equal( this.lastResult.code, code );
    }
  },
);

Then(
  'the request fails with code {string}',
  function ( this: QuotaWorld, code: string ) {
    assert.equal( this.lastResult?.ok, false );
    if ( this.lastResult && ! this.lastResult.ok ) {
      assert.equal( this.lastResult.code, code );
    }
  },
);

Then(
  'no audit event {string} is recorded',
  function ( this: QuotaWorld, eventType: string ) {
    const found = this.audit.all().some( ( event ) => event.type === eventType );
    assert.equal( found, false );
  },
);

Then(
  'an audit event {string} is recorded for site {string}',
  function ( this: QuotaWorld, eventType: string, siteId: string ) {
    assert.equal( this.audit.hasEvent( eventType, siteId ), true );
  },
);

Then(
  'the status shows used {int} tokens',
  function ( this: QuotaWorld, used: number ) {
    assert.equal( this.lastStatus?.used, used );
  },
);

Then(
  'the status shows remaining {int} tokens',
  function ( this: QuotaWorld, remaining: number ) {
    assert.equal( this.lastStatus?.remaining, remaining );
  },
);

Then(
  'the status shows cycle ends at {string}',
  function ( this: QuotaWorld, iso: string ) {
    assert.equal( this.lastStatus?.cycleEndsAt.toISOString(), new Date( iso ).toISOString() );
  },
);

Then(
  'the rejection includes reset at {string}',
  function ( this: QuotaWorld, iso: string ) {
    assert.equal( this.lastResult?.ok, false );
    if ( this.lastResult && ! this.lastResult.ok ) {
      assert.equal( this.lastResult.resetAt?.toISOString(), new Date( iso ).toISOString() );
    }
  },
);

Then(
  'one request is allowed and one is rejected with code {string}',
  function ( this: QuotaWorld, code: string ) {
    const allowed = this.lastResults.filter( ( result ) => result.ok );
    const rejected = this.lastResults.filter( ( result ) => ! result.ok );
    assert.equal( allowed.length, 1 );
    assert.equal( rejected.length, 1 );
    if ( ! rejected[ 0 ]!.ok ) {
      assert.equal( rejected[ 0 ]!.code, code );
    }
  },
);
