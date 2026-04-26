import { describe, expect, it } from 'vitest';
import { MANIFOLD_CONSTANTS } from '../../src/experience/manifold/ManifoldConstants';

describe('ManifoldConstants', () => {
  it('matches snapshot', () => {
    expect(MANIFOLD_CONSTANTS).toMatchSnapshot();
  });
});
