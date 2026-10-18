'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtdqodqhkdxanrelxtrq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; 
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GestionArticles({ entrepriseId = '4TS-TEST' }) {
  const [articles, setArticles] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [approvisionnements, setApprovisionnements] = useState([]);
  const [familles, setFamilles] = useState([]); 
  const [depots, setDepots] = useState([]);
  const [emplacements, setEmplacements] = useState([]);

  // Navigation interne : 'catalogue' | 'historique'
  const [modeVue, setModeVue] = useState('catalogue');

  // Filtres Historique Article
  const [articleHistoriqueId, setArticleHistoriqueId] = useState('');
  const [depotHistoriqueFiltre, setDepotHistoriqueFiltre] = useState('TOUS');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  const [chargement, setChargement] = useState(false);
  const [afficherForm, setAfficherForm] = useState(false);
  const [articleEnEdition, setArticleEnEdition] = useState(null);

  const [familleFiltre, setFamilleFiltre] = useState('TOUTES');
  const [depotFiltre, setDepotFiltre] = useState('TOUS');
  const [emplacementFiltre, setEmplacementFiltre] = useState('TOUS');

  const [nouveauArticle, setNouveauArticle] = useState({
    Code_Barre: '',
    Designation: '',
    Famille: '',
    Prix_Achat: 0,
    Prix_Vente: 0,
    Quantite_Stock: 0,
    Seuil_Alerte: 5,
    Disponible_Menu_QR: true,
  });

  const chargerDonneesReference = async () => {
    try {
      const { data: dataFam } = await supabase.from('familles_articles').select('*').order('nom_famille', { ascending: true });
      setFamilles(dataFam || []);

      const { data: dataDep } = await supabase.from('depots_stock').select('*');
      setDepots(dataDep || []);

      const { data: dataEmp } = await supabase.from('emplacements_stock').select('*');
      setEmplacements(dataEmp || []);

      // 1. Charger les Mouvements de stock
      const { data: dataMvt } = await supabase.from('mouvements_stock').select('*').eq('id_entreprise', entrepriseId);
      setMouvements(dataMvt || []);

      // 2. Charger les Approvisionnements (Achats fournisseurs)
      const { data: dataAppro } = await supabase.from('approvisionnements').select('*').eq('id_entreprise', entrepriseId);
      setApprovisionnements(dataAppro || []);
    } catch (err) {
      console.error('Erreur chargement références :', err.message);
    }
  };

  const chargerArticles = async () => {
    setChargement(true);
    try {
      const { data, error } = await supabase
        .from('articles_stock')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const listArticles = data || [];
      setArticles(listArticles);
      if (listArticles.length > 0 && !articleHistoriqueId) {
        setArticleHistoriqueId(listArticles[0].id_article || listArticles[0].id);
      }
    } catch (err) {
      console.error('Erreur chargement articles :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonneesReference();
    chargerArticles();
  }, [entrepriseId]);

  const enregistrerArticle = async (e) => {
    e.preventDefault();
    try {
      if (articleEnEdition) {
        const targetId = articleEnEdition.id_article || articleEnEdition.id;
        const { error } = await supabase
          .from('articles_stock')
          .update({
            Designation: nouveauArticle.Designation,
            Code_Barre: nouveauArticle.Code_Barre,
            Famille: nouveauArticle.Famille,
            Prix_Achat: parseFloat(nouveauArticle.Prix_Achat) || 0,
            Prix_Vente: parseFloat(nouveauArticle.Prix_Vente) || 0,
            Seuil_Alerte: parseInt(nouveauArticle.Seuil_Alerte) || 5,
            Disponible_Menu_QR: nouveauArticle.Disponible_Menu_QR,
          })
          .eq(articleEnEdition.id_article ? 'id_article' : 'id', targetId);

        if (error) throw error;
        alert('Article mis à jour avec succès !');
      } else {
        const { error } = await supabase.from('articles_stock').insert([
          {
            Designation: nouveauArticle.Designation,
            Code_Barre: nouveauArticle.Code_Barre,
            Famille: nouveauArticle.Famille,
            Prix_Achat: parseFloat(nouveauArticle.Prix_Achat) || 0,
            Prix_Vente: parseFloat(nouveauArticle.Prix_Vente) || 0,
            Quantite_Stock: 0,
            Seuil_Alerte: parseInt(nouveauArticle.Seuil_Alerte) || 5,
            Disponible_Menu_QR: nouveauArticle.Disponible_Menu_QR ?? true,
            ID_Entreprise: entrepriseId,
          },
        ]);

        if (error) throw error;
        alert('Article créé avec succès !');
      }

      annulerForm();
      chargerArticles();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const ouvrirEdition = (article) => {
    setArticleEnEdition(article);
    setNouveauArticle({
      Code_Barre: article.Code_Barre || article.code_barre || '',
      Designation: article.Designation || article.designation || '',
      Famille: article.Famille || article.famille || '',
      Prix_Achat: article.Prix_Achat || article.prix_achat || 0,
      Prix_Vente: article.Prix_Vente || article.prix_vente || 0,
      Quantite_Stock: article.Quantite_Stock ?? article.quantite_stock ?? 0,
      Seuil_Alerte: article.Seuil_Alerte || article.seuil_alerte || 5,
      Disponible_Menu_QR: article.Disponible_Menu_QR ?? true,
    });
    setAfficherForm(true);
  };

  const annulerForm = () => {
    setArticleEnEdition(null);
    setNouveauArticle({
      Code_Barre: '',
      Designation: '',
      Famille: '',
      Prix_Achat: 0,
      Prix_Vente: 0,
      Quantite_Stock: 0,
      Seuil_Alerte: 5,
      Disponible_Menu_QR: true,
    });
    setAfficherForm(false);
  };

  const correspondAuDepot = (valeurDepotFlux, depotCibleId) => {
    if (!valeurDepotFlux || !depotCibleId) return false;
    if (String(valeurDepotFlux) === String(depotCibleId)) return true;

    const depotObj = depots.find((d) => String(d.id) === String(depotCibleId));
    if (depotObj && (depotObj.nom_depot || depotObj.nom || depotObj.libelle)) {
      const nomDepotCible = depotObj.nom_depot || depotObj.nom || depotObj.libelle;
      if (String(valeurDepotFlux).trim().toUpperCase() === String(nomDepotCible).trim().toUpperCase()) {
        return true;
      }
    }
    return false;
  };

  const calculerStockPourUnDepot = (articleId, depotId) => {
    let stockDepot = 0;

    const mvtArticle = mouvements
      .filter((m) => String(m.id_article) === String(articleId))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    mvtArticle.forEach((m) => {
      const matchDepotSource = String(m.id_depot_source || m.id_depot) === String(depotId);
      const matchDepotDest = String(m.id_depot_destination) === String(depotId);
      const qte = parseInt(m.quantite || 0);
      const typeMvt = (m.type_mouvement || '').toUpperCase();

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
        typeMvt.includes('APPROVISIONNEMENT')
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

    approvisionnements.forEach((app) => {
      const matchDepotDest = String(app.id_depot_destination) === String(depotId);
      if (matchDepotDest && app.details_articles) {
        let details = [];
        try {
          details = typeof app.details_articles === 'string' 
            ? JSON.parse(app.details_articles) 
            : app.details_articles;
        } catch (e) {
          details = [];
        }

        if (Array.isArray(details)) {
          details.forEach((item) => {
            const idArtInDetails = item.id_article || item.id;
            if (String(idArtInDetails) === String(articleId)) {
              const qteAchetee = parseInt(item.quantite || item.Quantite || 0);
              stockDepot += qteAchetee;
            }
          });
        }
      }
    });

    return Math.max(0, stockDepot);
  };

  const calculerStockParFiltre = (articleId) => {
    if (depotFiltre !== 'TOUS') {
      return calculerStockPourUnDepot(articleId, depotFiltre);
    } else {
      if (depots.length === 0) {
        const artObj = articles.find(a => String(a.id_article || a.id) === String(articleId));
        return parseInt(artObj?.Quantite_Stock ?? artObj?.quantite_stock ?? 0);
      }

      let sommeTotaleDepots = 0;
      depots.forEach((dep) => {
        sommeTotaleDepots += calculerStockPourUnDepot(articleId, dep.id);
      });
      return sommeTotaleDepots;
    }
  };

  // --- OBTENTION DE L'HISTORIQUE DU PLUS ANCIEN AU PLUS NOUVEAU ---
  const obtenirHistoriqueFluxArticle = (articleId) => {
    if (!articleId) return [];
    let flux = [];

    // 1. Mouvements de stock
    mouvements
      .filter((m) => String(m.id_article) === String(articleId))
      .forEach((m) => {
        const depotSrcObj = depots.find(d => String(d.id) === String(m.id_depot_source || m.id_depot));
        const depotDstObj = depots.find(d => String(d.id) === String(m.id_depot_destination));

        flux.push({
          date: m.created_at || new Date().toISOString(),
          depotSource: depotSrcObj ? depotSrcObj.nom_depot : (m.id_depot_source || m.id_depot || '-'),
          depotDest: depotDstObj ? depotDstObj.nom_depot : (m.id_depot_destination || '-'),
          idDepotConcerne: m.id_depot_source || m.id_depot || m.id_depot_destination,
          quantite: parseInt(m.quantite || 0),
          type: (m.type_mouvement || 'MOUVEMENT').toUpperCase(),
          numeroDoc: m.numero_mouvement || m.numero_bon || m.reference || m.ref_document || (m.type_mouvement || 'MOUVEMENT').toUpperCase(),
        });
      });

    // 2. Approvisionnements
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
        const idArt = ligne.id_article || ligne.article_id || ligne.id;
        if (String(idArt) === String(articleId)) {
          const depotObj = depots.find(d => String(d.id) === String(app.id_depot_destination));
          flux.push({
            date: app.created_at || new Date().toISOString(),
            depotSource: depotObj ? depotObj.nom_depot : (app.id_depot_destination || '-'),
            depotDest: '-',
            idDepotConcerne: app.id_depot_destination,
            quantite: parseInt(ligne.quantite || 0),
            type: 'ACHAT',
            numeroDoc: app.numero_bon || app.numero_commande || 'APPROVISIONNEMENT',
          });
        }
      });
    });

    // Tri chronologique croissant : DU PLUS ANCIEN AU PLUS NOUVEAU
    flux.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Filtrage par dépôt si demandé
    let fluxFiltres = flux;
    if (depotHistoriqueFiltre !== 'TOUS') {
      fluxFiltres = flux.filter(f => correspondAuDepot(f.idDepotConcerne, depotHistoriqueFiltre));
    }

    // Filtrage par date début / fin
    if (dateDebut) {
      fluxFiltres = fluxFiltres.filter(f => f.date.split('T')[0] >= dateDebut);
    }
    if (dateFin) {
      fluxFiltres = fluxFiltres.filter(f => f.date.split('T')[0] <= dateFin);
    }

    // Calcul cumulatif du stock au fil des mouvements
    let stockCourant = 0;
    const fluxAvecStock = fluxFiltres.map(f => {
      const typeMvt = f.type;
      if (typeMvt.includes('ENTREE') || typeMvt.includes('ACHAT') || typeMvt.includes('APPROVISIONNEMENT')) {
        stockCourant += f.quantite;
      } else if (typeMvt.includes('SORTIE') || typeMvt.includes('VENTE') || typeMvt.includes('AVARIES')) {
        stockCourant -= f.quantite;
      } else {
        stockCourant += f.quantite;
      }
      return { ...f, stockApres: stockCourant };
    });

    // On retourne la liste dans l'ordre du plus ancien au plus récent
    return fluxAvecStock;
  };

  const supprimerArticle = async (article) => {
    const artId = article.id_article || article.id;
    const stockGlobalActuel = calculerStockParFiltre(artId);

    if (stockGlobalActuel > 0) {
      alert(`⛔ Impossible de supprimer ! L'article possède encore un cumul global de ${stockGlobalActuel} unité(s) en stock.`);
      return;
    }

    if (!confirm(`Supprimer définitivement cet article ?`)) return;

    try {
      const targetId = article.id_article || article.id;
      const { error } = await supabase
        .from('articles_stock')
        .delete()
        .eq(article.id_article ? 'id_article' : 'id', targetId);

      if (error) throw error;
      alert('Article supprimé.');
      chargerArticles();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const articlesAffiches = articles.filter((art) => {
    const matchFamille = familleFiltre === 'TOUTES' || String(art.Famille || art.famille) === String(familleFiltre);
    return matchFamille;
  });

  const emplacementsDisponibles = depotFiltre === 'TOUS' 
    ? emplacements 
    : emplacements.filter(emp => String(emp.id_depot) === String(depotFiltre));

  const articleSelectionneObj = articles.find(a => String(a.id_article || a.id) === String(articleHistoriqueId));
  const historiqueFlux = obtenirHistoriqueFluxArticle(articleHistoriqueId);

  return (
    <div className="space-y-4 text-xs">
      {/* Barre de navigation entre Catalogue et Historique Article */}
      <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2">
        <button
          type="button"
          onClick={() => setModeVue('catalogue')}
          className={`flex-1 py-2 px-4 rounded-xl font-extrabold transition ${
            modeVue === 'catalogue' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          📦 Catalogue Articles ({articles.length})
        </button>
        <button
          type="button"
          onClick={() => setModeVue('historique')}
          className={`flex-1 py-2 px-4 rounded-xl font-extrabold transition ${
            modeVue === 'historique' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          🔍 Interroger l'Historique & Détails
        </button>
      </div>

      {modeVue === 'catalogue' && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <p className="text-slate-500">Catalogue produits, prix et suivi des stocks par dépôt et emplacement.</p>
            <button
              onClick={() => (afficherForm ? annulerForm() : setAfficherForm(true))}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded-xl transition shadow"
            >
              {afficherForm ? '✖ Fermer' : '➕ Ajouter un article'}
            </button>
          </div>

          {afficherForm && (
            <form onSubmit={enregistrerArticle} className="bg-slate-50 border-2 border-orange-500/40 p-4 rounded-2xl space-y-3">
              <h4 className="font-bold text-orange-600 uppercase">
                {articleEnEdition ? `✏️ Modifier l'article` : 'Nouveau Produit'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Désignation *</label>
                  <input
                    type="text"
                    required
                    value={nouveauArticle.Designation}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Designation: e.target.value })}
                    placeholder="Ex: EXTRA FESCO ANANAS"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Famille / Catégorie *</label>
                  <select
                    required
                    value={nouveauArticle.Famille}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Famille: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-slate-700"
                  >
                    <option value="">-- Sélectionner une Famille --</option>
                    {familles.map((fam) => (
                      <option key={fam.id} value={fam.id}>
                        🏷️ {fam.nom_famille || fam.Nom_Famille}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Code Barre</label>
                  <input
                    type="text"
                    value={nouveauArticle.Code_Barre}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Code_Barre: e.target.value })}
                    placeholder="Ex: 600123"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Prix d'Achat</label>
                  <input
                    type="number"
                    value={nouveauArticle.Prix_Achat}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Prix_Achat: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Prix de Vente *</label>
                  <input
                    type="number"
                    required
                    value={nouveauArticle.Prix_Vente}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Prix_Vente: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-slate-400">Quantité en stock</label>
                  <input
                    type="number"
                    disabled
                    value={nouveauArticle.Quantite_Stock}
                    className="w-full bg-slate-200 text-slate-500 border border-slate-300 rounded-xl p-2.5 font-bold cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={annulerForm} className="bg-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-xl">Annuler</button>
                <button type="submit" className="bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl shadow">
                  {articleEnEdition ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          )}

          {/* Barres de filtres */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Filtrer par Famille :</label>
              <select
                value={familleFiltre}
                onChange={(e) => setFamilleFiltre(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800"
              >
                <option value="TOUTES">Toutes les Familles ({articles.length})</option>
                {familles.map((fam) => (
                  <option key={fam.id} value={fam.id}>
                    🏷️ {fam.nom_famille || fam.Nom_Famille}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Filtrer par Dépôt :</label>
              <select
                value={depotFiltre}
                onChange={(e) => { setDepotFiltre(e.target.value); setEmplacementFiltre('TOUS'); }}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800"
              >
                <option value="TOUS">Tous les Dépôts ({depots.length})</option>
                {depots.map((dep) => (
                  <option key={dep.id} value={dep.id}>
                    🏢 {dep.nom_depot || dep.Nom_Depot}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Filtrer par Emplacement :</label>
              <select
                value={emplacementFiltre}
                onChange={(e) => setEmplacementFiltre(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-800"
              >
                <option value="TOUS">Tous les Emplacements</option>
                {emplacementsDisponibles.map((emp) => (
                  <option key={emp.id} value={emp.nom_emplacement}>
                    📍 {emp.nom_emplacement}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-500 px-1">
            <span>Affichage : <strong>{articlesAffiches.length}</strong> article(s) trouvé(s)</span>
          </div>

          {/* Tableau des articles */}
          {chargement ? (
            <div className="p-8 text-center text-slate-400">Chargement des articles...</div>
          ) : articlesAffiches.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
              Aucun article trouvé avec ces filtres.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Désignation</th>
                    <th className="p-3">Famille / Catégorie</th>
                    <th className="p-3">Code Barre</th>
                    <th className="p-3">Prix Achat</th>
                    <th className="p-3">Prix Vente</th>
                    <th className="p-3">Stock Actuel</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {articlesAffiches.map((art) => {
                    const artId = art.id_article || art.id;
                    const familleTrouvee = familles.find((f) => String(f.id) === String(art.Famille || art.famille));
                    const stockVal = calculerStockParFiltre(artId);

                    return (
                      <tr key={artId} className="hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-800">{art.Designation || art.designation}</td>
                        <td className="p-3">
                          <span className="bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-lg font-bold text-[10px]">
                            🏷️ {familleTrouvee ? (familleTrouvee.nom_famille || familleTrouvee.Nom_Famille) : 'Général'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-500">{art.Code_Barre || art.code_barre || '-'}</td>
                        <td className="p-3">{art.Prix_Achat || art.prix_achat ? `${art.Prix_Achat || art.prix_achat}` : '-'}</td>
                        <td className="p-3 font-extrabold text-emerald-600">{art.Prix_Vente || art.prix_vente}</td>
                        <td className="p-3 font-bold">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] ${stockVal > 0 ? 'bg-emerald-100 text-emerald-700 font-black text-sm' : 'bg-slate-100 text-slate-500'}`}>
                            {stockVal}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => ouvrirEdition(art)} className="p-1.5 border border-slate-300 rounded-lg hover:bg-orange-100" title="Modifier">✏️</button>
                            <button onClick={() => supprimerArticle(art)} className="p-1.5 border border-slate-300 rounded-lg hover:bg-red-100" title="Supprimer">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* VUE HISTORIQUE ARTICLE */}
      {modeVue === 'historique' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="font-extrabold text-slate-800 text-sm uppercase flex items-center gap-2">
            <span>🔍</span> HISTORIQUE ARTICLE
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Sélectionner un Article *</label>
              <select
                value={articleHistoriqueId}
                onChange={(e) => setArticleHistoriqueId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-slate-800"
              >
                {articles.map((art) => (
                  <option key={art.id_article || art.id} value={art.id_article || art.id}>
                    📦 {art.Designation || art.designation}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Filtrer par Dépôt :</label>
              <select
                value={depotHistoriqueFiltre}
                onChange={(e) => setDepotHistoriqueFiltre(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-slate-800"
              >
                <option value="TOUS">Tous les dépôts ({depots.length})</option>
                {depots.map((dep) => (
                  <option key={dep.id} value={dep.id}>
                    🏢 {dep.nom_depot || dep.Nom_Depot}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Date Début :</label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Date Fin :</label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium"
              />
            </div>
          </div>

          <div className="bg-orange-50/50 border border-orange-200 p-4 rounded-2xl flex justify-between items-center">
            <h5 className="font-extrabold text-slate-800 uppercase">
              📦 ARTICLE : {articleSelectionneObj ? (articleSelectionneObj.Designation || articleSelectionneObj.designation) : ''}
            </h5>
            <span className="text-xs font-bold text-slate-600">{historiqueFlux.length} mouvement(s) trouvé(s)</span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3">Date / Heure</th>
                  <th className="p-3">Dépôt Source</th>
                  <th className="p-3">Dépôt Dest.</th>
                  <th className="p-3">Quantité</th>
                  <th className="p-3 text-blue-600">STOCK</th>
                  <th className="p-3 text-orange-600 font-mono">N° Document</th>
                  <th className="p-3">Opérateur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historiqueFlux.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-400">Aucun historique de mouvement pour cet article.</td>
                  </tr>
                ) : (
                  historiqueFlux.map((flux, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-500 font-mono">
                        {new Date(flux.date).toLocaleString('fr-FR')}
                      </td>
                      <td className="p-3 font-semibold">{flux.depotSource}</td>
                      <td className="p-3 text-slate-500">{flux.depotDest}</td>
                      <td className="p-3 font-black text-slate-800">{flux.quantite}</td>
                      <td className="p-3 font-black text-blue-600">{flux.stockApres}</td>
                      <td className="p-3 font-mono font-bold text-orange-600">{flux.numeroDoc}</td>
                      <td className="p-3 text-slate-600 font-medium">THÉODORE STÉPHANE</td>
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