import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useThrottledValue } from './useThrottledValue'

describe('useThrottledValue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('commits the first value immediately', () => {
    const { result } = renderHook(() => useThrottledValue('a', 10_000, false))

    expect(result.current).toBe('a')
  })

  it('flushes the first update immediately, then buffers later updates until the interval elapses', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useThrottledValue(value, 10_000, false),
      { initialProps: { value: 'a' } },
    )

    rerender({ value: 'b' })
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(result.current).toBe('b')

    rerender({ value: 'c' })
    expect(result.current).toBe('b')

    act(() => {
      vi.advanceTimersByTime(9_999)
    })
    expect(result.current).toBe('b')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current).toBe('c')
  })

  it('flushes promptly when flushNow becomes true', () => {
    const { result, rerender } = renderHook(
      ({ value, flushNow }: { value: string; flushNow: boolean }) =>
        useThrottledValue(value, 10_000, flushNow),
      { initialProps: { value: 'a', flushNow: false } },
    )

    rerender({ value: 'b', flushNow: false })
    expect(result.current).toBe('a')

    rerender({ value: 'c', flushNow: true })
    act(() => {
      vi.advanceTimersByTime(0)
    })
    expect(result.current).toBe('c')
  })
})
