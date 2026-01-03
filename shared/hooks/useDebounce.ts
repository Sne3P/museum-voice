/**
 * HOOK DEBOUNCE
 */

import { useEffect, useState, useRef } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

export function useForceUpdate() {
  const [tick, setTick] = useState(0)
  return () => setTick(prev => prev + 1)
}
