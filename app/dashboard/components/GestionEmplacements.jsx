'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/lib/usePermissions';

export default function GestionEmplacements({ entrepriseId = '4TS-TEST' }) {
  const [emplacements, setEmplacements] = useState([]);
  const [depots, setDepots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

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

  // Utilisation du hook centralisé unifié pour des permissions exactes et instantanées
  const { verifierPermission, verifierCreation, verifierModification, verifierSuppression } = usePermissions(
    entrepriseId,
    utilisateurConnecte,
    emailConnecte,
    moduleActuel
  );

  const permissions = {
    lecture: verifierPermission('emplacements_stock', estSuperAdmin) || verifierPermission('emplacements', estSuperAdmin),
    creation: verifierCreation('emplacements_stock', estSuperAdmin) || verifierCreation('emplacements', estSuperAdmin),
    modification: verifierModification('emplacements_stock', estSuperAdmin) || verifierModification('emplacements', estSuperAdmin),
    suppression: verifierSuppression('emplacements_stock', estSuperAdmin) || verifierSuppression('emplacements', estSuperAdmin),
  };

  const [limiteEmplacements, setLimiteEmplacements] = useState(20);
  const [afficherForm, setAfficherForm] = useState(false);
  const [nomEmplacement, setNomEmplacement] = useState('');
  const [responsableEmplacement, setResponsableEmplacement] = useState('');
  const [idDepot, setIdDepot] = useState('');
  const [emplacementEnEdition, setEmplacementEnEdition] = useState(null);

  const chargerDonneesReference = async () => {
    setLoading(true);
    try {
      const { data: dataDepots } = await supabase
        .from('depots_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);

      setDepots(dataDepots || []);

      const { data: dataEmplacements } = await supabase
        .from('emplacements_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('created_at', { ascending: false });

      setEmplacements(dataEmplacements || []);
    } catch (err) {
      console.error('Erreur chargement emplacements :', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    chargerDonneesReference();
  }, [entrepriseId, moduleActuel]);

  const ouvrirFormulaireNouveau = () => {
    if (!permissions.creation) {
      setMsg({ type: 'error', text: '⛔ Action non autorisée : Création interdite par votre profil.' });
      return;
    }
    setEmplacementEnEdition(null);
    setNomEmplacement('');
    setResponsableEmplacement('');
    setIdDepot(depots.length > 0 ? depots[0].id : '');
    setAfficherForm(true);
    setMsg({ type: '', text: '' });
  };

  const ouvrirEdition = (emp) => {
    if (!permissions.modification && !permissions.lecture) {
      setMsg({ type: 'error', text: '⛔ Action non autorisée : Accès restreint.' });
      return;
    }
    setEmplacementEnEdition(emp);
    setNomEmplacement(emp.nom_emplacement || '');
    setResponsableEmplacement(emp.responsable_emplacement || '');
    setIdDepot(emp.id_depot || '');
    setAfficherForm(true);
    setMsg({ type: '', text: '' });
  };

  const annulerForm = () => {
    setEmplacementEnEdition(null);
    setNomEmplacement('');
    setResponsableEmplacement('');
    setIdDepot('');
    setAfficherForm(false);
  };

  const enregistrerEmplacement = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;

    if (emplacementEnEdition && !permissions.modification) {
      setMsg({ type: 'error', text: '⛔ Action non autorisée : Modification interdite par votre profil.' });
      return;
    }
    if (!emplacementEnEdition && !permissions.creation) {
      setMsg({ type: 'error', text: '⛔ Action non autorisée : Création interdite par votre profil.' });
      return;
    }

    if (!nomEmplacement.trim()) {
      setMsg({ type: 'error', text: '⚠️ Veuillez renseigner le nom de l’emplacement.' });
      return;
    }

    setEnTrainDeSauvegarder(true);
    setMsg({ type: '', text: '' });

    try {
      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        nom_emplacement: nomEmplacement.trim().toUpperCase(),
        responsable_emplacement: responsableEmplacement.trim().toUpperCase(),
        id_depot: idDepot || null,
      };

      if (emplacementEnEdition) {
        const { error } = await supabase
          .from('emplacements_stock')
          .update(payload)
          .eq('id', emplacementEnEdition.id);

        if (error) throw error;
        setMsg({ type: 'success', text: '✅ Emplacement mis à jour avec succès !' });
      } else {
        const { error } = await supabase
          .from('emplacements_stock')
          .insert([payload]);

        if (error) throw error;
        setMsg({ type: 'success', text: '✅ Nouvel emplacement enregistré avec succès !' });
      }

      annulerForm();
      await chargerDonneesReference();
    } catch (err) {
      setMsg({ type: 'error', text: 'Erreur : ' + err.message });
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const supprimerEmplacement = async () => {
    if (!emplacementEnEdition) return;

    if (!permissions.suppression) {
      alert('⛔ Action non autorisée : Suppression interdite par votre profil.');
      return;
    }

    if (!confirm(`Voulez-vous vraiment supprimer l'emplacement "${emplacementEnEdition.nom_emplacement}" ?`)) return;

    try {
      const { error } = await supabase
        .from('emplacements_stock')
        .delete()
        .eq('id', emplacementEnEdition.id);

      if (error) throw error;

      setMsg({ type: 'success', text: 'Emplacement supprimé avec succès.' });
      annulerForm();
      await chargerDonneesReference();
    } catch (err) {
      setMsg({ type: 'error', text: 'Erreur suppression : ' + err.message });
    }
  };

  const obtenirNomDepot = (depotId) => {
    const d = depots.find(item => String(item.id) === String(depotId));
    return d ? d.nom_depot || d.code_depot : 'Dépôt principal';
  };

  const emplacementsAffiches = emplacements.slice(0, limiteEmplacements);

  if (!permissions.lecture) {
    return (
      <div className="p-6 text-center bg-white rounded-xl border border-slate-200 text-rose-600 font-bold text-xs">
        ⛔ Vous n'avez pas l'autorisation d'afficher le module des emplacements.
      </div>
    );
  }

  return (
    <div className="space-y-2 text-[10px] font-sans">
      
      <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <h2 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 uppercase">
            📍 Emplacements ({emplacementsAffiches.length} / {emplacements.length})
          </h2>
          {utilisateurConnecte && (
            <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold border border-slate-200">
              Utilisateur : {utilisateurConnecte}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {permissions.creation && (
            <button
              type="button"
              onClick={ouvrirFormulaireNouveau}
              className="px-2.5 py-1 rounded-lg font-black text-[10px] transition shadow-2xs bg-orange-600 hover:bg-orange-700 text-white"
            >
              ＋ Nouveau
            </button>
          )}
          <button
            type="button"
            onClick={() => { setAfficherForm(false); setEmplacementEnEdition(null); }}
            className="px-2.5 py-1 rounded-lg font-black text-[10px] transition border shadow-2xs bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
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

      {afficherForm && (permissions.creation || (emplacementEnEdition && permissions.modification)) ? (
        <form onSubmit={enregistrerEmplacement} className="bg-white p-3 rounded-xl border border-orange-500/50 shadow-sm space-y-2.5">
          <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-[11px] uppercase">
              {emplacementEnEdition ? '✏️ Modifier l’emplacement' : '📍 Nouvel emplacement'}
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
              <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter mb-0.5">Dépôt de rattachement</label>
              <select
                value={idDepot}
                onChange={(e) => setIdDepot(e.target.value)}
                disabled={enTrainDeSauvegarder}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-bold text-[10px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="">-- Sélectionnez un dépôt --</option>
                {depots.map((d) => (
                  <option key={d.id} value={d.id}>{d.nom_depot || d.code_depot}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter mb-0.5">Nom de l’emplacement (Rayon / Zone)</label>
              <input
                type="text"
                value={nomEmplacement}
                onChange={(e) => setNomEmplacement(e.target.value.toUpperCase())}
                placeholder="EX: RAYON BOISSONS / LIVREUR JEAN"
                required
                disabled={enTrainDeSauvegarder}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-bold uppercase text-[10px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter mb-0.5">Responsable / Livreur (Optionnel)</label>
              <input
                type="text"
                value={responsableEmplacement}
                onChange={(e) => setResponsableEmplacement(e.target.value.toUpperCase())}
                placeholder="NOM DU RESPONSABLE"
                disabled={enTrainDeSauvegarder}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-bold uppercase text-[10px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            {emplacementEnEdition && permissions.suppression ? (
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={supprimerEmplacement}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-2.5 py-1 rounded text-[10px] transition border border-rose-200 shadow-2xs"
              >
                🗑️ Supprimer
              </button>
            ) : <div />}

            <div className="flex gap-1.5 ml-auto">
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={annulerForm}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded text-[10px] transition"
              >
                Annuler
              </button>
              {((emplacementEnEdition && permissions.modification) || (!emplacementEnEdition && permissions.creation)) && (
                <button
                  type="submit"
                  disabled={enTrainDeSauvegarder}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white font-bold px-3 py-1 rounded text-[10px] shadow-2xs transition flex items-center gap-1"
                >
                  {enTrainDeSauvegarder ? 'Enregistrement...' : (emplacementEnEdition ? 'Mettre à jour' : 'Enregistrer')}
                </button>
              )}
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          {loading ? (
            <p className="text-slate-400 text-center py-6 text-[10px]">Chargement des emplacements...</p>
          ) : emplacements.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <p className="text-slate-400 font-bold text-[10px]">Aucun emplacement enregistré.</p>
              {permissions.creation && (
                <button
                  type="button"
                  onClick={ouvrirFormulaireNouveau}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-3 py-1 rounded text-[10px]"
                >
                  ＋ Déclarer un emplacement
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2">
                {emplacementsAffiches.map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => permissions.modification && ouvrirEdition(emp)}
                    className={`p-2.5 rounded-lg border border-slate-200 bg-slate-50 transition flex flex-col justify-between shadow-2xs group ${
                      permissions.modification ? 'hover:bg-orange-50/60 hover:border-orange-300 cursor-pointer' : 'cursor-default'
                    }`}
                  >
                    <div className="space-y-1">
                      <div>
                        <span className="inline-block text-[8px] px-1.5 py-0.5 rounded font-black border bg-purple-100 text-purple-800 border-purple-200">
                          {obtenirNomDepot(emp.id_depot)}
                        </span>
                      </div>

                      <p className="font-bold text-[11px] text-slate-900 leading-tight truncate uppercase">
                        {emp.nom_emplacement}
                      </p>

                      {emp.responsable_emplacement && (
                        <p className="text-[9px] font-semibold text-slate-500 truncate">
                          👤 {emp.responsable_emplacement}
                        </p>
                      )}
                    </div>

                    <div className="mt-2 pt-1 border-t border-slate-200/60 flex justify-end">
                      <span className="text-[8px] font-bold text-slate-400 group-hover:text-orange-600">
                        {permissions.modification ? '✏️ Modifier' : '👁️ Consulter'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {limiteEmplacements < emplacements.length && (
                <div className="text-center pt-1 pb-1">
                  <button
                    type="button"
                    onClick={() => setLimiteEmplacements(prev => prev + 20)}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-extrabold px-3 py-1.5 rounded-xl text-[10px] transition shadow-xs border border-slate-300"
                  >
                    📥 Charger 20 emplacements de plus ({emplacements.length - limiteEmplacements} restants)
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