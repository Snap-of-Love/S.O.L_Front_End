import { useEffect, useState } from 'react';
import { fetchCloudShare, type ShareData } from '../lib/api';
import { playTick } from '../lib/audioUtils';
import { Download, Camera, AlertTriangle, Disc } from 'lucide-react';
import { cn } from '../lib/utils';

interface SharePageProps {
  id: string | null;
}

export default function SharePage({ id }: SharePageProps) {
  const [shareData, setShareData] = useState<ShareData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  useEffect(() => {
    const fetchShareData = async () => {
      if (!id) {
        setError('No memory reference specified.');
        setLoading(false);
        return;
      }

      try {
        const data = await fetchCloudShare(id);

        if (data) {
          setShareData(data);
        } else {
          setError('This retro memory does not exist or has expired.');
        }
      } catch (err) {
        console.error('Error fetching share data:', err);
        setError('Unable to load memory from the cloud.');
      } finally {
        setLoading(false);
      }
    };

    fetchShareData();
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
      const isGif = shareData.imageUrl.toLowerCase().includes('.gif') || shareData.layout === 'animated';
      a.download = `sol-memory-${id}.${isGif ? 'gif' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(localUrl);
    } catch (err) {
      console.error('Fetch download failed, opening in new tab', err);
      window.open(shareData.imageUrl, '_blank');
    } finally {
      setIsDownloading(false);
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

  // 2. Error State
  if (error || !shareData) {
    return (
    <div className="h-[100dvh] w-screen overflow-y-auto flex flex-col items-center justify-center bg-[#0c0c0c] text-white p-6 font-mono">
        <div className="max-w-md bg-[#111] border border-red-950/50 rounded-lg p-8 shadow-2xl flex flex-col items-center text-center gap-5 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-red-500 opacity-20" />
          <AlertTriangle className="w-12 h-12 text-red-500 animate-pulse" />
          
          <div>
            <h1 className="text-sm font-bold uppercase tracking-widest text-[#eaeaea] mb-2">Memory Expired or Corrupted</h1>
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
            {/* The shared photo strip/GIF */}
            <img
              src={shareData.imageUrl}
              alt="Retro SOL memory"
              className="object-contain max-h-[60vh] max-w-full"
            />
          </div>
          
          <div className="mt-4 text-center">
            <span className="text-[10px] uppercase font-mono tracking-widest text-stone-500">
              Captured on Snap of Love
            </span>
          </div>
        </div>

        {/* Action Panel Column */}
        <div className="flex flex-col gap-6 max-w-xs w-full text-center md:text-left md:pt-4">
          <div className="flex flex-col gap-1.5">
            <div className="inline-flex items-center justify-center md:justify-start gap-2">
              <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[9px] uppercase font-mono tracking-widest font-bold">
                Cloud Linked
              </span>
              {shareData.layout === 'animated' && (
                <span className="px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[9px] uppercase font-mono tracking-widest font-bold animate-pulse">
                  Live GIF
                </span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-bold uppercase tracking-widest text-[#eaeaea] font-mono">
              A Nostalgic Memory
            </h1>
            <p className="text-xs text-stone-500 leading-relaxed font-mono">
              Someone shared a custom S.O.L photobooth capture with you. Download it to save it forever, or open the booth to snap your own!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className={cn(
                "w-full py-4 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all rounded-none cursor-pointer",
                isDownloading 
                  ? "bg-stone-800 text-stone-500" 
                  : "bg-white text-black hover:bg-stone-100 shadow-xl active:scale-[0.98]"
              )}
            >
              <Download className={cn("w-4 h-4", isDownloading && "animate-bounce")} />
              {isDownloading ? 'Saving Memory...' : 'Download File'}
            </button>

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
            <p className="text-[9px] uppercase font-mono tracking-widest text-[#8e1616] font-bold">[ Feedback ]</p>
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
