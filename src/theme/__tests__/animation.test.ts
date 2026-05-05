import { ANIMATION } from '../animation';

describe('ANIMATION tokens', () => {
  describe('duration', () => {
    it('has fast = 200', () => {
      expect(ANIMATION.duration.fast).toBe(200);
    });
    it('has normal = 300', () => {
      expect(ANIMATION.duration.normal).toBe(300);
    });
    it('has slow = 700', () => {
      expect(ANIMATION.duration.slow).toBe(700);
    });
    it('has verySlow = 1200', () => {
      expect(ANIMATION.duration.verySlow).toBe(1200);
    });
    // RED: staggerDelay does not exist yet — plan 02 adds it. it.failing marks this as
    // expected-to-fail so the suite exits 0 until the token is added.
    // eslint-disable-next-line jest/no-disabled-tests
    it.failing('has staggerDelay = 80', () => {
      expect((ANIMATION.duration as Record<string, number>)['staggerDelay']).toBe(80);
    });
  });
  describe('easing', () => {
    it('spring has damping = 15', () => {
      expect(ANIMATION.easing.spring.damping).toBe(15);
    });
    it('spring has stiffness = 120', () => {
      expect(ANIMATION.easing.spring.stiffness).toBe(120);
    });
  });
});
