'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const LISTE_PAYS = [
  { code: 'cmr', indicatif: '+237', longueur: 9 },
  { code: 'fra', indicatif: '+33', longueur: 9 },
  { code: 'civ', indicatif: '+225', longueur: 10 },
  { code: 'sen', indicatif: '+221', longueur: 9 },
  { code: 'gab', indicatif: '+241', longueur: 7 },
  { code: 'cog', indicatif: '+242', longueur: 9 },
  { code: 'rdc', indicatif: '+243', longueur: 9 },
  { code: 'mli', indicatif: '+223', longueur: 8 },
  { code: 'bfa', indicatif: '+226', longueur: 8 },
  { code: 'tgo', indicatif: '+228', longueur: 8 },
  { code: 'ben', indicatif: '+229', longueur: 8 },
  { code: 'nga', indicatif: '+234', longueur: 10 },
  { code: 'mar', indicatif: '+212', longueur: 9 },
  { code: 'tun', indicatif: '+216', longueur: 8 },
  { code: 'dza', indicatif: '+213', longueur: 9 },
];

export default function GestionFournisseurs({ entrepriseId = '4TS-TEST' }) {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [approvisionnements, setApprovisionnements] = useState([]);
  const [bonsCommandes, setBonsCommandes] = useState([]);
  const [articles, setArticles] = useState([]);
  const [depots, setDepots] = useState([]);
  const [chargement, setChargement] = useState(false);
  
  const [ongletActif, setOngletActif] = useState('repertoire');

  const [triCol, setTriCol] = useState('nom_fournisseur');
  const [triOrdre, setTriOrdre] = useState('asc');

  const [triHistCol, setTriHistCol] = useState('date');
  const [triHistOrdre, setTriHistOrdre] = useState('asc');

  const [fournisseurHistoriqueId, setFournisseurHistoriqueId] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [factureSelectionnee, setFactureSelectionnee] = useState(null);
  const [montantReglementSaisi, setMontantReglementSaisi] = useState('');

  const [afficherForm, setAfficherForm] = useState(false);
  const [fournisseurEnEdition, setFournisseurEnEdition] = useState(null);
  const [recherche, setRecherche] = useState('');

  const [nouveauFournisseur, setNouveauFournisseur] = useState({
    nom_fournisseur: '',
    pays: 'cmr',
    telephone: '',
    email: '',
    adresse: '',
    solde_dette: 0,
  });

  // Récupération dynamique et robuste du module actif (Boutique, Livraison, Logistique, Tontine, etc.)
  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();

  const chargerFournisseursEtDonnees = async () => {
    setChargement(true);
    try {
      // Isolation stricte par entreprise ET par module pour une étanchéité à long terme
      const { data: dataFourn, error: errFourn } = await supabase
        .from('fournisseurs')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
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
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setApprovisionnements(dataAppro || []);

      const { data: dataBC } = await supabase
        .from('bons_commande_fournisseurs')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setBonsCommandes(dataBC || []);

      const { data: dataArticles } = await supabase
        .from('articles_stock')
        .select('*')
        .eq('ID_Entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setArticles(dataArticles || []);

      const { data: dataDepots } = await supabase
        .from('depots_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setDepots(dataDepots || []);

    } catch (err) {
      console.error('Erreur chargement données :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerFournisseursEtDonnees();
  }, [entrepriseId, moduleActuel]);

  const calculerTotauxFacture = (app) => {
    const montantTotal = Number(app.montant_total || app.total || 0);
    const montantRegle = Number(app.montant_regle || app.montant_paye || 0);
    const resteAPayer = Math.max(0, montantTotal - montantRegle);

    let statut = 'Soldé';
    if (montantRegle <= 0) statut = 'Non soldé';
    else if (montantRegle < montantTotal) statut = 'Avancé';

    return { montantTotal, montantRegle, resteAPayer, statut };
  };

  const calculerSoldeDetteFournisseur = (fournisseur) => {
    if (!fournisseur) return 0;
    const fournId = fournisseur.id;
    const fournNom = (fournisseur.nom_fournisseur || '').trim().toUpperCase();

    let totalDetteAppro = 0;
    approvisionnements.forEach((app) => {
      const matchId = String(app.id_fournisseur) === String(fournId);
      const matchNom = String(app.nom_fournisseur || app.fournisseur || '').trim().toUpperCase() === fournNom;

      if (matchId || matchNom) {
        const totaux = calculerTotauxFacture(app);
        totalDetteAppro += totaux.resteAPayer;
      }
    });

    return Math.max(0, totalDetteAppro);
  };

  const enregistrerFournisseur = async (e) => {
    e.preventDefault();
    const paysObj = LISTE_PAYS.find(p => p.code === nouveauFournisseur.pays) || LISTE_PAYS[0];
    const chiffresPur = (nouveauFournisseur.telephone || '').replace(/[^0-9]/g, '');

    if (chiffresPur.length > 0 && chiffresPur.length !== paysObj.longueur) {
      alert(`⚠️ Numéro invalide pour ${paysObj.code}. Le numéro doit comporter exactement ${paysObj.longueur} chiffres.`);
      return;
    }

    const numeroComplet = chiffresPur ? `${paysObj.indicatif}${chiffresPur}` : '';

    try {
      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel, // Injection automatique du module actif
        nom_fournisseur: nouveauFournisseur.nom_fournisseur,
        pays: nouveauFournisseur.pays,
        telephone: numeroComplet,
        email: nouveauFournisseur.email,
        adresse: nouveauFournisseur.adresse,
      };

      if (fournisseurEnEdition) {
        const { error } = await supabase
          .from('fournisseurs')
          .update(payload)
          .eq('id', fournisseurEnEdition.id);

        if (error) throw error;
        alert(`Fournisseur mis à jour avec succès dans le module ${moduleActuel} !`);
      } else {
        const { error } = await supabase.from('fournisseurs').insert([
          {
            ...payload,
            solde_dette: 0,
          },
        ]);

        if (error) throw error;
        alert(`Fournisseur enregistré avec succès dans le module ${moduleActuel} !`);
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
    
    let telLocal = fournisseur.telephone || '';
    const paysTrouve = LISTE_PAYS.find(p => fournisseur.telephone && fournisseur.telephone.startsWith(p.indicatif)) || LISTE_PAYS[0];
    if (fournisseur.telephone && fournisseur.telephone.startsWith(paysTrouve.indicatif)) {
      telLocal = fournisseur.telephone.replace(paysTrouve.indicatif, '');
    }

    setNouveauFournisseur({
      nom_fournisseur: fournisseur.nom_fournisseur || '',
      pays: fournisseur.pays || paysTrouve.code,
      telephone: telLocal.replace(/[^0-9]/g, ''),
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
      pays: 'cmr',
      telephone: '',
      email: '',
      adresse: '',
      solde_dette: 0,
    });
    setAfficherForm(false);
  };

  const supprimerFournisseur = async () => {
    if (!fournisseurEnEdition) return;

    try {
      setChargement(true);
      const fournisseurIdStr = String(fournisseurEnEdition.id);
      const fournisseurNomStr = String(fournisseurEnEdition.nom_fournisseur || '').trim().toUpperCase();

      // Interrogation DIRECTE et simultanée de approvisionnements et bons_commande_fournisseurs
      const [resAppro, resBC] = await Promise.all([
        supabase.from('approvisionnements').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('bons_commande_fournisseurs').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel)
      ]);

      if (resAppro.error) throw resAppro.error;
      if (resBC.error) throw resBC.error;

      const approDb = resAppro.data || [];
      const bcDb = resBC.data || [];

      // Vérification rigoureuse dans les factures d'achat (approvisionnements)
      const approRattaches = approDb.filter((app) => {
        const idFournApp = String(app.id_fournisseur || '');
        const nomFournApp = String(app.nom_fournisseur || app.fournisseur || '').trim().toUpperCase();
        return idFournApp === fournisseurIdStr || (fournisseurNomStr !== '' && nomFournApp === fournisseurNomStr);
      });

      // Vérification rigoureuse dans les bons de commande
      const bcRattaches = bcDb.filter((bc) => {
        const idFournBc = String(bc.id_fournisseur || '');
        const nomFournBc = String(bc.nom_fournisseur || bc.fournisseur || '').trim().toUpperCase();
        return idFournBc === fournisseurIdStr || (fournisseurNomStr !== '' && nomFournBc === fournisseurNomStr);
      });

      const totalOperations = approRattaches.length + bcRattaches.length;

      // BLOCAGE STRICT si des achats ou commandes existent
      if (totalOperations > 0) {
        alert(`❌ SUPPRESSION BLOQUÉE : Ce fournisseur ("${fournisseurEnEdition.nom_fournisseur}") a déjà ${totalOperations} facture(s) d'achat ou bon(s) de commande enregistré(s) à son compte. Pour des raisons comptables et de traçabilité, il est strictement impossible de le supprimer.`);
        setChargement(false);
        return;
      }

      if (!confirm(`Voulez-vous vraiment supprimer définitivement le fournisseur "${fournisseurEnEdition.nom_fournisseur}" ?`)) {
        setChargement(false);
        return;
      }

      const { error } = await supabase.from('fournisseurs').delete().eq('id', fournisseurEnEdition.id);
      if (error) throw error;

      alert('Fournisseur supprimé avec succès.');
      annulerForm();
      chargerFournisseursEtDonnees();
    } catch (err) {
      alert('Erreur : ' + err.message);
    } finally {
      setChargement(false);
    }
  };

  const gererSaisieTelephone = (e) => {
    const chiffres = e.target.value.replace(/[^0-9]/g, '');
    setNouveauFournisseur({ ...nouveauFournisseur, telephone: chiffres });
  };

  const getTelephoneComplet = () => {
    const paysObj = LISTE_PAYS.find(p => p.code === nouveauFournisseur.pays) || LISTE_PAYS[0];
    return `${paysObj.indicatif}${nouveauFournisseur.telephone || ''}`;
  };

  const obtenirNumWhatsapp = (tel) => {
    if (!tel) return '';
    return tel.replace(/[^0-9]/g, '');
  };

  const gererTri = (colonne) => {
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

  const gererTriHistorique = (colonne) => {
    if (triHistCol === colonne) {
      setTriHistOrdre(triHistOrdre === 'asc' ? 'desc' : 'asc');
    } else {
      setTriHistCol(colonne);
      setTriHistOrdre('asc');
    }
  };

  const rendreFlecheTriHistorique = (colonne) => {
    if (triHistCol !== colonne) return <span className="text-slate-400 ml-1">↕</span>;
    return <span className="text-orange-600 ml-1 font-bold">{triHistOrdre === 'asc' ? '↑' : '↓'}</span>;
  };

  const fournisseursFiltres = fournisseurs
    .filter((f) => {
      const nom = (f.nom_fournisseur || '').toLowerCase();
      const tel = (f.telephone || '').toLowerCase();
      const query = recherche.toLowerCase();
      return nom.includes(query) || tel.includes(query);
    })
    .sort((a, b) => {
      let valA = '';
      let valB = '';

      if (triCol === 'nom_fournisseur') {
        valA = a.nom_fournisseur || '';
        valB = b.nom_fournisseur || '';
      } else if (triCol === 'solde_dette') {
        valA = Number(calculerSoldeDetteFournisseur(a));
        valB = Number(calculerSoldeDetteFournisseur(b));
      }

      if (valA < valB) return triOrdre === 'asc' ? -1 : 1;
      if (valA > valB) return triOrdre === 'asc' ? 1 : -1;
      return 0;
    });

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
        const totaux = calculerTotauxFacture(app);

        operations.push({
          dataOrigine: app,
          date: app.created_at || new Date().toISOString(),
          numeroFacture: app.numero_bon || app.numero_commande || app.reference || 'FACTURE',
          montant: totaux.montantTotal,
          montantRegle: totaux.montantRegle,
          reste: totaux.resteAPayer,
          statut: totaux.statut,
        });
      }
    });

    if (dateDebut) operations = operations.filter(op => op.date.split('T')[0] >= dateDebut);
    if (dateFin) operations = operations.filter(op => op.date.split('T')[0] <= dateFin);

    operations.sort((a, b) => {
      let valA = '';
      let valB = '';

      if (triHistCol === 'date') {
        valA = a.date;
        valB = b.date;
      } else if (triHistCol === 'numeroFacture') {
        valA = a.numeroFacture;
        valB = b.numeroFacture;
      } else if (triHistCol === 'montant') {
        valA = a.montant;
        valB = b.montant;
      } else if (triHistCol === 'statut') {
        valA = a.statut;
        valB = b.statut;
      }

      if (valA < valB) return triHistOrdre === 'asc' ? -1 : 1;
      if (valA > valB) return triHistOrdre === 'asc' ? 1 : -1;
      return 0;
    });

    let cumulProgressif = 0;
    const lignesAvecProgressif = operations.map(op => {
      cumulProgressif += op.reste;
      return { ...op, montantProgressif: cumulProgressif };
    });

    return { lignes: lignesAvecProgressif, soldeGlobal: cumulProgressif };
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

  const enregistrerReglementFacture = async (e) => {
    e.preventDefault();
    if (!factureSelectionnee || !montantReglementSaisi) return;
    const montantAvance = parseFloat(montantReglementSaisi);
    if (isNaN(montantAvance) || montantAvance <= 0) {
      alert('⚠️ Veuillez entrer un montant valide.');
      return;
    }

    try {
      const montantActuelRegle = Number(factureSelectionnee.montant_regle || factureSelectionnee.montant_paye || 0);
      const nouveauRegle = montantActuelRegle + montantAvance;

      const { error } = await supabase
        .from('approvisionnements')
        .update({
          montant_regle: nouveauRegle,
        })
        .eq('id', factureSelectionnee.id);

      if (error) throw error;
      alert('Règlement enregistré avec succès !');
      setMontantReglementSaisi('');
      setFactureSelectionnee(null);
      chargerFournisseursEtDonnees();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const paysActuelObj = LISTE_PAYS.find(p => p.code === nouveauFournisseur.pays) || LISTE_PAYS[0];

  return (
    <div className="space-y-2.5 text-[11px] font-sans">
      
      {/* EN-TÊTE EXPLICITE DE LA TABLE (HARMONISÉ) */}
      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="font-extrabold text-slate-900 uppercase text-xs flex items-center gap-1.5">
          <span>🏢</span> GESTION DES FOURNISSEURS [{moduleActuel}]
        </h3>
        <button
          type="button"
          onClick={() => {
            if (afficherForm) {
              annulerForm();
            } else {
              setNouveauFournisseur({ nom_fournisseur: '', pays: 'cmr', telephone: '', email: '', adresse: '', solde_dette: 0 });
              setFournisseurEnEdition(null);
              setAfficherForm(true);
            }
          }}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-2xs text-xs"
        >
          {afficherForm ? '✖' : 'Nouveau'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setOngletActif('repertoire')}
          className={`py-1.5 px-3 rounded-lg font-bold transition text-center ${
            ongletActif === 'repertoire' ? 'bg-orange-600 text-white shadow-2xs' : 'bg-white text-slate-800 hover:bg-slate-50'
          }`}
        >
          👥 Fournisseurs [{moduleActuel}] ({fournisseurs.length})
        </button>
        <button
          type="button"
          onClick={() => setOngletActif('historique')}
          className={`py-1.5 px-3 rounded-lg font-bold transition text-center ${
            ongletActif === 'historique' ? 'bg-orange-600 text-white shadow-2xs' : 'bg-white text-slate-800 hover:bg-slate-50'
          }`}
        >
          🔍 Historique [{moduleActuel}]
        </button>
      </div>

      {ongletActif === 'repertoire' && (
        <>
          {afficherForm && (
            <form onSubmit={enregistrerFournisseur} className="bg-white border-2 border-orange-500/50 p-3 rounded-xl space-y-2.5 shadow-md">
              <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                <h4 className="font-extrabold text-orange-600 uppercase text-[10px]">
                  {fournisseurEnEdition ? `✏️ Fiche du fournisseur (${moduleActuel})` : `➕ Nouveau fournisseur (${moduleActuel})`}
                </h4>
                <button
                  type="button"
                  onClick={annulerForm}
                  className="text-slate-400 hover:text-slate-700 font-bold text-xs p-0.5"
                >
                  ✖
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Nom / Raison Sociale *</label>
                  <input
                    type="text"
                    required
                    value={nouveauFournisseur.nom_fournisseur}
                    onChange={(e) => setNouveauFournisseur({ ...nouveauFournisseur, nom_fournisseur: e.target.value })}
                    placeholder="Ex: SARL FESCO"
                    className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-slate-900 text-xs shadow-xs"
                  />
                </div>

                {fournisseurEnEdition && (
                  <div>
                    <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Solde Dette</label>
                    <input
                      type="text"
                      disabled
                      value={`${Number(nouveauFournisseur.solde_dette || 0).toLocaleString('fr-FR')} F`}
                      className="w-full bg-slate-100 text-red-700 border border-slate-300 rounded p-1.5 font-black text-xs cursor-not-allowed"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Adresse</label>
                  <input
                    type="text"
                    value={nouveauFournisseur.adresse}
                    onChange={(e) => setNouveauFournisseur({ ...nouveauFournisseur, adresse: e.target.value })}
                    placeholder="Ex: Douala - Akwa"
                    className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-xs shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-200">
                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Pays *</label>
                  <select
                    value={nouveauFournisseur.pays}
                    onChange={(e) => setNouveauFournisseur({ ...nouveauFournisseur, pays: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-slate-900 text-[11px] shadow-xs"
                  >
                    {LISTE_PAYS.map((p) => (
                      <option key={p.code} value={p.code}>{p.code.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">
                    Tel ({paysActuelObj.longueur} chiffres) *
                  </label>
                  <div className="flex items-center bg-white border border-slate-300 rounded overflow-hidden shadow-xs">
                    <span className="bg-slate-100 px-2 py-1.5 text-[11px] font-black text-slate-800 border-r border-slate-300 shrink-0">
                      {paysActuelObj.indicatif}
                    </span>
                    <input
                      type="text"
                      required
                      maxLength={paysActuelObj.longueur}
                      value={nouveauFournisseur.telephone}
                      onChange={gererSaisieTelephone}
                      placeholder="6XXXXXXXX"
                      className="w-full p-1.5 font-mono text-[11px] font-extrabold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Email</label>
                <input
                  type="email"
                  value={nouveauFournisseur.email}
                  onChange={(e) => setNouveauFournisseur({ ...nouveauFournisseur, email: e.target.value })}
                  placeholder="contact@email.com"
                  className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-[11px] shadow-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex flex-wrap justify-between items-center gap-1.5">
                <div className="flex items-center gap-1 flex-wrap">
                  {nouveauFournisseur.telephone && nouveauFournisseur.telephone.length === paysActuelObj.longueur && (
                    <>
                      <a href={`tel:${getTelephoneComplet()}`} className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold px-2 py-1 rounded text-[9.5px] flex items-center gap-1 transition" title="Appeler">📞 Appel</a>
                      <a href={`sms:${getTelephoneComplet()}`} className="bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-bold px-2 py-1 rounded text-[9.5px] flex items-center gap-1 transition" title="SMS">💬 SMS</a>
                      <a href={`https://wa.me/${obtenirNumWhatsapp(getTelephoneComplet())}`} target="_blank" rel="noopener noreferrer" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold px-2.5 py-1 rounded text-[9.5px] flex items-center gap-1 transition" title="WhatsApp">
                        <svg className="w-3.5 h-3.5 inline fill-current text-emerald-600" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
                        WhatsApp
                      </a>
                    </>
                  )}
                  {nouveauFournisseur.email && (
                    <a href={`mailto:${nouveauFournisseur.email}`} className="bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300 font-bold px-2 py-1 rounded text-[9.5px] flex items-center gap-1 transition" title="Email">📧 Email</a>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {fournisseurEnEdition && (
                    <button
                      type="button"
                      onClick={supprimerFournisseur}
                      className="bg-red-600 hover:bg-red-700 text-white font-black px-2.5 py-1.5 rounded text-[10px] shadow-xs"
                    >
                      🗑️ Supprimer
                    </button>
                  )}
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-1.5 rounded text-[10px] shadow-xs">
                    {fournisseurEnEdition ? 'Mettre à jour' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {!afficherForm && (
            <>
              <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                <input
                  type="text"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder={`Rechercher par nom ou téléphone [${moduleActuel}]...`}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-extrabold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-xs"
                />
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-700 px-1 font-black">
                <span>Répertoire : <strong>{fournisseursFiltres.length}</strong> fournisseur(s)</span>
              </div>

              {chargement ? (
                <div className="p-4 text-center text-slate-500 font-bold">Chargement...</div>
              ) : fournisseursFiltres.length === 0 ? (
                <div className="p-4 text-center text-slate-500 bg-white border border-slate-200 rounded-xl font-bold">
                  Aucun fournisseur enregistré pour le module {moduleActuel}.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                  <table className="w-full text-left text-xs table-fixed">
                    <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 uppercase text-[9px] font-black select-none">
                      <tr>
                        <th onClick={() => gererTri('nom_fournisseur')} className="p-2.5 w-[70%] cursor-pointer hover:bg-slate-200 transition">
                          Nom / Raison Sociale {rendreFlecheTri('nom_fournisseur')}
                        </th>
                        <th onClick={() => gererTri('solde_dette')} className="p-2.5 w-[30%] text-right cursor-pointer hover:bg-slate-200 transition whitespace-nowrap">
                          Solde Dette {rendreFlecheTri('solde_dette')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[10.5px]">
                      {fournisseursFiltres.map((f) => {
                        const soldeDetteCalcule = calculerSoldeDetteFournisseur(f);
                        return (
                          <tr 
                            key={f.id} 
                            onClick={() => ouvrirEdition(f)}
                            className="hover:bg-orange-50/70 cursor-pointer transition select-none"
                            title="Cliquer pour modifier"
                          >
                            <td className="p-2.5 font-black text-slate-900 truncate">{f.nom_fournisseur}</td>
                            <td className="p-2.5 text-right font-black text-red-600 whitespace-nowrap">
                              {soldeDetteCalcule.toLocaleString('fr-FR')} F
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
        </>
      )}

      {ongletActif === 'historique' && (
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
          <h4 className="font-black text-slate-900 text-xs uppercase flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
            <span>🔍</span> HISTORIQUE FOURNISSEUR [{moduleActuel}]
          </h4>

          <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div>
              <label className="block font-black text-slate-700 mb-0.5 text-[9px] uppercase">Fournisseur *</label>
              <select
                value={fournisseurHistoriqueId}
                onChange={(e) => setFournisseurHistoriqueId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-slate-900 text-xs shadow-xs"
              >
                {fournisseurs.map((f) => (
                  <option key={f.id} value={f.id}>🏢 {f.nom_fournisseur}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-black text-slate-700 mb-0.5 text-[9px] uppercase">Date Début :</label>
                <input
                  type="date"
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-xs shadow-xs"
                />
              </div>

              <div>
                <label className="block font-black text-slate-700 mb-0.5 text-[9px] uppercase">Date Fin :</label>
                <input
                  type="date"
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-xs shadow-xs"
                />
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 p-2.5 rounded-xl flex justify-between items-center text-[10px]">
            <span className="font-black text-slate-900 uppercase">
              🏢 FOURNISSEUR : {fournisseurSelectionneObj ? fournisseurSelectionneObj.nom_fournisseur : 'Aucun'}
            </span>
            <span className="font-extrabold text-slate-700">{resultatHistorique.lignes.length} facture(s)</span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
            <table className="w-full text-left text-xs table-fixed">
              <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 uppercase text-[9px] font-black select-none">
                <tr>
                  <th onClick={() => gererTriHistorique('date')} className="p-2.5 w-[25%] cursor-pointer hover:bg-slate-200 transition">
                    Date {rendreFlecheTriHistorique('date')}
                  </th>
                  <th onClick={() => gererTriHistorique('numeroFacture')} className="p-2.5 w-[30%] cursor-pointer hover:bg-slate-200 transition font-mono">
                    N° Facture {rendreFlecheTriHistorique('numeroFacture')}
                  </th>
                  <th onClick={() => gererTriHistorique('montant')} className="p-2.5 w-[25%] cursor-pointer hover:bg-slate-200 transition">
                    Montant {rendreFlecheTriHistorique('montant')}
                  </th>
                  <th onClick={() => gererTriHistorique('statut')} className="p-2.5 w-[20%] text-center cursor-pointer hover:bg-slate-200 transition">
                    Statut {rendreFlecheTriHistorique('statut')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[10px]">
                {resultatHistorique.lignes.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-4 text-center text-slate-500 font-bold">Aucun historique d'achat pour le module {moduleActuel}.</td>
                  </tr>
                ) : (
                  resultatHistorique.lignes.map((ligne, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => setFactureSelectionnee(ligne.dataOrigine)}
                      className="hover:bg-orange-50/70 cursor-pointer transition select-none"
                      title="Cliquer pour ouvrir la facture"
                    >
                      <td className="p-2.5 text-slate-800 font-mono font-bold">{new Date(ligne.date).toLocaleDateString('fr-FR')}</td>
                      <td className="p-2.5 font-mono font-black text-orange-600 truncate">{ligne.numeroFacture}</td>
                      <td className="p-2.5 font-black text-slate-900">{ligne.montant.toLocaleString('fr-FR')} F</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded font-black text-[9px] ${
                          ligne.statut === 'Soldé' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {ligne.statut}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-emerald-700 text-white p-3 rounded-xl flex justify-between items-center shadow-xs">
            <span className="font-black text-[10px] uppercase tracking-wider">SOLDE GLOBAL DU COMPTE :</span>
            <span className="text-xs font-black text-white font-mono">
              {resultatHistorique.soldeGlobal.toLocaleString('fr-FR')} F CFA
            </span>
          </div>
        </div>
      )}

      {factureSelectionnee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-3 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black text-xs uppercase">📄 FACTURE FOURNISSEUR [{moduleActuel}]</h3>
                <p className="text-[10px] text-orange-400 font-mono font-extrabold">
                  N° {factureSelectionnee.numero_bon || factureSelectionnee.numero_commande || 'FACTURE'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFactureSelectionnee(null)}
                className="text-slate-300 hover:text-white font-black text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3 overflow-y-auto flex-1 space-y-2 text-[10.5px] bg-slate-50">
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-left text-xs table-fixed">
                  <thead className="bg-slate-100 border-b border-slate-200 text-[9px] uppercase font-black text-slate-800">
                    <tr>
                      <th className="p-2 w-[45%]">Article</th>
                      <th className="p-2 w-[15%] text-center">Qté</th>
                      <th className="p-2 w-[20%] text-right">P.U</th>
                      <th className="p-2 w-[20%] text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[10px]">
                    {obtenirLignesFactureDetail(factureSelectionnee).map((line, i) => (
                      <tr key={i}>
                        <td className="p-2 font-black text-slate-900 truncate">{line.designation}</td>
                        <td className="p-2 text-center font-black text-orange-600">{line.qte}</td>
                        <td className="p-2 text-right font-bold text-slate-800">{line.prixUnitaire.toLocaleString('fr-FR')}</td>
                        <td className="p-2 text-right font-black text-emerald-700">{line.sousTotal.toLocaleString('fr-FR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(() => {
                const totauxFacture = calculerTotauxFacture(factureSelectionnee);

                return (
                  <div className="bg-white border border-slate-200 p-3 rounded-xl space-y-2 shadow-xs">
                    <div className="flex justify-between text-[10px] font-black">
                      <span className="text-slate-700">Total : {totauxFacture.montantTotal.toLocaleString('fr-FR')} F</span>
                      <span className="text-emerald-700">Payé : {totauxFacture.montantRegle.toLocaleString('fr-FR')} F</span>
                      <span className="text-red-700">Reste : {totauxFacture.resteAPayer.toLocaleString('fr-FR')} F</span>
                    </div>

                    {totauxFacture.resteAPayer > 0 && (
                      <form onSubmit={enregistrerReglementFacture} className="flex gap-2 pt-1 border-t border-slate-100">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Montant règlement / avance"
                          value={montantReglementSaisi}
                          onChange={(e) => setMontantReglementSaisi(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded p-1.5 text-[10px] font-extrabold text-slate-900 shadow-xs"
                          required
                        />
                        <button
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3 py-1.5 rounded text-[10px] shrink-0 shadow-xs"
                        >
                          Valider Règlement
                        </button>
                      </form>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="p-3 bg-white border-t border-slate-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-slate-800 hover:bg-slate-900 text-white font-black px-3 py-1.5 rounded text-[10px] shadow-xs"
              >
                🖨️ Imprimer
              </button>
              <button
                type="button"
                onClick={() => setFactureSelectionnee(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded text-[10px]"
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