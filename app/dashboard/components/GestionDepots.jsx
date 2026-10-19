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

  const [depotOuvertId, setDepotOuvertId] = useState(null);
  const [emplacementsParDepot, setEmplacementsParDepot] = useState({});

  const [nouveauDepot, setNouveauDepot] = useState({
    nom_depot: '',
    adresse_localisation: '',
    responsable_depot: '',
    est_depot_par_defaut: false,
  });

  const [nouveauNomEmplacement, setNouveauNomEmplacement] = useState('');
  const [responsableEmplacement, setResponsableEmplacement] = useState('');

  // Modale de recherche pour le responsable d'emplacement
  const [modalRespOuverte, setModalRespOuverte] = useState(false);
  const [rechercheResp, setRechercheResp] = useState('');

  const listePersonnel = [
    { id: '1', nom: 'THÉODORE STÉPHANE' },
    { id: '2', nom: 'ORNELLA' },
    { id: '3', nom: 'RESPONSABLE MAGASIN A' },
  ];

  const chargerDepotsEtEmplacements = async () => {
    setChargement(true);
    try {
      const { data: dataDepots, error: errDepots } = await supabase
        .from('depots_stock')
        .select('*')
        .order('created_at', { ascending: false });

      if (errDepots) throw errDepots;
      setDepots(dataDepots || []);

      const { data: dataEmpls, error: errEmpls } = await supabase
        .from('emplacements_stock')
        .select('*');

      if (errEmpls) throw errEmpls;

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

  const toggleDepotEmplacements = (depotId) => {
    setDepotOuvertId(depotOuvertId === depotId ? null : depotId);
  };

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
      alert('Emplacement enregistré avec succès !');

      setNouveauNomEmplacement('');
      setResponsableEmplacement('');
      chargerDepotsEtEmplacements();
    } catch (err) {
      alert('Erreur lors de l’ajout de l’emplacement : ' + err.message);
    }
  };

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

  const personnelFiltreModal = listePersonnel.filter(p => 
    p.nom.toLowerCase().includes(rechercheResp.toLowerCase())
  );

  return (
    <div className="space-y-2.5 font-sans text-xs">
      {/* En-tête avec bouton "Nouveau" aligné à droite */}
      <div className="flex justify-between items-center bg-white p-1.5 rounded-xl border border-slate-200 gap-1.5 shadow-2xs">
        <span className="text-[10px] text-slate-500 font-medium truncate px-1">
          Gestion des dépôts et emplacements.
        </span>
        <button
          onClick={() => (afficherFormDepot ? annulerFormDepot() : setAfficherFormDepot(true))}
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] transition whitespace-nowrap shadow-2xs shrink-0"
        >
          {afficherFormDepot ? '✖ Fermer' : '➕ Nouveau'}
        </button>
      </div>

      {/* Formulaire Dépôt Épuré */}
      {afficherFormDepot && (
        <form onSubmit={enregistrerDepot} className="bg-white border-2 border-orange-500/50 p-2.5 rounded-xl shadow-xs space-y-2">
          <div className="flex justify-between items-center pb-1 border-b border-slate-100">
            <span className="font-extrabold text-[11px] text-orange-600 uppercase">
              {depotEnEdition ? `✏️ Modifier : ${depotEnEdition.nom_depot}` : 'Nouveau Dépôt / Magasin'}
            </span>
            <button type="button" onClick={annulerFormDepot} className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1">✖</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10px]">
            <div>
              <label className="block font-bold text-[8px] uppercase text-slate-400 mb-0.5">Nom Dépôt *</label>
              <input
                type="text"
                required
                value={nouveauDepot.nom_depot}
                onChange={(e) => setNouveauDepot({ ...nouveauDepot, nom_depot: e.target.value })}
                placeholder="Ex: MAGASIN PRINCIPAL"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1 text-[10px] font-bold text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-[8px] uppercase text-slate-400 mb-0.5">Localisation</label>
              <input
                type="text"
                value={nouveauDepot.adresse_localisation}
                onChange={(e) => setNouveauDepot({ ...nouveauDepot, adresse_localisation: e.target.value })}
                placeholder="Ex: Yaoundé"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1 text-[10px] font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-[8px] uppercase text-slate-400 mb-0.5">Responsable</label>
              <select
                value={nouveauDepot.responsable_depot}
                onChange={(e) => setNouveauDepot({ ...nouveauDepot, responsable_depot: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1 font-bold text-slate-700 text-[10px]"
              >
                <option value="">-- Choisir --</option>
                {listePersonnel.map((p) => (
                  <option key={p.id} value={p.nom}>{p.nom}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-0.5">
            <input
              type="checkbox"
              id="est_depot_par_defaut_chk"
              checked={nouveauDepot.est_depot_par_defaut}
              onChange={(e) => setNouveauDepot({ ...nouveauDepot, est_depot_par_defaut: e.target.checked })}
              className="w-3.5 h-3.5 text-orange-600 rounded"
            />
            <label htmlFor="est_depot_par_defaut_chk" className="text-[10px] font-bold text-slate-700">
              ⭐ Dépôt Principal (Par défaut)
            </label>
          </div>

          <div className="pt-1 flex justify-end gap-1.5">
            <button type="button" onClick={annulerFormDepot} className="bg-slate-200 text-slate-700 font-bold px-3 py-1 rounded-lg text-[10px]">Annuler</button>
            <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-1 rounded-lg text-[10px] shadow-2xs">
              {depotEnEdition ? 'Mettre à jour' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      {/* Liste des Dépôts */}
      {chargement ? (
        <div className="p-4 text-center text-slate-400 text-xs">Chargement...</div>
      ) : depots.length === 0 ? (
        <div className="p-4 text-center text-slate-400 text-xs bg-white rounded-xl border border-slate-200">
          Aucun dépôt enregistré.
        </div>
      ) : (
        <div className="space-y-2">
          {depots.map((dep) => {
            const estOuvert = depotOuvertId === dep.id;
            const emplacements = emplacementsParDepot[dep.id] || [];

            return (
              <div
                key={dep.id}
                className={`bg-white border rounded-xl transition overflow-hidden shadow-2xs ${
                  estOuvert ? 'border-orange-500 ring-1 ring-orange-500/20' : 'border-slate-200'
                }`}
              >
                {/* Ligne Dépôt compacte sur une seule ligne (Sans texte localisation superflu) */}
                <div
                  onClick={() => toggleDepotEmplacements(dep.id)}
                  className="p-2 cursor-pointer flex items-center justify-between gap-2 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-base shrink-0">🏢</span>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-[11px] text-slate-800 truncate">{dep.nom_depot}</span>
                        {dep.est_depot_par_defaut && (
                          <span className="bg-amber-100 text-amber-800 text-[8px] font-bold px-1.5 py-0.2 rounded-full shrink-0">Principal</span>
                        )}
                      </div>
                      <p className="text-[9px] text-slate-500 truncate">
                        👤 <strong className="text-orange-600">{dep.responsable_depot || 'Non assigné'}</strong>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-bold bg-emerald-600 text-white px-2.5 py-1 rounded-lg whitespace-nowrap shadow-2xs">
                      📍 {emplacements.length} Empl. {estOuvert ? '▼' : '▶'}
                    </span>
                    <button
                      onClick={(e) => ouvrirEdition(e, dep)}
                      className="p-1 bg-slate-100 hover:bg-orange-100 border border-slate-200 rounded text-[11px]"
                      title="Modifier"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => supprimerDepot(e, dep)}
                      className="p-1 bg-slate-100 hover:bg-red-100 border border-slate-200 rounded text-[11px]"
                      title="Supprimer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Section Emplacements Internes */}
                {estOuvert && (
                  <div className="bg-slate-50 border-t border-slate-200 p-2.5 space-y-2 text-[10px]">
                    <div className="flex justify-between items-center">
                      <span className="font-extrabold text-slate-700 uppercase tracking-wider text-[9px]">
                        EMPLACEMENT
                      </span>
                    </div>

                    {/* Formulaire d'ajout emplacement compact */}
                    <form
                      onSubmit={(e) => ajouterEmplacement(e, dep)}
                      className="bg-white p-2 rounded-lg border border-slate-200 flex gap-1.5 items-end shadow-2xs"
                    >
                      <div className="flex-1">
                        <label className="block text-[8px] text-slate-400 font-bold mb-0.5">Emplacement</label>
                        <input
                          type="text"
                          required
                          value={nouveauNomEmplacement}
                          onChange={(e) => setNouveauNomEmplacement(e.target.value)}
                          placeholder="Ex: RAYON A1"
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-[10px] font-bold text-slate-800"
                        />
                      </div>

                      <div className="flex-1">
                        <label className="block text-[8px] text-slate-400 font-bold mb-0.5">Responsable</label>
                        <div 
                          onClick={() => setModalRespOuverte(true)} 
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-[10px] font-bold text-slate-800 cursor-pointer truncate"
                        >
                          {responsableEmplacement ? responsableEmplacement : `-- Choisir --`}
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-3 py-1 rounded text-[10px] shadow-2xs shrink-0 flex items-center gap-1"
                      >
                        <span>➕</span> Ajouter
                      </button>
                    </form>

                    {/* Grille des emplacements */}
                    {emplacements.length === 0 ? (
                      <p className="text-center text-slate-400 py-2 italic text-[10px]">Aucun emplacement.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {emplacements.map((emp) => (
                          <div
                            key={emp.id}
                            className="bg-white border border-slate-200 p-1.5 rounded-lg shadow-2xs flex justify-between items-center"
                          >
                            <div className="truncate pr-1">
                              <p className="font-extrabold text-slate-800 text-[10px] truncate">📦 {emp.nom_emplacement}</p>
                              <p className="text-[8px] text-slate-400 truncate">👤 {emp.responsable_emplacement}</p>
                            </div>
                            <button
                              onClick={() => supprimerEmplacement(emp.id)}
                              className="text-slate-400 hover:text-red-600 p-0.5 rounded text-[10px] shrink-0"
                              title="Supprimer"
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

      {/* MODALE DE RECHERCHE DE RESPONSABLE */}
      {modalRespOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-3 space-y-2.5 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="font-extrabold text-xs text-slate-800 uppercase">SÉLECTIONNER UN RESPONSABLE</span>
              <button type="button" onClick={() => setModalRespOuverte(false)} className="text-slate-400 font-black text-xs">✕</button>
            </div>
            <input 
              type="text" 
              autoFocus 
              placeholder="Rechercher..." 
              value={rechercheResp} 
              onChange={(e) => setRechercheResp(e.target.value)} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold" 
            />
            <div className="overflow-y-auto space-y-1 flex-1 max-h-60">
              {personnelFiltreModal.length === 0 ? (
                <p className="text-center text-slate-400 py-6 text-xs">Aucun responsable trouvé.</p>
              ) : (
                personnelFiltreModal.map((p) => (
                  <div 
                    key={p.id} 
                    onClick={() => { 
                      setResponsableEmplacement(p.nom); 
                      setModalRespOuverte(false); 
                      setRechercheResp(''); 
                    }} 
                    className="p-2.5 bg-slate-50 hover:bg-orange-50 border border-slate-200 rounded-xl flex justify-between items-center cursor-pointer transition"
                  >
                    <span className="font-extrabold text-slate-800 text-[11px]">👤 {p.nom}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}