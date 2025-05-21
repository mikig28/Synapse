import React, { createContext, useState, useContext, ReactNode } from 'react';

interface DigestContextType {
  latestDigest: string | null;
  setLatestDigest: (digest: string | null) => void;
}

const DigestContext = createContext<DigestContextType | undefined>(undefined);

export const DigestProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [latestDigest, _setLatestDigest] = useState<string | null>(null);

  const setLatestDigest = (digest: string | null) => {
    console.log('[DigestProvider] setLatestDigest CALLED with:', digest);
    _setLatestDigest(digest);
  };

  console.log('[DigestProvider] PROVIDER RENDERING, current latestDigest state is:', latestDigest);

  return (
    <DigestContext.Provider value={{ latestDigest, setLatestDigest }}>
      {children}
    </DigestContext.Provider>
  );
};

export const useDigest = (): DigestContextType => {
  const context = useContext(DigestContext);
  if (context === undefined) {
    throw new Error('useDigest must be used within a DigestProvider');
  }
  return context;
}; 