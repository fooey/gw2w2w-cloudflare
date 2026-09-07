import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const isCI = Boolean(process.env.CI);

/** Resolved against this file so every consuming package picks it up without duplicating the path. */
const temporalSetup = fileURLToPath(new URL('vitest-setup.ts', import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: [temporalSetup],
    /**
     * vmForks: runs each test file in a forked process with a fresh VM context.
     * Cheaper than full process spawning (default 'forks') while still giving
     * proper module isolation — important once the suite grows large.
     */
    pool: 'vmForks',
    restoreMocks: true,
    /** Compact dot-per-test output in CI; rich default UI locally. */
    reporters: isCI ? ['dot'] : ['default'],
    /** Stop the run on the first failure in CI to surface errors faster. */
    bail: isCI ? 1 : 0,
  },
});
