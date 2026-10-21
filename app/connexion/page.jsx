'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};

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

    const cleanIdentifiant = identifiant ? identifiant.trim().toLowerCase() : '';
    const cleanPin = pinCode ? pinCode.trim() : '';

    try {
      const supabase = getSupabaseClient();
      let entrepriseIdCible = null;
      let nomEntrepriseTrouvee = '';
      let authenticated = false;

      // ÉTAPE 1 : Est-ce un ID d'entreprise direct (ex: 4TS-234321) ?
      const { data: entById } = await supabase
        .from('entreprises')
        .select('*')
        .eq('id_entreprise', cleanIdentifiant.toUpperCase())
        .maybeSingle();

      if (entById) {
        if (entById.mot_de_passe === cleanPin || entById.code_pin_activation === cleanPin) {
          entrepriseIdCible = entById.id_entreprise;
          nomEntrepriseTrouvee = entById.nom_entreprise;
          authenticated = true;
        }
      }

      // ÉTAPE 2 : Si non, est-ce l'e-mail de l'administrateur dans la table entreprises ?
      if (!authenticated) {
        const { data: entByEmail } = await supabase
          .from('entreprises')
          .select('*')
          .eq('email', cleanIdentifiant)
          .maybeSingle();

        if (entByEmail) {
          if (entByEmail.mot_de_passe === cleanPin || entByEmail.code_pin_activation === cleanPin) {
            entrepriseIdCible = entByEmail.id_entreprise;
            nomEntrepriseTrouvee = entByEmail.nom_entreprise;
            authenticated = true;
          }
        }
      }

      // ÉTAPE 3 : Si toujours non, est-ce un collaborateur dans la table utilisateurs ?
      if (!authenticated) {
        const { data: userByEmail } = await supabase
          .from('utilisateurs')
          .select('*')
          .eq('email', cleanIdentifiant)
          .maybeSingle();

        if (userByEmail) {
          if (!userByEmail.mot_de_passe || userByEmail.mot_de_passe === cleanPin) {
            entrepriseIdCible = userByEmail.id_entreprise;
            
            // Récupérer le nom de l'entreprise associée
            const { data: entAssociee } = await supabase
              .from('entreprises')
              .select('nom_entreprise')
              .eq('id_entreprise', entrepriseIdCible)
              .maybeSingle();

            nomEntrepriseTrouvee = entAssociee?.nom_entreprise || 'votre entreprise';
            authenticated = true;
          }
        }
      }

      if (!authenticated) {
        throw new Error("Identifiant ou mot de passe incorrect. Vérifiez vos informations.");
      }

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
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              placeholder="ex: 4TS-234321 ou collaborateur@isma.com"
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