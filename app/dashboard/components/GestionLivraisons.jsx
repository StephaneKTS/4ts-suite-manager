'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionLivraisons({ entrepriseId = '4TS-TEST' }) {
  // Onglet actif par défaut dans le module Livraison
  const [ongletActif, setOngletActif] = useState('saisie');

  // États de données et de chargement
  const [livraisons, setLivraisons] = useState([]);
  const [chargement, setChargement] = useState(false);

  // --- GESTION DES DROITS ET AUTORISATIONS ---
  const [roleNom, setRoleNom] = useState('');
  const [permissions, setPermissions] = useState({
    lecture: true,
    creation: true,
    modification: true,
    suppression: false,
  });

  // --- RÈGLE 1 : PAGINATION / LIMITES D'AFFICHAGE MOBILES ---
  const [limiteLivraisons, setLimiteLivraisons] = useState(20);

  // Récupération dynamique et robuste du module actif (Boutique, Livraison, Logistique, Tontine, etc.)
  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'LIVRAISON').toUpperCase();
    }
    return 'LIVRAISON';
  };

  const moduleActuel = obtenirModuleActuel();

  // --- RÈGLE 2 : FONCTION RPC SUPABASE ---
  // Chargement des permissions et des données de livraison via une fonction RPC PostgreSQL avec fallback sécurisé
  const chargerPermissionsEtLivraisons = async () => {
    setChargement(true);
    try {
      // 1. Charger et analyser les permissions de l'employé connecté
      const utilisateurConnecteStr = localStorage.getItem('utilisateur_connecte');
      if (utilisateurConnecteStr) {
        const userObj = JSON.parse(utilisateurConnecteStr);
        const nomRoleUser = (userObj.nom_role || userObj.role || '').trim().toUpperCase();
        setRoleNom(nomRoleUser);

        if (nomRoleUser && nomRoleUser !== 'ADMINISTRATEUR' && nomRoleUser !== 'SUPER_ADMIN') {
          const pLivraison = userObj.permissions?.['livraisons'] || userObj.permissions?.['commandes_livraison'];
          
          if (pLivraison) {
            setPermissions({
              lecture: pLivraison.lecture ?? true,
              creation: pLivraison.creation ?? true,
              modification: pLivraison.modification ?? true,
              suppression: pLivraison.suppression ?? false,
            });
          } else {
            const { data: roleData } = await supabase
              .from('roles')
              .select('*')
              .eq('id_entreprise', entrepriseId)
              .eq('module', moduleActuel)
              .eq('nom_role', nomRoleUser)
              .maybeSingle();

            const rolePerm = roleData?.permissions?.['livraisons'] || roleData?.permissions?.['commandes_livraison'];
            if (rolePerm) {
              setPermissions({
                lecture: rolePerm.lecture ?? true,
                creation: rolePerm.creation ?? true,
                modification: rolePerm.modification ?? true,
                suppression: rolePerm.suppression ?? false,
              });
            }
          }
        }
      }

      // 2. Tentative d'appel de la fonction RPC dédiée si configurée en base de données
      const { data: dataRpc, error: rpcError } = await supabase.rpc('recuperer_donnees_livraisons', {
        p_entreprise_id: entrepriseId,
        p_module: moduleActuel
      });

      if (rpcError) {
        // Fallback sécurisé par requête standard Supabase en cas d'absence de la fonction RPC
        const { data, error } = await supabase
          .from('commandes_livraison_en_tete')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .eq('module', moduleActuel)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setLivraisons(data || []);
      } else {
        setLivraisons(dataRpc || []);
      }
    } catch (err) {
      console.error('Erreur chargement livraisons :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerPermissionsEtLivraisons();
  }, [entrepriseId, moduleActuel, ongletActif]);

  // Application de la pagination mobile par blocs de 20 éléments
  const livraisonsAffichees = livraisons.slice(0, limiteLivraisons);

  return (
    <div className="space-y-3 font-sans text-xs pb-16">
      {/* EN-TÊTE DU MODULE LIVRAISON */}
      <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-slate-900 uppercase text-xs flex items-center gap-1.5">
            <span>🛵</span> ESPACE LIVRAISON & COURSES [{moduleActuel}] ({livraisonsAffichees.length} / {livraisons.length})
          </h3>
          {roleNom && (
            <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold border border-slate-200">
              Rôle : {roleNom}
            </span>
          )}
        </div>
        <span className="bg-orange-100 text-orange-900 px-2 py-0.5 rounded font-black text-[10px] border border-orange-200">
          MODULE ACTIF : {moduleActuel}
        </span>
      </div>

      {/* BARRE DE NAVIGATION INTERNE DU MODULE LIVRAISON */}
      <div className="flex flex-wrap gap-1 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <button
          type="button"
          onClick={() => setOngletActif('saisie')}
          className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase transition ${
            ongletActif === 'saisie'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          📦 Saisie Livraison
        </button>

        <button
          type="button"
          onClick={() => setOngletActif('livreur')}
          className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase transition ${
            ongletActif === 'livreur'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          🏍️ Espace Livreur
        </button>

        <button
          type="button"
          onClick={() => setOngletActif('partenaire')}
          className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase transition ${
            ongletActif === 'partenaire'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          🤝 Gestion Partenaire
        </button>

        <button
          type="button"
          onClick={() => setOngletActif('gestion_livreur')}
          className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase transition ${
            ongletActif === 'gestion_livreur'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          👥 Gestion Livreur
        </button>
      </div>

      {/* CONTENU AFFICHÉ SELON L'ONGLET SÉLECTIONNÉ */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        {ongletActif === 'saisie' && (
          <div className="space-y-2">
            <h4 className="font-black text-slate-800 uppercase text-xs border-b pb-1">📝 Saisie Livraison [{moduleActuel}]</h4>
            <p className="text-slate-500 text-[11px]">
              Interface de saisie et d'enregistrement des courses et colis pour le module {moduleActuel}.
              {!permissions.creation && <span className="block text-rose-600 font-bold mt-1">⛔ Mode consultation seule : Droits de création restreints.</span>}
            </p>
          </div>
        )}

        {ongletActif === 'livreur' && (
          <div className="space-y-2">
            <h4 className="font-black text-slate-800 uppercase text-xs border-b pb-1">🏍️ Espace Livreur [{moduleActuel}]</h4>
            <p className="text-slate-500 text-[11px]">Rattachement et gestion des livreurs associés au module {moduleActuel}.</p>
          </div>
        )}

        {ongletActif === 'partenaire' && (
          <div className="space-y-2">
            <h4 className="font-black text-slate-800 uppercase text-xs border-b pb-1">🤝 Gestion Partenaire [{moduleActuel}]</h4>
            <p className="text-slate-500 text-[11px]">Gestion des partenaires e-commerçants avec option de suivi de stockage (Oui/Non) pour {moduleActuel}.</p>
          </div>
        )}

        {ongletActif === 'gestion_livreur' && (
          <div className="space-y-2">
            <h4 className="font-black text-slate-800 uppercase text-xs border-b pb-1">👥 Gestion Livreur [{moduleActuel}]</h4>
            <p className="text-slate-500 text-[11px]">Suivi, annuaire et performances des livreurs sous le module {moduleActuel}.</p>
          </div>
        )}

        {/* SECTION DE PAGINATION MOBILE INTÉGRÉE */}
        {chargement ? (
          <div className="p-4 text-center text-slate-400 font-bold">Chargement des données...</div>
        ) : livraisons.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            {limiteLivraisons < livraisons.length && (
              <div className="text-center pt-1 pb-1">
                <button
                  type="button"
                  onClick={() => setLimiteLivraisons(prev => prev + 20)}
                  className="bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 font-extrabold px-3 py-1.5 rounded-xl text-[10px] transition shadow-xs border border-slate-300 w-full"
                >
                  📥 Charger 20 éléments de plus ({livraisons.length - limiteLivraisons} restants)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}