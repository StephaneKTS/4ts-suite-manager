'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtdqodqhkdxanrelxtrq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; 
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GestionMouvements({ entrepriseId = '4TS-TEST' }) {
  const [mouvements, setMouvements] = useState([]);
  const [approvisionnements, setApprovisionnements] = useState([]);
  const [depots, setDepots] = useState([]);
  const [emplacements, setEmplacements] = useState([]);
  const [articles, setArticles] = useState([]);
  const [familles, setFamilles] = useState([]);
  const [chargement, setChargement] = useState(false);

  const [modeAffichage, setModeAffichage] = useState('SAISIE'); // 'SAISIE' | 'LISTE_DOCS'
  const [typeOperation, setTypeOperation] = useState('ENTREE');

  // En-tête du document
  const [enTeteDoc, setEnTeteDoc] = useState({
    numeroDoc: '',
    dateDoc: new Date().toISOString().split('T')[0],
    id_depot_source: '',
    id_emplacement_source: '',
    id_depot_destination: '',
    referenceDoc: '',
    motif: '',
    famille_filtre: 'TOUTES',
    operateur: 'THÉODORE STÉPHANE',
  });

  // Modale de partage & format
  const [modalPartageOuverte, setModalPartageOuverte] = useState(false);
  const [formatPartage, setFormatPartage] = useState('PDF');

  // Gestion du sélecteur d'article personnalisé
  const [modalArticleOuvert, setModalArticleOuvert] = useState(false);
  const [recherchePopup, setRecherchePopup] = useState('');
  const [articleSelectionneTemp, setArticleSelectionneTemp] = useState(null);

  // Lignes du document (Panier)
  const [quantiteSaisie, setQuantiteSaisie] = useState(1);
  const [lignesPanier, setLignesPanier] = useState([]);
  const [mouvementEnEditionId, setMouvementEnEditionId] = useState(null);

  const genererNumeroDocIndependant = (type, mouvementsList) => {
    const prefixes = {
      ENTREE: 'ME',
      SORTIE: 'MS',
      AVARIES: 'AV',
      TRANSFERT: 'TR',
      INVENTAIRE: 'INV',
    };
    const prefix = prefixes[type] || 'ME';
    const mouvementsDuType = mouvementsList.filter((m) => m.type_mouvement === type);
    const numeroSeq = String(mouvementsDuType.length + 1).padStart(5, '0');
    return `${prefix}-${numeroSeq}`;
  };

  const chargerDonnees = async () => {
    setChargement(true);
    try {
      const { data: dataDepots } = await supabase.from('depots_stock').select('*');
      const depotsList = dataDepots || [];
      setDepots(depotsList);
      if (depotsList.length > 0 && !enTeteDoc.id_depot_source) {
        setEnTeteDoc((prev) => ({ ...prev, id_depot_source: depotsList[0].id }));
      }

      const { data: dataEmplacements } = await supabase.from('emplacements_stock').select('*');
      setEmplacements(dataEmplacements || []);

      const { data: dataArticles } = await supabase.from('articles_stock').select('*');
      const artList = dataArticles || [];
      setArticles(artList);

      const { data: dataFamilles } = await supabase.from('familles_articles').select('*');
      setFamilles(dataFamilles || []);

      const { data: dataMouvements } = await supabase
        .from('mouvements_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .order('created_at', { ascending: false });

      const mouvementsList = dataMouvements || [];
      setMouvements(mouvementsList);

      const { data: dataAppro } = await supabase
        .from('approvisionnements')
        .select('*')
        .eq('id_entreprise', entrepriseId);
      
      setApprovisionnements(dataAppro || []);

      if (!mouvementEnEditionId) {
        setEnTeteDoc((prev) => ({
          ...prev,
          numeroDoc: genererNumeroDocIndependant(typeOperation, mouvementsList),
        }));
      }
    } catch (err) {
      console.error('Erreur :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, [entrepriseId, typeOperation]);

  const emplacementsSourceDisponibles = emplacements.filter(
    (emp) => String(emp.id_depot) === String(enTeteDoc.id_depot_source)
  );

  const correspondAuDepot = (valeurDepotFlux, depotCibleId) => {
    if (!valeurDepotFlux || !depotCibleId) return false;
    if (String(valeurDepotFlux) === String(depotCibleId)) return true;

    const depotObj = depots.find((d) => String(d.id) === String(depotCibleId));
    if (depotObj && depotObj.nom_depot) {
      if (String(valeurDepotFlux).trim().toUpperCase() === String(depotObj.nom_depot).trim().toUpperCase()) {
        return true;
      }
    }
    return false;
  };

  const obtenirTousLesFluxArticle = (articleId) => {
    let flux = [];

    mouvements
      .filter((m) => String(m.id_article) === String(articleId))
      .forEach((m) => {
        flux.push({
          date: m.created_at || '',
          depot_source: m.id_depot_source,
          depot_destination: m.id_depot_destination,
          quantite: parseInt(m.quantite || 0),
          type: (m.type_mouvement || '').toUpperCase(),
        });
      });

    approvisionnements.forEach((app) => {
      let articlesAppro = [];
      if (app.details_articles) {
        if (typeof app.details_articles === 'string') {
          try { articlesAppro = JSON.parse(app.details_articles); } catch (e) {}
        } else if (Array.isArray(app.details_articles)) {
          articlesAppro = app.details_articles;
        }
      }

      articlesAppro.forEach((ligne) => {
        if (String(ligne.id_article || ligne.article_id) === String(articleId)) {
          flux.push({
            date: app.created_at || '',
            depot_source: app.id_depot_destination,
            depot_destination: null,
            quantite: parseInt(ligne.quantite || 0),
            type: 'APPROVISIONNEMENT',
          });
        }
      });
    });

    flux.sort((a, b) => new Date(a.date) - new Date(b.date));
    return flux;
  };

  const calculerStockPourDepotActuel = (articleId) => {
    const depotCibleId = enTeteDoc.id_depot_source;
    if (!depotCibleId) {
      const artObj = articles.find(a => String(a.id_article) === String(articleId));
      return parseInt(artObj?.Quantite_Stock || 0);
    }

    let stockDepot = 0;
    const fluxArticle = obtenirTousLesFluxArticle(articleId);

    fluxArticle.forEach((m) => {
      const matchDepotSource = correspondAuDepot(m.depot_source, depotCibleId);
      const matchDepotDest = correspondAuDepot(m.depot_destination, depotCibleId);
      const qte = m.quantite;
      const typeMvt = m.type;

      if (typeMvt === 'INVENTAIRE' && matchDepotSource) {
        stockDepot = qte;
        return;
      }
      if (typeMvt === 'TRANSFERT') {
        if (matchDepotDest) stockDepot += qte;
        if (matchDepotSource) stockDepot -= qte;
        return;
      }
      if (
        typeMvt.includes('ENTREE') || 
        typeMvt.includes('ACHAT') || 
        typeMvt.includes('APPROVISIONNEMENT') || 
        typeMvt.includes('FACTURE')
      ) {
        if (matchDepotSource || matchDepotDest) {
          stockDepot += qte;
        }
      } else if (
        typeMvt.includes('SORTIE') || 
        typeMvt.includes('VENTE') || 
        typeMvt.includes('AVARIES')
      ) {
        if (matchDepotSource) {
          stockDepot -= qte;
        }
      } else {
        if (matchDepotSource || matchDepotDest) {
          stockDepot += qte;
        }
      }
    });

    return Math.max(0, stockDepot);
  };

  const calculerCumulStockGlobal = (articleId) => {
    if (depots.length === 0) {
      const artObj = articles.find(a => String(a.id_article) === String(articleId));
      return parseInt(artObj?.Quantite_Stock || 0);
    }

    let sommeTotaleDepots = 0;
    depots.forEach((dep) => {
      let stockDepot = 0;
      const fluxArticle = obtenirTousLesFluxArticle(articleId);

      fluxArticle.forEach((m) => {
        const matchDepotSource = correspondAuDepot(m.depot_source, dep.id);
        const matchDepotDest = correspondAuDepot(m.depot_destination, dep.id);
        const qte = m.quantite;
        const typeMvt = m.type;

        if (typeMvt === 'INVENTAIRE' && matchDepotSource) {
          stockDepot = qte;
          return;
        }
        if (typeMvt === 'TRANSFERT') {
          if (matchDepotDest) stockDepot += qte;
          if (matchDepotSource) stockDepot -= qte;
          return;
        }
        if (
          typeMvt.includes('ENTREE') || 
          typeMvt.includes('ACHAT') || 
          typeMvt.includes('APPROVISIONNEMENT') || 
          typeMvt.includes('FACTURE')
        ) {
          if (matchDepotSource || matchDepotDest) {
            stockDepot += qte;
          }
        } else if (
          typeMvt.includes('SORTIE') || 
          typeMvt.includes('VENTE') || 
          typeMvt.includes('AVARIES')
        ) {
          if (matchDepotSource) {
            stockDepot -= qte;
          }
        } else {
          if (matchDepotSource || matchDepotDest) {
            stockDepot += qte;
          }
        }
      });
      sommeTotaleDepots += Math.max(0, stockDepot);
    });

    return sommeTotaleDepots;
  };

  const articlesPopupFiltres = articles.filter((art) => {
    const designation = (art.Designation || '').toLowerCase();
    const recherche = (recherchePopup || '').toLowerCase();
    return designation.includes(recherche);
  });

  const ajouterArticleAuPanier = () => {
    if (!articleSelectionneTemp) {
      alert('Veuillez sélectionner un article.');
      return;
    }
    const qte = parseInt(quantiteSaisie);
    
    if (isNaN(qte) || (typeOperation === 'INVENTAIRE' ? qte < 0 : qte <= 0)) {
      alert(typeOperation === 'INVENTAIRE' ? 'Veuillez entrer une quantité valide (>= 0).' : 'Veuillez entrer une quantité valide (> 0).');
      return;
    }

    const stockActuelDepot = calculerStockPourDepotActuel(articleSelectionneTemp.id_article);

    if ((typeOperation === 'SORTIE' || typeOperation === 'TRANSFERT' || typeOperation === 'AVARIES') && qte > stockActuelDepot) {
      alert(`⛔ Stock insuffisant !\n\nL'article "${articleSelectionneTemp.Designation}" possède seulement ${stockActuelDepot} unité(s) dans ce dépôt.`);
      return;
    }

    let stockReelPrevisionnel = stockActuelDepot;
    if (typeOperation === 'ENTREE') stockReelPrevisionnel = stockActuelDepot + qte;
    else if (typeOperation === 'SORTIE' || typeOperation === 'AVARIES' || typeOperation === 'TRANSFERT') stockReelPrevisionnel = Math.max(0, stockActuelDepot - qte);
    else if (typeOperation === 'INVENTAIRE') stockReelPrevisionnel = qte;

    const dejaPresentIndex = lignesPanier.findIndex((l) => String(l.id_article) === String(articleSelectionneTemp.id_article));
    
    if (dejaPresentIndex !== -1) {
      const nouveauPanier = [...lignesPanier];
      const nouvelleQte = typeOperation === 'INVENTAIRE' ? qte : nouveauPanier[dejaPresentIndex].quantite + qte;

      if ((typeOperation === 'SORTIE' || typeOperation === 'TRANSFERT' || typeOperation === 'AVARIES') && nouvelleQte > stockActuelDepot) {
        alert(`⛔ Stock insuffisant !\n\nQuantité totale demandée (${nouvelleQte}) supérieure au stock disponible (${stockActuelDepot}).`);
        return;
      }

      nouveauPanier[dejaPresentIndex].quantite = nouvelleQte;
      nouveauPanier[dejaPresentIndex].stockReel = stockReelPrevisionnel;
      setLignesPanier(nouveauPanier);
    } else {
      setLignesPanier([
        ...lignesPanier,
        {
          id_article: articleSelectionneTemp.id_article,
          designation: articleSelectionneTemp.Designation,
          photo: articleSelectionneTemp.Photo || articleSelectionneTemp.photo,
          quantite: qte,
          stockActuel: stockActuelDepot,
          stockReel: stockReelPrevisionnel,
        },
      ]);
    }

    setArticleSelectionneTemp(null);
    setQuantiteSaisie(1);
    setModalArticleOuvert(false);
    setRecherchePopup('');
  };

  const gererKeyDownQuantite = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      ajouterArticleAuPanier();
    }
  };

  const supprimerLignePanier = (index) => {
    const nouveauPanier = lignesPanier.filter((_, i) => i !== index);
    setLignesPanier(nouveauPanier);
  };

  const validerDocumentMouvement = async () => {
    if (lignesPanier.length === 0) {
      alert('Veuillez ajouter au moins un article au document avant de valider.');
      return;
    }
    if (!enTeteDoc.motif.trim()) {
      alert('Veuillez saisir un motif pour ce document de mouvement.');
      return;
    }
    if (typeOperation === 'TRANSFERT' && !enTeteDoc.id_depot_destination) {
      alert('Veuillez sélectionner un dépôt de destination pour le transfert.');
      return;
    }
    if (typeOperation === 'TRANSFERT' && enTeteDoc.id_depot_source === enTeteDoc.id_depot_destination) {
      alert('Le dépôt source et le dépôt de destination doivent être différents.');
      return;
    }

    try {
      if (mouvementEnEditionId) {
        await supabase.from('mouvements_stock').delete().eq('id', mouvementEnEditionId);
      }

      for (const ligne of lignesPanier) {
        const { error: errMvt } = await supabase.from('mouvements_stock').insert([
          {
            id_entreprise: entrepriseId,
            type_mouvement: typeOperation,
            id_depot_source: enTeteDoc.id_depot_source || null,
            id_depot_destination: typeOperation === 'TRANSFERT' ? enTeteDoc.id_depot_destination : null,
            id_article: parseInt(ligne.id_article),
            quantite: ligne.quantite,
            motif_remarque: enTeteDoc.numeroDoc,
            operateur: enTeteDoc.operateur,
          },
        ]);

        if (errMvt) throw errMvt;
      }

      alert(mouvementEnEditionId ? 'Document mis à jour avec succès !' : `Document ${enTeteDoc.numeroDoc} validé avec succès !`);
      setLignesPanier([]);
      setMouvementEnEditionId(null);
      setEnTeteDoc((prev) => ({ ...prev, motif: '', referenceDoc: '' }));
      chargerDonnees();
      setModeAffichage('LISTE_DOCS');
    } catch (err) {
      alert('Erreur lors de la validation : ' + err.message);
    }
  };

  const modifierDocument = (mvt) => {
    setTypeOperation(mvt.type_mouvement || 'ENTREE');
    setEnTeteDoc({
      ...enTeteDoc,
      numeroDoc: mvt.motif_remarque || enTeteDoc.numeroDoc,
      id_depot_source: mvt.id_depot_source || '',
      id_depot_destination: mvt.id_depot_destination || '',
      motif: mvt.motif_remarque || '',
    });

    const art = articles.find((a) => String(a.id_article) === String(mvt.id_article));
    setLignesPanier([
      {
        id_article: mvt.id_article,
        designation: art ? art.Designation : `Article #${mvt.id_article}`,
        photo: art?.Photo || art?.photo,
        quantite: mvt.quantite,
        stockActuel: calculerStockPourDepotActuel(mvt.id_article),
        stockReel: mvt.quantite,
      },
    ]);
    setMouvementEnEditionId(mvt.id);
    setModeAffichage('SAISIE');
  };

  const supprimerDocument = async (mvtId) => {
    if (!confirm('Voulez-vous vraiment supprimer ce document de mouvement ?')) return;
    try {
      const { error } = await supabase.from('mouvements_stock').delete().eq('id', mvtId);
      if (error) throw error;
      alert('Document supprimé avec succès.');
      chargerDonnees();
    } catch (err) {
      alert('Erreur lors de la suppression : ' + err.message);
    }
  };

  const nettoyerNumeroDoc = (motifRemarque) => {
    if (!motifRemarque) return '-';
    const matchCrochet = motifRemarque.match(/\[Doc:\s*([A-Z]+-\d+)\]/);
    if (matchCrochet) return matchCrochet[1];
    
    const matchDirect = motifRemarque.match(/^([A-Z]+-\d+)/);
    if (matchDirect) return matchDirect[1];

    return motifRemarque;
  };

  const executerPartageViaCanal = (canal) => {
    alert(`Partage du document ${enTeteDoc.numeroDoc} via ${canal} au format ${formatPartage} effectué avec succès !`);
    setModalPartageOuverte(false);
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Navigation matérialisée par 2 onglets */}
      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
        <button
          type="button"
          onClick={() => { setModeAffichage('SAISIE'); setMouvementEnEditionId(null); }}
          className={`py-2 px-4 rounded-xl font-extrabold transition text-center ${
            modeAffichage === 'SAISIE' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          ✍️ {mouvementEnEditionId ? 'Modifier Document' : 'Saisir un Document'}
        </button>
        <button
          type="button"
          onClick={() => setModeAffichage('LISTE_DOCS')}
          className={`py-2 px-4 rounded-xl font-extrabold transition text-center ${
            modeAffichage === 'LISTE_DOCS' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          📋 Liste des Documents Saisis ({mouvements.length})
        </button>
      </div>

      {modeAffichage === 'SAISIE' && (
        <>
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex items-center justify-between gap-3 shadow-sm">
            <label className="font-extrabold text-slate-700 uppercase tracking-wide">
              🎯 TYPE DE MOUVEMENT :
            </label>
            <select
              value={typeOperation}
              onChange={(e) => setTypeOperation(e.target.value)}
              className="bg-white border-2 border-orange-500/50 rounded-xl px-4 py-2.5 font-extrabold text-orange-700 text-sm focus:outline-none shadow-sm cursor-pointer"
            >
              <option value="ENTREE">📥 Entrée de Stock (ME)</option>
              <option value="SORTIE">📤 Sortie de Stock (MS)</option>
              <option value="AVARIES">⚠️ Avaries & Pertes (AV)</option>
              <option value="TRANSFERT">🔀 Transfert entre Dépôts (TR)</option>
              <option value="INVENTAIRE">📊 Saisie d'Inventaire (INV)</option>
            </select>
          </div>

          <div className="bg-slate-50 border-2 border-orange-500/40 p-4 rounded-2xl space-y-3 shadow-sm">
            <h4 className="font-bold text-orange-600 uppercase flex justify-between items-center">
              <span>📋 EN-TÊTE DU DOCUMENT DE MOUVEMENT</span>
              <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-xl text-sm font-mono font-bold">
                {enTeteDoc.numeroDoc}
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold mb-1">N° Document (Auto)</label>
                <input
                  type="text"
                  disabled
                  value={enTeteDoc.numeroDoc}
                  className="w-full bg-slate-200 text-slate-600 border border-slate-300 rounded-xl p-2.5 font-mono font-bold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Date *</label>
                <input
                  type="date"
                  value={enTeteDoc.dateDoc}
                  onChange={(e) => setEnTeteDoc({ ...enTeteDoc, dateDoc: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Opérateur (Fixe)</label>
                <input
                  type="text"
                  disabled
                  value={enTeteDoc.operateur}
                  className="w-full bg-slate-200 text-slate-700 border border-slate-300 rounded-xl p-2.5 font-bold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Réf. Document Physique</label>
                <input
                  type="text"
                  value={enTeteDoc.referenceDoc}
                  onChange={(e) => setEnTeteDoc({ ...enTeteDoc, referenceDoc: e.target.value })}
                  placeholder="Ex: BL-2026-99"
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  {typeOperation === 'TRANSFERT' ? 'Dépôt Source (Départ) *' : 'Dépôt Concerné *'}
                </label>
                <select
                  required
                  value={enTeteDoc.id_depot_source}
                  onChange={(e) => setEnTeteDoc({ ...enTeteDoc, id_depot_source: e.target.value, id_emplacement_source: '' })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-orange-700"
                >
                  <option value="">-- Sélectionner un dépôt --</option>
                  {depots.map((dep) => (
                    <option key={dep.id} value={dep.id}>
                      🏢 {dep.nom_depot}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Emplacement / Rayon</label>
                <select
                  value={enTeteDoc.id_emplacement_source}
                  onChange={(e) => setEnTeteDoc({ ...enTeteDoc, id_emplacement_source: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-700"
                >
                  <option value="">-- Dépôt principal --</option>
                  {emplacementsSourceDisponibles.map((emp) => (
                    <option key={emp.id} value={emp.nom_emplacement}>
                      📍 {emp.nom_emplacement}
                    </option>
                  ))}
                </select>
              </div>

              {typeOperation === 'TRANSFERT' && (
                <div>
                  <label className="block font-semibold mb-1">Dépôt Destination (Arrivée) *</label>
                  <select
                    required
                    value={enTeteDoc.id_depot_destination}
                    onChange={(e) => setEnTeteDoc({ ...enTeteDoc, id_depot_destination: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-blue-700"
                  >
                    <option value="">-- Dépôt d'arrivée --</option>
                    {depots.filter(d => String(d.id) !== String(enTeteDoc.id_depot_source)).map((dep) => (
                      <option key={dep.id} value={dep.id}>
                        🏢 {dep.nom_depot}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block font-semibold mb-1">Motif / Remarque du Document *</label>
                <input
                  type="text"
                  required
                  value={enTeteDoc.motif}
                  onChange={(e) => setEnTeteDoc({ ...enTeteDoc, motif: e.target.value })}
                  placeholder="Ex: Ajustement suite inventaire / Livraison..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-slate-200 p-4 rounded-2xl space-y-3 shadow-sm">
            <h4 className="font-bold text-slate-800 uppercase text-xs">
              📦 ARTICLES À INCLURE DANS LE DOCUMENT :
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="sm:col-span-8 flex items-center gap-3">
                <div className="flex-1">
                  <label className="block font-semibold mb-1">Article sélectionné *</label>
                  <button
                    type="button"
                    onClick={() => setModalArticleOuvert(true)}
                    className="w-full bg-white border-2 border-orange-300 hover:border-orange-500 rounded-xl p-2.5 text-left font-bold text-slate-800 flex items-center justify-between shadow-sm transition"
                  >
                    <span className="truncate">
                      {articleSelectionneTemp ? `📦 ${articleSelectionneTemp.Designation} (Stock dépôt: ${calculerStockPourDepotActuel(articleSelectionneTemp.id_article)})` : '-- Cliquer pour choisir un article --'}
                    </span>
                    <span className="text-orange-600 font-extrabold text-sm">🔍 Parcourir</span>
                  </button>
                </div>
              </div>

              <div className="sm:col-span-3">
                <label className="block font-semibold mb-1">Quantité *</label>
                <input
                  type="number"
                  min={typeOperation === 'INVENTAIRE' ? '0' : '1'}
                  value={quantiteSaisie}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={gererKeyDownQuantite}
                  onChange={(e) => setQuantiteSaisie(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-emerald-700 text-sm focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-1">
                <button
                  type="button"
                  onClick={ajouterArticleAuPanier}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold p-2.5 rounded-xl shadow transition text-center"
                  title="Ajouter l'article à la liste (Entrée)"
                >
                  ➕
                </button>
              </div>
            </div>

            {modalArticleOuvert && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-sm uppercase">Sélectionner un Article</h3>
                      <p className="text-[10px] text-orange-600 font-bold">Stocks calculés pour le dépôt sélectionné (Mouvements + Achats)</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalArticleOuvert(false)}
                      className="text-slate-400 hover:text-slate-700 font-bold text-base p-1"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="p-4 border-b border-slate-100 bg-white">
                    <input
                      type="text"
                      value={recherchePopup}
                      onChange={(e) => setRecherchePopup(e.target.value)}
                      placeholder="Rechercher par désignation..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-medium text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                      autoFocus
                    />
                  </div>

                  <div className="overflow-y-auto p-2 divide-y divide-slate-100 flex-1">
                    {articlesPopupFiltres.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">Aucun article trouvé.</div>
                    ) : (
                      articlesPopupFiltres.map((art) => {
                        const isSelected = articleSelectionneTemp?.id_article === art.id_article;
                        const stockDepotActuel = calculerStockPourDepotActuel(art.id_article);
                        const cumulGlobal = calculerCumulStockGlobal(art.id_article);
                        return (
                          <div
                            key={art.id_article}
                            onClick={() => setArticleSelectionneTemp(art)}
                            className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition ${
                              isSelected ? 'bg-orange-50 border border-orange-300' : 'hover:bg-slate-50'
                            }`}
                          >
                            <input
                              type="radio"
                              name="choixArticle"
                              checked={isSelected}
                              onChange={() => setArticleSelectionneTemp(art)}
                              className="w-4 h-4 text-orange-600 accent-orange-600"
                            />
                            
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                              {art.Photo || art.photo ? (
                                <img src={art.Photo || art.photo} alt={art.Designation} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-lg">📦</span>
                              )}
                            </div>

                            <div className="flex-1">
                              <p className="font-bold text-slate-800 text-xs">{art.Designation}</p>
                              <p className="text-[10px] text-slate-500">Stock dépôt : <strong className="text-emerald-700">{stockDepotActuel}</strong> | Global : <strong className="text-blue-700">{cumulGlobal}</strong></p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        if (!articleSelectionneTemp) {
                          alert('Veuillez cocher un article.');
                          return;
                        }
                        setModalArticleOuvert(false);
                      }}
                      className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold px-6 py-2.5 rounded-xl shadow text-xs transition"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}

            {lignesPanier.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                Aucun article ajouté pour le moment.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-3">Article</th>
                      {typeOperation !== 'TRANSFERT' && <th className="p-3">Stock Actuel (Dépôt)</th>}
                      <th className="p-3">Quantité</th>
                      {typeOperation !== 'TRANSFERT' && <th className="p-3">Stock Réel (Prévu)</th>}
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lignesPanier.map((ligne, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="p-3 font-extrabold text-slate-800 flex items-center gap-2">
                          {ligne.photo ? (
                            <img src={ligne.photo} alt="" className="w-6 h-6 rounded-lg object-cover border" />
                          ) : null}
                          {ligne.designation}
                        </td>
                        {typeOperation !== 'TRANSFERT' && (
                          <td className="p-3 font-semibold text-slate-600">{ligne.stockActuel}</td>
                        )}
                        <td className="p-3 font-black text-emerald-700">{ligne.quantite}</td>
                        {typeOperation !== 'TRANSFERT' && (
                          <td className="p-3 font-extrabold text-blue-700 text-sm">{ligne.stockReel}</td>
                        )}
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => supprimerLignePanier(index)}
                            className="p-1.5 border border-slate-300 rounded-lg hover:bg-red-100 transition"
                            title="Supprimer"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Boutons Imprimer, Partager et Valider */}
            <div className="pt-3 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (lignesPanier.length === 0) {
                    alert('Veuillez ajouter des articles avant d’imprimer.');
                    return;
                  }
                  window.print();
                }}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-3 rounded-xl shadow transition text-xs"
              >
                🖨️ Imprimer
              </button>

              <button
                type="button"
                onClick={() => {
                  if (lignesPanier.length === 0) {
                    alert('Veuillez ajouter des articles avant de partager.');
                    return;
                  }
                  setModalPartageOuverte(true);
                }}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-3 rounded-xl shadow transition text-xs"
              >
                📤 Partager...
              </button>

              <button
                type="button"
                onClick={validerDocumentMouvement}
                disabled={lignesPanier.length === 0}
                className={`font-bold px-8 py-3 rounded-xl shadow transition text-xs ${
                  lignesPanier.length > 0 ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                VALIDER
              </button>
            </div>
          </div>
        </>
      )}

      {modeAffichage === 'LISTE_DOCS' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h4 className="font-bold text-slate-800 text-xs uppercase">📋 Liste des Mouvements Enregistrés</h4>
            <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-xl text-xs font-bold">
              {mouvements.length} document(s)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3">Date / Heure</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Article</th>
                  <th className="p-3">Dépôt Source</th>
                  <th className="p-3">Dépôt Dest.</th>
                  <th className="p-3">Quantité</th>
                  <th className="p-3">N° Document</th>
                  <th className="p-3">Opérateur</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mouvements.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-slate-400">
                      Aucun document de mouvement enregistré.
                    </td>
                  </tr>
                ) : (
                  mouvements.map((mvt) => {
                    const art = articles.find((a) => String(a.id_article) === String(mvt.id_article));
                    const depSrc = depots.find((d) => String(d.id) === String(mvt.id_depot_source));
                    const depDest = depots.find((d) => String(d.id) === String(mvt.id_depot_destination));

                    return (
                      <tr key={mvt.id} className="hover:bg-slate-50">
                        <td className="p-3 text-slate-500 font-mono">
                          {new Date(mvt.created_at).toLocaleString('fr-FR')}
                        </td>
                        <td className="p-3 font-extrabold">
                          <span className="px-2 py-1 rounded-lg text-[10px] bg-slate-100 text-slate-800">
                            {mvt.type_mouvement}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-800">{art ? art.Designation : `Article #${mvt.id_article}`}</td>
                        <td className="p-3">{depSrc ? depSrc.nom_depot : '-'}</td>
                        <td className="p-3">{depDest ? depDest.nom_depot : '-'}</td>
                        <td className="p-3 font-black text-slate-900">{mvt.quantite}</td>
                        <td className="p-3 font-mono font-bold text-orange-600">{nettoyerNumeroDoc(mvt.motif_remarque)}</td>
                        <td className="p-3 text-slate-500">{mvt.operateur || '-'}</td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => window.print()}
                              className="p-1.5 border border-slate-300 rounded-lg hover:bg-slate-100 transition"
                              title="Imprimer"
                            >
                              🖨️
                            </button>
                            <button
                              type="button"
                              onClick={() => modifierDocument(mvt)}
                              className="p-1.5 border border-slate-300 rounded-lg hover:bg-amber-100 transition"
                              title="Modifier"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => supprimerDocument(mvt.id)}
                              className="p-1.5 border border-slate-300 rounded-lg hover:bg-red-100 transition"
                              title="Supprimer"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODALE DE CHOIX DE PARTAGE */}
      {modalPartageOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-sm text-slate-800 uppercase">📤 OPTIONS DE PARTAGE</h3>
              <button type="button" onClick={() => setModalPartageOuverte(false)} className="text-slate-400 font-black text-sm">✕</button>
            </div>

            <div className="space-y-3">
              <label className="block font-bold text-slate-700 text-xs">1. Choisir le format du document :</label>
              <div className="grid grid-cols-3 gap-2">
                {['PDF', 'PNG', 'JPG'].map(fmt => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setFormatPartage(fmt)}
                    className={`py-2.5 rounded-xl font-extrabold text-xs border transition ${formatPartage === fmt ? 'bg-orange-600 text-white border-orange-600 shadow' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                  >
                    📄 {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="block font-bold text-slate-700 text-xs">2. Choisir le canal de partage :</label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => executerPartageViaCanal('WhatsApp')}
                  className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold p-3 rounded-2xl flex items-center justify-center gap-2 transition"
                >
                  💚 Envoyer via WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => executerPartageViaCanal('Mail')}
                  className="w-full bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-bold p-3 rounded-2xl flex items-center justify-center gap-2 transition"
                >
                  📧 Envoyer par Mail
                </button>
                <button
                  type="button"
                  onClick={() => executerPartageViaCanal('Bluetooth / Appareil')}
                  className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold p-3 rounded-2xl flex items-center justify-center gap-2 transition"
                >
                  📡 Partager (Bluetooth / Appareil)
                </button>
                <button
                  type="button"
                  onClick={() => executerPartageViaCanal('Téléchargement')}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold p-3 rounded-2xl flex items-center justify-center gap-2 transition"
                >
                  💾 Enregistrer sur l'appareil ({formatPartage})
                </button>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setModalPartageOuverte(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}