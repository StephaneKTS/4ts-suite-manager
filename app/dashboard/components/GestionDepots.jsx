'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionDepots({ entrepriseId = '4TS-TEST' }) {
  const [depots, setDepots] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [afficherFormDepot, setAfficherFormDepot] = useState(false);
  const [depotEnEdition, setDepotEnEdition] = useState(null);

  const [depotOuvertId, setDepotOuvertId] = useState(null);
  const [emplacementsParDepot, setEmplacementsParDepot] = useState({});

  // Permissions strictes de l'employé connecté
  const [permissions, setPermissions] = useState({
    lecture: true,
    creation: true,
    modification: true,
    suppression: false, // Par défaut bloqué par sécurité
  });

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

  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();

  const chargerDepotsEtPermissions = async () => {
    setChargement(true);
    try {
      // 1. Charger et analyser rigoureusement les permissions de l'employé connecté
      const utilisateurConnecteStr = localStorage.getItem('utilisateur_connecte');
      if (utilisateurConnecteStr) {
        const userObj = JSON.parse(utilisateurConnecteStr);
        const nomRoleUser = (userObj.nom_role || userObj.role || '').trim().toUpperCase();

        if (nomRoleUser && nomRoleUser !== 'ADMINISTRATEUR' && nomRoleUser !== 'SUPER_ADMIN') {
          // Vérification élargie de toutes les variantes possibles du module Dépôts
          const pDepot = userObj.permissions?.['depots_stock'] || userObj.permissions?.['depots'] || userObj.permissions?.['depots_et_magasins'];
          
          if (pDepot) {
            setPermissions({
              lecture: pDepot.lecture ?? true,
              creation: pDepot.creation ?? true,
              modification: pDepot.modification ?? false,
              suppression: pDepot.suppression ?? false,
            });
          } else {
            const { data: roleData } = await supabase
              .from('roles')
              .select('*')
              .eq('id_entreprise', entrepriseId)
              .eq('module', moduleActuel)
              .eq('nom_role', nomRoleUser)
              .maybeSingle();

            const rolePerm = roleData?.permissions?.['depots_stock'] || roleData?.permissions?.['depots'] || roleData?.permissions?.['depots_et_magasins'];
            if (rolePerm) {
              setPermissions({
                lecture: rolePerm.lecture ?? true,
                creation: rolePerm.creation ?? true,
                modification: rolePerm.modification ?? false,
                suppression: rolePerm.suppression ?? false,
              });
            }
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
      setDepots(dataDepots || []);

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
    } catch (err) {
      console.error('Erreur chargement :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDepotsEtPermissions();
  }, [entrepriseId, moduleActuel]);

  const enregistrerDepot = async (e) => {
    e.preventDefault();
    if (depotEnEdition && !permissions.modification) {
      alert('⛔ Action non autorisée : Vous n’avez pas le droit de modifier les dépôts.');
      return;
    }
    if (!depotEnEdition && !permissions.creation) {
      alert('⛔ Action non autorisée : Vous n’avez pas le droit de créer des dépôts.');
      return;
    }

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
        const { error } = await supabase
          .from('depots_stock')
          .update(payload)
          .eq('id', depotEnEdition.id);

        if (error) throw error;
        alert(`Dépôt mis à jour avec succès dans le module ${moduleActuel} !`);
      } else {
        const { error } = await supabase
          .from('depots_stock')
          .insert([payload]);

        if (error) throw error;
        alert(`Dépôt enregistré avec succès dans le module ${moduleActuel} !`);
      }

      annulerFormDepot();
      chargerDepotsEtPermissions();
    } catch (err) {
      alert('Erreur lors de l’enregistrement : ' + err.message);
    }
  };

  const ouvrirEdition = (depot) => {
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

  const supprimerDepotDepuisFormulaire = async () => {
    // Double vérification stricte de la permission de suppression
    if (!permissions.suppression) {
      alert('⛔ Action non autorisée : Votre profil n’a pas le droit de supprimer des dépôts.');
      return;
    }
    if (!depotEnEdition) return;

    try {
      const { data: stocksDepot, error: errStocks } = await supabase
        .from('stocks_par_depot')
        .select('*')
        .eq('id_depot', depotEnEdition.id);

      if (errStocks) throw errStocks;

      const totalStockActif = (stocksDepot || []).reduce((acc, curr) => acc + Number(curr.quantite || 0), 0);

      if (totalStockActif > 0) {
        alert(`❌ SUPPRESSION BLOQUÉE : Ce dépôt ("${depotEnEdition.nom_depot}") contient encore un stock actif total de ${totalStockActif} unité(s). Vous devez d'abord vider ou transférer le stock avant de pouvoir supprimer ce dépôt.`);
        return;
      }

      if (!confirm(`Supprimer définitivement le dépôt "${depotEnEdition.nom_depot}" ?`)) return;

      const { error } = await supabase.from('depots_stock').delete().eq('id', depotEnEdition.id);
      if (error) throw error;
      
      alert('Dépôt supprimé avec succès.');
      if (depotOuvertId === depotEnEdition.id) setDepotOuvertId(null);
      annulerFormDepot();
      chargerDepotsEtPermissions();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const toggleDepotEmplacements = (depotId) => {
    setDepotOuvertId(depotOuvertId === depotId ? null : depotId);
  };

  const ajouterEmplacement = async (e, depot) => {
    e.preventDefault();
    if (!permissions.creation) {
      alert('⛔ Action non autorisée : Vous n’avez pas le droit d’ajouter des emplacements.');
      return;
    }
    if (!nouveauNomEmplacement.trim()) return;

    try {
      const respFinal = responsableEmplacement || depot.responsable_depot || 'NON ASSIGNÉ';

      const payloadEmp = {
        id_entreprise: entrepriseId,
        id_depot: depot.id,
        nom_emplacement: nouveauNomEmplacement.trim().toUpperCase(),
        responsable_emplacement: respFinal,
        module: moduleActuel,
      };

      const { error } = await supabase
        .from('emplacements_stock')
        .insert([payloadEmp]);

      if (error) throw error;

      alert(`Emplacement enregistré avec succès dans le module ${moduleActuel} !`);

      setNouveauNomEmplacement('');
      setResponsableEmplacement('');
      chargerDepotsEtPermissions();
    } catch (err) {
      alert('Erreur lors de l’ajout de l’emplacement : ' + err.message);
    }
  };

  const supprimerEmplacement = async (empId) => {
    if (!permissions.suppression) {
      alert('⛔ Action non autorisée : Votre profil n’a pas le droit de supprimer des emplacements.');
      return;
    }
    if (!confirm('Supprimer cet emplacement ?')) return;

    try {
      const { error } = await supabase.from('emplacements_stock').delete().eq('id', empId);
      if (error) throw error;
      alert('Emplacement supprimé.');
      chargerDepotsEtPermissions();
    } catch (err) {
      alert('Erreur de suppression : ' + err.message);
    }
  };

  const personnelFiltreModal = listePersonnel.filter(p => 
    p.nom.toLowerCase().includes(rechercheResp.toLowerCase())
  );

  return (
    <div className="space-y-2.5 font-sans text-xs">
      
      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="font-extrabold text-slate-900 uppercase text-xs flex items-center gap-1.5">
          <span>🏢</span> GESTION DES DÉPÔTS [{moduleActuel}]
        </h3>
        {permissions.creation && (
          <button
            type="button"
            onClick={() => {
              if (afficherFormDepot) {
                annulerFormDepot();
              } else {
                setDepotEnEdition(null);
                setAfficherFormDepot(true);
              }
            }}
            className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-2xs text-xs"
          >
            {afficherFormDepot ? '✖' : 'Nouveau'}
          </button>
        )}
      </div>

      <div className="flex justify-start items-center gap-1.5">
        <button
          type="button"
          onClick={() => annulerFormDepot()}
          className={`px-3 py-1.5 rounded-lg font-black text-[11px] transition whitespace-nowrap border shadow-2xs ${
            !afficherFormDepot 
              ? 'bg-orange-600 text-white border-orange-600 shadow-xs' 
              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
          }`}
        >
          📋 Liste des Dépôts [{moduleActuel}] ({depots.length})
        </button>
      </div>

      {afficherFormDepot ? (
        <form onSubmit={enregistrerDepot} className="bg-white border-2 border-orange-500/50 p-3 rounded-xl shadow-md space-y-2.5">
          <div className="flex justify-between items-center pb-1 border-b border-slate-100">
            <span className="font-extrabold text-[11px] text-orange-600 uppercase">
              {depotEnEdition ? `✏️ Modifier : ${depotEnEdition.nom_depot}` : `Nouveau Dépôt / Magasin (${moduleActuel})`}
            </span>
            <button type="button" onClick={annulerFormDepot} className="text-slate-400 hover:text-slate-700 font-bold text-xs p-1">✖</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10px]">
            <div>
              <label className="block font-black text-[9px] uppercase text-slate-700 mb-0.5">Nom Dépôt *</label>
              <input
                type="text"
                required
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
                value={nouveauDepot.adresse_localisation}
                onChange={(e) => setNouveauDepot({ ...nouveauDepot, adresse_localisation: e.target.value.toUpperCase() })}
                placeholder="EX: YAOUNDÉ"
                className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[10px] font-bold uppercase text-slate-900 shadow-xs"
              />
            </div>

            <div>
              <label className="block font-black text-[9px] uppercase text-slate-700 mb-0.5">Responsable</label>
              <select
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
              checked={nouveauDepot.est_depot_par_defaut}
              onChange={(e) => setNouveauDepot({ ...nouveauDepot, est_depot_par_defaut: e.target.checked })}
              className="w-4 h-4 text-orange-600 rounded border-slate-300 cursor-pointer"
            />
            <label htmlFor="est_depot_par_defaut_chk" className="text-[10px] font-black text-slate-900 cursor-pointer">
              ⭐ Définir comme Dépôt Principal unique pour ce module
            </label>
          </div>

          <div className="pt-2 flex justify-between items-center border-t border-slate-200">
            {depotEnEdition && permissions.suppression ? (
              <button 
                type="button" 
                onClick={supprimerDepotDepuisFormulaire} 
                className="bg-red-600 hover:bg-red-700 text-white font-black px-3 py-1.5 rounded-lg text-[10px] shadow-xs"
              >
                🗑️ Supprimer
              </button>
            ) : <div />}

            <div className="flex gap-1.5">
              <button type="button" onClick={annulerFormDepot} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-black px-3 py-1.5 rounded-lg text-[10px]">Annuler</button>
              {(depotEnEdition ? permissions.modification : permissions.creation) && (
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-1.5 rounded-lg text-[10px] shadow-xs">
                  {depotEnEdition ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              )}
            </div>
          </div>
        </form>
      ) : (
        chargement ? (
          <div className="p-4 text-center text-slate-500 font-bold text-xs">Chargement...</div>
        ) : depots.length === 0 ? (
          <div className="p-4 text-center text-slate-500 font-bold text-xs bg-white rounded-xl border border-slate-200">
            Aucun dépôt enregistré pour le module {moduleActuel}.
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
                  <div
                    onClick={() => permissions.modification && ouvrirEdition(dep)}
                    className="p-2.5 cursor-pointer flex items-center justify-between gap-2 hover:bg-orange-50/70 transition select-none"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-base shrink-0">🏢</span>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-[11px] text-slate-900 truncate">{dep.nom_depot}</span>
                          {dep.est_depot_par_defaut && (
                            <span className="bg-amber-100 text-amber-900 text-[8.5px] font-black px-1.5 py-0.5 rounded-full shrink-0 border border-amber-200">Principal</span>
                          )}
                        </div>
                        <p className="text-[9.5px] text-slate-700 truncate mt-0.5 font-bold">
                          Responsable : <strong className="text-orange-700">{dep.responsable_depot || 'NON ASSIGNÉ'}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDepotEmplacements(dep.id);
                        }}
                        className="text-[10px] font-black bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-2xs transition"
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

                      {permissions.creation && (
                        <form
                          onSubmit={(e) => ajouterEmplacement(e, dep)}
                          className="bg-white p-2 rounded-lg border border-slate-300 flex gap-1.5 items-end shadow-2xs"
                        >
                          <div className="flex-1">
                            <label className="block text-[8px] text-slate-700 font-black mb-0.5 uppercase">Emplacement</label>
                            <input
                              type="text"
                              required
                              value={nouveauNomEmplacement}
                              onChange={(e) => setNouveauNomEmplacement(e.target.value.toUpperCase())}
                              placeholder="EX: RAYON A1"
                              className="w-full bg-white border border-slate-300 rounded p-1 text-[10px] font-extrabold uppercase text-slate-900 shadow-xs"
                            />
                          </div>

                          <div className="flex-1">
                            <label className="block text-[8px] text-slate-700 font-black mb-0.5 uppercase">Responsable</label>
                            <div 
                              onClick={() => setModalRespOuverte(true)} 
                              className="w-full bg-white border border-slate-300 rounded p-1 text-[10px] font-extrabold text-slate-900 cursor-pointer truncate shadow-xs"
                            >
                              {responsableEmplacement ? responsableEmplacement : `-- Choisir --`}
                            </div>
                          </div>

                          <button
                            type="submit"
                            className="bg-orange-600 hover:bg-orange-700 text-white font-black px-3 py-1 rounded text-[10px] shadow-xs shrink-0 flex items-center gap-1"
                          >
                            <span>➕</span> Ajouter
                          </button>
                        </form>
                      )}

                      {emplacements.length === 0 ? (
                        <p className="text-center text-slate-500 py-2 font-bold italic text-[10px]">Aucun emplacement enregistré.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {emplacements.map((emp) => (
                            <div
                              key={emp.id}
                              className="bg-white border border-slate-200 p-2 rounded-lg shadow-2xs flex justify-between items-center"
                            >
                              <div className="truncate pr-1">
                                <p className="font-black text-slate-900 text-[10px] truncate">📦 {emp.nom_emplacement}</p>
                                <p className="text-[8.5px] text-slate-600 font-bold truncate">👤 {emp.responsable_emplacement}</p>
                              </div>
                              {permissions.suppression && (
                                <button
                                  onClick={() => supprimerEmplacement(emp.id)}
                                  className="text-red-500 hover:text-red-700 p-1 rounded text-[10px] shrink-0 font-bold"
                                  title="Supprimer"
                                >
                                  🗑️
                                </button>
                              )}
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
        )
      )}

      {modalRespOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-3 space-y-2.5 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-200 pb-2">
              <span className="font-black text-xs text-slate-900 uppercase">SÉLECTIONNER UN RESPONSABLE</span>
              <button type="button" onClick={() => setModalRespOuverte(false)} className="text-slate-400 hover:text-slate-700 font-black text-xs">✕</button>
            </div>
            <input 
              type="text" 
              autoFocus 
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