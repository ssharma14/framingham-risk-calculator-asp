import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { prefersReducedMotion } from '../lib/animation';

// Staggers [data-enter] elements into view on mount.
export function useEntranceAnimation<T extends HTMLElement>() {
  const scope = useRef<T>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.from('[data-enter]', {
        opacity: 0,
        y: 16,
        duration: 0.5,
        stagger: 0.1,
        ease: 'power2.out',
      });
    }, scope);
    return () => ctx.revert();
  }, []);

  return scope;
}
