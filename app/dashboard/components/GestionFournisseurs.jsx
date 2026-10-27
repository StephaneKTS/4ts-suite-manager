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
  const [partenaires, setPartenaires] = useState([]);
  const [approvisionnements, setApprovisionnements] = useState([]);
  const [bonsCommandes, setBonsCommandes] = useState([]);
  const [articles, setArticles] = useState([]);
  const [depots, setDepots] = useState([]);
  const [chargement, setChargement] = useState(false);
  
  const [ongletActif, setOngletActif] = useState('repertoire');

  const [limitePartenaires, setLimitePartenaires] = useState(20);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);

  const [triCol, setTriCol] = useState('nom_fournisseur');
  const [triOrdre, setTriOrdre] = useState('asc');

  const [triHistCol, setTriHistCol] = useState('date');
  const [triHistOrdre, setTriHistOrdre] = useState('asc');

  const [partenaireHistoriqueId, setPartenaireHistoriqueId] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [factureSelectionnee, setFactureSelectionnee] = useState(null);
  const [montantReglementSaisi, setMontantReglementSaisi] = useState('');

  const [afficherForm, setAfficherForm] = useState(false);
  const [partenaireEnEdition, setPartenaireEnEdition] = useState(null);
  const [recherche, setRecherche] = useState('');

  const [roleNom, setRoleNom] = useState('');
  const [permissions, setPermissions] = useState({
    peutVoir: true,
    peutCreer: true,
    peutModifier: true,
    peutSuppression: true,
  });

  const [nouveauPartenaire, setNouveauPartenaire] = useState({
    nom_fournisseur: '',
    statut_stockage: 'AVEC_STOCKAGE',
    pays: 'cmr',
    telephone: '',
    email: '',
    adresse: '',
    solde_dette: 0,
    id_depot: '',
  });

  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();
  const estModeLivraison = moduleActuel === 'LIVRAISON';
  const libelleEntite = estModeLivraison ? 'PARTENAIRES' : 'FOURNISSEURS';

  const chargerPermissionsEtDonnees = async () => {
    setChargement(true);
    try {
      const utilisateurConnecteStr = localStorage.getItem('utilisateur_connecte');
      if (utilisateurConnecteStr) {
        try {
          const userObj = JSON.parse(utilisateurConnecteStr);
          const nomRoleUser = (userObj.nom_role || userObj.role || '').trim().toUpperCase();
          setRoleNom(nomRoleUser);
        } catch (e) {
          setRoleNom(utilisateurConnecteStr.trim().toUpperCase());
        }
      }

      let listPartenaires = [];
      const { data: partenairesRpc, error: rpcError } = await supabase.rpc('recuperer_fournisseurs', {
        p_entreprise_id: entrepriseId,
        p_module: moduleActuel
      });

      if (rpcError) {
        const { data: dataPartenaires, error: errPartenaires } = await supabase
          .from('fournisseurs')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .eq('module', moduleActuel)
          .order('created_at', { ascending: false });

        if (errPartenaires) throw errPartenaires;
        listPartenaires = dataPartenaires || [];
      } else {
        listPartenaires = partenairesRpc || [];
      }

      setPartenaires(listPartenaires);

      if (listPartenaires.length > 0 && !partenaireHistoriqueId) {
        setPartenaireHistoriqueId(listPartenaires[0].id);
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
    chargerPermissionsEtDonnees();
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

  const calculerSoldeDettePartenaire = (partenaire) => {
    if (!partenaire) return 0;
    const partId = partenaire.id;
    const partNom = (partenaire.nom_fournisseur || partenaire.nom || '').trim().toUpperCase();

    let totalDetteAppro = 0;
    approvisionnements.forEach((app) => {
      const matchId = String(app.id_fournisseur) === String(partId);
      const matchNom = String(app.nom_fournisseur || app.fournisseur || '').trim().toUpperCase() === partNom;

      if (matchId || matchNom) {
        const totaux = calculerTotauxFacture(app);
        totalDetteAppro += totaux.resteAPayer;
      }
    });

    return Math.max(0, totalDetteAppro);
  };

  const enregistrerPartenaire = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;

    const paysObj = LISTE_PAYS.find(p => p.code === nouveauPartenaire.pays) || LISTE_PAYS[0];
    const chiffresPur = (nouveauPartenaire.telephone || '').replace(/[^0-9]/g, '');

    if (chiffresPur.length > 0 && chiffresPur.length !== paysObj.longueur) {
      alert(`⚠️ Numéro invalide pour ${paysObj.code}. Le numéro doit comporter exactement ${paysObj.longueur} chiffres.`);
      return;
    }

    const numeroComplet = chiffresPur ? `${paysObj.indicatif}${chiffresPur}` : '';
    const nomPartenaireClean = (nouveauPartenaire.nom_fournisseur || '').trim().toUpperCase();
    const nomDepotAssocie = (nouveauPartenaire.id_depot || nomPartenaireClean).trim().toUpperCase();

    setEnTrainDeSauvegarder(true);
    try {
      let depotIdFinal = nouveauPartenaire.id_depot;

      if (nouveauPartenaire.statut_stockage === 'AVEC_STOCKAGE') {
        const payloadNouveauDepot = {
          id_entreprise: entrepriseId,
          module: moduleActuel,
          nom_depot: nomDepotAssocie,
          adresse_localisation: (nouveauPartenaire.adresse || 'PRINCIPALE').toUpperCase(),
          responsable_depot: nomPartenaireClean,
          est_depot_par_defaut: false,
        };

        const { data: depotCree, error: errDepot } = await supabase
          .from('depots_stock')
          .insert([payloadNouveauDepot])
          .select()
          .maybeSingle();

        if (errDepot) throw errDepot;
        if (depotCree) {
          depotIdFinal = depotCree.id;
        }
      }

      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        nom_fournisseur: nomPartenaireClean,
        statut_stockage: nouveauPartenaire.statut_stockage,
        id_depot: nouveauPartenaire.statut_stockage === 'AVEC_STOCKAGE' ? depotIdFinal : null,
        pays: nouveauPartenaire.pays,
        telephone: numeroComplet,
        email: (nouveauPartenaire.email || '').trim().toLowerCase(),
        adresse: (nouveauPartenaire.adresse || '').trim().toUpperCase(),
      };

      if (partenaireEnEdition) {
        let { error } = await supabase
          .from('fournisseurs')
          .update(payload)
          .eq('id', partenaireEnEdition.id);

        if (error && error.message.includes('statut_stockage')) {
          delete payload.statut_stockage;
          const resSecours = await supabase.from('fournisseurs').update(payload).eq('id', partenaireEnEdition.id);
          if (resSecours.error) throw resSecours.error;
        } else if (error) {
          throw error;
        }

        alert(`Mise à jour réussie !`);
      } else {
        let { error } = await supabase.from('fournisseurs').insert([
          {
            ...payload,
            solde_dette: 0,
          },
        ]);

        if (error && error.message.includes('statut_stockage')) {
          delete payload.statut_stockage;
          const resSecours = await supabase.from('fournisseurs').insert([{ ...payload, solde_dette: 0 }]);
          if (resSecours.error) throw resSecours.error;
        } else if (error) {
          throw error;
        }

        alert(`Enregistrement et création du dépôt associés réussis !`);
      }

      annulerForm();
      await chargerPermissionsEtDonnees();
    } catch (err) {
      alert('Erreur : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const ouvrirEdition = (partenaire) => {
    if (enTrainDeSauvegarder) return;
    setPartenaireEnEdition(partenaire);
    const soldeCalcule = calculerSoldeDettePartenaire(partenaire);
    
    let telLocal = partenaire.telephone || '';
    const paysTrouve = LISTE_PAYS.find(p => partenaire.telephone && partenaire.telephone.startsWith(p.indicatif)) || LISTE_PAYS[0];
    if (partenaire.telephone && partenaire.telephone.startsWith(paysTrouve.indicatif)) {
      telLocal = partenaire.telephone.replace(paysTrouve.indicatif, '');
    }

    setNouveauPartenaire({
      nom_fournisseur: partenaire.nom_fournisseur || partenaire.nom || '',
      statut_stockage: partenaire.statut_stockage || 'AVEC_STOCKAGE',
      pays: partenaire.pays || paysTrouve.code,
      telephone: telLocal.replace(/[^0-9]/g, ''),
      email: (partenaire.email || '').toLowerCase(),
      adresse: partenaire.adresse || '',
      solde_dette: soldeCalcule,
      id_depot: partenaire.id_depot || '',
    });
    setAfficherForm(true);
  };

  const annulerForm = () => {
    if (enTrainDeSauvegarder) return;
    setPartenaireEnEdition(null);
    setNouveauPartenaire({
      nom_fournisseur: '',
      statut_stockage: 'AVEC_STOCKAGE',
      pays: 'cmr',
      telephone: '',
      email: '',
      adresse: '',
      solde_dette: 0,
      id_depot: '',
    });
    setAfficherForm(false);
  };

  const supprimerPartenaire = async () => {
    if (enTrainDeSauvegarder || !partenaireEnEdition) return;

    setEnTrainDeSauvegarder(true);
    try {
      const partenaireIdStr = String(partenaireEnEdition.id);
      const partenaireNomStr = String(partenaireEnEdition.nom_fournisseur || partenaireEnEdition.nom || '').trim().toUpperCase();

      const [resAppro, resBC] = await Promise.all([
        supabase.from('approvisionnements').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('bons_commande_fournisseurs').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel)
      ]);

      if (resAppro.error) throw resAppro.error;
      if (resBC.error) throw resBC.error;

      const approDb = resAppro.data || [];
      const bcDb = resBC.data || [];

      const approRattaches = approDb.filter((app) => {
        const idFournApp = String(app.id_fournisseur || '');
        const nomFournApp = String(app.nom_fournisseur || app.fournisseur || '').trim().toUpperCase();
        return idFournApp === partenaireIdStr || (partenaireNomStr !== '' && nomFournApp === partenaireNomStr);
      });

      const bcRattaches = bcDb.filter((bc) => {
        const idFournBc = String(bc.id_fournisseur || '');
        const nomFournBc = String(bc.nom_fournisseur || bc.fournisseur || '').trim().toUpperCase();
        return idFournBc === partenaireIdStr || (partenaireNomStr !== '' && nomFournBc === partenaireNomStr);
      });

      const totalOperations = approRattaches.length + bcRattaches.length;

      if (totalOperations > 0) {
        alert(`❌ SUPPRESSION BLOQUÉE : Cet élément ("${partenaireNomStr}") possède déjà ${totalOperations} opération(s) enregistrée(s). Impossible de le supprimer.`);
        setEnTrainDeSauvegarder(false);
        return;
      }

      if (!confirm(`Voulez-vous vraiment supprimer définitivement "${partenaireNomStr}" ?`)) {
        setEnTrainDeSauvegarder(false);
        return;
      }

      const { error } = await supabase.from('fournisseurs').delete().eq('id', partenaireEnEdition.id);
      if (error) throw error;

      alert('Suppression effectuée avec succès.');
      annulerForm();
      await chargerPermissionsEtDonnees();
    } catch (err) {
      alert('Erreur : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const gererSaisieTelephone = (e) => {
    const chiffres = e.target.value.replace(/[^0-9]/g, '');
    setNouveauPartenaire({ ...nouveauPartenaire, telephone: chiffres });
  };

  const getTelephoneComplet = () => {
    const paysObj = LISTE_PAYS.find(p => p.code === nouveauPartenaire.pays) || LISTE_PAYS[0];
    return `${paysObj.indicatif}${nouveauPartenaire.telephone || ''}`;
  };

  const obtenirNumWhatsapp = (tel) => {
    if (!tel) return '';
    return tel.replace(/[^0-9]/g, '');
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

  const gererTriHistorique = (colonne) => {
    if (enTrainDeSauvegarder) return;
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

  const partenairesFiltres = partenaires
    .filter((f) => {
      const nom = (f.nom_fournisseur || f.nom || '').toLowerCase();
      const tel = (f.telephone || '').toLowerCase();
      const query = recherche.toLowerCase();
      return nom.includes(query) || tel.includes(query);
    })
    .sort((a, b) => {
      let valA = '';
      let valB = '';

      if (triCol === 'nom_fournisseur') {
        valA = a.nom_fournisseur || a.nom || '';
        valB = b.nom_fournisseur || b.nom || '';
      } else if (triCol === 'solde_dette') {
        valA = Number(calculerSoldeDettePartenaire(a));
        valB = Number(calculerSoldeDettePartenaire(b));
      }

      if (valA < valB) return triOrdre === 'asc' ? -1 : 1;
      if (valA > valB) return triOrdre === 'asc' ? 1 : -1;
      return 0;
    });

  const partenairesAffiches = partenairesFiltres.slice(0, limitePartenaires);

  const obtenirHistoriquePartenaire = () => {
    if (!partenaireHistoriqueId) return { lignes: [], soldeGlobal: 0 };
    const partObj = partenaires.find(f => String(f.id) === String(partenaireHistoriqueId));
    if (!partObj) return { lignes: [], soldeGlobal: 0 };

    const partId = partObj.id;
    const partNom = (partObj.nom_fournisseur || partObj.nom || '').trim().toUpperCase();

    let operations = [];

    approvisionnements.forEach((app) => {
      const matchId = String(app.id_fournisseur) === String(partId);
      const matchNom = String(app.nom_fournisseur || app.fournisseur || '').trim().toUpperCase() === partNom;

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

  const partenaireSelectionneObj = partenaires.find(f => String(f.id) === String(partenaireHistoriqueId));
  const resultatHistorique = obtenirHistoriquePartenaire();

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
    if (enTrainDeSauvegarder) return;
    if (!factureSelectionnee || !montantReglementSaisi) return;
    const montantAvance = parseFloat(montantReglementSaisi);
    if (isNaN(montantAvance) || montantAvance <= 0) {
      alert('⚠️ Veuillez entrer un montant valide.');
      return;
    }

    setEnTrainDeSauvegarder(true);
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
      await chargerPermissionsEtDonnees();
    } catch (err) {
      alert('Erreur : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const obtenirNomDepot = (depotId) => {
    if (!depotId) return 'Aucun';
    const d = depots.find(item => String(item.id) === String(depotId));
    return d ? d.nom_depot || d.code_depot : 'Non assigné';
  };

  const paysActuelObj = LISTE_PAYS.find(p => p.code === nouveauPartenaire.pays) || LISTE_PAYS[0];

  return (
    <div className="space-y-2.5 text-[11px] font-sans">
      
      <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-slate-900 uppercase text-xs flex items-center gap-1.5">
            <span>🏢</span> GESTION DES {libelleEntite} ({partenairesAffiches.length} / {partenairesFiltres.length})
          </h3>
          {roleNom && (
            <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold border border-slate-200">
              Rôle : {roleNom}
            </span>
          )}
        </div>
        <button
          type="button"
          disabled={enTrainDeSauvegarder}
          onClick={() => {
            if (enTrainDeSauvegarder) return;
            if (afficherForm) {
              annulerForm();
            } else {
              setNouveauPartenaire({ nom_fournisseur: '', statut_stockage: 'AVEC_STOCKAGE', pays: 'cmr', telephone: '', email: '', adresse: '', solde_dette: 0, id_depot: '' });
              setPartenaireEnEdition(null);
              setAfficherForm(true);
            }
          }}
          className="bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-2xs text-xs"
        >
          {afficherForm ? '✖' : 'Nouveau'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
        <button
          type="button"
          disabled={enTrainDeSauvegarder}
          onClick={() => { if (!enTrainDeSauvegarder) setOngletActif('repertoire'); }}
          className={`py-1.5 px-3 rounded-lg font-bold transition text-center ${
            ongletActif === 'repertoire' ? 'bg-orange-600 text-white shadow-2xs' : 'bg-white text-slate-800 hover:bg-slate-50'
          }`}
        >
          🤝 {libelleEntite} ({partenaires.length})
        </button>
        <button
          type="button"
          disabled={enTrainDeSauvegarder}
          onClick={() => { if (!enTrainDeSauvegarder) setOngletActif('historique'); }}
          className={`py-1.5 px-3 rounded-lg font-bold transition text-center ${
            ongletActif === 'historique' ? 'bg-orange-600 text-white shadow-2xs' : 'bg-white text-slate-800 hover:bg-slate-50'
          }`}
        >
          🔍 Historique
        </button>
      </div>

      {ongletActif === 'repertoire' && (
        <>
          {afficherForm && (
            <form onSubmit={enregistrerPartenaire} className="bg-white border-2 border-orange-500/50 p-3 rounded-xl space-y-2.5 shadow-md">
              <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                <h4 className="font-extrabold text-orange-600 uppercase text-[10px]">
                  {partenaireEnEdition ? `✏️ Fiche du ${estModeLivraison ? 'partenaire' : 'fournisseur'}` : `➕ Nouveau ${estModeLivraison ? 'partenaire' : 'fournisseur'}`}
                </h4>
                <button
                  type="button"
                  disabled={enTrainDeSauvegarder}
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
                    disabled={enTrainDeSauvegarder}
                    value={nouveauPartenaire.nom_fournisseur}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setNouveauPartenaire({ 
                        ...nouveauPartenaire, 
                        nom_fournisseur: val, 
                        id_depot: !nouveauPartenaire.id_depot || nouveauPartenaire.id_depot === nouveauPartenaire.nom_fournisseur ? val : nouveauPartenaire.id_depot 
                      });
                    }}
                    placeholder="EX: SARL FESCO"
                    className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold uppercase text-slate-900 text-xs shadow-xs"
                  />
                </div>

                <div>
                  <label className="block font-black mb-1 text-[9px] text-slate-700 uppercase">Statut (Gestion du stock) *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className={`flex items-center gap-2 p-2 rounded border cursor-pointer font-extrabold text-xs transition ${
                      nouveauPartenaire.statut_stockage === 'AVEC_STOCKAGE' 
                        ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-xs' 
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="statut_stockage"
                        value="AVEC_STOCKAGE"
                        checked={nouveauPartenaire.statut_stockage === 'AVEC_STOCKAGE'}
                        onChange={(e) => setNouveauPartenaire({ ...nouveauPartenaire, statut_stockage: e.target.value, id_depot: nouveauPartenaire.nom_fournisseur })}
                        disabled={enTrainDeSauvegarder}
                        className="accent-orange-600 w-4 h-4 cursor-pointer"
                      />
                      <span>📦 Avec Stockage</span>
                    </label>

                    <label className={`flex items-center gap-2 p-2 rounded border cursor-pointer font-extrabold text-xs transition ${
                      nouveauPartenaire.statut_stockage === 'SANS_STOCKAGE' 
                        ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-xs' 
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="statut_stockage"
                        value="SANS_STOCKAGE"
                        checked={nouveauPartenaire.statut_stockage === 'SANS_STOCKAGE'}
                        onChange={(e) => setNouveauPartenaire({ ...nouveauPartenaire, statut_stockage: e.target.value, id_depot: '' })}
                        disabled={enTrainDeSauvegarder}
                        className="accent-orange-600 w-4 h-4 cursor-pointer"
                      />
                      <span>🚚 Sans Stockage</span>
                    </label>
                  </div>
                </div>

                {nouveauPartenaire.statut_stockage === 'AVEC_STOCKAGE' && (
                  <div>
                    <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">DÉPÔT ASSOCIÉ</label>
                    <input
                      type="text"
                      disabled={enTrainDeSauvegarder}
                      value={nouveauPartenaire.id_depot}
                      onChange={(e) => setNouveauPartenaire({ ...nouveauPartenaire, id_depot: e.target.value.toUpperCase() })}
                      placeholder="EX: NOM DU DEPOT"
                      className="w-full bg-white border border-orange-300 rounded p-1.5 font-extrabold text-orange-700 text-xs shadow-xs uppercase"
                    />
                  </div>
                )}

                {partenaireEnEdition && (
                  <div>
                    <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Solde Dette</label>
                    <input
                      type="text"
                      disabled
                      value={`${Number(nouveauPartenaire.solde_dette || 0).toLocaleString('fr-FR')} F`}
                      className="w-full bg-slate-100 text-red-700 border border-slate-300 rounded p-1.5 font-black text-xs cursor-not-allowed"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Adresse</label>
                  <input
                    type="text"
                    disabled={enTrainDeSauvegarder}
                    value={nouveauPartenaire.adresse}
                    onChange={(e) => setNouveauPartenaire({ ...nouveauPartenaire, adresse: e.target.value.toUpperCase() })}
                    placeholder="EX: DOUALA - AKWA"
                    className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold uppercase text-slate-900 text-xs shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-200">
                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Pays *</label>
                  <select
                    disabled={enTrainDeSauvegarder}
                    value={nouveauPartenaire.pays}
                    onChange={(e) => setNouveauPartenaire({ ...nouveauPartenaire, pays: e.target.value })}
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
                      disabled={enTrainDeSauvegarder}
                      maxLength={paysActuelObj.longueur}
                      value={nouveauPartenaire.telephone}
                      onChange={gererSaisieTelephone}
                      placeholder="6XXXXXXXX"
                      className="w-full p-1.5 font-mono text-[11px] font-extrabold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Email (minuscules)</label>
                <input
                  type="email"
                  disabled={enTrainDeSauvegarder}
                  value={nouveauPartenaire.email}
                  onChange={(e) => setNouveauPartenaire({ ...nouveauPartenaire, email: e.target.value.toLowerCase() })}
                  placeholder="contact@email.com"
                  className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold lowercase text-slate-900 text-[11px] shadow-xs placeholder:text-slate-400"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex flex-wrap justify-between items-center gap-1.5">
                <div className="flex items-center gap-1 flex-wrap">
                  {nouveauPartenaire.telephone && nouveauPartenaire.telephone.length === paysActuelObj.longueur && (
                    <>
                      <a href={`tel:${getTelephoneComplet()}`} className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold px-2 py-1 rounded text-[9.5px] flex items-center gap-1 transition" title="Appeler">📞 Appel</a>
                      <a href={`sms:${getTelephoneComplet()}`} className="bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 font-bold px-2 py-1 rounded text-[9.5px] flex items-center gap-1 transition" title="SMS">💬 SMS</a>
                      <a href={`https://wa.me/${obtenirNumWhatsapp(getTelephoneComplet())}`} target="_blank" rel="noopener noreferrer" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold px-2.5 py-1 rounded text-[9.5px] flex items-center gap-1 transition" title="WhatsApp">
                        WhatsApp
                      </a>
                    </>
                  )}
                  {nouveauPartenaire.email && (
                    <a href={`mailto:${nouveauPartenaire.email}`} className="bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300 font-bold px-2 py-1 rounded text-[9.5px] flex items-center gap-1 transition" title="Email">📧 Email</a>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {partenaireEnEdition && (
                    <button
                      type="button"
                      disabled={enTrainDeSauvegarder}
                      onClick={supprimerPartenaire}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-black px-3 py-1.5 rounded text-[10px] shadow-xs transition"
                    >
                      {enTrainDeSauvegarder ? 'Patientez...' : '🗑️ Supprimer'}
                    </button>
                  )}
                  <button type="submit" disabled={enTrainDeSauvegarder} className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-black px-4 py-1.5 rounded text-[10px] shadow-xs transition">
                    {enTrainDeSauvegarder ? 'Enregistrement...' : (partenaireEnEdition ? 'Mettre à jour' : 'Enregistrer')}
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
                  disabled={enTrainDeSauvegarder}
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value.toUpperCase())}
                  placeholder="RECHERCHER PAR NOM OU TÉLÉPHONE..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-extrabold uppercase text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-xs placeholder:text-slate-400"
                />
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-700 px-1 font-black">
                <span>Répertoire : <strong>{partenairesAffiches.length} / {partenairesFiltres.length}</strong> affiché(s)</span>
              </div>

              {chargement ? (
                <div className="p-4 text-center text-slate-500 font-bold">Chargement...</div>
              ) : partenairesAffiches.length === 0 ? (
                <div className="p-4 text-center text-slate-500 bg-white border border-slate-200 rounded-xl font-bold">
                  Aucun élément enregistré.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                    <table className="w-full text-left text-xs table-fixed">
                      <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 uppercase text-[9px] font-black select-none">
                        <tr>
                          <th onClick={() => !enTrainDeSauvegarder && gererTri('nom_fournisseur')} className="p-2.5 w-[40%] cursor-pointer hover:bg-slate-200 transition">
                            Nom / Raison Sociale {rendreFlecheTri('nom_fournisseur')}
                          </th>
                          <th className="p-2.5 w-[30%]">Statut Stock</th>
                          <th onClick={() => !enTrainDeSauvegarder && gererTri('solde_dette')} className="p-2.5 w-[30%] text-right cursor-pointer hover:bg-slate-200 transition whitespace-nowrap">
                            Solde Dette {rendreFlecheTri('solde_dette')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[10.5px]">
                        {partenairesAffiches.map((f) => {
                          const nomP = f.nom_fournisseur || f.nom || '';
                          const soldeDetteCalcule = calculerSoldeDettePartenaire(f);
                          const estSansStock = f.statut_stockage === 'SANS_STOCKAGE';

                          return (
                            <tr 
                              key={f.id} 
                              onClick={() => !enTrainDeSauvegarder && ouvrirEdition(f)}
                              className="hover:bg-orange-50/70 cursor-pointer transition select-none"
                              title="Cliquer pour modifier"
                            >
                              <td className="p-2.5 font-black uppercase text-slate-900 truncate">{nomP}</td>
                              <td className="p-2.5 whitespace-nowrap">
                                <span className={`px-1.5 py-0.5 rounded font-black text-[9px] ${estSansStock ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                                  {estSansStock ? '🚚 SANS STOCK' : `📦 ${obtenirNomDepot(f.id_depot)}`}
                                </span>
                              </td>
                              <td className="p-2.5 text-right font-black text-red-600 whitespace-nowrap">
                                {soldeDetteCalcule.toLocaleString('fr-FR')} F
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {limitePartenaires < partenairesFiltres.length && (
                    <div className="text-center pt-2 pb-2">
                      <button
                        type="button"
                        disabled={enTrainDeSauvegarder}
                        onClick={() => setLimitePartenaires(prev => prev + 20)}
                        className="bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 font-extrabold px-4 py-2 rounded-xl text-xs transition shadow-xs border border-slate-300 w-full"
                      >
                        📥 Charger 20 de plus ({partenairesFiltres.length - limitePartenaires} restants)
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {ongletActif === 'historique' && (
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
          <h4 className="font-black text-slate-900 text-xs uppercase flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
            <span>🔍</span> HISTORIQUE
          </h4>

          <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div>
              <label className="block font-black text-slate-700 mb-0.5 text-[9px] uppercase">Sélectionner *</label>
              <select
                disabled={enTrainDeSauvegarder}
                value={partenaireHistoriqueId}
                onChange={(e) => setPartenaireHistoriqueId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-slate-900 text-xs shadow-xs"
              >
                {partenaires.map((f) => (
                  <option key={f.id} value={f.id}>🏢 {f.nom_fournisseur || f.nom}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-black text-slate-700 mb-0.5 text-[9px] uppercase">Date Début :</label>
                <input
                  type="date"
                  disabled={enTrainDeSauvegarder}
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-xs shadow-xs"
                />
              </div>

              <div>
                <label className="block font-black text-slate-700 mb-0.5 text-[9px] uppercase">Date Fin :</label>
                <input
                  type="date"
                  disabled={enTrainDeSauvegarder}
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-xs shadow-xs"
                />
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 p-2.5 rounded-xl flex justify-between items-center text-[10px]">
            <span className="font-black text-slate-900 uppercase">
              🏢 SÉLECTION : {partenaireSelectionneObj ? (partenaireSelectionneObj.nom_fournisseur || partenaireSelectionneObj.nom) : 'Aucun'}
            </span>
            <span className="font-extrabold text-slate-700">{resultatHistorique.lignes.length} facture(s)</span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
            <table className="w-full text-left text-xs table-fixed">
              <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 uppercase text-[9px] font-black select-none">
                <tr>
                  <th onClick={() => !enTrainDeSauvegarder && gererTriHistorique('date')} className="p-2.5 w-[25%] cursor-pointer hover:bg-slate-200 transition">
                    Date {rendreFlecheTriHistorique('date')}
                  </th>
                  <th onClick={() => !enTrainDeSauvegarder && gererTriHistorique('numeroFacture')} className="p-2.5 w-[30%] cursor-pointer hover:bg-slate-200 transition font-mono">
                    N° Facture {rendreFlecheTriHistorique('numeroFacture')}
                  </th>
                  <th onClick={() => !enTrainDeSauvegarder && gererTriHistorique('montant')} className="p-2.5 w-[25%] cursor-pointer hover:bg-slate-200 transition">
                    Montant {rendreFlecheTriHistorique('montant')}
                  </th>
                  <th onClick={() => !enTrainDeSauvegarder && gererTriHistorique('statut')} className="p-2.5 w-[20%] text-center cursor-pointer hover:bg-slate-200 transition">
                    Statut {rendreFlecheTriHistorique('statut')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[10px]">
                {resultatHistorique.lignes.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-4 text-center text-slate-500 font-bold">Aucun historique d'achat.</td>
                  </tr>
                ) : (
                  resultatHistorique.lignes.map((ligne, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => !enTrainDeSauvegarder && setFactureSelectionnee(ligne.dataOrigine)}
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
                <h3 className="font-black text-xs uppercase">📄 FACTURE</h3>
                <p className="text-[10px] text-orange-400 font-mono font-extrabold">
                  N° {factureSelectionnee.numero_bon || factureSelectionnee.numero_commande || 'FACTURE'}
                </p>
              </div>
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
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
                        <td className="p-2 font-black uppercase text-slate-900 truncate">{line.designation}</td>
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
                          disabled={enTrainDeSauvegarder}
                          placeholder="Montant règlement / avance"
                          value={montantReglementSaisi}
                          onChange={(e) => setMontantReglementSaisi(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded p-1.5 text-[10px] font-extrabold text-slate-900 shadow-xs"
                          required
                        />
                        <button
                          type="submit"
                          disabled={enTrainDeSauvegarder}
                          className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-black px-3 py-1.5 rounded text-[10px] shrink-0 shadow-xs"
                        >
                          {enTrainDeSauvegarder ? 'Patientez...' : 'Valider Règlement'}
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
                disabled={enTrainDeSauvegarder}
                onClick={() => window.print()}
                className="bg-slate-800 hover:bg-slate-900 text-white font-black px-3 py-1.5 rounded text-[10px] shadow-xs"
              >
                🖨️ Imprimer
              </button>
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
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