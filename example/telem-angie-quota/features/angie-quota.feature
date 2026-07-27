Feature: Angie Quota
  Per-site AI usage limits for Angie prompts.
  Scenarios are black-box: they describe observable behavior only.

  Background:
    Given the Angie quota service is running with in-memory fakes
    And the clock is "2026-07-15T10:00:00.000Z"

  Scenario: Active site within monthly limit can run a prompt
    Given site "acme" has plan "starter" with monthly tokens 10000
    And site "acme" has used 2000 tokens this cycle
    When site "acme" requests a prompt consuming 500 tokens
    Then the request is allowed
    And site "acme" usage is 2500 tokens

  Scenario: Site over monthly limit is rejected
    Given site "acme" has plan "starter" with monthly tokens 10000
    And site "acme" has used 9800 tokens this cycle
    When site "acme" requests a prompt consuming 500 tokens
    Then the request is rejected with code "quota_exceeded"
    And site "acme" usage is 9800 tokens
    And no audit event "quota.consumed" is recorded

  Scenario: Premium plan has a higher monthly ceiling
    Given site "globex" has plan "premium" with monthly tokens 100000
    And site "globex" has used 95000 tokens this cycle
    When site "globex" requests a prompt consuming 4000 tokens
    Then the request is allowed
    And site "globex" remaining tokens are 1000

  Scenario: Failed prompt does not consume quota
    Given site "acme" has plan "starter" with monthly tokens 10000
    And site "acme" has used 1000 tokens this cycle
    And the prompt runner will fail for site "acme"
    When site "acme" requests a prompt consuming 300 tokens
    Then the request fails with code "prompt_failed"
    And site "acme" usage is 1000 tokens

  Scenario: Quota enforcement is skipped when the flag is off
    Given the quota-enforcement flag is disabled
    And site "acme" has plan "starter" with monthly tokens 1000
    And site "acme" has used 1000 tokens this cycle
    When site "acme" requests a prompt consuming 200 tokens
    Then the request is allowed
    And site "acme" usage is 1200 tokens

  Scenario: Warning is emitted when usage crosses eighty percent
    Given site "acme" has plan "starter" with monthly tokens 10000
    And site "acme" has used 7500 tokens this cycle
    When site "acme" requests a prompt consuming 600 tokens
    Then the request is allowed
    And an audit event "quota.warning_threshold" is recorded for site "acme"

  Scenario: Usage resets at the billing cycle boundary
    Given site "acme" has plan "starter" with monthly tokens 10000
    And site "acme" has used 9000 tokens this cycle
    When the clock advances to "2026-08-01T00:00:00.000Z"
    And site "acme" requests a prompt consuming 100 tokens
    Then the request is allowed
    And site "acme" usage is 100 tokens

  Scenario: Admin can read current usage and remaining quota
    Given site "acme" has plan "starter" with monthly tokens 10000
    And site "acme" has used 4200 tokens this cycle
    When an admin requests quota status for site "acme"
    Then the status shows used 4200 tokens
    And the status shows remaining 5800 tokens
    And the status shows cycle ends at "2026-07-31T23:59:59.999Z"

  Scenario: Rejection includes the next reset timestamp
    Given site "acme" has plan "starter" with monthly tokens 5000
    And site "acme" has used 5000 tokens this cycle
    When site "acme" requests a prompt consuming 1 tokens
    Then the request is rejected with code "quota_exceeded"
    And the rejection includes reset at "2026-07-31T23:59:59.999Z"

  Scenario: Concurrent over-limit requests only allow the first
    Given site "acme" has plan "starter" with monthly tokens 1000
    And site "acme" has used 900 tokens this cycle
    When site "acme" requests two prompts each consuming 100 tokens concurrently
    Then one request is allowed and one is rejected with code "quota_exceeded"
    And site "acme" usage is 1000 tokens
