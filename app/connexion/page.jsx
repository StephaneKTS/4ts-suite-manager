'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ConnexionEntreprise() {
  const router = useRouter();
  const [identifiant, setIdentifiant] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Nettoyage total de la session et verrouillage du bouton "Retour" du navigateur
  useEffect(() => {
    localStorage.removeItem('utilisateurConnecte');
    localStorage.removeItem('emailConnecte');
    localStorage.removeItem('entrepriseId');
    localStorage.removeItem('utilisateur_connecte');

    // Empêche le retour en arrière dans l'historique
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleConnexion = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const cleanIdentifiant = identifiant ? identifiant.trim() : '';
    const cleanPin = pinCode ? pinCode.trim() : '';

    try {
      let entrepriseIdCible = null;
      let nomUtilisateurConnecte = '';
      let authenticated = false;

      // 1. Recherche prioritaire dans la table 'entreprises' (Admin)
      const { data: entList } = await supabase
        .from('entreprises')
        .select('*');

      if (entList) {
        const entrepriseTrouvee = entList.find(ent => 
          (ent.id_entreprise && ent.id_entreprise.toUpperCase() === cleanIdentifiant.toUpperCase()) || 
          (ent.email && ent.email.toLowerCase() === cleanIdentifiant.toLowerCase())
        );

        if (entrepriseTrouvee) {
          const mdpBase = String(entrepriseTrouvee.mot_de_passe || entrepriseTrouvee.code_pin_activation || '').trim();
          if (!mdpBase || mdpBase === cleanPin) {
            entrepriseIdCible = entrepriseTrouvee.id_entreprise;
            nomUtilisateurConnecte = entrepriseTrouvee.nom_entreprise || 'Administrateur';
            authenticated = true;
          }
        }
      }

      // 2. Recherche dans la table 'utilisateurs' (Collaborateurs)
      if (!authenticated) {
        const { data: userList } = await supabase
          .from('utilisateurs')
          .select('*');

        if (userList) {
          const utilisateurTrouve = userList.find(u => 
            u.email && u.email.toLowerCase() === cleanIdentifiant.toLowerCase()
          );

          if (utilisateurTrouve) {
            entrepriseIdCible = utilisateurTrouve.id_entreprise;
            nomUtilisateurConnecte = utilisateurTrouve.nom_complet || utilisateurTrouve.nom_prenom || cleanIdentifiant.split('@')[0];
            authenticated = true;
          }
        }
      }

      if (!authenticated || !entrepriseIdCible) {
        throw new Error("Identifiant ou e-mail introuvable dans le système.");
      }

      // Sauvegarde des informations de session après authentification réussie
      localStorage.setItem('utilisateurConnecte', nomUtilisateurConnecte);
      localStorage.setItem('emailConnecte', cleanIdentifiant);
      localStorage.setItem('entrepriseId', entrepriseIdCible);

      // Redirection définitive avec remplacement d'historique (bloque le retour arrière vers le login)
      window.location.replace(`/dashboard?entreprise=${entrepriseIdCible}`);

    } catch (err) {
      console.error('Erreur connexion :', err);
      setErrorMsg(err.message || "Erreur lors de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center p-4 font-sans text-xs">
      <div className="max-w-md w-full bg-[#1b263b] border border-blue-900/60 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-6">
        
        <div className="text-center space-y-2">
          <div className="inline-block bg-orange-600 text-white font-black text-lg px-4 py-2 rounded-xl shadow-md tracking-wider">
            4TS
          </div>
          <h1 className="text-xl font-extrabold uppercase tracking-tight text-white">
            Connexion Espace
          </h1>
          <p className="text-blue-200/70 text-xs">
            Veuillez vous identifier pour accéder à votre espace 4TS Suite Manager
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/25 border border-rose-500/60 text-rose-200 rounded-xl text-xs font-semibold text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleConnexion} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-300 mb-1.5">
              ID Entreprise ou E-mail (Admin / Collaborateur) <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              required
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              placeholder="ex: zoaatabate5@gmail.com"
              className="w-full bg-[#0d1b2a] border border-blue-900 rounded-xl px-3.5 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-300 mb-1.5">
              Mot de passe / Code PIN <span className="text-orange-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                required
                autoCapitalize="none"
                autoCorrect="off"
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0d1b2a] border border-blue-900 rounded-xl pl-3.5 pr-24 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300/70 hover:text-white text-xs font-bold"
              >
                {showPin ? '👁️ Masquer' : '👁️ Afficher'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition duration-200 uppercase tracking-wider text-xs"
          >
            {loading ? 'Vérification en cours...' : 'Se connecter à mon espace'}
          </button>
        </form>

        <div className="text-center pt-3 border-t border-blue-900/40">
          <p className="text-slate-400 text-xs">
            Vous n'avez pas encore de compte ?{' '}
            <a href="/souscription" className="text-orange-400 font-bold hover:underline">
              Créer un espace
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}