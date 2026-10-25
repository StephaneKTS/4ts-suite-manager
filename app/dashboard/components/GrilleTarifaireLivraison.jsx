'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GrilleTarifaireLivraison({ entrepriseId = '4TS-TEST' }) {
  const [grilleTarifs, setGrilleTarifs] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);

  const [afficherForm, setAfficherForm] = useState(false);
  const [tarifEnEdition, setTarifEnEdition] = useState(null);

  const [nomZone, setNomZone] = useState('');
  const [fraisZone, setFraisZone] = useState('');

  // États pour le tri et la recherche
  const [colonneTri, setColonneTri] = useState('nom_zone');
  const [ordreCroissant, setOrdreCroissant] = useState(true);
  const [rechercheInput, setRechercheInput] = useState('');

  const moduleActuel = 'LIVRAISON';

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

  const chargerTarifs = async () => {
    setChargement(true);
    try {
      const { data, error } = await supabase
        .from('grille_tarifaire_livraison')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);

      if (error) throw error;
      setGrilleTarifs(data || []);
    } catch (err) {
      console.error('Erreur chargement grille tarifaire :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerTarifs();
  }, [entrepriseId]);

  const gererTri = (colonne) => {
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

  const ouvrirFormAjout = () => {
    setTarifEnEdition(null);
    setNomZone('');
    setFraisZone('');
    setAfficherForm(true);
  };

  const ouvrirFormEdition = (tarif) => {
    setTarifEnEdition(tarif);
    setNomZone(tarif.nom_zone || '');
    setFraisZone(tarif.frais !== undefined && tarif.frais !== null ? String(tarif.frais) : '');
    setAfficherForm(true);
  };

  const supprimerTarifActuel = async () => {
    if (!tarifEnEdition) return;
    if (!confirm(`Voulez-vous vraiment supprimer la zone "${tarifEnEdition.nom_zone}" ?`)) return;

    try {
      const { error } = await supabase
        .from('grille_tarifaire_livraison')
        .delete()
        .eq('id', tarifEnEdition.id);

      if (error) throw error;

      alert('Zone supprimée avec succès.');
      setAfficherForm(false);
      setTarifEnEdition(null);
      chargerTarifs();
    } catch (err) {
      alert('Erreur lors de la suppression : ' + err.message);
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
        id_entreprise: entrepriseId,
        module: moduleActuel,
        nom_zone: nomZone.trim().toUpperCase(),
        frais: parseFloat(fraisZone) || 0
      };

      if (tarifEnEdition) {
        const { error } = await supabase
          .from('grille_tarifaire_livraison')
          .update(payload)
          .eq('id', tarifEnEdition.id);

        if (error) throw error;
        alert('Zone mise à jour avec succès !');
      } else {
        const { error } = await supabase
          .from('grille_tarifaire_livraison')
          .insert([payload]);

        if (error) throw error;
        alert('Nouvelle zone ajoutée avec succès !');
      }

      setAfficherForm(false);
      setTarifEnEdition(null);
      setNomZone('');
      setFraisZone('');
      await chargerTarifs();
    } catch (err) {
      alert('Erreur : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  return (
    <div className="space-y-3 text-[11px] font-sans">
      
      {/* Barre supérieure */}
      <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="font-extrabold text-slate-900 uppercase text-xs flex items-center gap-1.5">
          <span>🗺️</span> GRILLE TARIFAIRE DES LIVRAISONS
        </h3>

        <button
          type="button"
          onClick={ouvrirFormAjout}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-2xs text-xs"
        >
          + Ajouter une Zone
        </button>
      </div>

      {/* FORMULAIRE DE CRÉATION / MODIFICATION */}
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
                  onClick={supprimerTarifActuel}
                  className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2.5 py-1 rounded-lg text-[10px] transition"
                >
                  🗑️ Supprimer cette zone
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Nom de la zone *</label>
                <input
                  type="text"
                  required
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
              <button
                type="submit"
                disabled={enTrainDeSauvegarder}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold px-4 py-1.5 rounded-lg text-xs transition shadow-md flex items-center gap-1"
              >
                {enTrainDeSauvegarder ? 'Enregistrement...' : (tarifEnEdition ? 'Mettre à jour' : 'Enregistrer la zone')}
              </button>
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
              value={rechercheInput}
              onChange={(e) => setRechercheInput(e.target.value)}
              placeholder="🔍 Rechercher une zone / quartier..."
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-[11px] font-extrabold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-xs"
            />
          </div>
        </div>

        {chargement ? (
          <div className="p-4 text-center text-slate-500 font-bold">Chargement des tarifs...</div>
        ) : tarifsFiltresEtTries.length === 0 ? (
          <div className="p-6 text-center text-slate-500 bg-white border border-slate-200 rounded-xl font-bold">
            Aucune zone tarifaire trouvée.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 uppercase text-[10px] font-black">
                  <th 
                    onClick={() => gererTri('nom_zone')}
                    className="p-3 cursor-pointer hover:bg-slate-200 transition select-none"
                  >
                    📍 Zone / Quartier {colonneTri === 'nom_zone' ? (ordreCroissant ? '▲' : '▼') : ''}
                  </th>
                  <th 
                    onClick={() => gererTri('frais')}
                    className="p-3 cursor-pointer hover:bg-slate-200 transition select-none text-right"
                  >
                    💰 Frais de Livraison (CFA) {colonneTri === 'frais' ? (ordreCroissant ? '▲' : '▼') : ''}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tarifsFiltresEtTries.map((tarif) => (
                  <tr 
                    key={tarif.id} 
                    onClick={() => ouvrirFormEdition(tarif)}
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
        )}
      </div>

    </div>
  );
}