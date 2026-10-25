'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionCaisses({ entrepriseId = '4TS-TEST' }) {
  const [caisses, setCaisses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const [afficherForm, setAfficherForm] = useState(false);
  const [codeCaisse, setCodeCaisse] = useState('');
  const [nomCaisse, setNomCaisse] = useState('');
  const [natureCaisse, setNatureCaisse] = useState('FACTURATION');
  const [caisseEnEdition, setCaisseEnEdition] = useState(null);

  // État des permissions utilisateur strictes
  const [permissions, setPermissions] = useState({
    peutVoir: true,
    peutCreer: true,
    peutModifier: true,
    peutSupprimer: false, // Par défaut sécurisé à false si non défini
  });

  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();

  useEffect(() => {
    chargerPermissionsEtCaisses();
  }, [entrepriseId, moduleActuel]);

  const chargerPermissionsEtCaisses = async () => {
    setLoading(true);
    try {
      const utilisateurConnecteStr = localStorage.getItem('utilisateur_connecte');
      if (utilisateurConnecteStr) {
        const userObj = JSON.parse(utilisateurConnecteStr);
        const nomRoleUser = (userObj.nom_role || userObj.role || '').trim().toUpperCase();

        if (nomRoleUser && nomRoleUser !== 'ADMINISTRATEUR' && nomRoleUser !== 'SUPER_ADMIN') {
          // 1. Vérifier d'abord si les permissions sont stockées directement dans l'objet utilisateur (JSON)
          const permModule = userObj.permissions?.['caisses'] || userObj.permissions?.['caisse'];
          
          if (permModule) {
            setPermissions({
              peutVoir: permModule.lecture ?? permModule.voir ?? true,
              peutCreer: permModule.creation ?? permModule.creer ?? true,
              peutModifier: permModule.modification ?? permModule.modifier ?? false,
              peutSupprimer: permModule.suppression ?? false,
            });
          } else {
            // 2. Sinon, interroger la table des rôles
            const { data: roleData } = await supabase
              .from('roles')
              .select('*')
              .eq('id_entreprise', entrepriseId)
              .eq('module', moduleActuel)
              .eq('nom_role', nomRoleUser)
              .maybeSingle();

            const rolePerm = roleData?.permissions?.['caisses'] || roleData?.permissions?.['caisse'];

            if (rolePerm) {
              setPermissions({
                peutVoir: rolePerm.lecture ?? rolePerm.voir ?? true,
                peutCreer: rolePerm.creation ?? rolePerm.creer ?? true,
                peutModifier: rolePerm.modification ?? rolePerm.modifier ?? false,
                peutSupprimer: rolePerm.suppression ?? false,
              });
            } else if (roleData) {
              setPermissions({
                peutVoir: roleData.peut_voir ?? roleData.voir ?? true,
                peutCreer: roleData.peut_creer ?? roleData.creer ?? true,
                peutModifier: roleData.peut_modifier ?? roleData.modifier ?? false,
                peutSupprimer: roleData.peut_supprimer ?? roleData.supprimer ?? false,
              });
            }
          }
        }
      }

      const { data, error } = await supabase
        .from('caisses')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCaisses(data || []);
    } catch (err) {
      console.error('Erreur chargement caisses :', err.message);
      setMsg({ type: 'error', text: 'Erreur lors du chargement des caisses.' });
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
    setNatureCaisse('FACTURATION');
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
    setNatureCaisse(caisse.nature || 'FACTURATION');
    setAfficherForm(true);
    setMsg({ type: '', text: '' });
  };

  const annulerForm = () => {
    setCaisseEnEdition(null);
    setCodeCaisse('');
    setNomCaisse('');
    setNatureCaisse('FACTURATION');
    setAfficherForm(false);
  };

  const enregistrerCaisse = async (e) => {
    e.preventDefault();
    if (caisseEnEdition && !permissions.peutModifier) {
      setMsg({ type: 'error', text: '⛔ Action non autorisée : Vous n’avez pas le droit de modifier les caisses.' });
      return;
    }
    if (!caisseEnEdition && !permissions.peutCreer) {
      setMsg({ type: 'error', text: '⛔ Action non autorisée : Vous n’avez pas le droit de créer des caisses.' });
      return;
    }

    if (!codeCaisse.trim() || !nomCaisse.trim()) {
      setMsg({ type: 'error', text: '⚠️ Veuillez remplir le code et le nom de la caisse.' });
      return;
    }

    const codeSaisi = codeCaisse.trim().toUpperCase();
    const nomSaisi = nomCaisse.trim().toUpperCase();

    try {
      const { data: caissesExistantes, error: errVerif } = await supabase
        .from('caisses')
        .select('id, code_caisse, nom_caisse')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);

      if (errVerif) throw errVerif;

      const liste = caissesExistantes || [];

      const doublonCode = liste.some(c => 
        String(c.code_caisse || '').toUpperCase() === codeSaisi && 
        (!caisseEnEdition || String(c.id) !== String(caisseEnEdition.id))
      );

      if (doublonCode) {
        setMsg({ type: 'error', text: `⛔ Erreur : Le code caisse "${codeSaisi}" existe déjà.` });
        return;
      }

      const doublonNom = liste.some(c => 
        String(c.nom_caisse || '').toUpperCase() === nomSaisi && 
        (!caisseEnEdition || String(c.id) !== String(caisseEnEdition.id))
      );

      if (doublonNom) {
        setMsg({ type: 'error', text: `⛔ Erreur : Le nom de caisse "${nomSaisi}" existe déjà.` });
        return;
      }

      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        code_caisse: codeSaisi,
        nom_caisse: nomSaisi,
        nature: natureCaisse,
      };

      if (caisseEnEdition) {
        const { error } = await supabase
          .from('caisses')
          .update(payload)
          .eq('id', caisseEnEdition.id);

        if (error) throw error;
        setMsg({ type: 'success', text: '✅ Caisse mise à jour avec succès !' });
      } else {
        const { error } = await supabase
          .from('caisses')
          .insert([payload]);

        if (error) throw error;
        setMsg({ type: 'success', text: '✅ Nouvelle caisse enregistrée avec succès !' });
      }

      annulerForm();
      chargerPermissionsEtCaisses();
    } catch (err) {
      setMsg({ type: 'error', text: 'Erreur : ' + err.message });
    }
  };

  const supprimerCaisse = async () => {
    // Double vérification stricte de la permission de suppression
    if (!permissions.peutSupprimer) {
      setMsg({ type: 'error', text: '⛔ Action non autorisée : Votre profil n’a pas le droit de supprimer des caisses.' });
      return;
    }
    if (!caisseEnEdition) return;
    if (!confirm(`Voulez-vous vraiment supprimer la caisse "${caisseEnEdition.nom_caisse}" ?`)) return;

    try {
      const { error } = await supabase
        .from('caisses')
        .delete()
        .eq('id', caisseEnEdition.id);

      if (error) throw error;

      setMsg({ type: 'success', text: 'Caisse supprimée avec succès.' });
      annulerForm();
      chargerPermissionsEtCaisses();
    } catch (err) {
      setMsg({ type: 'error', text: 'Erreur suppression : ' + err.message });
    }
  };

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
          🏧 Caisses ({caisses.length})
        </h2>
        <div className="flex items-center gap-1">
          {permissions.peutCreer && (
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
            onClick={() => { setAfficherForm(false); setCaisseEnEdition(null); }}
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

      {afficherForm ? (
        <form onSubmit={enregistrerCaisse} className="bg-white p-3 rounded-xl border border-orange-500/50 shadow-sm space-y-2.5">
          <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
            <h3 className="font-extrabold text-slate-900 text-[11px] uppercase">
              {caisseEnEdition ? '✏️ Modifier la Caisse' : '🏧 Nouvelle Caisse'}
            </h3>
            <button
              type="button"
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
                disabled={caisseEnEdition && !permissions.peutModifier}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono font-bold uppercase text-[10px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
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
                disabled={caisseEnEdition && !permissions.peutModifier}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-bold uppercase text-[10px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter mb-0.5">Nature de la Caisse</label>
              <select
                value={natureCaisse}
                onChange={(e) => setNatureCaisse(e.target.value)}
                disabled={caisseEnEdition && !permissions.peutModifier}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 font-black text-[10px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-orange-500"
              >
                <option value="FACTURATION">FACTURATION</option>
                <option value="PRINCIPALE">PRINCIPALE</option>
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            {/* Le bouton de suppression s'affiche uniquement si l'utilisateur a explicitement la permission */}
            {caisseEnEdition && permissions.peutSupprimer ? (
              <button
                type="button"
                onClick={supprimerCaisse}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-2 py-1 rounded text-[10px] transition"
              >
                🗑️ Supprimer
              </button>
            ) : <div />}

            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={annulerForm}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1 rounded text-[10px] transition"
              >
                Annuler
              </button>
              {((caisseEnEdition && permissions.peutModifier) || (!caisseEnEdition && permissions.peutCreer)) && (
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1 rounded text-[10px] shadow-2xs transition"
                >
                  {caisseEnEdition ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              )}
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
          {loading ? (
            <p className="text-slate-400 text-center py-6 text-[10px]">Chargement des caisses...</p>
          ) : caisses.length === 0 ? (
            <div className="text-center py-6 space-y-2">
              <p className="text-slate-400 font-bold text-[10px]">Aucune caisse enregistrée.</p>
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
            <div className="grid grid-cols-2 gap-2">
              {caisses.map((c) => (
                <div
                  key={c.id}
                  onClick={() => ouvrirEdition(c)}
                  className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-orange-50/60 hover:border-orange-300 cursor-pointer transition flex flex-col justify-between shadow-2xs group"
                >
                  <div className="space-y-1">
                    <div>
                      <span className={`inline-block text-[8px] px-1.5 py-0.5 rounded font-black border ${
                        c.nature === 'PRINCIPALE'
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
          )}
        </div>
      )}

    </div>
  );
}