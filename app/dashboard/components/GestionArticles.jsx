'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionArticles({ entrepriseId = '4TS-TEST' }) {
  const [articles, setArticles] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [approvisionnements, setApprovisionnements] = useState([]);
  const [ventesHistoriques, setVentesHistoriques] = useState([]);
  const [depots, setDepots] = useState([]); 
  const [emplacements, setEmplacements] = useState([]);
  const [familles, setFamilles] = useState([]);
  const [entrepriseInfo, setInfosEntreprise] = useState(null);

  const [modeVue, setModeVue] = useState('catalogue');
  const [articleSelectionneStatId, setArticleSelectionneStatId] = useState('');
  const [depotStatFiltre, setDepotStatFiltre] = useState('TOUS');

  const [afficherModalSelectionArticle, setAfficherModalSelectionArticle] = useState(false);
  const [rechercheModalArticle, setRechercheModalArticle] = useState('');

  const [chargement, setChargement] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [afficherForm, setAfficherForm] = useState(false);
  const [articleEnEdition, setArticleEnEdition] = useState(null);

  const [familleFiltre, setFamilleFiltre] = useState('TOUTES');
  const [depotFiltre, setDepotFiltre] = useState('TOUS');
  const [emplacementFiltre, setEmplacementFiltre] = useState('TOUS');

  const [colonneTri, setColonneTri] = useState('Designation');
  const [ordreTri, setOrdreTri] = useState('asc');

  const [nouveauArticle, setNouveauArticle] = useState({
    Code_Barre: '',
    Designation: '',
    Famille: '',
    Prix_Achat: 0,
    Prix_Vente: 0,
    Seuil_Alerte: 5,
    Photo: '',
    Disponible_Menu_QR: true,
    date_peremption: '',
  });

  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();

  const chargerDonneesReference = async () => {
    try {
      const { data: dataEnt } = await supabase
        .from('entreprises')
        .select('*')
        .or(`id.eq.${entrepriseId},id_entreprise.eq.${entrepriseId},code_entreprise.eq.${entrepriseId}`)
        .single();
      
      if (dataEnt) setInfosEntreprise(dataEnt);

      const { data: dataFam } = await supabase
        .from('familles_articles')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('nom_famille', { ascending: true });
      setFamilles(dataFam || []);

      const { data: dataDep } = await supabase
        .from('depots_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      const listeDepots = dataDep || [];
      setDepots(listeDepots);

      const { data: dataEmp } = await supabase
        .from('emplacements_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setEmplacements(dataEmp || []);

      const { data: dataMvts } = await supabase.from('mouvements_stock').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel);
      setMouvements(dataMvts || []);

      const { data: dataApp } = await supabase.from('approvisionnements').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel);
      setApprovisionnements(dataApp || []);

      const { data: dataVentes } = await supabase.from('ventes_historiques').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel);
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
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const liste = data || [];
      setArticles(liste);
      
      if (liste.length > 0) {
        if (!articleSelectionneStatId || !liste.some(a => String(a.id_article || a.id) === String(articleSelectionneStatId))) {
          setArticleSelectionneStatId(String(liste[0].id_article || liste[0].id));
        }
      } else {
        setArticleSelectionneStatId('');
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
  }, [entrepriseId, moduleActuel]);

  const isGestionPerissablesActive = () => {
    if (!entrepriseInfo) return false;
    if (entrepriseInfo.gestion_perissables === true) return true;
    if (entrepriseInfo.options_config && entrepriseInfo.options_config.gestion_perissables === true) return true;
    return false;
  };

  const correspondAuDepot = (valeurDepotFlux, depotCibleId) => {
    if (!valeurDepotFlux || !depotCibleId) return false;
    if (String(valeurDepotFlux) === String(depotCibleId)) return true;
    const depotObj = depots.find((d) => String(d.id) === String(depotCibleId));
    if (depotObj && depotObj.nom_depot && String(valeurDepotFlux).trim().toUpperCase() === String(depotObj.nom_depot).trim().toUpperCase()) return true;
    return false;
  };

  const obtenirTousLesFluxArticle = (articleId, depotCibleId = 'TOUS') => {
    let flux = [];
    
    mouvements.filter((m) => String(m.id_article) === String(articleId)).forEach((m) => {
      if (depotCibleId === 'TOUS' || correspondAuDepot(m.id_depot_source, depotCibleId) || correspondAuDepot(m.id_depot_destination, depotCibleId)) {
        flux.push({ 
          date: m.created_at || '', 
          depot_source: m.id_depot_source, 
          depot_destination: m.id_depot_destination,
          emplacement_source: m.id_emplacement_source,
          emplacement_destination: m.id_emplacement_destination,
          quantite: parseInt(m.quantite || 0), 
          type: (m.type_mouvement || '').toUpperCase(),
          remarque: m.motif_remarque || '',
          referenceObjet: null
        });
      }
    });

    approvisionnements.forEach((app) => {
      if (depotCibleId === 'TOUS' || correspondAuDepot(app.id_depot_destination, depotCibleId)) {
        let articlesAppro = [];
        if (app.details_articles) {
          if (typeof app.details_articles === 'string') { try { articlesAppro = JSON.parse(app.details_articles); } catch (e) {} }
          else if (Array.isArray(app.details_articles)) { articlesAppro = app.details_articles; }
        }
        articlesAppro.forEach((ligne) => {
          if (String(ligne.id_article || ligne.article_id) === String(articleId)) {
            flux.push({ 
              date: app.created_at || '', 
              depot_source: app.id_depot_destination, 
              depot_destination: null, 
              quantite: parseInt(ligne.quantite || 0), 
              type: 'APPROVISIONNEMENT',
              remarque: app.reference || `APP-${app.id || '01'}`,
              referenceObjet: app 
            });
          }
        });
      }
    });

    flux.sort((a, b) => new Date(a.date) - new Date(b.date));
    return flux;
  };

  const calculerStockPourUnDepot = (articleId, depotId) => {
    let stockDepot = 0;
    const fluxArticle = obtenirTousLesFluxArticle(articleId, depotId);
    
    fluxArticle.forEach((m) => {
      const matchDepotSource = correspondAuDepot(m.depot_source, depotId);
      const matchDepotDest = correspondAuDepot(m.depot_destination, depotId);
      const qte = m.quantite; 
      const typeMvt = m.type;

      if (typeMvt === 'INVENTAIRE' && matchDepotSource) { 
        stockDepot = qte; 
        return; 
      }
      if (typeMvt === 'TRANSFERT') { 
        return; 
      }
      if (typeMvt === 'ENTREE' || typeMvt.includes('ACHAT') || typeMvt.includes('APPROVISIONNEMENT') || typeMvt.includes('FACTURE')) {
        if (matchDepotSource || matchDepotDest) stockDepot += qte;
      } else if (typeMvt === 'SORTIE' || typeMvt === 'AVARIES') {
        if (matchDepotSource) stockDepot -= qte;
      } else {
        if (matchDepotSource || matchDepotDest) stockDepot += qte;
      }
    });

    return Math.max(0, stockDepot);
  };

  const calculerStockPourEmplacement = (articleId, emplacementId) => {
    let stockEmp = 0;
    const fluxArticle = obtenirTousLesFluxArticle(articleId);
    
    fluxArticle.forEach((m) => {
      const qte = m.quantite;
      const typeMvt = m.type;
      const matchSource = String(m.emplacement_source) === String(emplacementId);
      const matchDest = String(m.emplacement_destination) === String(emplacementId);

      if (typeMvt === 'INVENTAIRE' && matchSource) {
        stockEmp = qte;
        return;
      }
      if (typeMvt === 'TRANSFERT') {
        if (matchDest) stockEmp += qte;
        if (matchSource) stockEmp -= qte;
        return;
      }
      if (matchDest) stockEmp += qte;
      if (matchSource) stockEmp -= qte;
    });

    return Math.max(0, stockEmp);
  };

  const aEteMouvementeParDepot = (articleId, depotId) => {
    if (!depotId || depotId === 'TOUS') return true;
    const fluxArticle = obtenirTousLesFluxArticle(articleId);
    return fluxArticle.some(m => correspondAuDepot(m.depot_source, depotId) || correspondAuDepot(m.depot_destination, depotId));
  };

  const calculerStockParFiltre = (articleId) => {
    if (emplacementFiltre !== 'TOUS') {
      return calculerStockPourEmplacement(articleId, emplacementFiltre);
    } else if (depotFiltre !== 'TOUS') {
      return calculerStockPourUnDepot(articleId, depotFiltre);
    } else {
      let totalGlobal = 0;
      depots.forEach(dep => {
        totalGlobal += calculerStockPourUnDepot(articleId, dep.id);
      });
      if (depots.length === 0) {
        const artObj = articles.find(a => String(a.id_article || a.id) === String(articleId));
        totalGlobal = parseInt(artObj?.Quantite_Stock || 0);
      }
      return totalGlobal;
    }
  };

  const gererUploadImage = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;

      setUploadingPhoto(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `articles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('articles-photos')
        .upload(filePath, file);

      if (uploadError) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setNouveauArticle(prev => ({ ...prev, Photo: reader.result }));
          setUploadingPhoto(false);
        };
        reader.readAsDataURL(file);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('articles-photos')
        .getPublicUrl(filePath);

      setNouveauArticle(prev => ({ ...prev, Photo: urlData.publicUrl }));
    } catch (err) {
      alert('Erreur chargement photo : ' + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const enregistrerArticle = async (e) => {
    e.preventDefault();
    try {
      const payloadArticle = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        Designation: (nouveauArticle.Designation || '').trim().toUpperCase(),
        Code_Barre: (nouveauArticle.Code_Barre || '').trim().toUpperCase(),
        Famille: nouveauArticle.Famille,
        Prix_Achat: parseFloat(nouveauArticle.Prix_Achat) || 0,
        Prix_Vente: parseFloat(nouveauArticle.Prix_Vente) || 0,
        Seuil_Alerte: parseInt(nouveauArticle.Seuil_Alerte) || 5,
        Photo: nouveauArticle.Photo,
        Disponible_Menu_QR: nouveauArticle.Disponible_Menu_QR,
        date_peremption: isGestionPerissablesActive() && nouveauArticle.date_peremption ? nouveauArticle.date_peremption : null
      };

      if (articleEnEdition) {
        const targetId = articleEnEdition.id_article || articleEnEdition.id;
        const { error } = await supabase
          .from('articles_stock')
          .update(payloadArticle)
          .eq(articleEnEdition.id_article ? 'id_article' : 'id', targetId)
          .eq('id_entreprise', entrepriseId);

        if (error) throw error;
        alert(`Article mis à jour avec succès dans le module ${moduleActuel} !`);
      } else {
        payloadArticle.Quantite_Stock = 0;
        const { error } = await supabase.from('articles_stock').insert([payloadArticle]);
        if (error) throw error;
        alert(`Article créé avec succès dans le module ${moduleActuel} !`);
      }

      annulerForm();
      chargerArticles();
      chargerDonneesReference();
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
      Photo: article.Photo || article.photo || '',
      Disponible_Menu_QR: article.Disponible_Menu_QR ?? true,
      date_peremption: article.date_peremption || '',
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
      Photo: '',
      Disponible_Menu_QR: true,
      date_peremption: '',
    });
    setAfficherForm(false);
  };

  const supprimerArticleDepuisFormulaire = async () => {
    if (!articleEnEdition) return;
    const artId = articleEnEdition.id_article || articleEnEdition.id;
    const stockGlobalActuel = calculerStockParFiltre(artId);

    if (stockGlobalActuel > 0) {
      alert(`⛔ Impossible de supprimer ! L'article possède encore un stock de ${stockGlobalActuel} unité(s).`);
      return;
    }

    if (!confirm(`Supprimer définitivement cet article ?`)) return;

    try {
      const { error } = await supabase
        .from('articles_stock')
        .delete()
        .eq(articleEnEdition.id_article ? 'id_article' : 'id', artId)
        .eq('id_entreprise', entrepriseId);

      if (error) throw error;
      alert('Article supprimé.');
      annulerForm();
      chargerArticles();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const articlesFiltres = articles.filter((art) => {
    const artId = art.id_article || art.id;
    const matchFamille = familleFiltre === 'TOUTES' || String(art.Famille || art.famille) === String(familleFiltre);
    if (!matchFamille) return false;

    if (emplacementFiltre !== 'TOUS') {
      const stockEmp = calculerStockPourEmplacement(artId, emplacementFiltre);
      if (stockEmp <= 0) return false;
    } else if (depotFiltre !== 'TOUS') {
      const stockDep = calculerStockPourUnDepot(artId, depotFiltre);
      const dejaMvt = aEteMouvementeParDepot(artId, depotFiltre);
      if (stockDep <= 0 && !dejaMvt) return false;
    }

    return true;
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
      valB = parseFloat(b.Prix_Achat || b.prix_vente || 0);
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
    : emplacements.filter(emp => correspondAuDepot(emp.id_depot, depotFiltre));

  const articlesModalFiltres = articles.filter(art => {
    const nom = (art.Designation || art.designation || '').toLowerCase();
    return nom.includes(rechercheModalArticle.toLowerCase());
  });

  const articleStatObjet = articles.find(a => String(a.id_article || a.id) === String(articleSelectionneStatId));

  const colSpanTotal = 2 + emplacements.length + (moduleActuel !== 'LIVRAISON' ? 2 : 1);

  return (
    <div className="space-y-2.5 font-sans text-xs">
      
      <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="font-extrabold text-slate-900 uppercase text-xs flex items-center gap-1.5 flex-wrap">
          <span>📦</span> GESTION DES ARTICLES [{moduleActuel}]
          {isGestionPerissablesActive() && <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">Mode Périssables Actif</span>}
        </h3>
        <button
          type="button"
          onClick={() => {
            if (afficherForm) {
              annulerForm();
            } else {
              setModeVue('catalogue');
              annulerForm();
              setAfficherForm(true);
            }
          }}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-2xs text-xs shrink-0"
        >
          {afficherForm ? '✖' : 'Nouveau'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 w-full">
        <button
          type="button"
          onClick={() => {
            setModeVue('catalogue');
            annulerForm();
          }}
          className={`w-full px-3 py-2 rounded-lg font-black text-[11px] transition text-center border shadow-2xs ${
            modeVue === 'catalogue' && !afficherForm 
              ? 'bg-orange-600 text-white border-orange-600 shadow-xs' 
              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
          }`}
        >
          📄 Stock Article ({articles.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setModeVue('statistiques');
            annulerForm();
          }}
          className={`w-full px-3 py-2 rounded-lg font-black text-[11px] transition text-center border shadow-2xs ${
            modeVue === 'statistiques' 
              ? 'bg-orange-600 text-white border-orange-600 shadow-xs' 
              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
          }`}
        >
          📊 Stat Article
        </button>
      </div>

      {modeVue === 'catalogue' && (
        <>
          {afficherForm ? (
            <form onSubmit={enregistrerArticle} className="bg-white border-2 border-orange-500/50 p-3 rounded-xl shadow-md space-y-2.5">
              
              <div className="pb-1 border-b border-slate-100">
                <div className="flex justify-between items-center mb-1">
                  <label className="block font-black text-[10px] text-slate-700 uppercase">Famille *</label>
                  <button type="button" onClick={annulerForm} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1">✖</button>
                </div>
                <select
                  required
                  value={nouveauArticle.Famille}
                  onChange={(e) => setNouveauArticle({ ...nouveauArticle, Famille: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-black text-orange-700 shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                >
                  <option value="">-- Sélectionner Famille --</option>
                  {familles.map((fam) => (
                    <option key={fam.id} value={fam.id}>
                      🏷️ {fam.nom_famille || fam.Nom_Famille}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-black text-[10px] text-slate-700 uppercase mb-0.5">Désignation *</label>
                <input
                  type="text"
                  required
                  value={nouveauArticle.Designation}
                  onChange={(e) => setNouveauArticle({ ...nouveauArticle, Designation: e.target.value.toUpperCase() })}
                  placeholder="Ex: JUS DE PAPAYE 250ML"
                  style={{ textTransform: 'uppercase' }}
                  className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-black text-slate-900 shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none uppercase"
                />
              </div>

              <div className="grid grid-cols-3 gap-1.5 items-end">
                {moduleActuel !== 'LIVRAISON' && (
                  <div>
                    <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">P.A</label>
                    <input
                      type="number"
                      value={nouveauArticle.Prix_Achat}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNouveauArticle({ ...nouveauArticle, Prix_Achat: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-black text-slate-900 shadow-xs"
                    />
                  </div>
                )}

                <div className={moduleActuel === 'LIVRAISON' ? 'col-span-1.5' : ''}>
                  <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">P.V *</label>
                  <input
                    type="number"
                    required
                    value={nouveauArticle.Prix_Vente}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Prix_Vente: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-black text-emerald-700 shadow-xs"
                  />
                </div>

                <div>
                  <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">S.Alerte</label>
                  <input
                    type="number"
                    value={nouveauArticle.Seuil_Alerte}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Seuil_Alerte: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-black text-slate-900 shadow-xs"
                  />
                </div>
              </div>

              <div className={`grid ${isGestionPerissablesActive() ? 'grid-cols-2' : 'grid-cols-1'} gap-1.5 items-end`}>
                <div>
                  <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Code-Barres</label>
                  <input
                    type="text"
                    value={nouveauArticle.Code_Barre}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Code_Barre: e.target.value.toUpperCase() })}
                    placeholder="600123"
                    style={{ textTransform: 'uppercase' }}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-slate-900 font-mono shadow-xs uppercase"
                  />
                </div>

                {isGestionPerissablesActive() && (
                  <div>
                    <label className="block font-black text-[9px] text-slate-700 uppercase mb-0.5">Date Péremption</label>
                    <input
                      type="date"
                      value={nouveauArticle.date_peremption}
                      onChange={(e) => setNouveauArticle({ ...nouveauArticle, date_peremption: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-mono font-bold text-slate-900 shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-1">
                <label className="block font-black text-[10px] text-slate-700 uppercase">Photo de l'article</label>
                
                {nouveauArticle.Photo ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between gap-3">
                    <div className="shrink-0">
                      <img
                        src={nouveauArticle.Photo}
                        alt="Photo de l'article"
                        className="w-20 h-20 object-cover rounded-xl border-2 border-orange-500 shadow-xs"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <label className="bg-white hover:bg-orange-50 text-orange-600 border border-orange-300 px-3.5 py-1.5 rounded-lg font-black text-xs cursor-pointer flex items-center justify-center gap-1 transition shadow-xs">
                        <span>📷 {uploadingPhoto ? 'Envoi...' : 'Modifier'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={gererUploadImage}
                          className="hidden"
                          disabled={uploadingPhoto}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => setNouveauArticle({ ...nouveauArticle, Photo: '' })}
                        className="text-red-600 hover:text-red-800 font-extrabold text-[10px] text-center underline"
                      >
                        Retirer la photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-1.5 items-center flex-wrap">
                    <input
                      type="text"
                      value={nouveauArticle.Photo}
                      onChange={(e) => setNouveauArticle({ ...nouveauArticle, Photo: e.target.value })}
                      placeholder="https://lien-image.com/photo.jpg"
                      className="flex-1 min-w-[150px] bg-white border border-slate-300 rounded-lg p-1.5 text-xs font-bold text-slate-900 shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none truncate"
                    />

                    <label 
                      className="bg-slate-100 hover:bg-orange-100 text-slate-800 border border-slate-300 px-3 py-1.5 rounded-lg font-black text-xs cursor-pointer flex items-center justify-center transition shrink-0 shadow-xs"
                      title="Prendre ou joindre une photo"
                    >
                      <span>📷 Joindre / Filmer</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={gererUploadImage}
                        className="hidden"
                        disabled={uploadingPhoto}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="pt-1.5 border-t border-slate-100">
                <div className="bg-orange-50/70 border border-orange-200/80 rounded-xl p-2 flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="qrCheck"
                    checked={nouveauArticle.Disponible_Menu_QR}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Disponible_Menu_QR: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500 cursor-pointer"
                  />
                  <label htmlFor="qrCheck" className="text-[11px] font-black text-slate-900 cursor-pointer select-none leading-tight">
                    📱 Visible au Scan Code QR par les clients
                  </label>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-slate-200">
                {articleEnEdition ? (
                  <button 
                    type="button" 
                    onClick={supprimerArticleDepuisFormulaire} 
                    className="bg-red-600 hover:bg-red-700 text-white font-black px-3 py-1.5 rounded-lg text-xs shadow-xs"
                  >
                    🗑️ Supprimer
                  </button>
                ) : <div />}

                <div className="flex gap-1.5">
                  <button type="button" onClick={annulerForm} className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-black px-3 py-1.5 rounded-lg text-xs">Annuler</button>
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-1.5 rounded-lg shadow-xs text-xs">
                    {articleEnEdition ? 'Mettre à jour' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                <div>
                  <label className="block font-black text-[9px] uppercase text-slate-700 mb-0.5">Famille</label>
                  <select
                    value={familleFiltre}
                    onChange={(e) => setFamilleFiltre(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-extrabold text-slate-900 text-xs shadow-xs"
                  >
                    <option value="TOUTES">Toutes</option>
                    {familles.map((fam) => (
                      <option key={fam.id} value={fam.id}>
                        {fam.nom_famille || fam.Nom_Famille}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block font-black text-[9px] uppercase text-slate-700 mb-0.5">Dépôt / Partenaire</label>
                    <select
                      value={depotFiltre}
                      onChange={(e) => { setDepotFiltre(e.target.value); setEmplacementFiltre('TOUS'); }}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-extrabold text-slate-900 text-xs shadow-xs"
                    >
                      <option value="TOUS">Tous les dépôts</option>
                      {depots.map((dep) => (
                        <option key={dep.id} value={dep.id}>
                          🏢 {dep.nom_depot || dep.Nom_Depot}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-black text-[9px] uppercase text-slate-700 mb-0.5">Emplacement / Livreur</label>
                    <select
                      value={emplacementFiltre}
                      onChange={(e) => setEmplacementFiltre(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-extrabold text-slate-900 text-xs shadow-xs"
                    >
                      <option value="TOUS">Tous les emplacements</option>
                      {emplacementsDisponibles.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          📍 {emp.nom_emplacement} {emp.responsable_emplacement ? `(${emp.responsable_emplacement})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 uppercase text-[9px] font-black tracking-wider">
                      <th 
                        onClick={() => gererTri('Designation')} 
                        className="p-2.5 cursor-pointer hover:bg-slate-200 select-none whitespace-nowrap"
                      >
                        Désignation {colonneTri === 'Designation' && (ordreTri === 'asc' ? '▲' : '▼')}
                      </th>
                      <th 
                        onClick={() => gererTri('Stock')} 
                        className="p-2.5 text-center cursor-pointer hover:bg-slate-200 select-none whitespace-nowrap"
                      >
                        STOCK {colonneTri === 'Stock' && (ordreTri === 'asc' ? '▲' : '▼')}
                      </th>

                      {emplacements.map((emp) => (
                        <th key={emp.id} className="p-2.5 text-center text-blue-700 whitespace-nowrap">
                          📍 {emp.nom_emplacement || emp.code_emplacement}
                        </th>
                      ))}

                      {moduleActuel !== 'LIVRAISON' && (
                        <th 
                          onClick={() => gererTri('Prix_Achat')} 
                          className="p-2.5 text-right cursor-pointer hover:bg-slate-200 select-none whitespace-nowrap"
                        >
                          P.A {colonneTri === 'Prix_Achat' && (ordreTri === 'asc' ? '▲' : '▼')}
                        </th>
                      )}

                      <th 
                        onClick={() => gererTri('Prix_Vente')} 
                        className="p-2.5 text-right cursor-pointer hover:bg-slate-200 select-none whitespace-nowrap"
                      >
                        P.V {colonneTri === 'Prix_Vente' && (ordreTri === 'asc' ? '▲' : '▼')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {chargement ? (
                      <tr>
                        <td colSpan={colSpanTotal} className="p-4 text-center text-slate-500 font-bold">Chargement...</td>
                      </tr>
                    ) : articlesAffiches.length === 0 ? (
                      <tr>
                        <td colSpan={colSpanTotal} className="p-4 text-center text-slate-500 font-bold">Aucun article enregistré pour le module {moduleActuel}.</td>
                      </tr>
                    ) : (
                      articlesAffiches.map((art) => {
                        const artId = art.id_article || art.id;
                        const stockVal = calculerStockParFiltre(artId);
                        const estEpuise = stockVal <= 0;

                        return (
                          <tr 
                            key={artId} 
                            onClick={() => ouvrirEdition(art)}
                            className={`hover:bg-orange-50/70 cursor-pointer transition select-none ${estEpuise ? 'bg-slate-50/60 opacity-80' : ''}`}
                          >
                            <td className={`p-2.5 font-black text-[10px] whitespace-nowrap uppercase ${estEpuise ? 'text-slate-500 line-through' : 'text-slate-900'}`}>
                              {art.Designation || art.designation}
                            </td>
                            <td className="p-2.5 text-center whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-black ${stockVal > 0 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}>
                                {stockVal} {estEpuise && '(Épuisé)'}
                              </span>
                            </td>

                            {emplacements.map((emp) => {
                              const stockEmp = calculerStockPourEmplacement(artId, emp.id);
                              return (
                                <td key={emp.id} className="p-2.5 text-center whitespace-nowrap">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black ${stockEmp > 0 ? 'bg-blue-100 text-blue-800 border border-blue-200' : 'text-slate-400 font-bold'}`}>
                                    {stockEmp}
                                  </span>
                                </td>
                              );
                            })}

                            {moduleActuel !== 'LIVRAISON' && (
                              <td className="p-2.5 text-right font-extrabold text-slate-800 text-[10px] whitespace-nowrap">
                                {art.Prix_Achat || art.prix_achat || 0}
                              </td>
                            )}
                            <td className="p-2.5 text-right font-black text-emerald-700 text-[10px] whitespace-nowrap">
                              {art.Prix_Vente || art.prix_vente || 0}
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
        </>
      )}

      {modeVue === 'statistiques' && (
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-3">
          
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              <label className="block font-black uppercase text-[9px] text-slate-700 mb-0.5">DÉPÔT / PARTENAIRE</label>
              <select
                value={depotStatFiltre}
                onChange={(e) => setDepotStatFiltre(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-black text-slate-900 shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                <option value="TOUS">Tous les dépôts / partenaires</option>
                {depots.map((dep) => (
                  <option key={dep.id} value={dep.id}>
                    🏢 {dep.nom_depot || dep.Nom_Depot}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-black uppercase text-[9px] text-slate-700 mb-0.5">ARTICLE</label>
              <div
                onClick={() => {
                  setRechercheModalArticle('');
                  setAfficherModalSelectionArticle(true);
                }}
                className="w-full bg-white border border-slate-300 rounded-lg p-2 text-xs font-black text-slate-900 shadow-xs cursor-pointer flex justify-between items-center"
              >
                <span className="truncate uppercase">
                  {articleStatObjet ? (articleStatObjet.Designation || articleStatObjet.designation) : '-- Sélectionner un article --'}
                </span>
                <span className="text-[10px] text-slate-400">🔍</span>
              </div>
            </div>
          </div>

          {articleStatObjet ? (() => {
            const artId = String(articleStatObjet.id_article || articleStatObjet.id);
            const fluxArt = obtenirTousLesFluxArticle(artId, depotStatFiltre);

            let stockCourant = 0;
            const fluxAvecStockProgressif = fluxArt.map((f) => {
              const estSortie = f.type.includes('SORTIE') || f.type.includes('AVARIES');
              const estTransfertInterne = f.type === 'TRANSFERT';
              
              let qteDelta = 0;
              if (f.type === 'INVENTAIRE') {
                stockCourant = f.quantite;
                qteDelta = f.quantite;
              } else if (estTransfertInterne) {
                qteDelta = 0;
                stockCourant += 0;
              } else if (estSortie) {
                qteDelta = -f.quantite;
                stockCourant += qteDelta;
              } else {
                qteDelta = f.quantite;
                stockCourant += qteDelta;
              }

              return {
                ...f,
                qteDelta,
                stockProgressif: Math.max(0, stockCourant)
              };
            });

            return (
              <div className="space-y-3">
                <div className="space-y-1">
                  <h4 className="font-black text-slate-800 uppercase text-[10px]">📈 Historique chronologique et dynamique :</h4>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 uppercase text-[9px] font-black">
                          <th className="p-2.5 w-[22%]">Date</th>
                          <th className="p-2.5 w-[36%]">Mouvement</th>
                          <th className="p-2.5 w-[22%] text-right">QTÉ</th>
                          <th className="p-2.5 w-[20%] text-right">STOCK</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[10.5px]">
                        {fluxAvecStockProgressif.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="p-4 text-center text-slate-500 font-bold">Aucun mouvement enregistré pour cet article.</td>
                          </tr>
                        ) : (
                          fluxAvecStockProgressif.map((f, i) => {
                            const estNegatif = f.qteDelta < 0;
                            const estTransfert = f.type === 'TRANSFERT';
                            const libelleAffichage = estTransfert ? `${f.remarque || 'TR'} (inter-emplacement)` : (f.remarque || f.type);

                            return (
                              <tr key={i} className="hover:bg-slate-50 transition">
                                <td className="p-2.5 font-mono text-slate-600 font-bold whitespace-nowrap">
                                  {f.date ? new Date(f.date).toLocaleDateString('fr-FR') : '-'}
                                </td>
                                <td className="p-2.5 font-bold text-slate-900">
                                  <span className="bg-orange-100 text-orange-900 px-2 py-0.5 rounded font-black text-[9.5px] border border-orange-200 inline-block">
                                    {libelleAffichage}
                                  </span>
                                </td>
                                <td className={`p-2.5 text-right font-black font-mono whitespace-nowrap ${estNegatif ? 'text-red-600' : (f.qteDelta > 0 ? 'text-emerald-700' : 'text-slate-500')}`}>
                                  {estNegatif ? f.qteDelta : (f.qteDelta > 0 ? `+${f.qteDelta}` : '0')}
                                </td>
                                <td className="p-2.5 text-right font-black font-mono text-slate-900 whitespace-nowrap">
                                  {f.stockProgressif}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="p-6 text-center text-slate-500 font-bold">Veuillez sélectionner un article.</div>
          )}

        </div>
      )}

      {afficherModalSelectionArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-3 bg-slate-900 text-white flex justify-between items-center">
              <span className="font-black text-xs uppercase">SÉLECTIONNER UN ARTICLE [{moduleActuel}]</span>
              <button
                onClick={() => setAfficherModalSelectionArticle(false)}
                className="text-slate-300 hover:text-white font-black text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3 space-y-2 overflow-y-auto bg-slate-50">
              <input
                type="text"
                autoFocus
                value={rechercheModalArticle}
                onChange={(e) => setRechercheModalArticle(e.target.value.toUpperCase())}
                placeholder="Rechercher..."
                style={{ textTransform: 'uppercase' }}
                className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs font-black text-slate-900 shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none uppercase"
              />

              <div className="space-y-1.5 pt-1">
                {articlesModalFiltres.length === 0 ? (
                  <p className="text-center text-slate-400 py-8 text-xs font-bold">Aucun article trouvé pour le module {moduleActuel}.</p>
                ) : (
                  articlesModalFiltres.map((art) => {
                    const idA = String(art.id_article || art.id);
                    const nomArt = art.Designation || art.designation || '';
                    const stockArt = depotStatFiltre === 'TOUS' ? calculerStockParFiltre(idA) : calculerStockPourUnDepot(idA, depotStatFiltre);

                    return (
                      <div
                        key={idA}
                        onClick={() => {
                          setArticleSelectionneStatId(idA);
                          setAfficherModalSelectionArticle(false);
                        }}
                        className="bg-white hover:bg-orange-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center cursor-pointer transition shadow-2xs"
                      >
                        <span className="font-black text-slate-900 text-xs truncate mr-2 uppercase">{nomArt}</span>
                        <span className="font-bold text-emerald-700 font-mono text-xs shrink-0">Stock : {stockArt}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}