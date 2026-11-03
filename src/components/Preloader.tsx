import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Heart } from 'lucide-react';
import { playBootSound } from '../lib/audioUtils';

interface PreloaderProps {
  onComplete: () => void;
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const [hasInteracted, setHasInteracted] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const stampLabelRef = useRef<HTMLSpanElement>(null);

  // Trigger animation timeline ONLY after user gesture unlocks AudioContext
  useEffect(() => {
    if (!hasInteracted) return;
    if (!overlayRef.current || !cardRef.current || !photoRef.current || !glowRef.current) return;

    // Set initial values
    gsap.set(cardRef.current, {
      y: 50,
      scale: 0.92,
      rotate: -3,
      opacity: 0,
    });
    gsap.set(photoRef.current, {
      opacity: 0,
      filter: 'blur(20px) contrast(3.5) brightness(0.6)',
      scale: 0.85,
    });
    gsap.set(glowRef.current, {
      opacity: 0.35,
      scale: 1.15,
    });

    const tl = gsap.timeline({
      onComplete: () => {
        onComplete();
      }
    });

    // 1. Fade-in of ambient red light glow and Polaroid card frame
    tl.to(glowRef.current, {
      opacity: 0.45,
      scale: 1.25,
      duration: 1.6,
      ease: 'sine.inOut',
    });

    tl.to(cardRef.current, {
      opacity: 1,
      y: 0,
      scale: 1,
      rotate: 1.5,
      duration: 1.2,
      ease: 'power2.out',
    }, 0.3);

    // 2. Slow photo development stage (Blur dissolves, contrast balances, elements sharpen)
    tl.to(photoRef.current, {
      opacity: 0.9,
      filter: 'blur(0px) contrast(1) brightness(1)',
      scale: 1,
      duration: 2.2,
      ease: 'power1.in',
    }, 1.0);

    // 3. Text label toggle when fully developed
    tl.to(stampLabelRef.current, {
      opacity: 0,
      duration: 0.25,
      onComplete: () => {
        if (stampLabelRef.current) {
          stampLabelRef.current.innerText = 'BOOTED';
          gsap.to(stampLabelRef.current, { opacity: 1, duration: 0.25 });
        }
      }
    }, 3.6);

    // 4. Slide up screen transition
    tl.to(overlayRef.current, {
      yPercent: -100,
      duration: 1.20,
      ease: 'power2.inOut',
    }, 4.8);

  }, [hasInteracted, onComplete]);

  const handleStart = () => {
    // Play boot sound (capacitor charge + warm hum) - works instantly inside click gesture
    playBootSound();
    setHasInteracted(true);
  };

  // Format current date in yy.MM.dd style
  const getFormattedDate = () => {
    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yy}.${mm}.${dd}`;
  };

  // 1. Initial Interactive Entrance screen to unlock Web Audio API Context
  if (!hasInteracted) {
    return (
      <div
        onClick={handleStart}
        className="fixed inset-0 bg-[#080808] z-[99999] flex flex-col items-center justify-center overflow-hidden select-none pointer-events-auto cursor-pointer"
      >
        {/* Dim red light glow (breathing ambient background bulb - Cross-browser identical) */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: 'radial-gradient(circle at center, rgba(153, 27, 27, 0.28) 0%, rgba(90, 12, 12, 0.12) 30%, rgba(40, 6, 6, 0.03) 60%, transparent 80%)'
          }}
        />

        <div className="z-10 flex flex-col items-center gap-4 text-center max-w-sm px-6">
          <Heart className="w-10 h-10 text-[#8e1616] fill-current animate-pulse" />
          <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-stone-400 font-bold leading-relaxed whitespace-nowrap">
            [ Click / Tap to launch S.O.L ]
          </p>
          <span className="text-[7px] font-mono text-stone-600 tracking-[0.2em] mt-10 whitespace-nowrap">
            S.O.L © 2026 // ANDI ABI
          </span>
        </div>
      </div>
    );
  }

  // 2. Developed Polaroid Chemical Preloader
  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-[#080808] z-[99999] flex flex-col items-center justify-center overflow-hidden select-none pointer-events-auto"
    >
      {/* Dim red light glow (breathing ambient background bulb - Cross-browser identical) */}
      <div
        ref={glowRef}
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle at center, rgba(153, 27, 27, 0.32) 0%, rgba(90, 12, 12, 0.15) 30%, rgba(40, 6, 6, 0.04) 60%, transparent 80%)'
        }}
      />

      {/* Polaroid card container */}
      <div
        ref={cardRef}
        className="relative z-10 w-56 h-72 bg-[#faf9f6] p-4 flex flex-col justify-between shadow-[0_30px_70px_rgba(0,0,0,0.9)] border border-stone-200/50 rounded-sm"
      >
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-red-600/30 to-stone-500/10" />

        {/* Chemical Photo Tank area */}
        <div className="w-full aspect-square bg-[#0c0c0c] border border-stone-200/10 flex items-center justify-center relative overflow-hidden rounded-xs">
          <div
            ref={photoRef}
            className="flex flex-col items-center justify-center text-[#8e1616] p-2"
          >
            <Heart className="w-16 h-16 fill-[#8e1616] drop-shadow-[0_4px_12px_rgba(142,22,22,0.4)]" />
          </div>
        </div>

        {/* Polaroid caption signature stamp */}
        <div className="flex justify-between items-center mt-3 font-mono text-[9px] text-[#8e1616] font-bold">
          <span>{getFormattedDate()}</span>
          <span ref={stampLabelRef} className="tracking-widest">BOOTING</span>
        </div>
      </div>

      {/* Floating chemical code log */}
      <div className="absolute bottom-6 text-[8px] font-mono text-red-900/40 tracking-[0.3em] font-bold z-10 whitespace-nowrap">
        [ LOGIN_PROCESS: TANK_01 // ENTERING LOBBY ]
      </div>
    </div>
  );
}
