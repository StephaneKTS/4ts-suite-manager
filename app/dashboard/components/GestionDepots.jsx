'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { localSync } from '../../lib/localSync';

export default function GestionDepots({ entrepriseId = '4TS-TEST' }) {
  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();
  const cleCacheDepots = `depots_${entrepriseId}_${moduleActuel}`;
  const cleCacheEmplacements = `emplacements_${entrepriseId}_${moduleActuel}`;

  // --- INITIALISATION INSTANTANÉE DEPUIS LE CACHE LOCAL ---
  const [depots, setDepots] = useState(() => {
    if (typeof window !== 'undefined') {
      return localSync.recupererDonneesLocales(cleCacheDepots) || [];
    }
    return [];
  });

  const [emplacementsParDepot, setEmplacementsParDepot] = useState(() => {
    if (typeof window !== 'undefined') {
      return localSync.recupererDonneesLocales(cleCacheEmplacements) || {};
    }
    return {};
  });

  const [chargement, setChargement] = useState(false);
  const [afficherFormDepot, setAfficherFormDepot] = useState(false);
  const [depotEnEdition, setDepotEnEdition] = useState(null);

  const [limiteDepots, setLimiteDepots] = useState(20);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);

  const [depotOuvertId, setDepotOuvertId] = useState(null);

  const [roleNom, setRoleNom] = useState('');
  const [estAdmin, setEstAdmin] = useState(false);

  const [nouveauDepot, setNouveauDepot] = useState({
    nom_depot: '',
    adresse_localisation: '',
    responsable_depot: '',
    est_depot_par_defaut: false,
  });

  const [nouveauNomEmplacement, setNouveauNomEmplacement] = useState('');
  const [responsableEmplacement, setResponsableEmplacement] = useState('');

  const [modalRespOuverte, setModalRespOuverte] = useState(false);
  const [rechercheResp, setRechercheResp] = useState('');

  const listePersonnel = [
    { id: '1', nom: 'THÉODORE STÉPHANE' },
    { id: '2', nom: 'ORNELLA' },
    { id: '3', nom: 'RESPONSABLE MAGASIN A' },
  ];

  const chargerDepots = async (silencieux = false) => {
    if (!silencieux && depots.length === 0) setChargement(true);
    try {
      const utilisateurConnecteStr = localStorage.getItem('utilisateur_connecte');
      if (utilisateurConnecteStr) {
        try {
          const userObj = JSON.parse(utilisateurConnecteStr);
          const r = (userObj.nom_role || userObj.role || '').trim().toUpperCase();
          setRoleNom(r);
          if (r.includes('ADMIN') || r.includes('DIRECTEUR') || r.includes('STÉPHANE') || r.includes('KENMOE')) {
            setEstAdmin(true);
          }
        } catch (e) {
          const r = utilisateurConnecteStr.trim().toUpperCase();
          setRoleNom(r);
          if (r.includes('ADMIN') || r.includes('STÉPHANE') || r.includes('KENMOE')) {
            setEstAdmin(true);
          }
        }
      }

      const { data: dataDepots, error: errDepots } = await supabase
        .from('depots_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('created_at', { ascending: false });

      if (errDepots) throw errDepots;
      const listeDepots = dataDepots || [];
      setDepots(listeDepots);
      localSync.sauvegarderDonneesLocales(cleCacheDepots, listeDepots);

      const { data: dataEmpls, error: errEmpls } = await supabase
        .from('emplacements_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);

      if (errEmpls) throw errEmpls;

      const mapEmplacements = {};
      (dataEmpls || []).forEach((emp) => {
        if (!mapEmplacements[emp.id_depot]) {
          mapEmplacements[emp.id_depot] = [];
        }
        mapEmplacements[emp.id_depot].push(emp);
      });

      setEmplacementsParDepot(mapEmplacements);
      localSync.sauvegarderDonneesLocales(cleCacheEmplacements, mapEmplacements);
    } catch (err) {
      console.error('Erreur chargement (mode hors-ligne actif) :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDepots();
    localSync.synchroniserVersCloud(supabase);
  }, [entrepriseId, moduleActuel]);

  const enregistrerDepot = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;

    setEnTrainDeSauvegarder(true);
    try {
      if (nouveauDepot.est_depot_par_defaut) {
        await supabase
          .from('depots_stock')
          .update({ est_depot_par_defaut: false })
          .eq('id_entreprise', entrepriseId)
          .eq('module', moduleActuel);
      }

      const payload = {
        nom_depot: nouveauDepot.nom_depot.trim().toUpperCase(),
        adresse_localisation: nouveauDepot.adresse_localisation.trim().toUpperCase(),
        responsable_depot: nouveauDepot.responsable_depot,
        est_depot_par_defaut: nouveauDepot.est_depot_par_defaut,
        id_entreprise: entrepriseId,
        module: moduleActuel,
      };

      if (depotEnEdition) {
        const depotIdCible = depotEnEdition.id || depotEnEdition.ID;
        payload.id = depotIdCible;
        const { error } = await supabase
          .from('depots_stock')
          .update(payload)
          .eq('id', depotIdCible);

        if (error) {
          localSync.ajouterFileAttente('UPDATE', 'depots_stock', payload);
        }

        const listeMaj = depots.map(d => (d.id || d.ID) === depotIdCible ? { ...d, ...payload } : d);
        setDepots(listeMaj);
        localSync.sauvegarderDonneesLocales(cleCacheDepots, listeMaj);

        alert('Dépôt mis à jour avec succès !');
      } else {
        const idTemp = 'temp_' + Date.now();
        const nouvelObjet = { ...payload, id: idTemp, created_at: new Date().toISOString() };
        
        const { error } = await supabase
          .from('depots_stock')
          .insert([payload]);

        if (error) {
          localSync.ajouterFileAttente('INSERT', 'depots_stock', payload);
        }

        const listeMaj = [nouvelObjet, ...depots];
        setDepots(listeMaj);
        localSync.sauvegarderDonneesLocales(cleCacheDepots, listeMaj);

        alert('Dépôt enregistré avec succès !');
      }

      localStorage.removeItem(cleCacheDepots);
      annulerFormDepot();
      await chargerDepots(true);
    } catch (err) {
      alert('Erreur lors de l’enregistrement : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const ouvrirEdition = (depot) => {
    if (enTrainDeSauvegarder) return;
    setDepotEnEdition(depot);
    setNouveauDepot({
      nom_depot: depot.nom_depot || depot.Nom_Depot || '',
      adresse_localisation: depot.adresse_localisation || depot.Adresse_Localisation || '',
      responsable_depot: depot.responsable_depot || depot.Responsable_Depot || '',
      est_depot_par_defaut: depot.est_depot_par_defaut ?? depot.Est_Depot_Par_Defaut ?? false,
    });
    setAfficherFormDepot(true);
  };

  const annulerFormDepot = () => {
    if (enTrainDeSauvegarder) return;
    setDepotEnEdition(null);
    setNouveauDepot({
      nom_depot: '',
      adresse_localisation: '',
      responsable_depot: '',
      est_depot_par_defaut: false,
    });
    setAfficherFormDepot(false);
  };

  const supprimerDepotDepuisFormulaire = async () => {
    if (enTrainDeSauvegarder) return;
    if (!depotEnEdition) {
      alert("⚠️ Aucun dépôt sélectionné pour la suppression.");
      return;
    }

    const depotIdCible = depotEnEdition.id || depotEnEdition.ID;
    const depotNomCible = depotEnEdition.nom_depot || depotEnEdition.Nom_Depot || 'ce dépôt';

    if (!confirm(`Voulez-vous vraiment supprimer définitivement le dépôt "${depotNomCible}" ?`)) {
      return;
    }

    setEnTrainDeSauvegarder(true);
    try {
      const { error } = await supabase.from('depots_stock').delete().eq('id', depotIdCible);
      if (error) {
        localSync.ajouterFileAttente('DELETE', 'depots_stock', { id: depotIdCible });
      }
      
      const listeMaj = depots.filter(d => (d.id || d.ID) !== depotIdCible);
      setDepots(listeMaj);
      localSync.sauvegarderDonneesLocales(cleCacheDepots, listeMaj);

      localStorage.removeItem(cleCacheDepots);
      alert('Dépôt supprimé avec succès.');
      if (depotOuvertId === depotIdCible) setDepotOuvertId(null);
      annulerFormDepot();
      await chargerDepots(true);
    } catch (err) {
      alert('Erreur de suppression : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const toggleDepotEmplacements = (depotId) => {
    if (enTrainDeSauvegarder) return;
    setDepotOuvertId(depotOuvertId === depotId ? null : depotId);
  };

  const ajouterEmplacement = async (e, depot) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;
    if (!nouveauNomEmplacement.trim()) return;

    setEnTrainDeSauvegarder(true);
    try {
      const respFinal = responsableEmplacement || depot.responsable_depot || depot.Responsable_Depot || 'NON ASSIGNÉ';
      const depotIdCible = depot.id || depot.ID;

      const payloadEmp = {
        id_entreprise: entrepriseId,
        id_depot: depotIdCible,
        nom_emplacement: nouveauNomEmplacement.trim().toUpperCase(),
        responsable_emplacement: respFinal,
        module: moduleActuel,
      };

      const { error } = await supabase
        .from('emplacements_stock')
        .insert([payloadEmp]);

      if (error) {
        localSync.ajouterFileAttente('INSERT', 'emplacements_stock', payloadEmp);
      }

      alert('Emplacement enregistré avec succès !');

      setNouveauNomEmplacement('');
      setResponsableEmplacement('');
      localStorage.removeItem(cleCacheEmplacements);
      await chargerDepots(true);
    } catch (err) {
      alert('Erreur lors de l’ajout de l’emplacement : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const supprimerEmplacement = async (empId) => {
    if (enTrainDeSauvegarder) return;
    if (!confirm('Supprimer cet emplacement ?')) return;

    setEnTrainDeSauvegarder(true);
    try {
      const { error } = await supabase.from('emplacements_stock').delete().eq('id', empId);
      if (error) {
        localSync.ajouterFileAttente('DELETE', 'emplacements_stock', { id: empId });
      }

      localStorage.removeItem(cleCacheEmplacements);
      alert('Emplacement supprimé.');
      await chargerDepots(true);
    } catch (err) {
      alert('Erreur de suppression : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const personnelFiltreModal = listePersonnel.filter(p => 
    p.nom.toLowerCase().includes(rechercheResp.toLowerCase())
  );

  const depotsAffiches = depots.slice(0, limiteDepots);

  return (
    <div className="space-y-2.5 font-sans text-xs">
      
      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-slate-900 uppercase text-xs flex items-center gap-1.5">
            <span>🏢</span> GESTION DES DÉPÔTS ({depotsAffiches.length} / {depots.length})
          </h3>
          {roleNom && (
            <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold border border-slate-200">
              Rôle : {roleNom}
            </span>
          )}
        </div>
        
        <button
          type="button"
          disabled={enTrainDeSauvegarder}
          onClick={() => {
            if (enTrainDeSauvegarder) return;
            if (afficherFormDepot) {
              annulerFormDepot();
            } else {
              setDepotEnEdition(null);
              setNouveauDepot({ nom_depot: '', adresse_localisation: '', responsable_depot: '', est_depot_par_defaut: false });
              setAfficherFormDepot(true);
            }
          }}
          className="bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-2xs text-xs"
        >
          {afficherFormDepot ? '✖' : 'Nouveau'}
        </button>
      </div>

      <div className="flex justify-start items-center gap-1.5">
        <button
          type="button"
          disabled={enTrainDeSauvegarder}
          onClick={() => { if (!enTrainDeSauvegarder) annulerFormDepot(); }}
          className={`px-3 py-1.5 rounded-lg font-black text-[11px] transition whitespace-nowrap border shadow-2xs ${
            !afficherFormDepot 
              ? 'bg-orange-600 text-white border-orange-600 shadow-xs' 
              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
          }`}
        >
          📋 Liste des Dépôts ({depots.length})
        </button>
      </div>

      {afficherFormDepot ? (
        <form onSubmit={enregistrerDepot} className="bg-white border-2 border-orange-500/50 p-3 rounded-xl shadow-md space-y-2.5">
          <div className="flex justify-between items-center pb-1 border-b border-slate-100">
            <span className="font-extrabold text-[11px] text-orange-600 uppercase">
              {depotEnEdition ? `✏️ Modifier : ${depotEnEdition.nom_depot || depotEnEdition.Nom_Depot}` : `Nouveau Dépôt / Magasin`}
            </span>
            <button type="button" disabled={enTrainDeSauvegarder} onClick={annulerFormDepot} className="text-slate-400 hover:text-slate-700 font-bold text-xs p-1">✖</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10px]">
            <div>
              <label className="block font-black text-[9px] uppercase text-slate-700 mb-0.5">Nom Dépôt *</label>
              <input
                type="text"
                required
                disabled={enTrainDeSauvegarder}
                value={nouveauDepot.nom_depot}
                onChange={(e) => setNouveauDepot({ ...nouveauDepot, nom_depot: e.target.value.toUpperCase() })}
                placeholder="EX: MAGASIN PRINCIPAL"
                className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] font-extrabold uppercase text-slate-900 shadow-xs"
              />
            </div>

            <div>
              <label className="block font-black text-[9px] uppercase text-slate-700 mb-0.5">Localisation</label>
              <input
                type="text"
                disabled={enTrainDeSauvegarder}
                value={nouveauDepot.adresse_localisation}
                onChange={(e) => setNouveauDepot({ ...nouveauDepot, adresse_localisation: e.target.value.toUpperCase() })}
                placeholder="EX: YAOUNDÉ"
                className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] font-bold uppercase text-slate-900 shadow-xs"
              />
            </div>

            <div>
              <label className="block font-black text-[9px] uppercase text-slate-700 mb-0.5">Responsable</label>
              <select
                disabled={enTrainDeSauvegarder}
                value={nouveauDepot.responsable_depot}
                onChange={(e) => setNouveauDepot({ ...nouveauDepot, responsable_depot: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-extrabold text-slate-900 text-[10px] shadow-xs"
              >
                <option value="">-- Choisir --</option>
                {listePersonnel.map((p) => (
                  <option key={p.id} value={p.nom}>{p.nom}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-1">
            <input
              type="checkbox"
              id="est_depot_par_defaut_chk"
              disabled={enTrainDeSauvegarder}
              checked={nouveauDepot.est_depot_par_defaut}
              onChange={(e) => setNouveauDepot({ ...nouveauDepot, est_depot_par_defaut: e.target.checked })}
              className="w-4 h-4 text-orange-600 rounded border-slate-300 cursor-pointer"
            />
            <label htmlFor="est_depot_par_defaut_chk" className="text-[10px] font-black text-slate-900 cursor-pointer">
              ⭐ Définir comme Dépôt Principal unique
            </label>
          </div>

          <div className="pt-2 flex justify-between items-center border-t border-slate-200">
            {depotEnEdition ? (
              <button 
                type="button" 
                disabled={enTrainDeSauvegarder}
                onClick={supprimerDepotDepuisFormulaire} 
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-black px-3 py-1.5 rounded-lg text-[10px] shadow-xs transition"
              >
                {enTrainDeSauvegarder ? 'Patientez...' : '🗑️ Supprimer'}
              </button>
            ) : <div />}

            <div className="flex gap-1.5">
              <button type="button" disabled={enTrainDeSauvegarder} onClick={annulerFormDepot} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-black px-3 py-1.5 rounded-lg text-[10px]">Annuler</button>
              <button type="submit" disabled={enTrainDeSauvegarder} className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-black px-4 py-1.5 rounded-lg text-[10px] shadow-xs">
                {enTrainDeSauvegarder ? 'Enregistrement...' : (depotEnEdition ? 'Mettre à jour' : 'Enregistrer')}
              </button>
            </div>
          </div>
        </form>
      ) : (
        chargement && depots.length === 0 ? (
          <div className="p-4 text-center text-slate-500 font-bold text-xs">Chargement...</div>
        ) : depots.length === 0 ? (
          <div className="p-4 text-center text-slate-500 font-bold text-xs bg-white rounded-xl border border-slate-200">
            Aucun dépôt enregistré.
          </div>
        ) : (
          <div className="space-y-2">
            {depotsAffiches.map((dep) => {
              const depId = dep.id || dep.ID;
              const depNom = dep.nom_depot || dep.Nom_Depot || '';
              const depResp = dep.responsable_depot || dep.Responsable_Depot || '';
              const estDefaut = dep.est_depot_par_defaut ?? dep.Est_Depot_Par_Defaut ?? false;

              const estOuvert = depotOuvertId === depId;
              const emplacements = emplacementsParDepot[depId] || [];

              return (
                <div
                  key={depId}
                  className={`bg-white border rounded-xl transition overflow-hidden shadow-2xs ${
                    estOuvert ? 'border-orange-500 ring-1 ring-orange-500/20' : 'border-slate-200'
                  }`}
                >
                  <div
                    onClick={() => !enTrainDeSauvegarder && ouvrirEdition(dep)}
                    className="p-2.5 cursor-pointer flex items-center justify-between gap-2 hover:bg-orange-50/70 transition select-none"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-base shrink-0">🏢</span>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-[11px] text-slate-900 truncate">{depNom}</span>
                          {estDefaut && (
                            <span className="bg-amber-100 text-amber-900 text-[8.5px] font-black px-1.5 py-0.5 rounded-full shrink-0 border border-amber-200">Principal</span>
                          )}
                        </div>
                        <p className="text-[9.5px] text-slate-700 truncate mt-0.5 font-bold">
                          Responsable : <strong className="text-orange-700">{depResp || 'NON ASSIGNÉ'}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={enTrainDeSauvegarder}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDepotEmplacements(depId);
                        }}
                        className="text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-2xs transition"
                      >
                        📍 {emplacements.length} Empl. {estOuvert ? '▼' : '▶'}
                      </button>
                    </div>
                  </div>

                  {estOuvert && (
                    <div className="bg-slate-50 border-t border-slate-200 p-2.5 space-y-2 text-[10px]">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-slate-800 uppercase tracking-wider text-[9.5px]">
                          EMPLACEMENTS DU DÉPÔT
                        </span>
                      </div>

                      <form
                        onSubmit={(e) => ajouterEmplacement(e, dep)}
                        className="bg-white p-2 rounded-lg border border-slate-300 flex gap-1.5 items-end shadow-2xs"
                      >
                        <div className="flex-1">
                          <label className="block text-[8px] text-slate-700 font-black mb-0.5 uppercase">Emplacement</label>
                          <input
                            type="text"
                            required
                            disabled={enTrainDeSauvegarder}
                            value={nouveauNomEmplacement}
                            onChange={(e) => setNouveauNomEmplacement(e.target.value.toUpperCase())}
                            placeholder="EX: RAYON A1"
                            className="w-full bg-white border border-slate-300 rounded p-1 text-[10px] font-extrabold uppercase text-slate-900 shadow-xs"
                          />
                        </div>

                        <div className="flex-1">
                          <label className="block text-[8px] text-slate-700 font-black mb-0.5 uppercase">Responsable</label>
                          <div 
                            onClick={() => { if (!enTrainDeSauvegarder) setModalRespOuverte(true); }} 
                            className="w-full bg-white border border-slate-300 rounded p-1 text-[10px] font-extrabold text-slate-900 cursor-pointer truncate shadow-xs"
                          >
                            {responsableEmplacement ? responsableEmplacement : `-- Choisir --`}
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={enTrainDeSauvegarder}
                          className="bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-black px-3 py-1 rounded text-[10px] shadow-xs shrink-0 flex items-center gap-1"
                        >
                          <span>➕</span> Ajouter
                        </button>
                      </form>

                      {emplacements.length === 0 ? (
                        <p className="text-center text-slate-500 py-2 font-bold italic text-[10px]">Aucun emplacement enregistré.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {emplacements.map((emp) => {
                            const empId = emp.id || emp.ID;
                            const empNom = emp.nom_emplacement || emp.Nom_Emplacement || '';
                            const empResp = emp.responsable_emplacement || emp.Responsable_Emplacement || '';

                            return (
                              <div
                                key={empId}
                                className="bg-white border border-slate-200 p-2 rounded-lg shadow-2xs flex justify-between items-center"
                              >
                                <div className="truncate pr-1">
                                  <p className="font-black text-slate-900 text-[10px] truncate">📦 {empNom}</p>
                                  <p className="text-[8.5px] text-slate-600 font-bold truncate">👤 {empResp}</p>
                                </div>
                                <button
                                  type="button"
                                  disabled={enTrainDeSauvegarder}
                                  onClick={() => supprimerEmplacement(empId)}
                                  className="text-red-500 hover:text-red-700 disabled:opacity-50 p-1 rounded text-[10px] shrink-0 font-bold"
                                  title="Supprimer"
                                >
                                  🗑️
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {limiteDepots < depots.length && (
              <div className="text-center pt-2 pb-2">
                <button
                  type="button"
                  disabled={enTrainDeSauvegarder}
                  onClick={() => setLimiteDepots(prev => prev + 20)}
                  className="bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 font-extrabold px-4 py-2 rounded-xl text-xs transition shadow-xs border border-slate-300 w-full"
                >
                  📥 Charger 20 dépôts de plus ({depots.length - limiteDepots} restants)
                </button>
              </div>
            )}
          </div>
        )
      )}

      {modalRespOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-3 space-y-2.5 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="font-black text-xs text-slate-900 uppercase">Sélectionner un responsable</span>
              <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setModalRespOuverte(false)} className="text-slate-400 hover:text-slate-700 font-black text-xs">✕</button>
            </div>
            <input 
              type="text" 
              autoFocus 
              disabled={enTrainDeSauvegarder}
              placeholder="Rechercher..." 
              value={rechercheResp} 
              onChange={(e) => setRechercheResp(e.target.value)} 
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-extrabold text-slate-900 shadow-xs" 
            />
            <div className="overflow-y-auto space-y-1 flex-1 max-h-60">
              {personnelFiltreModal.length === 0 ? (
                <p className="text-center text-slate-500 py-6 text-xs font-bold">Aucun responsable trouvé.</p>
              ) : (
                personnelFiltreModal.map((p) => (
                  <div 
                    key={p.id} 
                    onClick={() => { 
                      if (enTrainDeSauvegarder) return;
                      setResponsableEmplacement(p.nom); 
                      setModalRespOuverte(false); 
                      setRechercheResp(''); 
                    }} 
                    className="p-2.5 bg-slate-50 hover:bg-orange-50 border border-slate-200 rounded-xl flex justify-between items-center cursor-pointer transition"
                  >
                    <span className="font-black text-slate-900 text-[11px]">👤 {p.nom}</span>
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