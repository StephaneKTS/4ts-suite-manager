'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/lib/usePermissions';
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

  const [utilisateurConnecte, setUtilisateurConnecte] = useState('');
  const [emailConnecte, setEmailConnecte] = useState('');

  // États pour le mode hors ligne & synchronisation
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  const [pendingActionsCount, setPendingActionsCount] = useState(0);

  // 🔔 État pour la modale unifiée de confirmation et de succès
  const [etatModale, setEtatModale] = useState({
    ouverte: false,
    titre: '',
    message: '',
    type: 'info', // 'confirmation', 'succes', 'erreur'
    onConfirmer: null
  });

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      verifierEtSynchroniserFileAttente();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    mettreAJourCompteurFileAttente();

    if (typeof window !== 'undefined') {
      const userLocal = localStorage.getItem('utilisateurConnecte') || localStorage.getItem('utilisateur_connecte');
      const emailLocal = localStorage.getItem('emailConnecte') || localStorage.getItem('email_connecte');
      if (userLocal) {
        try {
          const parsed = JSON.parse(userLocal);
          setUtilisateurConnecte((parsed.nom_complet || parsed.nom || userLocal).toUpperCase());
          if (parsed.email) setEmailConnecte(parsed.email);
        } catch {
          setUtilisateurConnecte(userLocal.toUpperCase());
        }
      }
      if (emailLocal) setEmailConnecte(emailLocal);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [entrepriseId, moduleActuel]);

  const mettreAJourCompteurFileAttente = () => {
    try {
      const queue = JSON.parse(localStorage.getItem(`4ts_depots_queue_${entrepriseId}_${moduleActuel}`) || '[]');
      setPendingActionsCount(queue.length);
    } catch (e) {
      setPendingActionsCount(0);
    }
  };

  const ajouterActionHorsLigne = (typeAction, payload) => {
    try {
      const queue = JSON.parse(localStorage.getItem(`4ts_depots_queue_${entrepriseId}_${moduleActuel}`) || '[]');
      queue.push({ id: Date.now(), type: typeAction, payload, timestamp: new Date().toISOString() });
      localStorage.setItem(`4ts_depots_queue_${entrepriseId}_${moduleActuel}`, JSON.stringify(queue));
      mettreAJourCompteurFileAttente();
    } catch (err) {
      console.error('Erreur mise en cache hors ligne dépôts :', err);
    }
  };

  const verifierEtSynchroniserFileAttente = async () => {
    if (!navigator.onLine) return;
    try {
      const queue = JSON.parse(localStorage.getItem(`4ts_depots_queue_${entrepriseId}_${moduleActuel}`) || '[]');
      if (queue.length === 0) return;

      const resteQueue = [];

      for (const action of queue) {
        try {
          if (action.type === 'INSERT_DEPOT') {
            const { error } = await supabase.from('depots_stock').insert([action.payload]);
            if (error) throw error;
          } else if (action.type === 'UPDATE_DEPOT') {
            const { error } = await supabase.from('depots_stock').update(action.payload.data).eq('id', action.payload.id);
            if (error) throw error;
          } else if (action.type === 'DELETE_DEPOT') {
            const { error } = await supabase.from('depots_stock').delete().eq('id', action.payload.id);
            if (error) throw error;
          }
        } catch (err) {
          resteQueue.push(action);
        }
      }

      localStorage.setItem(`4ts_depots_queue_${entrepriseId}_${moduleActuel}`, JSON.stringify(resteQueue));
      mettreAJourCompteurFileAttente();
      if (resteQueue.length === 0) {
        chargerDepots(true);
      }
    } catch (err) {
      console.error('Erreur globale synchronisation dépôts :', err);
    }
  };

  const emailActuel = emailConnecte || '';
  const estSuperAdmin = emailActuel.toLowerCase().trim() === 'stephs7352@gmail.com';

  const { verifierPermission, verifierCreation, verifierModification, verifierSuppression } = usePermissions(
    entrepriseId,
    utilisateurConnecte,
    emailConnecte,
    moduleActuel
  );

  const permissions = {
    lecture: verifierPermission('depots_stock', estSuperAdmin),
    creation: verifierCreation('depots_stock', estSuperAdmin),
    modification: verifierModification('depots_stock', estSuperAdmin),
    suppression: verifierSuppression('depots_stock', estSuperAdmin),
  };

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

  const [nouveauDepot, setNouveauDepot] = useState({
    nom_depot: '',
    adresse_localisation: '',
    responsable_depot: '',
    est_depot_par_defaut: false,
  });

  const listePersonnel = [
    { id: '1', nom: 'THÉODORE STÉPHANE' },
    { id: '2', nom: 'ORNELLA' },
    { id: '3', nom: 'RESPONSABLE MAGASIN A' },
  ];

  const chargerDepots = async (silencieux = false) => {
    const donneesLocales = localSync.recupererDonneesLocales(cleCacheDepots);
    if (donneesLocales && donneesLocales.length > 0) {
      setDepots(donneesLocales);
      setChargement(false);
    } else if (!silencieux) {
      setChargement(true);
    }

    try {
      let listeDepots = [];
      let mapEmplacements = {};

      if (!navigator.onLine) {
        listeDepots = donneesLocales || [];
        mapEmplacements = localSync.recupererDonneesLocales(cleCacheEmplacements) || {};
      } else {
        const { data: dataDepots, error: errDepots } = await supabase
          .from('depots_stock')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .eq('module', moduleActuel)
          .order('created_at', { ascending: false });

        if (errDepots) throw errDepots;
        listeDepots = dataDepots || [];

        const { data: dataEmpls, error: errEmpls } = await supabase
          .from('emplacements_stock')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .eq('module', moduleActuel);

        if (errEmpls) throw errEmpls;

        (dataEmpls || []).forEach((emp) => {
          if (!mapEmplacements[emp.id_depot]) {
            mapEmplacements[emp.id_depot] = [];
          }
          mapEmplacements[emp.id_depot].push(emp);
        });
      }

      setDepots(listeDepots);
      localSync.sauvegarderDonneesLocales(cleCacheDepots, listeDepots);

      setEmplacementsParDepot(mapEmplacements);
      localSync.sauvegarderDonneesLocales(cleCacheEmplacements, mapEmplacements);
    } catch (err) {
      console.error('Erreur chargement dépôts Supabase :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDepots();
    localSync.synchroniserVersCloud(supabase);
  }, [entrepriseId, moduleActuel]);

  const preparerEnregistrementDepot = (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;

    if (depotEnEdition && !permissions.modification) {
      setEtatModale({ ouverte: true, titre: 'Action non autorisée', message: 'Modification interdite par votre profil.', type: 'erreur', onConfirmer: null });
      return;
    }
    if (!depotEnEdition && !permissions.creation) {
      setEtatModale({ ouverte: true, titre: 'Action non autorisée', message: 'Création interdite par votre profil.', type: 'erreur', onConfirmer: null });
      return;
    }

    const nomDepotClean = nouveauDepot.nom_depot.trim().toUpperCase();
    if (!nomDepotClean) return;

    if (!depotEnEdition) {
      const depotExistant = depots.find(d => 
        (d.nom_depot || d.Nom_Depot || '').trim().toUpperCase() === nomDepotClean
      );
      if (depotExistant) {
        setEtatModale({ ouverte: true, titre: 'Doublon détecté', message: `Un dépôt nommé "${nomDepotClean}" existe déjà. La création d'un doublon a été bloquée.`, type: 'erreur', onConfirmer: null });
        return;
      }
    }

    setEtatModale({
      ouverte: true,
      titre: 'Confirmation requise',
      message: `Voulez-vous véritablement valider et enregistrer le dépôt "${nomDepotClean}" ?`,
      type: 'confirmation',
      onConfirmer: executerEnregistrementDepot
    });
  };

  const executerEnregistrementDepot = async () => {
    if (enTrainDeSauvegarder) return;

    const nomDepotClean = nouveauDepot.nom_depot.trim().toUpperCase();

    setEnTrainDeSauvegarder(true);
    try {
      if (nouveauDepot.est_depot_par_defaut && navigator.onLine) {
        await supabase
          .from('depots_stock')
          .update({ est_depot_par_defaut: false })
          .eq('id_entreprise', entrepriseId)
          .eq('module', moduleActuel);
      }

      const payload = {
        nom_depot: nomDepotClean,
        adresse_localisation: nouveauDepot.adresse_localisation.trim().toUpperCase(),
        responsable_depot: nouveauDepot.responsable_depot,
        est_depot_par_defaut: nouveauDepot.est_depot_par_defaut,
        id_entreprise: entrepriseId,
        module: moduleActuel,
      };

      if (depotEnEdition) {
        const depotIdCible = depotEnEdition.id || depotEnEdition.ID;
        payload.id = depotIdCible;

        if (!navigator.onLine) {
          ajouterActionHorsLigne('UPDATE_DEPOT', { id: depotIdCible, data: payload });
          const listeMaj = depots.map(d => (d.id || d.ID) === depotIdCible ? { ...d, ...payload } : d);
          setDepots(listeMaj);
          localSync.sauvegarderDonneesLocales(cleCacheDepots, listeMaj);
          annulerFormDepot();
          setEnTrainDeSauvegarder(false);
          setEtatModale({ ouverte: true, titre: 'Mode Hors Ligne', message: 'Dépôt mis à jour localement.', type: 'succes', onConfirmer: null });
          return;
        }

        const { error } = await supabase
          .from('depots_stock')
          .update(payload)
          .eq('id', depotIdCible);

        if (error) throw error;

        const listeMaj = depots.map(d => (d.id || d.ID) === depotIdCible ? { ...d, ...payload } : d);
        setDepots(listeMaj);
        localSync.sauvegarderDonneesLocales(cleCacheDepots, listeMaj);

      } else {
        const idTemp = 'temp_' + Date.now();
        const nouvelObjet = { ...payload, id: idTemp, created_at: new Date().toISOString() };
        
        if (!navigator.onLine) {
          ajouterActionHorsLigne('INSERT_DEPOT', nouvelObjet);
          const listeMaj = [nouvelObjet, ...depots];
          setDepots(listeMaj);
          localSync.sauvegarderDonneesLocales(cleCacheDepots, listeMaj);
          annulerFormDepot();
          setEnTrainDeSauvegarder(false);
          setEtatModale({ ouverte: true, titre: 'Mode Hors Ligne', message: 'Dépôt enregistré localement.', type: 'succes', onConfirmer: null });
          return;
        }

        const { error } = await supabase
          .from('depots_stock')
          .insert([payload]);

        if (error) throw error;

        const listeMaj = [nouvelObjet, ...depots];
        setDepots(listeMaj);
        localSync.sauvegarderDonneesLocales(cleCacheDepots, listeMaj);
      }

      localStorage.removeItem(cleCacheDepots);
      annulerFormDepot();
      await chargerDepots(true);

      setEtatModale({
        ouverte: true,
        titre: 'Opération réussie',
        message: 'Dépôt enregistré avec succès !',
        type: 'succes',
        onConfirmer: null
      });

    } catch (err) {
      setEtatModale({ ouverte: true, titre: 'Erreur', message: 'Erreur lors de l’enregistrement : ' + err.message, type: 'erreur', onConfirmer: null });
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const ouvrirEdition = (depot) => {
    if (enTrainDeSauvegarder) return;
    if (!permissions.modification) {
      setEtatModale({ ouverte: true, titre: 'Action non autorisée', message: 'Vous n’avez pas le droit de modifier les dépôts.', type: 'erreur', onConfirmer: null });
      return;
    }
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

  const preparerSuppressionDepot = () => {
    if (enTrainDeSauvegarder) return;
    if (!permissions.suppression) {
      setEtatModale({ ouverte: true, titre: 'Action non autorisée', message: 'Suppression interdite par votre profil.', type: 'erreur', onConfirmer: null });
      return;
    }
    if (!depotEnEdition) {
      setEtatModale({ ouverte: true, titre: 'Attention', message: 'Aucun dépôt sélectionné pour la suppression.', type: 'erreur', onConfirmer: null });
      return;
    }

    if (!navigator.onLine) {
      setEtatModale({ ouverte: true, titre: 'Hors ligne', message: 'Impossible de supprimer un dépôt en mode hors ligne.', type: 'erreur', onConfirmer: null });
      return;
    }

    const depotNomCible = depotEnEdition.nom_depot || depotEnEdition.Nom_Depot || 'ce dépôt';

    setEtatModale({
      ouverte: true,
      titre: 'Confirmation de suppression',
      message: `Voulez-vous vraiment supprimer définitivement le dépôt "${depotNomCible}" et ses emplacements ?`,
      type: 'confirmation',
      onConfirmer: executerSuppressionDepot
    });
  };

  const executerSuppressionDepot = async () => {
    const depotIdCible = depotEnEdition.id || depotEnEdition.ID;
    const depotNomCible = depotEnEdition.nom_depot || depotEnEdition.Nom_Depot || 'ce dépôt';

    setEnTrainDeSauvegarder(true);
    try {
      const { count: countSource, error: errSrc } = await supabase
        .from('mouvements_stock')
        .select('*', { count: 'exact', head: true })
        .eq('id_depot_source', depotIdCible);

      const { count: countDest, error: errDest } = await supabase
        .from('mouvements_stock')
        .select('*', { count: 'exact', head: true })
        .eq('id_depot_destination', depotIdCible);

      if (!errSrc && !errDest && ((countSource || 0) > 0 || (countDest || 0) > 0)) {
        setEtatModale({ 
          ouverte: true, 
          titre: 'Suppression bloquée', 
          message: `Impossible de supprimer ! Le dépôt "${depotNomCible}" a déjà enregistré au moins un mouvement de stock.`, 
          type: 'erreur', 
          onConfirmer: null 
        });
        setEnTrainDeSauvegarder(false);
        return;
      }

      await supabase
        .from('emplacements_stock')
        .delete()
        .eq('id_depot', depotIdCible);

      const { error: errDep } = await supabase
        .from('depots_stock')
        .delete()
        .eq('id', depotIdCible);

      if (errDep) throw errDep;
      
      const listeMaj = depots.filter(d => (d.id || d.ID) !== depotIdCible);
      setDepots(listeMaj);
      localSync.sauvegarderDonneesLocales(cleCacheDepots, listeMaj);

      localStorage.removeItem(cleCacheDepots);
      if (depotOuvertId === depotIdCible) setDepotOuvertId(null);
      annulerFormDepot();
      await chargerDepots(true);

      setEtatModale({
        ouverte: true,
        titre: 'Succès',
        message: 'Dépôt et ses emplacements associés supprimés avec succès.',
        type: 'succes',
        onConfirmer: null
      });

    } catch (err) {
      setEtatModale({ ouverte: true, titre: 'Erreur', message: 'Erreur lors de la suppression : ' + err.message, type: 'erreur', onConfirmer: null });
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const depotsAffiches = depots.slice(0, limiteDepots);

  return (
    <div className="space-y-2.5 font-sans text-xs">
      
      {/* BANDEAU DE STATUT CONNEXION ÉPURÉ */}
      <div className={`flex justify-between items-center px-3 py-1 rounded-lg text-[10px] font-bold ${isOnline ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'}`}>
        <div className="flex items-center gap-1.5">
          <span>{isOnline ? '🟢' : '🔴'}</span>
          <span>{isOnline ? 'En ligne' : 'Hors ligne'}</span>
        </div>
        {pendingActionsCount > 0 && (
          <button 
            type="button" 
            onClick={verifierEtSynchroniserFileAttente}
            className="bg-amber-600 hover:bg-amber-500 text-white px-2 py-0.5 rounded font-black uppercase text-[9px] cursor-pointer flex items-center gap-1"
          >
            <span>🔄</span> <span>({pendingActionsCount})</span>
          </button>
        )}
      </div>

      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-slate-900 uppercase text-xs flex items-center gap-1.5">
            <span>🏢</span> GESTION DES DÉPÔTS ({depotsAffiches.length} / {depots.length})
          </h3>
          {utilisateurConnecte && (
            <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold border border-slate-200">
              Utilisateur : {utilisateurConnecte}
            </span>
          )}
        </div>
        
        {permissions.creation && (
          <button
            type="button"
            disabled={enTrainDeSauvegarder}
            onClick={() => {
              if (enTrainDeSauvegarder) return;
              setDepotEnEdition(null);
              setNouveauDepot({ nom_depot: '', adresse_localisation: '', responsable_depot: '', est_depot_par_defaut: false });
              setAfficherFormDepot(true);
            }}
            className="bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-2xs text-xs cursor-pointer"
          >
            ＋ Nouveau
          </button>
        )}
      </div>

      {chargement && depots.length === 0 ? (
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

            return (
              <div
                key={depId}
                className="bg-white border border-slate-200 rounded-xl transition overflow-hidden shadow-2xs"
              >
                <div
                  onClick={() => !enTrainDeSauvegarder && permissions.modification && ouvrirEdition(dep)}
                  className={`p-2.5 flex items-center justify-between gap-2 transition select-none ${permissions.modification ? 'hover:bg-orange-50/70 cursor-pointer' : 'cursor-default'}`}
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
                </div>
              </div>
            );
          })}

          {limiteDepots < depots.length && (
            <div className="text-center pt-2 pb-2">
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={() => setLimiteDepots(prev => prev + 20)}
                className="bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 font-extrabold px-4 py-2 rounded-xl text-xs transition shadow-xs border border-slate-300 w-full cursor-pointer"
              >
                📥 Charger 20 dépôts de plus ({depots.length - limiteDepots} restants)
              </button>
            </div>
          )}
        </div>
      )}

      {/* 🪟 MODALE DE FORMULAIRE (CRÉATION / MODIFICATION) */}
      {afficherFormDepot && permissions.creation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-3 animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border-3 border-[#0a1931] overflow-hidden flex flex-col">
            
            <div className="p-3.5 flex justify-between items-center text-xs font-black bg-[#0a1931] text-white border-b-2 border-blue-900">
              <span>{depotEnEdition ? `MODIFIER UN DÉPÔT` : `CRÉER UN DÉPÔT`}</span>
              <button disabled={enTrainDeSauvegarder} onClick={annulerFormDepot} className="text-slate-300 hover:text-white font-black text-sm cursor-pointer p-1">✕</button>
            </div>

            <form onSubmit={preparerEnregistrementDepot} className="p-4 space-y-3.5">
              <div>
                <label className="block font-black text-[9px] uppercase text-[#0a1931] mb-1">Nom Dépôt *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  disabled={enTrainDeSauvegarder}
                  value={nouveauDepot.nom_depot}
                  onChange={(e) => setNouveauDepot({ ...nouveauDepot, nom_depot: e.target.value.toUpperCase() })}
                  placeholder="EX: MAGASIN PRINCIPAL"
                  className="w-full bg-white border-2 border-slate-400 rounded-lg p-2 text-xs font-black uppercase text-black shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-black text-[9px] uppercase text-[#0a1931] mb-1">Localisation</label>
                <input
                  type="text"
                  disabled={enTrainDeSauvegarder}
                  value={nouveauDepot.adresse_localisation}
                  onChange={(e) => setNouveauDepot({ ...nouveauDepot, adresse_localisation: e.target.value.toUpperCase() })}
                  placeholder="EX: YAOUNDÉ"
                  className="w-full bg-white border-2 border-slate-400 rounded-lg p-2 text-xs font-black uppercase text-black shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-black text-[9px] uppercase text-[#0a1931] mb-1">Responsable</label>
                <select
                  disabled={enTrainDeSauvegarder}
                  value={nouveauDepot.responsable_depot}
                  onChange={(e) => setNouveauDepot({ ...nouveauDepot, responsable_depot: e.target.value })}
                  className="w-full bg-white border-2 border-slate-400 rounded-lg p-2 text-xs font-black text-black shadow-xs cursor-pointer focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="">-- Choisir --</option>
                  {listePersonnel.map((p) => (
                    <option key={p.id} value={p.nom}>{p.nom}</option>
                  ))}
                </select>
              </div>

              <div className="p-2.5 rounded-xl border-2 border-orange-300 bg-orange-50/70 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="est_depot_par_defaut_chk"
                  disabled={enTrainDeSauvegarder}
                  checked={nouveauDepot.est_depot_par_defaut}
                  onChange={(e) => setNouveauDepot({ ...nouveauDepot, est_depot_par_defaut: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded border-slate-500 focus:ring-orange-500 cursor-pointer"
                />
                <label htmlFor="est_depot_par_defaut_chk" className="text-xs font-black text-slate-900 cursor-pointer select-none leading-tight">
                  ⭐ Définir comme Dépôt Principal unique
                </label>
              </div>

              <div className="pt-2 border-t-2 border-slate-400/40 flex justify-between items-center">
                {depotEnEdition && permissions.suppression ? (
                  <button 
                    type="button" 
                    disabled={enTrainDeSauvegarder}
                    onClick={preparerSuppressionDepot} 
                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-black px-3.5 py-2 rounded-lg text-xs shadow-md cursor-pointer transition"
                  >
                    {enTrainDeSauvegarder ? 'Patientez...' : '🗑️ Supprimer'}
                  </button>
                ) : <div />}

                <div className="flex gap-2 ml-auto">
                  <button 
                    type="button" 
                    disabled={enTrainDeSauvegarder} 
                    onClick={annulerFormDepot} 
                    className="bg-slate-200 text-slate-900 border-2 border-slate-400 hover:bg-slate-300 font-bold px-4 py-2 rounded-lg text-xs transition cursor-pointer"
                  >
                    Annuler
                  </button>
                  
                  {permissions.modification && (
                    <button 
                      type="submit" 
                      disabled={enTrainDeSauvegarder}
                      className="bg-[#0a1931] hover:bg-[#132d5c] text-white border-2 border-[#0a1931] font-black px-5 py-2 rounded-lg text-xs shadow-md transition cursor-pointer"
                    >
                      {enTrainDeSauvegarder ? 'Enregistrement...' : '✅ Enregistrer'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔔 MODALE UNIFIÉE (CONFIRMATION -> SUCCÈS -> ERREUR) */}
      {etatModale.ouverte && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white border-2 border-[#0a1931] text-[#0a1931] rounded-2xl max-w-sm w-full p-5 space-y-4 text-center shadow-2xl">
            
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl font-black ${
              etatModale.type === 'confirmation' ? 'bg-amber-500/20 text-amber-600 border-2 border-amber-500/40' :
              etatModale.type === 'succes' ? 'bg-emerald-500/20 text-emerald-600 border-2 border-emerald-500/40' : 'bg-rose-500/20 text-rose-600 border-2 border-rose-500/40'
            }`}>
              {etatModale.type === 'confirmation' ? '❓' :
               etatModale.type === 'succes' ? '✓' : '⚠️'}
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-sm uppercase tracking-wider text-[#0a1931]">
                {etatModale.titre}
              </h4>
              <p className="text-xs font-semibold leading-relaxed text-slate-800">
                {etatModale.message}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              {etatModale.type === 'confirmation' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setEtatModale({ ...etatModale, ouverte: false })}
                    className="flex-1 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer border-2 bg-slate-200 text-slate-900 border-slate-400 hover:bg-slate-300"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const action = etatModale.onConfirmer;
                      setEtatModale({ ...etatModale, ouverte: false });
                      if (action) action();
                    }}
                    className="flex-1 font-black py-2.5 rounded-xl text-xs shadow-md transition cursor-pointer border-2 bg-[#0a1931] hover:bg-[#132d5c] text-white border-[#0a1931]"
                  >
                    Confirmer
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setEtatModale({ ...etatModale, ouverte: false })}
                  className="w-full font-black py-2.5 rounded-xl text-xs transition shadow-md cursor-pointer border-2 bg-[#0a1931] hover:bg-[#132d5c] text-white border-[#0a1931]"
                >
                  Compris 👍
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}