import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Download,
  RefreshCw,
  Settings2,
  Sparkles,
  Clock,
  Heart,
  ArrowLeft,
  Maximize2,
  Film,
  Eye,
  Smile,
  ShieldCheck,
  Instagram,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Link as LinkIcon,
  Check,
  Loader2,
  Lock
} from 'lucide-react';
import { createCloudShare } from '../lib/api';
import qrcode from 'qrcode-generator';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import {
  LAYOUTS,
  LayoutDef,
  CARD_THEMES,
  CardTheme,
  VISUAL_FILTERS,
  FilterType,
  renderStrip,
  LensEffectType
} from '../lib/renderUtils';
import { createGifExporter } from '../lib/exportUtils';
import { playTick, playShutter, playDing, startLofiBgm, stopLofiBgm } from '../lib/audioUtils';
import { useMagnetic } from '../hooks/useMagnetic';
import Lobby from './Lobby';
import Preloader from './Preloader';

type ScreenState = 'landing' | 'active' | 'review';
type CapturingState = 'idle' | 'countdown' | 'capturing' | 'completed';

interface HeartParticle {
  id: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  wiggle: number;
  color: string;
}

function PixelHeart({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 9 8" className={className} style={style} fill="currentColor">
      {/* Row 0 */}
      <rect x="1" y="0" width="2" height="1" />
      <rect x="6" y="0" width="2" height="1" />
      {/* Row 1 */}
      <rect x="0" y="1" width="4" height="1" />
      <rect x="5" y="1" width="4" height="1" />
      {/* Row 2 & 3 */}
      <rect x="0" y="2" width="9" height="2" />
      {/* Row 4 */}
      <rect x="1" y="4" width="7" height="1" />
      {/* Row 5 */}
      <rect x="2" y="5" width="5" height="1" />
      {/* Row 6 */}
      <rect x="3" y="6" width="3" height="1" />
      {/* Row 7 */}
      <rect x="4" y="7" width="1" height="1" />
    </svg>
  );
}

