import { useRef, useEffect, useState } from 'react';

interface UseScrollAnimationReturn {
  ref: React.RefObject<HTMLDivElement>;
  isInView: boolean;
}

export const useScrollAnimation = (): UseScrollAnimationReturn => {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px',
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return { ref, isInView };
};

export const useRevealAnimation = (staggerChildrenValue: number = 0.1, itemTransitionDelay: number = 0.2) => {
  return {
    container: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: staggerChildrenValue,
          // delayChildren: itemTransitionDelay // Optional: if the second param was for this
        },
      },
    },
    item: {
      hidden: { y: 20, opacity: 0 },
      visible: {
        y: 0,
        opacity: 1,
        transition: {
          delay: itemTransitionDelay, // Apply the second parameter as a delay to each item's transition
          duration: 0.4 // Add a sensible duration
        },
      },
    },
  };
};
