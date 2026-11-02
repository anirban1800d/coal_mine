import { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Camera, CameraOff, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { savePPESession, type PPEDetection } from '../services/api';

interface Detection {
  class_id: number;
  class_name: string;
  confidence: number;
  box: { x1: number; y1: number; x2: number; y2: number };
}

type Status =
  | 'idle'
  | 'requesting-camera'
  | 'camera-ready'
  | 'connecting-ws'
  | 'detecting'
  | 'stopping'
  | 'stopped'
  | 'error';

const FRAME_INTERVAL_MS = 250;

// Resolve WebSocket URL relative to current page (works via Vite proxy)
function getWsUrl(): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/detect`;
}

export default function PPEView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const frameTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSendingRef = useRef(false);
  const sessionStartRef = useRef<number>(0);
  const allDetectionsRef = useRef<Map<string, number>>(new Map()); // class_name → max confidence

  const [status, setStatus] = useState<Status>('idle');
  const [statusText, setStatusText] = useState('Click "Start Camera" to begin');
  const [currentDetections, setCurrentDetections] = useState<Detection[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopEverything(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopEverything = useCallback((saveSession = true) => {
    // Clear frame timer
    if (frameTimerRef.current !== null) {
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }

    // Close WebSocket
    if (socketRef.current !== null) {
      const ws = socketRef.current;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      socketRef.current = null;
    }

    // Stop camera tracks
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }

    isSendingRef.current = false;

    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    setCurrentDetections([]);

    if (saveSession && allDetectionsRef.current.size > 0) {
      const duration = Math.round((Date.now() - sessionStartRef.current) / 1000);
      const detections: PPEDetection[] = Array.from(allDetectionsRef.current.entries()).map(
        ([class_name, confidence]) => ({ class_name, confidence })
      );
      const detection_count = detections.length;

      setIsSaving(true);
      savePPESession({ duration, detection_count, detections })
        .then(() => {
          toast.success('PPE session saved to history');
        })
        .catch(() => {
          toast.error('Failed to save PPE session');
        })
        .finally(() => {
          setIsSaving(false);
        });
    }

    // Reset session state
    allDetectionsRef.current = new Map();
    sessionStartRef.current = 0;
  }, []);

  const connectWebSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    if (frameTimerRef.current !== null) {
      clearInterval(frameTimerRef.current);
      frameTimerRef.current = null;
    }

    const wsUrl = getWsUrl();
    setStatus('connecting-ws');
    setStatusText('Connecting to detection backend…');

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch {
      setStatus('error');
      setStatusText('WebSocket connection failed');
      return;
    }

    socketRef.current = ws;

    ws.onopen = () => {
      setStatus('detecting');
      setStatusText('Detecting…');
      sessionStartRef.current = Date.now();

      if (frameTimerRef.current !== null) clearInterval(frameTimerRef.current);
      frameTimerRef.current = setInterval(sendFrame, FRAME_INTERVAL_MS);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.error) {
          isSendingRef.current = false;
          return;
        }

        // Draw annotated frame
        if (data.image && canvasRef.current) {
          const img = new Image();
          img.onload = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext('2d')?.drawImage(img, 0, 0);
          };
          img.src = 'data:image/jpeg;base64,' + data.image;
        }

        // Update detections
        if (Array.isArray(data.detections)) {
          const dets: Detection[] = data.detections;
          setCurrentDetections(dets);

          // Accumulate into session aggregate (max confidence per class)
          dets.forEach((d) => {
            const prev = allDetectionsRef.current.get(d.class_name) ?? 0;
            if (d.confidence > prev) {
              allDetectionsRef.current.set(d.class_name, d.confidence);
            }
          });
        }

        isSendingRef.current = false;
      } catch {
        isSendingRef.current = false;
      }
    };

    ws.onerror = () => {
      setStatus('error');
      setStatusText('WebSocket connection failed');
      isSendingRef.current = false;
      if (frameTimerRef.current !== null) {
        clearInterval(frameTimerRef.current);
        frameTimerRef.current = null;
      }
    };

    ws.onclose = (event) => {
      isSendingRef.current = false;
      if (frameTimerRef.current !== null) {
        clearInterval(frameTimerRef.current);
        frameTimerRef.current = null;
      }
      // 4001 = auth rejected
      if (event.code === 4001) {
        setStatus('error');
        setStatusText('Authentication required — please log in again');
      } else if (event.code === 4002) {
        setStatus('error');
        setStatusText('PPE model not loaded on server');
      } else if (status !== 'stopped' && status !== 'idle') {
        setStatus('stopped');
        setStatusText('Camera stopped');
      }
    };
  }, [status]);

  const sendFrame = useCallback(() => {
    if (isSendingRef.current) return;
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = video.videoWidth;
    captureCanvas.height = video.videoHeight;
    const ctx = captureCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
    const base64Data = captureCanvas.toDataURL('image/jpeg', 0.7);

    try {
      isSendingRef.current = true;
      ws.send(base64Data);
    } catch {
      isSendingRef.current = false;
    }
  }, []);

  const startCamera = async () => {
    stopEverything(false);
    allDetectionsRef.current = new Map();

    setStatus('requesting-camera');
    setStatusText('Requesting camera permission…');
    setCurrentDetections([]);

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('error');
      setStatusText('Camera API unavailable — open page via localhost or HTTPS');
      return;
    }

    try {
      // Prefer rear camera; fall back to any camera
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      await new Promise<void>((resolve) => {
        if (video.readyState >= 1) { resolve(); return; }
        video.onloadedmetadata = () => resolve();
      });
      await video.play();

      if (canvasRef.current) {
        canvasRef.current.width = video.videoWidth || 640;
        canvasRef.current.height = video.videoHeight || 480;
      }

      setStatus('camera-ready');
      setStatusText('Camera ready — connecting to backend…');
      connectWebSocket();
    } catch (err: any) {
      stopEverything(false);
      setStatus('error');
      if (err?.name === 'NotAllowedError') {
        setStatusText('Camera permission denied — allow it in browser settings');
      } else if (err?.name === 'NotFoundError') {
        setStatusText('No camera device found');
      } else if (err?.name === 'NotReadableError') {
        setStatusText('Camera is in use by another application');
      } else {
        setStatusText(`Camera error: ${err?.name ?? 'Unknown'}`);
      }
    }
  };

  const stopCamera = () => {
    setStatus('stopping');
    setStatusText('Stopping…');
    stopEverything(true);
    setStatus('stopped');
    setStatusText('Camera stopped');
  };

  const isRunning = status === 'connecting-ws' || status === 'detecting' || status === 'camera-ready';
  const isError = status === 'error';

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-ppe)]/30 bg-[var(--color-ppe-dim)]">
          <ShieldCheck className="h-5 w-5" style={{ color: 'var(--color-ppe)' }} />
        </span>
        <div>
          <h2 className="text-lg font-semibold text-white">PPE Real-Time Detection</h2>
          <p className="text-sm text-[var(--color-muted)]">Live camera safety equipment detection</p>
        </div>
      </div>

      {/* Main camera card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Camera / Canvas panel (2/3 width) */}
        <div className="lg:col-span-2 glass rounded-2xl border border-[var(--color-border)] overflow-hidden">
          {/* Video + Canvas overlay */}
          <div className="relative bg-[var(--color-background)] aspect-video flex items-center justify-center">
            {/* Live camera feed (hidden once WS provides annotated frames) */}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`absolute inset-0 w-full h-full object-contain ${isRunning ? 'opacity-40' : 'hidden'}`}
            />

            {/* Annotated canvas from backend */}
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full object-contain ${isRunning ? 'block' : 'hidden'}`}
            />

            {/* Idle / error placeholder */}
            {!isRunning && (
              <div className="flex flex-col items-center gap-3 text-[var(--color-muted)] select-none">
                {isError
                  ? <WifiOff className="w-12 h-12 opacity-50 text-red-400" />
                  : <Camera className="w-12 h-12 opacity-30" />
                }
                <span className="text-sm">{isError ? statusText : 'Camera preview will appear here'}</span>
              </div>
            )}

            {/* Status badge */}
            {isRunning && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-medium text-white">
                {status === 'detecting'
                  ? <span className="w-2 h-2 rounded-full bg-[var(--color-ppe)] animate-pulse" />
                  : <Wifi className="w-3 h-3 text-[var(--color-muted)]" />
                }
                {statusText}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3 p-4 border-t border-[var(--color-border)]">
            <button
              type="button"
              onClick={startCamera}
              disabled={isRunning || isSaving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-black disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              style={{ background: isRunning ? undefined : 'var(--color-ppe)', opacity: isRunning ? 0.4 : undefined }}
            >
              <Camera className="w-4 h-4" />
              Start Camera
            </button>

            <button
              type="button"
              onClick={stopCamera}
              disabled={!isRunning || isSaving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold border border-[var(--color-border)] text-[var(--color-muted-strong)] hover:text-white hover:border-[var(--color-border-strong)] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <CameraOff className="w-4 h-4" />
              Stop {isSaving ? '(saving…)' : 'Camera'}
            </button>

            {/* Status text when not running */}
            {!isRunning && !isError && status !== 'idle' && (
              <span className="text-sm text-[var(--color-muted)]">{statusText}</span>
            )}

            {isError && (
              <span className="flex items-center gap-1.5 text-sm text-red-400">
                <AlertTriangle className="w-4 h-4" />
                {statusText}
              </span>
            )}
          </div>
        </div>

        {/* Detections panel (1/3 width) */}
        <div className="glass rounded-2xl border border-[var(--color-border)] flex flex-col">
          <div className="px-4 py-3 border-b border-[var(--color-border)] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" style={{ color: 'var(--color-ppe)' }} />
            <span className="text-sm font-semibold text-white">Detected Objects</span>
            {currentDetections.length > 0 && (
              <span className="ml-auto text-xs font-mono text-[var(--color-ppe)]">
                {currentDetections.length}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px]">
            <AnimatePresence mode="popLayout">
              {currentDetections.length === 0 ? (
                <motion.p
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[var(--color-muted)] text-sm text-center py-8"
                >
                  {isRunning ? 'No objects detected' : 'Start camera to detect'}
                </motion.p>
              ) : (
                currentDetections.map((d, i) => (
                  <motion.div
                    key={`${d.class_name}-${i}`}
                    layout
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border border-[var(--color-ppe)]/20 bg-[var(--color-ppe-dim)]"
                  >
                    <span className="text-sm font-medium text-white capitalize">
                      {d.class_name.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs font-mono font-semibold" style={{ color: 'var(--color-ppe)' }}>
                      {(d.confidence * 100).toFixed(1)}%
                    </span>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Info note */}
      <p className="text-xs text-[var(--color-muted)] text-center">
        Detection results are sent to the server for inference · Session is saved when you stop the camera
      </p>
    </div>
  );
}

