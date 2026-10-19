'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function GestionArticles({ entrepriseId = '4TS-TEST' }) {
  const [articles, setArticles] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [approvisionnements, setApprovisionnements] = useState([]);
  const [ventesHistoriques, setVentesHistoriques] = useState([]);
  const [familles, setFamilles] = useState([]); 
  const [depots, setDepots] = useState([]);
  const [emplacements, setEmplacements] = useState([]);

  const [modeVue, setModeVue] = useState('catalogue');

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

  // États pour la gestion du tri du catalogue
  const [colonneTri, setColonneTri] = useState('Designation');
  const [ordreTri, setOrdreTri] = useState('asc');

  const [nouveauArticle, setNouveauArticle] = useState({
    Code_Barre: '',
    Designation: '',
    Famille: '',
    Prix_Achat: 0,
    Prix_Vente: 0,
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

      const { data: dataMvt } = await supabase.from('mouvements_stock').select('*').eq('id_entreprise', entrepriseId);
      setMouvements(dataMvt || []);

      const { data: dataAppro } = await supabase.from('approvisionnements').select('*').eq('id_entreprise', entrepriseId);
      setApprovisionnements(dataAppro || []);

      // Récupération des ventes historiques pour déduire le stock vendu par dépôt
      const { data: dataVentes } = await supabase.from('ventes_historiques').select('*').eq('id_entreprise', entrepriseId);
      setVentesHistoriques(dataVentes || []);
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

    // Prise en compte des ventes enregistrées dans ventes_historiques pour déduire du stock du dépôt
    ventesHistoriques.forEach((v) => {
      if (v.id_depot && String(v.id_depot) === String(depotId)) {
        let articlesVente = [];
        if (v.details_articles) {
          if (typeof v.details_articles === 'string') { 
            try { articlesVente = JSON.parse(v.details_articles); } catch (e) {} 
          } else if (Array.isArray(v.details_articles)) { 
            articlesVente = v.details_articles; 
          }
        }
        articlesVente.forEach((ligne) => {
          if (String(ligne.id || ligne.id_article) === String(articleId)) {
            stockDepot -= parseInt(ligne.quantite || 0);
          }
        });
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

  const obtenirHistoriqueFluxArticle = (articleId) => {
    if (!articleId) return [];
    let flux = [];

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

    // Intégrer également les ventes dans l'historique des flux
    ventesHistoriques.forEach((v) => {
      let articlesVente = [];
      if (v.details_articles) {
        if (typeof v.details_articles === 'string') {
          try { articlesVente = JSON.parse(v.details_articles); } catch (e) {}
        } else if (Array.isArray(v.details_articles)) {
          articlesVente = v.details_articles;
        }
      }

      articlesVente.forEach((ligne) => {
        const idArt = ligne.id || ligne.id_article;
        if (String(idArt) === String(articleId)) {
          const depotObj = depots.find(d => String(d.id) === String(v.id_depot));
          flux.push({
            date: v.created_at || new Date().toISOString(),
            depotSource: depotObj ? depotObj.nom_depot : (v.id_depot || '-'),
            depotDest: 'Client (Vente)',
            idDepotConcerne: v.id_depot,
            quantite: parseInt(ligne.quantite || 0),
            type: 'VENTE',
            numeroDoc: v.numero_ticket || 'VENTE CAISSE',
          });
        }
      });
    });

    flux.sort((a, b) => new Date(a.date) - new Date(b.date));

    let fluxFiltres = flux;
    if (depotHistoriqueFiltre !== 'TOUS') {
      fluxFiltres = flux.filter(f => correspondAuDepot(f.idDepotConcerne, depotHistoriqueFiltre));
    }

    if (dateDebut) {
      fluxFiltres = fluxFiltres.filter(f => f.date.split('T')[0] >= dateDebut);
    }
    if (dateFin) {
      fluxFiltres = fluxFiltres.filter(f => f.date.split('T')[0] <= dateFin);
    }

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

    return fluxAvecStock;
  };

  const supprimerArticleDepuisFormulaire = async () => {
    if (!articleEnEdition) return;
    const artId = articleEnEdition.id_article || articleEnEdition.id;
    const stockGlobalActuel = calculerStockParFiltre(artId);

    if (stockGlobalActuel > 0) {
      alert(`⛔ Impossible de supprimer ! L'article possède encore un cumul global de ${stockGlobalActuel} unité(s) en stock.`);
      return;
    }

    if (!confirm(`Supprimer définitivement cet article ?`)) return;

    try {
      const { error } = await supabase
        .from('articles_stock')
        .delete()
        .eq(articleEnEdition.id_article ? 'id_article' : 'id', artId);

      if (error) throw error;
      alert('Article supprimé.');
      annulerForm();
      chargerArticles();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const articlesFiltres = articles.filter((art) => {
    const matchFamille = familleFiltre === 'TOUTES' || String(art.Famille || art.famille) === String(familleFiltre);
    return matchFamille;
  });

  const gererTri = (colonne) => {
    if (colonneTri === colonne) {
      setOrdreTri(ordreTri === 'asc' ? 'desc' : 'asc');
    } else {
      setColonneTri(colonne);
      setOrdreTri('asc');
    }
  };

  const articlesAffiches = [...articlesFiltres].sort((a, b) => {
    let valA, valB;
    const aId = a.id_article || a.id;
    const bId = b.id_article || b.id;

    if (colonneTri === 'Designation') {
      valA = String(a.Designation || a.designation || '').toLowerCase();
      valB = String(b.Designation || b.designation || '').toLowerCase();
    } else if (colonneTri === 'Stock') {
      valA = calculerStockParFiltre(aId);
      valB = calculerStockParFiltre(bId);
    } else if (colonneTri === 'Prix_Achat') {
      valA = parseFloat(a.Prix_Achat || a.prix_achat || 0);
      valB = parseFloat(b.Prix_Achat || b.prix_achat || 0);
    } else if (colonneTri === 'Prix_Vente') {
      valA = parseFloat(a.Prix_Vente || a.prix_vente || 0);
      valB = parseFloat(b.Prix_Vente || b.prix_vente || 0);
    }

    if (valA < valB) return ordreTri === 'asc' ? -1 : 1;
    if (valA > valB) return ordreTri === 'asc' ? 1 : -1;
    return 0;
  });

  const emplacementsDisponibles = depotFiltre === 'TOUS' 
    ? emplacements 
    : emplacements.filter(emp => String(emp.id_depot) === String(depotFiltre));

  const articleSelectionneObj = articles.find(a => String(a.id_article || a.id) === String(articleHistoriqueId));
  const historiqueFlux = obtenirHistoriqueFluxArticle(articleHistoriqueId);

  return (
    <div className="space-y-2.5 font-sans text-xs">
      
      <div className="flex justify-start items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            setModeVue('catalogue');
            if (!afficherForm) setAfficherForm(true);
          }}
          className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition whitespace-nowrap border ${
            modeVue === 'catalogue' && afficherForm 
              ? 'bg-orange-600 text-white border-orange-600 shadow-2xs' 
              : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50'
          }`}
        >
          ＋ Nouveau ({articles.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setModeVue('historique');
            setAfficherForm(false);
          }}
          className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition whitespace-nowrap border ${
            modeVue === 'historique' 
              ? 'bg-orange-600 text-white border-orange-600 shadow-2xs' 
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          🔍 Historique
        </button>
      </div>

      {modeVue === 'catalogue' && (
        <>
          {afficherForm && (
            <form onSubmit={enregistrerArticle} className="bg-white border-2 border-orange-500/50 p-2.5 rounded-xl shadow-xs space-y-2">
              <div className="flex justify-between items-center pb-1 border-b border-slate-100">
                <div className="flex-1 max-w-[200px]">
                  <select
                    required
                    value={nouveauArticle.Famille}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Famille: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1 text-[11px] font-bold text-orange-600 focus:outline-none"
                  >
                    <option value="">-- Sélectionner Famille --</option>
                    {familles.map((fam) => (
                      <option key={fam.id} value={fam.id}>
                        🏷️ {fam.nom_famille || fam.Nom_Famille}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="button" onClick={annulerForm} className="text-slate-400 hover:text-slate-600 font-bold text-xs p-1">✖</button>
              </div>

              <div>
                <label className="block font-bold text-[9px] text-slate-400 uppercase mb-0.5">Désignation *</label>
                <input
                  type="text"
                  required
                  value={nouveauArticle.Designation}
                  onChange={(e) => setNouveauArticle({ ...nouveauArticle, Designation: e.target.value })}
                  placeholder="Ex: JUS DE PAPAYE 250ML"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-extrabold text-slate-800 whitespace-nowrap truncate"
                />
              </div>

              <div className="grid grid-cols-4 gap-1.5 items-end">
                <div>
                  <label className="block font-bold text-[9px] text-slate-400 uppercase mb-0.5">P.A</label>
                  <input
                    type="number"
                    value={nouveauArticle.Prix_Achat}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Prix_Achat: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[9px] text-slate-400 uppercase mb-0.5">P.V *</label>
                  <input
                    type="number"
                    required
                    value={nouveauArticle.Prix_Vente}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Prix_Vente: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs font-bold text-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[9px] text-slate-400 uppercase mb-0.5">S.Alerte</label>
                  <input
                    type="number"
                    value={nouveauArticle.Seuil_Alerte}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Seuil_Alerte: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs font-bold text-slate-700"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[9px] text-slate-400 uppercase mb-0.5">Code-Barres</label>
                  <input
                    type="text"
                    value={nouveauArticle.Code_Barre}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Code_Barre: e.target.value })}
                    placeholder="600123"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-1 flex justify-between items-center">
                {articleEnEdition ? (
                  <button 
                    type="button" 
                    onClick={supprimerArticleDepuisFormulaire} 
                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold px-3 py-1 rounded-lg text-[10px]"
                  >
                    🗑️ Supprimer
                  </button>
                ) : <div />}

                <div className="flex gap-1.5">
                  <button type="button" onClick={annulerForm} className="bg-slate-200 text-slate-700 font-bold px-3 py-1 rounded-lg text-[10px]">Annuler</button>
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-1 rounded-lg shadow-2xs text-[10px]">
                    {articleEnEdition ? 'Mettre à jour' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="bg-white p-1.5 rounded-xl border border-slate-200 grid grid-cols-3 gap-1.5">
            <div>
              <label className="block font-bold text-[8px] uppercase text-slate-400 mb-0.5">Famille</label>
              <select
                value={familleFiltre}
                onChange={(e) => setFamilleFiltre(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1 font-bold text-slate-700 text-[10px]"
              >
                <option value="TOUTES">Toutes</option>
                {familles.map((fam) => (
                  <option key={fam.id} value={fam.id}>
                    {fam.nom_famille || fam.Nom_Famille}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[8px] uppercase text-slate-400 mb-0.5">Dépôt</label>
              <select
                value={depotFiltre}
                onChange={(e) => { setDepotFiltre(e.target.value); setEmplacementFiltre('TOUS'); }}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1 font-bold text-slate-700 text-[10px]"
              >
                <option value="TOUS">Tous</option>
                {depots.map((dep) => (
                  <option key={dep.id} value={dep.id}>
                    {dep.nom_depot || dep.Nom_Depot}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[8px] uppercase text-slate-400 mb-0.5">Emplacement</label>
              <select
                value={emplacementFiltre}
                onChange={(e) => setEmplacementFiltre(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1 font-bold text-slate-700 text-[10px]"
              >
                <option value="TOUS">Tous</option>
                {emplacementsDisponibles.map((emp) => (
                  <option key={emp.id} value={emp.nom_emplacement}>
                    {emp.nom_emplacement}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[9px] font-extrabold tracking-wider">
                  <th 
                    onClick={() => gererTri('Designation')} 
                    className="p-2 w-[44%] cursor-pointer hover:bg-slate-100 select-none"
                  >
                    Désignation {colonneTri === 'Designation' && (ordreTri === 'asc' ? '▲' : '▼')}
                  </th>
                  <th 
                    onClick={() => gererTri('Stock')} 
                    className="p-2 w-[13%] text-center cursor-pointer hover:bg-slate-100 select-none"
                  >
                    Stock {colonneTri === 'Stock' && (ordreTri === 'asc' ? '▲' : '▼')}
                  </th>
                  <th 
                    onClick={() => gererTri('Prix_Achat')} 
                    className="p-2 w-[15%] text-right cursor-pointer hover:bg-slate-100 select-none"
                  >
                    P.A {colonneTri === 'Prix_Achat' && (ordreTri === 'asc' ? '▲' : '▼')}
                  </th>
                  <th 
                    onClick={() => gererTri('Prix_Vente')} 
                    className="p-2 w-[15%] text-right cursor-pointer hover:bg-slate-100 select-none"
                  >
                    P.V {colonneTri === 'Prix_Vente' && (ordreTri === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="p-2 w-[13%] text-center">⚙️</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chargement ? (
                  <tr>
                    <td colSpan="5" className="p-3 text-center text-slate-400">Chargement...</td>
                  </tr>
                ) : articlesAffiches.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-3 text-center text-slate-400">Aucun article.</td>
                  </tr>
                ) : (
                  articlesAffiches.map((art) => {
                    const artId = art.id_article || art.id;
                    const stockVal = calculerStockParFiltre(artId);

                    return (
                      <tr key={artId} className="hover:bg-slate-50 transition">
                        <td className="p-2 font-black text-slate-800 text-[9.5px] whitespace-nowrap truncate">
                          {art.Designation || art.designation}
                        </td>
                        <td className="p-2 text-center whitespace-nowrap">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${stockVal > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                            {stockVal}
                          </span>
                        </td>
                        <td className="p-2 text-right font-medium text-slate-600 text-[10px] whitespace-nowrap">
                          {art.Prix_Achat || art.prix_achat || 0}
                        </td>
                        <td className="p-2 text-right font-black text-emerald-600 text-[10px] whitespace-nowrap">
                          {art.Prix_Vente || art.prix_vente || 0}
                        </td>
                        <td className="p-2 text-center whitespace-nowrap">
                          <button 
                            onClick={() => ouvrirEdition(art)} 
                            className="p-1 bg-slate-100 hover:bg-orange-100 border border-slate-200 rounded text-[11px]" 
                            title="Modifier"
                          >
                            ✏️
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {modeVue === 'historique' && (
        <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
          <div>
            <label className="block font-bold text-slate-400 text-[8px] uppercase mb-0.5">Article</label>
            <select
              value={articleHistoriqueId}
              onChange={(e) => setArticleHistoriqueId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1 font-bold text-slate-800 text-xs"
            >
              {articles.map((art) => (
                <option key={art.id_article || art.id} value={art.id_article || art.id}>
                  {art.Designation || art.designation}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            <div>
              <label className="block font-bold text-slate-400 text-[8px] uppercase mb-0.5">Dépôt</label>
              <select
                value={depotHistoriqueFiltre}
                onChange={(e) => setDepotHistoriqueFiltre(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded p-1 font-bold text-slate-700 text-[10px]"
              >
                <option value="TOUS">Tous</option>
                {depots.map((dep) => (
                  <option key={dep.id} value={dep.id}>
                    {dep.nom_depot || dep.Nom_Depot}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-400 text-[8px] uppercase mb-0.5">Du</label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded p-0.5 font-medium text-[9px]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-400 text-[8px] uppercase mb-0.5">Au</label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded p-0.5 font-medium text-[9px]"
              />
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 p-1.5 rounded-lg flex justify-between items-center">
            <h5 className="font-extrabold text-slate-800 text-[11px] truncate">
              {articleSelectionneObj ? (articleSelectionneObj.Designation || articleSelectionneObj.designation) : ''}
            </h5>
            <span className="text-[9px] font-bold text-slate-600 bg-white px-1.5 py-0.5 rounded shadow-2xs">
              {historiqueFlux.length} mvt(s)
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 uppercase text-[8px] font-extrabold text-slate-500">
                  <th className="p-1.5">Date</th>
                  <th className="p-1.5">Trajet</th>
                  <th className="p-1.5 text-center">Qte</th>
                  <th className="p-1.5 text-center text-blue-600">Stock</th>
                  <th className="p-1.5 text-orange-600 font-mono">Doc</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[10px]">
                {historiqueFlux.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-3 text-center text-slate-400">Aucun mouvement.</td>
                  </tr>
                ) : (
                  historiqueFlux.map((flux, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-1.5 font-mono text-slate-500 text-[9px] whitespace-nowrap">{new Date(flux.date).toLocaleDateString('fr-FR')}</td>
                      <td className="p-1.5 font-semibold text-[9px] whitespace-nowrap">{flux.depotSource} → {flux.depotDest}</td>
                      <td className="p-1.5 text-center font-black text-slate-800">{flux.quantite}</td>
                      <td className="p-1.5 text-center font-black text-blue-600">{flux.stockApres}</td>
                      <td className="p-1.5 font-mono font-bold text-orange-600 text-[9px] whitespace-nowrap">{flux.numeroDoc}</td>
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