'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtdqodqhkdxanrelxtrq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; 
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GestionDepots({ entrepriseId = '4TS-TEST' }) {
  const [depots, setDepots] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [afficherFormDepot, setAfficherFormDepot] = useState(false);
  const [depotEnEdition, setDepotEnEdition] = useState(null);

  // Dépôt ouvert et ses emplacements stockés en base
  const [depotOuvertId, setDepotOuvertId] = useState(null);
  const [emplacementsParDepot, setEmplacementsParDepot] = useState({});

  // Formulaire Dépôt
  const [nouveauDepot, setNouveauDepot] = useState({
    nom_depot: '',
    adresse_localisation: '',
    responsable_depot: '',
    est_depot_par_defaut: false,
  });

  // Formulaire Emplacement
  const [nouveauNomEmplacement, setNouveauNomEmplacement] = useState('');
  const [responsableEmplacement, setResponsableEmplacement] = useState('');

  const listePersonnel = [
    { id: '1', nom: 'THÉODORE STÉPHANE' },
    { id: '2', nom: 'ORNELLA' },
    { id: '3', nom: 'RESPONSABLE MAGASIN A' },
  ];

  // 1. Charger les dépôts et leurs emplacements depuis Supabase
  const chargerDepotsEtEmplacements = async () => {
    setChargement(true);
    try {
      // Charger les dépôts
      const { data: dataDepots, error: errDepots } = await supabase
        .from('depots_stock')
        .select('*')
        .order('created_at', { ascending: false });

      if (errDepots) throw errDepots;
      setDepots(dataDepots || []);

      // Charger tous les emplacements de l'entreprise
      const { data: dataEmpls, error: errEmpls } = await supabase
        .from('emplacements_stock')
        .select('*');

      if (errEmpls) throw errEmpls;

      // Organiser les emplacements par ID de dépôt
      const mapEmplacements = {};
      (dataEmpls || []).forEach((emp) => {
        if (!mapEmplacements[emp.id_depot]) {
          mapEmplacements[emp.id_depot] = [];
        }
        mapEmplacements[emp.id_depot].push(emp);
      });

      setEmplacementsParDepot(mapEmplacements);
    } catch (err) {
      console.error('Erreur chargement :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDepotsEtEmplacements();
  }, [entrepriseId]);

  // 2. Enregistrer / Mettre à jour un Dépôt
  const enregistrerDepot = async (e) => {
    e.preventDefault();
    try {
      if (depotEnEdition) {
        const { error } = await supabase
          .from('depots_stock')
          .update({
            nom_depot: nouveauDepot.nom_depot,
            adresse_localisation: nouveauDepot.adresse_localisation,
            responsable_depot: nouveauDepot.responsable_depot,
            est_depot_par_defaut: nouveauDepot.est_depot_par_defaut,
          })
          .eq('id', depotEnEdition.id);

        if (error) throw error;
        alert('Dépôt mis à jour avec succès !');
      } else {
        const { error } = await supabase.from('depots_stock').insert([
          {
            nom_depot: nouveauDepot.nom_depot,
            adresse_localisation: nouveauDepot.adresse_localisation,
            responsable_depot: nouveauDepot.responsable_depot,
            est_depot_par_defaut: nouveauDepot.est_depot_par_defaut,
            id_entreprise: entrepriseId,
          },
        ]);

        if (error) throw error;
        alert('Dépôt créé avec succès !');
      }

      annulerFormDepot();
      chargerDepotsEtEmplacements();
    } catch (err) {
      alert('Erreur lors de l’enregistrement : ' + err.message);
    }
  };

  const ouvrirEdition = (e, depot) => {
    e.stopPropagation();
    setDepotEnEdition(depot);
    setNouveauDepot({
      nom_depot: depot.nom_depot || '',
      adresse_localisation: depot.adresse_localisation || '',
      responsable_depot: depot.responsable_depot || '',
      est_depot_par_defaut: depot.est_depot_par_defaut ?? false,
    });
    setAfficherFormDepot(true);
  };

  const annulerFormDepot = () => {
    setDepotEnEdition(null);
    setNouveauDepot({
      nom_depot: '',
      adresse_localisation: '',
      responsable_depot: '',
      est_depot_par_defaut: false,
    });
    setAfficherFormDepot(false);
  };

  const supprimerDepot = async (e, depot) => {
    e.stopPropagation();
    if (!confirm(`Supprimer définitivement le dépôt "${depot.nom_depot}" ?`)) return;

    try {
      const { error } = await supabase.from('depots_stock').delete().eq('id', depot.id);
      if (error) throw error;
      alert('Dépôt supprimé.');
      if (depotOuvertId === depot.id) setDepotOuvertId(null);
      chargerDepotsEtEmplacements();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  // 3. Ouvrir / Fermer la vue des emplacements d'un dépôt
  const toggleDepotEmplacements = (depotId) => {
    setDepotOuvertId(depotOuvertId === depotId ? null : depotId);
  };

  // 4. Enregistrer un Emplacement directement dans Supabase
  const ajouterEmplacement = async (e, depot) => {
    e.preventDefault();
    if (!nouveauNomEmplacement.trim()) return;

    try {
      const respFinal = responsableEmplacement || depot.responsable_depot || 'Non assigné';

      const { error } = await supabase.from('emplacements_stock').insert([
        {
          id_entreprise: entrepriseId,
          id_depot: depot.id,
          nom_emplacement: nouveauNomEmplacement.trim(),
          responsable_emplacement: respFinal,
        },
      ]);

      if (error) throw error;
      alert('Emplacement enregistré avec succès dans Supabase !');

      setNouveauNomEmplacement('');
      setResponsableEmplacement('');
      chargerDepotsEtEmplacements(); // Rechargement automatique pour persister l'affichage
    } catch (err) {
      alert('Erreur lors de l’ajout de l’emplacement : ' + err.message);
    }
  };

  // 5. Supprimer un emplacement de Supabase
  const supprimerEmplacement = async (empId) => {
    if (!confirm('Supprimer cet emplacement ?')) return;

    try {
      const { error } = await supabase.from('emplacements_stock').delete().eq('id', empId);
      if (error) throw error;
      alert('Emplacement supprimé.');
      chargerDepotsEtEmplacements();
    } catch (err) {
      alert('Erreur de suppression : ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <p className="text-xs text-slate-500">
          Cliquez sur un dépôt pour ouvrir, ajouter et enregistrer ses emplacements de façon permanente.
        </p>
        <button
          onClick={() => (afficherFormDepot ? annulerFormDepot() : setAfficherFormDepot(true))}
          className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow"
        >
          {afficherFormDepot ? '✖ Fermer' : '➕ Créer un Dépôt'}
        </button>
      </div>

      {/* Formulaire Dépôt */}
      {afficherFormDepot && (
        <form onSubmit={enregistrerDepot} className="bg-slate-50 border-2 border-orange-500/40 p-4 rounded-2xl space-y-3">
          <h4 className="font-bold text-xs text-orange-600 uppercase">
            {depotEnEdition ? `✏️ Modifier : ${depotEnEdition.nom_depot}` : 'Nouveau Dépôt / Magasin'}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">Nom du Dépôt *</label>
              <input
                type="text"
                required
                value={nouveauDepot.nom_depot}
                onChange={(e) => setNouveauDepot({ ...nouveauDepot, nom_depot: e.target.value })}
                placeholder="Ex: MAGASIN PRINCIPAL"
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Localisation / Adresse</label>
              <input
                type="text"
                value={nouveauDepot.adresse_localisation}
                onChange={(e) => setNouveauDepot({ ...nouveauDepot, adresse_localisation: e.target.value })}
                placeholder="Ex: Yaoundé - Bastos"
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Responsable du Dépôt (Facultatif)</label>
              <select
                value={nouveauDepot.responsable_depot}
                onChange={(e) => setNouveauDepot({ ...nouveauDepot, responsable_depot: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-slate-700"
              >
                <option value="">-- Aucun responsable / En attente --</option>
                {listePersonnel.map((p) => (
                  <option key={p.id} value={p.nom}>
                    👤 {p.nom}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="est_depot_par_defaut_chk"
              checked={nouveauDepot.est_depot_par_defaut}
              onChange={(e) => setNouveauDepot({ ...nouveauDepot, est_depot_par_defaut: e.target.checked })}
              className="w-4 h-4 text-orange-600 rounded"
            />
            <label htmlFor="est_depot_par_defaut_chk" className="text-xs font-semibold text-slate-700">
              ⭐ Définir comme Dépôt Principal (Par défaut)
            </label>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={annulerFormDepot} className="bg-slate-300 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl">Annuler</button>
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow">
              {depotEnEdition ? 'Mettre à jour' : 'Enregistrer dans Supabase'}
            </button>
          </div>
        </form>
      )}

      {/* Grille des Dépôts */}
      {chargement ? (
        <div className="p-8 text-center text-slate-400 text-xs">Chargement des dépôts...</div>
      ) : depots.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-xs space-y-2">
          <p className="text-2xl">🏢</p>
          <p className="font-bold">Aucun dépôt créé.</p>
          <p>Cliquez sur "Créer un Dépôt" pour commencer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {depots.map((dep) => {
            const estOuvert = depotOuvertId === dep.id;
            const emplacements = emplacementsParDepot[dep.id] || [];

            return (
              <div
                key={dep.id}
                className={`bg-white border rounded-2xl transition duration-200 overflow-hidden shadow-sm ${
                  estOuvert ? 'border-orange-500 ring-2 ring-orange-500/20' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Carte Dépôt (Cliquable) */}
                <div
                  onClick={() => toggleDepotEmplacements(dep.id)}
                  className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl text-xl">🏢</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-extrabold text-sm text-slate-800">{dep.nom_depot}</h5>
                        {dep.est_depot_par_defaut && (
                          <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">
                            ⭐ Principal
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        📍 {dep.adresse_localisation || 'Localisation non spécifiée'} • 👤 Resp :{' '}
                        <strong className="text-orange-600">{dep.responsable_depot || 'Non assigné'}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-xs font-bold bg-slate-100 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200">
                      📍 {emplacements.length} Emplacement(s) {estOuvert ? '▼' : '▶'}
                    </span>
                    <button
                      onClick={(e) => ouvrirEdition(e, dep)}
                      className="p-1.5 border rounded-lg hover:bg-orange-100 text-xs transition"
                      title="Modifier"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => supprimerDepot(e, dep)}
                      className="p-1.5 border rounded-lg hover:bg-red-100 text-xs transition"
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Section Emplacements Internes reliée à Supabase */}
                {estOuvert && (
                  <div className="bg-orange-50/60 border-t border-orange-200 p-4 space-y-3 text-xs">
                    <div className="flex justify-between items-center">
                      <h6 className="font-extrabold text-orange-900 uppercase tracking-wider text-[11px]">
                        📍 Emplacements enregistrés dans "{dep.nom_depot}" :
                      </h6>
                      <span className="text-[10px] text-orange-700 font-semibold">
                        ID Dépôt Parent : {dep.id}
                      </span>
                    </div>

                    {/* Formulaire d'ajout persistant */}
                    <form
                      onSubmit={(e) => ajouterEmplacement(e, dep)}
                      className="bg-white p-3 rounded-xl border border-orange-200 flex flex-col sm:flex-row gap-2 items-end shadow-sm"
                    >
                      <div className="flex-1">
                        <label className="block font-semibold mb-1 text-slate-700">Nom de l'Emplacement / Rayon *</label>
                        <input
                          type="text"
                          required
                          value={nouveauNomEmplacement}
                          onChange={(e) => setNouveauNomEmplacement(e.target.value)}
                          placeholder="Ex: RAYON ORNELLA, CHAMBRE FROIDE A1"
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="flex-1">
                        <label className="block font-semibold mb-1 text-slate-700">Responsable Dédié (Facultatif)</label>
                        <select
                          value={responsableEmplacement}
                          onChange={(e) => setResponsableEmplacement(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-700 focus:outline-none"
                        >
                          <option value="">Utiliser le resp. du dépôt ({dep.responsable_depot || 'Non assigné'})</option>
                          {listePersonnel.map((p) => (
                            <option key={p.id} value={p.nom}>
                              👤 {p.nom}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button
                        type="submit"
                        className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded-lg transition shadow shrink-0"
                      >
                        💾 Enregistrer l'emplacement
                      </button>
                    </form>

                    {/* Liste des emplacements enregistrés en base */}
                    {emplacements.length === 0 ? (
                      <div className="p-4 bg-white/60 border border-dashed border-orange-300 rounded-xl text-center text-slate-400 italic">
                        Aucun emplacement enregistré dans Supabase pour ce dépôt.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {emplacements.map((emp) => (
                          <div
                            key={emp.id}
                            className="bg-white border border-orange-200 p-3 rounded-xl shadow-sm flex justify-between items-center"
                          >
                            <div>
                              <p className="font-extrabold text-slate-800">📦 {emp.nom_emplacement}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">👤 Resp : {emp.responsable_emplacement}</p>
                            </div>
                            <button
                              onClick={() => supprimerEmplacement(emp.id)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded transition"
                              title="Supprimer l'emplacement"
                            >
                              🗑️
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}