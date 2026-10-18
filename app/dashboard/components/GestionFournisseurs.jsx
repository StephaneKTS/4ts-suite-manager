'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtdqodqhkdxanrelxtrq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; 
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GestionFournisseurs({ entrepriseId = '4TS-TEST' }) {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [approvisionnements, setApprovisionnements] = useState([]);
  const [reglements, setReglements] = useState([]);
  const [articles, setArticles] = useState([]);
  const [depots, setDepots] = useState([]);
  const [chargement, setChargement] = useState(false);
  
  // Navigation par onglets : 'repertoire' | 'historique'
  const [ongletActif, setOngletActif] = useState('repertoire');

  // Filtres Historique Fournisseur
  const [fournisseurHistoriqueId, setFournisseurHistoriqueId] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  // Modale de visualisation de la facture complète
  const [factureSelectionnee, setFactureSelectionnee] = useState(null);

  const [afficherForm, setAfficherForm] = useState(false);
  const [fournisseurEnEdition, setFournisseurEnEdition] = useState(null);
  const [recherche, setRecherche] = useState('');

  const [nouveauFournisseur, setNouveauFournisseur] = useState({
    nom_fournisseur: '',
    telephone: '',
    email: '',
    adresse: '',
    solde_dette: 0,
  });

  const chargerFournisseursEtDonnees = async () => {
    setChargement(true);
    try {
      const { data: dataFourn, error: errFourn } = await supabase
        .from('fournisseurs')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .order('created_at', { ascending: false });

      if (errFourn) throw errFourn;
      const listFourn = dataFourn || [];
      setFournisseurs(listFourn);

      if (listFourn.length > 0 && !fournisseurHistoriqueId) {
        setFournisseurHistoriqueId(listFourn[0].id);
      }

      const { data: dataAppro } = await supabase
        .from('approvisionnements')
        .select('*')
        .eq('id_entreprise', entrepriseId);

      setApprovisionnements(dataAppro || []);

      const { data: dataReg } = await supabase
        .from('reglements_fournisseurs')
        .select('*')
        .eq('id_entreprise', entrepriseId);

      setReglements(dataReg || []);

      const { data: dataArticles } = await supabase
        .from('articles_stock')
        .select('*');

      setArticles(dataArticles || []);

      const { data: dataDepots } = await supabase
        .from('depots_stock')
        .select('*');

      setDepots(dataDepots || []);

    } catch (err) {
      console.error('Erreur chargement données :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerFournisseursEtDonnees();
  }, [entrepriseId]);

  const calculerSoldeDetteFournisseur = (fournisseur) => {
    if (!fournisseur) return 0;
    const fournId = fournisseur.id;
    const fournNom = (fournisseur.nom_fournisseur || '').trim().toUpperCase();

    let totalDetteAppro = 0;
    approvisionnements.forEach((app) => {
      const matchId = String(app.id_fournisseur) === String(fournId);
      const matchNom = String(app.nom_fournisseur || app.fournisseur || '').trim().toUpperCase() === fournNom;

      if (matchId || matchNom) {
        const montantTotal = Number(app.montant_total || app.total || 0);
        const montantRegle = Number(app.montant_regle || app.montant_paye || 0);
        
        if (app.solde_restant !== undefined && app.solde_restant !== null) {
          totalDetteAppro += Number(app.solde_restant);
        } else if (app.reste_a_payer !== undefined && app.reste_a_payer !== null) {
          totalDetteAppro += Number(app.reste_a_payer);
        } else {
          totalDetteAppro += Math.max(0, montantTotal - montantRegle);
        }
      }
    });

    let totalReglementsIndependants = 0;
    reglements.forEach((reg) => {
      const matchId = String(reg.id_fournisseur) === String(fournId);
      const matchNom = String(reg.nom_fournisseur || '').trim().toUpperCase() === fournNom;
      if (matchId || matchNom) {
        totalReglementsIndependants += Number(reg.montant || 0);
      }
    });

    return Math.max(0, totalDetteAppro - totalReglementsIndependants);
  };

  const enregistrerFournisseur = async (e) => {
    e.preventDefault();
    try {
      if (fournisseurEnEdition) {
        const { error } = await supabase
          .from('fournisseurs')
          .update({
            nom_fournisseur: nouveauFournisseur.nom_fournisseur,
            telephone: nouveauFournisseur.telephone,
            email: nouveauFournisseur.email,
            adresse: nouveauFournisseur.adresse,
          })
          .eq('id', fournisseurEnEdition.id);

        if (error) throw error;
        alert('Fournisseur mis à jour avec succès !');
      } else {
        const { error } = await supabase.from('fournisseurs').insert([
          {
            nom_fournisseur: nouveauFournisseur.nom_fournisseur,
            telephone: nouveauFournisseur.telephone,
            email: nouveauFournisseur.email,
            adresse: nouveauFournisseur.adresse,
            solde_dette: 0,
            id_entreprise: entrepriseId,
          },
        ]);

        if (error) throw error;
        alert('Fournisseur enregistré avec succès !');
      }

      annulerForm();
      chargerFournisseursEtDonnees();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const ouvrirEdition = (fournisseur) => {
    setFournisseurEnEdition(fournisseur);
    const soldeCalcule = calculerSoldeDetteFournisseur(fournisseur);
    setNouveauFournisseur({
      nom_fournisseur: fournisseur.nom_fournisseur || '',
      telephone: fournisseur.telephone || '',
      email: fournisseur.email || '',
      adresse: fournisseur.adresse || '',
      solde_dette: soldeCalcule,
    });
    setAfficherForm(true);
  };

  const annulerForm = () => {
    setFournisseurEnEdition(null);
    setNouveauFournisseur({
      nom_fournisseur: '',
      telephone: '',
      email: '',
      adresse: '',
      solde_dette: 0,
    });
    setAfficherForm(false);
  };

  const supprimerFournisseur = async (id) => {
    if (!confirm('Voulez-vous vraiment supprimer ce fournisseur ?')) return;

    try {
      const { error } = await supabase.from('fournisseurs').delete().eq('id', id);
      if (error) throw error;
      alert('Fournisseur supprimé.');
      chargerFournisseursEtDonnees();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const fournisseursFiltres = fournisseurs.filter((f) => {
    const nom = (f.nom_fournisseur || '').toLowerCase();
    const tel = (f.telephone || '').toLowerCase();
    const query = recherche.toLowerCase();
    return nom.includes(query) || tel.includes(query);
  });

  // Construction de l'historique du fournisseur sélectionné
  const obtenirHistoriqueFournisseur = () => {
    if (!fournisseurHistoriqueId) return { lignes: [], soldeGlobal: 0 };
    const fournObj = fournisseurs.find(f => String(f.id) === String(fournisseurHistoriqueId));
    if (!fournObj) return { lignes: [], soldeGlobal: 0 };

    const fournId = fournObj.id;
    const fournNom = (fournObj.nom_fournisseur || '').trim().toUpperCase();

    let operations = [];

    approvisionnements.forEach((app) => {
      const matchId = String(app.id_fournisseur) === String(fournId);
      const matchNom = String(app.nom_fournisseur || app.fournisseur || '').trim().toUpperCase() === fournNom;

      if (matchId || matchNom) {
        const montantTotal = Number(app.montant_total || app.total || 0);
        const montantRegle = Number(app.montant_regle || app.montant_paye || 0);
        const resteAPayer = app.solde_restant !== undefined && app.solde_restant !== null 
          ? Number(app.solde_restant) 
          : Math.max(0, montantTotal - montantRegle);

        let statut = 'Soldé';
        if (montantRegle <= 0) statut = 'Non soldé';
        else if (montantRegle < montantTotal) statut = 'Payé partiellement';

        operations.push({
          dataOrigine: app,
          date: app.created_at || new Date().toISOString(),
          numeroFacture: app.numero_bon || app.numero_commande || app.reference || 'FACTURE',
          montant: montantTotal,
          montantRegle: montantRegle,
          reste: resteAPayer,
          statut: statut,
        });
      }
    });

    operations.sort((a, b) => new Date(a.date) - new Date(b.date));

    if (dateDebut) {
      operations = operations.filter(op => op.date.split('T')[0] >= dateDebut);
    }
    if (dateFin) {
      operations = operations.filter(op => op.date.split('T')[0] <= dateFin);
    }

    let cumulProgressif = 0;
    const lignesAvecProgressif = operations.map(op => {
      cumulProgressif += op.reste;
      return {
        ...op,
        montantProgressif: cumulProgressif,
      };
    });

    return {
      lignes: lignesAvecProgressif,
      soldeGlobal: cumulProgressif,
    };
  };

  const fournisseurSelectionneObj = fournisseurs.find(f => String(f.id) === String(fournisseurHistoriqueId));
  const resultatHistorique = obtenirHistoriqueFournisseur();

  const obtenirLignesFactureDetail = (factureObj) => {
    if (!factureObj || !factureObj.details_articles) return [];
    let details = [];
    if (typeof factureObj.details_articles === 'string') {
      try { details = JSON.parse(factureObj.details_articles); } catch (e) {}
    } else if (Array.isArray(factureObj.details_articles)) {
      details = factureObj.details_articles;
    }

    return details.map((item) => {
      const artObj = articles.find(a => String(a.id_article || a.id) === String(item.id_article || item.article_id || item.id));
      const designation = item.designation || item.Designation || artObj?.Designation || `Article #${item.id_article || item.article_id}`;
      const qte = Number(item.quantite || item.Quantite || 0);
      const prixUnitaire = Number(item.prix_achat_unitaire || item.prix_unitaire || item.Prix_Achat || 0);
      const sousTotal = qte * prixUnitaire;

      return { designation, qte, prixUnitaire, sousTotal };
    });
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Navigation par onglets */}
      <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1.5 rounded-2xl">
        <button
          type="button"
          onClick={() => setOngletActif('repertoire')}
          className={`py-2.5 px-4 rounded-xl font-extrabold transition text-center ${
            ongletActif === 'repertoire' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          👥 Répertoire Fournisseurs ({fournisseurs.length})
        </button>
        <button
          type="button"
          onClick={() => setOngletActif('historique')}
          className={`py-2.5 px-4 rounded-xl font-extrabold transition text-center ${
            ongletActif === 'historique' ? 'bg-orange-600 text-white shadow' : 'bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          🔍 Historique Fournisseur
        </button>
      </div>

      {ongletActif === 'repertoire' && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm uppercase">👥 Gestion des Fournisseurs</h3>
              <p className="text-slate-500">Répertoire des partenaires, contacts et suivi des dettes fournisseurs.</p>
            </div>
            <button
              onClick={() => (afficherForm ? annulerForm() : setAfficherForm(true))}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded-xl transition shadow"
            >
              {afficherForm ? '✖ Fermer' : '➕ Nouveau Fournisseur'}
            </button>
          </div>

          {afficherForm && (
            <form onSubmit={enregistrerFournisseur} className="bg-slate-50 border-2 border-orange-500/40 p-4 rounded-2xl space-y-3 shadow-sm">
              <h4 className="font-bold text-orange-600 uppercase">
                {fournisseurEnEdition ? `✏️ Modifier le fournisseur` : '➕ Enregistrer un nouveau fournisseur'}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Nom / Raison Sociale *</label>
                  <input
                    type="text"
                    required
                    value={nouveauFournisseur.nom_fournisseur}
                    onChange={(e) => setNouveauFournisseur({ ...nouveauFournisseur, nom_fournisseur: e.target.value })}
                    placeholder="Ex: SARL FESCO DISTRIBUTION"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Téléphone</label>
                  <input
                    type="text"
                    value={nouveauFournisseur.telephone}
                    onChange={(e) => setNouveauFournisseur({ ...nouveauFournisseur, telephone: e.target.value })}
                    placeholder="Ex: +237 690000000"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={nouveauFournisseur.email}
                    onChange={(e) => setNouveauFournisseur({ ...nouveauFournisseur, email: e.target.value })}
                    placeholder="Ex: contact@fesco.cm"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold mb-1">Adresse</label>
                  <input
                    type="text"
                    value={nouveauFournisseur.adresse}
                    onChange={(e) => setNouveauFournisseur({ ...nouveauFournisseur, adresse: e.target.value })}
                    placeholder="Ex: Douala - Akwa"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Solde Dette Actuel (Calculé)</label>
                  <input
                    type="text"
                    disabled
                    value={`${Number(nouveauFournisseur.solde_dette || 0).toLocaleString('fr-FR')} F`}
                    className="w-full bg-slate-200 text-red-600 border border-slate-300 rounded-xl p-2.5 font-black cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={annulerForm} className="bg-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-xl">Annuler</button>
                <button type="submit" className="bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl shadow">
                  {fournisseurEnEdition ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          )}

          {/* Barre de recherche */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher par nom ou téléphone..."
              className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-500 px-1">
            <span>Répertoire : <strong>{fournisseursFiltres.length}</strong> fournisseur(s) trouvé(s)</span>
          </div>

          {chargement ? (
            <div className="p-8 text-center text-slate-400">Chargement des fournisseurs...</div>
          ) : fournisseursFiltres.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
              Aucun fournisseur enregistré pour le moment.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Nom / Raison Sociale</th>
                    <th className="p-3">Téléphone</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Adresse</th>
                    <th className="p-3">Solde Dette</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fournisseursFiltres.map((f) => {
                    const soldeDetteCalcule = calculerSoldeDetteFournisseur(f);
                    return (
                      <tr key={f.id} className="hover:bg-slate-50">
                        <td className="p-3 font-extrabold text-slate-800">{f.nom_fournisseur}</td>
                        <td className="p-3 font-mono text-slate-600">{f.telephone || '-'}</td>
                        <td className="p-3 text-slate-600">{f.email || '-'}</td>
                        <td className="p-3 text-slate-600">{f.adresse || '-'}</td>
                        <td className="p-3 font-black text-red-600">
                          {soldeDetteCalcule.toLocaleString('fr-FR')} F
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-1">
                            <button onClick={() => ouvrirEdition(f)} className="p-1.5 border border-slate-300 rounded-lg hover:bg-orange-100 transition" title="Modifier">✏️</button>
                            <button onClick={() => supprimerFournisseur(f.id)} className="p-1.5 border border-slate-300 rounded-lg hover:bg-red-100 transition" title="Supprimer">🗑️</button>
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

      {/* ONGLET HISTORIQUE FOURNISSEUR */}
      {ongletActif === 'historique' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h4 className="font-extrabold text-slate-800 text-sm uppercase flex items-center gap-2">
            <span>🔍</span> HISTORIQUE FOURNISSEUR
          </h4>

          {/* En-tête de sélection des filtres */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Sélectionner un Fournisseur *</label>
              <select
                value={fournisseurHistoriqueId}
                onChange={(e) => setFournisseurHistoriqueId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-slate-800"
              >
                {fournisseurs.map((f) => (
                  <option key={f.id} value={f.id}>
                    🏢 {f.nom_fournisseur}
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
              🏢 FOURNISSEUR : {fournisseurSelectionneObj ? fournisseurSelectionneObj.nom_fournisseur : 'Aucun'}
            </h5>
            <span className="text-xs font-bold text-slate-600">{resultatHistorique.lignes.length} facture(s) trouvée(s)</span>
          </div>

          {/* Tableau de l'historique avec bouton 'Voir Facture' */}
          <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3 font-mono">N° Facture / Bon</th>
                  <th className="p-3">Montant</th>
                  <th className="p-3 text-center">Statut</th>
                  <th className="p-3 text-blue-600 font-bold">Solde / Progressif</th>
                  <th className="p-3 text-center">Actions / Facture</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resultatHistorique.lignes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">Aucun historique d'achat pour ce fournisseur.</td>
                  </tr>
                ) : (
                  resultatHistorique.lignes.map((ligne, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-500 font-mono">
                        {new Date(ligne.date).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="p-3 font-mono font-bold text-orange-600">{ligne.numeroFacture}</td>
                      <td className="p-3 font-black text-slate-800">{ligne.montant.toLocaleString('fr-FR')} F</td>
                      <td className="p-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${
                          ligne.statut === 'Soldé' ? 'bg-emerald-100 text-emerald-700' :
                          ligne.statut === 'Payé partiellement' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {ligne.statut}
                        </span>
                      </td>
                      <td className="p-3 font-black text-blue-600">{ligne.montantProgressif.toLocaleString('fr-FR')} F</td>
                      <td className="p-3 text-center">
                        <button
                          type="button"
                          onClick={() => setFactureSelectionnee(ligne.dataOrigine)}
                          className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-3 py-1.5 rounded-xl transition shadow text-[11px] flex items-center gap-1 mx-auto"
                        >
                          👁️ Voir Facture
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Affichage du solde global du compte en bas */}
          <div className="bg-slate-900 text-white p-4 rounded-2xl flex justify-between items-center shadow-lg">
            <span className="font-extrabold text-sm uppercase tracking-wider">SOLDE GLOBAL DU COMPTE FOURNISSEUR :</span>
            <span className="text-lg font-black text-red-400 font-mono">
              {resultatHistorique.soldeGlobal.toLocaleString('fr-FR')} F CFA
            </span>
          </div>
        </div>
      )}

      {/* MODALE POP-UP VISUALISATION INTEGRALE DE LA FACTURE */}
      {factureSelectionnee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Modale */}
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-sm uppercase flex items-center gap-2">
                  <span>📄</span> FACTURE FOURNISSEUR
                </h3>
                <p className="text-[11px] text-orange-400 font-mono font-bold">
                  N° {factureSelectionnee.numero_bon || factureSelectionnee.numero_commande || factureSelectionnee.reference || 'FACTURE'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFactureSelectionnee(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-black text-sm p-2 rounded-xl transition"
              >
                ✕
              </button>
            </div>

            {/* En-tête des informations de la facture */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              <div>
                <span className="text-slate-400 block font-semibold">Date :</span>
                <span className="font-bold text-slate-800">
                  {new Date(factureSelectionnee.created_at || new Date()).toLocaleString('fr-FR')}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Fournisseur :</span>
                <span className="font-extrabold text-orange-600">
                  {factureSelectionnee.nom_fournisseur || factureSelectionnee.fournisseur || fournisseurSelectionneObj?.nom_fournisseur || '-'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Dépôt Destination :</span>
                <span className="font-bold text-slate-800">
                  {depots.find(d => String(d.id) === String(factureSelectionnee.id_depot_destination))?.nom_depot || 'COMPTOIR VENTE'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block font-semibold">Opérateur :</span>
                <span className="font-bold text-slate-700">{factureSelectionnee.operateur || 'THÉODORE STÉPHANE'}</span>
              </div>
            </div>

            {/* Contenu des articles livrés */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              <h5 className="font-bold text-slate-700 uppercase text-[11px]">📦 DÉTAILS DES ARTICLES LIVRÉS :</h5>
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="p-3">Article</th>
                      <th className="p-3 text-center">Quantité</th>
                      <th className="p-3 text-right">Prix Unitaire</th>
                      <th className="p-3 text-right">Sous-Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {obtenirLignesFactureDetail(factureSelectionnee).length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-6 text-center text-slate-400">Aucun détail d'article disponible pour cette facture.</td>
                      </tr>
                    ) : (
                      obtenirLignesFactureDetail(factureSelectionnee).map((line, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-3 font-extrabold text-slate-800">{line.designation}</td>
                          <td className="p-3 text-center font-black text-orange-600">{line.qte}</td>
                          <td className="p-3 text-right font-medium text-slate-600">{line.prixUnitaire.toLocaleString('fr-FR')} F</td>
                          <td className="p-3 text-right font-black text-emerald-700">{line.sousTotal.toLocaleString('fr-FR')} F</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Récapitulatif financier du bas de facture avec calcul exact du solde de la dette de la facture */}
            {(() => {
              const montantTotalFacture = Number(factureSelectionnee.montant_total || factureSelectionnee.total || 0);
              const montantRegleFacture = Number(factureSelectionnee.montant_regle || factureSelectionnee.montant_paye || 0);
              const soldeDetteFacture = factureSelectionnee.solde_restant !== undefined && factureSelectionnee.solde_restant !== null 
                ? Number(factureSelectionnee.solde_restant) 
                : factureSelectionnee.reste_a_payer !== undefined && factureSelectionnee.reste_a_payer !== null 
                ? Number(factureSelectionnee.reste_a_payer) 
                : Math.max(0, montantTotalFacture - montantRegleFacture);

              return (
                <div className="p-4 bg-slate-50 border-t border-slate-200 grid grid-cols-3 gap-3 text-center">
                  <div className="bg-slate-200/60 p-2.5 rounded-2xl">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase">Montant Total</span>
                    <span className="text-sm font-black text-slate-900">
                      {montantTotalFacture.toLocaleString('fr-FR')} F
                    </span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-2xl">
                    <span className="block text-[10px] text-emerald-700 font-bold uppercase">Montant Réglé</span>
                    <span className="text-sm font-black text-emerald-700">
                      {montantRegleFacture.toLocaleString('fr-FR')} F
                    </span>
                  </div>
                  <div className="bg-red-50 border border-red-200 p-2.5 rounded-2xl">
                    <span className="block text-[10px] text-red-700 font-bold uppercase">Solde Restant (Dette)</span>
                    <span className="text-sm font-black text-red-600">
                      {soldeDetteFacture.toLocaleString('fr-FR')} F
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Footer avec Boutons Imprimer et Fermer */}
            <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center">
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl transition text-xs flex items-center gap-1.5 shadow"
              >
                🖨️ Imprimer la Facture
              </button>
              <button
                type="button"
                onClick={() => setFactureSelectionnee(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-5 py-2 rounded-xl transition text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}