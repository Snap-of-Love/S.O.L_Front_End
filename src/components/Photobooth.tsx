import { ImportPhotos } from '../studio/ImportPhotos';
import { DraftBar } from '../studio/DraftBar';
import { useDraft } from '../studio/useDraft';
import { CropControls } from '../studio/CropControls';
import { defaultCrop, type PhotoCrop } from '../studio/crop';
import { DecorationControls } from '../studio/DecorationControls';
import { DrawingPreview } from '../studio/DrawingPreview';
import type { Decoration } from '../studio/decorations';
import { TemplateEditor } from '../studio/TemplateEditor';
import { templateLayout, type StudioTemplate } from '../studio/templates';
import { validateOverlay } from '../studio/templateStorage';
import { photoCanvases, type StudioPhoto } from '../studio/images';
import type { StudioProject } from '../studio/project';
import { LAYOUTS, layoutForCount } from '../studio/layouts';
import { socialShareUrl, deleteCloudShare, type CreatedShare } from '../lib/api';
import '../studio/additions.css';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import {
  createCloudShare,
  generateRetroCaption,
  type CaptionMood,
  type ShareTtlHours,
} from '../lib/api';
import qrcode from 'qrcode-generator';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import {
  LayoutDef,
  CARD_THEMES,
  CardTheme,
  VISUAL_FILTERS,
  FilterType,
  renderStrip as baseRenderStrip,
  LensEffectType
} from '../lib/renderUtils';
import { createGifExporter } from '../lib/exportUtils';
import { playTick, playShutter, playDing } from '../lib/audioUtils';
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
  const completePreloader=useCallback(()=>setShowPreloader(false),[]);

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

  // Ref-isolated Custom Cursor tracking (eliminates full-tree React re-renders on mousemove, FE-01)
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const isHoveringClickableRef = useRef<boolean>(false);
  const [isHoveringClickable, setIsHoveringClickable] = useState<boolean>(false);
  const [isFlashing, setIsFlashing] = useState<boolean>(false);

  const handleGlobalMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isFinePointer) return;
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      }

      const target = e.target as HTMLElement | null;
      const isClickable =
        target?.closest('button, a, [role="button"], input, select, textarea') !== null;
      if (isHoveringClickableRef.current !== isClickable) {
        isHoveringClickableRef.current = isClickable;
        setIsHoveringClickable(isClickable);
      }
    },
    [isFinePointer]
  );

  const isLocked = (_layoutId: string) => {
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

  // Camera & Capture Session State
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [captureState, setCaptureState] = useState<CapturingState>('idle');
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [flash, setFlash] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<HTMLCanvasElement[][]>([]);
  const [previewCanvasDataUrl, setPreviewCanvasDataUrl] = useState<string | null>(null);
  const [animatedFrameUrls, setAnimatedFrameUrls] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(2);
  const [slotFrameIndices, setSlotFrameIndices] = useState<number[]>([2, 2, 2, 2]);
  const [activeSlotPickerIdx, setActiveSlotPickerIdx] = useState<'all' | number>('all');
  const [retakeTargetSlot, setRetakeTargetSlot] = useState<number | null>(null);
  const [customCaption, setCustomCaption] = useState<string>('');
  const [isGeneratingCaption, setIsGeneratingCaption] = useState<boolean>(false);
  const [shareTtlHours, setShareTtlHours] = useState<ShareTtlHours>(24);
  const sessionAbortRef = useRef<AbortController | null>(null);

  const [crops,setCrops] = useState<PhotoCrop[]>([]), [decorations,setDecorations] = useState<Decoration[]>([]);
  const [customTemplate,setCustomTemplate] = useState<StudioTemplate|null>(null), [overlay,setOverlay] = useState<HTMLImageElement>();
  const [drawing,setDrawing] = useState(false), [ink,setInk] = useState('#a92b35');
  const [featureError,setFeatureError] = useState(''), [featureMessage,setFeatureMessage] = useState('');
  const [cloudShare,setCloudShare] = useState<CreatedShare|null>(null);
  const decorationCommit = useRef<(layers:Decoration[])=>void>(()=>{});
  const operation = useRef<{fingerprint:string;key:string}|null>(null);
  const activeCustom = customTemplate?.id === activeLayoutId ? customTemplate : null;
  const activeLayout = activeCustom ? templateLayout(activeCustom) : LAYOUTS[activeLayoutId] ?? LAYOUTS['1x4'];
  useEffect(()=>{const controller=new AbortController();setOverlay(undefined);if(activeCustom?.overlay)void validateOverlay(activeCustom.overlay,activeCustom,controller.signal).then(image=>{if(!controller.signal.aborted)setOverlay(image);}).catch(e=>{if(!controller.signal.aborted)setFeatureError(e.message);});return()=>controller.abort();},[activeCustom]);
  const renderStrip = useCallback((...args:Parameters<typeof baseRenderStrip>)=>{
    if(activeCustom?.overlay&&!overlay)throw new Error('Frame artwork is still preparing. Please retry.');
    args[9]={crops,decorations,overlay,customFrame:!!activeCustom};return baseRenderStrip(...args);
  },[crops,decorations,overlay,activeCustom]);
  const draftPhotos = useMemo(()=>capturedPhotos.map((frames,i)=>({id:`photo-${i}`,name:`Photo ${i+1}`,frames:frames.map(canvas=>canvas.toDataURL('image/jpeg',.88))})),[capturedPhotos]);
  const draftProject = useMemo<StudioProject>(()=>({photos:draftPhotos,layoutId:activeLayoutId,themeId:activeThemeId,filterId:activeFilterId,lens:lensEffect,grain:grainIntensity,showDate,caption:customCaption,frames:slotFrameIndices,crops,decorations,customTemplate}),[draftPhotos,activeLayoutId,activeThemeId,activeFilterId,lensEffect,grainIntensity,showDate,customCaption,slotFrameIndices,crops,decorations,customTemplate]);
  const restoreProject = useCallback((project:StudioProject)=>{
    void photoCanvases(project.photos).then(photos=>{sessionAbortRef.current?.abort();setCapturedPhotos(photos);setActiveLayoutId(project.layoutId);setActiveThemeId(project.themeId);setActiveFilterId(project.filterId);setLensEffect(project.lens);setGrainIntensity(project.grain);setShowDate(project.showDate);setCustomCaption(project.caption);setSlotFrameIndices(project.frames);setCrops(project.crops);setDecorations(project.decorations);setCustomTemplate(project.customTemplate);setScreen('review');setFeatureMessage('Local session restored.');}).catch(e=>setFeatureError(e.message));
  },[]);
  const draft = useDraft(draftProject,restoreProject);
  async function imported(photos:StudioPhoto[]){try{const canvases=await photoCanvases(photos);sessionAbortRef.current?.abort();setCapturedPhotos(canvases);setActiveLayoutId(customTemplate?.slots.length===photos.length?customTemplate.id:layoutForCount(photos.length).id);setSlotFrameIndices(photos.map(()=>0));setSelectedPhotoIndex(0);setCrops(photos.map(defaultCrop));setDecorations([]);setIsAnimatedPreview(false);setCaptureState('completed');setScreen('review');setFeatureError('');}catch(e){setFeatureError((e as Error).message);}}
  const applyTemplate=(template:StudioTemplate)=>{if(capturedPhotos.length&&capturedPhotos.length!==template.slots.length)throw new Error(`This frame needs ${template.slots.length} photos. Start a new session or import that number first.`);setCustomTemplate(template);setActiveLayoutId(template.id);setFeatureMessage('Custom frame selected. Its artwork controls the footer and date area.');};
  const sessionTools=<div className="sol-additions"><DraftBar draft={draft}/><ImportPhotos onImported={photos=>void imported(photos)} onError={setFeatureError} disabled={!draft.ready||isExporting}/><TemplateEditor onApply={applyTemplate}/></div>;

  const activeTheme = CARD_THEMES[activeThemeId];
  const currentFilter = VISUAL_FILTERS[activeFilterId];

  // Preload lobby specimen preview graphics to prevent hover lag
  useEffect(() => {
    const preloadImages = [
      '/specimen1.jpg',
      '/specimen2.jpg',
      '/specimen3.jpg',
      '/specimen4.png',
      '/specimen5.jpg',
    ];
    preloadImages.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
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
            void videoElement.play().catch(()=>{if(active)setFeatureError('Camera playback failed. Retry or import photos.');});
            setIsCameraReady(true);
          };
        }
      } catch (err) {
        if(active)setFeatureError('Camera unavailable or permission denied. You can import photos instead.');
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
    canvas.width = 640;
    canvas.height = Math.round(640 * (video.videoHeight || 480) / (video.videoWidth || 640));
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror the horizontal view
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
    return canvas;
  }, [videoElement]);

  // Run full photo session loop or single-slot retake with AbortController cancellation support (FE-03, FEAT-04)
  const runSession = useCallback(async (singleSlotOverride?: number | null) => {
    sessionAbortRef.current?.abort();
    const abortController = new AbortController();
    sessionAbortRef.current = abortController;
    const { signal } = abortController;

    const sleepAbortable = (ms: number) =>
      new Promise<boolean>((resolve) => {
        if (signal.aborted) {
          resolve(false);
          return;
        }
        const timer = setTimeout(() => {
          signal.removeEventListener('abort', onAbort);
          resolve(true);
        }, ms);
        const onAbort = () => {
          clearTimeout(timer);
          resolve(false);
        };
        signal.addEventListener('abort', onAbort, { once: true });
      });

    const targetSlot =
      typeof singleSlotOverride === 'number' ? singleSlotOverride : retakeTargetSlot;

    if (targetSlot !== null && targetSlot >= 0 && capturedPhotos.length > 0) {
      setCaptureState('countdown');
      for (let i = photoDelay; i > 0; i--) {
        if (signal.aborted) return;
        setCountdownNum(i);
        playTick();
        const ok = await sleepAbortable(1000);
        if (!ok) return;
      }

      if (signal.aborted) return;
      setCaptureState('capturing');
      setFlash(true);
      spawnHearts();
      playShutter();
      setTimeout(() => setFlash(false), 80);

      const frames: HTMLCanvasElement[] = [];
      for (let f = 0; f < 5; f++) {
        if (signal.aborted) return;
        frames.push(captureFrame());
        const ok = await sleepAbortable(100);
        if (!ok) return;
      }

      if (signal.aborted) return;
      setCapturedPhotos((prev) => {
        const updated = [...prev];
        updated[targetSlot] = frames;
        return updated;
      });
      setCrops(previous=>Array.from({length:capturedPhotos.length},(_,i)=>i===targetSlot?defaultCrop():previous[i]??defaultCrop()));
      setRetakeTargetSlot(null);
      setCaptureState('completed');
      setScreen('review');
      return;
    }

    setCapturedPhotos([]);
    const totalShots = activeLayout.slots.length;
    const newPhotos: HTMLCanvasElement[][] = [];

    for (let shot = 0; shot < totalShots; shot++) {
      if (signal.aborted) return;
      // Countdown phase using selected photoDelay
      setCaptureState('countdown');
      for (let i = photoDelay; i > 0; i--) {
        if (signal.aborted) return;
        setCountdownNum(i);
        playTick();
        const ok = await sleepAbortable(1000);
        if (!ok) return;
      }

      if (signal.aborted) return;
      // Capture phase (burst of 5 quick frames for animating GIF layout)
      setCaptureState('capturing');
      setFlash(true);
      spawnHearts();
      playShutter();
      setTimeout(() => setFlash(false), 80);

      const frames: HTMLCanvasElement[] = [];
      for (let f = 0; f < 5; f++) {
        if (signal.aborted) return;
        frames.push(captureFrame());
        const ok = await sleepAbortable(100); // 100ms quick burst
        if (!ok) return;
      }
      newPhotos.push(frames);
      setCapturedPhotos([...newPhotos]); // Update active photo cache
    }

    if (signal.aborted) return;
    setCrops(Array.from({length:totalShots},defaultCrop));
    setSlotFrameIndices(Array.from({ length: totalShots }, () => 2));
    setActiveSlotPickerIdx('all');
    setCaptureState('completed');
    setScreen('review');
  }, [activeLayout, photoDelay, spawnHearts, captureFrame, retakeTargetSlot, capturedPhotos.length]);

  const handleRetakeSingleSlot = useCallback((slotIndex: number) => {
    setRetakeTargetSlot(slotIndex);
    setCaptureState('idle');
    setScreen('active');
  }, []);

  const handleGenerateAiCaption = useCallback(
    async (mood: CaptionMood) => {
      playTick();
      setIsGeneratingCaption(true);
      try {
        const res = await generateRetroCaption(mood, activeLayoutId);
        setCustomCaption(res.caption);
      } catch (err) {
        console.error('Caption generation failed:', err);
      } finally {
        setIsGeneratingCaption(false);
      }
    },
    [activeLayoutId]
  );

  // Listen for Spacebar or Enter to start the photo session
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,textarea,select,button,a,[contenteditable=true]')) return;
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



  // Re-generate dynamic high-end preview strip on changes (pre-computing 5 burst frames when animated, FE-01, FEAT-01, FEAT-04)
  useEffect(() => {
    if (screen !== 'review' || capturedPhotos.length === 0 || activeCustom?.overlay && !overlay) return;

    if (isAnimatedPreview) {
      const urls = [0, 1, 2, 3, 4].map((idx) =>
        renderStrip(
          capturedPhotos,
          activeLayout,
          grainIntensity,
          showDate,
          idx,
          activeThemeId,
          activeFilterId,
          lensEffect,
          customCaption
        ).toDataURL('image/jpeg', 0.92)
      );
      setAnimatedFrameUrls(urls);
      setPreviewCanvasDataUrl(urls[selectedPhotoIndex] ?? urls[0] ?? null);
    } else {
      const cvs = renderStrip(
        capturedPhotos,
        activeLayout,
        grainIntensity,
        showDate,
        slotFrameIndices,
        activeThemeId,
        activeFilterId,
        lensEffect,
        customCaption
      );
      setPreviewCanvasDataUrl(cvs.toDataURL('image/jpeg', 0.95));
    }
  }, [
    screen,
    capturedPhotos,
    activeLayout,
    grainIntensity,
    showDate,
    selectedPhotoIndex,
    slotFrameIndices,
    activeThemeId,
    activeFilterId,
    lensEffect,
    isAnimatedPreview,
    customCaption, renderStrip, activeCustom, overlay,
  ]);

  // Animated "Live" Preview cycling effect over pre-computed DataURLs (zero canvas re-renders in interval, FE-01)
  useEffect(() => {
    if (screen !== 'review' || !isAnimatedPreview || animatedFrameUrls.length === 0) {
      return;
    }
    let frameCursor = 0;
    const interval = setInterval(() => {
      frameCursor = (frameCursor + 1) % animatedFrameUrls.length;
      setPreviewCanvasDataUrl(animatedFrameUrls[frameCursor] ?? null);
    }, 130);
    return () => clearInterval(interval);
  }, [screen, isAnimatedPreview, animatedFrameUrls]);

  // High quality exporters
  const handleExport = async (format: 'jpg' | 'png' | 'gif') => {
    if (!capturedPhotos.length) return;
    setIsExporting(true);
    setIsUploadingCloud(false);
    setCopied(false);
    setFeatureError('');

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
          slotFrameIndices,
          activeThemeId,
          activeFilterId,
          lensEffect,
          customCaption
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
              lensEffect,
              customCaption
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

      setFeatureMessage('Download prepared. Nothing was uploaded.');
      setTimeout(()=>URL.revokeObjectURL(url),30000);

    } catch (e) {
      setFeatureError(e instanceof Error ? e.message : 'Unable to export. Please retry.');
      setIsUploadingCloud(false);
    } finally {
      setIsExporting(false);
    }
  };

  const triggerExport = (format:'jpg'|'png'|'gif') => { void handleExport(format); };
  async function shareCurrent(){
    if(isUploadingCloud||!capturedPhotos.length)return;setIsUploadingCloud(true);setFeatureError('');setShowThankYouPopup(true);
    try{const full=renderStrip(capturedPhotos,activeLayout,grainIntensity,showDate,slotFrameIndices,activeThemeId,activeFilterId,lensEffect,customCaption),small=document.createElement('canvas'),scale=Math.min(1,1200/Math.max(full.width,full.height));small.width=Math.round(full.width*scale);small.height=Math.round(full.height*scale);small.getContext('2d')?.drawImage(full,0,0,small.width,small.height);let imageUrl='';for(const quality of [.88,.72,.55]){imageUrl=small.toDataURL('image/jpeg',quality);if(imageUrl.length<=800000)break;}if(imageUrl.length>800000)throw new Error('Cloud copy is too large. Download locally or use smaller photos.');const payload={imageUrl,layout:activeLayoutId,format:'jpg' as const,caption:customCaption,ttlHours:shareTtlHours},fingerprint=JSON.stringify(payload);if(operation.current?.fingerprint!==fingerprint)operation.current={fingerprint,key:crypto.randomUUID()};const share=await createCloudShare(payload,operation.current.key);setCloudShare(share);setShareUrl(socialShareUrl(share.id));setFeatureMessage('Cloud link created. Anyone with the link can view this snapshot.');}catch(e){setFeatureError(e instanceof Error?e.message:'Cloud sharing failed. Your local photos are safe.');}finally{setIsUploadingCloud(false);}
  }

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
    if(!draft.ready)return;
    sessionAbortRef.current?.abort();
    setCrops([]);setDecorations([]);setFeatureError('');
    setIsFlashing(true);
    setTimeout(() => {
      void draft.discard(false);
      setCapturedPhotos([]);
      setCaptureState('idle');
      setPreviewCanvasDataUrl(null);
      setAnimatedFrameUrls([]);
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
    sessionAbortRef.current?.abort();
    setIsFlashing(true);
    setTimeout(() => {
      setCapturedPhotos([]);
      setCaptureState('idle');
      setPreviewCanvasDataUrl(null);
      setAnimatedFrameUrls([]);
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
        <Preloader onComplete={completePreloader} />
      )}

      {(featureError||featureMessage)&&<div className="sol-feature-status" role={featureError?'alert':'status'}>{featureError||featureMessage}<button type="button" aria-label="Dismiss message" onClick={()=>{setFeatureError('');setFeatureMessage('');}}>×</button></div>}
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
              featureTools={sessionTools}
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

              {sessionTools}
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
                    {[...Object.values(LAYOUTS),...(customTemplate?[templateLayout(customTemplate)]:[])].map((layout) => {
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
                  onClick={() => void runSession()}
                  disabled={!isCameraReady || captureState === 'countdown' || captureState === 'capturing'}
                  className="w-full py-4.5 bg-white text-black hover:bg-stone-100 text-xs font-bold uppercase tracking-[0.25em] flex items-center justify-center gap-3 transition-colors disabled:opacity-40 select-none cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  {captureState === 'idle'
                    ? retakeTargetSlot !== null
                      ? `Retake Slot #${retakeTargetSlot + 1}`
                      : 'Start Session'
                    : 'Capturing...'}
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

                <details className="sol-additions"><summary>Import & session recovery</summary><DraftBar draft={draft}/><ImportPhotos onImported={photos=>void imported(photos)} onError={setFeatureError}/></details>
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

                {/* 2. Per-Slot Burst Frame Picker & Single-Slot Retake (FEAT-04) */}
                <section className="pt-4 border-t border-[#222]">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[11px] uppercase tracking-widest text-[#888] font-semibold block">
                      Burst Frame & Slot Editor
                    </label>
                    <span className="text-[10px] font-mono text-stone-500">
                      {isAnimatedPreview
                        ? 'Auto-cycling'
                        : activeSlotPickerIdx === 'all'
                          ? `All Slots: F${selectedPhotoIndex + 1}`
                          : `Slot #${activeSlotPickerIdx + 1}: F${(slotFrameIndices[activeSlotPickerIdx] ?? 2) + 1}`}
                    </span>
                  </div>

                  {/* Slot selector tabs (All vs Slot 1..N) */}
                  <div
                    className={cn(
                      'flex flex-wrap gap-1 mb-2 transition-opacity duration-200',
                      isAnimatedPreview && 'opacity-40 pointer-events-none'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveSlotPickerIdx('all')}
                      className={cn(
                        'px-2 py-1 text-[9px] font-mono uppercase border rounded-xs cursor-pointer transition-colors',
                        activeSlotPickerIdx === 'all'
                          ? 'border-white bg-white text-black font-bold'
                          : 'border-[#222] text-stone-400 hover:text-white'
                      )}
                    >
                      All Slots
                    </button>
                    {activeLayout.slots.map((_, sIdx) => (
                      <button
                        key={sIdx}
                        type="button"
                        onClick={() => setActiveSlotPickerIdx(sIdx)}
                        className={cn(
                          'px-2 py-1 text-[9px] font-mono uppercase border rounded-xs cursor-pointer transition-colors',
                          activeSlotPickerIdx === sIdx
                            ? 'border-white bg-white text-black font-bold'
                            : 'border-[#222] text-stone-400 hover:text-white'
                        )}
                      >
                        Slot {sIdx + 1}
                      </button>
                    ))}
                  </div>

                  <div
                    className={cn(
                      'grid grid-cols-5 gap-1.5 transition-opacity duration-200',
                      isAnimatedPreview && 'opacity-40 pointer-events-none'
                    )}
                  >
                    {[0, 1, 2, 3, 4].map((idx) => {
                      const isSelected =
                        activeSlotPickerIdx === 'all'
                          ? selectedPhotoIndex === idx
                          : (slotFrameIndices[activeSlotPickerIdx] ?? 2) === idx;
                      return (
                        <button
                          key={idx}
                          disabled={isAnimatedPreview}
                          onClick={() => {
                            if (activeSlotPickerIdx === 'all') {
                              setSelectedPhotoIndex(idx);
                              setSlotFrameIndices(
                                activeLayout.slots.map(() => idx)
                              );
                            } else {
                              setSlotFrameIndices((prev) => {
                                const next = [...prev];
                                next[activeSlotPickerIdx] = idx;
                                return next;
                              });
                            }
                          }}
                          className={cn(
                            'py-2 text-[10px] font-mono border transition-all cursor-pointer rounded-xs',
                            isSelected
                              ? 'border-white bg-white text-black'
                              : 'border-[#222] text-stone-400 hover:text-white hover:border-[#333]'
                          )}
                        >
                          F{idx + 1}
                        </button>
                      );
                    })}
                  </div>

                  {typeof activeSlotPickerIdx === 'number' && (
                    <button
                      type="button"
                      onClick={() => handleRetakeSingleSlot(activeSlotPickerIdx)}
                      className="w-full mt-2 py-1.5 border border-rose-500/40 hover:border-rose-500 text-rose-400 hover:text-rose-300 text-[9px] font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer rounded-xs"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Retake Only Slot #{activeSlotPickerIdx + 1}
                    </button>
                  )}

                  <p className="text-[9px] text-[#555] mt-2 font-serif italic">
                    Pick the best burst frame for all slots or fine-tune each individual slot.
                  </p>
                </section>

                <div className="sol-additions"><details><summary>Crop & align photo {typeof activeSlotPickerIdx==='number'?activeSlotPickerIdx+1:1}</summary><p>Select a slot above to edit another photo.</p><CropControls value={crops[typeof activeSlotPickerIdx==='number'?activeSlotPickerIdx:0]??defaultCrop()} onChange={crop=>{const index=typeof activeSlotPickerIdx==='number'?activeSlotPickerIdx:0;setCrops(previous=>Array.from({length:capturedPhotos.length},(_,i)=>i===index?crop:previous[i]??defaultCrop()));}}/></details><details><summary>Stickers & drawings</summary><DecorationControls value={decorations} onChange={setDecorations} drawing={drawing} onDrawing={setDrawing} color={ink} onColor={setInk} onHistory={commit=>{decorationCommit.current=commit;}}/></details><TemplateEditor onApply={applyTemplate}/></div>
                {/* 2b. AI Retro Caption & Cloud Link TTL (FEAT-01, FEAT-05) */}
                <section className="pt-4 border-t border-[#222] space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] uppercase tracking-widest text-[#888] font-semibold block">
                      Retro Strip Caption
                    </label>
                    <span className="text-[9px] font-mono text-stone-500">
                      {isGeneratingCaption ? 'Writing...' : 'AI / Custom'}
                    </span>
                  </div>
                  <input
                    type="text"
                    maxLength={80}
                    value={customCaption}
                    onChange={(e) => setCustomCaption(e.target.value)}
                    placeholder="Type a memory or tap AI mood below..."
                    className="w-full bg-[#171717] border border-[#222] text-[11px] font-mono py-2 px-2.5 text-white placeholder:text-stone-600 focus:outline-none focus:border-stone-500 rounded-xs"
                  />
                  <div className="grid grid-cols-4 gap-1">
                    {(['nostalgic', 'playful', 'romantic', 'minimal'] as const).map(
                      (mood) => (
                        <button
                          key={mood}
                          type="button"
                          disabled={isGeneratingCaption}
                          onClick={() => void handleGenerateAiCaption(mood)}
                          className="py-1.5 px-1 border border-[#222] hover:border-stone-500 bg-[#141414] text-[9px] font-mono uppercase text-stone-300 hover:text-white transition-colors rounded-xs cursor-pointer truncate"
                        >
                          {mood}
                        </button>
                      )
                    )}
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] text-stone-400">Cloud Share Expiry</span>
                      <span className="text-[9px] font-mono text-stone-500">
                        {shareTtlHours === null ? 'Permanent' : `${shareTtlHours}h TTL`}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {(
                        [
                          { label: 'Forever', val: null },
                          { label: '1h', val: 1 },
                          { label: '24h', val: 24 },
                          { label: '7d', val: 168 },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => setShareTtlHours(opt.val)}
                          className={cn(
                            'py-1 text-[9px] font-mono uppercase border rounded-xs cursor-pointer transition-colors',
                            shareTtlHours === opt.val
                              ? 'border-white bg-white text-black font-bold'
                              : 'border-[#222] text-stone-400 hover:text-white'
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
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

                <div className="sol-additions"><p>Cloud sharing uploads a JPEG snapshot. Anyone with its link can view it. Local exports stay on your device.</p><button type="button" className="button" disabled={isUploadingCloud||isExporting} onClick={()=>void shareCurrent()}>Create cloud link / QR</button></div>
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
                  <div className="sol-additions sol-print"><DrawingPreview url={previewCanvasDataUrl} width={activeLayout.width} height={activeLayout.height} drawing={drawing&&decorations.length<40} color={ink} onStroke={layer=>decorationCommit.current([...decorations,layer])}/></div>
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
        )}
      </AnimatePresence>
      {/* Premium Checkout Modal */}
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
                    {isUploadingCloud ? 'Syncing to Cloud Tape...' : shareUrl ? 'Memory Composited & Linked' : 'Memory Saved to Your Device'}
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
                      Local export is ready. Create a cloud link only if you want to upload and share it.
                    </div>
                  )}
                </div>

                {cloudShare&&<div className="sol-additions"><button type="button" className="button" onClick={()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,id:cloudShare.id,ownerToken:cloudShare.ownerToken})],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`SOL-manage-${cloudShare.id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}}>Save private management key</button><button type="button" className="button" onClick={async()=>{try{await deleteCloudShare(cloudShare.id,cloudShare.ownerToken);setShareUrl(null);setCloudShare(null);setFeatureMessage('Cloud link revoked.');}catch(e){setFeatureError((e as Error).message);}}}>Revoke cloud link</button></div>}
                <div className="space-y-3">
                  <p className="text-xs text-stone-400 leading-relaxed font-serif italic max-w-sm mx-auto">
                    Your local download is ready. A cloud link, when created, can be scanned or shared separately.
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

      {/* Camera Viewfinder Autofocus Cursor (DOM ref-driven, zero React re-renders on mousemove) */}
      {isFinePointer && (
        <div
          ref={cursorRef}
          style={{
            position: 'fixed',
            left: 0,
            top: 0,
            transform: 'translate3d(-100px, -100px, 0) translate(-50%, -50%)',
            pointerEvents: 'none',
            zIndex: 99999,
            willChange: 'transform',
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
        </div>
      )}

    </div>
  );
}
