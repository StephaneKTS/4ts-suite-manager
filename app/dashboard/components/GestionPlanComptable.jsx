'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { localSync } from '../../lib/localSync';

export default function GestionPlanComptable({ entrepriseId = '4TS-234321' }) {
  const [comptes, setComptes] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);
  const [afficherForm, setAfficherForm] = useState(false);
  const [compteEnEdition, setCompteEnEdition] = useState(null);
  const [recherche, setRecherche] = useState('');
  const [filtreType, setFiltreType] = useState('TOUS');

  // --- GESTION DES DROITS ET AUTORISATIONS ---
  const [roleNom, setRoleNom] = useState('');
  const [permissions, setPermissions] = useState({
    lecture: true,
    creation: true,
    modification: true,
    suppression: false,
  });

  // Règle 1 : Pagination / Limite d'affichage mobile
  const [limiteComptes, setLimiteComptes] = useState(20);

  const [triCol, setTriCol] = useState('code_compte');
  const [triOrdre, setTriOrdre] = useState('asc');

  const [nouveauCompte, setNouveauCompte] = useState({
    code_compte: '',
    intitule_compte: '',
    type_compte: '',
  });

  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();
  const cleCacheComptes = `comptes_comptables_${entrepriseId}_${moduleActuel}`;

  const chargerPermissionsEtComptes = async () => {
    // 1. Chargement instantané depuis le cache local (Zéro attente)
    const comptesLocaux = localSync.recupererDonneesLocales(cleCacheComptes);
    if (comptesLocaux && comptesLocaux.length > 0) {
      setComptes(comptesLocaux);
      setChargement(false);
    } else {
      setChargement(true);
    }

    try {
      // 2. Charger et analyser les permissions de l'employé connecté
      const utilisateurConnecteStr = localStorage.getItem('utilisateur_connecte');
      if (utilisateurConnecteStr) {
        const userObj = JSON.parse(utilisateurConnecteStr);
        const nomRoleUser = (userObj.nom_role || userObj.role || '').trim().toUpperCase();
        setRoleNom(nomRoleUser);

        if (nomRoleUser && nomRoleUser !== 'ADMINISTRATEUR' && nomRoleUser !== 'SUPER_ADMIN') {
          const pComptable = userObj.permissions?.['plan_comptable'] || userObj.permissions?.['comptabilite'];
          
          if (pComptable) {
            setPermissions({
              lecture: pComptable.lecture ?? true,
              creation: pComptable.creation ?? true,
              modification: pComptable.modification ?? true,
              suppression: pComptable.suppression ?? false,
            });
          } else {
            const { data: roleData } = await supabase
              .from('roles')
              .select('*')
              .eq('id_entreprise', entrepriseId)
              .eq('module', moduleActuel)
              .eq('nom_role', nomRoleUser)
              .maybeSingle();

            const rolePerm = roleData?.permissions?.['plan_comptable'] || roleData?.permissions?.['comptabilite'];
            if (rolePerm) {
              setPermissions({
                lecture: rolePerm.lecture ?? true,
                creation: rolePerm.creation ?? true,
                modification: rolePerm.modification ?? true,
                suppression: rolePerm.suppression ?? false,
              });
            }
          }
        }
      }

      // 3. Charger les comptes du plan comptable (filtrés strictement par entreprise et module)
      const { data, error } = await supabase
        .from('comptes_comptables')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);

      if (error) throw error;
      const listComptes = data || [];
      setComptes(listComptes);

      // Mise à jour du cache local propre
      localSync.sauvegarderDonneesLocales(cleCacheComptes, listComptes);
    } catch (err) {
      console.error('Erreur chargement plan comptable :', err.message);
      if (!comptesLocaux || comptesLocaux.length === 0) {
        setComptes([]);
      }
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerPermissionsEtComptes();
    localSync.synchroniserVersCloud(supabase);
  }, [entrepriseId, moduleActuel]);

  const genererCodeAutomatique = (type, intitule = '') => {
    const intituleUpper = intitule.toUpperCase();
    let prefixe = '605';
    
    if (intituleUpper.includes('ACHAT')) {
      prefixe = '601';
    } else if (type === 'PRODUIT') {
      prefixe = '701';
    }

    const comptesMemePrefixe = comptes.filter(c => (c.code_compte || '').startsWith(prefixe));
    
    let maxSuffixe = 0;
    comptesMemePrefixe.forEach(c => {
      const suffixeStr = c.code_compte.replace(prefixe, '');
      const suffixeNum = parseInt(suffixeStr, 10);
      if (!isNaN(suffixeNum) && suffixeNum > maxSuffixe) {
        maxSuffixe = suffixeNum;
      }
    });

    const prochainSuffixe = String(maxSuffixe + 1).padStart(3, '0');
    return `${prefixe}${prochainSuffixe}`;
  };

  const gererChangementNature = (e) => {
    const nature = e.target.value;
    const codeGenere = !compteEnEdition ? genererCodeAutomatique(nature, nouveauCompte.intitule_compte) : nouveauCompte.code_compte;
    setNouveauCompte({
      ...nouveauCompte,
      type_compte: nature,
      code_compte: codeGenere,
    });
  };

  const gererChangementIntitule = (e) => {
    const val = e.target.value.toUpperCase();
    let codeGenere = nouveauCompte.code_compte;
    
    if (!compteEnEdition && nouveauCompte.type_compte) {
      codeGenere = genererCodeAutomatique(nouveauCompte.type_compte, val);
    }

    setNouveauCompte({
      ...nouveauCompte,
      intitule_compte: val,
      code_compte: codeGenere,
    });
  };

  const enregistrerCompte = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;

    if (compteEnEdition && !permissions.modification) {
      alert('⛔ Action non autorisée : Modification interdite par votre profil.');
      return;
    }
    if (!compteEnEdition && !permissions.creation) {
      alert('⛔ Action non autorisée : Création interdite par votre profil.');
      return;
    }

    if (!nouveauCompte.type_compte) {
      alert('Veuillez sélectionner la nature du compte.');
      return;
    }

    setEnTrainDeSauvegarder(true);
    try {
      const codeSaisi = (nouveauCompte.code_compte || '').trim();
      const intituleSaisi = (nouveauCompte.intitule_compte || '').trim().toUpperCase();

      const doublonCode = comptes.find(c => 
        (c.code_compte || '').trim().toLowerCase() === codeSaisi.toLowerCase() && 
        (!compteEnEdition || c.id !== compteEnEdition.id)
      );

      if (doublonCode) {
        alert(`Le numéro de compte "${codeSaisi}" existe déjà dans le plan comptable.`);
        setEnTrainDeSauvegarder(false);
        return;
      }

      const doublonIntitule = comptes.find(c => 
        (c.intitule_compte || '').trim().toUpperCase() === intituleSaisi && 
        (!compteEnEdition || c.id !== compteEnEdition.id)
      );

      if (doublonIntitule) {
        alert(`L'intitulé de compte "${intituleSaisi}" existe déjà dans le plan comptable.`);
        setEnTrainDeSauvegarder(false);
        return;
      }

      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        code_compte: codeSaisi,
        intitule_compte: intituleSaisi,
        type_compte: nouveauCompte.type_compte,
      };

      if (compteEnEdition) {
        const { error } = await supabase
          .from('comptes_comptables')
          .update(payload)
          .eq('id', compteEnEdition.id);
        if (error) {
          localSync.ajouterFileAttente('UPDATE', 'comptes_comptables', { ...payload, id: compteEnEdition.id });
        }

        setComptes(prev => prev.map(c => c.id === compteEnEdition.id ? { ...c, ...payload } : c));
        alert('Compte mis à jour avec succès !');
      } else {
        const idTemp = 'temp_' + Date.now();
        const payloadInsertion = { ...payload, id: idTemp };

        const { error, data } = await supabase.from('comptes_comptables').insert([payload]).select().maybeSingle();
        if (error) {
          localSync.ajouterFileAttente('INSERT', 'comptes_comptables', payloadInsertion);
          setComptes(prev => [payloadInsertion, ...prev]);
        } else if (data) {
          setComptes(prev => [data, ...prev.filter(c => c.id !== data.id)]);
        }
        alert('Compte créé avec succès !');
      }

      localStorage.removeItem(cleCacheComptes);

      annulerForm();
      await chargerPermissionsEtComptes();
    } catch (err) {
      alert('Erreur : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const ouvrirEdition = (compte) => {
    if (!permissions.modification) {
      alert('⛔ Action non autorisée : Vous n’avez pas le droit de modifier les comptes.');
      return;
    }
    setCompteEnEdition(compte);
    setNouveauCompte({
      code_compte: compte.code_compte || '',
      intitule_compte: compte.intitule_compte || '',
      type_compte: compte.type_compte || '',
    });
    setAfficherForm(true);
  };

  const annulerForm = () => {
    if (enTrainDeSauvegarder) return;
    setCompteEnEdition(null);
    setNouveauCompte({
      code_compte: '',
      intitule_compte: '',
      type_compte: '',
    });
    setAfficherForm(false);
  };

  const supprimerCompte = async () => {
    if (!compteEnEdition || enTrainDeSauvegarder) return;
    if (!permissions.suppression) {
      alert('⛔ Action non autorisée : Suppression interdite par votre profil.');
      return;
    }
    if (!confirm('Voulez-vous vraiment supprimer ce compte comptable ?')) return;

    setEnTrainDeSauvegarder(true);
    try {
      const { error } = await supabase.from('comptes_comptables').delete().eq('id', compteEnEdition.id);
      if (error) {
        localSync.ajouterFileAttente('DELETE', 'comptes_comptables', { id: compteEnEdition.id });
      }

      setComptes(prev => prev.filter(c => c.id !== compteEnEdition.id));
      localStorage.removeItem(cleCacheComptes);

      alert('Compte supprimé avec succès.');
      annulerForm();
      await chargerPermissionsEtComptes();
    } catch (err) {
      alert('Erreur : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const gererTri = (colonne) => {
    if (enTrainDeSauvegarder) return;
    if (triCol === colonne) {
      setTriOrdre(triOrdre === 'asc' ? 'desc' : 'asc');
    } else {
      setTriCol(colonne);
      setTriOrdre('asc');
    }
  };

  const rendreFlecheTri = (colonne) => {
    if (triCol !== colonne) return <span className="text-slate-400 ml-1">↕</span>;
    return <span className="text-orange-600 ml-1 font-bold">{triOrdre === 'asc' ? '↑' : '↓'}</span>;
  };

  const comptesFiltres = comptes
    .filter((c) => {
      const code = (c.code_compte || '').toLowerCase();
      const intitule = (c.intitule_compte || '').toLowerCase();
      const query = recherche.toLowerCase();
      const matchTexte = code.includes(query) || intitule.includes(query);
      const matchType = filtreType === 'TOUS' || c.type_compte === filtreType;
      return matchTexte && matchType;
    })
    .sort((a, b) => {
      let valA = a[triCol] || '';
      let valB = b[triCol] || '';
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return triOrdre === 'asc' ? -1 : 1;
      if (valA > valB) return triOrdre === 'asc' ? 1 : -1;
      return 0;
    });

  const comptesAffiches = comptesFiltres.slice(0, limiteComptes);

  return (
    <div className="space-y-2 text-[10px] font-sans">
      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-slate-900 uppercase text-[11px] flex items-center gap-1">
            <span>📚</span> PLAN COMPTABLE ({comptesAffiches.length} / {comptesFiltres.length})
          </h3>
          {roleNom && (
            <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold border border-slate-200">
              Rôle : {roleNom}
            </span>
          )}
        </div>
        {permissions.creation && (
          <button
            type="button"
            disabled={enTrainDeSauvegarder}
            onClick={() => {
              if (enTrainDeSauvegarder) return;
              if (afficherForm) annulerForm();
              else {
                setNouveauCompte({ code_compte: '', intitule_compte: '', type_compte: 'CHARGE' });
                setCompteEnEdition(null);
                setAfficherForm(true);
              }
            }}
            className="bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 text-white font-black px-3 py-1 rounded-lg transition shadow-2xs text-[10px]"
          >
            {afficherForm ? '✖' : 'Nouveau'}
          </button>
        )}
      </div>

      {afficherForm ? (
        <form onSubmit={enregistrerCompte} className="bg-white border-2 border-orange-500/50 p-3 rounded-xl space-y-2 shadow-md">
          <div className="flex justify-between items-center border-b border-slate-200 pb-1">
            <h4 className="font-black text-orange-600 uppercase text-[10px]">
              {compteEnEdition ? 'Modifier le Compte' : 'Nouveau Compte'}
            </h4>
            <button type="button" disabled={enTrainDeSauvegarder} onClick={annulerForm} className="text-slate-500 font-black text-xs">✖</button>
          </div>

          <div>
            <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Nature *</label>
            <select
              required
              disabled={enTrainDeSauvegarder}
              value={nouveauCompte.type_compte}
              onChange={gererChangementNature}
              className="w-full bg-white border border-slate-300 rounded p-1 font-black text-slate-900 text-[10px] shadow-2xs"
            >
              <option value="">-- Choisir la nature --</option>
              <option value="CHARGE">🔴 CHARGE</option>
              <option value="PRODUIT">🟢 PRODUIT</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block font-black text-slate-800 mb-0.5 text-[9px]">N° Code (Modifiable) *</label>
              <input
                type="text"
                required
                disabled={enTrainDeSauvegarder}
                value={nouveauCompte.code_compte}
                onChange={(e) => setNouveauCompte({ ...nouveauCompte, code_compte: e.target.value })}
                placeholder="605001"
                className="w-full bg-white border border-slate-300 rounded p-1 font-black text-orange-600 text-[10px] shadow-2xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Intitulé *</label>
              <input
                type="text"
                required
                disabled={enTrainDeSauvegarder}
                value={nouveauCompte.intitule_compte}
                onChange={gererChangementIntitule}
                placeholder="EX: DÉPANNAGE MOTO, ACHAT..."
                className="w-full bg-white border border-slate-300 rounded p-1 font-extrabold uppercase text-slate-900 text-[10px] shadow-2xs"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
            {compteEnEdition && permissions.suppression ? (
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={supprimerCompte}
                className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-black px-3 py-1 rounded text-[10px] shadow-xs"
              >
                {enTrainDeSauvegarder ? 'Patientez...' : 'Supprimer'}
              </button>
            ) : <div />}
            <div className="flex gap-1 ml-auto">
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={annulerForm}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-black px-3 py-1 rounded text-[10px]"
              >
                Annuler
              </button>
              {((compteEnEdition && permissions.modification) || (!compteEnEdition && permissions.creation)) && (
                <button
                  type="submit"
                  disabled={enTrainDeSauvegarder}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-black px-3 py-1 rounded text-[10px] shadow"
                >
                  {enTrainDeSauvegarder ? 'Enregistrement...' : (compteEnEdition ? 'Mettre à jour' : 'Enregistrer')}
                </button>
              )}
            </div>
          </div>
        </form>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs items-center">
            <div className="sm:col-span-2">
              <input
                type="text"
                disabled={enTrainDeSauvegarder}
                value={recherche}
                onChange={(e) => setRecherche(e.target.value.toUpperCase())}
                placeholder="RECHERCHER..."
                className="w-full bg-white border border-slate-300 rounded px-2 py-1 font-extrabold uppercase text-slate-900 text-[10px] shadow-2xs placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={() => setFiltreType('TOUS')}
                className={`flex-1 py-1 rounded font-black text-[9px] border transition ${filtreType === 'TOUS' ? 'bg-orange-600 text-white border-orange-600' : 'bg-slate-50 text-slate-800 border-slate-300'}`}
              >
                Tous ({comptes.length})
              </button>
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={() => setFiltreType('CHARGE')}
                className={`flex-1 py-1 rounded font-black text-[9px] border transition ${filtreType === 'CHARGE' ? 'bg-red-600 text-white border-red-600' : 'bg-slate-50 text-slate-800 border-slate-300'}`}
              >
                Charges
              </button>
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={() => setFiltreType('PRODUIT')}
                className={`flex-1 py-1 rounded font-black text-[9px] border transition ${filtreType === 'PRODUIT' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-800 border-slate-300'}`}
              >
                Produits
              </button>
            </div>
          </div>

          {chargement ? (
            <div className="p-4 text-center text-slate-600 font-bold text-[10px]">Chargement...</div>
          ) : comptesFiltres.length === 0 ? (
            <div className="p-4 text-center text-slate-600 bg-white border border-slate-200 rounded-xl font-bold text-[10px]">
              Aucun compte trouvé.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-100 text-slate-900 border-b border-slate-200 uppercase font-black select-none">
                    <tr>
                      <th onClick={() => !enTrainDeSauvegarder && gererTri('code_compte')} className="p-2 cursor-pointer hover:bg-slate-200 w-24">
                        N° Compte {rendreFlecheTri('code_compte')}
                      </th>
                      <th onClick={() => !enTrainDeSauvegarder && gererTri('intitule_compte')} className="p-2 cursor-pointer hover:bg-slate-200">
                        Intitulé du Compte {rendreFlecheTri('intitule_compte')}
                      </th>
                      <th onClick={() => !enTrainDeSauvegarder && gererTri('type_compte')} className="p-2 cursor-pointer hover:bg-slate-200 text-center w-24">
                        Nature {rendreFlecheTri('type_compte')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-900 font-medium">
                    {comptesAffiches.map((c) => {
                      const estCharge = c.type_compte === 'CHARGE';
                      return (
                        <tr
                          key={c.id}
                          onClick={() => !enTrainDeSauvegarder && permissions.modification && ouvrirEdition(c)}
                          className={`transition select-none ${permissions.modification ? 'hover:bg-orange-50/70 cursor-pointer' : 'cursor-default'}`}
                        >
                          <td className="p-2 font-mono font-black text-orange-600 whitespace-nowrap">{c.code_compte}</td>
                          <td className="p-2 font-black uppercase text-slate-950 truncate max-w-[200px]">{c.intitule_compte}</td>
                          <td className="p-2 text-center whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded font-black text-[9px] border ${estCharge ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                              {estCharge ? 'CHARGE' : 'PRODUIT'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {limiteComptes < comptesFiltres.length && (
                <div className="text-center pt-1 pb-1">
                  <button
                    type="button"
                    disabled={enTrainDeSauvegarder}
                    onClick={() => setLimiteComptes(prev => prev + 20)}
                    className="bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 font-extrabold px-3 py-1.5 rounded-xl text-[10px] transition shadow-xs border border-slate-300"
                  >
                    📥 Charger 20 comptes de plus ({comptesFiltres.length - limiteComptes} restants)
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}