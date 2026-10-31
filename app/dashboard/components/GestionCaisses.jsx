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

  const [afficherForm, setAfficherForm] = useState(false);
  const [codeCaisse, setCodeCaisse] = useState('');
  const [nomCaisse, setNomCaisse] = useState('');
  const [natureCaisse, setNatureCaisse] = useState('FACTURATION');
  const [caisseEnEdition, setCaisseEnEdition] = useState(null);

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
    // 1. CHARGEMENT INSTANTANÉ DEPUIS LE CACHE LOCAL DU MODULE ACTIF
    const caissesLocales = localSync.recupererDonneesLocales(cleCacheCaisses);
    if (caissesLocales && caissesLocales.length > 0) {
      setCaisses(caissesLocales);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      // 2. RÉCUPÉRATION SUPABASE ROBUSTE (Filtrage par entreprise et module)
      const { data, error } = await supabase
        .from('caisses')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .or(`module.eq.${moduleActuel},module.eq.${moduleActuel.toLowerCase()},module.is.null`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setCaisses(data);
        localSync.sauvegarderDonneesLocales(cleCacheCaisses, data);
      }
    } catch (err) {
      console.error('Erreur chargement caisses :', err.message);
      if (!caissesLocales || caissesLocales.length === 0) {
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
    setAfficherForm(true);
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
    setAfficherForm(true);
    setMsg({ type: '', text: '' });
  };

  const annulerForm = () => {
    if (enTrainDeSauvegarder) return;
    setCaisseEnEdition(null);
    setCodeCaisse('');
    setNomCaisse('');
    setNatureCaisse(moduleActuel === 'LIVRAISON' ? 'CAISSE ENTREPRISE' : 'FACTURATION');
    setAfficherForm(false);
  };

  const enregistrerCaisse = async (e) => {
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

    const codeSaisi = codeCaisse.trim().toUpperCase();
    const nomSaisi = nomCaisse.trim().toUpperCase();

    setEnTrainDeSauvegarder(true);
    setMsg({ type: '', text: '' });

    try {
      let payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        code_caisse: codeSaisi,
        nom_caisse: nomSaisi,
        nature: natureCaisse,
      };

      if (caisseEnEdition) {
        payload.id = caisseEnEdition.id;
        const { error } = await supabase
          .from('caisses')
          .update(payload)
          .eq('id', caisseEnEdition.id);

        if (error) throw error;
        
        setCaisses(prev => prev.map(c => c.id === caisseEnEdition.id ? { ...c, ...payload } : c));
        setMsg({ type: 'success', text: '✅ Caisse mise à jour avec succès !' });
      } else {
        const { data, error } = await supabase
          .from('caisses')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        // MISE À JOUR INSTANTANÉ DE L'ÉTAT LOCAL DE LA TABLE
        if (data) {
          setCaisses(prev => [data, ...prev.filter(c => c.id !== data.id)]);
        }
        setMsg({ type: 'success', text: '✅ Nouvelle caisse enregistrée avec succès !' });
      }

      // NETTOYAGE DU CACHE LOCAL POUR FORCER LE RAFRAÎCHISSEMENT PROPRE
      localStorage.removeItem(cleCacheCaisses);

      annulerForm();
      await chargerCaisses();
    } catch (err) {
      if (err.code === '23505') {
        setMsg({ type: 'error', text: '⛔ Erreur : Ce code caisse ou ce nom existe déjà.' });
      } else {
        setMsg({ type: 'error', text: 'Erreur : ' + err.message });
      }
    } finally {
      setEnTrainDeSauvegarder(false);
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

      setCaisses(prev => prev.filter(c => c.id !== caisseEnEdition.id));
      localStorage.removeItem(cleCacheCaisses);
      
      setMsg({ type: 'success', text: 'Caisse supprimée avec succès.' });
      annulerForm();
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
              className="px-2.5 py-1 rounded-lg font-black text-[10px] transition shadow-2xs bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white"
            >
              ＋ Nouveau
            </button>
          )}
          <button
            type="button"
            disabled={enTrainDeSauvegarder}
            onClick={() => { if (!enTrainDeSauvegarder) { setAfficherForm(false); setCaisseEnEdition(null); } }}
            className={`px-2.5 py-1 rounded-lg font-black text-[10px] transition border shadow-2xs ${
              !afficherForm 
                ? 'bg-slate-900 text-white border-slate-900' 
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
            }`}
          >
            📋 Liste
          </button>
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

      {afficherForm && permissions.peutCreer ? (
        <form onSubmit={enregistrerCaisse} className="bg-white p-3 rounded-xl border border-orange-500/50 shadow-sm space-y-2.5">
          <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-[11px] uppercase">
              {caisseEnEdition ? `✏️ Modifier la Caisse [${moduleActuel}]` : `🏧 Nouvelle Caisse [${moduleActuel}]`}
            </h3>
            <button
              type="button"
              disabled={enTrainDeSauvegarder}
              onClick={annulerForm}
              className="text-slate-400 hover:text-slate-700 font-black text-xs px-1"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2">
            <div>
              <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter mb-0.5">Code Caisse (ex: C01)</label>
              <input
                type="text"
                value={codeCaisse}
                onChange={(e) => setCodeCaisse(e.target.value.toUpperCase())}
                placeholder="C01"
                required
                disabled={!!caisseEnEdition || enTrainDeSauvegarder}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono font-bold uppercase text-[10px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter mb-0.5">Nom de la Caisse</label>
              <input
                type="text"
                value={nomCaisse}
                onChange={(e) => setNomCaisse(e.target.value.toUpperCase())}
                placeholder="CAISSE PRINCIPALE"
                required
                disabled={(caisseEnEdition && !permissions.peutModifier) || enTrainDeSauvegarder}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-bold uppercase text-[10px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter mb-0.5">Nature de la Caisse</label>
              <select
                value={natureCaisse}
                onChange={(e) => setNatureCaisse(e.target.value)}
                disabled={(caisseEnEdition && !permissions.peutModifier) || enTrainDeSauvegarder}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-black text-[10px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                {moduleActuel === 'LIVRAISON' ? (
                  <>
                    <option value="CAISSE ENTREPRISE">CAISSE ENTREPRISE</option>
                    <option value="BANQUE">BANQUE</option>
                  </>
                ) : (
                  <>
                    <option value="FACTURATION">FACTURATION</option>
                    <option value="PRINCIPALE">PRINCIPALE</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            {caisseEnEdition && permissions.peutSupprimer ? (
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={supprimerCaisse}
                className="bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white font-bold px-3 py-1 rounded text-[10px] transition shadow-xs"
              >
                {enTrainDeSauvegarder ? 'Patientez...' : '🗑️ Supprimer'}
              </button>
            ) : <div />}

            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={annulerForm}
                className="bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold px-2.5 py-1 rounded text-[10px] transition"
              >
                Annuler
              </button>
              {((caisseEnEdition && permissions.peutModifier) || (!caisseEnEdition && permissions.peutCreer)) && (
                <button
                  type="submit"
                  disabled={enTrainDeSauvegarder}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white font-bold px-3 py-1 rounded text-[10px] shadow-2xs transition flex items-center gap-1"
                >
                  {enTrainDeSauvegarder ? 'Enregistrement...' : (caisseEnEdition ? 'Mettre à jour' : 'Enregistrer')}
                </button>
              )}
            </div>
          </div>
        </form>
      ) : (
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
                    onClick={() => permissions.peutModifier && ouvrirEdition(c)}
                    className={`p-2.5 rounded-lg border border-slate-200 bg-slate-50 transition flex flex-col justify-between shadow-2xs group ${
                      permissions.peutModifier ? 'hover:bg-orange-50/60 hover:border-orange-300 cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <div className="space-y-1">
                      <div>
                        <span className={`inline-block text-[8px] px-1.5 py-0.5 rounded font-black border ${
                          c.nature === 'PRINCIPALE' || c.nature === 'CAISSE ENTREPRISE'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-blue-100 text-blue-800 border-blue-200'
                        }`}>
                          {c.nature}
                        </span>
                      </div>

                      <span className="font-mono font-black text-orange-600 text-xs group-hover:underline block">
                        {c.code_caisse}
                      </span>
                      
                      <p className="font-bold text-[10px] text-slate-900 leading-tight truncate">
                        {c.nom_caisse}
                      </p>
                    </div>

                    <div className="mt-2 pt-1 border-t border-slate-200/60 flex justify-end">
                      <span className="text-[8px] font-bold text-slate-400 group-hover:text-orange-600">
                        {permissions.peutModifier ? '✏️ Modifier' : '👁️ Consulter'}
                      </span>
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
      )}

    </div>
  );
}