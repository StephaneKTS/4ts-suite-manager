'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import GestionVentesHistoriques from './GestionVentesHistoriques';
import GestionJournalCaisse from './GestionJournalCaisse';

export default function GestionRapports({ entrepriseId = '4TS-TEST' }) {
  const [vueActive, setVueActive] = useState('ventes'); // 'ventes' ou ID de la sous-table de saisie comptable
  const [tiroirTresorerieOuvert, setTiroirTresorerieOuvert] = useState(false);
  
  const [rapports, setRapports] = useState([]);
  const [chargement, setChargement] = useState(false);
  
  // --- GESTION DES DROITS ET AUTORISATIONS ---
  const [roleNom, setRoleNom] = useState('');
  const [permissions, setPermissions] = useState({
    lecture: true,
    creation: true,
    modification: true,
    suppression: false,
  });

  // --- RÈGLE 3 : DÉSACTIVATION TEMPORAIRE (ÉVITER LES DOUBLONS) ---
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);

  // --- RÈGLE 1 : PAGINATION / LIMITES D'AFFICHAGE MOBILES ---
  const [limiteRapports, setLimiteRapports] = useState(20);

  // --- FILTRE INTELLIGENT : MOIS EN COURS PAR DÉFAUT ---
  const obtenirPremierJourDuMois = () => {
    const d = new Date();
    const annee = d.getFullYear();
    const mois = String(d.getMonth() + 1).padStart(2, '0');
    return `${annee}-${mois}-01`;
  };

  const obtenirDernierJourDuMois = () => {
    const d = new Date();
    const annee = d.getFullYear();
    const mois = d.getMonth() + 1;
    const dernierJour = new Date(annee, mois, 0).getDate();
    return `${annee}-${String(mois).padStart(2, '0')}-${String(dernierJour).padStart(2, '0')}`;
  };

  const premierJourMoisStr = obtenirPremierJourDuMois();
  const dernierJourMoisStr = obtenirDernierJourDuMois();

  const [filtreDateDebut, setFiltreDateDebut] = useState(premierJourMoisStr);
  const [filtreDateFin, setFiltreDateFin] = useState(dernierJourMoisStr);

  // Récupération dynamique et robuste du module actif (Boutique, Livraison, Logistique, Tontine, etc.)
  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();

  // --- RÈGLE 2 : FONCTION RPC SUPABASE ---
  // Chargement des permissions et des données via une fonction RPC PostgreSQL avec fallback sécurisé
  const chargerPermissionsEtRapports = async () => {
    setChargement(true);
    try {
      // 1. Charger et analyser les permissions de l'employé connecté
      const utilisateurConnecteStr = localStorage.getItem('utilisateur_connecte');
      if (utilisateurConnecteStr) {
        const userObj = JSON.parse(utilisateurConnecteStr);
        const nomRoleUser = (userObj.nom_role || userObj.role || '').trim().toUpperCase();
        setRoleNom(nomRoleUser);

        if (nomRoleUser && nomRoleUser !== 'ADMINISTRATEUR' && nomRoleUser !== 'SUPER_ADMIN') {
          const pRapport = userObj.permissions?.['rapports'] || userObj.permissions?.['comptabilite'] || userObj.permissions?.['caisse'];
          
          if (pRapport) {
            setPermissions({
              lecture: pRapport.lecture ?? true,
              creation: pRapport.creation ?? true,
              modification: pRapport.modification ?? true,
              suppression: pRapport.suppression ?? false,
            });
          } else {
            const { data: roleData } = await supabase
              .from('roles')
              .select('*')
              .eq('id_entreprise', entrepriseId)
              .eq('module', moduleActuel)
              .eq('nom_role', nomRoleUser)
              .maybeSingle();

            const rolePerm = roleData?.permissions?.['rapports'] || roleData?.permissions?.['comptabilite'] || roleData?.permissions?.['caisse'];
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

      // 2. Charger les données comptables et de rapports
      const { data: dataRpc, error: rpcError } = await supabase.rpc('recuperer_rapports_comptables', {
        p_entreprise_id: entrepriseId,
        p_module: moduleActuel
      });

      if (rpcError) {
        const { data, error } = await supabase
          .from('journal_caisse')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .eq('module', moduleActuel)
          .gte('created_at', `${filtreDateDebut}T00:00:00`)
          .lte('created_at', `${filtreDateFin}T23:59:59`)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setRapports(data || []);
      } else {
        setRapports(dataRpc || []);
      }
    } catch (err) {
      console.error('Erreur chargement rapports :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerPermissionsEtRapports();
  }, [entrepriseId, moduleActuel, filtreDateDebut, filtreDateFin]);

  // Sous-tables du bloc Saisie Comptable (Grand livre et Journal regroupés sous Saisie des Opérations)
  const tablesTresorerie = [
    {
      id: 'saisie_operations',
      nom: '📝 Saisie des Opérations & Journal',
      icon: '✍️',
      desc: 'Entrées, dépenses, grand livre et journal de caisse',
    },
  ];

  // Application de la pagination mobile
  const rapportsAffiches = rapports.slice(0, limiteRapports);

  return (
    <div className="space-y-5">
      {/* Grille des 2 grands blocs de rapports */}
      {vueActive === 'ventes' && !tiroirTresorerieOuvert && (
        <div className="space-y-4">
          <div className="flex justify-center items-center gap-2">
            <div className="text-center font-black text-xs text-orange-600 uppercase">
              RAPPORTS & COMPTABILITÉ — [{moduleActuel}] ({rapportsAffiches.length} / {rapports.length})
            </div>
            {roleNom && (
              <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold border border-slate-200">
                Rôle : {roleNom}
              </span>
            )}
          </div>

          {/* FILTRE DE PÉRIODE GLOBAL POUR LES RAPPORTS */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs max-w-xl mx-auto space-y-2">
            <div className="flex justify-between items-center border-b border-slate-100 pb-1">
              <span className="font-extrabold text-slate-700 text-[10px] uppercase">📅 Période d'analyse (Mois en cours par défaut)</span>
              {(filtreDateDebut !== premierJourMoisStr || filtreDateFin !== dernierJourMoisStr) && (
                <button
                  type="button"
                  disabled={enTrainDeSauvegarder}
                  onClick={() => {
                    setFiltreDateDebut(premierJourMoisStr);
                    setFiltreDateFin(dernierJourMoisStr);
                  }}
                  className="text-orange-600 hover:underline font-bold text-[9px]"
                >
                  Réinitialiser
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[8px] font-bold text-slate-500 uppercase mb-0.5">Date Début</label>
                <input
                  type="date"
                  disabled={enTrainDeSauvegarder}
                  value={filtreDateDebut}
                  onChange={(e) => setFiltreDateDebut(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-bold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[8px] font-bold text-slate-500 uppercase mb-0.5">Date Fin</label>
                <input
                  type="date"
                  disabled={enTrainDeSauvegarder}
                  value={filtreDateFin}
                  onChange={(e) => setFiltreDateFin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto pt-2">
            
            {/* Bloc 1 : Journal des Ventes */}
            <button
              type="button"
              disabled={enTrainDeSauvegarder}
              onClick={() => setVueActive('ventes_detail')}
              className="bg-white hover:bg-slate-50 border border-slate-200 p-6 rounded-3xl flex flex-col items-center text-center gap-3 shadow-sm hover:shadow-md transition duration-200 disabled:opacity-50"
            >
              <span className="text-4xl p-3 bg-emerald-50 text-emerald-700 rounded-2xl">📊</span>
              <div>
                <span className="font-extrabold text-sm text-slate-900 block">Journal des Ventes [{moduleActuel}]</span>
                <span className="text-[11px] text-slate-600 font-bold mt-1 block leading-snug">
                  Consultation des tickets émis, filtres par période, dépôt et vendeur.
                </span>
              </div>
            </button>

            {/* Bloc 2 : Saisie Comptable (Ouvre directement la saisie des opérations avec onglets Grand Livre & Journal intégrés) */}
            <button
              type="button"
              disabled={enTrainDeSauvegarder}
              onClick={() => {
                if (!permissions.creation && !permissions.modification) {
                  alert('⛔ Accès restreint : Votre profil ne dispose pas des droits de saisie comptable.');
                  return;
                }
                setVueActive('saisie_operations');
              }}
              className="bg-white hover:bg-slate-50 border border-slate-200 p-6 rounded-3xl flex flex-col items-center text-center gap-3 shadow-sm hover:shadow-md transition duration-200 disabled:opacity-50"
            >
              <span className="text-4xl p-3 bg-orange-50 text-orange-600 rounded-2xl">💵</span>
              <div>
                <span className="font-extrabold text-sm text-slate-900 block">Saisie Comptable [{moduleActuel}]</span>
                <span className="text-[11px] text-slate-600 font-bold mt-1 block leading-snug">
                  Saisie des opérations, grand livre et journal de caisse unifiés.
                </span>
              </div>
            </button>

          </div>

          {chargement ? (
            <div className="p-4 text-center text-slate-400 font-bold">Chargement des données...</div>
          ) : rapports.length > 0 && (
            <div className="pt-2 text-center">
              {limiteRapports < rapports.length && (
                <button
                  type="button"
                  disabled={enTrainDeSauvegarder}
                  onClick={() => setLimiteRapports(prev => prev + 20)}
                  className="bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 font-extrabold px-4 py-2 rounded-xl text-[10px] transition shadow-xs border border-slate-300 w-full max-w-sm mx-auto block"
                >
                  📥 Charger 20 rapports de plus ({rapports.length - limiteRapports} restants)
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Affichage du Journal des Ventes détaillé */}
      {vueActive === 'ventes_detail' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <button
              type="button"
              disabled={enTrainDeSauvegarder}
              onClick={() => setVueActive('ventes')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1 disabled:opacity-50"
            >
              ⬅️ Retour aux blocs de rapports
            </button>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
              ● Journal des Ventes Actif [{moduleActuel}]
            </span>
          </div>
          <GestionVentesHistoriques entrepriseId={entrepriseId} />
        </div>
      )}

      {/* Affichage des modules de Saisie Comptable (avec grand livre et journal intégrés par onglets) */}
      {vueActive === 'saisie_operations' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <button
              type="button"
              disabled={enTrainDeSauvegarder}
              onClick={() => setVueActive('ventes')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1 disabled:opacity-50"
            >
              ⬅️ Retour aux blocs de rapports
            </button>
            <span className="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-full border border-orange-200">
              ● Module Saisie Comptable Actif [{moduleActuel}]
            </span>
          </div>
          <GestionJournalCaisse entrepriseId={entrepriseId} vueInitiale={vueActive} />
        </div>
      )}
    </div>
  );
}