# Risk hunt

What a change can break beyond what it meant to change. Hunt each lens on every change unit; report only what the code shows, with evidence.

1. **Regression.** Existing behavior the unit changes for callers that did not ask for it. Find every caller of a changed symbol (`grep`, references) and check each still gets what it expects.
2. **Contract break.** Changed API request/response shape, event or message payload, DB schema or migration, config key or default, exported type or function signature, error type or code, removed path. Name each consumer that reads it (other services, frontends, jobs, partners).
3. **Edge cases.** nil/undefined/zero values, empty lists, duplicates, very large input, time zones and clock boundaries, unicode, ordering assumptions.
4. **Failure paths.** Errors swallowed, wrapped without context, or returned as success; partial writes without rollback; retries that are not idempotent; missing timeouts on network calls.
5. **Concurrency.** Shared state without a lock, check-then-act races, goroutine or promise leaks, unawaited promises, context cancellation ignored.
6. **Data and migration.** Backfill for existing rows, nullable vs default, index for new query paths, rollback of a migration, old and new code running side by side during deploy.
7. **Tests.** New or changed behavior without a test; tests that assert the mock instead of the behavior; deleted or skipped tests.
8. **Operations.** Logging of secrets or personal data, metrics or alerts that the change silently breaks, feature-flag default that turns behavior on for everyone.
