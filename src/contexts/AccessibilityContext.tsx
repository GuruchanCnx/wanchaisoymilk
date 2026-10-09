import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type TextSizeMode = 'normal' | 'elder';

interface AccessibilityContextType {
  mode: TextSizeMode;
  isElderMode: boolean;
  isHighContrast: boolean;
  toggleElderMode: () => void;
  toggleHighContrast: () => void;
  setMode: (mode: TextSizeMode) => void;
  setHighContrast: (enabled: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType>({
  mode: 'normal',
  isElderMode: false,
  isHighContrast: false,
  toggleElderMode: () => {},
  toggleHighContrast: () => {},
  setMode: () => {},
  setHighContrast: () => {},
});

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<TextSizeMode>(() => {
    try {
      return (localStorage.getItem('wanchai_text_mode') as TextSizeMode) || 'normal';
    } catch {
      return 'normal';
    }
  });

  const [isHighContrast, setIsHighContrastState] = useState<boolean>(() => {
    try {
      return localStorage.getItem('wanchai_high_contrast') === 'true';
    } catch {
      return false;
    }
  });

  const isElderMode = mode === 'elder';

  useEffect(() => {
    try {
      localStorage.setItem('wanchai_text_mode', mode);
      if (mode === 'elder') {
        document.documentElement.classList.add('elder-mode');
      } else {
        document.documentElement.classList.remove('elder-mode');
      }
    } catch {}
  }, [mode]);

  useEffect(() => {
    try {
      localStorage.setItem('wanchai_high_contrast', String(isHighContrast));
      if (isHighContrast) {
        document.documentElement.classList.add('high-contrast-mode');
      } else {
        document.documentElement.classList.remove('high-contrast-mode');
      }
    } catch {}
  }, [isHighContrast]);

  const toggleElderMode = () => {
    setModeState((prev) => (prev === 'normal' ? 'elder' : 'normal'));
  };

  const toggleHighContrast = () => {
    setIsHighContrastState((prev) => !prev);
  };

  const setMode = (newMode: TextSizeMode) => {
    setModeState(newMode);
  };

  const setHighContrast = (enabled: boolean) => {
    setIsHighContrastState(enabled);
  };

  return (
    <AccessibilityContext.Provider
      value={{
        mode,
        isElderMode,
        isHighContrast,
        toggleElderMode,
        toggleHighContrast,
        setMode,
        setHighContrast,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export const useAccessibility = () => useContext(AccessibilityContext);
