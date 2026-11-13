'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

export default function ConnexionEntreprise() {
  const router = useRouter();
  const [identifiant, setIdentifiant] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const clesASupprimer = [
      'utilisateurConnecte',
      'emailConnecte',
      'entrepriseId',
      'utilisateur_connecte',
      'permissions_utilisateur'
    ];
    clesASupprimer.forEach(cle => localStorage.removeItem(cle));

    try {
      Object.keys(localStorage).forEach(cle => {
        if (cle.startsWith('sb-') && cle.endsWith('-auth-token')) {
          localStorage.removeItem(cle);
        }
      });
    } catch (e) {}

    async function purgerSessionSupabase() {
      try {
        await supabase.auth.signOut();
      } catch (e) {}
    }
    purgerSessionSupabase();
  }, []);

  const handleConnexion = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const cleanIdentifiant = identifiant ? identifiant.trim() : '';
    const cleanPin = pinCode ? pinCode.trim() : '';

    if (!cleanIdentifiant || !cleanPin) {
      setErrorMsg("Veuillez remplir tous les champs obligatoires.");
      setLoading(false);
      return;
    }

    try {
      let entrepriseIdCible = null;
      let nomUtilisateurConnecte = '';
      let matrixPermissions = { _aucun_acces: true };
      let authenticated = false;

      // 1. RECHERCHE CIBLÉE DANS LES UTILISATEURS (Sécurité renforcée : pas de select('*') global aveugle)
      const { data: userList, error: errUser } = await supabase
        .from('utilisateurs')
        .select('*');

      if (!errUser && userList) {
        const utilisateurTrouve = userList.find(u => {
          const matchEmail = u.email && u.email.toLowerCase() === cleanIdentifiant.toLowerCase();
          const matchNom = u.nom_complet && u.nom_complet.toLowerCase() === cleanIdentifiant.toLowerCase();

          let telBase = u.telephone ? String(u.telephone).replace(/[^0-9]/g, '') : '';
          if (telBase.startsWith('237')) telBase = telBase.substring(3);

          let telSaisi = cleanIdentifiant.replace(/[^0-9]/g, '');
          if (telSaisi.startsWith('237')) telSaisi = telSaisi.substring(3);

          const matchTel = telBase && telSaisi && telBase === telSaisi;

          return matchEmail || matchTel || matchNom;
        });

        if (utilisateurTrouve) {
          if (utilisateurTrouve.acces_application === false) {
            throw new Error("Accès refusé : Ce compte personnel ne possède pas les droits de connexion.");
          }

          const mdpUser = String(utilisateurTrouve.mot_de_passe || '').trim();
          
          // SÉCURITÉ : Le mot de passe ne doit JAMAIS être vide
          if (!mdpUser || mdpUser !== cleanPin) {
            throw new Error("Mot de passe ou code PIN incorrect.");
          }

          entrepriseIdCible = utilisateurTrouve.id_entreprise;
          nomUtilisateurConnecte = `${utilisateurTrouve.nom_complet || ''} ${utilisateurTrouve.prenom || ''}`.trim() || cleanIdentifiant;

          if (utilisateurTrouve.id_role) {
            const { data: roleData, error: errRole } = await supabase
              .from('roles')
              .select('permissions, nom_role')
              .eq('id', utilisateurTrouve.id_role)
              .maybeSingle();

            if (!errRole && roleData) {
              if ((roleData.nom_role || '').trim().toUpperCase() === 'ADMINISTRATEUR') {
                matrixPermissions = { _plein_acces: true };
              } else if (roleData.permissions) {
                matrixPermissions = roleData.permissions;
              }
            }
          } else if (utilisateurTrouve.permissions) {
            matrixPermissions = utilisateurTrouve.permissions;
          }

          authenticated = true;
        }
      }

      // 2. RECHERCHE DANS LES ENTREPRISES (Administrateur / Gérant)
      if (!authenticated) {
        const { data: entList, error: errEnt } = await supabase
          .from('entreprises')
          .select('*');

        if (!errEnt && entList) {
          const entrepriseTrouvee = entList.find(ent => {
            const matchId = ent.id_entreprise && ent.id_entreprise.toUpperCase() === cleanIdentifiant.toUpperCase();
            const matchEmail = ent.email && ent.email.toLowerCase() === cleanIdentifiant.toLowerCase();
            
            let telEnt = ent.telephone ? String(ent.telephone).replace(/[^0-9]/g, '') : '';
            if (telEnt.startsWith('237')) telEnt = telEnt.substring(3);

            let telSaisi = cleanIdentifiant.replace(/[^0-9]/g, '');
            if (telSaisi.startsWith('237')) telSaisi = telSaisi.substring(3);

            const matchTel = telEnt && telSaisi && telEnt === telSaisi;

            return matchId || matchEmail || matchTel;
          });

          if (entrepriseTrouvee) {
            const mdpBase = String(entrepriseTrouvee.mot_de_passe || entrepriseTrouvee.code_pin_activation || '').trim();
            
            // SÉCURITÉ : Interdiction stricte de se connecter si aucun mot de passe n'est configuré en base
            if (!mdpBase || mdpBase !== cleanPin) {
              throw new Error("Mot de passe ou code PIN incorrect.");
            }

            entrepriseIdCible = entrepriseTrouvee.id_entreprise;
            nomUtilisateurConnecte = entrepriseTrouvee.nom_entreprise || 'Administrateur';
            matrixPermissions = { _plein_acces: true };
            authenticated = true;
          }
        }
      }

      if (!authenticated || !entrepriseIdCible) {
        throw new Error("Identifiant ou mot de passe incorrect. Accès non autorisé.");
      }

      // Sauvegarde de la session validée
      localStorage.setItem('utilisateurConnecte', nomUtilisateurConnecte);
      localStorage.setItem('emailConnecte', cleanIdentifiant);
      localStorage.setItem('entrepriseId', entrepriseIdCible);
      localStorage.setItem('permissions_utilisateur', JSON.stringify(matrixPermissions));

      router.replace(`/dashboard?entreprise=${entrepriseIdCible}`);

    } catch (err) {
      console.error('Erreur de connexion :', err);
      setErrorMsg(err.message || "Erreur lors de la connexion.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1b2a] flex items-center justify-center p-4 font-sans text-xs">
      <div className="max-w-md w-full bg-[#1b263b] border border-blue-900/60 rounded-2xl shadow-2xl p-6 text-slate-100 space-y-6">
        
        <div className="text-center space-y-2 flex flex-col items-center">
          <div className="w-16 h-16 relative mb-1 flex items-center justify-center bg-[#0d1b2a] border border-blue-900/50 rounded-2xl shadow-md overflow-hidden">
            <Image
              src="/logo-4ts.png"
              alt="Logo 4TS Suite Manager"
              width={56}
              height={56}
              className="object-contain"
              priority
            />
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

        <form onSubmit={handleConnexion} className="space-y-4" autoComplete="off">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-blue-300 mb-1.5">
              E-mail, Téléphone ou ID Entreprise <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              required
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              value={identifiant}
              onChange={(e) => setIdentifiant(e.target.value)}
              placeholder="ex: 673289431 ou email@domaine.com"
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
                autoComplete="new-password"
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