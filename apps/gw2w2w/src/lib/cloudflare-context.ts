import { createContext } from 'react-router';

/**
 * Carries the Worker's bindings and ExecutionContext into loaders and actions.
 *
 * React Router v8 replaced v7's ambient `AppLoadContext` interface-merging with a typed
 * RouterContextProvider, so the context is a real object that the worker entry populates per
 * request and route modules read with `context.get(cloudflareContext)`.
 */
export const cloudflareContext = createContext<{
  env: CloudflareEnv;
  ctx: ExecutionContext;
}>();
