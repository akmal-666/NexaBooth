import { useRef, useState, useCallback } from 'react'

export function useVideoRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const getSupportedMime = (): string => {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ]
    return types.find(t => MediaRecorder.isTypeSupported(t)) ?? ''
  }

  const startRecording = useCallback((stream: MediaStream, maxSecs = 15) => {
    chunksRef.current = []
    setElapsed(0)

    const mime = getSupportedMime()
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : {})
    recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    recorder.start(100)
    recorderRef.current = recorder
    setIsRecording(true)

    let secs = 0
    timerRef.current = setInterval(() => {
      secs++
      setElapsed(secs)
      if (secs >= maxSecs) stopRecording()
    }, 1000)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const stopRecording = useCallback((): Promise<string | null> => {
    if (timerRef.current) clearInterval(timerRef.current)
    setIsRecording(false)

    return new Promise(resolve => {
      const recorder = recorderRef.current
      if (!recorder || recorder.state === 'inactive') { resolve(null); return }

      recorder.onstop = () => {
        const mime = chunksRef.current[0]?.type || 'video/webm'
        const blob = new Blob(chunksRef.current, { type: mime })
        resolve(URL.createObjectURL(blob))
      }
      recorder.stop()
    })
  }, [])

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    recorderRef.current?.state !== 'inactive' && recorderRef.current?.stop()
    recorderRef.current = null
    chunksRef.current = []
    setIsRecording(false)
    setElapsed(0)
  }, [])

  return { isRecording, elapsed, startRecording, stopRecording, reset }
}
