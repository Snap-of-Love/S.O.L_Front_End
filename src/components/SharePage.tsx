import { useEffect, useState } from 'react';
import { fetchCloudShare, type ShareData } from '../lib/api';
import { playTick } from '../lib/audioUtils';
import { Download, Camera, AlertTriangle, Disc, Share2, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

interface SharePageProps {
  id: string | null;
}

/**
 * Renders the public cloud memory viewer (`/?share=<id>`).
 * Supports one-tap native mobile sharing (`navigator.share` with File attachment, `FEAT-06`),
 * custom/AI caption display (`FEAT-01`), and TTL expiration handling (`410 Gone`, `FEAT-05`).
 */
export default function SharePage({ id }: SharePageProps) {
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [isSharingNative, setIsSharingNative] = useState<boolean>(false);

  const supportsWebShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    const controller = new AbortController();
    setShareData(null); setError(null); setLoading(true);
    const fetchShareData = async () => {
      if (!id) {
        setError('No memory reference specified.');
        setLoading(false);
        return;
      }

      try {
        const data = await fetchCloudShare(id, controller.signal);
        if (controller.signal.aborted) return;

        if (!data) {
          setError('This retro memory does not exist.');
        } else if (data.isExpired) {
          setError('This cloud memory link has expired past its configured lifetime (410 Gone).');
        } else {
          setShareData(data);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setError('Unable to load memory from the cloud.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void fetchShareData();
    return () => controller.abort();
  }, [id]);

  const handleDownload = async () => {
    if (!shareData) return;
    playTick();
    setIsDownloading(true);
    try {
      const res = await fetch(shareData.imageUrl);
      const blob = await res.blob();
      const localUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = localUrl;
      const isGif =
        shareData.imageUrl.toLowerCase().includes('image/gif') ||
        shareData.imageUrl.toLowerCase().includes('.gif') ||
        shareData.layout === 'animated';
      a.download = `sol-memory-${id}.${isGif ? 'gif' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(localUrl);
    } catch (err) {
      console.error('Fetch download failed, opening in new tab', err);
      setError('Unable to download this memory. Please reload and try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleNativeShare = async () => {
    if (!shareData || !supportsWebShare) return;
    playTick();
    setIsSharingNative(true);
    try {
      const res = await fetch(shareData.imageUrl);
      const blob = await res.blob();
      const isGif =
        shareData.imageUrl.toLowerCase().includes('image/gif') ||
        shareData.layout === 'animated';
      const ext = isGif ? 'gif' : 'jpg';
      const mime = isGif ? 'image/gif' : 'image/jpeg';
      const file = new File([blob], `sol-memory-${id ?? 'strip'}.${ext}`, {
        type: mime,
      });

      const shareTitle = shareData.caption
        ? `S.O.L — "${shareData.caption}"`
        : 'Snap of Love Photobooth Memory';

      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: shareTitle,
          text: shareData.caption ?? 'Captured on Snap of Love (S.O.L)',
          files: [file],
        });
      } else {
        await navigator.share({
          title: shareTitle,
          text: shareData.caption ?? 'Captured on Snap of Love (S.O.L)',
          url: window.location.href,
        });
      }
    } catch (err) {
      if ((err as { name?: string })?.name !== 'AbortError') {
        console.error('Native share failed:', err);
      }
    } finally {
      setIsSharingNative(false);
    }
  };

  const navigateHome = () => {
    playTick();
    window.location.href = '/';
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="h-[100dvh] w-screen overflow-y-auto flex flex-col items-center justify-center bg-[#0c0c0c] text-white p-6 font-mono selection:bg-amber-500 selection:text-black">
        <div className="flex flex-col items-center gap-4 max-w-sm text-center">
          <Disc className="w-10 h-10 animate-spin text-amber-500" />
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
            [ Loading memory from cloud tape... ]
          </p>
        </div>
      </div>
    );
  }

  // 2. Error or Expired State (404 / 410 Gone)
  if (error || !shareData) {
    return (
      <div className="h-[100dvh] w-screen overflow-y-auto flex flex-col items-center justify-center bg-[#0c0c0c] text-white p-6 font-mono">
        <div className="max-w-md bg-[#111] border border-red-950/50 rounded-lg p-8 shadow-2xl flex flex-col items-center text-center gap-5 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-red-500 opacity-20" />
          <AlertTriangle className="w-12 h-12 text-red-500 animate-pulse" />

          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest text-[#eaeaea] mb-2">
              Memory Expired or Not Found
            </h1>
            <p className="text-xs text-stone-500 leading-relaxed">
              {error || 'The requested photo strip or GIF could not be located in the cloud repository.'}
            </p>
          </div>

          <button
            onClick={navigateHome}
            className="mt-2 px-6 py-3 bg-white text-black text-xs font-bold uppercase tracking-widest rounded-none hover:bg-stone-200 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            Snap Your Own
          </button>
        </div>
      </div>
    );
  }

  // 3. Success State
  return (
    <div className="h-[100dvh] w-screen overflow-y-auto flex flex-col bg-[#0c0c0c] text-white select-none relative pb-12 selection:bg-amber-500 selection:text-black">
      {/* Background retro grain texture overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#111_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />

      {/* Main Grid Wrapper */}
      <div className="relative z-10 max-w-4xl mx-auto w-full px-4 pt-8 md:pt-16 flex flex-col md:flex-row items-center md:items-start justify-center gap-8 md:gap-12">
        {/* Photo Container Column */}
        <div className="flex flex-col items-center justify-center bg-[#151515] border border-stone-800 p-4 md:p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] max-w-md w-full relative">
          {/* Polaroid paper margin layout style */}
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-amber-500 via-red-500 to-indigo-500 opacity-30" />

          <div className="bg-[#0e0e0e] border border-stone-900 overflow-hidden relative group max-h-[70vh] flex items-center justify-center">
            <img
              src={shareData.imageUrl}
              alt="Retro SOL memory"
              className="object-contain max-h-[60vh] max-w-full"
            />
          </div>

          <div className="mt-4 text-center space-y-1">
            {shareData.caption && (
              <p className="text-xs font-serif italic text-stone-300">
                "{shareData.caption}"
              </p>
            )}
            <span className="text-[10px] uppercase font-mono tracking-widest text-stone-500 block">
              Captured on Snap of Love
            </span>
          </div>
        </div>

        {/* Action Panel Column */}
        <div className="flex flex-col gap-6 max-w-xs w-full text-center md:text-left md:pt-4">
          <div className="flex flex-col gap-1.5">
            <div className="inline-flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] uppercase font-mono tracking-widest font-bold">
                Cloud Linked
              </span>
              {shareData.layout === 'animated' && (
                <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[9px] uppercase font-mono tracking-widest font-bold animate-pulse">
                  Live GIF
                </span>
              )}
              {shareData.expiresAt && (
                <span className="px-2 py-0.5 bg-stone-800 border border-stone-700 text-stone-300 text-[9px] uppercase font-mono tracking-wider inline-flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  Expires {new Date(shareData.expiresAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-bold uppercase tracking-widest text-[#eaeaea] font-mono">
              A Nostalgic Memory
            </h1>
            <p className="text-xs text-stone-500 leading-relaxed font-mono">
              Someone shared a custom S.O.L photobooth capture with you. Save it to your camera roll or open the booth to snap your own!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => void handleDownload()}
              disabled={isDownloading}
              className={cn(
                'w-full py-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all rounded-none cursor-pointer',
                isDownloading
                  ? 'bg-stone-800 text-stone-500'
                  : 'bg-white text-black hover:bg-stone-100 shadow-xl active:scale-[0.98]'
              )}
            >
              <Download className={cn('w-4 h-4', isDownloading && 'animate-bounce')} />
              {isDownloading ? 'Saving Memory...' : 'Download File'}
            </button>

            {supportsWebShare && (
              <button
                onClick={() => void handleNativeShare()}
                disabled={isSharingNative}
                className="w-full py-3.5 bg-[#181818] hover:bg-[#222] text-white border border-stone-700 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all rounded-none cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                {isSharingNative ? 'Opening Share Sheet...' : 'Share to Stories / Apps'}
              </button>
            )}

            <button
              onClick={navigateHome}
              className="w-full py-4 bg-[#111] hover:bg-[#161616] text-white border border-[#222] hover:border-stone-700 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all rounded-none cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              Open Photobooth
            </button>
          </div>

          {/* Feedback/Survey Invitation banner */}
          <div className="border border-stone-900 bg-[#0c0c0f]/80 p-3.5 flex flex-col gap-2 text-left relative overflow-hidden select-none">
            <p className="text-[9px] uppercase font-mono tracking-widest text-[#8e1616] font-bold">
              [ Feedback ]
            </p>
            <p className="text-[10px] text-stone-400 font-mono leading-normal">
              How was your photobooth experience? Take 1 minute to fill out our satisfaction form.
            </p>
            <a
              href="https://forms.gle/yXm5QGAvoiDacTVK9"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] uppercase font-mono tracking-widest text-white hover:text-red-450 font-bold flex items-center gap-1 mt-1 cursor-pointer transition-colors"
            >
              <span>Fill Survey Form →</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
