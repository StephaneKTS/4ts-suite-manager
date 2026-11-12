'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PageRacine() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const entrepriseId = searchParams.get('entrepriseId');

  useEffect(() => {
    // 1. Si un client arrive via un QR code de table, redirection immédiate vers l'espace client
    if (entrepriseId) {
      router.replace(`/client?entrepriseId=${entrepriseId}`);
      return;
    }

    // 2. SÉCURITÉ PWA : Vérification de la session administrateur locale
    const adminConnecte = localStorage.getItem('utilisateurConnecte') || localStorage.getItem('emailConnecte');
    const entrepriseAdmin = localStorage.getItem('entrepriseId');

    if (adminConnecte && entrepriseAdmin) {
      // Si c'est l'administrateur, on l'envoie vers son tableau de bord
      router.replace(`/dashboard?entreprise=${entrepriseAdmin}`);
    } else {
      // Sinon (client ou nouvel utilisateur ouvrant la PWA), redirection vers la page de connexion
      router.replace('/connexion');
    }
  }, [entrepriseId, router]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-100 font-sans text-xs">
      Chargement de l'application 4TS...
    </div>
  );
}