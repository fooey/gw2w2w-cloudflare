import type { ServerBuild } from 'react-router';
import { Intl as TemporalIntl, Temporal, toTemporalInstant } from '@js-temporal/polyfill';
import { createRequestHandler, RouterContextProvider } from 'react-router';

import { cloudflareContext } from '#lib/cloudflare-context.ts';

// SSR code (Timer, ObjectiveLogs, LocalTimestamp, the texture route's cache stamp, ...) uses the
// Temporal global, which is native in modern browsers but absent from workerd. It is installed
// here, in the Worker entry, because that is the only module guaranteed to run before any route.
// Only install if not already present (workerd may gain native Temporal later).
// eslint-disable-next-line typescript/no-unnecessary-condition -- ambient types declare Temporal as always present; this is real runtime feature-detection for an environment where it may not be yet.
if (globalThis.Temporal === undefined) {
  Object.assign(globalThis, { Temporal, toTemporalInstant });
  // Merge into the existing `Intl` rather than replacing it. The polyfill's `Intl` export has only
  // two keys — a Temporal-aware `DateTimeFormat` and a `DurationFormat` prototype patch — so
  // assigning it wholesale strips `NumberFormat`, `DurationFormat`, `Collator`, `Segmenter` and the
  // rest from the Worker global. Timer.tsx already calls `Intl.DurationFormat` and ships in the SSR
  // bundle; it escapes today only because its clock store is null server-side and it returns early.
  Object.assign(globalThis.Intl, TemporalIntl);
}

const requestHandler = createRequestHandler(
  // eslint-disable-next-line typescript/no-unsafe-type-assertion -- the virtual module types `basename` as `string | undefined`, which trips exactOptionalPropertyTypes against ServerBuild's `string`.
  async () => (await import('virtual:react-router/server-build')) as unknown as ServerBuild,
  import.meta.env.MODE,
);

export default {
  async fetch(request, env, ctx) {
    const context = new RouterContextProvider();
    context.set(cloudflareContext, { env, ctx });

    const response = await requestHandler(request, context);
    return response;
  },
} satisfies ExportedHandler<CloudflareEnv>;
