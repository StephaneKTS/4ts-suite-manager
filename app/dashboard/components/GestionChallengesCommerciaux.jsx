'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { localSync } from '../../lib/localSync';

export default function GestionChallengesCommerciaux({ entrepriseId = '4TS-234321' }) {
  const [challenges, setChallenges] = useState([]);
  const [employesList, setEmployesList] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [afficherForm, setAfficherForm] = useState(false);
  const [challengeEnEdition, setChallengeEnEdition] = useState(null);
  const [recherche, setRecherche] = useState('');

  // --- GESTION DES DROITS ET AUTORISATIONS ---
  const [roleNom, setRoleNom] = useState('');
  const [permissions, setPermissions] = useState({
    lecture: true,
    creation: true,
    modification: true,
    suppression: false,
  });

  // --- RÈGLE 1 : PAGINATION / LIMITES D'AFFICHAGE MOBILES ---
  const [limiteChallenges, setLimiteChallenges] = useState(20);

  // --- RÈGLE 3 : DÉSACTIVATION TEMPORAIRE (ÉVITER LES DOUBLONS) ---
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);

  // État pour afficher la liste des employés d'un statut cliqué
  const [statutSelectionnePourAffichage, setStatutSelectionnePourAffichage] = useState(null);

  const [triCol, setTriCol] = useState('nom_challenge');
  const [triOrdre, setTriOrdre] = useState('asc');

  const dateDuJourStr = new Date().toISOString().split('T')[0];

  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();
  const cleCacheChallenges = `challenges_commerciaux_${entrepriseId}_${moduleActuel}`;

  // État du formulaire de challenge
  const [nouveauChallenge, setNouveauChallenge] = useState({
    nom_challenge: '',
    type_commission: 'POURCENTAGE',
    valeur_commission: 0,
    applique_sur: moduleActuel === 'LIVRAISON' ? 'FRAIS_DE_LIVRAISON' : 'CHIFFRE_DAIRES',
    date_debut: dateDuJourStr,
    date_fin: dateDuJourStr,
    employes_concernes: [],
    statuts_concernes: moduleActuel === 'LIVRAISON' ? ['LIVREUR'] : ['COMMERCIAL'],
  });

  // États pour le tableau de simulation dynamique
  const [periodeSimulation, setPeriodeSimulation] = useState('JOUR');
  const [nbJoursPerso, setNbJoursPerso] = useState(10);
  const [volumeCourses, setVolumeCourses] = useState(10);
  const [fraisMoyen, setFraisMoyen] = useState(1500);

  // --- RÈGLE 2 : FONCTION RPC SUPABASE AVEC FALLBACK ROBUSTE ---
  const chargerChallenges = async () => {
    // 1. Chargement instantané depuis le cache local (Zéro attente)
    const challengesLocaux = localSync.recupererDonneesLocales(cleCacheChallenges);
    if (challengesLocaux && challengesLocaux.length > 0) {
      setChallenges(challengesLocaux);
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
          const permChallenges = userObj.permissions?.['challenges_commerciaux'] || userObj.permissions?.['challenges'] || userObj.permissions?.['commercial'];
          
          if (permChallenges) {
            setPermissions({
              lecture: permChallenges.lecture ?? true,
              creation: permChallenges.creation ?? true,
              modification: permChallenges.modification ?? true,
              suppression: permChallenges.suppression ?? false,
            });
          } else {
            const { data: roleData } = await supabase
              .from('roles')
              .select('*')
              .eq('id_entreprise', entrepriseId)
              .eq('module', moduleActuel)
              .eq('nom_role', nomRoleUser)
              .maybeSingle();

            const rolePerm = roleData?.permissions?.['challenges_commerciaux'] || roleData?.permissions?.['challenges'] || roleData?.permissions?.['commercial'];
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

      let liste = [];
      const { data: challengesRpc, error: rpcError } = await supabase.rpc('recuperer_challenges_commerciaux', {
        p_entreprise_id: entrepriseId,
        p_module: moduleActuel
      });

      if (rpcError) {
        const { data, error } = await supabase
          .from('challenges_commerciaux')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        liste = data || [];
      } else {
        liste = challengesRpc || [];
      }

      setChallenges(liste);
      localSync.sauvegarderDonneesLocales(cleCacheChallenges, liste);

      // Charger la liste des employés
      const { data: empData } = await supabase
        .from('employes')
        .select('*')
        .eq('id_entreprise', entrepriseId);
      setEmployesList(empData || []);

      // Charger dynamiquement les rôles depuis la table 'roles'
      const { data: rolesData } = await supabase
        .from('roles')
        .select('*')
        .eq('id_entreprise', entrepriseId);
      
      if (rolesData && rolesData.length > 0) {
        const nomsRoles = [...new Set(rolesData.map(r => (r.nom_role || r.role || '').trim().toUpperCase()).filter(Boolean))];
        setRolesList(nomsRoles);
      } else {
        setRolesList(['LIVREUR', 'COMPTABLE', 'SUPERVISEUR', 'COMMERCIAL', 'CHAUFFEUR']);
      }
    } catch (err) {
      console.error('Erreur chargement challenges :', err.message);
      if (!challengesLocaux || challengesLocaux.length === 0) {
        setChallenges([]);
      }
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => { 
    chargerChallenges(); 
    localSync.synchroniserVersCloud(supabase);
  }, [entrepriseId, moduleActuel]);

  // Calcul du nombre de jours selon le choix de simulation
  const obtenirNombreJoursFacteur = () => {
    if (periodeSimulation === 'JOUR') return 1;
    if (periodeSimulation === 'SEMAINE') return 7;
    if (periodeSimulation === 'MOIS') return 26;
    if (periodeSimulation === 'PERSONNALISE') return parseInt(nbJoursPerso) || 1;
    return 1;
  };

  const nombreJours = obtenirNombreJoursFacteur();
  const volumeTotalPeriode = (parseInt(volumeCourses) || 0) * (periodeSimulation === 'JOUR' ? 1 : nombreJours);
  const totalFraisLivraisonSimulation = volumeTotalPeriode * (parseFloat(fraisMoyen) || 0);

  const calculerSimulationCommission = () => {
    const valComm = parseFloat(nouveauChallenge.valeur_commission) || 0;
    if (nouveauChallenge.type_commission === 'POURCENTAGE') {
      return (totalFraisLivraisonSimulation * valComm) / 100;
    } else {
      return valComm * volumeTotalPeriode;
    }
  };

  const enregistrerChallenge = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;

    if (challengeEnEdition && !permissions.modification) {
      alert('⛔ Action non autorisée : Votre profil n’a pas le droit de modifier les challenges.');
      return;
    }
    if (!challengeEnEdition && !permissions.creation) {
      alert('⛔ Action non autorisée : Votre profil n’a pas le droit de créer des challenges.');
      return;
    }

    setEnTrainDeSauvegarder(true);
    try {
      const payloadChallenge = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        nom_challenge: nouveauChallenge.nom_challenge.trim().toUpperCase(),
        type_commission: nouveauChallenge.type_commission,
        valeur_commission: parseFloat(nouveauChallenge.valeur_commission) || 0,
        applique_sur: moduleActuel === 'LIVRAISON' ? 'FRAIS_DE_LIVRAISON' : 'CHIFFRE_DAIRES',
        date_debut: nouveauChallenge.date_debut || dateDuJourStr,
        date_fin: nouveauChallenge.date_fin || dateDuJourStr,
        employes_concernes: JSON.stringify(nouveauChallenge.employes_concernes),
        statuts_concernes: JSON.stringify(nouveauChallenge.statuts_concernes),
      };

      if (challengeEnEdition) {
        payloadChallenge.id = challengeEnEdition.id;
        const { error } = await supabase.from('challenges_commerciaux').update(payloadChallenge).eq('id', challengeEnEdition.id);
        if (error) {
          localSync.ajouterFileAttente('UPDATE', 'challenges_commerciaux', payloadChallenge);
        }
        alert('Challenge commercial mis à jour avec succès !');
      } else {
        const idTemp = 'temp_' + Date.now();
        const payloadInsertion = { ...payloadChallenge, id: idTemp };

        const { error, data } = await supabase.from('challenges_commerciaux').insert([payloadChallenge]).select().maybeSingle();
        if (error) {
          localSync.ajouterFileAttente('INSERT', 'challenges_commerciaux', payloadInsertion);
        }
        alert('Challenge commercial créé avec succès !');
      }

      localStorage.removeItem(cleCacheChallenges);
      annulerForm();
      await chargerChallenges();
    } catch (err) { 
      alert('Erreur : ' + err.message); 
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const ouvrirEdition = (item) => {
    if (enTrainDeSauvegarder) return;
    setChallengeEnEdition(item);
    let employesParsed = [];
    let statutsParsed = moduleActuel === 'LIVRAISON' ? ['LIVREUR'] : ['COMMERCIAL'];
    try {
      if (item.employes_concernes) employesParsed = typeof item.employes_concernes === 'string' ? JSON.parse(item.employes_concernes) : item.employes_concernes;
      if (item.statuts_concernes) statutsParsed = typeof item.statuts_concernes === 'string' ? JSON.parse(item.statuts_concernes) : item.statuts_concernes;
    } catch (e) {}

    setNouveauChallenge({
      nom_challenge: item.nom_challenge || '',
      type_commission: item.type_commission || 'POURCENTAGE',
      valeur_commission: item.valeur_commission || 0,
      applique_sur: item.applique_sur || (moduleActuel === 'LIVRAISON' ? 'FRAIS_DE_LIVRAISON' : 'CHIFFRE_DAIRES'),
      date_debut: item.date_debut || dateDuJourStr,
      date_fin: item.date_fin || dateDuJourStr,
      employes_concernes: employesParsed,
      statuts_concernes: statutsParsed,
    });
    setAfficherForm(true);
  };

  const annulerForm = () => {
    if (enTrainDeSauvegarder) return;
    setChallengeEnEdition(null);
    setStatutSelectionnePourAffichage(null);
    setNouveauChallenge({ 
      nom_challenge: '', 
      type_commission: 'POURCENTAGE', 
      valeur_commission: 0, 
      applique_sur: moduleActuel === 'LIVRAISON' ? 'FRAIS_DE_LIVRAISON' : 'CHIFFRE_DAIRES',
      date_debut: dateDuJourStr, 
      date_fin: dateDuJourStr, 
      employes_concernes: [], 
      statuts_concernes: moduleActuel === 'LIVRAISON' ? ['LIVREUR'] : ['COMMERCIAL'] 
    });
    setAfficherForm(false);
  };

  const supprimerChallenge = async () => {
    if (enTrainDeSauvegarder || !challengeEnEdition) return;

    if (!permissions.suppression) {
      alert('⛔ Action non autorisée : Votre profil n’a pas le droit de supprimer des challenges.');
      return;
    }

    if (!confirm(`Voulez-vous vraiment supprimer définitivement le challenge "${challengeEnEdition.nom_challenge}" ?`)) return;

    setEnTrainDeSauvegarder(true);
    try {
      const { error } = await supabase.from('challenges_commerciaux').delete().eq('id', challengeEnEdition.id);
      if (error) {
        localSync.ajouterFileAttente('DELETE', 'challenges_commerciaux', { id: challengeEnEdition.id });
      }

      localStorage.removeItem(cleCacheChallenges);
      alert('Challenge supprimé avec succès.');
      annulerForm();
      await chargerChallenges();
    } catch (err) { 
      alert('Erreur : ' + err.message); 
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const gererTri = (colonne) => {
    if (enTrainDeSauvegarder) return;
    if (triCol === colonne) setTriOrdre(triOrdre === 'asc' ? 'desc' : 'asc');
    else { setTriCol(colonne); setTriOrdre('asc'); }
  };

  const rendreFlecheTri = (colonne) => triCol !== colonne ? <span className="text-slate-400">↕</span> : <span className="text-orange-600">{triOrdre === 'asc' ? '↑' : '↓'}</span>;

  const challengesFiltres = challenges.filter((c) => {
    return (c.nom_challenge || '').toLowerCase().includes(recherche.toLowerCase());
  }).sort((a, b) => {
    let valA = a[triCol] || ''; let valB = b[triCol] || '';
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();
    if (valA < valB) return triOrdre === 'asc' ? -1 : 1;
    if (valA > valB) return triOrdre === 'asc' ? 1 : -1;
    return 0;
  });

  const challengesAffiches = challengesFiltres.slice(0, limiteChallenges);

  const employesDuStatutClique = statutSelectionnePourAffichage 
    ? employesList.filter(emp => {
        const fonctionEmp = (emp.fonction || emp.statut || emp.role || '').trim().toUpperCase();
        return fonctionEmp === statutSelectionnePourAffichage;
      })
    : [];

  return (
    <div className="space-y-2.5 text-[11px] font-sans">
      
      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-slate-800 uppercase text-xs">
            🏆 CHALLENGES COMMERCIAUX [{moduleActuel}] ({challengesAffiches.length} / {challengesFiltres.length})
          </h3>
          {roleNom && (
            <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold border border-slate-200">
              Rôle : {roleNom}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {permissions.creation && (
            <button
              type="button"
              disabled={enTrainDeSauvegarder}
              onClick={() => { if (!enTrainDeSauvegarder) { setChallengeEnEdition(null); setAfficherForm(true); } }}
              className="px-3 py-1.5 rounded-lg font-bold text-[11px] transition shadow-2xs bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white"
            >
              ＋ Nouveau Challenge
            </button>
          )}
          <button
            type="button"
            disabled={enTrainDeSauvegarder}
            onClick={() => { if (!enTrainDeSauvegarder) annulerForm(); }}
            className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition border shadow-2xs ${
              !afficherForm 
                ? 'bg-slate-900 text-white border-slate-900' 
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
            }`}
          >
            Liste
          </button>
        </div>
      </div>

      {afficherForm ? (
        <form onSubmit={enregistrerChallenge} className="bg-slate-50 border border-orange-500/40 p-3 rounded-xl space-y-3 shadow-2xs">
          <div className="flex justify-between items-center border-b pb-1">
            <h4 className="font-bold text-orange-600 uppercase text-[10px]">
              {challengeEnEdition ? '✏️ Édition du Challenge' : '➕ Nouveau Challenge Commercial'}
            </h4>
            <button type="button" disabled={enTrainDeSauvegarder} onClick={annulerForm} className="text-slate-400 font-bold text-xs">✖</button>
          </div>

          <div className="space-y-2">
            <div>
              <label className="block font-semibold mb-0.5 text-[9px] text-slate-500">Nom du Challenge *</label>
              <input type="text" required disabled={enTrainDeSauvegarder} value={nouveauChallenge.nom_challenge} onFocus={(e) => e.target.select()} onChange={(e) => setNouveauChallenge({ ...nouveauChallenge, nom_challenge: e.target.value.toUpperCase() })} placeholder="EX: CHALLENGE PERFORMANCE Q1" className="w-full bg-white border rounded p-1.5 font-extrabold uppercase text-xs text-slate-800" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-center">
              <div>
                <label className="block font-semibold mb-0.5 text-[9px] text-slate-500">Type Commission *</label>
                <select value={nouveauChallenge.type_commission} disabled={enTrainDeSauvegarder} onChange={(e) => setNouveauChallenge({ ...nouveauChallenge, type_commission: e.target.value })} className="w-full bg-white border rounded p-1.5 font-bold text-xs text-slate-800">
                  <option value="POURCENTAGE">Pourcentage (%)</option>
                  <option value="MONTANT">Montant fixe (F)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-0.5 text-[9px] text-slate-500">Valeur *</label>
                <input type="number" step="0.01" required disabled={enTrainDeSauvegarder} value={nouveauChallenge.valeur_commission} onFocus={(e) => e.target.select()} onChange={(e) => setNouveauChallenge({ ...nouveauChallenge, valeur_commission: e.target.value })} className="w-full bg-white border rounded p-1.5 font-bold text-xs text-slate-800" />
              </div>
              <div>
                <label className="block font-semibold mb-0.5 text-[9px] text-slate-500">Application</label>
                <div className="w-full bg-slate-100 border rounded p-1.5 font-black text-[10px] text-emerald-700 truncate text-center">
                  🎯 {moduleActuel === 'LIVRAISON' ? 'Appliqué sur : Frais de livraison' : "Appliqué sur : Chiffre d'affaires"}
                </div>
              </div>
            </div>

            <div className="bg-amber-50/80 border border-amber-300 rounded-lg p-2.5 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-extrabold text-amber-900 uppercase">
                <span>📊 Tableau de Simulation Dynamique</span>
                <div className="flex items-center gap-1 bg-white border border-amber-300 rounded p-0.5">
                  <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setPeriodeSimulation('JOUR')} className={`px-2 py-0.5 rounded font-black text-[9px] ${periodeSimulation === 'JOUR' ? 'bg-amber-600 text-white' : 'text-slate-700'}`}>Jour</button>
                  <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setPeriodeSimulation('SEMAINE')} className={`px-2 py-0.5 rounded font-black text-[9px] ${periodeSimulation === 'SEMAINE' ? 'bg-amber-600 text-white' : 'text-slate-700'}`}>Semaine (7j)</button>
                  <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setPeriodeSimulation('MOIS')} className={`px-2 py-0.5 rounded font-black text-[9px] ${periodeSimulation === 'MOIS' ? 'bg-amber-600 text-white' : 'text-slate-700'}`}>Mois (26j)</button>
                  <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setPeriodeSimulation('PERSONNALISE')} className={`px-2 py-0.5 rounded font-black text-[9px] ${periodeSimulation === 'PERSONNALISE' ? 'bg-amber-600 text-white' : 'text-slate-700'}`}>Perso</button>
                </div>
              </div>

              {periodeSimulation === 'PERSONNALISE' && (
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="font-bold text-slate-700">Nombre de jours :</span>
                  <input type="number" disabled={enTrainDeSauvegarder} value={nbJoursPerso} onFocus={(e) => e.target.select()} onChange={(e) => setNbJoursPerso(e.target.value)} className="w-20 bg-white border border-amber-200 rounded p-1 font-bold text-slate-800" />
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-center text-[10px]">
                <div>
                  <label className="block text-[8px] text-slate-600 font-bold">Frais Moyen (F / course)</label>
                  <input type="number" disabled={enTrainDeSauvegarder} value={fraisMoyen} onFocus={(e) => e.target.select()} onChange={(e) => setFraisMoyen(e.target.value)} className="w-full bg-white border border-amber-200 rounded p-1 font-bold text-slate-800" />
                </div>
                <div>
                  <label className="block text-[8px] text-slate-600 font-bold">Volume ({periodeSimulation === 'JOUR' ? 'Par Jour' : 'Total Période'})</label>
                  <input type="number" disabled={enTrainDeSauvegarder} value={volumeCourses} onFocus={(e) => e.target.select()} onChange={(e) => setVolumeCourses(e.target.value)} className="w-full bg-white border border-amber-200 rounded p-1 font-bold text-slate-800" />
                </div>
                <div>
                  <label className="block text-[8px] text-slate-600 font-bold">Total Frais (Période)</label>
                  <div className="w-full bg-white border border-amber-200 rounded p-1 font-mono font-bold text-slate-900 truncate">
                    {totalFraisLivraisonSimulation.toLocaleString()} F
                  </div>
                </div>
                <div className="bg-white border border-amber-300 rounded p-1 text-right">
                  <span className="block text-[8px] text-slate-500 uppercase font-bold">Commission Estimée :</span>
                  <span className="font-black text-emerald-600 text-xs">
                    {calculerSimulationCommission().toLocaleString()} F CFA
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold mb-0.5 text-[9px] text-slate-500">Date de Début *</label>
                <input type="date" required disabled={enTrainDeSauvegarder} value={nouveauChallenge.date_debut} onFocus={(e) => e.target.select()} onChange={(e) => setNouveauChallenge({ ...nouveauChallenge, date_debut: e.target.value })} className="w-full bg-white border rounded p-1.5 font-bold text-xs text-slate-800" />
              </div>
              <div>
                <label className="block font-semibold mb-0.5 text-[9px] text-slate-500">Date de Fin *</label>
                <input type="date" required disabled={enTrainDeSauvegarder} value={nouveauChallenge.date_fin} onFocus={(e) => e.target.select()} onChange={(e) => setNouveauChallenge({ ...nouveauChallenge, date_fin: e.target.value })} className="w-full bg-white border rounded p-1.5 font-bold text-xs text-slate-800" />
              </div>
            </div>

            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div>
                <label className="block font-semibold mb-1 text-[9px] text-slate-500 uppercase">
                  Statuts / Rôles concernés <span className="text-orange-600 font-normal lowercase">(cliquez sur un rôle pour voir les employés)</span> :
                </label>
                <div className="flex flex-wrap gap-3 bg-white p-2 border rounded">
                  {(rolesList.length > 0 ? rolesList : ['LIVREUR', 'COMPTABLE', 'SUPERVISEUR', 'COMMERCIAL', 'CHAUFFEUR']).map((statut) => {
                    const estActifAffichage = statutSelectionnePourAffichage === statut;
                    return (
                      <div key={statut} className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                        <input 
                          type="checkbox" 
                          disabled={enTrainDeSauvegarder}
                          checked={nouveauChallenge.statuts_concernes.includes(statut)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            if (checked) {
                              setNouveauChallenge({ ...nouveauChallenge, statuts_concernes: [...nouveauChallenge.statuts_concernes, statut] });
                            } else {
                              setNouveauChallenge({ ...nouveauChallenge, statuts_concernes: nouveauChallenge.statuts_concernes.filter(s => s !== statut) });
                            }
                          }}
                        />
                        <span 
                          onClick={() => setStatutSelectionnePourAffichage(estActifAffichage ? null : statut)}
                          className={`font-bold cursor-pointer transition ${estActifAffichage ? 'text-orange-600 underline' : 'text-slate-700 hover:text-blue-600'}`}
                          title="Cliquer pour afficher la liste des personnes de ce rôle"
                        >
                          {statut} 👁️
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {statutSelectionnePourAffichage && (
                <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-2.5 space-y-1.5 animate-fadeIn">
                  <div className="flex justify-between items-center text-[10px] font-black text-blue-900 uppercase">
                    <span>👥 Employés ayant le rôle : {statutSelectionnePourAffichage} ({employesDuStatutClique.length})</span>
                    <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setStatutSelectionnePourAffichage(null)} className="text-slate-500 hover:text-rose-600 font-bold">✕ Fermer</button>
                  </div>
                  {employesDuStatutClique.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic">Aucun employé enregistré avec le rôle "{statutSelectionnePourAffichage}".</p>
                  ) : (
                    <div className="bg-white border border-blue-200 rounded overflow-hidden">
                      <table className="w-full text-left text-[10px]">
                        <thead className="bg-blue-100 text-blue-900 font-extrabold uppercase">
                          <tr>
                            <th className="p-1.5 w-12 text-center">N°</th>
                            <th className="p-1.5">Nom et Prénom</th>
                            <th className="p-1.5">Contact / Téléphone</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-50">
                          {employesDuStatutClique.map((emp, idx) => (
                            <tr key={emp.id} className="hover:bg-blue-50/50">
                              <td className="p-1.5 text-center font-bold text-slate-500">{idx + 1}</td>
                              <td className="p-1.5 font-bold text-slate-900 uppercase">{emp.nom || emp.nom_employe || 'Nom non renseigné'}</td>
                              <td className="p-1.5 font-mono text-slate-600">{emp.telephone || emp.contact || 'N/A'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block font-semibold mb-0.5 text-[9px] text-slate-500 uppercase">Sélection spécifique des employés concernés :</label>
                <div className="max-h-28 overflow-y-auto bg-white border rounded p-1.5 space-y-1">
                  {employesList.length === 0 ? (
                    <p className="text-slate-400 italic">Aucun employé trouvé dans la base.</p>
                  ) : (
                    employesList.map((emp) => {
                      const empId = String(emp.id);
                      const isChecked = nouveauChallenge.employes_concernes.includes(empId);
                      return (
                        <label key={emp.id} className="flex items-center justify-between p-1 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0">
                          <span className="font-bold text-slate-800 uppercase">{emp.nom || emp.nom_employe || 'Employé'} ({emp.fonction || emp.statut || 'N/A'})</span>
                          <input 
                            type="checkbox" 
                            disabled={enTrainDeSauvegarder}
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNouveauChallenge({ ...nouveauChallenge, employes_concernes: [...nouveauChallenge.employes_concernes, empId] });
                              } else {
                                setNouveauChallenge({ ...nouveauChallenge, employes_concernes: nouveauChallenge.employes_concernes.filter(id => id !== empId) });
                              }
                            }}
                          />
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-1.5 border-t flex justify-between items-center">
            {challengeEnEdition && permissions.suppression ? (
              <button type="button" disabled={enTrainDeSauvegarder} onClick={supprimerChallenge} className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold px-2.5 py-1 rounded text-[10px]">
                {enTrainDeSauvegarder ? 'Patientez...' : 'Supprimer'}
              </button>
            ) : <div />}

            {((challengeEnEdition && permissions.modification) || (!challengeEnEdition && permissions.creation)) && (
              <button type="submit" disabled={enTrainDeSauvegarder} className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold px-3 py-1 rounded text-[10px]">
                {enTrainDeSauvegarder ? 'Enregistrement...' : (challengeEnEdition ? 'Mettre à jour' : 'Enregistrer')}
              </button>
            )}
          </div>
        </form>
      ) : (
        <>
          <div className="bg-slate-50 p-1.5 rounded-xl border">
            <input type="text" disabled={enTrainDeSauvegarder} value={recherche} onFocus={(e) => e.target.select()} onChange={(e) => setRecherche(e.target.value.toUpperCase())} placeholder="RECHERCHER UN CHALLENGE..." className="w-full bg-white border rounded-lg px-2.5 py-1.5 text-xs outline-none text-slate-900 font-extrabold uppercase placeholder:text-slate-400" />
          </div>

          {chargement ? (
            <div className="p-4 text-center text-slate-400">Chargement...</div>
          ) : challengesAffiches.length === 0 ? (
            <div className="p-4 text-center text-slate-400 bg-white border rounded-xl">
              Aucun challenge commercial enregistré.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="overflow-x-auto border rounded-xl bg-white shadow-2xs">
                <table className="w-full text-left text-xs table-fixed">
                  <thead className="bg-slate-50 text-slate-700 border-b uppercase text-[9px] font-extrabold select-none">
                    <tr>
                      <th onClick={() => !enTrainDeSauvegarder && gererTri('nom_challenge')} className="p-2 w-[30%] cursor-pointer">
                        <div className="flex items-center gap-1 whitespace-nowrap"><span>Challenge</span> {rendreFlecheTri('nom_challenge')}</div>
                      </th>
                      <th className="p-2 w-[25%]">Période</th>
                      <th className="p-2 w-[20%]">Commission</th>
                      <th className="p-2 w-[25%] text-right">Évaluation Résultats</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-[10.5px]">
                    {challengesAffiches.map((item) => (
                      <tr key={item.id} onClick={() => !enTrainDeSauvegarder && ouvrirEdition(item)} className="hover:bg-orange-50/70 cursor-pointer">
                        <td className="p-2 font-extrabold uppercase text-slate-900 truncate">🏆 {item.nom_challenge}</td>
                        <td className="p-2 font-mono text-[9.5px] text-slate-600 font-bold">{item.date_debut || '-'} au {item.date_fin || '-'}</td>
                        <td className="p-2 font-bold text-emerald-600">
                          {item.valeur_commission} {item.type_commission === 'POURCENTAGE' ? '%' : 'F CFA'}
                        </td>
                        <td className="p-2 text-right">
                          <span className="bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-black text-[9px] border border-sky-200">
                            Évaluer 📊
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {limiteChallenges < challengesFiltres.length && (
                <div className="text-center pt-2 pb-2">
                  <button
                    type="button"
                    disabled={enTrainDeSauvegarder}
                    onClick={() => setLimiteChallenges(prev => prev + 20)}
                    className="bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 font-extrabold px-4 py-2 rounded-xl text-xs transition shadow-xs border border-slate-300 w-full"
                  >
                    📥 Charger 20 challenges de plus ({challengesFiltres.length - limiteChallenges} restants)
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