export default function Photobooth() {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [hearts, setHearts] = useState<HeartParticle[]>([]);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isCardHovered, setIsCardHovered] = useState(false);

  const handleCardMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotateX = -(y / (rect.height / 2)) * 12;
    const rotateY = (x / (rect.width / 2)) * 12;
    setTilt({ x: rotateX, y: rotateY });
  }, []);

  const handleCardMouseLeave = useCallback(() => {
    setIsCardHovered(false);
    setTilt({ x: 0, y: 0 });
  }, []);

  const spawnHearts = useCallback(() => {
    const heartColors = ['#8e1616'];
    const newHearts = Array.from({ length: 8 }).map((_, i) => {
      const x = 25 + Math.random() * 50;
      const y = 60 + Math.random() * 20;
      const scale = 0.6 + Math.random() * 0.8;
      const rotation = -30 + Math.random() * 60;
      const wiggle = -50 + Math.random() * 100;
      const color = heartColors[Math.floor(Math.random() * heartColors.length)];
      return {
        id: Date.now() + i + Math.random(),
        x,
        y,
        scale,
        rotation,
        wiggle,
        color,
      };
    });
    setHearts((prev) => [...prev, ...newHearts]);
  }, []);

  const removeHeart = useCallback((id: number) => {
    setHearts((prev) => prev.filter((h) => h.id !== id));
  }, []);

  // App Navigation Flow
  const [screen, setScreen] = useState<ScreenState>('landing');
  const [showPreloader, setShowPreloader] = useState<boolean>(true);

  // Scroll container reference for Lobby smooth scroll triggers
  const lobbyScrollRef = useRef<HTMLDivElement | null>(null);

  // Scroll header styling state
  const [isScrolled, setIsScrolled] = useState<boolean>(false);

  // Custom Settings State
  const [activeLayoutId, setActiveLayoutId] = useState<string>('1x4');
  const [activeThemeId, setActiveThemeId] = useState<string>('alabaster');
  const [activeFilterId, setActiveFilterId] = useState<FilterType>('none');
  const [grainIntensity, setGrainIntensity] = useState<number>(30);
  const [showDate, setShowDate] = useState<boolean>(true);
  const [photoDelay, setPhotoDelay] = useState<number>(3); // custom delay in seconds
  const [lensEffect, setLensEffect] = useState<LensEffectType>('none');
  const [isBgmPlaying, setIsBgmPlaying] = useState<boolean>(false);
  const [isAnimatedPreview, setIsAnimatedPreview] = useState<boolean>(false);
  const [showThankYouPopup, setShowThankYouPopup] = useState<boolean>(false);
  const [isUploadingCloud, setIsUploadingCloud] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Monetization States
  const [isPremium, setIsPremium] = useState<boolean>(() => localStorage.getItem('sol_premium') === 'true');
  const [showPremiumModal, setShowPremiumModal] = useState<boolean>(false);
  const [adCountdown, setAdCountdown] = useState<number>(0);
  const [showAdOverlay, setShowAdOverlay] = useState<boolean>(false);
  const [pendingExportFormat, setPendingExportFormat] = useState<'jpg' | 'png' | 'gif' | null>(null);

  // Desktop Fine Pointer (Mouse / Trackpad) Detection for Custom Cursor
  const [isFinePointer, setIsFinePointer] = useState<boolean>(false);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)');
    setIsFinePointer(mq.matches);

    const handler = (e: MediaQueryListEvent) => setIsFinePointer(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Global Custom Cursor & Mouse position states
  const [globalMousePos, setGlobalMousePos] = useState({ x: -100, y: -100 });
  const [isHoveringClickable, setIsHoveringClickable] = useState<boolean>(false);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  const handleGlobalMouseMove = (e: React.MouseEvent) => {
    if (!isFinePointer) return;
    setGlobalMousePos({ x: e.clientX, y: e.clientY });
    
    // Check if hovering a button, link, click trigger or input
    const target = e.target as HTMLElement;
    const isClickable = target.closest('button, a, [role="button"], input, select, textarea') !== null;
    setIsHoveringClickable(isClickable);
  };

  const isLocked = (layoutId: string) => {
    return false;
  };

  const getQrCodeDataUrl = (url: string) => {
    try {
      const qr = qrcode(0, 'Q');
      qr.addData(url);
      qr.make();
      return qr.createDataURL(8);
    } catch (e) {
      console.error(e);
      return '';
    }
  };

  const copyShareLink = async () => {
    if (!shareUrl) return;
    playTick();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const toggleBgm = () => {
    if (isBgmPlaying) {
      stopLofiBgm();
      setIsBgmPlaying(false);
    } else {
      startLofiBgm();
      setIsBgmPlaying(true);
    }
  };

  // Camera & Capture Session State
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [captureState, setCaptureState] = useState<CapturingState>('idle');
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [flash, setFlash] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<HTMLCanvasElement[][]>([]);
  const [previewCanvasDataUrl, setPreviewCanvasDataUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(2); // for static frame review (defaults to middle burst frame)

  const activeLayout = LAYOUTS[activeLayoutId];
  const activeTheme = CARD_THEMES[activeThemeId];
  const currentFilter = VISUAL_FILTERS[activeFilterId];

  // Autoplay BGM with browser interaction fallbacks and preload specimen images
  useEffect(() => {
    // 1. Preload lobby specimen preview graphics to prevent hover lag
    const preloadImages = [
      '/specimen1.jpg',
      '/specimen2.jpg',
      '/specimen3.jpg',
      '/specimen4.png',
      '/specimen5.jpg'
    ];
    preloadImages.forEach(src => {
      const img = new Image();
      img.src = src;
    });

    // 2. Play lo-fi background ambient stream
    const triggerAutoplay = () => {
      startLofiBgm();
      setIsBgmPlaying(true);
    };

    // Try immediately
    triggerAutoplay();

    // Fallback: browser autoplay block bypasses on first window interaction
    const handleInteraction = () => {
      triggerAutoplay();
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };

    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    window.addEventListener('keydown', handleInteraction);

    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, []);

  // Initialize and keep Camera alive or stop based on navigation screen and video element mount
  useEffect(() => {
    let stream: MediaStream | null = null;
    let active = true;

    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = mediaStream;
        if (videoElement) {
          videoElement.srcObject = stream;
          videoElement.onloadedmetadata = () => {
            if (!active) return;
            videoElement.play();
            setIsCameraReady(true);
          };
        }
      } catch (err) {
        console.error('Failed to access camera', err);
        setIsCameraReady(false);
      }
    }

    if (screen === 'active' && videoElement) {
      setupCamera();
    } else if (screen !== 'active') {
      // Cleanup camera streams in landing or review states to release device hooks
      if (videoElement?.srcObject) {
        const streamSrc = videoElement.srcObject as MediaStream;
        streamSrc.getTracks().forEach((track) => track.stop());
        videoElement.srcObject = null;
        setIsCameraReady(false);
      }
    }

    return () => {
      active = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [screen, videoElement]);

  // Handle single slice static burst capture
  const captureFrame = useCallback((): HTMLCanvasElement => {
    const video = videoElement;
    if (!video) return document.createElement('canvas');

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror the horizontal view
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
    }
    return canvas;
  }, [videoElement]);

  // Run full photo session loop
  // Run full photo session loop
  const runSession = useCallback(async () => {
    setCapturedPhotos([]);
    const totalShots = activeLayout.slots.length;
    const newPhotos: HTMLCanvasElement[][] = [];

    for (let shot = 0; shot < totalShots; shot++) {
      // Countdown phase using selected photoDelay
      setCaptureState('countdown');
      for (let i = photoDelay; i > 0; i--) {
        setCountdownNum(i);
        playTick();
        await new Promise((r) => setTimeout(r, 1000));
      }

      // Capture phase (burst of 5 quick frames for animating GIF layout)
      setCaptureState('capturing');
      setFlash(true);
      spawnHearts();
      playShutter();
      setTimeout(() => setFlash(false), 80);

      const frames: HTMLCanvasElement[] = [];
      for (let f = 0; f < 5; f++) {
        frames.push(captureFrame());
        await new Promise((r) => setTimeout(r, 100)); // 100ms quick burst
      }
      newPhotos.push(frames);
      setCapturedPhotos([...newPhotos]); // Update active photo cache
    }

    setCaptureState('completed');
    setScreen('review');
  }, [activeLayout, photoDelay, spawnHearts, captureFrame]);

  // Listen for Spacebar or Enter to start the photo session
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen === 'active' && isCameraReady && captureState === 'idle') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          runSession();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [screen, isCameraReady, captureState, runSession]);



  // Re-generate dynamic high-end preview strip on changes
  useEffect(() => {
    if (screen === 'review' && capturedPhotos.length > 0) {
      const cvs = renderStrip(
        capturedPhotos,
        activeLayout,
        grainIntensity,
        showDate,
        selectedPhotoIndex,
        activeThemeId,
        activeFilterId,
        lensEffect
      );
      setPreviewCanvasDataUrl(cvs.toDataURL('image/jpeg', 0.95));
    }
  }, [screen, capturedPhotos, activeLayout, grainIntensity, showDate, selectedPhotoIndex, activeThemeId, activeFilterId, lensEffect]);

  // Animated "Live" Preview cycling effect
  useEffect(() => {
    let interval: any = null;
    if (screen === 'review' && isAnimatedPreview) {
      interval = setInterval(() => {
        setSelectedPhotoIndex((prev) => (prev + 1) % 5);
      }, 130);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [screen, isAnimatedPreview]);

  // High quality exporters
  const handleExport = async (format: 'jpg' | 'png' | 'gif') => {
    if (!capturedPhotos.length) return;
    setIsExporting(true);
    setIsUploadingCloud(true);
    setShareUrl(null);
    setCopied(false);

    try {
      let url = '';
      let filename = `SOL-Booth-${new Date().getTime()}`;
      let blob: Blob;

      if (format === 'jpg' || format === 'png') {
        const cvs = renderStrip(
          capturedPhotos,
          activeLayout,
          grainIntensity,
          showDate,
          selectedPhotoIndex,
          activeThemeId,
          activeFilterId,
          lensEffect
        );
        const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';

        // Convert to Blob for both download and storage upload
        blob = await new Promise<Blob>((resolve) => {
          cvs.toBlob((b) => resolve(b!), mime, format === 'jpg' ? 0.80 : undefined);
        });
        url = URL.createObjectURL(blob);
        filename += `.${format}`;
      } else {
        // Generate high performance frames with appropriate scaling to ensure no device lag
        const frames: HTMLCanvasElement[] = [];
        for (let i = 0; i < 5; i++) {
          frames.push(
            renderStrip(
              capturedPhotos,
              activeLayout,
              grainIntensity,
              showDate,
              i,
              activeThemeId,
              activeFilterId,
              lensEffect
            )
          );
        }

        // Scale GIF dimensions (0.70) to ensure high-definition QR code clarity and fast compile
        const scale = 0.70;
        const gifFrames = frames.map(f => {
          const c = document.createElement('canvas');
          c.width = Math.round(f.width * scale);
          c.height = Math.round(f.height * scale);
          const gc = c.getContext('2d');
          if (gc) {
            gc.imageSmoothingEnabled = true;
            gc.imageSmoothingQuality = 'high';
            gc.drawImage(f, 0, 0, c.width, c.height);
          }
          return c;
        });

        blob = await createGifExporter(gifFrames, gifFrames[0].width, gifFrames[0].height, 8);
        url = URL.createObjectURL(blob);
        filename += '.gif';
      }

      // Trigger local browser download instantly
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      playDing();
      setShowThankYouPopup(true);

      // Upload to Cloud Firestore (Base64 direct storage for 100% free plan compliance)
      (async () => {
        try {
          let uploadBlob = blob;

          // If the format is image, downscale it to max 900px and compress as JPEG to ensure < 1MB limit
          if (format === 'jpg' || format === 'png') {
            const tempImg = new Image();
            await new Promise((resolve, reject) => {
              tempImg.onload = resolve;
              tempImg.onerror = reject;
              tempImg.src = url;
            });

            const shareCvs = document.createElement('canvas');
            const maxDim = 900;
            let sw = tempImg.width;
            let sh = tempImg.height;
            if (sw > maxDim || sh > maxDim) {
              if (sw > sh) {
                sh = Math.round((sh * maxDim) / sw);
                sw = maxDim;
              } else {
                sw = Math.round((sw * maxDim) / sh);
                sh = maxDim;
              }
            }
            shareCvs.width = sw;
            shareCvs.height = sh;
            const sCtx = shareCvs.getContext('2d');
            if (sCtx) {
              sCtx.drawImage(tempImg, 0, 0, sw, sh);
            }

            uploadBlob = await new Promise<Blob>((resolve) => {
              shareCvs.toBlob((b) => resolve(b!), 'image/jpeg', 0.70); // keeps it ~80KB
            });
          } else if (format === 'gif') {
            // For GIF, if the original blob is too large, we generate a highly optimized low-res preview GIF
            if (blob.size > 850 * 1024) {
              const frames: HTMLCanvasElement[] = [];
              const activeLayout = LAYOUTS[activeLayoutId] || LAYOUTS['1x4'];

              // Generate the frames again, but with a lighter scale (e.g., 0.32)
              const uploadScale = 0.32;
              for (let i = 0; i < 5; i++) {
                const f = renderStrip(
                  capturedPhotos,
                  activeLayout,
                  grainIntensity,
                  showDate,
                  i,
                  activeThemeId,
                  activeFilterId,
                  lensEffect
                );

                const c = document.createElement('canvas');
                c.width = f.width * uploadScale;
                c.height = f.height * uploadScale;
                const gc = c.getContext('2d');
                if (gc) {
                  gc.drawImage(f, 0, 0, c.width, c.height);
                }
                frames.push(c);
              }

              uploadBlob = await createGifExporter(frames, frames[0].width, frames[0].height, 8);
            }
          }

          const getBase64 = (file: Blob): Promise<string> => {
            return new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = (error) => reject(error);
            });
          };

          const base64Image = await getBase64(uploadBlob);

          const { id: docId } = await createCloudShare({
            imageUrl: base64Image,
            layout: format === 'gif' ? 'animated' : activeLayoutId,
            format: format,
          });

          // Build sharing URL dynamically using window.location.origin to match the current domain
          const baseUrl = window.location.origin;
          setShareUrl(`${baseUrl}/share?id=${docId}`);
        } catch (err) {
          console.error('Firebase cloud sync failed:', err);
        } finally {
          setIsUploadingCloud(false);
        }
      })();

    } catch (e) {
      console.error('Export error', e);
      setIsUploadingCloud(false);
    } finally {
      setIsExporting(false);
    }
  };

  const triggerExport = (format: 'jpg' | 'png' | 'gif') => {
    if (isPremium) {
      handleExport(format);
      return;
    }

    const currentCountStr = localStorage.getItem('sol_export_count') || '0';
    const currentCount = parseInt(currentCountStr, 10);
    const newCount = currentCount + 1;
    localStorage.setItem('sol_export_count', newCount.toString());

    if (newCount % 3 === 0) {
      setPendingExportFormat(format);
      setAdCountdown(5);
      setShowAdOverlay(true);
    } else {
      handleExport(format);
    }
  };

  useEffect(() => {
    let timer: any = null;
    if (showAdOverlay && adCountdown > 0) {
      timer = setInterval(() => {
        setAdCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [showAdOverlay, adCountdown]);

  const startNewSession = () => {
    setIsFlashing(true);
    setTimeout(() => {
      setCapturedPhotos([]);
      setCaptureState('idle');
      setPreviewCanvasDataUrl(null);
      setLensEffect('none');
      setIsAnimatedPreview(false);
      setSelectedPhotoIndex(2);
      setScreen('active');
      if (lobbyScrollRef.current) {
        lobbyScrollRef.current.scrollTop = 0;
      }
    }, 220);
    setTimeout(() => {
      setIsFlashing(false);
    }, 550);
  };

  const returnToMenu = () => {
    setIsFlashing(true);
    setTimeout(() => {
      setCapturedPhotos([]);
      setCaptureState('idle');
      setPreviewCanvasDataUrl(null);
      setLensEffect('none');
      setIsAnimatedPreview(false);
      setSelectedPhotoIndex(2);
      setScreen('landing');
      if (lobbyScrollRef.current) {
        lobbyScrollRef.current.scrollTop = 0;
      }
    }, 220);
    setTimeout(() => {
      setIsFlashing(false);
    }, 550);
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToTop = () => {
    if (lobbyScrollRef.current) {
      lobbyScrollRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleLobbyScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setIsScrolled(e.currentTarget.scrollTop > 35);
  };

  return (
    <div
      ref={lobbyScrollRef}
      onMouseMove={handleGlobalMouseMove}
      onScroll={screen === 'landing' ? handleLobbyScroll : undefined}
      className={cn(
        "w-screen bg-[#080808] text-[#e0e0e0] font-sans select-none relative transition-colors duration-500",
        isFinePointer && "custom-cursor-active",
        screen === 'landing'
          ? "h-screen overflow-y-auto overflow-x-hidden flex flex-col bg-[#09090b] bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px]"
          : "h-[100dvh] overflow-y-auto md:overflow-hidden overflow-x-hidden flex flex-col items-center justify-center md:p-4"
      )}
    >
      {showPreloader && (
        <Preloader onComplete={() => setShowPreloader(false)} />
      )}

      {/* Background Ambience Light Glows (Corner Edges) - Only rendered in studio screen views */}
      {screen !== 'landing' && (
        <>
          <div className="absolute -top-[200px] -left-[200px] w-[500px] h-[500px] bg-[#8e1616] rounded-full blur-[140px] pointer-events-none z-0 animate-ambient-1" />
          <div className="absolute -bottom-[200px] -right-[200px] w-[500px] h-[500px] bg-[#8e1616] rounded-full blur-[140px] pointer-events-none z-0 animate-ambient-2" />
          <div className="absolute -top-[150px] -right-[150px] w-[400px] h-[400px] bg-[#dfccd5] rounded-full blur-[120px] pointer-events-none z-0 animate-ambient-3" />
          <div className="absolute -bottom-[150px] -left-[150px] w-[400px] h-[400px] bg-[#dfccd5] rounded-full blur-[120px] pointer-events-none z-0 animate-ambient-4" />
        </>
      )}

      <AnimatePresence mode="wait">

        {/* SCREEN 1: LANDING / OPENING PAGE (Signal-A Inspired) */}
        {screen === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full flex flex-col relative z-10 px-4 md:px-8 py-8 max-w-7xl mx-auto"
          >
            <Lobby
              startNewSession={startNewSession}
              scrollToTop={scrollToTop}
              scrollToSection={scrollToSection}
              isScrolled={isScrolled}
            />
          </motion.div>
        )}

        {/* SCREEN 2: ACTIVE PHOTOBOOTH WORKSPACE */}
        {screen === 'active' && (
          <motion.div
            key="workspace-active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full min-h-[100dvh] md:min-h-0 md:h-[92vh] max-w-7xl flex flex-col md:flex-row bg-[#0c0c0c] border md:border-8 border-[#1a1a1a] shadow-3xl z-10 relative overflow-y-auto md:overflow-hidden shrink-0"
          >
            {/* BACK TO MENU / BRAND HEADER BAR (MOBILE) */}
            <div className="md:hidden flex justify-between items-center px-6 py-4 bg-[#0f0f0f] border-b border-[#222] order-1">
              <button
                onClick={returnToMenu}
                className="text-xs uppercase tracking-wider text-stone-400 hover:text-white flex items-center gap-1.5 font-mono"
              >
                <ArrowLeft className="w-4 h-4" /> Menu
              </button>
              <span className="font-serif italic text-lg leading-none text-white tracking-wide">S.O.L</span>
              <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: '#8e1616' }} />
            </div>

            {/* Workspace Sidebar controls */}
            <aside className="w-full md:w-80 bg-[#0f0f0f] md:border-r border-[#2a2a2a] p-6 md:p-8 flex flex-col shrink-0 md:overflow-y-auto order-3 md:order-1">

              {/* Back to main landing */}
              <button
                onClick={returnToMenu}
                className="hidden md:flex items-center gap-2.5 text-[11px] font-mono text-stone-400 hover:text-white transition-colors uppercase tracking-widest mb-10 text-left bg-transparent border-0 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Return to Menu
              </button>

              <div className="mb-8 hidden md:block">
                <img src="/logo.png" alt="S.O.L Logo" className="h-9 w-auto object-contain" />
              </div>

              <div className="space-y-6 flex-grow">
                {/* 1. Layout Configuration Selection */}
                <section>
                  <label className="text-[11px] uppercase tracking-widest text-[#888] font-semibold block mb-3">Frame Configuration</label>
                  <div className="grid grid-cols-5 md:grid-cols-3 gap-2">
                    {Object.values(LAYOUTS).map((layout) => {
                      const locked = isLocked(layout.id);
                      return (
                        <button
                          key={layout.id}
                          disabled={captureState === 'countdown' || captureState === 'capturing'}
                          onClick={() => {
                            setActiveLayoutId(layout.id);
                          }}
                          className={cn(
                            "aspect-square border flex flex-col gap-1 p-1.5 items-center justify-center transition-all disabled:opacity-30 rounded-xs cursor-pointer relative",
                            activeLayoutId === layout.id
                              ? "border-white bg-white/5 text-white"
                              : locked
                                ? "border-[#222] hover:border-amber-500/50 text-[#888] hover:text-amber-500"
                                : "border-[#222] hover:border-[#444] text-[#888] hover:text-white"
                          )}
                          title={layout.name}
                        >
                          {locked && (
                            <div className="absolute top-1 right-1 bg-black/80 border border-amber-500/30 p-[2px] rounded-full">
                              <Lock className="w-2 h-2 text-amber-500" />
                            </div>
                          )}
                          {layout.id === '1x3' && <div className="w-3.5 h-5 border border-current opacity-60"></div>}
                          {layout.id === '1x4' && <div className="w-3.5 h-6 border border-current opacity-60"></div>}
                          {layout.id === '2x2' && (
                            <div className="grid grid-cols-2 gap-[1.5px] opacity-60">
                              <div className="w-2 h-2 border border-current"></div>
                              <div className="w-2 h-2 border border-current"></div>
                              <div className="w-2 h-2 border border-current"></div>
                              <div className="w-2 h-2 border border-current"></div>
                            </div>
                          )}
                          {layout.id === '1x1' && <div className="w-4 h-4 border border-current opacity-60 bg-current/10"></div>}
                          {layout.id === '2x1' && <div className="w-5 h-2.5 border border-current opacity-60"></div>}
                          {layout.id === 'scrapbook' && (
                            <div className="relative w-4 h-5 opacity-60">
                              <div className="absolute top-0.5 left-0.5 w-2.5 h-3.5 border border-current transform -rotate-12 bg-current/5"></div>
                              <div className="absolute top-1 left-2 w-2.5 h-3.5 border border-current transform rotate-12 bg-current/5"></div>
                            </div>
                          )}
                          {layout.id === 'filmstrip' && (
                            <div className="relative w-4 h-5 opacity-60 border border-current flex flex-col justify-between py-[1.5px] px-[2.5px] overflow-hidden">
                              {/* mock sprockets */}
                              <div className="absolute left-[0.5px] top-0 bottom-0 flex flex-col justify-between py-[1px]">
                                <div className="w-[0.5px] h-[0.5px] bg-current"></div>
                                <div className="w-[0.5px] h-[0.5px] bg-current"></div>
                                <div className="w-[0.5px] h-[0.5px] bg-current"></div>
                                <div className="w-[0.5px] h-[0.5px] bg-current"></div>
                              </div>
                              <div className="absolute right-[0.5px] top-0 bottom-0 flex flex-col justify-between py-[1px]">
                                <div className="w-[0.5px] h-[0.5px] bg-current"></div>
                                <div className="w-[0.5px] h-[0.5px] bg-current"></div>
                                <div className="w-[0.5px] h-[0.5px] bg-current"></div>
                                <div className="w-[0.5px] h-[0.5px] bg-current"></div>
                              </div>
                              <div className="w-full h-1 border border-current bg-current/5"></div>
                              <div className="w-full h-1 border border-current bg-current/5"></div>
                            </div>
                          )}
                          <span className="text-[9px] uppercase font-mono tracking-tighter mt-1">{layout.id}</span>
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => {
                      setShowPremiumModal(true);
                    }}
                    className="w-full mt-3 py-2.5 bg-gradient-to-r from-rose-500/10 to-rose-700/10 border border-rose-500/30 hover:border-rose-500/60 text-rose-500 text-[10px] font-bold uppercase tracking-wider rounded-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer font-bold"
                  >
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    Support the Creator
                  </button>
                </section>

                {/* 2. Photo Timer Pose Delay */}
                <section className="pt-4 border-t border-[#222]">
                  <label className="text-[11px] uppercase tracking-widest text-[#888] font-semibold flex items-center gap-2 mb-2.5">
                    <Clock className="w-3.5 h-3.5 text-stone-400" /> Pose Interval (Sec)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[2, 3, 5, 10].map((sec) => (
                      <button
                        key={sec}
                        disabled={captureState === 'countdown' || captureState === 'capturing'}
                        onClick={() => setPhotoDelay(sec)}
                        className={cn(
                          "py-1.5 text-xs font-mono border transition-all cursor-pointer rounded-xs",
                          photoDelay === sec
                            ? "border-white bg-white text-black"
                            : "border-[#222] text-[#888] hover:text-white hover:border-[#444]"
                        )}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </section>

                {/* 3. Live Previewable Filter */}
                <section className="pt-4 border-t border-[#222]">
                  <label className="text-[11px] uppercase tracking-widest text-[#888] font-semibold flex items-center gap-2 mb-2.5">
                    <Sparkles className="w-3.5 h-3.5 text-stone-400" /> Live Filter
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(VISUAL_FILTERS).map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setActiveFilterId(f.id as FilterType)}
                        className={cn(
                          "py-2 px-3 text-[10px] uppercase font-bold text-left border transition-all truncate rounded-xs cursor-pointer",
                          activeFilterId === f.id
                            ? "border-white bg-white/5 text-white"
                            : "border-[#222] text-stone-400 hover:text-white hover:border-[#444]"
                        )}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              {/* Sidebar Action Button */}
              <div className="mt-8 pt-6 border-t border-[#2a2a2a]">
                <button
                  onClick={runSession}
                  disabled={!isCameraReady || captureState === 'countdown' || captureState === 'capturing'}
                  className="w-full py-4.5 bg-white text-black hover:bg-stone-100 text-xs font-bold uppercase tracking-[0.25em] flex items-center justify-center gap-3 transition-colors disabled:opacity-40 select-none cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  {captureState === 'idle' ? 'Start Session' : 'Capturing...'}
                </button>
              </div>


            </aside>

            {/* Live Feed Video Viewport */}
            <main className="flex-grow relative flex items-center justify-center p-4 md:p-12 bg-[#080808] overflow-hidden min-h-[300px] md:min-h-[400px] order-2 md:order-2">
              {/* Vignette Shadow Overlay */}
              <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.95)] z-20" />

              {/* Stream Video Wrapper with applied selected LIVE FILTER style */}
              <div className="relative w-full max-w-4xl aspect-[4/3] bg-[#111] overflow-hidden border border-[#222] shadow-3xl z-10">
                <video
                  ref={setVideoElement}
                  muted
                  playsInline
                  autoPlay
                  style={{ filter: currentFilter.style }}
                  className="w-full h-full object-cover transform -scale-x-100 transition-all duration-300"
                />
                {/* HUD: Live Status Indicators */}
                <div className="absolute top-4 left-4 flex items-center gap-2 z-25 font-mono bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-sm border border-white/5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div>
                  <span className="text-[9px] uppercase tracking-widest text-[#eaeaea] font-bold">LIVE VIEW</span>
                </div>
                <div className="absolute bottom-4 right-4 text-right z-25 font-mono bg-black/60 backdrop-blur-xs px-2.5 py-1 rounded-sm border border-white/5 text-[8px] uppercase tracking-wider text-stone-300">
                  <p className="text-white/40 font-bold">PREVIEW COMPRESSOR: HIGH-RES 60FPS</p>
                  <p className="text-stone-500 font-bold mt-0.5">POSE GAP: {photoDelay} SECONDS</p>
                </div>

                {/* Animated Film grain live overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.22] mix-blend-overlay z-15 bg-[radial-gradient(#fff_1.2px,transparent_1.2px)] [background-size:10px_10px]" />

                {/* Floating Pixelated Hearts Shutter Overlay */}
                <AnimatePresence>
                  {hearts.map((heart) => (
                    <motion.div
                      key={heart.id}
                      initial={{
                        opacity: 0,
                        scale: 0,
                        left: `${heart.x}%`,
                        top: `${heart.y}%`,
                        rotate: heart.rotation,
                      }}
                      animate={{
                        opacity: [0, 1, 1, 0],
                        scale: [0.2, heart.scale, heart.scale, 0],
                        y: [0, -180],
                        x: [0, heart.wiggle],
                      }}
                      transition={{
                        duration: 1.5,
                        ease: 'easeOut',
                      }}
                      onAnimationComplete={() => removeHeart(heart.id)}
                      style={{
                        position: 'absolute',
                        transform: 'translate(-50%, -50%)',
                        color: heart.color,
                      }}
                      className="absolute pointer-events-none z-30"
                    >
                      <PixelHeart className="w-8 h-8" />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Countdown Overlay */}
                {captureState === 'countdown' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-xs z-20">
                    <motion.span
                      key={countdownNum}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.1, opacity: 1 }}
                      transition={{ duration: 0.45, ease: 'easeOut' }}
                      className="text-9xl md:text-[11rem] text-white font-serif italic font-medium drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)]"
                    >
                      {countdownNum}
                    </motion.span>
                  </div>
                )}

                {/* White Flash shutter layer */}
                <AnimatePresence>
                  {flash && (
                    <motion.div
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                      className="absolute inset-0 bg-white z-50 pointer-events-none"
                    />
                  )}
                </AnimatePresence>

                {/* In-progress state overlay indicator */}
                {['countdown', 'capturing'].includes(captureState) && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/85 border border-[#333] px-5 py-2.5 text-[10px] font-mono uppercase tracking-[0.2em] text-[#e0e0e0] z-25 rounded-full shadow-lg">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#8e1616' }}></span>
                      <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: '#8e1616' }}></span>
                    </span>
                    <span>Pose {capturedPhotos.length + 1} of {activeLayout.slots.length}</span>
                  </div>
                )}
              </div>
            </main>
          </motion.div>
        )}

        {/* SCREEN 3: HIGH-RES REVIEW & RETAKE */}
        {screen === 'review' && (
          <motion.div
            key="workspace-review"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full min-h-[100dvh] md:min-h-0 md:h-[92vh] max-w-7xl flex flex-col-reverse md:flex-row bg-[#0c0c0c] border md:border-8 border-[#1a1a1a] shadow-3xl z-10 relative overflow-y-auto md:overflow-hidden shrink-0 animate-in fade-in duration-300"
          >
            {/* Sidebar controls for POST-PROCESSING */}
            <aside className="w-full md:w-80 bg-[#0f0f0f] md:border-r border-[#2a2a2a] p-6 md:p-8 flex flex-col shrink-0 md:overflow-y-auto">
              <div className="mb-6">
                <img src="/logo.png" alt="S.O.L Logo" className="h-9 w-auto object-contain" />
              </div>

              <div className="space-y-6 flex-grow">

                {/* 1. Select Theme Card Template */}
                <section>
                  <label className="text-[11px] uppercase tracking-widest text-[#888] font-semibold block mb-2.5">Card Material Theme</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(CARD_THEMES).map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setActiveThemeId(theme.id)}
                        className={cn(
                          "px-2.5 py-2 border text-left rounded-xs transition-all flex flex-col justify-between h-[52px] select-none cursor-pointer",
                          activeThemeId === theme.id
                            ? "border-white bg-white/5"
                            : "border-[#222] hover:border-[#333] hover:bg-white/5"
                        )}
                      >
                        <span className="text-[10px] font-sans text-white truncate font-medium">{theme.name}</span>
                        <div className="flex gap-1 items-center">
                          <div className={cn("w-3.5 h-3", theme.bgClass, "border border-white/25")} />
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.stampColor }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Display Mode (Classic Print vs. Live Digital) */}
                <section className="pt-4 border-t border-[#222]">
                  <label className="text-[11px] uppercase tracking-widest text-[#888] font-semibold block mb-2.5">
                    Display Mode
                  </label>
                  <div className="relative bg-[#171717] border border-[#222] p-1 rounded-full flex items-center select-none">
                    {/* Sliding background pill */}
                    <div
                      className="absolute top-1 bottom-1 left-1 rounded-full bg-white transition-all duration-300 ease-out"
                      style={{
                        width: 'calc(50% - 4px)',
                        transform: isAnimatedPreview ? 'translateX(100%)' : 'translateX(0%)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setIsAnimatedPreview(false)}
                      className={cn(
                        "relative flex-1 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 z-10 cursor-pointer rounded-full",
                        !isAnimatedPreview ? "text-black" : "text-stone-400 hover:text-stone-200"
                      )}
                    >
                      Classic Print
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAnimatedPreview(true)}
                      className={cn(
                        "relative flex-1 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 z-10 cursor-pointer rounded-full",
                        isAnimatedPreview ? "text-black" : "text-stone-400 hover:text-stone-200"
                      )}
                    >
                      GIF PREVIEW
                    </button>
                  </div>
                  <p className="text-[9px] text-[#555] mt-2 font-serif italic">
                    {isAnimatedPreview
                      ? "Live Digital: Auto-cycling photo frames to simulate a vintage animated loop."
                      : "Classic Print: A static high-res photo composite, ready for print/export."}
                  </p>
                </section>

                {/* 2. Captured Burst Index Selection */}
                <section className="pt-4 border-t border-[#222]">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[11px] uppercase tracking-widest text-[#888] font-semibold block">Select Burst Motion Frame</label>
                    <span className="text-[10px] font-mono text-stone-500">
                      {isAnimatedPreview ? "Auto-cycling" : `Frame #${selectedPhotoIndex + 1}`}
                    </span>
                  </div>
                  <div className={cn("grid grid-cols-5 gap-1.5 transition-opacity duration-200", isAnimatedPreview && "opacity-40 pointer-events-none")}>
                    {[0, 1, 2, 3, 4].map((idx) => (
                      <button
                        key={idx}
                        disabled={isAnimatedPreview}
                        onClick={() => setSelectedPhotoIndex(idx)}
                        className={cn(
                          "py-2 text-[10px] font-mono border transition-all cursor-pointer rounded-xs",
                          selectedPhotoIndex === idx
                            ? "border-white bg-white text-black"
                            : "border-[#222] text-stone-400 hover:text-white hover:border-[#333]"
                        )}
                      >
                        F{idx + 1}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-[#555] mt-2 font-serif italic">Every photo captures a 5-frame emotional burst, select the one that looks finest, or export all loop-animated as a GIF.</p>
                </section>

                {/* 3. Dynamic Realtime Filters adjustment */}
                <section className="pt-4 border-t border-[#222] space-y-4">
                  <label className="text-[11px] uppercase tracking-widest text-[#888] font-semibold block">CHOOSE YOUR EFFECTS!</label>

                  {/* Realtime filter dropdown option */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-stone-400">Tone Preset</span>
                    <select
                      value={activeFilterId}
                      onChange={(e) => setActiveFilterId(e.target.value as FilterType)}
                      className="w-full bg-[#171717] border border-[#222] text-xs font-mono py-2 px-2.5 text-white focus:outline-none focus:border-stone-500 rounded-xs cursor-pointer"
                    >
                      {Object.values(VISUAL_FILTERS).map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px]">
                      <span>Analog Film Grain</span>
                      <span className="text-[#666] font-mono">{grainIntensity}%</span>
                    </div>
                    <input
                      type="range"
                      min="0" max="100"
                      value={grainIntensity}
                      onChange={(e) => setGrainIntensity(Number(e.target.value))}
                      className="w-full h-1 bg-[#222] rounded-none appearance-none cursor-pointer accent-white"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px]">Nostalgic Date Stamp</span>
                    <button
                      onClick={() => setShowDate(!showDate)}
                      className={cn(
                        "w-10 h-5 rounded-full flex items-center px-1 transition-colors relative cursor-pointer",
                        showDate ? "bg-white" : "bg-[#252525]"
                      )}
                    >
                      <div className={cn(
                        "w-3 h-3 rounded-full transition-transform absolute",
                        showDate ? "bg-black translate-x-5" : "bg-[#666]"
                      )} />
                    </button>
                  </div>

                  {/* Camera Lens Effect selector */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <span className="text-[10px] text-stone-400">Camera Lens Effect</span>
                    <select
                      value={lensEffect}
                      onChange={(e) => setLensEffect(e.target.value as LensEffectType)}
                      className="w-full bg-[#171717] border border-[#222] text-xs font-mono py-2 px-2.5 text-white focus:outline-none focus:border-stone-500 rounded-xs cursor-pointer animate-in fade-in duration-200"
                    >
                      <option value="none">Standard Lens</option>
                      <option value="fisheye">Wide Fish-Eye</option>
                      <option value="toycam">Retro Toy Cam</option>
                      <option value="filmburn">Film Burn Flare</option>
                    </select>
                  </div>
                </section>



              </div>

              {/* Export Deliverables Area */}
              <div className="mt-8 space-y-3 pt-6 border-t border-[#2a2a2a]">
                <label className="text-[11px] uppercase tracking-widest text-[#888] font-semibold block">Deliverables</label>                 <button
                  onClick={() => triggerExport('jpg')}
                  disabled={isExporting}
                  className="w-full py-4 bg-white text-black text-[12px] font-bold uppercase tracking-widest hover:bg-[#ccc] transition-colors disabled:opacity-50 select-none cursor-pointer"
                >
                  Export High-Res JPG
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => triggerExport('png')}
                    disabled={isExporting}
                    className="flex-1 py-2.5 border border-[#333] text-[#e0e0e0] hover:bg-white/5 text-[10px] uppercase tracking-tighter transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Save PNG
                  </button>
                  <button
                    onClick={() => triggerExport('gif')}
                    disabled={isExporting}
                    className="flex-1 py-2.5 border border-[#333] text-[#e0e0e0] hover:bg-white/5 text-[10px] uppercase tracking-tighter transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isExporting ? 'Encoding...' : 'Export GIF'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    onClick={startNewSession}
                    className="py-3 text-stone-300 hover:text-white border border-[#222] hover:border-[#444] text-[10px] uppercase tracking-tighter transition-colors rounded-xs cursor-pointer"
                  >
                    Retake Session
                  </button>
                  <button
                    onClick={returnToMenu}
                    className="py-3 text-stone-500 hover:text-stone-300 text-[10px] uppercase tracking-tighter transition-colors cursor-pointer"
                  >
                    Return to Menu
                  </button>
                </div>
              </div>
            </aside>

            {/* High-res Rendered Specimen Preview */}
            <main className="flex-grow relative flex items-center justify-center p-4 md:p-12 bg-[#080808] overflow-hidden min-h-[350px] md:min-h-[450px]">
              {/* Vignette Shadow Overlay */}
              <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.95)] z-20" />

              {previewCanvasDataUrl && (
                <div className="relative max-h-full max-w-full flex items-center justify-center animate-in fade-in zoom-in-95 duration-500 z-10 p-2 select-none md:p-6">
                  <img
                    src={previewCanvasDataUrl}
                    alt="Final composited strip"
                    className="max-h-[80vh] md:max-h-[84vh] w-auto max-w-full object-contain shadow-3xl transform md:rotate-1"
                    style={{
                      filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.7))'
                    }}
                  />
                  {isExporting && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-4 border-[#333] border-t-white rounded-full animate-spin mb-4" />
                      <p className="text-white text-[11px] uppercase tracking-[0.2em] font-mono shadow-md">Encoding Frame data...</p>
                    </div>
                  )}
                </div>
              )}
            </main>
          </motion.div>
        )}        {/* Premium Checkout Modal */}
        <AnimatePresence>
          {showPremiumModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPremiumModal(false)}
                className="absolute inset-0 bg-black/85 backdrop-blur-md"
              />

              {/* Modal Card */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="relative w-full max-w-sm bg-[#121212] border border-stone-800 rounded-xl p-6 md:p-8 text-center space-y-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9)] z-10 font-mono"
              >
                {/* Close Button */}
                <button
                  onClick={() => setShowPremiumModal(false)}
                  className="absolute top-4 right-4 text-stone-500 hover:text-white transition-colors text-lg cursor-pointer border-0 bg-transparent"
                >
                  ✕
                </button>

                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-1">
                    <Heart className="w-5 h-5 text-rose-500 animate-pulse" />
                  </div>
                  <h2 className="font-serif text-2xl italic text-white leading-none">Support S.O.L Creator</h2>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-stone-500">
                    Voluntary Tip Jar
                  </p>
                </div>

                {/* QRIS / Checkout content */}
                <div className="bg-[#181818] border border-stone-800/80 p-5 rounded-lg flex flex-col items-center gap-4 relative overflow-hidden animate-in fade-in duration-300">
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-rose-500 via-pink-500 to-rose-700 opacity-60" />

                  <div className="w-full flex flex-col items-center gap-4">
                    {/* Real QRIS Image */}
                    <div className="relative bg-white p-2.5 rounded-lg shadow-xl inline-block border border-rose-500/20 max-w-[200px]">
                      <img
                        src="/qris.png"
                        alt="QRIS Payment QR"
                        className="w-full h-auto select-none"
                      />
                    </div>

                    {/* Instructions */}
                    <div className="space-y-2 w-full text-center">
                      <p className="text-[10px] text-stone-300 uppercase tracking-widest font-bold">
                        Scan to Support S.O.L
                      </p>
                      <p className="text-[8.5px] text-stone-400 max-w-[280px] mx-auto leading-relaxed">
                        Scan the QRIS above with GoPay or any payment app. Your voluntary support keeps S.O.L online and free for everyone!
                      </p>
                    </div>
                  </div>
                </div>

                {/* Direct Unlocked Switch (Self-verify) */}
                <div className="space-y-3 pt-2 border-t border-stone-900">
                  <button
                    onClick={() => {
                      playDing();
                      setIsPremium(true);
                      localStorage.setItem('sol_premium', 'true');
                      setShowPremiumModal(false);
                    }}
                    className="w-full py-2.5 bg-gradient-to-r from-rose-500/20 to-rose-700/20 border border-rose-500/30 hover:border-rose-500/60 text-rose-455 hover:text-rose-400 text-[10px] font-bold uppercase tracking-wider transition-colors rounded-sm cursor-pointer"
                  >
                    I have Supported
                  </button>
                  <button
                    onClick={() => setShowPremiumModal(false)}
                    className="w-full py-2 bg-stone-900 border border-stone-850 hover:border-stone-800 text-stone-400 hover:text-stone-300 text-[9px] font-bold uppercase tracking-wider transition-colors rounded-sm cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Thank You / Feedback Popup Modal (Triggered on Export) */}
        <AnimatePresence>
          {showThankYouPopup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
              {/* Backdrop overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowThankYouPopup(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
              />

              {/* Modal Box */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="relative w-full max-w-md bg-[#121212] border border-stone-800 rounded-xl p-8 text-center space-y-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.9)] z-10 font-mono"
              >
                {/* Close Button */}
                <button
                  onClick={() => setShowThankYouPopup(false)}
                  className="absolute top-4 right-4 text-stone-500 hover:text-white transition-colors text-lg cursor-pointer border-0 bg-transparent"
                >
                  ✕
                </button>

                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-stone-900 border border-stone-800 flex items-center justify-center mx-auto mb-2 animate-pulse">
                    <Heart className="w-5 h-5 text-[#8e1616]" style={{ fill: 'rgba(142, 22, 22, 0.4)' }} />
                  </div>
                  <h2 className="font-serif text-2xl italic text-white leading-none">Snap of Love</h2>
                  <p className="text-[9px] uppercase tracking-[0.2em] text-stone-500">
                    {isUploadingCloud ? 'Syncing to Cloud Tape...' : 'Memory Composited & Linked'}
                  </p>
                </div>

                {/* Cloud Share Section */}
                <div className="bg-[#181818] border border-stone-800/80 p-5 rounded-lg flex flex-col items-center gap-4 relative overflow-hidden">
                  <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-amber-500 via-red-500 to-indigo-500 opacity-40" />

                  {isUploadingCloud ? (
                    <div className="py-6 flex flex-col items-center gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                      <p className="text-[10px] text-stone-400 uppercase tracking-widest leading-relaxed">
                        [ Uploading to cloud... ]
                      </p>
                    </div>
                  ) : shareUrl ? (
                    <div className="w-full flex flex-col items-center gap-4">
                      {/* QR Code Container */}
                      <div className="bg-white p-3 rounded-lg shadow-xl inline-block">
                        <img
                          src={getQrCodeDataUrl(shareUrl)}
                          alt="Share QR Code"
                          className="w-32 h-32 select-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] text-stone-300 uppercase tracking-widest font-bold">
                          Scan to download on mobile
                        </p>
                        <p className="text-[9px] text-stone-500">
                          Or share this retro link with friends
                        </p>
                      </div>

                      {/* Link copy component */}
                      <div className="w-full flex items-center gap-2 border border-stone-800 bg-[#0e0e0e] p-1 pl-3 text-left">
                        <span className="text-[10px] text-stone-400 truncate flex-1 font-mono">
                          {shareUrl}
                        </span>
                        <button
                          onClick={copyShareLink}
                          className={cn(
                            "px-4 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer rounded-none border-l border-stone-800",
                            copied
                              ? "bg-amber-500 text-black hover:bg-amber-400"
                              : "bg-[#161616] text-white hover:bg-stone-800"
                          )}
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Copied
                            </>
                          ) : (
                            <>
                              <LinkIcon className="w-3.5 h-3.5" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-6 flex flex-col items-center gap-2 text-stone-500 text-[10px] uppercase tracking-wider">
                      [ Cloud feature unavailable ]
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-stone-400 leading-relaxed font-serif italic max-w-sm mx-auto">
                    Your photo strip has been saved. Scan the QR code to load it on your phone or share the nostalgia!
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-2">
                  <a
                    href="https://www.instagram.com/snapoflove.id/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 bg-[#181818] border border-stone-800 hover:border-white hover:bg-white/5 text-stone-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all select-none cursor-pointer rounded-sm"
                  >
                    <Instagram className="w-4 h-4" />
                    Follow @snapoflove.id
                  </a>
                  <a
                    href="https://forms.gle/BdPLUwGqoPfzcQ7r5"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 bg-[#181818] border border-stone-800 hover:border-white hover:bg-white/5 text-stone-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all select-none cursor-pointer rounded-sm"
                  >
                    <Smile className="w-4 h-4" />
                    Share Feedback Form
                  </a>
                </div>

                <div className="pt-2 text-[9px] text-stone-600 font-mono">
                  Click anywhere outside or ✕ to close
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Fullscreen Countdown Ad Overlay */}
        <AnimatePresence>
          {showAdOverlay && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/95 backdrop-blur-md"
              />

              {/* Ad Card container */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-lg bg-[#141414] border border-stone-800 rounded-xl p-8 text-center space-y-6 shadow-3xl z-10 font-mono"
              >
                {/* Header info */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-mono tracking-[0.25em] text-[#8e1616] font-bold">
                    S.O.L Studio Sponsor Interstitial
                  </span>
                  <h2 className="font-serif text-3xl italic text-white leading-tight">
                    Processing Film Strip
                  </h2>
                  <div className="h-[2px] w-12 bg-stone-800 mx-auto my-2" />
                </div>

                {/* Main simulated ad display area */}
                <div className="bg-black/50 border border-stone-900 p-6 rounded-lg relative overflow-hidden flex flex-col items-center justify-center min-h-[160px] gap-3">
                  <Heart className="w-10 h-10 text-[#8e1616]/30 animate-pulse" style={{ fill: 'rgba(142, 22, 22, 0.1)' }} />
                  <p className="text-xs text-stone-300 font-bold uppercase tracking-wider">
                    SNAP OF LOVE • ANALOG EMOTIONS
                  </p>
                  <p className="text-[10px] text-stone-500 max-w-[280px] leading-relaxed">
                    S.O.L is 100% free and cardless. Support our free plan by following our releases on Instagram!
                  </p>
                  <a
                    href="https://www.instagram.com/snapoflove.id/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-widest text-[#8e1616] hover:text-[#b02a2a] underline font-bold mt-2"
                  >
                    @snapoflove.id <Instagram className="w-3.5 h-3.5 inline ml-1" />
                  </a>
                </div>

                {/* Progress bar simulation */}
                <div className="space-y-2 text-left">
                  <div className="flex justify-between text-[10px] text-stone-500 uppercase tracking-wider font-bold">
                    <span>Developing exposure...</span>
                    <span>{adCountdown > 0 ? `${adCountdown}s remaining` : 'Complete'}</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#1e1e1e] rounded-none overflow-hidden relative border border-stone-900">
                    <motion.div
                      initial={{ width: '0%' }}
                      animate={{ width: `${((5 - adCountdown) / 5) * 100}%` }}
                      className="absolute inset-y-0 left-0 bg-[#8e1616]"
                    />
                  </div>
                </div>

                {/* Skip CTA Button */}
                <button
                  disabled={adCountdown > 0}
                  onClick={() => {
                    if (pendingExportFormat) {
                      handleExport(pendingExportFormat);
                    }
                    setShowAdOverlay(false);
                    setPendingExportFormat(null);
                  }}
                  className={cn(
                    "w-full py-4.5 text-xs font-bold uppercase tracking-[0.25em] transition-all select-none cursor-pointer border-0",
                    adCountdown > 0
                      ? "bg-stone-900 text-stone-500 border border-stone-850 cursor-not-allowed"
                      : "bg-white text-black hover:bg-stone-200"
                  )}
                >
                  {adCountdown > 0 ? `Skip Ad in ${adCountdown}s` : 'Skip Ad & Save File'}
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </AnimatePresence>

      {/* Retro Flash Screen Transition */}
      <AnimatePresence>
        {isFlashing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: "easeInOut" }}
            className="fixed inset-0 pointer-events-none bg-white z-[9999]"
          />
        )}
      </AnimatePresence>

      {/* Camera Viewfinder Autofocus Cursor (Only rendered on desktop devices with a physical mouse/trackpad) */}
      {isFinePointer && (
        <motion.div
          style={{
            position: 'fixed',
            left: globalMousePos.x,
            top: globalMousePos.y,
            pointerEvents: 'none',
            zIndex: 99999,
            transform: 'translate(-50%, -50%)',
          }}
          className="hidden md:flex items-center justify-center pointer-events-none"
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Center pinpoint */}
            <circle cx="16" cy="16" r="2" fill={isHoveringClickable ? "#8e1616" : "#ffffff"} />
            
            {/* Viewfinder brackets layer (contracts and rotates on active hover) */}
            <motion.g
              animate={{
                scale: isHoveringClickable ? 0.75 : 1,
                rotate: isHoveringClickable ? 90 : 0,
              }}
              transition={{ type: 'spring', stiffness: 350, damping: 20 }}
              style={{ originX: 0.5, originY: 0.5, transformOrigin: 'center' }}
            >
              {/* Top-Left Corner */}
              <path d="M 6 12 V 6 H 12" stroke={isHoveringClickable ? "#8e1616" : "#ffffff"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              {/* Top-Right Corner */}
              <path d="M 26 12 V 6 H 20" stroke={isHoveringClickable ? "#8e1616" : "#ffffff"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              {/* Bottom-Left Corner */}
              <path d="M 6 20 V 26 H 12" stroke={isHoveringClickable ? "#8e1616" : "#ffffff"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              {/* Bottom-Right Corner */}
              <path d="M 26 20 V 26 H 20" stroke={isHoveringClickable ? "#8e1616" : "#ffffff"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </motion.g>
          </svg>
        </motion.div>
      )}

    </div>
  );
}
