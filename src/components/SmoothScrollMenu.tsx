import { useRef, useState, useEffect, ReactNode, UIEvent } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { triggerHaptic } from '../lib/haptics';

interface SmoothScrollMenuProps {
  children: ReactNode;
  className?: string;
  containerClassName?: string;
  showArrows?: boolean;
  arrowTheme?: 'light' | 'dark' | 'forest';
}

/**
 * SmoothScrollMenu
 * Provides frictionless horizontal scrolling on mobile, tablet, and desktop:
 * - Left/Right navigation arrow buttons when content overflows
 * - Left/Right gradient fade masks indicating scrollable content
 * - Native touch momentum with -webkit-overflow-scrolling: touch
 * - Mouse drag-to-scroll support for desktop/tablet trackpads
 */
export default function SmoothScrollMenu({
  children,
  className = '',
  containerClassName = '',
  showArrows = true,
  arrowTheme = 'forest',
}: SmoothScrollMenuProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 6);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;

    const resizeObserver = new ResizeObserver(() => {
      checkScroll();
    });
    resizeObserver.observe(el);

    window.addEventListener('resize', checkScroll);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    checkScroll();
  };

  const scrollByAmount = (offset: number) => {
    triggerHaptic('tap');
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: offset,
        behavior: 'smooth',
      });
      setTimeout(checkScroll, 320);
    }
  };

  // Mouse Drag-to-scroll implementation
  const handleMouseDown = (e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    setIsDragging(true);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeftState(el.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5; // Drag speed multiplier
    scrollRef.current.scrollLeft = scrollLeftState - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Theme styling for scroll arrows
  const arrowBtnBase =
    arrowTheme === 'dark'
      ? 'bg-forest-dark/90 text-cream border-cream/20 hover:bg-forest-dark'
      : arrowTheme === 'forest'
      ? 'bg-forest text-cream border-forest/30 hover:bg-forest-dark shadow-md'
      : 'bg-white/90 text-forest border-forest/20 hover:bg-white shadow-md';

  return (
    <div className={`relative group w-full ${containerClassName}`}>
      {/* Left Smooth Scroll Arrow */}
      {showArrows && canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByAmount(-220)}
          aria-label="Scroll left"
          className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 sm:h-9 sm:w-9 rounded-full border flex items-center justify-center transition-all duration-200 active:scale-90 ${arrowBtnBase}`}
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      )}

      {/* Left Edge Gradient Fade Mask */}
      {canScrollLeft && (
        <div
          className="absolute left-0 top-0 bottom-0 w-8 sm:w-12 pointer-events-none z-10 bg-gradient-to-r from-cream via-cream/80 to-transparent"
          aria-hidden="true"
        />
      )}

      {/* Scrollable Container with touch momentum and drag support */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex items-center overflow-x-auto no-scrollbar scroll-smooth cursor-grab active:cursor-grabbing select-none ${
          canScrollLeft ? 'pl-9 sm:pl-10' : ''
        } ${canScrollRight ? 'pr-9 sm:pr-10' : ''} ${className}`}
        style={{
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {children}
      </div>

      {/* Right Edge Gradient Fade Mask */}
      {canScrollRight && (
        <div
          className="absolute right-0 top-0 bottom-0 w-8 sm:w-12 pointer-events-none z-10 bg-gradient-to-l from-cream via-cream/80 to-transparent"
          aria-hidden="true"
        />
      )}

      {/* Right Smooth Scroll Arrow */}
      {showArrows && canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByAmount(220)}
          aria-label="Scroll right"
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 sm:h-9 sm:w-9 rounded-full border flex items-center justify-center transition-all duration-200 active:scale-90 ${arrowBtnBase}`}
        >
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>
      )}
    </div>
  );
}
