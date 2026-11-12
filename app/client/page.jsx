'use client';

import { useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import EspaceClientBoutique from './EspaceClientBoutique';

function ContenuClientSecurise() {
  useEffect(() => {
    async function purgerSessionAdminSurClient() {
      try {
        // Déconnexion explicite de Supabase pour tuer le token administrateur actif
        await supabase.auth.signOut();
        
        // Suppression des clés de stockage local liées à l'admin
        const clesAdmin = ['utilisateurConnecte', 'utilisateur_connecte', 'emailConnecte', 'email_connecte'];
        clesAdmin.forEach(cle => localStorage.removeItem(cle));

        // Suppression de tous les tokens Supabase du navigateur
        Object.keys(localStorage).forEach(cle => {
          if (cle.startsWith('sb-') && cle.endsWith('-auth-token')) {
            localStorage.removeItem(cle);
          }
        });
      } catch (e) {
        console.error("Erreur lors de la sécurisation de l'espace client :", e);
      }
    }

    purgerSessionAdminSurClient();
  }, []);

  return <EspaceClientBoutique />;
}

export default function PageClient() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen font-bold text-slate-400">Chargement de l'espace client...</div>}>
      <ContenuClientSecurise />
    </Suspense>
  );
}