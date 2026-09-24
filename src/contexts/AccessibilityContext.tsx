import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type TextSizeMode = 'normal' | 'elder';

interface AccessibilityContextType {
  mode: TextSizeMode;
  isElderMode: boolean;
  toggleElderMode: () => void;
  setMode: (mode: TextSizeMode) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType>({
  mode: 'normal',
  isElderMode: false,
  toggleElderMode: () => {},
  setMode: () => {},
});

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<TextSizeMode>(() => {
    try {
      return (localStorage.getItem('wanchai_text_mode') as TextSizeMode) || 'normal';
    } catch {
      return 'normal';
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

  const toggleElderMode = () => {
    setModeState((prev) => (prev === 'normal' ? 'elder' : 'normal'));
  };

  const setMode = (newMode: TextSizeMode) => {
    setModeState(newMode);
  };

  return (
    <AccessibilityContext.Provider
      value={{
        mode,
        isElderMode,
        toggleElderMode,
        setMode,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export const useAccessibility = () => useContext(AccessibilityContext);
