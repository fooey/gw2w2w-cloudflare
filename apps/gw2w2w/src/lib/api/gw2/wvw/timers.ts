import { apiFetch } from '@gw2w2w/lib/api/client';
import { parseResponse } from '@gw2w2w/lib/api/utils';
import {
  type WvWLockoutTimer,
  type WvWTeamAssignmentTimer,
  type WvWTimers,
} from '@service-api/lib/resources/wvw/timers';

export function fetchWvwTimers(): Promise<WvWTimers[] | null> {
  return apiFetch(`/gw2/wvw/timers`).then(parseResponse<WvWTimers[]>);
}

export function fetchWvwLockoutTimers(): Promise<WvWLockoutTimer[] | null> {
  return apiFetch(`/gw2/wvw/timers/lockout`).then(parseResponse<WvWLockoutTimer[]>);
}

export function fetchWvwTeamAssignmentTimers(): Promise<WvWTeamAssignmentTimer[] | null> {
  return apiFetch(`/gw2/wvw/timers/teamAssignment`).then(parseResponse<WvWTeamAssignmentTimer[]>);
}
