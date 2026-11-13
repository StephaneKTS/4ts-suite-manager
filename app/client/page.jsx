'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import EspaceClientBoutique from './EspaceClientBoutique';

function ContenuClientQR() {
  const searchParams = useSearchParams();
  const entrepriseId = searchParams.get('entrepriseId');

  if (!entrepriseId) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-4 font-sans">
        <div className="text-red-500 text-3xl">⚠️</div>
        <h2 className="text-sm font-black uppercase text-slate-900">Restaurant non identifié</h2>
        <p className="text-xs text-slate-500 max-w-xs">
          Veuillez scanner un QR code valide sur votre table pour accéder au menu.
        </p>
      </div>
    );
  }

  // Affiche directement l'espace client (boutique/menu) sans aucune vérification d'administrateur
  return <EspaceClientBoutique />;
}

export default function PageClientQR() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Chargement du menu...</div>}>
      <ContenuClientQR />
    </Suspense>
  );
}