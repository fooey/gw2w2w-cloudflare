import { describe, expect, it } from 'vitest';

import { decodeRouteParam } from './decodeRouteParam';

/**
 * Faithful reproduction of React Router's `decodePath` (react-router/dist/.../lib/router/utils.js):
 * it decodes each path segment, re-encodes any literal `/` the decode produced so a param cannot be
 * mistaken for a path boundary, and falls back to the raw value when the segment is malformed.
 *
 * Reproduced here so these tests exercise the values a loader is actually handed, not the raw URL —
 * the double-decode bug this guards against was only visible at that boundary.
 */
function routerParamFor(urlSegment: string): string {
  try {
    return decodeURIComponent(urlSegment).replaceAll('/', '%2F');
  } catch {
    return urlSegment;
  }
}

describe('decodeRouteParam', () => {
  it('restores a literal slash that React Router re-encoded', () => {
    expect(decodeRouteParam('A%2FB')).toBe('A/B');
  });

  it('handles the lowercase escape and repeats it', () => {
    expect(decodeRouteParam('a%2fb%2Fc')).toBe('a/b/c');
  });

  it('leaves a literal percent sign alone rather than throwing', () => {
    // decodeURIComponent('100% Pure') throws URIError. The loader caught that and returned null,
    // so a real guild reported "no guild found" — a false 404.
    expect(() => decodeRouteParam('100% Pure')).not.toThrow();
    expect(decodeRouteParam('100% Pure')).toBe('100% Pure');
  });

  it('does not decode a percent-escape that is part of the name', () => {
    // A guild literally named "50%20off" must not silently become "50 off" and look up the wrong guild.
    expect(decodeRouteParam('50%20off')).toBe('50%20off');
  });

  it('passes malformed percent-encoding through instead of throwing', () => {
    expect(() => decodeRouteParam('%E0%A4%A')).not.toThrow();
    expect(decodeRouteParam('%E0%A4%A')).toBe('%E0%A4%A');
  });

  it('leaves ordinary names and uuids unchanged', () => {
    expect(decodeRouteParam('Dobby Is Free')).toBe('Dobby Is Free');
    expect(decodeRouteParam('97C007DC-87D5-E311-9621-AC162DAE8ACD')).toBe('97C007DC-87D5-E311-9621-AC162DAE8ACD');
  });
});

describe('decodeRouteParam, on the param React Router actually passes', () => {
  it('recovers a guild name containing a slash', () => {
    expect(decodeRouteParam(routerParamFor('A%2FB'))).toBe('A/B');
  });

  it('recovers a guild name containing a percent sign', () => {
    expect(decodeRouteParam(routerParamFor('100%25%20Pure'))).toBe('100% Pure');
  });

  it('recovers a guild name containing a literal percent-escape', () => {
    expect(decodeRouteParam(routerParamFor('50%2520off'))).toBe('50%20off');
  });

  it('recovers an ordinary spaced name', () => {
    expect(decodeRouteParam(routerParamFor('Dobby%20Is%20Free'))).toBe('Dobby Is Free');
  });

  it('survives a malformed segment end to end', () => {
    expect(decodeRouteParam(routerParamFor('%E0%A4%A'))).toBe('%E0%A4%A');
  });
});
