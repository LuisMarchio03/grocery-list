'use client'

import { useState, useRef, useCallback } from 'react'

const THRESHOLD = 80

export function usePullToRefresh(onRefresh: () => void) {
  const [pulling, setPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const pullingRef = useRef(false)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (window.scrollY > 0) return
    startY.current = e.touches[0].clientY
    pullingRef.current = false
  }, [])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (window.scrollY > 0) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0) {
      pullingRef.current = true
      setPulling(true)
      setPullDistance(Math.min(dy * 0.5, THRESHOLD))
    }
  }, [])

  const onTouchEnd = useCallback(() => {
    if (pullingRef.current && pullDistance >= THRESHOLD) {
      onRefresh()
    }
    setPulling(false)
    setPullDistance(0)
    pullingRef.current = false
  }, [pullDistance, onRefresh])

  return { pulling, pullDistance, onTouchStart, onTouchMove, onTouchEnd }
}
