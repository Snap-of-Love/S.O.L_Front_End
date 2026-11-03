import React, { useState, useRef, useEffect } from 'react';
import { Camera, Instagram, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import gsap from 'gsap';
import { playTick } from '../lib/audioUtils';
import { useMagnetic } from '../hooks/useMagnetic';
import { cn } from '../lib/utils';

interface LobbyProps {
  startNewSession: () => void;
  scrollToTop: () => void;
  scrollToSection: (id: string) => void;
  isScrolled: boolean;
}

export default function Lobby({
  startNewSession,
  scrollToTop,
  scrollToSection,
  isScrolled,
}: LobbyProps) {
  // Localized states only used during Lobby view
  const [hoveredSpecimenIndex, setHoveredSpecimenIndex] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Localized GSAP magnetic refs
  const homeBtnRef = useMagnetic(0.28);
  const specimensBtnRef = useMagnetic(0.28);
  const capabilitiesBtnRef = useMagnetic(0.28);
  const aboutBtnRef = useMagnetic(0.28);
  const enterStudioBtnRef = useMagnetic(0.38);
  const instagramBtnRef = useMagnetic(0.32);
  const enterPhotostudioBottomBtnRef = useMagnetic(0.38);

  const heroLogoGroupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (heroLogoGroupRef.current) {
      gsap.set(heroLogoGroupRef.current, {
        filter: 'blur(20px)',
        opacity: 0,
        scale: 1.04
      });

      gsap.to(heroLogoGroupRef.current, {
        filter: 'blur(0px)',
        opacity: 1,
        scale: 1,
        duration: 1.8,
        ease: 'power2.out',
        delay: 0.15
      });
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  const handleCharHover = (e: React.MouseEvent<HTMLSpanElement>) => {
    const target = e.currentTarget;
    gsap.killTweensOf(target);

    gsap.to(target, {
      y: -20,
      scale: 1.08,
      rotate: -5,
      duration: 0.15,
      ease: 'power1.out',
      onComplete: () => {
        gsap.to(target, {
          y: 0,
          scale: 1,
          rotate: 0,
          duration: 1.0,
          ease: 'elastic.out(1.15, 0.4)',
        });
      }
    });
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      className="w-full flex flex-col"
    >
      {/* Top Grid Menu Bar */}
      <div className={cn(
        "w-full grid grid-cols-2 md:grid-cols-5 border bg-[#09090b]/80 backdrop-blur-md md:sticky md:top-0 z-40 transition-all duration-300",
        isScrolled
          ? "border-[#8e1616]/30 bg-[#09090b]/95 shadow-[0_10px_30px_rgba(0,0,0,0.85)]"
          : "border-stone-900 bg-[#09090b]/20"
      )}>
        {/* Interactive Logo Home Column */}
        <button
          ref={homeBtnRef}
          onClick={() => {
            playTick();
            scrollToTop();
          }}
          className="px-6 py-3.5 border-r border-stone-900 flex items-center justify-center bg-transparent border-y-0 border-l-0 cursor-pointer hover:bg-white/5 transition-colors"
        >
          <div className="magnetic-inner flex items-center justify-center">
            <img src="/logo.png" alt="S.O.L Logo" className="h-7 w-auto object-contain" />
          </div>
        </button>
        <button
          ref={specimensBtnRef}
          onClick={() => {
            playTick();
            scrollToSection('specimens');
          }}
          className="px-6 py-4 border-r border-stone-900 text-stone-400 hover:text-white transition-colors text-[10px] uppercase font-mono tracking-widest font-bold flex items-center bg-transparent border-0 cursor-pointer text-left"
        >
          <span className="magnetic-inner">Photostrips</span>
        </button>
        <button
          ref={capabilitiesBtnRef}
          onClick={() => {
            playTick();
            scrollToSection('capabilities');
          }}
          className="px-6 py-4 border-r border-stone-900 text-stone-400 hover:text-white transition-colors text-[10px] uppercase font-mono tracking-widest font-bold flex items-center bg-transparent border-0 cursor-pointer text-left"
        >
          <span className="magnetic-inner">Capabilities</span>
        </button>
        <button
          ref={aboutBtnRef}
          onClick={() => {
            playTick();
            scrollToSection('about');
          }}
          className="px-6 py-4 border-r border-stone-900 text-stone-400 hover:text-white transition-colors text-[10px] uppercase font-mono tracking-widest font-bold flex items-center bg-transparent border-0 cursor-pointer text-left"
        >
          <span className="magnetic-inner">About</span>
        </button>

        <button
          ref={enterStudioBtnRef}
          onClick={() => {
            playTick();
            startNewSession();
          }}
          className="px-6 py-4 bg-white text-black hover:bg-stone-150 transition-colors text-[10px] uppercase font-mono tracking-[0.25em] font-bold text-center flex items-center justify-center gap-2 cursor-pointer col-span-2 md:col-span-1"
        >
          <div className="magnetic-inner flex items-center justify-center gap-2">
            <Camera className="w-3.5 h-3.5" />
            Enter Studio
          </div>
        </button>
      </div>

      {/* CRT glitch LOGO Hero */}
      <div className="w-full flex flex-col items-center justify-center py-20 border-x border-b border-stone-900 bg-[#09090c]/40 relative min-h-[calc(100vh-140px)]">
        <div className="absolute top-4 left-6 text-[8px] font-mono text-stone-600 tracking-widest font-bold hidden md:block">
          [ ENGINE_CODE: SOL_V2 // WELCOME ]
        </div>
        <div className="absolute top-4 right-6 text-[8px] font-mono text-stone-600 tracking-widest font-bold hidden md:block">
          [ SCAN_HERO: PASS_OK ]
        </div>

        <div
          ref={heroLogoGroupRef}
          className="flex gap-2 my-4 select-none"
        >
          {["S", ".", "O", ".", "L"].map((char, index) => (
            <span
              key={index}
              onMouseEnter={handleCharHover}
              className="text-[12vw] md:text-[8rem] font-serif italic tracking-tighter text-white leading-none inline-block origin-bottom transition-colors duration-200 hover:text-[#8e1616]"
            >
              {char}
            </span>
          ))}
        </div>

        <p className="text-[10px] uppercase font-mono tracking-[0.3em] text-[#8e1616] mt-4 font-bold flex items-center gap-2 select-none">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
          Snap of Love — Analog-Digital Studio
        </p>
      </div>

      {/* Large Statement Grid Block */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full py-20 md:py-28 border-x border-b border-stone-900 bg-[#08080a]/20 px-6 md:px-12 flex justify-center"
      >
        <h2 className="text-xl sm:text-3xl md:text-5xl font-serif text-stone-200 tracking-tight leading-relaxed max-w-5xl text-center font-normal px-4">
          S.O.L preserves the{" "}
          <span className="relative inline-block italic text-white pb-1.5 px-0.5 whitespace-nowrap block sm:inline-block">
            {"fading warmth of passing hours".split("").map((char, index) => (
              <motion.span
                key={index}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{
                  delay: 0.3 + index * 0.06,
                  duration: 0.01
                }}
              >
                {char}
              </motion.span>
            ))}
            {/* Imperfect Hand-drawn Marker Underline */}
            <svg
              className="absolute -bottom-1.5 left-0 w-full h-3 overflow-visible pointer-events-none"
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
            >
              <motion.path
                d="M 1,4 Q 25,1 50,6 T 99,3"
                fill="none"
                stroke="#8e1616"
                strokeWidth="2.5"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{
                  pathLength: {
                    delay: 2.15,
                    duration: 0.7,
                    ease: "easeInOut"
                  },
                  opacity: {
                    delay: 2.15,
                    duration: 0.05
                  }
                }}
              />
            </svg>
          </span>{" "}
          , translating quiet fragments of love, time, and presence into soft paper relics.
        </h2>
      </motion.div>

      {/* SPECIMENS: Case studies list with Mouse Reveal Previews */}
      <motion.section
        id="specimens"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full border-x border-stone-900 scroll-mt-20"
      >
        <div className="w-full grid grid-cols-2 md:grid-cols-4 border-b border-stone-900 bg-[#0c0c0e]/30 px-6 py-4">
          <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest font-bold">PHOTOSTRIPS PREVIEW</span>
          <span className="hidden md:inline text-[10px] font-mono text-stone-500 uppercase tracking-widest font-bold">FILE_ID</span>
          <span className="hidden md:inline text-[10px] font-mono text-stone-500 uppercase tracking-widest font-bold text-center">THEME_MATERIAL</span>
          <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest font-bold text-right">LAYOUT_RATIO</span>
        </div>

        {/* Showcase items */}
        {[
          { name: "Friends Gathering Studio", code: "A — 01", theme: "Warm Alabaster", ratio: "Classic 1x4 Strip" },
          { name: "Late Night Couple Archive", code: "A — 02", theme: "Ink Obsidian", ratio: "Cinematic Duo" },
          { name: "Friends Classic Quad", code: "A — 03", theme: "Cherry Blossom", ratio: "Quad Grid 2x2" },
          { name: "Group Filmstrip Composite", code: "A — 04", theme: "Cyber Silver", ratio: "Classic 1x4 Strip" },
          { name: "Vintage Polaroid Snapshot", code: "A — 05", theme: "Vintage Parchment", ratio: "Polaroid 1x1" },
        ].map((item, index) => (
          <div
            key={index}
            onMouseEnter={() => setHoveredSpecimenIndex(index)}
            onMouseLeave={() => setHoveredSpecimenIndex(null)}
            className="w-full grid grid-cols-2 md:grid-cols-4 border-b border-stone-900 px-6 py-8 hover:bg-stone-900/10 transition-colors duration-250 cursor-crosshair group"
          >
            <span className="text-stone-300 group-hover:text-white transition-colors text-sm font-serif font-medium italic">
              {item.name}
            </span>
            <span className="hidden md:inline text-[11px] font-mono text-stone-500 uppercase tracking-wider font-bold">
              {item.code}
            </span>
            <span className="hidden md:inline text-[11px] font-mono text-stone-400 uppercase tracking-wider font-bold text-center">
              {item.theme}
            </span>
            <span className="text-[11px] font-mono text-stone-500 uppercase tracking-wider font-bold text-right">
              {item.ratio}
            </span>
          </div>
        ))}
      </motion.section>

      {/* SPECIMENS HOVER FLOATING COMPONENT */}
      <AnimatePresence>
        {hoveredSpecimenIndex !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{
              opacity: 1,
              scale: 1,
              x: mousePosition.x + 28,
              y: mousePosition.y - 180,
            }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ type: 'spring', stiffness: 240, damping: 24 }}
            style={{
              position: 'fixed',
              left: 0,
              top: 0,
              pointerEvents: 'none',
              zIndex: 999,
            }}
            className="w-72 md:w-80 shadow-[0_30px_70px_rgba(0,0,0,0.95)] border border-stone-850 p-3 bg-[#0c0c0f] flex flex-col gap-2 rounded-none"
          >
            <img
              src={`/specimen${hoveredSpecimenIndex + 1}${hoveredSpecimenIndex === 3 ? '.png' : '.jpg'}`}
              alt="Specimen Preview"
              className="w-full h-auto object-contain border border-stone-900"
            />
            <div className="flex justify-between items-center text-[7px] font-mono text-stone-500 uppercase tracking-widest mt-0.5">
              <span>SPECIMEN_0{hoveredSpecimenIndex + 1}</span>
              <span className="text-[#8e1616] font-bold">ACTIVE VIEW</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CAPABILITIES: Accordions / Accolades Table Grid */}
      <motion.section
        id="capabilities"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full border-x border-stone-900 scroll-mt-20"
      >
        <div className="w-full border-b border-stone-900 bg-[#0c0c0e]/30 px-6 py-4">
          <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest font-bold">S.O.L STUDIO SPECIFICATION</span>
        </div>
        {[
          { label: "Various High-Fidelity Presets", spec: "6 Custom Photostrips theme (Cherry, sepia, obsidian, etc.)" },
          { label: "Burst GIF Animation", spec: "GIF burst motion engine at 8 FPS compile" },
          { label: "Cloud Save Synchronization", spec: "Share your pics after taking them by scanning the QR" },
          { label: "Local Lossless Encoding", spec: "True RGB downloads without watermarks" },
        ].map((cap, index) => (
          <div key={index} className="w-full flex justify-between items-center border-b border-stone-900 px-6 py-5">
            <span className="text-xs uppercase font-mono tracking-widest text-stone-400 font-bold">{cap.label}</span>
            <span className="text-xs font-sans text-stone-300 font-medium text-right">{cap.spec}</span>
          </div>
        ))}
      </motion.section>

      {/* ABOUT: Column split text */}
      <motion.section
        id="about"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full border-x border-b border-stone-900 py-16 md:py-24 px-6 md:px-12 grid grid-cols-1 md:grid-cols-3 gap-8 bg-[#09090b]/10 scroll-mt-20"
      >
        <div className="space-y-4">
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#8e1616] font-bold block">ABOUT THE STUDIO</span>
          <h3 className="text-xl font-serif text-white font-normal italic leading-tight pb-2">Capture, Share, Collect, and Embrace the moment shared with Snap Of Love.</h3>
          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 items-start">
            <a
              ref={instagramBtnRef}
              href="https://www.instagram.com/snapoflove.id/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.2em] text-stone-300 hover:text-white transition-colors border border-stone-850 hover:border-[#8e1616]/40 px-3.5 py-2 bg-[#0c0c0f]/80 cursor-pointer"
            >
              <div className="magnetic-inner flex items-center gap-2">
                <Instagram className="w-3.5 h-3.5 text-stone-400 group-hover:text-white" />
                <span>@snapoflove.id</span>
              </div>
            </a>

            <a
              href="https://forms.gle/yXm5QGAvoiDacTVK9"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.2em] text-stone-300 hover:text-white transition-colors border border-stone-850 hover:border-[#8e1616]/40 px-3.5 py-2 bg-[#0c0c0f]/80 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
                <span>Satisfaction Survey</span>
              </div>
            </a>
          </div>
        </div>
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 text-stone-400 text-xs leading-relaxed font-normal">
          <p>
            <b>S.O.L (Snap of Love)</b>is a digital photobooth designed to capture snapshots of memory, moments, and meaningful moments with your love ones. We hold the premise that photos are not mere digital data, but visual coordinates representing genuine affection.
          </p>
          <p>
            By merging nostalgic analog paper textures, adjustable film grain, and clean modern styling grid structures, S.O.L creates a visual bridge to render snapshots that belong in a museum or a memory box. May your story be meaningful with S.O.L.
          </p>
        </div>
      </motion.section>

      {/* CTA Studio trigger before loop */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full flex justify-center py-16 border-x border-stone-900 bg-[#08080a]/20"
      >
        <button
          ref={enterPhotostudioBottomBtnRef}
          onClick={() => {
            playTick();
            startNewSession();
          }}
          className="px-12 py-6 bg-white text-black hover:bg-stone-150 rounded-none text-xs font-bold uppercase tracking-[0.4em] shadow-2xl flex items-center justify-center gap-3 transition-colors cursor-pointer"
        >
          <div className="magnetic-inner flex items-center justify-center gap-3">
            <Camera className="w-4 h-4" />
            ENTER STUDIO
          </div>
        </button>
      </motion.div>

      {/* Loop Marquee (At the very bottom of lobby) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full overflow-hidden border border-stone-900 py-8 bg-[#060608] select-none"
      >
        <div className="flex whitespace-nowrap">
          <motion.div
            animate={{ x: [0, -1000] }}
            transition={{ ease: "linear", duration: 25, repeat: Infinity }}
            className="flex gap-16 text-5xl md:text-7xl font-serif italic text-white tracking-tighter uppercase font-bold pr-16"
          >
            <span>S.O.L</span>
            <span className="font-sans font-normal not-italic text-stone-500">SNAP OF LOVE</span>
            <span>S.O.L</span>
            <span className="font-sans font-normal not-italic text-stone-500">SNAP OF LOVE</span>
            <span>S.O.L</span>
            <span className="font-sans font-normal not-italic text-stone-500">SNAP OF LOVE</span>
          </motion.div>
          <motion.div
            animate={{ x: [0, -1000] }}
            transition={{ ease: "linear", duration: 40, repeat: Infinity }}
            className="flex gap-16 text-5xl md:text-7xl font-serif italic text-white tracking-tighter uppercase font-bold pr-16"
          >
            <span>S.O.L</span>
            <span className="font-sans font-normal not-italic text-stone-500">SNAP OF LOVE</span>
            <span>S.O.L</span>
            <span className="font-sans font-normal not-italic text-stone-500">SNAP OF LOVE</span>
            <span>S.O.L</span>
            <span className="font-sans font-normal not-italic text-stone-500">SNAP OF LOVE</span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
