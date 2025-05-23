import { useEffect, useRef, useState, RefObject } from 'react';
import { useInView } from 'framer-motion';

interface ScrollAnimationOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  animationDelay?: number;
}

interface ScrollAnimationReturn<T extends HTMLElement> {
  ref: RefObject<T>;
  isInView: boolean;
  progress: number;
  hasAnimated: boolean;
}

export const useScrollAnimation = <T extends HTMLElement = HTMLDivElement>({
  threshold = 0.1,
  rootMargin = '-100px',
  triggerOnce = true,
  animationDelay = 0,
}: ScrollAnimationOptions = {}): ScrollAnimationReturn<T> => {
  const ref = useRef<T>(null);
  const isInView = useInView(ref, {
    margin: rootMargin,
    amount: threshold,
  });
  
  const [hasAnimated, setHasAnimated] = useState(false);
  const [progress, setProgress] = useState(0);
  const [delayedInView, setDelayedInView] = useState(false);

  useEffect(() => {
    if (isInView && !hasAnimated) {
      const timer = setTimeout(() => {
        setDelayedInView(true);
        if (triggerOnce) {
          setHasAnimated(true);
        }
      }, animationDelay);

      return () => clearTimeout(timer);
    } else if (!isInView && !triggerOnce) {
      setDelayedInView(false);
    }
  }, [isInView, hasAnimated, triggerOnce, animationDelay]);

  // Calculate scroll progress within the viewport
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateProgress = () => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Calculate how far through the viewport the element has scrolled
      const elementTop = rect.top;
      const elementHeight = rect.height;
      const scrollProgress = 1 - (elementTop / (windowHeight - elementHeight));
      
      // Clamp between 0 and 1
      const clampedProgress = Math.max(0, Math.min(1, scrollProgress));
      setProgress(clampedProgress);
    };

    const handleScroll = () => {
      requestAnimationFrame(updateProgress);
    };

    if (delayedInView || !triggerOnce) {
      window.addEventListener('scroll', handleScroll, { passive: true });
      updateProgress(); // Initial calculation
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [delayedInView, triggerOnce]);

  return {
    ref,
    isInView: delayedInView,
    progress,
    hasAnimated,
  };
};

// Parallax scroll hook
export const useParallaxScroll = <T extends HTMLElement = HTMLDivElement>(speed: number = 0.5) => {
  const [offsetY, setOffsetY] = useState(0);
  const ref = useRef<T>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      
      const rect = ref.current.getBoundingClientRect();
      const scrolled = window.scrollY;
      const rate = scrolled * -speed;
      
      // Only apply parallax when element is in viewport
      if (rect.bottom >= 0 && rect.top <= window.innerHeight) {
        setOffsetY(rate);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return { ref, offsetY };
};

// Reveal animation hook with stagger support
export const useRevealAnimation = (
  staggerDelay: number = 0.1,
  baseDelay: number = 0
) => {
  return {
    container: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          delayChildren: baseDelay,
          staggerChildren: staggerDelay,
        },
      },
    },
    item: {
      hidden: { y: 20, opacity: 0 },
      visible: {
        y: 0,
        opacity: 1,
        transition: {
          type: 'spring',
          damping: 20,
          stiffness: 100,
        },
      },
    },
  };
}; 