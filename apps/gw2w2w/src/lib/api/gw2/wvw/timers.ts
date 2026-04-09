import { apiFetch } from '#lib/api/client';
import { parseResponse } from '#lib/api/utils';
import { type WvWLockoutTimer, type WvWTeamAssignmentTimer, type WvWTimers } from '@repo/service-api/types';

export function fetchWvwTimers(): Promise<WvWTimers[] | null> {
  return apiFetch(`/gw2/wvw/timers`).then(parseResponse<WvWTimers[]>);
}

export function fetchWvwLockoutTimers(): Promise<WvWLockoutTimer[] | null> {
  return apiFetch(`/gw2/wvw/timers/lockout`).then(parseResponse<WvWLockoutTimer[]>);
}

export function fetchWvwTeamAssignmentTimers(): Promise<WvWTeamAssignmentTimer[] | null> {
  return apiFetch(`/gw2/wvw/timers/teamAssignment`).then(parseResponse<WvWTeamAssignmentTimer[]>);
}
