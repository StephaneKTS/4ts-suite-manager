'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionTaxesRistournes({ entrepriseId = '4TS-234321' }) {
  const [taxesList, setTaxesList] = useState([]);
  const [articlesList, setArticlesList] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [ongletActif, setOngletActif] = useState('liste'); // 'liste' ou 'creer'
  const [elementEnEdition, setElementEnEdition] = useState(null);

  // Module actif sécurisé dans le state pour stabiliser useEffect
  const [moduleActuel, setModuleActuel] = useState('BOUTIQUE');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mod = (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
      setModuleActuel(mod);
    }
  }, []);

  // Formulaire d'ajout / modification
  const [codeTaxe, setCodeTaxe] = useState('');
  const [nomTaxe, setNomTaxe] = useState('');
  const [typeElement, setTypeElement] = useState('RISTOURNE');
  const [modeCalcul, setModeCalcul] = useState('MONTANT');
  const [valeur, setValeur] = useState('');
  const [sens, setSens] = useState('COLLECTEE');
  
  // Période de validité
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  // Articles ciblés
  const [articlesConcernes, setArticlesConcernes] = useState([]);
  const [rechercheArticle, setRechercheArticle] = useState('');

  // Source et Tranches par paliers
  const [sourceCalcul, setSourceCalcul] = useState('MONTANT');
  const [gestionTranches, setGestionTranches] = useState(false);
  const [tranchesPaliers, setTranchesPaliers] = useState([]);

  // Formulaire temporaire pour une tranche
  const [minTranche, setMinTranche] = useState('');
  const [maxTranche, setMaxTranche] = useState('');
  const [valeurTranche, setValeurTranche] = useState('');

  const chargerDonnees = async () => {
    setChargement(true);
    try {
      // 1. Charger les règles de taxes, ristournes, soldes et promos pour l'entreprise et le module
      const { data: taxesData, error: taxesError } = await supabase
        .from('types_taxes_ristournes')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('created_at', { ascending: false });

      if (taxesError) throw taxesError;
      setTaxesList(taxesData || []);

      // 2. Charger uniquement les articles de la table 'articles_stock' filtrés par entreprise ET par module actif
      const { data: articlesData, error: articlesError } = await supabase
        .from('articles_stock')
        .select('id_article, Designation, Code_Barre, Prix_Vente')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);

      if (articlesError) {
        console.error('Erreur chargement articles_stock :', articlesError.message);
        setArticlesList([]);
      } else if (articlesData) {
        setArticlesList(articlesData);
      }
    } catch (err) {
      console.error('Erreur chargement données :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    if (entrepriseId && moduleActuel) {
      chargerDonnees();
    }
  }, [entrepriseId, moduleActuel]);

  const reinitialiserFormulaire = () => {
    setElementEnEdition(null);
    setCodeTaxe('');
    setNomTaxe('');
    setTypeElement('RISTOURNE');
    setModeCalcul('MONTANT');
    setValeur('');
    setSens('COLLECTEE');
    setDateDebut('');
    setDateFin('');
    setArticlesConcernes([]);
    setSourceCalcul('MONTANT');
    setGestionTranches(false);
    setTranchesPaliers([]);
  };

  const ouvrirCreation = () => {
    reinitialiserFormulaire();
    setOngletActif('creer');
  };

  const ouvrirEdition = (item) => {
    setElementEnEdition(item);
    setCodeTaxe(item.code_taxe || '');
    setNomTaxe(item.nom_taxe || '');
    setTypeElement(item.type_element || 'RISTOURNE');
    setModeCalcul(item.mode_calcul || 'MONTANT');
    setValeur(item.valeur !== undefined && item.valeur !== null ? String(item.valeur) : '');
    setSens(item.sens || 'COLLECTEE');
    setDateDebut(item.date_debut || '');
    setDateFin(item.date_fin || '');
    setArticlesConcernes(item.articles_concernes || []);
    setSourceCalcul(item.source_calcul || 'MONTANT');
    setGestionTranches(item.gestion_tranches || false);
    setTranchesPaliers(item.tranches_paliers || []);
    setOngletActif('creer');
  };

  const toggleArticleCible = (identifiantArt) => {
    if (articlesConcernes.includes(identifiantArt)) {
      setArticlesConcernes(articlesConcernes.filter(c => c !== identifiantArt));
    } else {
      setArticlesConcernes([...articlesConcernes, identifiantArt]);
    }
  };

  const toutSelectionnerArticles = () => {
    if (articlesConcernes.length === articlesList.length) {
      setArticlesConcernes([]);
    } else {
      setArticlesConcernes(articlesList.map(a => a.Code_Barre || String(a.id_article)));
    }
  };

  const ajouterTranche = () => {
    if (minTranche === '' || maxTranche === '' || valeurTranche === '') {
      alert('⚠️ Veuillez remplir tous les champs de la tranche (Min, Max, Valeur).');
      return;
    }
    const nouvelleTranche = {
      min: parseFloat(minTranche),
      max: parseFloat(maxTranche),
      valeur: parseFloat(valeurTranche)
    };
    setTranchesPaliers([...tranchesPaliers, nouvelleTranche]);
    setMinTranche('');
    setMaxTranche('');
    setValeurTranche('');
  };

  const supprimerTranche = (index) => {
    setTranchesPaliers(tranchesPaliers.filter((_, i) => i !== index));
  };

  const enregistrerRegle = async (e) => {
    e.preventDefault();
    if (!codeTaxe || !nomTaxe || (!gestionTranches && valeur === '')) {
      alert('⚠️ Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (gestionTranches && tranchesPaliers.length === 0) {
      alert('⚠️ Veuillez ajouter au moins une tranche de palier.');
      return;
    }

    try {
      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        code_taxe: codeTaxe.trim().toUpperCase(),
        nom_taxe: nomTaxe.trim().toUpperCase(),
        type_element: typeElement,
        mode_calcul: modeCalcul,
        valeur: gestionTranches ? 0 : parseFloat(valeur),
        sens: sens,
        source_calcul: sourceCalcul,
        gestion_tranches: gestionTranches,
        tranches_paliers: gestionTranches ? tranchesPaliers : [],
        date_debut: dateDebut || null,
        date_fin: dateFin || null,
        articles_concernes: articlesConcernes,
        actif: true
      };

      if (elementEnEdition) {
        const { error } = await supabase
          .from('types_taxes_ristournes')
          .update(payload)
          .eq('id', elementEnEdition.id);
        if (error) throw error;
        alert('✅ Modification enregistrée avec succès !');
      } else {
        const { error } = await supabase.from('types_taxes_ristournes').insert([payload]);
        if (error) throw error;
        alert('✅ Règle enregistrée avec succès !');
      }

      reinitialiserFormulaire();
      chargerDonnees();
      setOngletActif('liste');
    } catch (err) {
      alert('Erreur lors de l’enregistrement : ' + err.message);
    }
  };

  const supprimerRegleActuelle = async () => {
    if (!elementEnEdition) return;
    if (!confirm('Voulez-vous vraiment supprimer cet élément ?')) return;
    try {
      const { error } = await supabase.from('types_taxes_ristournes').delete().eq('id', elementEnEdition.id);
      if (error) throw error;
      alert('✅ Supprimé avec succès !');
      reinitialiserFormulaire();
      chargerDonnees();
      setOngletActif('liste');
    } catch (err) {
      alert('Erreur suppression : ' + err.message);
    }
  };

  const articlesFiltres = articlesList.filter(a => {
    const nom = a.Designation || '';
    const code = a.Code_Barre || String(a.id_article || '');
    return nom.toLowerCase().includes(rechercheArticle.toLowerCase()) ||
           code.toLowerCase().includes(rechercheArticle.toLowerCase());
  });

  return (
    <div className="space-y-4 text-xs font-sans p-3 sm:p-5 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-6xl mx-auto text-slate-900">
      
      {/* En-tête principal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 pb-3">
        <div>
          <h3 className="font-black text-slate-900 uppercase text-sm sm:text-base">⚙️ GESTION DES TAXES & PROMOS [{moduleActuel}]</h3>
          <p className="text-[10px] sm:text-xs text-slate-600 mt-0.5">Gérez vos TVA, ristournes, soldes et promotions ciblées sur les articles de ce module.</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={ouvrirCreation}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-black text-xs transition uppercase ${
              ongletActif === 'creer' && !elementEnEdition ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
            }`}
          >
            ➕ Créer
          </button>
          <button
            type="button"
            onClick={() => { setOngletActif('liste'); reinitialiserFormulaire(); }}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-black text-xs transition uppercase ${
              ongletActif === 'liste' ? 'bg-orange-600 text-white shadow-md' : 'bg-slate-100 text-slate-800 hover:bg-slate-200'
            }`}
          >
            📋 Liste ({taxesList.length})
          </button>
        </div>
      </div>

      {/* VUE CRÉER / MODIFIER */}
      {ongletActif === 'creer' && (
        <div className="space-y-3 animate-fadeIn">
          <div className="flex justify-between items-center bg-slate-100 p-3 rounded-xl border border-slate-200">
            <h4 className="font-black text-slate-900 uppercase text-xs">
              {elementEnEdition ? `✏️ Modifier : ${elementEnEdition.nom_taxe}` : 'Formulaire de création (Taxe, Ristourne, Solde, Promo)'}
            </h4>
            <button
              type="button"
              onClick={() => { setOngletActif('liste'); reinitialiserFormulaire(); }}
              className="bg-slate-800 hover:bg-slate-700 text-white font-black px-3.5 py-1.5 rounded-lg text-xs transition shadow-xs flex items-center gap-1.5"
            >
              ⬅️ Retour à la liste
            </button>
          </div>

          <form onSubmit={enregistrerRegle} className="bg-slate-50/80 p-3 sm:p-4 rounded-xl border border-slate-200 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-[9px] sm:text-[10px] uppercase text-slate-800 mb-1">Code *</label>
                <input
                  type="text"
                  required
                  value={codeTaxe}
                  onChange={(e) => setCodeTaxe(e.target.value.toUpperCase())}
                  placeholder="ex: PROMO-NOEL"
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold uppercase text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[9px] sm:text-[10px] uppercase text-slate-800 mb-1">Nom / Libellé *</label>
                <input
                  type="text"
                  required
                  value={nomTaxe}
                  onChange={(e) => setNomTaxe(e.target.value.toUpperCase())}
                  placeholder="ex: Promotion de fin d'année"
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold uppercase text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[9px] sm:text-[10px] uppercase text-slate-800 mb-1">Type d'élément *</label>
                <select
                  value={typeElement}
                  onChange={(e) => setTypeElement(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="RISTOURNE">Ristourne</option>
                  <option value="SOLDE">Solde</option>
                  <option value="PROMOTION">Promotion</option>
                  <option value="TVA">TVA</option>
                  <option value="PRECOMPTE">Précompte</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[9px] sm:text-[10px] uppercase text-slate-800 mb-1">Mode de calcul</label>
                <select
                  value={modeCalcul}
                  onChange={(e) => setModeCalcul(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="MONTANT">Montant Fixe (ex: 50 F)</option>
                  <option value="POURCENTAGE">Pourcentage (ex: 15%)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[9px] sm:text-[10px] uppercase text-slate-800 mb-1">Source de calcul</label>
                <select
                  value={sourceCalcul}
                  onChange={(e) => setSourceCalcul(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="MONTANT">Montant</option>
                  <option value="QUANTITE">Quantité</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[9px] sm:text-[10px] uppercase text-slate-800 mb-1">Sens comptable</label>
                <select
                  value={sens}
                  onChange={(e) => setSens(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="COLLECTEE">Collectée (Ventes / Remises)</option>
                  <option value="DEDUCTIBLE">Déductible (Achats)</option>
                </select>
              </div>

              {/* Période de validité pour Soldes et Promotions */}
              <div>
                <label className="block font-bold text-[9px] sm:text-[10px] uppercase text-slate-800 mb-1">Date Début (Optionnel)</label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-[9px] sm:text-[10px] uppercase text-slate-800 mb-1">Date Fin (Optionnel)</label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Option Tranches par Paliers */}
            <div className="border-t border-slate-200 pt-3 space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="gestionTranches"
                  checked={gestionTranches}
                  onChange={(e) => setGestionTranches(e.target.checked)}
                  className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
                />
                <label htmlFor="gestionTranches" className="font-extrabold text-slate-900 cursor-pointer text-xs">
                  Activer la gestion par tranches / paliers progressifs
                </label>
              </div>

              {!gestionTranches ? (
                <div className="pt-1">
                  <label className="block font-bold text-[9px] sm:text-[10px] uppercase text-slate-800 mb-1">
                    Valeur Unique ({modeCalcul === 'POURCENTAGE' ? 'Taux en %' : 'Montant Fixe'}) *
                  </label>
                  <div className="flex items-center w-full sm:w-1/3 bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                    <input
                      type="number"
                      step="any"
                      value={valeur}
                      onChange={(e) => setValeur(e.target.value)}
                      className="w-full p-2 font-mono font-bold text-slate-900 focus:outline-none"
                    />
                    <span className="bg-slate-100 px-3 py-2 text-slate-800 font-black border-l border-slate-300 shrink-0">
                      {modeCalcul === 'POURCENTAGE' ? '%' : 'F'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 space-y-3 shadow-2xs">
                  <p className="font-bold text-[10px] sm:text-xs text-orange-600 uppercase">Configuration des tranches ({sourceCalcul}) :</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end">
                    <div>
                      <label className="block font-bold text-[9px] uppercase text-slate-800 mb-1">Min (ex: 0)</label>
                      <input
                        type="number"
                        value={minTranche}
                        onChange={(e) => setMinTranche(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono font-bold text-slate-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[9px] uppercase text-slate-800 mb-1">Max (ex: 10000)</label>
                      <input
                        type="number"
                        value={maxTranche}
                        onChange={(e) => setMaxTranche(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl p-2 font-mono font-bold text-slate-900 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[9px] uppercase text-slate-800 mb-1">
                        Valeur / {modeCalcul === 'POURCENTAGE' ? 'Taux (%)' : 'Montant (F)'}
                      </label>
                      <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                        <input
                          type="number"
                          step="any"
                          value={valeurTranche}
                          onChange={(e) => setValeurTranche(e.target.value)}
                          className="w-full p-2 font-mono font-bold text-slate-900 focus:outline-none"
                        />
                        <span className="bg-slate-100 px-2.5 py-2 text-slate-800 font-black border-l border-slate-300 shrink-0 text-[10px]">
                          {modeCalcul === 'POURCENTAGE' ? '%' : 'F'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <button
                        type="button"
                        onClick={ajouterTranche}
                        className="w-full bg-slate-800 hover:bg-slate-700 text-white font-black py-2.5 rounded-xl text-xs transition shadow-xs"
                      >
                        + Ajouter Tranche
                      </button>
                    </div>
                  </div>

                  {tranchesPaliers.length > 0 && (
                    <div className="space-y-1.5 pt-2">
                      <p className="font-bold text-[9px] uppercase text-slate-600">Tranches configurées :</p>
                      <div className="flex flex-wrap gap-2">
                        {tranchesPaliers.map((t, idx) => (
                          <div key={idx} className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-1.5 text-xs flex items-center gap-2 font-mono shadow-2xs">
                            <span className="text-slate-900 font-bold">
                              De {t.min} à {t.max} ➔ <strong className="text-orange-700">{t.valeur}{modeCalcul === 'POURCENTAGE' ? ' %' : ' F'}</strong>
                            </span>
                            <button type="button" onClick={() => supprimerTranche(idx)} className="text-rose-600 font-extrabold hover:text-rose-800 px-1 text-sm">×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTION SÉLECTION DES ARTICLES CIBLÉS */}
            <div className="border-t border-slate-200 pt-3 space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <label className="font-extrabold text-slate-900 uppercase text-xs">📦 Articles ciblés ({articlesConcernes.length} sélectionnés)</label>
                  <p className="text-[10px] text-slate-600">Cochez les articles du module <strong>{moduleActuel}</strong> sur lesquels appliquer cette règle.</p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder="Filtrer un article..."
                    value={rechercheArticle}
                    onChange={(e) => setRechercheArticle(e.target.value)}
                    className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-medium w-full sm:w-48 text-slate-900 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={toutSelectionnerArticles}
                    className="bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold px-3 py-1 rounded-xl text-[10px] transition shrink-0"
                  >
                    Tout (dé)cocher
                  </button>
                </div>
              </div>

              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl bg-white p-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {articlesFiltres.length === 0 ? (
                  <p className="text-slate-500 font-semibold text-center py-4 col-span-full">
                    {articlesList.length === 0 ? `Aucun article trouvé pour le module '${moduleActuel}'.` : "Aucun article ne correspond à votre recherche."}
                  </p>
                ) : (
                  articlesFiltres.map((art) => {
                    const identifiantArt = art.Code_Barre || String(art.id_article);
                    const nomArt = art.Designation || 'Article sans désignation';
                    const prixArt = art.Prix_Vente || 0;
                    const estCoche = articlesConcernes.includes(identifiantArt);

                    return (
                      <div
                        key={art.id_article}
                        onClick={() => toggleArticleCible(identifiantArt)}
                        className={`p-2 rounded-xl border cursor-pointer transition flex items-center justify-between gap-2 ${
                          estCoche ? 'bg-orange-50 border-orange-300 shadow-2xs' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <input
                            type="checkbox"
                            checked={estCoche}
                            onChange={() => {}} 
                            className="accent-orange-600 rounded cursor-pointer"
                          />
                          <div className="truncate">
                            <p className="font-bold text-slate-900 truncate">{nomArt}</p>
                            <p className="text-[9px] text-slate-600 font-mono">Code: {art.Code_Barre || 'N/A'}</p>
                          </div>
                        </div>
                        <span className="font-mono text-emerald-700 font-bold shrink-0">{prixArt}F</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              {elementEnEdition ? (
                <button
                  type="button"
                  onClick={supprimerRegleActuelle}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-black px-4 py-2.5 rounded-xl transition shadow-sm text-xs uppercase tracking-wide"
                >
                  🗑️ Supprimer
                </button>
              ) : <div />}

              <button
                type="submit"
                className="bg-orange-600 hover:bg-orange-500 text-white font-black px-6 py-2.5 rounded-xl transition shadow-sm text-xs sm:text-sm uppercase tracking-wide"
              >
                {elementEnEdition ? 'Mettre à jour' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VUE LISTE */}
      {ongletActif === 'liste' && (
        <div className="space-y-3 animate-fadeIn">
          <div className="overflow-x-auto border border-slate-200 rounded-2xl shadow-2xs bg-white">
            <table className="w-full text-left text-[10px] sm:text-xs">
              <thead className="bg-slate-100 text-slate-800 uppercase font-black text-[9px] sm:text-[10px] tracking-wider">
                <tr>
                  <th className="p-3">Code / Nom</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Période Validité</th>
                  <th className="p-3">Calcul & Paliers</th>
                  <th className="p-3 text-right">Valeur / Tranches</th>
                  <th className="p-3 text-center">Articles Ciblés</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-bold text-slate-900">
                {chargement ? (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-slate-600 font-semibold">Chargement...</td>
                  </tr>
                ) : taxesList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-slate-600 font-medium">Aucun élément enregistré pour le moment.</td>
                  </tr>
                ) : (
                  taxesList.map((item) => (
                    <tr 
                      key={item.id} 
                      onClick={() => ouvrirEdition(item)}
                      className="hover:bg-orange-50/70 cursor-pointer transition select-none"
                      title="Cliquer pour ouvrir et modifier"
                    >
                      <td className="p-3">
                        <p className="font-mono font-black text-orange-600">{item.code_taxe}</p>
                        <p className="font-extrabold text-slate-900 uppercase text-[11px]">{item.nom_taxe}</p>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          item.type_element === 'PROMOTION' ? 'bg-purple-100 text-purple-900 border border-purple-200' :
                          item.type_element === 'SOLDE' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                          item.type_element === 'RISTOURNE' ? 'bg-blue-100 text-blue-900 border border-blue-200' :
                          'bg-slate-100 text-slate-900 border border-slate-200'
                        }`}>
                          {item.type_element}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 font-mono text-[9px]">
                        {item.date_debut || item.date_fin ? (
                          <>
                            Du {item.date_debut || '...'} <br/> au {item.date_fin || '...'}
                          </>
                        ) : (
                          <span className="text-slate-500 italic">Permanent</span>
                        )}
                      </td>
                      <td className="p-3 text-slate-800 font-medium">
                        {item.gestion_tranches ? <span className="text-slate-900 font-bold">Par Tranches</span> : item.mode_calcul}
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-700 font-black">
                        {item.gestion_tranches ? (
                          <span className="text-[10px] text-slate-900 font-bold">
                            {item.tranches_paliers?.map(t => `[${t.min}-${t.max}: ${t.valeur}${item.mode_calcul === 'POURCENTAGE' ? '%' : 'F'}]`).join(' ')}
                          </span>
                        ) : (
                          item.mode_calcul === 'POURCENTAGE' ? `${item.valeur} %` : `${Number(item.valeur).toLocaleString('fr-FR')} F`
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className="bg-slate-100 text-slate-900 px-2 py-1 rounded-lg font-mono text-[10px] border border-slate-200">
                          {item.articles_concernes?.length > 0 ? `${item.articles_concernes.length} article(s)` : 'Tous / Global'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}