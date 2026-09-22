import { useEffect, useState, useRef, type RefObject } from 'react';

export interface FoldableSpanningState {
  isSpanned: boolean;
  isDualScreen: boolean;
  spanningOrientation: 'horizontal' | 'vertical' | 'none';
  hingeWidth: number;
  hingeX: number;
  hingeY: number;
  scrollPadding: {
    left: number;
    right: number;
    top: number;
    bottom: number;
    inline: string;
  };
}

/**
 * Hook that detects if the foldable device is spanned across two screens
 * (e.g. Apple Duo, Surface Duo, Galaxy Fold opened flat) and automatically
 * applies scroll-padding and CSS variables to the main content wrapper so that
 * scrolled content and anchors are never obscured by the physical hinge divider area.
 */
export function useFoldableSpanning<T extends HTMLElement = HTMLElement>(
  customRef?: RefObject<T>
) {
  const localRef = useRef<T | null>(null);
  const targetRef = customRef || localRef;

  const [state, setState] = useState<FoldableSpanningState>(() => ({
    isSpanned: false,
    isDualScreen: false,
    spanningOrientation: 'none',
    hingeWidth: 0,
    hingeX: 0,
    hingeY: 0,
    scrollPadding: {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      inline: '0px',
    },
  }));

  useEffect(() => {
    const evaluateSpanning = () => {
      let isSpanned = false;
      let orientation: 'horizontal' | 'vertical' | 'none' = 'none';
      let hingeW = 0;
      let hX = 0;
      let hY = 0;

      // 1. Check window.getWindowSegments() API (Web dual-screen specification)
      if (typeof window !== 'undefined' && typeof (window as any).getWindowSegments === 'function') {
        try {
          const segs = (window as any).getWindowSegments();
          if (Array.isArray(segs) && segs.length >= 2) {
            isSpanned = true;
            if (segs[0].y === segs[1].y) {
              // Side by side (vertical fold / horizontal spanning)
              orientation = 'horizontal';
              hingeW = Math.max(0, segs[1].x - (segs[0].x + segs[0].width)) || 24;
              hX = segs[0].x + segs[0].width;
            } else {
              // Stacked top and bottom (horizontal fold / vertical spanning)
              orientation = 'vertical';
              hingeW = Math.max(0, segs[1].y - (segs[0].y + segs[0].height)) || 24;
              hY = segs[0].y + segs[0].height;
            }
          }
        } catch {
          // ignore
        }
      }

      // 2. Check CSS Media Queries for dual-screen foldables
      const mqHorizontal = window.matchMedia?.('(horizontal-viewport-segments: 2)');
      const mqVertical = window.matchMedia?.('(vertical-viewport-segments: 2)');
      const mqFoldV = window.matchMedia?.('(screen-spanning: single-fold-vertical)');
      const mqFoldH = window.matchMedia?.('(screen-spanning: single-fold-horizontal)');

      if (mqHorizontal?.matches || mqFoldV?.matches) {
        isSpanned = true;
        orientation = 'horizontal';
        hingeW = hingeW || 24;
        hX = hX || window.innerWidth / 2;
      } else if (mqVertical?.matches || mqFoldH?.matches) {
        isSpanned = true;
        orientation = 'vertical';
        hingeW = hingeW || 24;
        hY = hY || window.innerHeight / 2;
      }

      // 3. Check for simulated dual-screen class (.duo-screen-active)
      if (document.documentElement.classList.contains('duo-screen-active')) {
        isSpanned = true;
        if (orientation === 'none') {
          orientation = 'horizontal';
          hingeW = 24;
          hX = window.innerWidth / 2;
        }
      }

      // Compute safe scroll padding so content doesn't get obscured by the hinge
      const scrollPaddingLeft = orientation === 'horizontal' ? Math.max(20, Math.round(hingeW / 2 + 12)) : 0;
      const scrollPaddingRight = orientation === 'horizontal' ? Math.max(20, Math.round(hingeW / 2 + 12)) : 0;
      const scrollPaddingTop = orientation === 'vertical' ? Math.max(20, Math.round(hingeW / 2 + 12)) : 0;
      const scrollPaddingBottom = orientation === 'vertical' ? Math.max(20, Math.round(hingeW / 2 + 12)) : 0;
      const scrollPaddingInline = orientation === 'horizontal' ? `${Math.max(20, Math.round(hingeW / 2 + 12))}px` : '0px';

      const newState: FoldableSpanningState = {
        isSpanned,
        isDualScreen: isSpanned,
        spanningOrientation: orientation,
        hingeWidth: hingeW,
        hingeX: hX,
        hingeY: hY,
        scrollPadding: {
          left: scrollPaddingLeft,
          right: scrollPaddingRight,
          top: scrollPaddingTop,
          bottom: scrollPaddingBottom,
          inline: scrollPaddingInline,
        },
      };

      setState(newState);

      // Apply scroll-padding and CSS variables to the target or fallback main wrapper
      const el: HTMLElement | null =
        targetRef.current ||
        document.querySelector('main') ||
        document.querySelector('.main-wrapper') ||
        document.querySelector('.app-shell') ||
        document.documentElement;

      if (el) {
        if (isSpanned) {
          el.style.scrollPaddingLeft = `${scrollPaddingLeft}px`;
          el.style.scrollPaddingRight = `${scrollPaddingRight}px`;
          el.style.scrollPaddingTop = `${scrollPaddingTop}px`;
          el.style.scrollPaddingBottom = `${scrollPaddingBottom}px`;
          el.style.scrollPaddingInline = scrollPaddingInline;
          el.classList.add('duo-spanned-scroll-padded');
          document.body.classList.add('duo-spanned');
        } else {
          el.style.scrollPaddingLeft = '';
          el.style.scrollPaddingRight = '';
          el.style.scrollPaddingTop = '';
          el.style.scrollPaddingBottom = '';
          el.style.scrollPaddingInline = '';
          el.classList.remove('duo-spanned-scroll-padded');
          document.body.classList.remove('duo-spanned');
        }
      }

      // Also set CSS variables on document root for universal child element access
      if (typeof document !== 'undefined') {
        const root = document.documentElement;
        if (isSpanned) {
          root.style.setProperty('--duo-is-spanned', '1');
          root.style.setProperty('--duo-hinge-width', `${hingeW || 24}px`);
          root.style.setProperty('--duo-scroll-padding-left', `${scrollPaddingLeft}px`);
          root.style.setProperty('--duo-scroll-padding-right', `${scrollPaddingRight}px`);
          root.style.setProperty('--duo-scroll-padding-inline', scrollPaddingInline);
          root.style.setProperty('--duo-hinge-x', `${hX}px`);
          root.style.setProperty('--duo-hinge-y', `${hY}px`);
        } else {
          root.style.setProperty('--duo-is-spanned', '0');
          root.style.setProperty('--duo-hinge-width', '0px');
          root.style.setProperty('--duo-scroll-padding-left', '0px');
          root.style.setProperty('--duo-scroll-padding-right', '0px');
          root.style.setProperty('--duo-scroll-padding-inline', '0px');
        }
      }
    };

    evaluateSpanning();

    // Event listeners
    const mqs: (MediaQueryList | undefined)[] = [
      window.matchMedia?.('(horizontal-viewport-segments: 2)'),
      window.matchMedia?.('(vertical-viewport-segments: 2)'),
      window.matchMedia?.('(screen-spanning: single-fold-vertical)'),
      window.matchMedia?.('(screen-spanning: single-fold-horizontal)'),
    ];

    const handleMediaChange = () => evaluateSpanning();
    mqs.forEach((mq) => mq?.addEventListener?.('change', handleMediaChange));
    window.addEventListener('resize', evaluateSpanning);
    window.addEventListener('orientationchange', evaluateSpanning);

    // Mutation observer on <html> class list in case simulated mode toggles
    const observer = new MutationObserver(() => {
      evaluateSpanning();
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      mqs.forEach((mq) => mq?.removeEventListener?.('change', handleMediaChange));
      window.removeEventListener('resize', evaluateSpanning);
      window.removeEventListener('orientationchange', evaluateSpanning);
      observer.disconnect();
    };
  }, [targetRef]);

  return {
    ...state,
    wrapperRef: targetRef,
  };
}
