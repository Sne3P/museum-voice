/**
 * HOOK THROTTLE
 */

import { useRef, useCallback } from 'react'

export function useThrottle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastCallTime = useRef(0)

  return useCallback((...args: Parameters<T>) => {
    const now = Date.now()
    const timeSinceLastCall = now - lastCallTime.current

    if (timeSinceLastCall >= delay) {
      func(...args)
      lastCallTime.current = now
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      
      timeoutRef.current = setTimeout(() => {
        func(...args)
        lastCallTime.current = Date.now()
      }, delay - timeSinceLastCall)
    }
  }, [func, delay]) as T
}
