'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ConnexionEntreprise() {
  const router = useRouter();
  const [identifiant, setIdentifiant] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleConnexion = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      let entrepriseIdCible = null;
      let nomEntrepriseTrouvee = '';

      // 1. RECHERCHE DANS LA TABLE DES ENTREPRISES (Admin principal)
      const { data: entrepriseData, error: entrepriseErr } = await supabase
        .from('entreprises')
        .select('*')
        .or(`id_entreprise.eq.${identifiant},email.eq.${identifiant},code_entreprise.eq.${identifiant}`)
        .maybeSingle();

      if (entrepriseErr) {
        console.error("Erreur recherche entreprise:", entrepriseErr);
      }

      if (entrepriseData) {
        // C'est un compte entreprise (Admin)
        if (entrepriseData.mot_de_passe !== pinCode && entrepriseData.code_pin_activation !== pinCode) {
          throw new Error("Code PIN ou mot de passe incorrect.");
        }
        entrepriseIdCible = entrepriseData.id_entreprise || identifiant;
        nomEntrepriseTrouvee = entrepriseData.nom_entreprise;
      } else {
        // 2. RECHERCHE DANS LA TABLE DES UTILISATEURS (Collaborateurs)
        const { data: utilisateurData, error: utilisateurErr } = await supabase
          .from('utilisateurs')
          .select('*')
          .eq('email', identifiant.trim())
          .maybeSingle();

        if (utilisateurErr) {
          console.error("Erreur recherche utilisateur:", utilisateurErr);
        }

        if (!utilisateurData) {
          throw new Error("Aucune entreprise ni aucun compte utilisateur trouvé avec cet e-mail ou identifiant.");
        }

        // Vérification du mot de passe dans la colonne 'mot_de_passe' de la table utilisateurs
        if (utilisateurData.mot_de_passe !== pinCode) {
          throw new Error("Mot de passe ou code PIN collaborateur incorrect.");
        }

        // Récupération de l'entreprise rattachée à cet utilisateur via la colonne 'id_entreprise'
        entrepriseIdCible = utilisateurData.id_entreprise;

        if (!entrepriseIdCible) {
          throw new Error("Ce compte utilisateur n'est rattaché à aucun identifiant d'entreprise.");
        }

        // Récupérer le nom de l'entreprise pour le message de bienvenue
        const { data: entAssociee } = await supabase
          .from('entreprises')
          .select('nom_entreprise')
          .eq('id_entreprise', entrepriseIdCible)
          .maybeSingle();

        nomEntrepriseTrouvee = entAssociee?.nom_entreprise || 'votre entreprise';
      }

      // Connexion réussie : redirection vers le dashboard de l'entreprise
      alert(`Connexion réussie ! Bienvenue sur l'espace de ${nomEntrepriseTrouvee}.`);
      router.push(`/dashboard?entreprise=${entrepriseIdCible}`);

    } catch (err) {
      setErrorMsg(err.message || "Erreur lors de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center p-4 font-sans text-xs">
      <div className="max-w-md w-full bg-[#1b263b] border border-blue-900/60 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-6">
        
        {/* EN-TÊTE */}
        <div className="text-center space-y-2">
          <div className="inline-block bg-orange-600 text-white font-black text-lg px-4 py-2 rounded-xl shadow-md tracking-wider">
            4TS
          </div>
          <h1 className="text-xl font-extrabold uppercase tracking-tight text-white">
            Connexion Espace
          </h1>
          <p className="text-blue-200/70 text-xs">
            Accédez à votre espace de gestion 4TS Suite Manager
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-500/20 border border-rose-500/50 text-rose-200 rounded-xl text-xs font-semibold text-center">
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
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              placeholder="ex: 4TS-982100 ou collaborateur@isma.com"
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