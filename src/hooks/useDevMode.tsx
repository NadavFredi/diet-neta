import React, { createContext, useContext, useEffect, useRef, useState } from 'react';

interface DevModeContextValue {
  devMode: boolean;
  toggleDevMode: () => void;
  setDevMode: (value: boolean) => void;
}

const DevModeContext = createContext<DevModeContextValue | undefined>(undefined);

export const DevModeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [devMode, setDevMode] = useState(false);
  const bufferRef = useRef('');

  const toggleDevMode = () => {
    setDevMode((prev) => !prev);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // Don't trigger when typing inside inputs/textareas/contentEditable
      if (
        !target ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      bufferRef.current = (bufferRef.current + event.key.toLowerCase()).slice(-3);

      if (bufferRef.current === 'dev') {
        toggleDevMode();
        bufferRef.current = '';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <DevModeContext.Provider value={{ devMode, toggleDevMode, setDevMode }}>
      {children}
    </DevModeContext.Provider>
  );
};

export const useDevMode = (): DevModeContextValue => {
  const ctx = useContext(DevModeContext);
  if (!ctx) {
    throw new Error('useDevMode must be used within a DevModeProvider');
  }
  return ctx;
};





