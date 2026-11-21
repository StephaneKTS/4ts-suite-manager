'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/lib/usePermissions';
import { localSync } from '../../lib/localSync';

export default function GestionCaisses({ entrepriseId = '4TS-TEST' }) {
  const [caisses, setCaisses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // Pagination / Limite d'affichage pour fluidifier le mobile
  const [limiteCaisses, setLimiteCaisses] = useState(20);

  // Gestion des modales
  const [modalFormOuverte, setModalFormOuverte] = useState(false);
  const [modalConfirmationOuverte, setModalConfirmationOuverte] = useState(false);
  const [modalNatureOuverte, setModalNatureOuverte] = useState(false);
  const [modalHistoriqueOuverte, setModalHistoriqueOuverte] = useState(false);

  const [codeCaisse, setCodeCaisse] = useState('');
  const [nomCaisse, setNomCaisse] = useState('');
  const [natureCaisse, setNatureCaisse] = useState('FACTURATION');
  const [estDefautCaisse, setEstDefautCaisse] = useState(false);
  const [caisseEnEdition, setCaisseEnEdition] = useState(null);
  
  // État pour l'historique et les interrogations de la caisse sélectionnée
  const [caisseSelectionneeHistorique, setCaisseSelectionneeHistorique] = useState(null);
  const [historiqueOperations, setHistoriqueOperations] = useState([]);
  const [chargementHistorique, setChargementHistorique] = useState(false);

  // États initialisés vides pour éviter les faux droits par défaut au démarrage
  const [utilisateurConnecte, setUtilisateurConnecte] = useState('');
  const [emailConnecte, setEmailConnecte] = useState('');

  // Récupération propre de la session locale au montage
  useEffect(() => {
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
  }, []);

  const emailActuel = emailConnecte || '';
  const estSuperAdmin = emailActuel.toLowerCase().trim() === 'stephs7352@gmail.com';

  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();
  const cleCacheCaisses = `caisses_${entrepriseId}_${moduleActuel}`;

  // Utilisation du hook centralisé unifié pour des permissions exactes et instantanées
  const { verifierPermission, verifierCreation, verifierModification, verifierSuppression } = usePermissions(
    entrepriseId,
    utilisateurConnecte,
    emailConnecte,
    moduleActuel
  );

  const permissions = {
    peutVoir: verifierPermission('caisses', estSuperAdmin) || verifierPermission('caisse', estSuperAdmin),
    peutCreer: verifierCreation('caisses', estSuperAdmin) || verifierCreation('caisse', estSuperAdmin),
    peutModifier: verifierModification('caisses', estSuperAdmin) || verifierModification('caisse', estSuperAdmin),
    peutSupprimer: verifierSuppression('caisses', estSuperAdmin) || verifierSuppression('caisse', estSuperAdmin),
  };

  useEffect(() => {
    chargerCaisses();
    localSync.synchroniserVersCloud(supabase);
  }, [entrepriseId, moduleActuel]);

  const chargerCaisses = async () => {
    setLoading(true);

    try {
      // Filtrage STRICTEMENT isolé par entreprise et par module
      const { data, error } = await supabase
        .from('caisses')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('created_at', { ascending: false });

      if (error) {
        // Si la colonne n'existe pas encore en base, on charge sans bloquer
        const resFallback = await supabase
          .from('caisses')
          .select('id, id_entreprise, module, code_caisse, nom_caisse, nature, created_at')
          .eq('id_entreprise', entrepriseId)
          .eq('module', moduleActuel)
          .order('created_at', { ascending: false });
        
        if (resFallback.data) {
          const caissesLocales = localSync.recupererDonneesLocales(cleCacheCaisses) || [];
          const fusion = resFallback.data.map(c => {
            const trouveLocal = caissesLocales.find(l => l.id === c.id);
            return { ...c, est_defaut: trouveLocal ? trouveLocal.est_defaut : false };
          });
          setCaisses(fusion);
        }
        setLoading(false);
        return;
      }

      if (data) {
        setCaisses(data);
        localSync.sauvegarderDonneesLocales(cleCacheCaisses, data);
      }
    } catch (err) {
      console.error('Erreur chargement caisses :', err.message);
      const caissesLocales = localSync.recupererDonneesLocales(cleCacheCaisses);
      if (caissesLocales && caissesLocales.length > 0) {
        setCaisses(caissesLocales);
      } else {
        setMsg({ type: 'error', text: 'Erreur lors du chargement des caisses.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const ouvrirFormulaireNouveau = () => {
    if (!permissions.peutCreer) {
      setMsg({ type: 'error', text: '⛔ Accès refusé : Vous n’avez pas le droit de créer de nouvelles caisses.' });
      return;
    }
    setCaisseEnEdition(null);
    setCodeCaisse('');
    setNomCaisse('');
    setNatureCaisse(moduleActuel === 'LIVRAISON' ? 'CAISSE ENTREPRISE' : 'FACTURATION');
    setEstDefautCaisse(false);
    setModalFormOuverte(true);
    setMsg({ type: '', text: '' });
  };

  const ouvrirEdition = (caisse) => {
    if (!permissions.peutModifier && !permissions.peutVoir) {
      setMsg({ type: 'error', text: '⛔ Accès refusé : Vous n’avez pas les droits nécessaires.' });
      return;
    }
    setCaisseEnEdition(caisse);
    setCodeCaisse(caisse.code_caisse || '');
    setNomCaisse(caisse.nom_caisse || '');
    setNatureCaisse(caisse.nature || (moduleActuel === 'LIVRAISON' ? 'CAISSE ENTREPRISE' : 'FACTURATION'));
    
    // 🔍 Récupération fiable de l'état par défaut (depuis l'objet caisse ou la mémoire locale)
    const caissesLocales = localSync.recupererDonneesLocales(cleCacheCaisses) || [];
    const caisseLocale = caissesLocales.find(l => l.id === caisse.id);
    const estDefautValeur = Boolean(caisse.est_defaut || caisse.par_defaut || caisseLocale?.est_defaut);
    
    setEstDefautCaisse(estDefautValeur);
    setModalFormOuverte(true);
    setMsg({ type: '', text: '' });
  };

  const ouvrirHistoriqueCaisse = async (caisse) => {
    setCaisseSelectionneeHistorique(caisse);
    setModalHistoriqueOuverte(true);
    setChargementHistorique(true);

    try {
      const { data, error } = await supabase
        .from('journal_caisse')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('id_caisse', caisse.id)
        .order('created_at', { ascending: false });

      if (error) {
        setHistoriqueOperations([]);
      } else {
        setHistoriqueOperations(data || []);
      }
    } catch (err) {
      console.warn("Impossible de charger l'historique direct :", err.message);
      setHistoriqueOperations([]);
    } finally {
      setChargementHistorique(false);
    }
  };

  const fermerModalForm = () => {
    if (enTrainDeSauvegarder) return;
    setCaisseEnEdition(null);
    setCodeCaisse('');
    setNomCaisse('');
    setNatureCaisse(moduleActuel === 'LIVRAISON' ? 'CAISSE ENTREPRISE' : 'FACTURATION');
    setEstDefautCaisse(false);
    setModalFormOuverte(false);
    setModalConfirmationOuverte(false);
    setModalNatureOuverte(false);
  };

  const initierEnregistrement = (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;

    if (caisseEnEdition && !permissions.peutModifier) {
      setMsg({ type: 'error', text: '⛔ Action non autorisée : Modification interdite.' });
      return;
    }
    if (!caisseEnEdition && !permissions.peutCreer) {
      setMsg({ type: 'error', text: '⛔ Action non autorisée : Création interdite.' });
      return;
    }

    if (!codeCaisse.trim() || !nomCaisse.trim()) {
      setMsg({ type: 'error', text: '⚠️ Veuillez remplir le code et le nom de la caisse.' });
      return;
    }

    setModalFormOuverte(false);
    setModalConfirmationOuverte(true);
  };

  const confirmerEtEnregistrerCaisse = async () => {
    if (enTrainDeSauvegarder) return;
    setEnTrainDeSauvegarder(true);
    setMsg({ type: '', text: '' });

    const codeSaisi = codeCaisse.trim().toUpperCase();
    const nomSaisi = nomCaisse.trim().toUpperCase();

    try {
      let payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        code_caisse: codeSaisi,
        nom_caisse: nomSaisi,
        nature: natureCaisse,
        est_defaut: estDefautCaisse,
      };

      if (caisseEnEdition) {
        payload.id = caisseEnEdition.id;
        
        // Tentative d'update avec est_defaut
        let { error } = await supabase
          .from('caisses')
          .update(payload)
          .eq('id', caisseEnEdition.id);

        // Si la colonne n'existe pas encore dans Supabase, on enlève est_defaut pour que la mise à jour passe quand même
        if (error && error.code === 'PGRST204') {
          delete payload.est_defaut;
          const resRetry = await supabase.from('caisses').update(payload).eq('id', caisseEnEdition.id);
          error = resRetry.error;
        }

        if (error) throw error;
        
        setMsg({ type: 'success', text: '✅ Caisse mise à jour avec succès !' });
      } else {
        let { error } = await supabase
          .from('caisses')
          .insert([payload]);

        if (error && error.code === 'PGRST204') {
          delete payload.est_defaut;
          const resRetry = await supabase.from('caisses').insert([payload]);
          error = resRetry.error;
        }

        if (error) throw error;

        setMsg({ type: 'success', text: '✅ Nouvelle caisse enregistrée avec succès !' });
      }

      // Mise à jour de la liste locale et du cache en mémoire pour refléter instantanément le statut par défaut
      const caissesActuelles = [...caisses];
      const caisseIdCible = caisseEnEdition ? caisseEnEdition.id : null;
      
      const caissesMisesAJour = caissesActuelles.map(c => {
        const estCelleCI = caisseIdCible ? c.id === caisseIdCible : c.code_caisse === codeSaisi;
        return {
          ...c,
          est_defaut: estDefautCaisse ? estCelleCI : (estCelleCI ? false : c.est_defaut)
        };
      });

      setCaisses(caissesMisesAJour);
      localSync.sauvegarderDonneesLocales(cleCacheCaisses, caissesMisesAJour);

      fermerModalForm();
      await chargerCaisses();
    } catch (err) {
      if (err.code === '23505') {
        setMsg({ type: 'error', text: '⛔ Erreur : Ce code caisse existe déjà dans VOTRE entreprise pour ce module.' });
      } else {
        setMsg({ type: 'error', text: 'Erreur : ' + err.message });
      }
    } finally {
      setEnTrainDeSauvegarder(false);
      setModalConfirmationOuverte(false);
    }
  };

  const supprimerCaisse = async () => {
    if (enTrainDeSauvegarder) return;
    if (!permissions.peutSupprimer) {
      setMsg({ type: 'error', text: '⛔ Action non autorisée : Suppression interdite.' });
      return;
    }
    if (!caisseEnEdition) return;
    if (!confirm(`Voulez-vous vraiment supprimer la caisse "${caisseEnEdition.nom_caisse}" ?`)) return;

    setEnTrainDeSauvegarder(true);
    try {
      const { error } = await supabase
        .from('caisses')
        .delete()
        .eq('id', caisseEnEdition.id);

      if (error) throw error;

      localStorage.removeItem(cleCacheCaisses);
      setMsg({ type: 'success', text: 'Caisse supprimée avec succès.' });
      fermerModalForm();
      await chargerCaisses();
    } catch (err) {
      setMsg({ type: 'error', text: 'Erreur suppression : ' + err.message });
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const caissesAffichees = caisses.slice(0, limiteCaisses);

  if (!permissions.peutVoir) {
    return (
      <div className="p-6 text-center bg-white rounded-xl border border-slate-200 text-rose-600 font-bold text-xs">
        ⛔ Vous n'avez pas l'autorisation d'afficher le module des caisses.
      </div>
    );
  }

  return (
    <div className="space-y-2 text-[10px] font-sans">
      
      <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <h2 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 uppercase">
          🏧 Caisses [{moduleActuel}] ({caissesAffichees.length} / {caisses.length})
        </h2>
        <div className="flex items-center gap-1">
          {permissions.peutCreer && (
            <button
              type="button"
              disabled={enTrainDeSauvegarder}
              onClick={ouvrirFormulaireNouveau}
              className="px-3 py-1.5 rounded-lg font-black text-[10px] transition shadow-2xs bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white cursor-pointer"
            >
              ＋ Nouveau
            </button>
          )}
        </div>
      </div>

      {msg.text && (
        <div className={`p-2 rounded-lg font-bold border text-[10px] ${
          msg.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
            : 'bg-rose-50 text-rose-800 border-rose-300'
        }`}>
          {msg.text}
        </div>
      )}

      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        {loading && caisses.length === 0 ? (
          <p className="text-slate-400 text-center py-6 text-[10px]">Chargement des caisses...</p>
        ) : caisses.length === 0 ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-slate-400 font-bold text-[10px]">Aucune caisse enregistrée pour le module {moduleActuel}.</p>
            {permissions.peutCreer && (
              <button
                type="button"
                onClick={ouvrirFormulaireNouveau}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-3 py-1 rounded text-[10px]"
              >
                ＋ Déclarer une caisse
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {caissesAffichees.map((c) => (
                <div
                  key={c.id}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 transition flex flex-col justify-between shadow-2xs group hover:bg-orange-50/60 hover:border-orange-300 cursor-pointer"
                >
                  <div className="space-y-1" onClick={() => ouvrirHistoriqueCaisse(c)}>
                    <div className="flex items-center justify-between">
                      <span className={`inline-block text-[8px] px-1.5 py-0.5 rounded font-black border ${
                        c.nature === 'PRINCIPALE' || c.nature === 'CAISSE ENTREPRISE'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                          : 'bg-blue-100 text-blue-800 border-blue-200'
                      }`}>
                        {c.nature}
                      </span>
                      {c.est_defaut && (
                        <span className="inline-block text-[8px] px-1.5 py-0.5 rounded font-black bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs">
                          ★ DÉFAUT
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center pt-1">
                      <span className="font-mono font-black text-orange-600 text-xs group-hover:underline">
                        {c.code_caisse}
                      </span>
                      <span className="font-mono text-[7px] text-slate-400 bg-slate-200 px-1 py-0.5 rounded" title="ID Unique Interne Supabase">
                        ID: {c.id.slice(0, 8)}...
                      </span>
                    </div>
                    
                    <p className="font-bold text-[10px] text-slate-900 leading-tight truncate">
                      {c.nom_caisse}
                    </p>
                  </div>

                  <div className="mt-2 pt-1 border-t border-slate-200/60 flex justify-between items-center">
                    <button 
                      onClick={() => ouvrirHistoriqueCaisse(c)}
                      className="text-[8px] font-extrabold text-blue-600 hover:underline cursor-pointer"
                    >
                      📊 Historique / Opérations
                    </button>
                    {permissions.peutModifier && (
                      <span 
                        onClick={() => ouvrirEdition(c)}
                        className="text-[8px] font-bold text-slate-400 group-hover:text-orange-600 cursor-pointer"
                      >
                        ✏️ Modifier
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {limiteCaisses < caisses.length && (
              <div className="text-center pt-1 pb-1">
                <button
                  type="button"
                  onClick={() => setLimiteCaisses(prev => prev + 20)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold px-3 py-1.5 rounded-xl text-[10px] transition shadow-xs border border-slate-300"
                >
                  📥 Charger 20 caisses de plus ({caisses.length - limiteCaisses} restantes)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* MODALE DE CRÉATION / MODIFICATION */}
      {modalFormOuverte && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-3 animate-fadeIn">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 p-4 space-y-3">
            
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="font-extrabold text-slate-900 text-xs uppercase flex items-center gap-1.5">
                {caisseEnEdition ? `✏️ Modifier la Caisse [${moduleActuel}]` : `🏧 Nouvelle Caisse [${moduleActuel}]`}
              </h3>
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={fermerModalForm}
                className="text-slate-400 hover:text-slate-700 font-black text-xs px-1.5 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={initierEnregistrement} className="space-y-3">
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
                <div>
                  <label className="block text-[8px] font-extrabold text-slate-500 uppercase tracking-tighter mb-1">Code Caisse (ex: CP)</label>
                  <input
                    type="text"
                    value={codeCaisse}
                    onChange={(e) => setCodeCaisse(e.target.value.toUpperCase())}
                    placeholder="CP"
                    required
                    disabled={!!caisseEnEdition || enTrainDeSauvegarder}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-mono font-bold uppercase text-[10px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-[8px] font-extrabold text-slate-500 uppercase tracking-tighter mb-1">Nom Caisse</label>
                  <input
                    type="text"
                    value={nomCaisse}
                    onChange={(e) => setNomCaisse(e.target.value.toUpperCase())}
                    placeholder="CAISSE PRINCIPALE"
                    required
                    disabled={(caisseEnEdition && !permissions.peutModifier) || enTrainDeSauvegarder}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-bold uppercase text-[10px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-[8px] font-extrabold text-slate-500 uppercase tracking-tighter mb-1">Nature</label>
                  <button
                    type="button"
                    onClick={() => setModalNatureOuverte(true)}
                    disabled={(caisseEnEdition && !permissions.peutModifier) || enTrainDeSauvegarder}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 font-black text-[10px] text-slate-900 flex justify-between items-center cursor-pointer hover:bg-slate-100"
                  >
                    <span>{natureCaisse}</span>
                    <span className="text-slate-400">▼</span>
                  </button>
                </div>

                <div className="flex items-center h-[31px] px-2 bg-slate-50 border border-slate-300 rounded">
                  <label className="flex items-center gap-1.5 cursor-pointer w-full">
                    <input
                      type="checkbox"
                      checked={estDefautCaisse}
                      onChange={(e) => setEstDefautCaisse(e.target.checked)}
                      disabled={enTrainDeSauvegarder}
                      className="w-3.5 h-3.5 accent-orange-600 rounded cursor-pointer"
                    />
                    <span className="font-extrabold text-[9px] text-slate-800 uppercase">Par défaut</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                {caisseEnEdition && permissions.peutSupprimer ? (
                  <button
                    type="button"
                    disabled={enTrainDeSauvegarder}
                    onClick={supprimerCaisse}
                    className="bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold px-3 py-1.5 rounded text-[10px] transition shadow-xs cursor-pointer"
                  >
                    {enTrainDeSauvegarder ? 'Patientez...' : '🗑️ Supprimer'}
                  </button>
                ) : <div />}

                <div className="flex gap-1.5 ml-auto">
                  <button
                    type="button"
                    disabled={enTrainDeSauvegarder}
                    onClick={fermerModalForm}
                    className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold px-3 py-1.5 rounded text-[10px] transition cursor-pointer"
                  >
                    Annuler
                  </button>
                  {((caisseEnEdition && permissions.peutModifier) || (!caisseEnEdition && permissions.peutCreer)) && (
                    <button
                      type="submit"
                      disabled={enTrainDeSauvegarder}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white font-bold px-3.5 py-1.5 rounded text-[10px] shadow-2xs transition flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {enTrainDeSauvegarder ? 'Enregistrement...' : (caisseEnEdition ? 'Mettre à jour' : 'Enregistrer')}
                    </button>
                  )}
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODALE DE SÉLECTION DE LA NATURE */}
      {modalNatureOuverte && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-50 p-3 animate-fadeIn">
          <div className="bg-white w-full max-w-xs rounded-2xl shadow-2xl border border-slate-200 p-4 space-y-3 text-center">
            <h4 className="font-black text-xs uppercase text-slate-900 border-b pb-2">
              Sélectionner la Nature
            </h4>
            
            <div className="space-y-2">
              {moduleActuel === 'LIVRAISON' ? (
                <>
                  <button
                    type="button"
                    onClick={() => { setNatureCaisse('CAISSE ENTREPRISE'); setModalNatureOuverte(false); }}
                    className="w-full py-2.5 px-3 rounded-xl font-black text-xs uppercase bg-slate-100 hover:bg-orange-600 hover:text-white transition cursor-pointer"
                  >
                    CAISSE ENTREPRISE
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNatureCaisse('BANQUE'); setModalNatureOuverte(false); }}
                    className="w-full py-2.5 px-3 rounded-xl font-black text-xs uppercase bg-slate-100 hover:bg-orange-600 hover:text-white transition cursor-pointer"
                  >
                    BANQUE
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { setNatureCaisse('FACTURATION'); setModalNatureOuverte(false); }}
                    className="w-full py-2.5 px-3 rounded-xl font-black text-xs uppercase bg-slate-100 hover:bg-orange-600 hover:text-white transition cursor-pointer"
                  >
                    FACTURATION
                  </button>
                  <button
                    type="button"
                    onClick={() => { setNatureCaisse('PRINCIPALE'); setModalNatureOuverte(false); }}
                    className="w-full py-2.5 px-3 rounded-xl font-black text-xs uppercase bg-slate-100 hover:bg-orange-600 hover:text-white transition cursor-pointer"
                  >
                    PRINCIPALE
                  </button>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setModalNatureOuverte(false)}
              className="mt-2 text-slate-500 font-bold text-[10px] uppercase hover:underline cursor-pointer"
            >
              Fermer ✕
            </button>
          </div>
        </div>
      )}

      {/* MODALE D'HISTORIQUE ET D'INTERROGATION DES OPÉRATIONS */}
      {modalHistoriqueOuverte && caisseSelectionneeHistorique && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 p-4 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-extrabold text-xs uppercase text-slate-900 flex items-center gap-1.5">
                  📊 Historique & Opérations : [{caisseSelectionneeHistorique.code_caisse}] {caisseSelectionneeHistorique.nom_caisse}
                </h3>
                <p className="text-[8px] text-slate-500">ID Unique : {caisseSelectionneeHistorique.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setModalHistoriqueOuverte(false)}
                className="text-slate-400 hover:text-slate-700 font-black text-xs px-1.5 py-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {chargementHistorique ? (
                <p className="text-center text-slate-400 py-6 text-[10px]">Chargement des opérations...</p>
              ) : historiqueOperations.length === 0 ? (
                <div className="text-center py-8 space-y-1 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-slate-600 font-bold text-[10px]">Aucune opération enregistrée pour le moment sur cette caisse.</p>
                  <p className="text-slate-400 text-[9px]">Toutes les transactions, encaissements et décaissements futurs s'afficheront ici.</p>
                </div>
              ) : (
                historiqueOperations.map((op, index) => (
                  <div key={op.id || index} className="p-2 rounded border border-slate-200 bg-slate-50 flex justify-between items-center text-[10px]">
                    <div>
                      <p className="font-bold text-slate-900">{op.libelle || op.type_operation || 'Opération caisse'}</p>
                      <span className="text-[8px] text-slate-400">{new Date(op.created_at).toLocaleString()}</span>
                    </div>
                    <span className={`font-mono font-black ${op.montant >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {op.montant} FCFA
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalHistoriqueOuverte(false)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-1.5 rounded-xl text-[10px] cursor-pointer shadow-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE CONFIRMATION */}
      {modalConfirmationOuverte && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-200 p-4 space-y-3 text-center">
            <div className="space-y-1">
              <span className="text-2xl">⚠️</span>
              <h4 className="font-black text-xs uppercase text-slate-900">
                Confirmation requise
              </h4>
              <p className="text-[10px] font-semibold text-slate-600 leading-relaxed pt-1">
                Voulez-vous vraiment enregistrer la caisse <strong className="text-orange-600">[{codeCaisse}] {nomCaisse}</strong> ?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={() => { setModalConfirmationOuverte(false); setModalFormOuverte(true); }}
                className="py-2 px-3 rounded-xl font-black text-xs uppercase bg-slate-200 hover:bg-slate-300 text-slate-700 transition cursor-pointer disabled:opacity-50"
              >
                Annuler ✕
              </button>
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={confirmerEtEnregistrerCaisse}
                className="py-2 px-3 rounded-xl font-black text-xs uppercase bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white shadow-md transition cursor-pointer flex items-center justify-center gap-1"
              >
                {enTrainDeSauvegarder ? (
                  <>
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full"></span>
                    <span>Patientez...</span>
                  </>
                ) : (
                  'Confirmer ✓'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}