import { useEffect, useRef, useState } from 'react'

export function useThrottledValue<T>(value: T, intervalMs: number, flushNow: boolean): T {
  const [throttled, setThrottled] = useState(value)
  const lastFlushRef = useRef(0)
  const hasFlushedRef = useRef(false)

  useEffect(() => {
    lastFlushRef.current = Date.now()
  }, [])

  useEffect(() => {
    const elapsed = Date.now() - lastFlushRef.current
    const delay =
      flushNow || !hasFlushedRef.current || elapsed >= intervalMs ? 0 : intervalMs - elapsed

    const timeout = setTimeout(() => {
      setThrottled(value)
      lastFlushRef.current = Date.now()
      hasFlushedRef.current = true
    }, delay)

    return () => {
      clearTimeout(timeout)
    }
  }, [value, intervalMs, flushNow])

  return throttled
}
