'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function ContenuRacineAdmin() {
  const searchParams = useSearchParams();
  const entrepriseId = searchParams.get('entrepriseId');
  const [estAdminAuthentifie, setEstAdminAuthentifie] = useState(false);
  const [verificationEnCours, setVerificationEnCours] = useState(true);

  useEffect(() => {
    // SI UN CLIENT ARRIVE VIA UN QR CODE À LA RACINE, REDIRECTION IMMÉDIATE VERS /client
    if (entrepriseId) {
      window.location.replace(`/client?entrepriseId=${entrepriseId}`);
      return;
    }

    // VÉRIFICATION DE SÉCURITÉ ADMIN
    async function verifierAdmin() {
      try {
        // 1. Vérification de la session active Supabase Auth
        const { data: { session } } = await supabase.auth.getSession();
        
        // 2. Vérification du localStorage admin
        const adminLocal = localStorage.getItem('utilisateurConnecte') || localStorage.getItem('emailConnecte');

        if (session || adminLocal) {
          setEstAdminAuthentifie(true);
        } else {
          setEstAdminAuthentifie(false);
        }
      } catch (e) {
        setEstAdminAuthentifie(false);
      } finally {
        setVerificationEnCours(false);
      }
    }

    verifierAdmin();
  }, [entrepriseId]);

  if (verificationEnCours) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Vérification de sécurité...</div>;
  }

  // SI LA PERSONNE N'EST PAS ADMIN ET OUVRE L'APPLICATION DEPUIS SON ÉCRAN D'ACCUEIL :
  if (!estAdminAuthentifie) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-4 font-sans">
        <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center text-3xl">🍽️</div>
        <h1 className="text-base font-black uppercase text-slate-900">4TS Suite Manager - Espace Client</h1>
        <p className="text-xs text-slate-500 max-w-xs">
          Veuillez scanner le QR code posé sur votre table dans un restaurant partenaire pour accéder directement au menu de commande.
        </p>
        <a
          href="/connexion"
          className="bg-orange-600 hover:bg-orange-500 text-white font-black px-6 py-3 rounded-2xl text-xs uppercase shadow-md transition"
        >
          Connexion Administrateur ➔
        </a>
      </div>
    );
  }

  // SI C'EST BIEN VOUS (L'ADMINISTRATEUR CONNECTÉ) :
  return (
    <div className="p-6 text-center">
      <h1 className="text-sm font-bold">Redirection vers votre espace...</h1>
    </div>
  );
}

export default function PageRacineAdmin() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Chargement...</div>}>
      <ContenuRacineAdmin />
    </Suspense>
  );
}