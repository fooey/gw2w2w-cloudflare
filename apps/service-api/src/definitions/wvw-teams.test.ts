import { describe, expect, it } from 'vitest';
import { WvWTeamSchema, WVW_TEAMS, WVW_TEAMS_IDS } from './wvw-teams';

describe('WVW_TEAMS definitions', () => {
  it('contains only schema-valid team records', () => {
    for (const team of Object.values(WVW_TEAMS)) {
      expect(WvWTeamSchema.parse(team)).toBeDefined();
    }
  });

  it('uses map keys that match each team id', () => {
    for (const [id, team] of Object.entries(WVW_TEAMS)) {
      expect(team.id).toBe(id);
    }
  });

  it('exposes ids list that exactly matches object keys', () => {
    expect(WVW_TEAMS_IDS).toStrictEqual(Object.keys(WVW_TEAMS));
  });

  it('uses unique 5-digit numeric ids', () => {
    const idSet = new Set(WVW_TEAMS_IDS);
    expect(idSet.size).toBe(WVW_TEAMS_IDS.length);

    for (const id of WVW_TEAMS_IDS) {
      expect(id).toMatch(/^\d{5}$/u);
    }
  });
});
