import { useState, useEffect, useRef, useCallback } from 'react'

interface CountdownOptions {
  onComplete?: () => void
  onTick?: (remaining: number) => void
}

export function useCountdown(seconds: number, opts: CountdownOptions = {}) {
  const [remaining, setRemaining] = useState(0)
  const [running, setRunning] = useState(false)
  const onCompleteRef = useRef(opts.onComplete)
  const onTickRef = useRef(opts.onTick)

  useEffect(() => { onCompleteRef.current = opts.onComplete }, [opts.onComplete])
  useEffect(() => { onTickRef.current = opts.onTick }, [opts.onTick])

  const start = useCallback(() => {
    setRemaining(seconds)
    setRunning(true)
  }, [seconds])

  const reset = useCallback(() => {
    setRunning(false)
    setRemaining(0)
  }, [])

  useEffect(() => {
    if (!running || remaining <= 0) return

    const id = setTimeout(() => {
      const next = remaining - 1
      setRemaining(next)
      onTickRef.current?.(next)
      if (next === 0) {
        setRunning(false)
        onCompleteRef.current?.()
      }
    }, 1000)

    return () => clearTimeout(id)
  }, [running, remaining])

  return { remaining, running, start, reset }
}
