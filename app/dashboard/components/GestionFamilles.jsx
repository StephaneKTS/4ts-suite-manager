'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/lib/usePermissions';
import { localSync } from '@/lib/localSync';

export default function GestionFamilles({ entrepriseId = '4TS-TEST', isDarkMode = false }) {
  const [familles, setFamilles] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);
  const [afficherModalForm, setAfficherModalForm] = useState(false);
  const [familleSelectionnee, setFamilleSelectionnee] = useState(null);
  
  // 🔔 États pour les modales de confirmation et de succès stylisées
  const [etatModale, setEtatModale] = useState({
    ouverte: false,
    titre: '',
    message: '',
    type: 'info', // 'confirmation', 'succes', 'erreur'
    onConfirmer: null
  });

  // États pour le mode hors ligne & synchronisation
  const [isOnline, setIsOnline] = useState(typeof window !== 'undefined' ? navigator.onLine : true);
  const [pendingActionsCount, setPendingActionsCount] = useState(0);

  const [utilisateurConnecte, setUtilisateurConnecte] = useState('');
  const [emailConnecte, setEmailConnecte] = useState('');

  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();
  const cleCacheFamilles = `cache_familles_${entrepriseId}_${moduleActuel}`;

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
      const queue = JSON.parse(localStorage.getItem(`4ts_familles_queue_${entrepriseId}_${moduleActuel}`) || '[]');
      setPendingActionsCount(queue.length);
    } catch (e) {
      setPendingActionsCount(0);
    }
  };

  const ajouterActionHorsLigne = (typeAction, payload) => {
    try {
      const queue = JSON.parse(localStorage.getItem(`4ts_familles_queue_${entrepriseId}_${moduleActuel}`) || '[]');
      queue.push({ id: Date.now(), type: typeAction, payload, timestamp: new Date().toISOString() });
      localStorage.setItem(`4ts_familles_queue_${entrepriseId}_${moduleActuel}`, JSON.stringify(queue));
      mettreAJourCompteurFileAttente();
    } catch (err) {
      console.error('Erreur mise en cache hors ligne familles :', err);
    }
  };

  const verifierEtSynchroniserFileAttente = async () => {
    if (!navigator.onLine) return;
    try {
      const queue = JSON.parse(localStorage.getItem(`4ts_familles_queue_${entrepriseId}_${moduleActuel}`) || '[]');
      if (queue.length === 0) return;

      const resteQueue = [];

      for (const action of queue) {
        try {
          if (action.type === 'INSERT_FAMILLE') {
            const { error } = await supabase.from('familles_articles').insert([action.payload]);
            if (error) throw error;
          } else if (action.type === 'UPDATE_FAMILLE') {
            const { error } = await supabase.from('familles_articles').update(action.payload.data).eq('id', action.payload.id);
            if (error) throw error;
          } else if (action.type === 'DELETE_FAMILLE') {
            const { error } = await supabase.from('familles_articles').delete().eq('id', action.payload.id);
            if (error) throw error;
          }
        } catch (err) {
          resteQueue.push(action);
        }
      }

      localStorage.setItem(`4ts_familles_queue_${entrepriseId}_${moduleActuel}`, JSON.stringify(resteQueue));
      mettreAJourCompteurFileAttente();
      if (resteQueue.length === 0) {
        chargerFamilles();
      }
    } catch (err) {
      console.error('Erreur globale synchronisation familles :', err);
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
    lecture: verifierPermission('familles_articles', estSuperAdmin),
    creation: verifierCreation('familles_articles', estSuperAdmin),
    modification: verifierModification('familles_articles', estSuperAdmin),
    suppression: verifierSuppression('familles_articles', estSuperAdmin),
  };

  const [limiteFamilles, setLimiteFamilles] = useState(20);
  const [nouveauFamille, setNouveauFamille] = useState({ nom_famille: '', suivi_stock: true });

  const chargerFamilles = async () => {
    const cacheLocal = localSync.recupererDonneesLocales(cleCacheFamilles);
    if (cacheLocal && cacheLocal.length > 0) {
      setFamilles(cacheLocal);
      setChargement(false);
    } else {
      setChargement(true);
    }

    try {
      let listeFinale = [];
      if (!navigator.onLine) {
        listeFinale = cacheLocal || [];
      } else {
        let { data, error } = await supabase
          .from('familles_articles')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .eq('module', moduleActuel)
          .order('created_at', { ascending: false });

        if (error && error.message.includes('column')) {
          const resSecours = await supabase
            .from('familles_articles')
            .select('*')
            .eq('id_entreprise', entrepriseId)
            .order('created_at', { ascending: false });
          
          if (resSecours.error) throw resSecours.error;
          data = resSecours.data;
        } else if (error) {
          throw error;
        }
        listeFinale = data || [];
      }

      setFamilles(listeFinale);
      localSync.sauvegarderDonneesLocales(cleCacheFamilles, listeFinale);
    } catch (err) {
      console.error('Erreur chargement familles Supabase :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    if (entrepriseId) {
      chargerFamilles();
      localSync.synchroniserVersCloud(supabase);
    }
  }, [entrepriseId, moduleActuel]);

  const preparerEnregistrement = (e) => {
    if (e) e.preventDefault();
    
    if (familleSelectionnee && !permissions.modification) {
      setEtatModale({ ouverte: true, titre: 'Action non autorisée', message: 'Modification interdite par votre profil.', type: 'erreur', onConfirmer: null });
      return;
    }
    if (!familleSelectionnee && !permissions.creation) {
      setEtatModale({ ouverte: true, titre: 'Action non autorisée', message: 'Création interdite par votre profil.', type: 'erreur', onConfirmer: null });
      return;
    }

    if (!nouveauFamille.nom_famille.trim()) {
      setEtatModale({ ouverte: true, titre: 'Champ requis', message: 'Veuillez renseigner le nom de la famille.', type: 'erreur', onConfirmer: null });
      return;
    }

    setEtatModale({
      ouverte: true,
      titre: 'Confirmation requise',
      message: `Voulez-vous véritablement valider et enregistrer cette famille ("${nouveauFamille.nom_famille}") ?`,
      type: 'confirmation',
      onConfirmer: executerEnregistrementFamille
    });
  };

  const executerEnregistrementFamille = async () => {
    if (enTrainDeSauvegarder) return;

    setEnTrainDeSauvegarder(true);
    try {
      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        nom_famille: nouveauFamille.nom_famille.trim().toUpperCase(),
        suivi_stock: nouveauFamille.suivi_stock ?? true,
      };

      if (familleSelectionnee) {
        if (!navigator.onLine) {
          ajouterActionHorsLigne('UPDATE_FAMILLE', { id: familleSelectionnee.id, data: payload });
          const listeMaj = familles.map(f => f.id === familleSelectionnee.id ? { ...f, ...payload } : f);
          setFamilles(listeMaj);
          localSync.sauvegarderDonneesLocales(cleCacheFamilles, listeMaj);
          reinitialiser();
          setAfficherModalForm(false);
          setEnTrainDeSauvegarder(false);
          setEtatModale({ ouverte: true, titre: 'Mode Hors Ligne', message: 'Famille mise à jour localement avec succès.', type: 'succes', onConfirmer: null });
          return;
        }

        const { error } = await supabase
          .from('familles_articles')
          .update(payload)
          .eq('id', familleSelectionnee.id);

        if (error) throw error;
      } else {
        if (!navigator.onLine) {
          const fakeId = 'local_' + Date.now();
          const familleLocale = { ...payload, id: fakeId, created_at: new Date().toISOString() };
          ajouterActionHorsLigne('INSERT_FAMILLE', familleLocale);
          const listeMaj = [familleLocale, ...familles];
          setFamilles(listeMaj);
          localSync.sauvegarderDonneesLocales(cleCacheFamilles, listeMaj);
          reinitialiser();
          setAfficherModalForm(false);
          setEnTrainDeSauvegarder(false);
          setEtatModale({ ouverte: true, titre: 'Mode Hors Ligne', message: 'Famille créée localement avec succès.', type: 'succes', onConfirmer: null });
          return;
        }

        const { error } = await supabase.from('familles_articles').insert([payload]);

        if (error) throw error;
      }

      if (typeof window !== 'undefined') localStorage.removeItem(cleCacheFamilles);
      reinitialiser();
      await chargerFamilles();
      setAfficherModalForm(false);

      setEtatModale({
        ouverte: true,
        titre: 'Opération réussie',
        message: 'Famille enregistrée avec succès !',
        type: 'succes',
        onConfirmer: null
      });

    } catch (err) {
      setEtatModale({
        ouverte: true,
        titre: 'Erreur',
        message: 'Erreur : ' + err.message,
        type: 'erreur',
        onConfirmer: null
      });
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const reinitialiser = () => {
    if (enTrainDeSauvegarder) return;
    setFamilleSelectionnee(null);
    setNouveauFamille({ nom_famille: '', suivi_stock: true });
  };

  const ouvrirFicheDetail = (famille) => {
    if (enTrainDeSauvegarder) return;
    if (!permissions.modification) {
      setEtatModale({ ouverte: true, titre: 'Action non autorisée', message: 'Vous n’avez pas le droit de modifier les familles.', type: 'erreur', onConfirmer: null });
      return;
    }
    setFamilleSelectionnee(famille);
    setNouveauFamille({ 
      nom_famille: famille.nom_famille || '', 
      suivi_stock: famille.suivi_stock ?? true 
    });
    setAfficherModalForm(true);
  };

  const supprimerFamille = async () => {
    if (enTrainDeSauvegarder || !familleSelectionnee) return;
    if (!permissions.suppression) {
      setEtatModale({ ouverte: true, titre: 'Action non autorisée', message: 'Suppression interdite par votre profil.', type: 'erreur', onConfirmer: null });
      return;
    }

    if (!navigator.onLine) {
      setEtatModale({ ouverte: true, titre: 'Action impossible', message: 'Impossible de supprimer une famille en mode hors ligne.', type: 'erreur', onConfirmer: null });
      return;
    }

    setEtatModale({
      ouverte: true,
      titre: 'Confirmer la suppression',
      message: `Voulez-vous vraiment supprimer définitivement la famille "${familleSelectionnee.nom_famille}" ?`,
      type: 'confirmation',
      onConfirmer: async () => {
        setEnTrainDeSauvegarder(true);
        try {
          let articlesRattaches = [];

          const { data: articlesRattachesRpc, error: rpcError } = await supabase.rpc('verifier_articles_famille', {
            p_entreprise_id: entrepriseId,
            p_module: moduleActuel,
            p_famille_id: familleSelectionnee.id
          });

          if (rpcError) {
            const { data: tousLesArticles, error: errArticles } = await supabase
              .from('articles_stock')
              .select('*')
              .eq('id_entreprise', entrepriseId)
              .eq('module', moduleActuel);

            if (errArticles) throw errArticles;

            const idFamilleStr = String(familleSelectionnee.id);
            const nomFamilleStr = String(familleSelectionnee.nom_famille || '').trim().toUpperCase();

            articlesRattaches = (tousLesArticles || []).filter((art) => {
              const valIdFamille = String(art.id_famille || art.famille_id || art.Famille || art.famille || '');
              const valNomFamille = String(art.nom_famille || art.libelle_famille || '').trim().toUpperCase();

              return valIdFamille === idFamilleStr || valIdFamille.toUpperCase() === nomFamilleStr || valNomFamille === nomFamilleStr;
            });
          } else {
            articlesRattaches = articlesRattachesRpc || [];
          }

          if (articlesRattaches.length > 0) {
            const exempleArticle = articlesRattaches[0].Designation || articlesRattaches[0].designation || 'ARTICLE';
            setEtatModale({
              ouverte: true,
              titre: 'Suppression bloquée',
              message: `Cette famille ("${familleSelectionnee.nom_famille}") contient encore ${articlesRattaches.length} article(s) rattaché(s) (ex: "${exempleArticle}").`,
              type: 'erreur',
              onConfirmer: null
            });
            setEnTrainDeSauvegarder(false);
            return;
          }

          const { error } = await supabase.from('familles_articles').delete().eq('id', familleSelectionnee.id);
          if (error) throw error;

          if (typeof window !== 'undefined') localStorage.removeItem(cleCacheFamilles);

          reinitialiser();
          setAfficherModalForm(false);
          await chargerFamilles();

          setEtatModale({
            ouverte: true,
            titre: 'Succès',
            message: 'Famille supprimée avec succès.',
            type: 'succes',
            onConfirmer: null
          });
        } catch (err) {
          setEtatModale({
            ouverte: true,
            titre: 'Erreur',
            message: 'Erreur : ' + err.message,
            type: 'erreur',
            onConfirmer: null
          });
        } finally {
          setEnTrainDeSauvegarder(false);
        }
      }
    });
  };

  const famillesAffichees = familles.slice(0, limiteFamilles);

  // 🎨 STYLING HARMONISÉ
  const cardStyle = 'bg-white rounded-xl border border-slate-200 shadow-2xs';
  const inputStyle = 'w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold text-slate-900 text-[10px] focus:ring-1 focus:ring-orange-500 focus:outline-none uppercase';
  const tableHeaderStyle = 'bg-slate-50 text-slate-700 uppercase text-[8.5px] font-extrabold border-b border-slate-200';

  return (
    <div className="space-y-2 font-sans text-[10px]">
      
      {/* BANDEAU DE STATUT CONNEXION */}
      <div className={`flex justify-between items-center px-3 py-1 rounded-xl text-[9.5px] font-bold border ${isOnline ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
        <div className="flex items-center gap-1.5">
          <span>{isOnline ? '🟢' : '🔴'}</span>
          <span>{isOnline ? 'En ligne' : 'Hors ligne'}</span>
        </div>
        {pendingActionsCount > 0 && (
          <button 
            type="button" 
            onClick={verifierEtSynchroniserFileAttente}
            className="bg-orange-600 hover:bg-orange-700 text-white px-2 py-0.5 rounded font-black uppercase text-[9px] cursor-pointer flex items-center gap-1"
          >
            <span>🔄</span> <span>({pendingActionsCount})</span>
          </button>
        )}
      </div>

      {/* EN-TÊTE PRINCIPAL */}
      <div className={`flex justify-between items-center p-2 gap-2 flex-wrap ${cardStyle}`}>
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          <span className="font-extrabold uppercase text-slate-900 text-[10.5px] truncate">
            🏷️ GESTION DES FAMILLES D'ARTICLES ({famillesAffichees.length} / {familles.length})
          </span>
          {utilisateurConnecte && (
            <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold border border-slate-200 shrink-0">
              {utilisateurConnecte}
            </span>
          )}
        </div>
        {permissions.creation && (
          <button
            type="button"
            disabled={enTrainDeSauvegarder}
            onClick={() => {
              reinitialiser();
              setAfficherModalForm(true);
            }}
            className="py-1.5 px-3 rounded-lg font-black transition text-center text-[10px] uppercase flex items-center justify-center gap-1 border bg-orange-600 hover:bg-orange-700 text-white border-orange-700 shadow-xs cursor-pointer"
          >
            <span>＋</span> Nouveau
          </button>
        )}
      </div>

      <div className="flex justify-start items-center gap-1.5">
        <button
          type="button"
          disabled={enTrainDeSauvegarder}
          onClick={() => { reinitialiser(); }}
          className="py-1.5 px-3 rounded-xl font-black transition text-center text-[9.5px] uppercase border bg-slate-900 text-white border-slate-900 shadow-2xs cursor-pointer"
        >
          📋 Liste des familles ({familles.length})
        </button>
      </div>

      {/* TABLEAU DE LA LISTE AVEC FORMAT ID-XX */}
      <div className="space-y-2">
        <div className={`overflow-x-auto ${cardStyle}`}>
          <table className="w-full text-left text-[9.5px]">
            <thead>
              <tr className={tableHeaderStyle}>
                <th className="p-2 w-24 text-center">ID Famille</th>
                <th className="p-2">Famille</th>
                <th className="p-2 text-center">Suivi de stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[9.5px] text-slate-900 bg-white">
              {chargement && familles.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-4 text-center text-slate-400 font-bold">Chargement...</td>
                </tr>
              ) : famillesAffichees.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-4 text-center font-bold text-slate-500">Aucune famille d'articles enregistrée.</td>
                </tr>
              ) : (
                famillesAffichees.map((fam) => (
                  <tr
                    key={fam.id}
                    onClick={() => !enTrainDeSauvegarder && permissions.modification && ouvrirFicheDetail(fam)}
                    className={`transition select-none ${permissions.modification ? 'hover:bg-orange-50/70 cursor-pointer' : 'cursor-default'}`}
                  >
                    <td className="p-2 text-center font-mono font-black text-orange-600 bg-slate-50/70 border-r border-slate-100">
                      ID-{fam.id}
                    </td>
                    <td className="p-2 font-extrabold uppercase text-slate-900 truncate">
                      🏷️ {fam.nom_famille}
                    </td>
                    <td className="p-2 text-center">
                      {fam.suivi_stock !== false ? (
                        <span className="bg-emerald-50 text-emerald-700 font-black px-2 py-0.5 rounded-full text-[9px] border border-emerald-200">
                          Oui (Suivi)
                        </span>
                      ) : (
                        <span className="font-bold px-2 py-0.5 rounded-full text-[9px] bg-slate-100 text-slate-600 border border-slate-200">
                          Non (Libre)
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {limiteFamilles < familles.length && (
          <div className="text-center pt-1 pb-2">
            <button
              type="button"
              disabled={enTrainDeSauvegarder}
              onClick={() => setLimiteFamilles(prev => prev + 20)}
              className="bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 font-extrabold px-4 py-1.5 rounded-xl text-[9.5px] transition shadow-2xs border border-slate-300 w-full cursor-pointer"
            >
              📥 Charger 20 familles de plus ({familles.length - limiteFamilles} restantes)
            </button>
          </div>
        )}
      </div>

      {/* 🪟 MODALE DE SAISIE / CRÉATION / MODIFICATION */}
      {afficherModalForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            
            <div className="p-3.5 border-b border-slate-100 flex justify-between items-center">
              <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                <span>🏷️</span> {familleSelectionnee ? `MODIFIER LA FAMILLE (ID-${familleSelectionnee.id})` : 'NOUVELLE FAMILLE D\'ARTICLES'}
              </h4>
              <button disabled={enTrainDeSauvegarder} onClick={() => { reinitialiser(); setAfficherModalForm(false); }} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100 transition cursor-pointer">✕</button>
            </div>

            <form onSubmit={preparerEnregistrement} className="p-4 space-y-3 text-[10px]">
              {familleSelectionnee && (
                <div>
                  <label className="block font-bold text-[8px] text-slate-600 uppercase mb-1">
                    ID Système (Généré automatiquement)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`ID-${familleSelectionnee.id}`}
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-1.5 font-mono font-black text-slate-500 text-[10px] cursor-not-allowed"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-[8px] text-slate-600 uppercase mb-1">
                  Nom de la famille *
                </label>
                <input
                  type="text"
                  required
                  disabled={enTrainDeSauvegarder}
                  value={nouveauFamille.nom_famille}
                  onChange={(e) => setNouveauFamille({ ...nouveauFamille, nom_famille: e.target.value.toUpperCase() })}
                  placeholder="EX: BOISSONS, REPAS, SERVICES..."
                  className={inputStyle}
                />
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="block font-black text-[9.5px] uppercase text-slate-900">Articles suivis en stock par défaut</span>
                  <span className="text-[8.5px] font-semibold text-slate-500">Décochez pour les repas ou services (pas de contrôle de stock).</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={enTrainDeSauvegarder}
                    checked={nouveauFamille.suivi_stock}
                    onChange={(e) => setNouveauFamille({ ...nouveauFamille, suivi_stock: e.target.checked })}
                    className="sr-only peer cursor-pointer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                {familleSelectionnee && permissions.suppression ? (
                  <button
                    type="button"
                    disabled={enTrainDeSauvegarder}
                    onClick={supprimerFamille}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] shadow-2xs cursor-pointer transition"
                  >
                    🗑️ Supprimer
                  </button>
                ) : <div />}
                
                <div className="flex gap-2 ml-auto">
                  <button
                    type="button"
                    disabled={enTrainDeSauvegarder}
                    onClick={() => { reinitialiser(); setAfficherModalForm(false); }}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold px-3.5 py-1.5 rounded-lg text-[10px] transition cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={enTrainDeSauvegarder}
                    className="font-black px-4 py-1.5 rounded-lg text-[10px] shadow-2xs transition cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    {enTrainDeSauvegarder ? 'Enregistrement...' : '✅ Enregistrer'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔔 MODALE UNIFIÉE */}
      {etatModale.ouverte && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 space-y-4 text-center shadow-2xl text-slate-900">
            
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl font-black border ${
              etatModale.type === 'confirmation' ? 'bg-orange-50 text-orange-600 border-orange-200' :
              etatModale.type === 'succes' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
            }`}>
              {etatModale.type === 'confirmation' ? '❓' :
               etatModale.type === 'succes' ? '✓' : '⚠️'}
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-xs uppercase tracking-wider text-slate-900">
                {etatModale.titre}
              </h4>
              <p className="text-[11px] font-semibold leading-relaxed text-slate-600">
                {etatModale.message}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              {etatModale.type === 'confirmation' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setEtatModale({ ...etatModale, ouverte: false })}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold py-2 rounded-xl text-[10px] transition cursor-pointer"
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
                    className="flex-1 font-black py-2 rounded-xl text-[10px] shadow-2xs transition cursor-pointer bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Confirmer
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setEtatModale({ ...etatModale, ouverte: false })}
                  className="w-full font-black py-2 rounded-xl text-[10px] transition shadow-2xs cursor-pointer bg-orange-600 hover:bg-orange-700 text-white"
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