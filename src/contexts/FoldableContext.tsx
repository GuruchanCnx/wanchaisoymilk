import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export interface ViewportSegment {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FoldableContextValue {
  isFolded: boolean; // true = single screen folded or single display; false = unfolded spanning dual-screen
  isDualScreen: boolean; // true = unfolded across 2 segments
  segments: ViewportSegment[];
  hingeWidth: number;
  hingeX: number;
  toggleSimulatedFold: () => void;
  isSimulated: boolean;
}

const FoldableContext = createContext<FoldableContextValue>({
  isFolded: true,
  isDualScreen: false,
  segments: [],
  hingeWidth: 0,
  hingeX: 0,
  toggleSimulatedFold: () => {},
  isSimulated: false,
});

export function FoldableProvider({ children }: { children: ReactNode }) {
  const [isFolded, setIsFolded] = useState<boolean>(true);
  const [segments, setSegments] = useState<ViewportSegment[]>([]);
  const [hingeWidth, setHingeWidth] = useState<number>(0);
  const [hingeX, setHingeX] = useState<number>(0);
  const [simulatedDuo, setSimulatedDuo] = useState<boolean>(false);

  useEffect(() => {
    // Check for native window.getWindowSegments API or CSS media queries
    const updateFoldState = () => {
      let isDual = false;
      let segs: ViewportSegment[] = [];
      let hWidth = 0;
      let hX = 0;

      // 1. Check window.getWindowSegments (Web standard draft for dual-screen foldables like Surface Duo / Apple Duo)
      if (typeof (window as any).getWindowSegments === 'function') {
        try {
          const nativeSegments = (window as any).getWindowSegments();
          if (Array.isArray(nativeSegments) && nativeSegments.length > 1) {
            isDual = true;
            segs = nativeSegments.map((s: any) => ({
              x: s.x ?? s.left ?? 0,
              y: s.y ?? s.top ?? 0,
              width: s.width ?? 0,
              height: s.height ?? 0,
            }));
            if (segs.length >= 2) {
              hWidth = Math.max(0, segs[1].x - (segs[0].x + segs[0].width));
              hX = segs[0].x + segs[0].width;
            }
          }
        } catch (e) {
          console.debug('getWindowSegments query error:', e);
        }
      }

      // 2. Check CSS Media Queries for dual-screen foldables
      const mqHorizontal = window.matchMedia?.('(horizontal-viewport-segments: 2)');
      const mqVertical = window.matchMedia?.('(vertical-viewport-segments: 2)');
      const mqFoldV = window.matchMedia?.('(screen-spanning: single-fold-vertical)');
      const mqFoldH = window.matchMedia?.('(screen-spanning: single-fold-horizontal)');

      if (mqHorizontal?.matches || mqVertical?.matches || mqFoldV?.matches || mqFoldH?.matches) {
        isDual = true;
        hWidth = hWidth || 24; // typical hinge gap
        hX = hX || window.innerWidth / 2;
      }

      // 3. Simulated dual-screen mode for testing
      if (simulatedDuo) {
        isDual = true;
        hWidth = 24;
        hX = window.innerWidth / 2;
        segs = [
          { x: 0, y: 0, width: (window.innerWidth - 24) / 2, height: window.innerHeight },
          { x: (window.innerWidth + 24) / 2, y: 0, width: (window.innerWidth - 24) / 2, height: window.innerHeight },
        ];
      }

      setIsFolded(!isDual);
      setSegments(segs);
      setHingeWidth(hWidth);
      setHingeX(hX);

      // Add or remove CSS root class
      if (isDual) {
        document.documentElement.classList.add('duo-screen-active');
        document.documentElement.classList.remove('duo-screen-single');
      } else {
        document.documentElement.classList.remove('duo-screen-active');
        document.documentElement.classList.add('duo-screen-single');
      }
    };

    updateFoldState();

    // Listen to media query changes
    const mqList: MediaQueryList[] = [
      window.matchMedia?.('(horizontal-viewport-segments: 2)'),
      window.matchMedia?.('(vertical-viewport-segments: 2)'),
      window.matchMedia?.('(screen-spanning: single-fold-vertical)'),
      window.matchMedia?.('(screen-spanning: single-fold-horizontal)'),
    ].filter(Boolean) as MediaQueryList[];

    const handleMQChange = () => updateFoldState();
    mqList.forEach((mq) => mq.addEventListener('change', handleMQChange));
    window.addEventListener('resize', updateFoldState);
    window.addEventListener('orientationchange', updateFoldState);

    return () => {
      mqList.forEach((mq) => mq.removeEventListener('change', handleMQChange));
      window.removeEventListener('resize', updateFoldState);
      window.removeEventListener('orientationchange', updateFoldState);
    };
  }, [simulatedDuo]);

  const toggleSimulatedFold = () => {
    setSimulatedDuo((prev) => !prev);
  };

  return (
    <FoldableContext.Provider
      value={{
        isFolded,
        isDualScreen: !isFolded,
        segments,
        hingeWidth,
        hingeX,
        toggleSimulatedFold,
        isSimulated: simulatedDuo,
      }}
    >
      {children}
    </FoldableContext.Provider>
  );
}

export const useFoldable = () => useContext(FoldableContext);
export { useFoldableSpanning } from '../hooks/useFoldableSpanning';
