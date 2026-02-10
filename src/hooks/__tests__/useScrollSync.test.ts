import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScrollSync } from '../useScrollSync';

describe('useScrollSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  function makeScrollable(scrollTop = 0, scrollHeight = 1000, clientHeight = 200): HTMLElement {
    return {
      scrollTop,
      scrollHeight,
      clientHeight,
    } as unknown as HTMLElement;
  }

  it('syncs scroll from A to B using proportional ratio', () => {
    const { result } = renderHook(() => useScrollSync());

    const elA = makeScrollable(400, 1000, 200); // 400/800 = 0.5
    const elB = makeScrollable(0, 2000, 200); // maxScroll = 1800, expect 900

    act(() => {
      result.current.setRefA(elA);
      result.current.setRefB(elB);
    });

    act(() => {
      result.current.onScrollA();
    });

    expect(elB.scrollTop).toBe(900);
  });

  it('syncs scroll from B to A', () => {
    const { result } = renderHook(() => useScrollSync());

    const elA = makeScrollable(0, 500, 100); // maxScroll = 400
    const elB = makeScrollable(100, 1000, 200); // 100/800 = 0.125

    act(() => {
      result.current.setRefA(elA);
      result.current.setRefB(elB);
    });

    act(() => {
      result.current.onScrollB();
    });

    expect(elA.scrollTop).toBe(50); // 0.125 * 400 = 50
  });

  it('does nothing when source cannot scroll', () => {
    const { result } = renderHook(() => useScrollSync());

    const elA = makeScrollable(0, 200, 200); // maxScroll = 0
    const elB = makeScrollable(0, 1000, 200);

    act(() => {
      result.current.setRefA(elA);
      result.current.setRefB(elB);
    });

    act(() => {
      result.current.onScrollA();
    });

    expect(elB.scrollTop).toBe(0);
  });

  it('does nothing when target ref is null', () => {
    const { result } = renderHook(() => useScrollSync());

    const elA = makeScrollable(100, 1000, 200);

    act(() => {
      result.current.setRefA(elA);
      // setRefB not called — null
    });

    // Should not throw
    act(() => {
      result.current.onScrollA();
    });
  });
});
