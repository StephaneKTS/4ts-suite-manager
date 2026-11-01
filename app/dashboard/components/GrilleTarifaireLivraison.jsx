'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GrilleTarifaireLivraison({ entrepriseId = '4TS-TEST' }) {
  const moduleActuel = 'LIVRAISON';
  const cleCacheLocal = `4ts_cache_grille_tarifaire_${entrepriseId}_${moduleActuel}`;
  const cleFileAttente = `4ts_sync_queue_grille_${entrepriseId}_${moduleActuel}`;

  // 1. CHARGEMENT INSTANTANÉ DEPUIS LE CACHE LOCAL (Priorité absolue)
  const [grilleTarifs, setGrilleTarifs] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cacheBrut = localStorage.getItem(cleCacheLocal);
        if (cacheBrut) {
          const cacheParse = JSON.parse(cacheBrut);
          if (Array.isArray(cacheParse) && cacheParse.length > 0) return cacheParse;
        }
      } catch (e) {
        console.warn("Erreur lecture cache local initial :", e);
      }
    }
    return [];
  });

  const [chargement, setChargement] = useState(false);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);
  const [modeHorsLigne, setModeHorsLigne] = useState(false);
  const [elementsEnAttente, setElementsEnAttente] = useState(0);

  const [limiteTarifs, setLimiteTarifs] = useState(20);
  const [afficherForm, setAfficherForm] = useState(false);
  const [tarifEnEdition, setTarifEnEdition] = useState(null);

  const [nomZone, setNomZone] = useState('');
  const [fraisZone, setFraisZone] = useState('');

  const [roleNom, setRoleNom] = useState('');
  const [permissions, setPermissions] = useState({
    lecture: true,
    creation: true,
    modification: true,
    suppression: false,
  });

  const [colonneTri, setColonneTri] = useState('nom_zone');
  const [ordreCroissant, setOrdreCroissant] = useState(true);
  const [rechercheInput, setRechercheInput] = useState('');

  const quartiersReference = [
    'BASTOS', 'MENDONG', 'ODZA', 'OLEMBE', 'MELEN', 'BIYEM-ASSI', 'ETOUDI', 
    'FOUDA', 'NGOA EKELE', 'MADAGASCAR', 'NKOABANG', 'NGOA-EKELLE', 'MVOG-MBI',
    'AKWA', 'BONAMOUSSADI', 'DEIDO', 'MAKEPE', 'KOTTO', 'LOGPOM', 'NDOGBONG', 
    'BONAPRISO', 'AKWA-NORD', 'BALI', 'NYOM', 'BEedi', 'BONABERI',
    'BOTA', 'MIMBANG', 'COMMERCE', 'ROND-POINT'
  ];

  const toutesLesSuggestions = Array.from(
    new Set([...quartiersReference, ...grilleTarifs.map(t => t.nom_zone)])
  ).sort();

  const mettreAJourCacheLocal = (nouvelleListe) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(cleCacheLocal, JSON.stringify(nouvelleListe));
    } catch (err) {
      console.warn("Erreur écriture cache local :", err);
    }
  };

  // --- TRAITEMENT DE LA FILE D'ATTENTE DE SYNCHRONISATION ---
  const verifierEtTraiterFileAttente = async () => {
    if (typeof window === 'undefined') return;
    try {
      const queueBrut = localStorage.getItem(cleFileAttente);
      if (!queueBrut) {
        setElementsEnAttente(0);
        return;
      }

      const queue = JSON.parse(queueBrut);
      if (!Array.isArray(queue) || queue.length === 0) {
        setElementsEnAttente(0);
        return;
      }

      setElementsEnAttente(queue.length);

      const resteAync = [];
      for (const action of queue) {
        try {
          const payload = {
            id_entreprise: entrepriseId,
            module: moduleActuel,
            nom_zone: action.data.nom_zone,
            frais: action.data.frais
          };

          let error = null;

          if (action.type === 'INSERT') {
            const res = await supabase
              .from('grille_tarifaire_livraison')
              .insert([payload]);
            error = res.error;
          } else if (action.type === 'UPDATE') {
            if (action.data.id && String(action.data.id).startsWith('local_')) {
              const res = await supabase
                .from('grille_tarifaire_livraison')
                .insert([payload]);
              error = res.error;
            } else if (action.data.id) {
              const res = await supabase
                .from('grille_tarifaire_livraison')
                .update(payload)
                .eq('id', action.data.id)
                .eq('id_entreprise', entrepriseId);
              error = res.error;
            }
          } else if (action.type === 'DELETE') {
            if (action.data.id && !String(action.data.id).startsWith('local_')) {
              const res = await supabase
                .from('grille_tarifaire_livraison')
                .delete()
                .eq('id', action.data.id)
                .eq('id_entreprise', entrepriseId);
              error = res.error;
            }
          }

          if (error) throw error;
        } catch (syncErr) {
          console.warn("Échec synchro de l'action, conservée dans la file :", syncErr.message);
          resteAync.push(action);
        }
      }

      localStorage.setItem(cleFileAttente, JSON.stringify(resteAync));
      setElementsEnAttente(resteAync.length);

      if (resteAync.length < queue.length) {
        await chargerTarifsEtPermissions();
      }
    } catch (e) {
      console.error("Erreur traitement file d'attente :", e);
    }
  };

  // 2. CHARGEMENT ET SYNCHRONISATION EN ARRIÈRE-PLAN
  const chargerTarifsEtPermissions = async () => {
    if (grilleTarifs.length === 0) setChargement(true);

    try {
      const utilisateurConnecteStr = localStorage.getItem('utilisateur_connecte');
      if (utilisateurConnecteStr) {
        const userObj = JSON.parse(utilisateurConnecteStr);
        setRoleNom((userObj.nom_role || userObj.role || '').trim().toUpperCase());
      }

      // Tenter de vider la file d'attente avant de charger
      await verifierEtTraiterFileAttente();

      let listeTarifs = [];
      const appelSupabase = async () => {
        const { data: tarifsRpc, error: rpcError } = await supabase.rpc('recuperer_grille_tarifaire_livraison', {
          p_entreprise_id: entrepriseId,
          p_module: moduleActuel
        });

        if (rpcError) {
          const { data, error } = await supabase
            .from('grille_tarifaire_livraison')
            .select('*')
            .eq('id_entreprise', entrepriseId)
            .eq('module', moduleActuel);

          if (error) throw error;
          return data || [];
        }
        return tarifsRpc || [];
      };

      listeTarifs = await appelSupabase();

      setModeHorsLigne(false);
      setGrilleTarifs(listeTarifs);
      mettreAJourCacheLocal(listeTarifs);

    } catch (err) {
      console.warn('⚠️ Mode hors-ligne actif :', err.message);
      setModeHorsLigne(true);

      if (grilleTarifs.length === 0 && typeof window !== 'undefined') {
        const cacheSecours = localStorage.getItem(cleCacheLocal);
        if (cacheSecours) {
          try { setGrilleTarifs(JSON.parse(cacheSecours)); } catch (e) {}
        }
      }
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerTarifsEtPermissions();

    const gererConnexion = () => {
      verifierEtTraiterFileAttente();
    };

    window.addEventListener('online', gererConnexion);
    return () => {
      window.removeEventListener('online', gererConnexion);
    };
  }, [entrepriseId]);

  const gererTri = (colonne) => {
    if (enTrainDeSauvegarder) return;
    if (colonneTri === colonne) {
      setOrdreCroissant(!ordreCroissant);
    } else {
      setColonneTri(colonne);
      setOrdreCroissant(true);
    }
  };

  const tarifsFiltresEtTries = grilleTarifs
    .filter((tarif) => 
      (tarif.nom_zone || '').toUpperCase().includes(rechercheInput.toUpperCase())
    )
    .sort((a, b) => {
      let valeurA = a[colonneTri];
      let valeurB = b[colonneTri];

      if (typeof valeurA === 'string') {
        valeurA = valeurA.toUpperCase();
        valeurB = valeurB.toUpperCase();
        if (valeurA < valeurB) return ordreCroissant ? -1 : 1;
        if (valeurA > valeurB) return ordreCroissant ? 1 : -1;
        return 0;
      } else {
        return ordreCroissant ? valeurA - valeurB : valeurB - valeurA;
      }
    });

  const tarifsAffiches = tarifsFiltresEtTries.slice(0, limiteTarifs);

  const ouvrirFormAjout = () => {
    if (enTrainDeSauvegarder) return;
    setTarifEnEdition(null);
    setNomZone('');
    setFraisZone('');
    setAfficherForm(true);
  };

  const ouvrirFormEdition = (tarif) => {
    if (enTrainDeSauvegarder) return;
    setTarifEnEdition(tarif);
    setNomZone(tarif.nom_zone || '');
    setFraisZone(tarif.frais !== undefined && tarif.frais !== null ? String(tarif.frais) : '');
    setAfficherForm(true);
  };

  const supprimerTarifActuel = async () => {
    if (enTrainDeSauvegarder || !tarifEnEdition) return;
    if (!confirm(`Voulez-vous vraiment supprimer la zone "${tarifEnEdition.nom_zone}" ?`)) return;

    setEnTrainDeSauvegarder(true);
    try {
      const nouvelleListe = grilleTarifs.filter(t => t.id !== tarifEnEdition.id);
      setGrilleTarifs(nouvelleListe);
      mettreAJourCacheLocal(nouvelleListe);

      const queue = JSON.parse(localStorage.getItem(cleFileAttente) || '[]');
      queue.push({ type: 'DELETE', data: tarifEnEdition });
      localStorage.setItem(cleFileAttente, JSON.stringify(queue));

      await verifierEtTraiterFileAttente();

      alert('Zone supprimée avec succès.');
      setAfficherForm(false);
      setTarifEnEdition(null);
    } catch (err) {
      alert('Zone supprimée en local (en attente de synchronisation).');
      setAfficherForm(false);
      setTarifEnEdition(null);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const sauvegarderTarif = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;

    if (!nomZone.trim() || fraisZone === '') {
      alert('⚠️ Veuillez remplir le nom de la zone et le montant des frais.');
      return;
    }

    setEnTrainDeSauvegarder(true);
    try {
      const payload = {
        id: tarifEnEdition ? tarifEnEdition.id : 'local_' + Date.now(),
        id_entreprise: entrepriseId,
        module: moduleActuel,
        nom_zone: nomZone.trim().toUpperCase(),
        frais: parseFloat(fraisZone) || 0
      };

      let nouvelleListe = [...grilleTarifs];
      if (tarifEnEdition) {
        nouvelleListe = nouvelleListe.map(t => t.id === tarifEnEdition.id ? { ...t, ...payload } : t);
      } else {
        nouvelleListe = [payload, ...nouvelleListe];
      }

      setGrilleTarifs(nouvelleListe);
      mettreAJourCacheLocal(nouvelleListe);

      // Ajout dans la file d'attente pour synchronisation ultérieure ou immédiate
      const queue = JSON.parse(localStorage.getItem(cleFileAttente) || '[]');
      queue.push({ type: tarifEnEdition ? 'UPDATE' : 'INSERT', data: payload });
      localStorage.setItem(cleFileAttente, JSON.stringify(queue));

      setAfficherForm(false);
      setTarifEnEdition(null);
      setNomZone('');
      setFraisZone('');
      alert('✅ Enregistré avec succès !');

      // Tenter de synchroniser immédiatement si le réseau est présent
      await verifierEtTraiterFileAttente();
    } catch (err) {
      console.warn("Enregistré en local (en attente de réseau) :", err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  return (
    <div className="space-y-3 text-[11px] font-sans">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-extrabold text-slate-900 uppercase text-xs flex items-center gap-1.5">
            <span>🗺️</span> GRILLE TARIFAIRE ({tarifsAffiches.length} / {tarifsFiltresEtTries.length})
          </h3>
          {roleNom && (
            <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold border border-slate-200">
              Rôle : {roleNom}
            </span>
          )}
          {modeHorsLigne && (
            <span className="text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold border border-amber-300 animate-pulse">
              ⚠️ Mode Hors-Ligne
            </span>
          )}
          {elementsEnAttente > 0 && (
            <span className="text-[9px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full font-bold border border-orange-300">
              🔄 {elementsEnAttente} en attente de synchro
            </span>
          )}
        </div>

        {permissions.creation && (
          <button
            type="button"
            disabled={enTrainDeSauvegarder}
            onClick={ouvrirFormAjout}
            className="bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-2xs text-xs"
          >
            + Ajouter une Zone
          </button>
        )}
      </div>

      {afficherForm && (
        <div className="bg-slate-900 border-2 border-orange-500 p-3 rounded-2xl space-y-3 shadow-xl">
          <form onSubmit={sauvegarderTarif} className="bg-white p-3 rounded-xl shadow-inner space-y-2.5">
            <div className="flex justify-between items-center border-b pb-1.5">
              <h4 className="font-extrabold text-slate-900 uppercase text-xs">
                {tarifEnEdition ? `Modifier la zone : ${tarifEnEdition.nom_zone}` : 'Nouvelle zone tarifaire'}
              </h4>
              {tarifEnEdition && (
                <button
                  type="button"
                  disabled={enTrainDeSauvegarder}
                  onClick={supprimerTarifActuel}
                  className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2.5 py-1 rounded-lg text-[10px] transition"
                >
                  🗑️ Supprimer
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Nom de la zone *</label>
                <input
                  type="text"
                  required
                  disabled={enTrainDeSauvegarder}
                  list="liste-quartiers-global"
                  value={nomZone}
                  onChange={(e) => setNomZone(e.target.value)}
                  placeholder="Tapez ou saisissez un quartier..."
                  className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-xs uppercase"
                />
                <datalist id="liste-quartiers-global">
                  {toutesLesSuggestions.map((quartier, index) => (
                    <option key={index} value={quartier} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Frais de Livraison (FCFA) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  disabled={enTrainDeSauvegarder}
                  value={fraisZone}
                  onChange={(e) => setFraisZone(e.target.value)}
                  placeholder="0"
                  className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAfficherForm(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={enTrainDeSauvegarder}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-1.5 rounded-lg text-xs"
              >
                {enTrainDeSauvegarder ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-2">
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex justify-between items-center gap-2 text-[10px] font-black">
          <span>Zones enregistrées : <strong>{grilleTarifs.length}</strong></span>
          <div className="w-full sm:w-auto flex-1 max-w-[300px]">
            <input
              type="text"
              value={rechercheInput}
              onChange={(e) => setRechercheInput(e.target.value)}
              placeholder="🔍 Rechercher une zone / quartier..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-[11px] font-extrabold uppercase text-slate-900"
            />
          </div>
        </div>

        {chargement && grilleTarifs.length === 0 ? (
          <div className="p-4 text-center text-slate-500 font-bold">Chargement...</div>
        ) : tarifsAffiches.length === 0 ? (
          <div className="p-6 text-center text-slate-500 bg-white border border-slate-200 rounded-xl font-bold">
            Aucune zone tarifaire trouvée.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 uppercase text-[10px] font-black">
                    <th onClick={() => gererTri('nom_zone')} className="p-3 cursor-pointer">
                      📍 Zone / Quartier {colonneTri === 'nom_zone' ? (ordreCroissant ? '▲' : '▼') : ''}
                    </th>
                    <th onClick={() => gererTri('frais')} className="p-3 cursor-pointer text-right">
                      💰 Frais (CFA) {colonneTri === 'frais' ? (ordreCroissant ? '▲' : '▼') : ''}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tarifsAffiches.map((tarif) => (
                    <tr 
                      key={tarif.id || tarif.nom_zone} 
                      onClick={() => ouvrirFormEdition(tarif)}
                      className="hover:bg-orange-50/60 cursor-pointer transition"
                    >
                      <td className="p-3 font-extrabold uppercase text-slate-900">
                        {tarif.nom_zone}
                      </td>
                      <td className="p-3 font-mono font-black text-emerald-700 text-right text-xs">
                        {Number(tarif.frais || 0).toLocaleString('fr-FR')} F
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {limiteTarifs < tarifsFiltresEtTries.length && (
              <button
                type="button"
                onClick={() => setLimiteTarifs(prev => prev + 20)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold px-4 py-2 rounded-xl text-xs w-full"
              >
                📥 Charger 20 zones de plus
              </button>
            )}
          </div>
        )}
      </div>

    </div>
  );
}