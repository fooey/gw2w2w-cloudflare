import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    /**
     * vmForks: runs each test file in a forked process with a fresh VM context.
     * Cheaper than full process spawning (default 'forks') while still giving
     * proper module isolation — important once the suite grows large.
     */
    pool: 'vmForks',
    /** Compact dot-per-test output in CI; rich default UI locally. */
    reporters: process.env.CI ? ['dot'] : ['default'],
    /** Stop the run on the first failure in CI to surface errors faster. */
    bail: process.env.CI ? 1 : 0,
  },
});
