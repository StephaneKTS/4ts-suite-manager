import { Suspense } from 'react';
import EspaceClientBoutique from './EspaceClientBoutique';

export default function PageClient() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen">Chargement de l'espace client...</div>}>
      <EspaceClientBoutique />
    </Suspense>
  );
}