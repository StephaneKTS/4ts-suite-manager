'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtdqodqhkdxanrelxtrq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; 
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GestionApprovisionnements({ entrepriseId = '4TS-TEST' }) {
  const [approvisionnements, setApprovisionnements] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [depots, setDepots] = useState([]);
  const [articles, setArticles] = useState([]);
  const [chargement, setChargement] = useState(false);

  const [ongletActif, setOngletActif] = useState('FACTURE'); // 'FACTURE' | 'COMMANDE'
  const [vueActive, setVueActive] = useState('liste'); // 'liste' | 'choix_creation' | 'formulaire_facture' | 'formulaire_commande'
  const [approEnEditionId, setApproEnEditionId] = useState(null);

  // En-tête Document Fournisseur
  const [numeroDoc, setNumeroDoc] = useState('');
  const [dateDoc, setDateDoc] = useState(new Date().toISOString().split('T')[0]);
  const [idFournisseur, setIdFournisseur] = useState('');
  const [idDepotDestination, setIdDepotDestination] = useState('');
  const [delaiLivraison, setDelaiLivraison] = useState('7 jours');
  const [statutPaiement, setStatutPaiement] = useState('SOLDE');
  const [montantPaye, setMontantPaye] = useState(0);
  const utilisateurActif = 'THÉODORE STÉPHANE';

  // Modal de sélection d'article
  const [modalArticleOuverte, setModalArticleOuverte] = useState(false);
  const [rechercheArticle, setRechercheArticle] = useState('');
  const [articleCourant, setArticleCourant] = useState({ id_article: '', designation: '', quantite: '1', prix_achat: '' });
  const [indexEnCoursModif, setIndexEnCoursModif] = useState(null);

  // Lignes validées / Panier
  const [lignesValidees, setLignesValidees] = useState([]);

  // Modale de partage
  const [modalPartageOuverte, setModalPartageOuverte] = useState(false);
  const [formatPartage, setFormatPartage] = useState('PDF');

  const genererNumeroDoc = (type, listeDocs) => {
    const seq = String((listeDocs || []).length + 1).padStart(6, '0');
    return type === 'FACTURE' ? `APP-${seq}` : `BC-${seq}`;
  };

  const chargerDonnees = async () => {
    setChargement(true);
    try {
      // 1. Dépôts
      const { data: dataDepots } = await supabase.from('depots_stock').select('*');
      const listDepots = dataDepots || [];
      setDepots(listDepots);
      if (listDepots.length > 0 && !idDepotDestination) {
        setIdDepotDestination(listDepots[0].id);
      }

      // 2. Fournisseurs
      const { data: dataFourn } = await supabase.from('fournisseurs').select('*');
      setFournisseurs(dataFourn || []);

      // 3. Articles
      const { data: dataArticles } = await supabase.from('articles_stock').select('*');
      setArticles(dataArticles || []);

      // 4. Mouvements de stock
      const { data: dataMouvements } = await supabase
        .from('mouvements_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId);
      setMouvements(dataMouvements || []);

      // 5. Approvisionnements
      const { data: dataAppro } = await supabase
        .from('approvisionnements')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .order('created_at', { ascending: false });

      const listAppro = dataAppro || [];
      setApprovisionnements(listAppro);

      if (!approEnEditionId && !numeroDoc) {
        setNumeroDoc(genererNumeroDoc('FACTURE', listAppro));
      }
    } catch (err) {
      console.error('Erreur chargement approvisionnements :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, [entrepriseId]);

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
    const depotCibleId = idDepotDestination;
    if (!depotCibleId) {
      const artObj = articles.find(a => String(a.id_article) === String(articleId));
      return parseInt(artObj?.Quantite_Stock || artObj?.quantite_stock || 0);
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

  const articlesFiltresModal = articles
    .filter(art => (art.Designation || '').toLowerCase().includes((rechercheArticle || '').toLowerCase()))
    .map(art => ({
      ...art,
      stockDepot: calculerStockPourDepotActuel(art.id_article),
      prixAchatDefaut: art.Prix_Achat || art.prix_achat || ''
    }));

  const montantTotalGlobal = lignesValidees.reduce((sum, item) => sum + (Number(item.quantite || 0) * Number(item.prix_achat || 0)), 0);
  const soldeRestant = statutPaiement === 'SOLDE' ? 0 : statutPaiement === 'CREDIT' ? montantTotalGlobal : Math.max(0, montantTotalGlobal - (parseFloat(montantPaye) || 0));

  const preparerNouveauDoc = (type) => {
    setNumeroDoc(genererNumeroDoc(type, approvisionnements));
    setDateDoc(new Date().toISOString().split('T')[0]);
    setIdFournisseur('');
    setLignesValidees([]);
    setApproEnEditionId(null);
    setStatutPaiement('SOLDE');
    setMontantPaye(0);
    setVueActive(type === 'FACTURE' ? 'formulaire_facture' : 'formulaire_commande');
  };

  const ajouterArticleCourant = () => {
    if (!articleCourant.id_article) {
      alert('Veuillez sélectionner un article.');
      return;
    }
    const qte = parseInt(articleCourant.quantite);
    const pxAchat = parseFloat(articleCourant.prix_achat);

    if (isNaN(qte) || qte <= 0) {
      alert('Veuillez entrer une quantité valide (> 0).');
      return;
    }
    if (isNaN(pxAchat) || pxAchat < 0) {
      alert('Veuillez entrer un prix d’achat valide.');
      return;
    }

    if (indexEnCoursModif !== null) {
      const maj = [...lignesValidees];
      maj[indexEnCoursModif] = { ...articleCourant };
      setLignesValidees(maj);
      setIndexEnCoursModif(null);
    } else {
      setLignesValidees([...lignesValidees, { ...articleCourant }]);
    }

    // Réinitialiser la zone de saisie pour la prochaine entrée
    setArticleCourant({ id_article: '', designation: '', quantite: '1', prix_achat: '' });
  };

  // Gestion intelligente de la touche Entrée lors de la saisie
  const gererKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // Si nous sommes dans un des champs de saisie d'article, valider la ligne
      if (articleCourant.id_article) {
        ajouterArticleCourant();
      }
    }
  };

  const enregistrerFacture = async (e) => {
    e.preventDefault();
    if (lignesValidees.length === 0) {
      alert('Veuillez ajouter au moins un article à la facture.');
      return;
    }
    if (!idFournisseur || !idDepotDestination) {
      alert('Veuillez remplir tous les champs obligatoires de l’en-tête.');
      return;
    }

    try {
      const payload = {
        id_entreprise: entrepriseId,
        numero_bon: numeroDoc,
        id_fournisseur: idFournisseur,
        id_depot_destination: idDepotDestination,
        montant_total: montantTotalGlobal,
        montant_paye: statutPaiement === 'SOLDE' ? montantTotalGlobal : statutPaiement === 'CREDIT' ? 0 : parseFloat(montantPaye) || 0,
        statut_paiement: statutPaiement,
        details_articles: lignesValidees.map(l => ({
          id_article: l.id_article,
          designation: l.designation,
          quantite: Number(l.quantite),
          prix_achat: Number(l.prix_achat),
          sous_total: Number(l.quantite) * Number(l.prix_achat),
        })),
      };

      if (approEnEditionId) {
        await supabase.from('approvisionnements').update(payload).eq('id', approEnEditionId);
      } else {
        await supabase.from('approvisionnements').insert([payload]);
      }

      alert(`Facture ${numeroDoc} enregistrée avec succès !`);
      setVueActive('liste');
      chargerDonnees();
    } catch (err) {
      alert('Erreur lors de l’enregistrement : ' + err.message);
    }
  };

  const enregistrerCommande = async (e) => {
    e.preventDefault();
    if (lignesValidees.length === 0) {
      alert('Veuillez ajouter au moins un article à la commande.');
      return;
    }
    if (!idFournisseur || !idDepotDestination) {
      alert('Veuillez remplir tous les champs obligatoires.');
      return;
    }

    try {
      const payload = {
        id_entreprise: entrepriseId,
        numero_commande: numeroDoc,
        id_fournisseur: idFournisseur,
        id_depot_destination: idDepotDestination,
        delai_livraison: delaiLivraison,
        montant_total: montantTotalGlobal,
        statut_commande: 'EN_ATTENTE',
        details_articles: lignesValidees.map(l => ({
          id_article: l.id_article,
          designation: l.designation,
          quantite: Number(l.quantite),
          prix_achat: Number(l.prix_achat),
          sous_total: Number(l.quantite) * Number(l.prix_achat),
        })),
      };

      if (approEnEditionId) {
        await supabase.from('commandes_fournisseurs').update(payload).eq('id', approEnEditionId);
      } else {
        await supabase.from('approvisionnements').insert([{ ...payload, numero_bon: numeroDoc }]);
      }

      alert(`Bon de commande ${numeroDoc} enregistré avec succès !`);
      setVueActive('liste');
      chargerDonnees();
    } catch (err) {
      alert('Erreur lors de l’enregistrement : ' + err.message);
    }
  };

  const ouvrirDocModification = (doc, type) => {
    setApproEnEditionId(doc.id);
    setNumeroDoc(doc.numero_bon || doc.numero_commande);
    setDateDoc(doc.created_at ? doc.created_at.split('T')[0] : new Date().toISOString().split('T')[0]);
    setIdFournisseur(doc.id_fournisseur || '');
    setIdDepotDestination(doc.id_depot_destination || '');
    setStatutPaiement(doc.statut_paiement || 'SOLDE');
    setMontantPaye(doc.montant_paye || 0);

    let articlesDetails = [];
    if (doc.details_articles) {
      if (typeof doc.details_articles === 'string') {
        try { articlesDetails = JSON.parse(doc.details_articles); } catch (e) {}
      } else if (Array.isArray(doc.details_articles)) {
        articlesDetails = doc.details_articles;
      }
    }

    setLignesValidees(articlesDetails.map(l => ({
      id_article: l.id_article,
      designation: l.designation,
      quantite: String(l.quantite),
      prix_achat: String(l.prix_achat || l.prix_estime || '')
    })));

    setVueActive(type === 'FACTURE' ? 'formulaire_facture' : 'formulaire_commande');
  };

  const supprimerDoc = async (id, type) => {
    if (!confirm('Voulez-vous vraiment supprimer ce document ?')) return;
    try {
      const tableCible = type === 'FACTURE' ? 'approvisionnements' : 'commandes_fournisseurs';
      const { error } = await supabase.from(tableCible).delete().eq('id', id);
      if (error) throw error;
      alert('Document supprimé avec succès.');
      chargerDonnees();
    } catch (err) {
      alert('Erreur lors de la suppression : ' + err.message);
    }
  };

  const transformerCommandeEnFacture = (cmd) => {
    ouvrirDocModification(cmd, 'COMMANDE');
    setNumeroDoc(genererNumeroDoc('FACTURE', approvisionnements));
    setVueActive('formulaire_facture');
  };

  const executerPartageViaCanal = (canal) => {
    alert(`Partage via ${canal} au format ${formatPartage} initié avec succès !`);
    setModalPartageOuverte(false);
  };

  const documentsHistorique = approvisionnements.filter(a => !a.numero_commande);
  const commandesHistorique = approvisionnements.filter(a => a.numero_commande);

  return (
    <div className="space-y-4 text-xs">
      {/* Afficher les onglets d'en-tête UNIQUEMENT lorsque nous sommes sur la vue liste */}
      {vueActive === 'liste' && (
        <div className="flex justify-between items-center bg-slate-100 p-1.5 rounded-2xl gap-2">
          <div className="flex gap-2 flex-1">
            <button
              type="button"
              onClick={() => { setOngletActif('FACTURE'); setVueActive('liste'); }}
              className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold transition ${
                ongletActif === 'FACTURE' ? 'bg-emerald-600 text-white shadow' : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              📥 Factures Fournisseurs ({documentsHistorique.length})
            </button>
            <button
              type="button"
              onClick={() => { setOngletActif('COMMANDE'); setVueActive('liste'); }}
              className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold transition ${
                ongletActif === 'COMMANDE' ? 'bg-blue-600 text-white shadow' : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              📋 Bons de Commande ({commandesHistorique.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setVueActive('choix_creation')}
            className="bg-orange-600 hover:bg-orange-500 text-white font-extrabold px-5 py-2.5 rounded-xl shadow transition flex items-center gap-2"
          >
            <span>➕</span> Nouveau Document
          </button>
        </div>
      )}

      {/* VUE LISTE */}
      {vueActive === 'liste' && (
        <div className="space-y-3">
          {ongletActif === 'FACTURE' && (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3 font-mono">N° Facture</th>
                    <th className="p-3">Fournisseur</th>
                    <th className="p-3 text-right">Montant Total</th>
                    <th className="p-3 text-center">Statut</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {documentsHistorique.length === 0 ? (
                    <tr><td colSpan="6" className="p-8 text-center text-slate-400">Aucune facture fournisseur enregistrée.</td></tr>
                  ) : (
                    documentsHistorique.map((doc) => {
                      const f = fournisseurs.find(item => String(item.id) === String(doc.id_fournisseur));
                      return (
                        <tr key={doc.id} className="hover:bg-slate-50">
                          <td className="p-3 text-slate-500">{new Date(doc.created_at).toLocaleDateString('fr-FR')}</td>
                          <td className="p-3 font-mono font-bold text-orange-600">{doc.numero_bon}</td>
                          <td className="p-3 font-bold text-slate-800">{f ? f.nom_fournisseur || f.nom || f.raison_sociale : 'Fournisseur'}</td>
                          <td className="p-3 text-right font-black text-emerald-700">{Number(doc.montant_total || 0).toLocaleString('fr-FR')} F</td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${doc.statut_paiement === 'SOLDE' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'}`}>
                              {doc.statut_paiement}
                            </span>
                          </td>
                          <td className="p-3 text-center flex justify-center gap-2">
                            <button onClick={() => ouvrirDocModification(doc, 'FACTURE')} className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold px-3 py-1.5 rounded-xl transition shadow-xs">✏️ Modifier</button>
                            <button onClick={() => window.print()} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition shadow-xs">🖨️ Imprimer</button>
                            <button onClick={() => supprimerDoc(doc.id, 'FACTURE')} className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2 py-1.5 rounded-xl transition shadow-xs">🗑️</button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {ongletActif === 'COMMANDE' && (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3 font-mono">N° Commande</th>
                    <th className="p-3">Fournisseur</th>
                    <th className="p-3 text-right">Montant Estimé</th>
                    <th className="p-3 text-center">Statut</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {commandesHistorique.length === 0 ? (
                    <tr><td colSpan="6" className="p-8 text-center text-slate-400">Aucun bon de commande enregistré.</td></tr>
                  ) : (
                    commandesHistorique.map((cmd) => {
                      const f = fournisseurs.find(item => String(item.id) === String(cmd.id_fournisseur));
                      return (
                        <tr key={cmd.id} className="hover:bg-slate-50">
                          <td className="p-3 text-slate-500">{new Date(cmd.created_at).toLocaleDateString('fr-FR')}</td>
                          <td className="p-3 font-mono font-bold text-blue-600">{cmd.numero_commande}</td>
                          <td className="p-3 font-bold text-slate-800">{f ? f.nom_fournisseur || f.nom || f.raison_sociale : 'Fournisseur'}</td>
                          <td className="p-3 text-right font-black text-slate-900">{Number(cmd.montant_total || 0).toLocaleString('fr-FR')} F</td>
                          <td className="p-3 text-center">
                            <span className="px-2.5 py-1 rounded-full font-bold text-[10px] bg-blue-100 text-blue-800">
                              {cmd.statut_commande || 'EN_ATTENTE'}
                            </span>
                          </td>
                          <td className="p-3 text-center flex justify-center gap-2">
                            <button onClick={() => transformerCommandeEnFacture(cmd)} className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold px-3 py-1.5 rounded-xl transition shadow-xs" title="Convertir en Facture">📥 Facturer</button>
                            <button onClick={() => ouvrirDocModification(cmd, 'COMMANDE')} className="bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold px-3 py-1.5 rounded-xl transition shadow-xs">✏️</button>
                            <button onClick={() => window.print()} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition shadow-xs">🖨️</button>
                            <button onClick={() => supprimerDoc(cmd.id, 'COMMANDE')} className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2 py-1.5 rounded-xl transition shadow-xs">🗑️</button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VUE CHOIX DE CREATION */}
      {vueActive === 'choix_creation' && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6 max-w-xl mx-auto text-center">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="font-extrabold text-slate-800 text-base uppercase">Sélectionner le type de document</h4>
            <p className="text-slate-400 text-xs mt-1">Choisissez la nature du document à émettre</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => preparerNouveauDoc('COMMANDE')}
              className="bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 p-6 rounded-3xl flex flex-col items-center gap-3 transition shadow-sm"
            >
              <span className="text-4xl p-3 bg-white rounded-2xl shadow-inner">📋</span>
              <div>
                <span className="font-extrabold text-sm text-slate-800 block">Bon de Commande</span>
                <span className="text-[11px] text-slate-400 block mt-1">Émettre un BC (BC-)</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => preparerNouveauDoc('FACTURE')}
              className="bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 border border-emerald-200 p-6 rounded-3xl flex flex-col items-center gap-3 transition shadow-sm"
            >
              <span className="text-4xl p-3 bg-white rounded-2xl shadow-inner">📥</span>
              <div>
                <span className="font-extrabold text-sm text-emerald-900 block">Facture Fournisseur</span>
                <span className="text-[11px] text-emerald-600 block mt-1">Entrée en stock & comptabilité</span>
              </div>
            </button>
          </div>

          <div className="pt-3">
            <button type="button" onClick={() => setVueActive('liste')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-5 py-2 rounded-xl text-xs transition">
              ⬅️ Retour à la liste
            </button>
          </div>
        </div>
      )}

      {/* FORMULAIRE FACTURE */}
      {vueActive === 'formulaire_facture' && (
        <form onSubmit={enregistrerFacture} onKeyDown={gererKeyDown} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm uppercase">📥 FACTURE FOURNISSEUR</h4>
              <p className="text-slate-500">Opérateur : <strong className="text-orange-600">{utilisateurActif}</strong></p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setVueActive('liste')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl transition text-[11px]">⬅️ Retour liste</button>
              <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-right">
                <span className="block text-[10px] uppercase text-slate-400 font-bold">N° Facture</span>
                <span className="text-sm font-black text-emerald-400 font-mono">{numeroDoc}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 items-center">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Date *</label>
              <input type="date" required value={dateDoc} onChange={(e) => setDateDoc(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-2 font-medium" />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Fournisseur *</label>
              <select required value={idFournisseur} onChange={(e) => setIdFournisseur(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-800">
                <option value="">-- Choisir Fournisseur --</option>
                {fournisseurs.map((f) => (<option key={f.id} value={f.id}>🏢 {f.nom_fournisseur || f.nom || f.raison_sociale}</option>))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Dépôt Destination *</label>
              <select required value={idDepotDestination} onChange={(e) => setIdDepotDestination(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-800">
                <option value="">-- Choisir Dépôt --</option>
                {depots.map((d) => (<option key={d.id} value={d.id}>🏬 {d.nom_depot || d.nom || d.libelle}</option>))}
              </select>
            </div>
          </div>

          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="font-extrabold uppercase text-slate-600 text-[11px] block">{indexEnCoursModif !== null ? '✏️ Modifier l’article :' : 'SAISIE DES ARTICLES :'}</span>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <div className="sm:col-span-5">
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Article sélectionné *</label>
                <div onClick={() => {
                  if (!idDepotDestination) {
                    alert('Veuillez d’abord sélectionner un dépôt de destination.');
                    return;
                  }
                  setModalArticleOuverte(true);
                }} className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 cursor-pointer flex justify-between items-center hover:border-orange-500 transition">
                  <span>{articleCourant.designation ? `📦 ${articleCourant.designation}` : '-- Cliquer pour choisir un article --'}</span>
                  <span className="text-orange-600 font-bold">🔍 Parcourir</span>
                </div>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Quantité *</label>
                <input 
                  type="number" 
                  min="1" 
                  placeholder="Ex: 10" 
                  value={articleCourant.quantite} 
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setArticleCourant({ ...articleCourant, quantite: e.target.value })} 
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold text-orange-600" 
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Prix d'Achat Unitaire (F) *</label>
                <input 
                  type="number" 
                  min="1" 
                  placeholder="Ex: 700" 
                  value={articleCourant.prix_achat} 
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setArticleCourant({ ...articleCourant, prix_achat: e.target.value })} 
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-800" 
                />
              </div>
              <div className="sm:col-span-1 text-center pt-4">
                <button type="button" onClick={ajouterArticleCourant} className="bg-orange-600 hover:bg-orange-500 text-white font-bold p-2.5 rounded-xl transition shadow" title="Ajouter / Valider (Entrée)">
                  {indexEnCoursModif !== null ? '💾' : '➕'}
                </button>
              </div>
            </div>
          </div>

          {lignesValidees.length > 0 && (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Article</th>
                    <th className="p-3 text-center">Quantité</th>
                    <th className="p-3 text-right">Prix Unitaire</th>
                    <th className="p-3 text-right">Sous-Total</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lignesValidees.map((l, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-800">📦 {l.designation}</td>
                      <td className="p-3 text-center font-black text-orange-600">{l.quantite}</td>
                      <td className="p-3 text-right font-medium">{Number(l.prix_achat).toLocaleString('fr-FR')} F</td>
                      <td className="p-3 text-right font-black text-emerald-700">{(Number(l.quantite) * Number(l.prix_achat)).toLocaleString('fr-FR')} F</td>
                      <td className="p-3 text-center flex justify-center gap-2">
                        <button type="button" onClick={() => { setArticleCourant(l); setIndexEnCoursModif(index); }} className="bg-blue-50 text-blue-600 font-bold p-2 rounded-xl" title="Modifier">✏️</button>
                        <button type="button" onClick={() => setLignesValidees(lignesValidees.filter((_, i) => i !== index))} className="bg-red-50 text-red-600 font-bold p-2 rounded-xl" title="Supprimer">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-center pt-3 border-t border-slate-100 gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
              <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl">
                <span className="text-[10px] uppercase text-slate-400 block font-bold">Montant Total</span>
                <span className="text-lg font-black text-emerald-400">{montantTotalGlobal.toLocaleString('fr-FR')} F CFA</span>
              </div>
              <div className="bg-slate-50 border border-slate-300 px-4 py-2.5 rounded-2xl">
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-0.5">Statut Paiement *</label>
                <select value={statutPaiement} onChange={(e) => setStatutPaiement(e.target.value)} className="bg-white border border-slate-300 rounded-xl p-1.5 font-bold text-slate-800 text-xs">
                  <option value="SOLDE">🟢 Soldé</option>
                  <option value="PARTIEL">🟡 Partiel</option>
                  <option value="CREDIT">🔴 Crédit</option>
                </select>
              </div>
              <div className="bg-slate-50 border border-slate-300 px-4 py-2.5 rounded-2xl">
                <label className="block text-[10px] uppercase text-slate-500 font-bold mb-0.5">Montant Réglé (F CFA)</label>
                <input 
                  type="number" 
                  disabled={statutPaiement === 'SOLDE' || statutPaiement === 'CREDIT'} 
                  value={montantPaye} 
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setMontantPaye(e.target.value)} 
                  className={`w-full rounded-xl p-1.5 font-bold text-xs ${statutPaiement === 'SOLDE' || statutPaiement === 'CREDIT' ? 'bg-slate-200 text-slate-500 cursor-not-allowed font-black' : 'bg-white text-orange-600 border border-slate-300'}`} 
                />
              </div>
              <div className={`border px-5 py-3 rounded-2xl ${soldeRestant > 0 ? 'bg-orange-50 border-orange-200 text-orange-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                <span className="text-[10px] uppercase block font-bold">Solde Restant (Dette)</span>
                <span className="text-base font-black">{soldeRestant.toLocaleString('fr-FR')} F CFA</span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button type="button" onClick={() => { if (lignesValidees.length === 0) { alert('Veuillez ajouter des articles avant d’imprimer.'); return; } window.print(); }} className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-3.5 rounded-2xl shadow transition text-xs">
                🖨️ Imprimer
              </button>
              <button type="button" onClick={() => { if (lignesValidees.length === 0) { alert('Veuillez ajouter des articles avant de partager.'); return; } setModalPartageOuverte(true); }} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-3.5 rounded-2xl shadow transition text-xs">
                📤 Partager...
              </button>
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3.5 rounded-2xl shadow-lg transition text-xs">
                ✅ Valider
              </button>
            </div>
          </div>
        </form>
      )}

      {/* FORMULAIRE BON DE COMMANDE */}
      {vueActive === 'formulaire_commande' && (
        <form onSubmit={enregistrerCommande} onKeyDown={gererKeyDown} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm uppercase">📋 BON DE COMMANDE FOURNISSEUR</h4>
              <p className="text-slate-500">Opérateur : <strong className="text-orange-600">{utilisateurActif}</strong></p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setVueActive('liste')} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl transition text-[11px]">⬅️ Retour liste</button>
              <div className="bg-slate-900 text-white px-4 py-2 rounded-xl text-right">
                <span className="block text-[10px] uppercase text-slate-400 font-bold">N° Commande</span>
                <span className="text-sm font-black text-blue-400 font-mono">{numeroDoc}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 items-center">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Date *</label>
              <input type="date" required value={dateDoc} onChange={(e) => setDateDoc(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-2 font-medium" />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Fournisseur *</label>
              <select required value={idFournisseur} onChange={(e) => setIdFournisseur(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-800">
                <option value="">-- Choisir Fournisseur --</option>
                {fournisseurs.map((f) => (<option key={f.id} value={f.id}>🏢 {f.nom_fournisseur || f.nom || f.raison_sociale}</option>))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Dépôt Dest. *</label>
              <select required value={idDepotDestination} onChange={(e) => setIdDepotDestination(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-800">
                <option value="">-- Choisir Dépôt --</option>
                {depots.map((d) => (<option key={d.id} value={d.id}>🏬 {d.nom_depot || d.nom || d.libelle}</option>))}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Délai Livraison :</label>
              <input type="text" value={delaiLivraison} onChange={(e) => setDelaiLivraison(e.target.value)} placeholder="Ex: 7 jours" className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-800" />
            </div>
          </div>

          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="font-extrabold uppercase text-slate-600 text-[11px] block">{indexEnCoursModif !== null ? '✏️ Modifier l’article :' : 'ARTICLES À COMMANDER :'}</span>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
              <div className="sm:col-span-5">
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Article sélectionné *</label>
                <div onClick={() => {
                  if (!idDepotDestination) {
                    alert('Veuillez d’abord sélectionner un dépôt de destination.');
                    return;
                  }
                  setModalArticleOuverte(true);
                }} className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs font-bold text-slate-800 cursor-pointer flex justify-between items-center hover:border-orange-500 transition">
                  <span>{articleCourant.designation ? `📦 ${articleCourant.designation}` : '-- Cliquer pour choisir un article --'}</span>
                  <span className="text-orange-600 font-bold">🔍 Parcourir</span>
                </div>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Quantité *</label>
                <input 
                  type="number" 
                  min="1" 
                  placeholder="Ex: 10" 
                  value={articleCourant.quantite} 
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setArticleCourant({ ...articleCourant, quantite: e.target.value })} 
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold text-orange-600" 
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Prix d'Achat Estimé (F) *</label>
                <input 
                  type="number" 
                  min="1" 
                  placeholder="Ex: 700" 
                  value={articleCourant.prix_achat} 
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setArticleCourant({ ...articleCourant, prix_achat: e.target.value })} 
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-800" 
                />
              </div>
              <div className="sm:col-span-1 text-center pt-4">
                <button type="button" onClick={ajouterArticleCourant} className="bg-orange-600 hover:bg-orange-500 text-white font-bold p-2.5 rounded-xl transition shadow" title="Ajouter / Valider (Entrée)">
                  {indexEnCoursModif !== null ? '💾' : '➕'}
                </button>
              </div>
            </div>
          </div>

          {lignesValidees.length > 0 && (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Article</th>
                    <th className="p-3 text-center">Quantité</th>
                    <th className="p-3 text-right">Prix Estimé</th>
                    <th className="p-3 text-right">Sous-Total</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lignesValidees.map((l, index) => (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-800">📦 {l.designation}</td>
                      <td className="p-3 text-center font-black text-orange-600">{l.quantite}</td>
                      <td className="p-3 text-right font-medium">{Number(l.prix_achat).toLocaleString('fr-FR')} F</td>
                      <td className="p-3 text-right font-black text-slate-900">{(Number(l.quantite) * Number(l.prix_achat)).toLocaleString('fr-FR')} F</td>
                      <td className="p-3 text-center flex justify-center gap-2">
                        <button type="button" onClick={() => { setArticleCourant(l); setIndexEnCoursModif(index); }} className="bg-blue-50 text-blue-600 font-bold p-2 rounded-xl" title="Modifier">✏️</button>
                        <button type="button" onClick={() => setLignesValidees(lignesValidees.filter((_, i) => i !== index))} className="bg-red-50 text-red-600 font-bold p-2 rounded-xl" title="Supprimer">🗑️</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-center pt-3 border-t border-slate-100 gap-4">
            <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl">
              <span className="text-[10px] uppercase text-slate-400 block font-bold">Montant Total Estimé</span>
              <span className="text-lg font-black text-blue-400">{montantTotalGlobal.toLocaleString('fr-FR')} F CFA</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button type="button" onClick={() => { if (lignesValidees.length === 0) { alert('Veuillez ajouter des articles avant d’imprimer.'); return; } window.print(); }} className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-3.5 rounded-2xl shadow transition text-xs">
                🖨️ Imprimer
              </button>
              <button type="button" onClick={() => { if (lignesValidees.length === 0) { alert('Veuillez ajouter des articles avant de partager.'); return; } setModalPartageOuverte(true); }} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-3.5 rounded-2xl shadow transition text-xs">
                📤 Partager...
              </button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3.5 rounded-2xl shadow-lg transition text-xs">
                📋 Enregistrer la Commande
              </button>
            </div>
          </div>
        </form>
      )}

      {/* MODALE DE RECHERCHE D'ARTICLES */}
      {modalArticleOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-5 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 uppercase">SÉLECTIONNER UN ARTICLE</h3>
                <p className="text-[11px] text-slate-400">Stocks calculés pour le dépôt sélectionné</p>
              </div>
              <button type="button" onClick={() => setModalArticleOuverte(false)} className="text-slate-400 font-black p-1 text-sm">✕</button>
            </div>
            <div className="relative">
              <input type="text" autoFocus placeholder="Rechercher par désignation..." value={rechercheArticle} onChange={(e) => setRechercheArticle(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-3 pl-10 text-xs font-bold" />
              <span className="absolute left-3.5 top-3.5 text-slate-400">🔍</span>
            </div>
            <div className="overflow-y-auto space-y-2 flex-1 max-h-96 pr-1">
              {articlesFiltresModal.length === 0 ? (
                <p className="text-center text-slate-400 py-8 text-xs">Aucun article trouvé.</p>
              ) : (
                articlesFiltresModal.map((art) => (
                  <div key={art.id_article} onClick={() => { setArticleCourant({ id_article: art.id_article, designation: art.Designation || 'Article', quantite: '1', prix_achat: art.prixAchatDefaut || '' }); setModalArticleOuverte(false); setRechercheArticle(''); }} className="p-3 bg-slate-50 hover:bg-orange-50 border border-slate-200 rounded-2xl flex justify-between items-center cursor-pointer transition">
                    <div>
                      <span className="font-extrabold text-slate-800 block text-xs">📦 {art.Designation}</span>
                      <span className="text-[10px] text-slate-400">Stock dans ce dépôt : <strong className="text-emerald-600">{art.stockDepot}</strong></span>
                    </div>
                    <span className="font-black text-orange-600 text-xs">{art.prixAchatDefaut ? `${Number(art.prixAchatDefaut).toLocaleString('fr-FR')} F` : ''}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE CHOIX DE PARTAGE */}
      {modalPartageOuverte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
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
                  onClick={() => executerPartageViaCanal('whatsapp')}
                  className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold p-3 rounded-2xl flex items-center justify-center gap-2 transition"
                >
                  💚 Envoyer via WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => executerPartageViaCanal('mail')}
                  className="w-full bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-bold p-3 rounded-2xl flex items-center justify-center gap-2 transition"
                >
                  📧 Envoyer par Mail
                </button>
                <button
                  type="button"
                  onClick={() => executerPartageViaCanal('bluetooth')}
                  className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold p-3 rounded-2xl flex items-center justify-center gap-2 transition"
                >
                  📡 Partager (Bluetooth / Appareil)
                </button>
                <button
                  type="button"
                  onClick={() => executerPartageViaCanal('telecharger')}
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