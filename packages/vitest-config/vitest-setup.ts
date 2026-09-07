/**
 * Installs the `Temporal` polyfill for test runs when the runtime lacks it.
 *
 * Application code gets `Temporal` from the platform: Node >= 26 ships it natively, and the Worker
 * entry polyfills it for workerd, which does not. Tests load neither — they import modules
 * directly — so without this they depend on the host Node happening to be new enough, and fail on
 * anything older with a bare `ReferenceError: Temporal is not defined` that points nowhere useful.
 *
 * `engineStrict` in pnpm-workspace.yaml is the first line of defence; this keeps the suite
 * runnable regardless.
 */
import { Intl as TemporalIntl, Temporal, toTemporalInstant } from '@js-temporal/polyfill';

// `'Temporal' in globalThis` rather than `globalThis.Temporal === undefined`: this package has no
// ambient declaration for the global, so the property access is untyped here.
if (!('Temporal' in globalThis)) {
  Object.assign(globalThis, { Temporal, toTemporalInstant });
  // Merge, don't replace: the polyfill's `Intl` carries only `DateTimeFormat` and a
  // `DurationFormat` prototype patch, so assigning it over the global would strip
  // `NumberFormat`, `DurationFormat` and the rest for the whole run. Same reasoning as the
  // Worker entry in apps/gw2w2w/workers/app.ts.
  Object.assign(globalThis.Intl, TemporalIntl);
}
