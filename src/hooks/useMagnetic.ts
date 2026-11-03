import { useRef, useEffect } from 'react';
import gsap from 'gsap';

/**
 * Custom hook to apply a premium GSAP magnetic cursor attraction effect to buttons or interactive elements.
 * @param strength Number between 0 and 1 representing the pull strength. Defaults to 0.35.
 */
export function useMagnetic(strength = 0.35) {
  const ref = useRef<any>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Only apply on fine-pointer desktop devices to prevent issues on touch screens
    const isMobile = window.matchMedia('(pointer: coarse)').matches;
    if (isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      const target = el.querySelector('.magnetic-inner') || el;

      // Elastic pull towards the pointer coordinates
      gsap.to(target, {
        x: x * strength,
        y: y * strength,
        scale: 1.05,
        duration: 0.35,
        ease: 'power2.out',
      });
    };

    const handleMouseLeave = () => {
      const target = el.querySelector('.magnetic-inner') || el;
      
      // Elastic spring back to original origin
      gsap.to(target, {
        x: 0,
        y: 0,
        scale: 1,
        duration: 0.6,
        ease: 'elastic.out(1.1, 0.4)',
      });
    };

    el.addEventListener('mousemove', handleMouseMove);
    el.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      el.removeEventListener('mousemove', handleMouseMove);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [strength]);

  return ref;
}
