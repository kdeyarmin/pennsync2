import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter, SessionManager } from './security';

describe('RateLimiter', () => {
  it('enforces the limit per key', () => {
    const limiter = new RateLimiter(2, 60000);
    expect(limiter.canMakeRequest('alice')).toBe(true);
    expect(limiter.canMakeRequest('alice')).toBe(true);
    // Third call for the same key in-window is blocked.
    expect(limiter.canMakeRequest('alice')).toBe(false);
  });

  it('isolates keys: one user hitting the cap does not reset another user', () => {
    // Regression test: previously the cleanup filter dropped every other key's
    // in-window history, so any call from a second user reset the first user's
    // count to zero on the shared limiter — bypassing the per-user limit.
    const limiter = new RateLimiter(2, 60000);

    expect(limiter.canMakeRequest('alice')).toBe(true);
    expect(limiter.canMakeRequest('alice')).toBe(true);
    expect(limiter.canMakeRequest('alice')).toBe(false); // alice is capped

    // Bob making a call must NOT clear alice's tracked history.
    expect(limiter.canMakeRequest('bob')).toBe(true);

    // Alice is still capped after bob's activity.
    expect(limiter.canMakeRequest('alice')).toBe(false);
  });

  it('frees a key once its requests age out of the window', () => {
    vi.useFakeTimers();
    try {
      const limiter = new RateLimiter(1, 1000);
      expect(limiter.canMakeRequest('alice')).toBe(true);
      expect(limiter.canMakeRequest('alice')).toBe(false);
      vi.advanceTimersByTime(1001);
      expect(limiter.canMakeRequest('alice')).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('SessionManager activity listeners', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('stopMonitoring detaches activity listeners so they stop re-arming timers', () => {
    const onTimeout = vi.fn();
    const onWarning = vi.fn();
    const mgr = new SessionManager(15);

    const resetSpy = vi.spyOn(mgr, 'resetTimeout');
    mgr.startMonitoring(onTimeout, onWarning);
    resetSpy.mockClear(); // ignore the initial reset from startMonitoring

    // Activity fires resetTimeout while monitoring.
    window.dispatchEvent(new Event('click'));
    expect(resetSpy).toHaveBeenCalledTimes(1);

    // After stopMonitoring, the listener must be gone (no further resets).
    mgr.stopMonitoring();
    resetSpy.mockClear();
    window.dispatchEvent(new Event('click'));
    expect(resetSpy).not.toHaveBeenCalled();
  });

  it('repeated startMonitoring does not stack duplicate listeners', () => {
    const mgr = new SessionManager(15);
    mgr.startMonitoring(vi.fn(), vi.fn());
    mgr.startMonitoring(vi.fn(), vi.fn());

    const resetSpy = vi.spyOn(mgr, 'resetTimeout');
    window.dispatchEvent(new Event('click'));
    // Exactly one handler should be attached, not two.
    expect(resetSpy).toHaveBeenCalledTimes(1);

    mgr.stopMonitoring();
  });
});
