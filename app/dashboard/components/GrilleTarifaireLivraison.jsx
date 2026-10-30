'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GrilleTarifaireLivraison({ entrepriseId = '4TS-TEST' }) {
  const moduleActuel = 'LIVRAISON';
  const cleCacheLocal = `4ts_cache_grille_tarifaire_${entrepriseId}_${moduleActuel}`;

  // Initialisation immédiate depuis le cache local s'il existe pour un affichage instantané
  const [grilleTarifs, setGrilleTarifs] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const cacheBrut = localStorage.getItem(`4ts_cache_grille_tarifaire_${entrepriseId}_${moduleActuel}`);
        if (cacheBrut) {
          const cacheParse = JSON.parse(cacheBrut);
          if (Array.isArray(cacheParse)) return cacheParse;
        }
      } catch (e) {
        console.warn("Erreur lecture cache local initial :", e);
      }
    }
    return [];
  });

  const [chargement, setChargement] = useState(false);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);

  // --- RÈGLE 1 : PAGINATION / LIMITES D'AFFICHAGE MOBILES ---
  const [limiteTarifs, setLimiteTarifs] = useState(20);

  const [afficherForm, setAfficherForm] = useState(false);
  const [tarifEnEdition, setTarifEnEdition] = useState(null);

  const [nomZone, setNomZone] = useState('');
  const [fraisZone, setFraisZone] = useState('');

  // --- GESTION DES DROITS ET AUTORISATIONS ---
  const [roleNom, setRoleNom] = useState('');
  const [permissions, setPermissions] = useState({
    lecture: true,
    creation: true,
    modification: true,
    suppression: false,
  });

  // États pour le tri et la recherche
  const [colonneTri, setColonneTri] = useState('nom_zone');
  const [ordreCroissant, setOrdreCroissant] = useState(true);
  const [rechercheInput, setRechercheInput] = useState('');

  // Liste élargie multi-villes (Yaoundé, Douala, Bafoussam, etc.) combinée aux zones de l'entreprise
  const quartiersReference = [
    // Yaoundé
    'BASTOS', 'MENDONG', 'ODZA', 'OLEMBE', 'MELEN', 'BIYEM-ASSI', 'ETOUDI', 
    'FOUDA', 'NGOA EKELE', 'MADAGASCAR', 'NKOABANG', 'NGOA-EKELLE', 'MVOG-MBI',
    // Douala
    'AKWA', 'BONAMOUSSADI', 'DEIDO', 'MAKEPE', 'KOTTO', 'LOGPOM', 'NDOGBONG', 
    'BONAPRISO', 'AKWA-NORD', 'BALI', 'NYOM', 'BEedi', 'BONABERI',
    // Autres villes / Régions
    'BOTA', 'MIMBANG', 'COMMERCE', 'ROND-POINT'
  ];

  const toutesLesSuggestions = Array.from(
    new Set([...quartiersReference, ...grilleTarifs.map(t => t.nom_zone)])
  ).sort();

  // --- GESTION DU CACHE LOCAL (Suppression ancien cache & installation nouveau cache) ---
  const mettreAJourCacheLocal = (nouvelleListe) => {
    if (typeof window === 'undefined') return;
    try {
      // Nettoyage de tout ancien cache obsolète lié à cette entité/module si nécessaire
      const clesASupprimer = [];
      for (let i = 0; i < localStorage.length; i++) {
        const cle = localStorage.key(i);
        if (cle && cle.startsWith('4ts_cache_grille_tarifaire_') && cle !== cleCacheLocal) {
          clesASupprimer.push(cle);
        }
      }
      clesASupprimer.forEach(c => localStorage.removeItem(c));

      // Installation du nouveau cache local strict
      localStorage.setItem(cleCacheLocal, JSON.stringify(nouvelleListe));
    } catch (err) {
      console.warn("Erreur écriture cache local :", err);
    }
  };

  // --- RÈGLE 2 : CHARGEMENT STRICT AVEC FILTRAGE ET RPC / FALLBACK ---
  const chargerTarifsEtPermissions = async () => {
    // Si aucun cache n'était présent, on active l'indicateur de chargement
    if (grilleTarifs.length === 0) setChargement(true);

    try {
      // 1. Charger et analyser les permissions de l'employé connecté
      const utilisateurConnecteStr = localStorage.getItem('utilisateur_connecte');
      if (utilisateurConnecteStr) {
        const userObj = JSON.parse(utilisateurConnecteStr);
        const nomRoleUser = (userObj.nom_role || userObj.role || '').trim().toUpperCase();
        setRoleNom(nomRoleUser);

        if (nomRoleUser && nomRoleUser !== 'ADMINISTRATEUR' && nomRoleUser !== 'SUPER_ADMIN') {
          const permModule = userObj.permissions?.['grille_tarifaire'] || userObj.permissions?.['grille_tarifaire_livraison'] || userObj.permissions?.['tarifs'];
          
          if (permModule) {
            setPermissions({
              lecture: permModule.lecture ?? permModule.voir ?? true,
              creation: permModule.creation ?? permModule.creer ?? true,
              modification: permModule.modification ?? permModule.modifier ?? true,
              suppression: permModule.suppression ?? false,
            });
          } else {
            const { data: roleData } = await supabase
              .from('roles')
              .select('*')
              .eq('id_entreprise', entrepriseId)
              .eq('module', moduleActuel)
              .eq('nom_role', nomRoleUser)
              .maybeSingle();

            const rolePerm = roleData?.permissions?.['grille_tarifaire'] || roleData?.permissions?.['grille_tarifaire_livraison'] || roleData?.permissions?.['tarifs'];
            if (rolePerm) {
              setPermissions({
                lecture: rolePerm.lecture ?? rolePerm.voir ?? true,
                creation: rolePerm.creation ?? rolePerm.creer ?? true,
                modification: rolePerm.modification ?? rolePerm.modifier ?? true,
                suppression: rolePerm.suppression ?? false,
              });
            }
          }
        }
      }

      let listeTarifs = [];
      
      // Appel RPC sécurisé avec filtrage strict par entreprise et module
      const { data: tarifsRpc, error: rpcError } = await supabase.rpc('recuperer_grille_tarifaire_livraison', {
        p_entreprise_id: entrepriseId,
        p_module: moduleActuel
      });

      if (rpcError) {
        // Fallback direct sur la table avec filtrage strict par entreprise et module
        const { data, error } = await supabase
          .from('grille_tarifaire_livraison')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .eq('module', moduleActuel);

        if (error) throw error;
        listeTarifs = data || [];
      } else {
        listeTarifs = tarifsRpc || [];
      }

      // Mise à jour de l'état et du cache local instantané
      setGrilleTarifs(listeTarifs);
      mettreAJourCacheLocal(listeTarifs);
    } catch (err) {
      console.error('Erreur chargement grille tarifaire :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerTarifsEtPermissions();
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

  // Application de la pagination mobile par blocs de 20 éléments
  const tarifsAffiches = tarifsFiltresEtTries.slice(0, limiteTarifs);

  const ouvrirFormAjout = () => {
    if (enTrainDeSauvegarder) return;
    if (!permissions.creation) {
      alert('⛔ Action non autorisée : Vous n’avez pas le droit d’ajouter des zones tarifaires.');
      return;
    }
    setTarifEnEdition(null);
    setNomZone('');
    setFraisZone('');
    setAfficherForm(true);
  };

  const ouvrirFormEdition = (tarif) => {
    if (enTrainDeSauvegarder) return;
    if (!permissions.modification) {
      alert('⛔ Action non autorisée : Vous n’avez pas le droit de modifier les zones tarifaires.');
      return;
    }
    setTarifEnEdition(tarif);
    setNomZone(tarif.nom_zone || '');
    setFraisZone(tarif.frais !== undefined && tarif.frais !== null ? String(tarif.frais) : '');
    setAfficherForm(true);
  };

  const supprimerTarifActuel = async () => {
    if (enTrainDeSauvegarder || !tarifEnEdition) return;

    if (!permissions.suppression) {
      alert('⛔ Action non autorisée : Votre profil n’a pas le droit de supprimer des zones tarifaires.');
      return;
    }

    if (!confirm(`Voulez-vous vraiment supprimer la zone "${tarifEnEdition.nom_zone}" ?`)) return;

    setEnTrainDeSauvegarder(true);
    try {
      // Suppression avec filtrage strict par id, entreprise et module
      const { error } = await supabase
        .from('grille_tarifaire_livraison')
        .delete()
        .eq('id', tarifEnEdition.id)
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);

      if (error) throw error;

      // Mise à jour instantanée de l'interface (Optimistic UI)
      const nouvelleListe = grilleTarifs.filter(t => t.id !== tarifEnEdition.id);
      setGrilleTarifs(nouvelleListe);
      mettreAJourCacheLocal(nouvelleListe);

      alert('Zone supprimée avec succès.');
      setAfficherForm(false);
      setTarifEnEdition(null);
      await chargerTarifsEtPermissions();
    } catch (err) {
      alert('Erreur lors de la suppression : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const sauvegarderTarif = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;

    if (tarifEnEdition && !permissions.modification) {
      alert('⛔ Action non autorisée : Vous n’avez pas le droit de modifier les zones tarifaires.');
      return;
    }
    if (!tarifEnEdition && !permissions.creation) {
      alert('⛔ Action non autorisée : Vous n’avez pas le droit de créer des zones tarifaires.');
      return;
    }

    if (!nomZone.trim() || fraisZone === '') {
      alert('⚠️ Veuillez remplir le nom de la zone et le montant des frais.');
      return;
    }

    setEnTrainDeSauvegarder(true);
    try {
      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        nom_zone: nomZone.trim().toUpperCase(),
        frais: parseFloat(fraisZone) || 0
      };

      let nouvelleListe = [...grilleTarifs];

      if (tarifEnEdition) {
        const { error } = await supabase
          .from('grille_tarifaire_livraison')
          .update(payload)
          .eq('id', tarifEnEdition.id)
          .eq('id_entreprise', entrepriseId)
          .eq('module', moduleActuel);

        if (error) throw error;

        // Mise à jour instantanée locale
        nouvelleListe = nouvelleListe.map(t => t.id === tarifEnEdition.id ? { ...t, ...payload } : t);
        alert('Zone mise à jour avec succès !');
      } else {
        const { data, error } = await supabase
          .from('grille_tarifaire_livraison')
          .insert([payload])
          .select();

        if (error) throw error;

        // Insertion instantanée locale du nouvel élément créé
        if (data && data[0]) {
          nouvelleListe = [data[0], ...nouvelleListe];
        }
        alert('Nouvelle zone ajoutée avec succès !');
      }

      // Application immédiate dans l'état et le cache local pour un rendu instantané
      setGrilleTarifs(nouvelleListe);
      mettreAJourCacheLocal(nouvelleListe);

      setAfficherForm(false);
      setTarifEnEdition(null);
      setNomZone('');
      setFraisZone('');
      await chargerTarifsEtPermissions();
    } catch (err) {
      alert('Erreur : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  if (!permissions.lecture) {
    return (
      <div className="p-6 text-center bg-white rounded-xl border border-slate-200 text-rose-600 font-bold text-xs">
        ⛔ Vous n'avez pas l'autorisation d'afficher ce module.
      </div>
    );
  }

  return (
    <div className="space-y-3 text-[11px] font-sans">
      
      {/* Barre supérieure */}
      <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-slate-900 uppercase text-xs flex items-center gap-1.5">
            <span>🗺️</span> GRILLE TARIFAIRE DES LIVRAISONS ({tarifsAffiches.length} / {tarifsFiltresEtTries.length})
          </h3>
          {roleNom && (
            <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold border border-slate-200">
              Rôle : {roleNom}
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

      {/* FORMULAIRE DE CRÉATION / MODIFICATION */}
      {afficherForm && (permissions.creation || permissions.modification) && (
        <div className="bg-slate-900 border-2 border-orange-500 p-3 rounded-2xl space-y-3 shadow-xl">
          <form onSubmit={sauvegarderTarif} className="bg-white p-3 rounded-xl shadow-inner space-y-2.5">
            <div className="flex justify-between items-center border-b pb-1.5">
              <h4 className="font-extrabold text-slate-900 uppercase text-xs">
                {tarifEnEdition ? `Modifier la zone : ${tarifEnEdition.nom_zone}` : 'Nouvelle zone tarifaire'}
              </h4>
              {tarifEnEdition && permissions.suppression && (
                <button
                  type="button"
                  disabled={enTrainDeSauvegarder}
                  onClick={supprimerTarifActuel}
                  className="bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 font-bold px-2.5 py-1 rounded-lg text-[10px] transition"
                >
                  {enTrainDeSauvegarder ? 'Patientez...' : '🗑️ Supprimer cette zone'}
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
                  className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-xs shadow-xs uppercase"
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
                  onFocus={(e) => e.target.select()}
                  placeholder="0"
                  className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-xs shadow-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={() => setAfficherForm(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded-lg text-xs transition"
              >
                Annuler
              </button>
              {((tarifEnEdition && permissions.modification) || (!tarifEnEdition && permissions.creation)) && (
                <button
                  type="submit"
                  disabled={enTrainDeSauvegarder}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold px-4 py-1.5 rounded-lg text-xs transition shadow-md flex items-center gap-1"
                >
                  {enTrainDeSauvegarder ? 'Enregistrement...' : (tarifEnEdition ? 'Mettre à jour' : 'Enregistrer la zone')}
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ZONE DE RECHERCHE ET TABLEAU DES ZONES TARIFAIRES */}
      <div className="space-y-2">
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row justify-between items-center gap-2 text-[10px] font-black">
          <span>Zones enregistrées : <strong>{grilleTarifs.length}</strong></span>
          
          <div className="w-full sm:w-auto flex-1 max-w-[300px]">
            <input
              type="text"
              disabled={enTrainDeSauvegarder}
              value={rechercheInput}
              onChange={(e) => setRechercheInput(e.target.value)}
              placeholder="🔍 Rechercher une zone / quartier..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-[11px] font-extrabold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-xs"
            />
          </div>
        </div>

        {chargement && grilleTarifs.length === 0 ? (
          <div className="p-4 text-center text-slate-500 font-bold">Chargement des tarifs...</div>
        ) : tarifsAffiches.length === 0 ? (
          <div className="p-6 text-center text-slate-500 bg-white border border-slate-200 rounded-xl font-bold">
            Aucune zone tarifaire trouvée.
          </div>
        ) : (
          <div className="space-y-2">
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 uppercase text-[10px] font-black">
                    <th 
                      onClick={() => !enTrainDeSauvegarder && gererTri('nom_zone')}
                      className="p-3 cursor-pointer hover:bg-slate-200 transition select-none"
                    >
                      📍 Zone / Quartier {colonneTri === 'nom_zone' ? (ordreCroissant ? '▲' : '▼') : ''}
                    </th>
                    <th 
                      onClick={() => !enTrainDeSauvegarder && gererTri('frais')}
                      className="p-3 cursor-pointer hover:bg-slate-200 transition select-none text-right"
                    >
                      💰 Frais de Livraison (CFA) {colonneTri === 'frais' ? (ordreCroissant ? '▲' : '▼') : ''}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tarifsAffiches.map((tarif) => (
                    <tr 
                      key={tarif.id || tarif.nom_zone} 
                      onClick={() => !enTrainDeSauvegarder && permissions.modification && ouvrirFormEdition(tarif)}
                      className="hover:bg-orange-50/60 cursor-pointer transition"
                      title="Cliquez pour modifier ou supprimer cette zone"
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
              <div className="text-center pt-2 pb-2">
                <button
                  type="button"
                  disabled={enTrainDeSauvegarder}
                  onClick={() => setLimiteTarifs(prev => prev + 20)}
                  className="bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 font-extrabold px-4 py-2 rounded-xl text-xs transition shadow-xs border border-slate-300 w-full"
                >
                  📥 Charger 20 zones de plus ({tarifsFiltresEtTries.length - limiteTarifs} restants)
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}