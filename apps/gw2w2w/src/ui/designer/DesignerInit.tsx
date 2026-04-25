'use client';

import type { Emblem } from '@repo/service-api/types';
import { useEffect, useState } from 'react';

import { TextureCacheManager } from './TextureCacheManager';
import { initPhoton, isPhotonReady } from './TextureCacheManager/photon';

interface DesignerInitProps {
  backgrounds: Emblem[];
  foregrounds: Emblem[];
  children: React.ReactNode;
}

export function DesignerInit({ backgrounds, foregrounds, children }: DesignerInitProps) {
  const [photonReady, setPhotonReady] = useState(isPhotonReady);

  useEffect(() => {
    if (photonReady) return;
    void initPhoton().then(() => {
      setPhotonReady(true);
    });
  }, [photonReady]);

  return (
    <TextureCacheManager backgrounds={backgrounds} foregrounds={foregrounds}>
      {!photonReady ? (
        <div className="flex items-center justify-center py-16">
          <div className="size-6 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-500" />
        </div>
      ) : (
        children
      )}
    </TextureCacheManager>
  );
}
