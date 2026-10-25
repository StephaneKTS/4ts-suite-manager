'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionJournalCaisse({ entrepriseId = '4TS-TEST', vueInitiale = 'saisie_operations', utilisateurActif = 'THEODORE STEPHANE' }) {
  const [modeSaisie, setModeSaisie] = useState('nouveau');
  const [sousOngletGrandLivreJournal, setSousOngletGrandLivreJournal] = useState('grand_livre');
  const [sousOngletControle, setSousOngletControle] = useState('nouveau_controle');

  // --- ÉTATS JOURNAL / RAPPORT DE CAISSE ---
  const [dateDebutJournal, setDateDebutJournal] = useState(new Date().toISOString().split('T')[0]);
  const [dateFinJournal, setDateFinJournal] = useState(new Date().toISOString().split('T')[0]);
  const [caisseSelectionneeJournal, setCaisseSelectionneeJournal] = useState('');

  // --- ÉTATS DE TRI DU JOURNAL ---
  const [colonneTriJournal, setColonneTriJournal] = useState('created_at');
  const [ordreTriJournal, setOrdreTriJournal] = useState('asc');

  // --- ÉTATS DE TRI DU GRAND LIVRE ---
  const [colonneTriGrandLivre, setColonneTriGrandLivre] = useState('created_at');
  const [ordreTriGrandLivre, setOrdreTriGrandLivre] = useState('asc');

  const [caisses, setCaisses] = useState([]);
  const [comptes, setComptes] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [ventes, setVentes] = useState([]);
  const [commandesLivraison, setCommandesLivraison] = useState([]);
  const [emplacementsStock, setEmplacementsStock] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [etatsCaisseList, setEtatsCaisseList] = useState([]);
  const [chargement, setChargement] = useState(false);

  // --- ÉTATS DE FILTRAGE DES ÉTATS DE CAISSE (PRÉREMPLIS AVEC LA DATE DU JOUR) ---
  const [filtreDateDebut, setFiltreDateDebut] = useState(new Date().toISOString().split('T')[0]);
  const [filtreDateFin, setFiltreDateFin] = useState(new Date().toISOString().split('T')[0]);
  const [filtreCaisseId, setFiltreCaisseId] = useState('');
  const [filtreCaissierId, setFiltreCaissierId] = useState('');

  // --- ÉTATS DE TRI POUR LES ÉTATS DE CAISSE ---
  const [colonneTri, setColonneTri] = useState('date_debut');
  const [ordreTri, setOrdreTri] = useState('desc');

  // --- CONTRÔLE DE CAISSE & LIVRAISON ---
  const [dateControle, setDateControle] = useState(new Date().toISOString().split('T')[0]);
  const [caisseControleId, setCaisseControleId] = useState('');
  const [caissierFiltre, setCaissierFiltre] = useState('');
  const [livreurControle, setLivreurControle] = useState('');
  const [montantVerse, setMontantVerse] = useState('');
  
  const [dernierEtatIdValidé, setDernierEtatIdValidé] = useState(null);
  const [numeroPieceCloture, setNumeroPieceCloture] = useState('');

  // --- SAISIE & MODIFICATION ---
  const [idOperationEnCoursModif, setIdOperationEnCoursModif] = useState(null);
  const [numeroPieceEnCoursModif, setNumeroPieceEnCoursModif] = useState('');
  const [enteteSaisie, setEnteteSaisie] = useState({
    date: new Date().toISOString().split('T')[0],
    id_caisse: '',
    type_mouvement: 'SORTIE',
  });
  const [ligneUnique, setLigneUnique] = useState({
    id_compte: '',
    montant: '',
    piece_physique: ''
  });
  const [utilisateurMotif, setUtilisateurMotif] = useState('');

  // --- GRAND LIVRE : FILTRES AVANCÉS ---
  const [dateDebutLivre, setDateDebutLivre] = useState(new Date().toISOString().split('T')[0]);
  const [dateFinLivre, setDateFinLivre] = useState(new Date().toISOString().split('T')[0]);
  const [compteLivreId, setCompteLivreId] = useState('');
  const [tiersLivreFiltre, setTiersLivreFiltre] = useState('');

  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();

  const chargerDonneesGlobales = async () => {
    setChargement(true);
    try {
      const { data: dataCaisses } = await supabase
        .from('caisses')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);

      setCaisses(dataCaisses || []);

      const caissesPrincipales = (dataCaisses || []).filter(c => (c.nature || '').toUpperCase() === 'PRINCIPALE' || (c.nature || '').toUpperCase() === 'CAISSE ENTREPRISE');
      if (caissesPrincipales.length > 0 && !caisseSelectionneeJournal) {
        setCaisseSelectionneeJournal(caissesPrincipales[0].id);
      }

      const { data: dataComptes } = await supabase
        .from('comptes_comptables')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setComptes(dataComptes || []);

      const { data: dataRoles } = await supabase
        .from('roles')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setRoles(dataRoles || []);

      const { data: dataMvts } = await supabase
        .from('mouvements_caisse')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('created_at', { ascending: true });
      setMouvements(dataMvts || []);

      const { data: dataVentes } = await supabase
        .from('ventes_historiques')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setVentes(dataVentes || []);

      const { data: dataCmdLivr } = await supabase
        .from('commandes_livraison_en_tete')
        .select('*')
        .eq('id_entreprise', entrepriseId);
      setCommandesLivraison(dataCmdLivr || []);

      const { data: dataEmp } = await supabase
        .from('emplacements_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId);
      setEmplacementsStock(dataEmp || []);

      const { data: dataUsers } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('id_entreprise', entrepriseId);
      setUtilisateurs(dataUsers || []);

      const { data: dataEtats } = await supabase
        .from('etats_caisse')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('created_at', { ascending: false });
      setEtatsCaisseList(dataEtats || []);

      const prochainNum = `CL-${(dataEtats || []).length + 1}`;
      setNumeroPieceCloture(prochainNum);

    } catch (err) {
      console.error('Erreur chargement :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonneesGlobales();
  }, [entrepriseId, moduleActuel]);

  const preparerNouvelleCloture = () => {
    setCaisseControleId('');
    setCaissierFiltre('');
    setLivreurControle('');
    setMontantVerse('');
    setDernierEtatIdValidé(null);
    const prochainNum = `CL-${etatsCaisseList.length + 1}`;
    setNumeroPieceCloture(prochainNum);
  };

  const calculerSoldeCaisse = (caisseId) => {
    if (!caisseId) return 0;
    const mvtsCaisse = mouvements.filter(m => String(m.id_caisse) === String(caisseId));
    return mvtsCaisse.reduce((acc, m) => {
      return m.type_mouvement === 'ENTREE' ? acc + Number(m.montant) : acc - Number(m.montant);
    }, 0);
  };

  const enregistrerOperationUnique = async (e) => {
    e.preventDefault();
    if (moduleActuel !== 'LIVRAISON' && !enteteSaisie.id_caisse) {
      alert('Veuillez sélectionner une caisse.');
      return;
    }

    try {
      let libelleFinal = '';
      if (utilisateurMotif) {
        libelleFinal = utilisateurMotif.toUpperCase();
      } else {
        libelleFinal = enteteSaisie.type_mouvement === 'ENTREE' ? 'CHARGE INTERNE' : 'DEPENSE INTERNE';
      }

      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        id_caisse: moduleActuel === 'LIVRAISON' ? (caisses[0]?.id || null) : enteteSaisie.id_caisse,
        type_mouvement: enteteSaisie.type_mouvement,
        montant: Number(ligneUnique.montant),
        libelle: libelleFinal,
        id_compte: ligneUnique.id_compte || null,
        piece_physique: ligneUnique.piece_physique || null,
        created_at: new Date(enteteSaisie.date).toISOString(),
      };

      if (idOperationEnCoursModif) {
        const { error } = await supabase
          .from('mouvements_caisse')
          .update(payload)
          .eq('id', idOperationEnCoursModif);
        if (error) throw error;
        alert('Opération modifiée avec succès !');
        setIdOperationEnCoursModif(null);
        setNumeroPieceEnCoursModif('');
      } else {
        const { error } = await supabase.from('mouvements_caisse').insert([payload]);
        if (error) throw error;
        alert(`Opération enregistrée avec succès par ${utilisateurActif} dans le module ${moduleActuel}.`);
      }

      setLigneUnique({ id_compte: '', montant: '', piece_physique: '' });
      setUtilisateurMotif('');
      chargerDonneesGlobales();
      setModeSaisie('historique');
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const preparerModificationOperation = (mvt, indexMvt) => {
    setIdOperationEnCoursModif(mvt.id);
    let pieceCalc = mvt.piece_physique || `PC-${String(indexMvt + 1).padStart(2, '0')}`;
    setNumeroPieceEnCoursModif(pieceCalc);

    setEnteteSaisie({
      date: mvt.created_at ? mvt.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
      id_caisse: mvt.id_caisse || '',
      type_mouvement: mvt.type_mouvement || 'SORTIE',
    });
    setLigneUnique({
      id_compte: mvt.id_compte || '',
      montant: mvt.montant || '',
      piece_physique: mvt.piece_physique || ''
    });
    setUtilisateurMotif(mvt.libelle && !['DEPENSE INTERNE', 'CHARGE INTERNE'].includes(mvt.libelle) ? mvt.libelle : '');
    setModeSaisie('nouveau');
  };

  const supprimerOperation = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette opération ?')) return;
    try {
      const { error } = await supabase
        .from('mouvements_caisse')
        .delete()
        .eq('id', id);
      if (error) throw error;
      alert('Opération supprimée avec succès !');
      setIdOperationEnCoursModif(null);
      setNumeroPieceEnCoursModif('');
      setLigneUnique({ id_compte: '', montant: '', piece_physique: '' });
      setUtilisateurMotif('');
      chargerDonneesGlobales();
      setModeSaisie('historique');
    } catch (err) {
      alert('Erreur lors de la suppression : ' + err.message);
    }
  };

  const caissesPrincipalesPourSaisie = caisses.filter(c => (c.nature || '').toUpperCase() === 'PRINCIPALE' || (c.nature || '').toUpperCase() === 'CAISSE ENTREPRISE');
  const caissesFacturationPourControle = caisses.filter(c => (c.nature || '').toUpperCase() === 'FACTURATION');

  const listeLivreurs = Array.from(new Set([
    ...(commandesLivraison.map(c => c.vendeur_livreur).filter(Boolean)),
    ...(emplacementsStock.map(e => e.nom_emplacement || e.responsable_emplacement).filter(Boolean))
  ])).map(l => l.toUpperCase());

  const obtenirCaissiersFiltres = (caisseIdSelectionnee = '') => {
    return utilisateurs.filter(u => {
      const roleObj = roles.find(r => String(r.id) === String(u.id_role));
      const nomRole = (roleObj?.nom_role || '').toLowerCase();
      const estCaissierRole = nomRole.includes('caissier') || nomRole.includes('caissière');
      const aUneCaisseAttribuee = Boolean(u.id_caisse);

      if (caisseIdSelectionnee) {
        const correspondCaisse = String(u.id_caisse) === String(caisseIdSelectionnee);
        return (estCaissierRole || aUneCaisseAttribuee) && (correspondCaisse || !u.id_caisse);
      }

      return estCaissierRole || aUneCaisseAttribuee;
    });
  };

  const caissiersFiltresControle = obtenirCaissiersFiltres(caisseControleId);
  const caissiersFiltresRecherche = obtenirCaissiersFiltres(filtreCaisseId);

  // --- FILTRAGE DU JOURNAL DE CAISSE / GÉNÉRAL ---
  const mouvementsCaisseSelectionnee = mouvements.filter(m => {
    if (!caisseSelectionneeJournal) return true;
    return String(m.id_caisse) === String(caisseSelectionneeJournal);
  });

  const mouvementsJournalFiltres = mouvementsCaisseSelectionnee.filter(m => {
    const dateMvt = m.created_at ? m.created_at.split('T')[0] : '';
    if (dateDebutJournal && dateMvt < dateDebutJournal) return false;
    if (dateFinJournal && dateMvt > dateFinJournal) return false;
    return true;
  });

  const gererTriJournal = (colonne) => {
    if (colonneTriJournal === colonne) {
      setOrdreTriJournal(ordreTriJournal === 'asc' ? 'desc' : 'asc');
    } else {
      setColonneTriJournal(colonne);
      setOrdreTriJournal('asc');
    }
  };

  const mouvementsJournalTries = [...mouvementsJournalFiltres].sort((a, b) => {
    let valA, valB;

    if (colonneTriJournal === 'created_at') {
      valA = a.created_at || '';
      valB = b.created_at || '';
    } else if (colonneTriJournal === 'piece') {
      valA = a.piece_physique || `PC-${mouvements.indexOf(a)}`;
      valB = b.piece_physique || `PC-${mouvements.indexOf(b)}`;
    } else if (colonneTriJournal === 'caisse') {
      const cA = caisses.find(c => String(c.id) === String(a.id_caisse));
      valA = cA ? cA.nom_caisse : '';
      const cB = caisses.find(c => String(c.id) === String(b.id_caisse));
      valB = cB ? cB.nom_caisse : '';
    } else if (colonneTriJournal === 'compte') {
      const cA = comptes.find(c => String(c.id) === String(a.id_compte));
      valA = cA ? cA.intitule_compte : '';
      const cB = comptes.find(c => String(c.id) === String(b.id_compte));
      valB = cB ? cB.intitule_compte : '';
    } else if (colonneTriJournal === 'libelle') {
      valA = a.libelle || '';
      valB = b.libelle || '';
    }

    if (valA < valB) return ordreTriJournal === 'asc' ? -1 : 1;
    if (valA > valB) return ordreTriJournal === 'asc' ? 1 : -1;
    return 0;
  });

  const totalEntreesJournal = mouvementsJournalTries
    .filter(m => m.type_mouvement === 'ENTREE')
    .reduce((acc, m) => acc + Number(m.montant || 0), 0);

  const totalSortiesJournal = mouvementsJournalTries
    .filter(m => m.type_mouvement === 'SORTIE')
    .reduce((acc, m) => acc + Number(m.montant || 0), 0);

  const soldeJournal = totalEntreesJournal - totalSortiesJournal;

  const mouvementsManuelsFiltres = mouvementsCaisseSelectionnee.filter(m => {
    const lib = (m.libelle || '').toUpperCase();
    if (lib === 'VERSEMENT' || lib.includes('VERSEMENT ÉTAT')) return false;

    const dateMvt = m.created_at ? m.created_at.split('T')[0] : '';
    if (dateDebutJournal && dateMvt < dateDebutJournal) return false;
    if (dateFinJournal && dateMvt > dateFinJournal) return false;
    return true;
  });

  const reportAntérieur = mouvementsCaisseSelectionnee
    .filter(m => {
      const lib = (m.libelle || '').toUpperCase();
      if (lib === 'VERSEMENT' || lib.includes('VERSEMENT ÉTAT')) return false;
      const dateMvt = m.created_at ? m.created_at.split('T')[0] : '';
      return dateDebutJournal && dateMvt < dateDebutJournal;
    })
    .reduce((acc, m) => {
      return m.type_mouvement === 'ENTREE' ? acc + Number(m.montant) : acc - Number(m.montant);
    }, 0);

  const soldeActuelCaisseSelectionnee = calculerSoldeCaisse(caisseSelectionneeJournal);

  const montantAttenduCaisse = moduleActuel === 'LIVRAISON'
    ? (livreurControle
        ? commandesLivraison
            .filter(cmd => {
              if ((cmd.statut_commande || 'EN ATTENTE') !== 'LIVRÉ') return false;
              if (dateControle && cmd.date_commande !== dateControle) return false;
              if (livreurControle && (cmd.vendeur_livreur || '').trim().toUpperCase() !== livreurControle.trim().toUpperCase()) return false;
              return true;
            })
            .reduce((sum, cmd) => sum + (Number(cmd.montant_commande) || 0), 0)
        : 0)
    : (caisseControleId
        ? ventes
            .filter(v => {
              if (String(v.id_caisse) !== String(caisseControleId)) return false;
              const dateVente = v.created_at ? v.created_at.split('T')[0] : '';
              if (dateControle && dateVente !== dateControle) return false;
              if (caissierFiltre && String(v.id_utilisateur || v.vendeur) !== String(caissierFiltre)) return false;
              return true;
            })
            .reduce((sum, v) => sum + (Number(v.total_montant) || 0), 0)
        : 0);

  const ecartCaisse = montantVerse !== '' ? Number(montantVerse) - montantAttenduCaisse : 0;

  const obtenirNomCaissier = (idOuNom) => {
    if (!idOuNom) return '-';
    const utilisateurTrouve = utilisateurs.find(u => String(u.id) === String(idOuNom) || String(u.email) === String(idOuNom));
    if (utilisateurTrouve) {
      return utilisateurTrouve.nom_complet || utilisateurTrouve.email || idOuNom;
    }
    return idOuNom;
  };

  // --- FILTRAGE DYNAMIQUE DU GRAND LIVRE (COMPTE + TIERS) ---
  const resultatGrandLivre = mouvements.filter(m => {
    if (compteLivreId && String(m.id_compte) !== String(compteLivreId)) return false;
    if (tiersLivreFiltre) {
      const libMvt = (m.libelle || '').toUpperCase();
      const tiersCible = tiersLivreFiltre.toUpperCase();
      if (!libMvt.includes(tiersCible)) return false;
    }
    const dateMvt = m.created_at ? m.created_at.split('T')[0] : '';
    if (dateDebutLivre && dateMvt < dateDebutLivre) return false;
    if (dateFinLivre && dateMvt > dateFinLivre) return false;
    return true;
  });

  const gererTriGrandLivre = (colonne) => {
    if (colonneTriGrandLivre === colonne) {
      setOrdreTriGrandLivre(ordreTriGrandLivre === 'asc' ? 'desc' : 'asc');
    } else {
      setColonneTriGrandLivre(colonne);
      setOrdreTriGrandLivre('asc');
    }
  };

  const resultatGrandLivreTries = [...resultatGrandLivre].sort((a, b) => {
    let valA, valB;

    if (colonneTriGrandLivre === 'created_at') {
      valA = a.created_at || '';
      valB = b.created_at || '';
    } else if (colonneTriGrandLivre === 'piece') {
      valA = a.piece_physique || `PC-${mouvements.indexOf(a)}`;
      valB = b.piece_physique || `PC-${mouvements.indexOf(b)}`;
    } else if (colonneTriGrandLivre === 'compte') {
      const cA = comptes.find(c => String(c.id) === String(a.id_compte));
      valA = cA ? cA.intitule_compte : '';
      const cB = comptes.find(c => String(c.id) === String(b.id_compte));
      valB = cB ? cB.intitule_compte : '';
    } else if (colonneTriGrandLivre === 'libelle') {
      valA = a.libelle || '';
      valB = b.libelle || '';
    } else if (colonneTriGrandLivre === 'montant') {
      valA = (a.type_mouvement === 'ENTREE' ? 1 : -1) * Number(a.montant || 0);
      valB = (b.type_mouvement === 'ENTREE' ? 1 : -1) * Number(b.montant || 0);
    }

    if (valA < valB) return ordreTriGrandLivre === 'asc' ? -1 : 1;
    if (valA > valB) return ordreTriGrandLivre === 'asc' ? 1 : -1;
    return 0;
  });

  const totalEntreesGrandLivre = resultatGrandLivreTries
    .filter(m => m.type_mouvement === 'ENTREE')
    .reduce((acc, m) => acc + Number(m.montant || 0), 0);

  const totalSortiesGrandLivre = resultatGrandLivreTries
    .filter(m => m.type_mouvement === 'SORTIE')
    .reduce((acc, m) => acc + Number(m.montant || 0), 0);

  const resultatNetGrandLivre = totalEntreesGrandLivre - totalSortiesGrandLivre;

  const validerFormulaireControle = () => {
    if (moduleActuel === 'LIVRAISON') {
      if (!livreurControle) {
        alert('⚠️ Veuillez obligatoirement sélectionner un livreur.');
        return false;
      }
    } else {
      if (!caisseControleId) {
        alert('⚠️ Veuillez obligatoirement sélectionner une caisse.');
        return false;
      }
      if (!caissierFiltre) {
        alert('⚠️ Veuillez obligatoirement sélectionner un caissier.');
        return false;
      }
    }
    if (montantVerse === '' || isNaN(Number(montantVerse))) {
      alert('⚠️ Veuillez obligatoirement renseigner le montant versé.');
      return false;
    }
    return true;
  };

  const validerClotureCaisse = async () => {
    if (!validerFormulaireControle()) return;
    try {
      const montantV = Number(montantVerse);
      const payloadEtat = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        id_caisse: moduleActuel === 'LIVRAISON' ? null : caisseControleId,
        date_debut: dateControle,
        date_fin: dateControle,
        caissier: moduleActuel === 'LIVRAISON' ? livreurControle : caissierFiltre,
        montant_attendu: montantAttenduCaisse,
        montant_verse: montantV,
        ecart: ecartCaisse,
        statut_versement: 'NON_VERSE',
        responsable: utilisateurActif,
        code_piece: numeroPieceCloture,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from('etats_caisse').insert([payloadEtat]).select().single();
      if (error) throw error;

      alert(`✅ Clôture [${numeroPieceCloture}] du ${dateControle} validée avec succès ! Le bouton "Versement" est désormais actif.`);
      if (data) {
        setDernierEtatIdValidé(data.id);
      }
      chargerDonneesGlobales();
    } catch (err) {
      alert('Erreur lors de la validation : ' + err.message);
    }
  };

  const executerVersementActif = async () => {
    if (!dernierEtatIdValidé) return;
    try {
      const etatConcerne = etatsCaisseList.find(e => String(e.id) === String(dernierEtatIdValidé)) || {
        montant_verse: Number(montantVerse),
        caissier: moduleActuel === 'LIVRAISON' ? livreurControle : caissierFiltre,
        code_piece: numeroPieceCloture
      };

      const caissePrincipale = caissesPrincipalesPourSaisie[0];
      if (!caissePrincipale) {
        alert('Aucune caisse principale trouvée.');
        return;
      }

      const payloadMvt = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        id_caisse: caissePrincipale.id,
        type_mouvement: 'ENTREE',
        montant: Number(etatConcerne.montant_verse),
        libelle: 'VERSEMENT',
        piece_physique: etatConcerne.code_piece || numeroPieceCloture,
        created_at: new Date().toISOString()
      };

      const { error: errMvt } = await supabase.from('mouvements_caisse').insert([payloadMvt]);
      if (errMvt) throw errMvt;

      const { error: errUpdate } = await supabase
        .from('etats_caisse')
        .update({ statut_versement: 'VERSE' })
        .eq('id', dernierEtatIdValidé);

      if (errUpdate) throw errUpdate;

      alert('🚀 Versement effectué avec succès et injecté dans la caisse principale !');
      preparerNouvelleCloture();
      chargerDonneesGlobales();
      setSousOngletControle('etats_caisse');
    } catch (err) {
      alert('Erreur lors du versement : ' + err.message);
    }
  };

  const verserEtatCaisse = async (etat) => {
    try {
      const caissePrincipale = caissesPrincipalesPourSaisie[0];
      if (!caissePrincipale) {
        alert('Aucune caisse principale trouvée.');
        return;
      }

      const numClotureAssocie = etat.code_piece || `CL-${etatsCaisseList.indexOf(etat) + 1}`;

      const payloadMvt = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        id_caisse: caissePrincipale.id,
        type_mouvement: 'ENTREE',
        montant: Number(etat.montant_verse),
        libelle: 'VERSEMENT',
        piece_physique: numClotureAssocie,
        created_at: new Date().toISOString()
      };

      const { error: errMvt } = await supabase.from('mouvements_caisse').insert([payloadMvt]);
      if (errMvt) throw errMvt;

      const { error: errUpdate } = await supabase
        .from('etats_caisse')
        .update({ statut_versement: 'VERSE' })
        .eq('id', etat.id);

      if (errUpdate) throw errUpdate;

      alert('🚀 Versement effectué avec succès !');
      chargerDonneesGlobales();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const gererTri = (colonne) => {
    if (colonneTri === colonne) {
      setOrdreTri(ordreTri === 'asc' ? 'desc' : 'asc');
    } else {
      setColonneTri(colonne);
      setOrdreTri('asc');
    }
  };

  const etatsCaisseFiltres = etatsCaisseList.filter(etat => {
    const dateEtat = etat.date_debut || '';
    if (filtreDateDebut && dateEtat < filtreDateDebut) return false;
    if (filtreDateFin && dateEtat > filtreDateFin) return false;
    if (filtreCaisseId && String(etat.id_caisse) !== String(filtreCaisseId)) return false;
    if (filtreCaissierId && String(etat.caissier) !== String(filtreCaissierId)) return false;
    return true;
  });

  const etatsCaisseTries = [...etatsCaisseFiltres].sort((a, b) => {
    let valeurA, valeurB;

    if (colonneTri === 'date_debut') {
      valeurA = a.date_debut || '';
      valeurB = b.date_debut || '';
    } else if (colonneTri === 'code_piece') {
      valeurA = a.code_piece || '';
      valeurB = b.code_piece || '';
    } else if (colonneTri === 'caissier') {
      valeurA = obtenirNomCaissier(a.caissier).toLowerCase();
      valeurB = obtenirNomCaissier(b.caissier).toLowerCase();
    } else if (colonneTri === 'montant_attendu') {
      valeurA = Number(a.montant_attendu) || 0;
      valeurB = Number(b.montant_attendu) || 0;
    } else if (colonneTri === 'ecart') {
      valeurA = Number(a.ecart) || 0;
      valeurB = Number(b.ecart) || 0;
    } else if (colonneTri === 'montant_verse') {
      valeurA = Number(a.montant_verse) || 0;
      valeurB = Number(b.montant_verse) || 0;
    } else if (colonneTri === 'statut_versement') {
      valeurA = a.statut_versement || '';
      valeurB = b.statut_versement || '';
    }

    if (valeurA < valeurB) return ordreTri === 'asc' ? -1 : 1;
    if (valeurA > valeurB) return ordreTri === 'asc' ? 1 : -1;
    return 0;
  });

  const totalAttendu = etatsCaisseTries.reduce((acc, curr) => acc + (Number(curr.montant_attendu) || 0), 0);
  const totalEcart = etatsCaisseTries.reduce((acc, curr) => acc + (Number(curr.ecart) || 0), 0);
  const totalVerse = etatsCaisseTries.reduce((acc, curr) => acc + (Number(curr.montant_verse) || 0), 0);

  return (
    <div className="space-y-2 text-[11px] font-sans max-w-full overflow-hidden px-0.5 sm:px-0">
      
      {/* 1. VUE : SAISIE DES OPÉRATIONS */}
      {vueInitiale === 'saisie_operations' && (
        <div className="space-y-2">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs gap-1.5">
            <h4 className="font-extrabold text-slate-900 text-xs uppercase leading-tight">
              Saisie [{moduleActuel}]
            </h4>
            <div className="grid grid-cols-2 gap-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setIdOperationEnCoursModif(null);
                  setNumeroPieceEnCoursModif('');
                  setLigneUnique({ id_compte: '', montant: '', piece_physique: '' });
                  setUtilisateurMotif('');
                  setModeSaisie('nouveau');
                }}
                className={`py-1 px-2.5 rounded-xl font-black text-[11px] transition shadow-2xs text-center ${
                  modeSaisie === 'nouveau'
                    ? 'bg-orange-600 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                ＋ Nouveau
              </button>
              <button
                type="button"
                onClick={() => setModeSaisie('historique')}
                className={`py-1 px-2.5 rounded-xl font-black text-[11px] transition shadow-2xs text-center ${
                  modeSaisie === 'historique'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                📋 Historique
              </button>
            </div>
          </div>

          {modeSaisie === 'nouveau' ? (
            <form onSubmit={enregistrerOperationUnique} className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                <span className="font-bold text-slate-500 uppercase text-[9px]">
                  {idOperationEnCoursModif ? 'Modifier' : 'Formulaire'}
                </span>
                <div className="flex items-center gap-1.5">
                  {idOperationEnCoursModif && numeroPieceEnCoursModif && (
                    <div className="bg-orange-50 text-orange-800 px-2 py-1 rounded-xl text-right border border-orange-200 shadow-2xs">
                      <span className="block text-[8px] uppercase text-orange-600 font-black">N° PIÈCE</span>
                      <span className="text-[11px] font-mono font-black text-orange-700">
                        {numeroPieceEnCoursModif}
                      </span>
                    </div>
                  )}
                  {moduleActuel !== 'LIVRAISON' && enteteSaisie.id_caisse && (
                    <div className="bg-slate-100 text-slate-800 px-2 py-1 rounded-xl text-right border border-slate-300 shadow-2xs">
                      <span className="block text-[8px] uppercase text-slate-600 font-black">SOLDE</span>
                      <span className="text-[11px] font-black text-slate-950">
                        {calculerSoldeCaisse(enteteSaisie.id_caisse).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className={`grid ${moduleActuel === 'LIVRAISON' ? 'grid-cols-1' : 'grid-cols-2'} gap-1.5`}>
                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Date *</label>
                    <input
                      type="date"
                      required
                      value={enteteSaisie.date}
                      onChange={(e) => setEnteteSaisie({ ...enteteSaisie, date: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-black text-slate-900 text-[11px] shadow-2xs"
                    />
                  </div>

                  {moduleActuel !== 'LIVRAISON' && (
                    <div>
                      <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Caisse *</label>
                      <select
                        required
                        value={enteteSaisie.id_caisse}
                        onChange={(e) => setEnteteSaisie({ ...enteteSaisie, id_caisse: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-black text-slate-900 text-[11px] truncate shadow-2xs"
                      >
                        <option value="">-- Caisse --</option>
                        {caissesPrincipalesPourSaisie.map((c) => (
                          <option key={c.id} value={c.id}>💵 {c.nom_caisse || c.code_caisse}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Type *</label>
                    <select
                      value={enteteSaisie.type_mouvement}
                      onChange={(e) => setEnteteSaisie({ ...enteteSaisie, type_mouvement: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-black text-slate-900 text-[11px] shadow-2xs"
                    >
                      <option value="ENTREE">🟢 Entrée</option>
                      <option value="SORTIE">🔴 Sortie</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Compte *</label>
                    <select
                      required
                      value={ligneUnique.id_compte}
                      onChange={(e) => setLigneUnique({ ...ligneUnique, id_compte: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[11px] font-black text-slate-900 shadow-2xs truncate"
                    >
                      <option value="">-- Compte --</option>
                      {comptes
                        .filter(c => enteteSaisie.type_mouvement === 'ENTREE' ? c.type_compte === 'PRODUIT' : c.type_compte === 'CHARGE')
                        .map((c) => (
                          <option key={c.id} value={c.id}>{c.intitule_compte}</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-[9px] text-slate-700 font-black mb-0.5">Motif / Utilisateur</label>
                    <select
                      value={utilisateurMotif}
                      onChange={(e) => setUtilisateurMotif(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[11px] font-black text-slate-900 shadow-2xs truncate"
                    >
                      <option value="">-- Aucun (Interne) --</option>
                      {moduleActuel === 'LIVRAISON' ? (
                        listeLivreurs.map((l, idx) => (
                          <option key={idx} value={l}>{l}</option>
                        ))
                      ) : (
                        utilisateurs.map((u) => (
                          <option key={u.id} value={u.nom_complet || u.email}>{u.nom_complet || u.email}</option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-700 font-black mb-0.5">N° pièce</label>
                    <input
                      type="text"
                      placeholder="OPTIONNEL"
                      value={ligneUnique.piece_physique}
                      onChange={(e) => setLigneUnique({ ...ligneUnique, piece_physique: e.target.value.toUpperCase() })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[11px] font-mono font-bold text-slate-900 uppercase placeholder:text-slate-400 placeholder:normal-case shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] text-slate-700 font-black mb-0.5">Montant *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="0"
                    value={ligneUnique.montant}
                    onChange={(e) => setLigneUnique({ ...ligneUnique, montant: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[11px] font-black text-orange-600 shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center pt-1.5 border-t border-slate-100 gap-1.5">
                <div className="flex gap-1.5 w-full sm:w-auto">
                  {idOperationEnCoursModif && (
                    <>
                      <button
                        type="button"
                        onClick={() => supprimerOperation(idOperationEnCoursModif)}
                        className="bg-red-600 hover:bg-red-500 text-white font-black px-3 py-1.5 rounded-xl text-[11px] shadow-2xs"
                      >
                        🗑️ Suppr
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIdOperationEnCoursModif(null);
                          setNumeroPieceEnCoursModif('');
                          setLigneUnique({ id_compte: '', montant: '', piece_physique: '' });
                          setUtilisateurMotif('');
                          setModeSaisie('historique');
                        }}
                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-black px-3 py-1.5 rounded-xl text-[11px]"
                      >
                        Annuler
                      </button>
                    </>
                  )}
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-1.5 rounded-xl shadow-2xs transition text-[11px] text-center"
                >
                  {idOperationEnCoursModif ? '💾 Mettre à jour' : '💾 Valider'}
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-2">
                <h5 className="font-extrabold text-slate-900 text-[11px] uppercase">Historique</h5>
                
                <div className="flex items-center gap-1 w-full">
                  <label className="font-bold text-slate-700 text-[9px] whitespace-nowrap">Caisse :</label>
                  <select
                    value={caisseSelectionneeJournal}
                    onChange={(e) => setCaisseSelectionneeJournal(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-lg p-1 font-black text-slate-900 text-[11px] shadow-2xs w-full truncate"
                  >
                    <option value="">-- Toutes les caisses --</option>
                    {caisses.map((c) => (
                      <option key={c.id} value={c.id}>💵 {c.nom_caisse}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-black text-slate-800 mb-0.5 text-[8px]">Début :</label>
                  <input
                    type="date"
                    value={dateDebutJournal}
                    onChange={(e) => setDateDebutJournal(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1 font-black text-slate-900 text-[10px] shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-0.5 text-[8px]">Fin :</label>
                  <input
                    type="date"
                    value={dateFinJournal}
                    onChange={(e) => setDateFinJournal(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1 font-black text-slate-900 text-[10px] shadow-2xs"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-100 text-slate-900 border-b border-slate-200 font-black uppercase text-[9px]">
                    <tr>
                      <th onClick={() => gererTriJournal('created_at')} className="p-1.5 cursor-pointer hover:bg-slate-200 transition select-none whitespace-nowrap">
                        Date {colonneTriJournal === 'created_at' ? (ordreTriJournal === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th onClick={() => gererTriJournal('piece')} className="p-1.5 cursor-pointer hover:bg-slate-200 transition select-none font-mono whitespace-nowrap">
                        N° Pièce {colonneTriJournal === 'piece' ? (ordreTriJournal === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th onClick={() => gererTriJournal('compte')} className="p-1.5 cursor-pointer hover:bg-slate-200 transition select-none">
                        Compte {colonneTriJournal === 'compte' ? (ordreTriJournal === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th onClick={() => gererTriJournal('libelle')} className="p-1.5 cursor-pointer hover:bg-slate-200 transition select-none">
                        Motif {colonneTriJournal === 'libelle' ? (ordreTriJournal === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th onClick={() => gererTriJournal('montant')} className="p-1.5 text-right cursor-pointer hover:bg-slate-200 transition select-none whitespace-nowrap">
                        Montant {colonneTriJournal === 'montant' ? (ordreTriJournal === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-900">
                    {reportAntérieur !== 0 && (
                      <tr className="bg-slate-50 italic text-[9px]">
                        <td className="p-1.5 font-bold text-slate-600">-</td>
                        <td className="p-1.5 font-mono font-bold text-slate-600 whitespace-nowrap">REPORT</td>
                        <td className="p-1.5 font-bold text-slate-600">Report Antérieur</td>
                        <td className="p-1.5 font-bold text-slate-600">Avant {dateDebutJournal}</td>
                        <td className={`p-1.5 font-black text-right whitespace-nowrap ${reportAntérieur >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {reportAntérieur >= 0 ? `+ ${reportAntérieur.toLocaleString('fr-FR')}` : `${reportAntérieur.toLocaleString('fr-FR')}`}
                        </td>
                      </tr>
                    )}

                    {mouvementsManuelsFiltres.length === 0 && reportAntérieur === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-3 text-center text-slate-500 font-bold text-[10px]">Aucune opération.</td>
                      </tr>
                    ) : (
                      mouvementsManuelsFiltres.map((m, indexMvt) => {
                        const compteAssocie = comptes.find(c => String(c.id) === String(m.id_compte));
                        const estEntree = m.type_mouvement === 'ENTREE';
                        
                        let numeroPieceSequence = m.piece_physique || `PC-${String(indexMvt + 1).padStart(2, '0')}`;
                        let nomCompteAffichage = compteAssocie ? compteAssocie.intitule_compte : '-';

                        return (
                          <tr
                            key={m.id}
                            onClick={() => preparerModificationOperation(m, indexMvt)}
                            className="transition cursor-pointer hover:bg-orange-50"
                            title="Cliquer pour modifier ou supprimer"
                          >
                            <td className="p-1.5 font-bold text-slate-800 whitespace-nowrap">{new Date(m.created_at).toLocaleDateString('fr-FR')}</td>
                            <td className="p-1.5 font-mono font-black text-orange-600 whitespace-nowrap">{numeroPieceSequence}</td>
                            <td className="p-1.5 font-bold text-slate-900 truncate max-w-[100px] uppercase">
                              {nomCompteAffichage}
                            </td>
                            <td className="p-1.5 font-extrabold uppercase truncate max-w-[100px]">
                              {m.libelle || '-'}
                            </td>
                            <td className={`p-1.5 font-black text-right whitespace-nowrap ${estEntree ? 'text-emerald-600' : 'text-red-600'}`}>
                              {estEntree ? `+ ${Number(m.montant).toLocaleString('fr-FR')}` : `- ${Number(m.montant).toLocaleString('fr-FR')}`}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex justify-between items-center text-[10px]">
                <span className="font-black text-slate-700 uppercase">Solde :</span>
                <span className={`font-black ${soldeActuelCaisseSelectionnee >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {soldeActuelCaisseSelectionnee.toLocaleString('fr-FR')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2. VUE : GRAND LIVRE & JOURNAL DE CAISSE */}
      {vueInitiale === 'grand_livre' && (
        <div className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
          
          <div className="flex gap-1.5 border-b border-slate-200 pb-1.5">
            <button
              onClick={() => setSousOngletGrandLivreJournal('grand_livre')}
              className={`px-2.5 py-1 rounded-xl font-black text-[10px] transition ${
                sousOngletGrandLivreJournal === 'grand_livre' ? 'bg-orange-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              📖 Grand Livre
            </button>
            <button
              onClick={() => setSousOngletGrandLivreJournal('journal')}
              className={`px-2.5 py-1 rounded-xl font-black text-[10px] transition ${
                sousOngletGrandLivreJournal === 'journal' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              📋 Journal de Caisse
            </button>
          </div>

          {sousOngletGrandLivreJournal === 'grand_livre' ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-[10px] sm:text-[11px] uppercase">📖 GRAND LIVRE</h4>
                </div>
                <button
                  onClick={() => window.print()}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-2 py-1 rounded-xl transition shadow-2xs text-[9px] shrink-0"
                >
                  🖨️ Imprimer
                </button>
              </div>

              {/* FILTRES DU GRAND LIVRE : COMPTE & TIERS */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Du :</label>
                    <input
                      type="date"
                      value={dateDebutLivre}
                      onChange={(e) => setDateDebutLivre(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-bold text-slate-900 text-[10px] shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Au :</label>
                    <input
                      type="date"
                      value={dateFinLivre}
                      onChange={(e) => setDateFinLivre(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-bold text-slate-900 text-[10px] shadow-2xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Compte :</label>
                    <select
                      value={compteLivreId}
                      onChange={(e) => setCompteLivreId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-black text-slate-900 text-[10px] truncate shadow-2xs"
                    >
                      <option value="">-- Tous les comptes --</option>
                      {comptes.map((c) => (
                        <option key={c.id} value={c.id}>{c.intitule_compte}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Tiers (Personnel / Livreur) :</label>
                    <select
                      value={tiersLivreFiltre}
                      onChange={(e) => setTiersLivreFiltre(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-black text-slate-900 text-[10px] truncate shadow-2xs uppercase"
                    >
                      <option value="">-- Tous les tiers --</option>
                      {moduleActuel === 'LIVRAISON' ? (
                        listeLivreurs.map((l, idx) => (
                          <option key={idx} value={l}>{l}</option>
                        ))
                      ) : (
                        utilisateurs.map((u) => (
                          <option key={u.id} value={u.nom_complet || u.email}>{u.nom_complet || u.email}</option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 font-black text-[9px] uppercase">
                    <tr>
                      <th onClick={() => gererTriGrandLivre('created_at')} className="p-1.5 cursor-pointer hover:bg-slate-200 transition select-none whitespace-nowrap">
                        Date {colonneTriGrandLivre === 'created_at' ? (ordreTriGrandLivre === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th onClick={() => gererTriGrandLivre('piece')} className="p-1.5 cursor-pointer hover:bg-slate-200 transition select-none font-mono whitespace-nowrap">
                        N° Pièce {colonneTriGrandLivre === 'piece' ? (ordreTriGrandLivre === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th onClick={() => gererTriGrandLivre('compte')} className="p-1.5 cursor-pointer hover:bg-slate-200 transition select-none">
                        Compte {colonneTriGrandLivre === 'compte' ? (ordreTriGrandLivre === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th onClick={() => gererTriGrandLivre('libelle')} className="p-1.5 cursor-pointer hover:bg-slate-200 transition select-none">
                        Motif / Tiers {colonneTriGrandLivre === 'libelle' ? (ordreTriGrandLivre === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th onClick={() => gererTriGrandLivre('montant')} className="p-1.5 text-right cursor-pointer hover:bg-slate-200 transition select-none whitespace-nowrap">
                        Montant {colonneTriGrandLivre === 'montant' ? (ordreTriGrandLivre === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {resultatGrandLivreTries.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-3 text-center text-slate-500 font-bold text-[10px]">Aucun mouvement trouvé pour cette sélection.</td>
                      </tr>
                    ) : (
                      resultatGrandLivreTries.map((m, idx) => {
                        const estEntree = m.type_mouvement === 'ENTREE';
                        const compteAssocie = comptes.find(c => String(c.id) === String(m.id_compte));
                        return (
                          <tr key={m.id} className="hover:bg-slate-50">
                            <td className="p-1.5 text-slate-800 font-bold whitespace-nowrap">{new Date(m.created_at).toLocaleDateString('fr-FR')}</td>
                            <td className="p-1.5 font-mono font-black text-orange-600 whitespace-nowrap">{m.piece_physique || `PC-${String(idx + 1).padStart(2, '0')}`}</td>
                            <td className="p-1.5 font-bold text-slate-900 truncate max-w-[100px]">
                              {compteAssocie ? compteAssocie.intitule_compte : '-'}
                            </td>
                            <td className="p-1.5 font-black text-slate-900 uppercase truncate max-w-[100px]">{m.libelle}</td>
                            <td className={`p-1.5 font-black text-right whitespace-nowrap ${estEntree ? 'text-emerald-700' : 'text-red-600'}`}>
                              {estEntree ? `+ ${Number(m.montant).toLocaleString('fr-FR')}` : `- ${Number(m.montant).toLocaleString('fr-FR')}`}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {resultatGrandLivreTries.length > 0 && (
                    <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-900 text-[10px]">
                      <tr>
                        <td colSpan="4" className="p-2 uppercase text-[9px]">Total Entrées :</td>
                        <td className="p-2 text-right font-black text-emerald-800">
                          +{totalEntreesGrandLivre.toLocaleString('fr-FR')}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan="4" className="p-2 uppercase text-[9px]">Total Sorties :</td>
                        <td className="p-2 text-right font-black text-red-700">
                          -{totalSortiesGrandLivre.toLocaleString('fr-FR')}
                        </td>
                      </tr>
                      <tr className="bg-orange-50 border-t border-slate-200">
                        <td colSpan="4" className="p-2 uppercase text-[9px] text-orange-900 font-black">Résultat Net :</td>
                        <td className={`p-2 text-right font-black ${resultatNetGrandLivre >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {resultatNetGrandLivre >= 0 ? `+${resultatNetGrandLivre.toLocaleString('fr-FR')}` : resultatNetGrandLivre.toLocaleString('fr-FR')}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 pb-1.5">
                <h4 className="font-extrabold text-slate-900 text-[10px] sm:text-[11px] uppercase whitespace-nowrap">📋 JOURNAL DE CAISSE</h4>
                <button
                  onClick={() => window.print()}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-2 py-1 rounded-xl transition shadow-2xs text-[9px] whitespace-nowrap shrink-0"
                >
                  🖨️ Imprimer
                </button>
              </div>

              {/* SÉLECTEUR DE CAISSE POUR LE JOURNAL DE CAISSE */}
              <div className="flex items-center gap-1.5 w-full bg-slate-50 p-2 rounded-xl border border-slate-200">
                <label className="font-black text-slate-800 text-[9px] whitespace-nowrap">Caisse :</label>
                <select
                  value={caisseSelectionneeJournal}
                  onChange={(e) => setCaisseSelectionneeJournal(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg p-1.5 font-black text-slate-900 text-[10px] shadow-2xs w-full truncate"
                >
                  <option value="">-- Toutes les caisses --</option>
                  {caisses.map((c) => (
                    <option key={c.id} value={c.id}>💵 {c.nom_caisse}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-black text-slate-800 mb-0.5 text-[8px]">Début :</label>
                  <input
                    type="date"
                    value={dateDebutJournal}
                    onChange={(e) => setDateDebutJournal(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1 font-black text-slate-900 text-[10px] shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-0.5 text-[8px]">Fin :</label>
                  <input
                    type="date"
                    value={dateFinJournal}
                    onChange={(e) => setDateFinJournal(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-lg p-1 font-black text-slate-900 text-[10px] shadow-2xs"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-100 text-slate-900 border-b border-slate-200 font-black text-[9px] uppercase">
                    <tr>
                      <th onClick={() => gererTriJournal('created_at')} className="p-1.5 cursor-pointer hover:bg-slate-200 transition select-none">
                        Date {colonneTriJournal === 'created_at' ? (ordreTriJournal === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th onClick={() => gererTriJournal('piece')} className="p-1.5 font-mono cursor-pointer hover:bg-slate-200 transition select-none">
                        N° Pièce {colonneTriJournal === 'piece' ? (ordreTriJournal === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th onClick={() => gererTriJournal('caisse')} className="p-1.5 cursor-pointer hover:bg-slate-200 transition select-none">
                        Caisse {colonneTriJournal === 'caisse' ? (ordreTriJournal === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th onClick={() => gererTriJournal('compte')} className="p-1.5 cursor-pointer hover:bg-slate-200 transition select-none">
                        Compte {colonneTriJournal === 'compte' ? (ordreTriJournal === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th onClick={() => gererTriJournal('libelle')} className="p-1.5 cursor-pointer hover:bg-slate-200 transition select-none">
                        Motif {colonneTriJournal === 'libelle' ? (ordreTriJournal === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th className="p-1.5 text-right">Entrée</th>
                      <th className="p-1.5 text-right">Sortie</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-900">
                    {mouvementsJournalTries.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-3 text-center text-slate-500 font-bold">Aucun mouvement.</td>
                      </tr>
                    ) : (
                      mouvementsJournalTries.map((m, idx) => {
                        const caisseObj = caisses.find(c => String(c.id) === String(m.id_caisse));
                        const compteObj = comptes.find(c => String(c.id) === String(m.id_compte));
                        const estEntree = m.type_mouvement === 'ENTREE';
                        const montantNum = Number(m.montant) || 0;
                        
                        let nomCompteAffichage = compteObj ? compteObj.intitule_compte : '-';
                        if ((m.libelle || '').toUpperCase() === 'VERSEMENT' && m.piece_physique) {
                          const etatConcerne = etatsCaisseList.find(e => String(e.code_piece) === String(m.piece_physique));
                          if (etatConcerne && etatConcerne.caissier) {
                            nomCompteAffichage = obtenirNomCaissier(etatConcerne.caissier);
                          }
                        }

                        return (
                          <tr key={m.id} className="hover:bg-slate-50">
                            <td className="p-1.5 font-bold text-slate-800 whitespace-nowrap">{new Date(m.created_at).toLocaleDateString('fr-FR')}</td>
                            <td className="p-1.5 font-mono font-black text-orange-600 whitespace-nowrap">{m.piece_physique || `PC-${String(idx + 1).padStart(2, '0')}`}</td>
                            <td className="p-1.5 font-bold text-slate-900 truncate max-w-[80px]">{caisseObj ? caisseObj.nom_caisse : '-'}</td>
                            <td className="p-1.5 font-bold text-slate-900 truncate max-w-[80px] uppercase">{nomCompteAffichage}</td>
                            <td className="p-1.5 font-black text-slate-900 uppercase truncate max-w-[90px]">{m.libelle}</td>
                            <td className="p-1.5 font-black text-emerald-700 text-right whitespace-nowrap">
                              {estEntree ? `${montantNum.toLocaleString('fr-FR')}` : '-'}
                            </td>
                            <td className="p-1.5 font-black text-red-600 text-right whitespace-nowrap">
                              {!estEntree ? `${montantNum.toLocaleString('fr-FR')}` : '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {mouvementsJournalTries.length > 0 && (
                    <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-900 text-[10px]">
                      <tr>
                        <td colSpan="5" className="p-2 uppercase text-[9px]">Totaux :</td>
                        <td className="p-2 text-right font-black text-emerald-800">
                          {totalEntreesJournal.toLocaleString('fr-FR')}
                        </td>
                        <td className="p-2 text-right font-black text-red-700">
                          {totalSortiesJournal.toLocaleString('fr-FR')}
                        </td>
                      </tr>
                      <tr className="bg-orange-50 border-t border-slate-200">
                        <td colSpan="5" className="p-2 uppercase text-[9px] text-orange-900 font-black">Solde :</td>
                        <td colSpan="2" className={`p-2 text-right font-black ${soldeJournal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {soldeJournal.toLocaleString('fr-FR')}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 3. VUE : CONTRÔLE & CLÔTURE & ÉTATS DE CAISSE */}
      {vueInitiale === 'controle_cloture' && (
        <div className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
          
          <div className="flex gap-1.5 border-b border-slate-200 pb-1.5">
            <button
              onClick={() => setSousOngletControle('nouveau_controle')}
              className={`px-2.5 py-1 rounded-xl font-black text-[10px] transition ${
                sousOngletControle === 'nouveau_controle' ? 'bg-orange-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              🛡️ Contrôle & Clôture
            </button>
            <button
              onClick={() => setSousOngletControle('etats_caisse')}
              className={`px-2.5 py-1 rounded-xl font-black text-[10px] transition ${
                sousOngletControle === 'etats_caisse' ? 'bg-slate-900 text-white shadow-2xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              📋 États ({etatsCaisseList.length})
            </button>
          </div>

          {sousOngletControle === 'nouveau_controle' ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 pb-1.5">
                <div className="flex items-center gap-1 min-w-0">
                  <h4 className="font-extrabold text-slate-900 text-[10px] sm:text-[11px] uppercase whitespace-nowrap">CLÔTURE</h4>
                  <span className="bg-orange-100 text-orange-800 font-mono font-black text-[9px] px-1.5 py-0.5 rounded-md border border-orange-200 whitespace-nowrap">
                    {numeroPieceCloture}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={preparerNouvelleCloture}
                    className="bg-orange-600 hover:bg-orange-500 text-white font-black px-2 py-1 rounded-xl transition shadow-2xs text-[9px] whitespace-nowrap uppercase"
                  >
                    <span>＋</span> Nouvelle
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-2 py-1 rounded-xl transition shadow-2xs text-[9px] whitespace-nowrap"
                  >
                    🖨️ Imprimer
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
                <div className="grid grid-cols-1 gap-1.5">
                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Date de clôture * :</label>
                    <input
                      type="date"
                      required
                      disabled={Boolean(dernierEtatIdValidé)}
                      value={dateControle}
                      onChange={(e) => setDateControle(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-bold text-slate-900 text-[10px] shadow-2xs disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {moduleActuel === 'LIVRAISON' ? (
                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Livreur * :</label>
                    <select
                      required
                      disabled={Boolean(dernierEtatIdValidé)}
                      value={livreurControle}
                      onChange={(e) => setLivreurControle(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-black text-slate-900 text-[10px] truncate shadow-2xs disabled:bg-slate-100 disabled:cursor-not-allowed uppercase"
                    >
                      <option value="">-- Sélectionnez --</option>
                      {listeLivreurs.map((l, idx) => (
                        <option key={idx} value={l}>{l}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Caisse * :</label>
                      <select
                        required
                        disabled={Boolean(dernierEtatIdValidé)}
                        value={caisseControleId}
                        onChange={(e) => setCaisseControleId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-black text-slate-900 text-[10px] truncate shadow-2xs disabled:bg-slate-100 disabled:cursor-not-allowed"
                      >
                        <option value="">-- Sélectionnez --</option>
                        {caissesFacturationPourControle.map((c) => (
                          <option key={c.id} value={c.id}>💵 {c.nom_caisse}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Caissier * :</label>
                      <select
                        required
                        disabled={Boolean(dernierEtatIdValidé)}
                        value={caissierFiltre}
                        onChange={(e) => setCaissierFiltre(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-black text-slate-900 text-[10px] truncate shadow-2xs disabled:bg-slate-100 disabled:cursor-not-allowed"
                      >
                        <option value="">-- Sélectionnez --</option>
                        {caissiersFiltresControle.map((u) => (
                          <option key={u.id} value={u.id}>{u.nom_complet || u.email}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-200">
                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Attendu :</label>
                    <div className="bg-white border border-slate-300 rounded-lg p-1.5 font-black text-slate-950 text-[10px] text-center truncate shadow-2xs">
                      {montantAttenduCaisse.toLocaleString('fr-FR')}
                    </div>
                  </div>

                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Versé * :</label>
                    <input
                      type="number"
                      required
                      disabled={Boolean(dernierEtatIdValidé)}
                      placeholder="0"
                      value={montantVerse}
                      onChange={(s) => setMontantVerse(s.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-black text-emerald-700 text-[10px] shadow-2xs disabled:bg-slate-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Écart :</label>
                  <div className={`p-1.5 rounded-lg border text-[10px] font-black text-center shadow-2xs ${montantVerse === '' ? 'bg-white border-slate-300 text-slate-400' : ecartCaisse === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : ecartCaisse > 0 ? 'bg-blue-50 border-blue-200 text-blue-950' : 'bg-red-50 border-red-200 text-red-950'}`}>
                    {montantVerse === '' ? '-' : ecartCaisse === 0 ? '0 (Parfait)' : ecartCaisse > 0 ? `+ ${ecartCaisse.toLocaleString('fr-FR')} (Excédent)` : `${ecartCaisse.toLocaleString('fr-FR')} (Manquant)`}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-100">
                <button
                  type="button"
                  disabled={Boolean(dernierEtatIdValidé)}
                  onClick={validerClotureCaisse}
                  className={`w-full py-2 px-1.5 rounded-xl shadow-2xs transition text-[10px] font-black text-center truncate ${
                    !dernierEtatIdValidé
                      ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  💾 Valider Clôture
                </button>
                <button
                  type="button"
                  disabled={!dernierEtatIdValidé}
                  onClick={executerVersementActif}
                  className={`w-full py-2 px-1.5 rounded-xl shadow-2xs transition text-[10px] font-black text-center truncate ${
                    dernierEtatIdValidé 
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  🚀 Versement
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-extrabold text-slate-800 text-[9px] uppercase">🔍 Filtres</span>
                  {(filtreDateDebut || filtreDateFin || filtreCaisseId || filtreCaissierId) && (
                    <button
                      onClick={() => {
                        setFiltreDateDebut('');
                        setFiltreDateFin('');
                        setFiltreCaisseId('');
                        setFiltreCaissierId('');
                      }}
                      className="text-orange-600 hover:underline font-bold text-[9px]"
                    >
                      Réinitialiser
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block font-black text-slate-700 text-[8px] mb-0.5">Du :</label>
                    <input
                      type="date"
                      value={filtreDateDebut}
                      onChange={(e) => setFiltreDateDebut(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1 font-bold text-slate-900 text-[10px]"
                    />
                  </div>

                  <div>
                    <label className="block font-black text-slate-700 text-[8px] mb-0.5">Au :</label>
                    <input
                      type="date"
                      value={filtreDateFin}
                      onChange={(e) => setFiltreDateFin(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1 font-bold text-slate-900 text-[10px]"
                    />
                  </div>
                </div>

                {moduleActuel !== 'LIVRAISON' && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="block font-black text-slate-700 text-[8px] mb-0.5">Caisse :</label>
                      <select
                        value={filtreCaisseId}
                        onChange={(e) => {
                          setFiltreCaisseId(e.target.value);
                          setFiltreCaissierId('');
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1 font-black text-slate-900 text-[10px] truncate"
                      >
                        <option value="">-- Toutes --</option>
                        {caisses.map((c) => (
                          <option key={c.id} value={c.id}>{c.nom_caisse}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-black text-slate-700 text-[8px] mb-0.5">Caissier :</label>
                      <select
                        value={filtreCaissierId}
                        onChange={(e) => setFiltreCaissierId(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-lg p-1 font-black text-slate-900 text-[10px] truncate"
                      >
                        <option value="">-- Tous --</option>
                        {caissiersFiltresRecherche.map((u) => (
                          <option key={u.id} value={u.id}>{u.nom_complet || u.email}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center">
                <h5 className="font-extrabold text-slate-900 text-[10px] uppercase">Liste ({etatsCaisseTries.length})</h5>
              </div>
              
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs max-h-[340px]">
                <table className="w-full text-left text-[10px] border-collapse">
                  <thead className="bg-slate-100 text-slate-900 border-b border-slate-200 font-black text-[9px] uppercase sticky top-0 z-10">
                    <tr>
                      <th onClick={() => gererTri('date_debut')} className="p-1.5 cursor-pointer hover:bg-slate-200 transition select-none w-20">
                        Date {colonneTri === 'date_debut' ? (ordreTri === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th onClick={() => gererTri('code_piece')} className="p-1.5 cursor-pointer hover:bg-slate-200 transition select-none font-mono">
                        N° {colonneTri === 'code_piece' ? (ordreTri === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th onClick={() => gererTri('caissier')} className="p-1.5 cursor-pointer hover:bg-slate-200 transition select-none">
                        {moduleActuel === 'LIVRAISON' ? 'Livreur' : 'Caissier'} {colonneTri === 'caissier' ? (ordreTri === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th onClick={() => gererTri('montant_attendu')} className="p-1.5 text-right cursor-pointer hover:bg-slate-200 transition select-none">
                        Attendu {colonneTri === 'montant_attendu' ? (ordreTri === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th onClick={() => gererTri('montant_verse')} className="p-1.5 text-right cursor-pointer hover:bg-slate-200 transition select-none">
                        Versé {colonneTri === 'montant_verse' ? (ordreTri === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th onClick={() => gererTri('ecart')} className="p-1.5 text-right cursor-pointer hover:bg-slate-200 transition select-none">
                        Écart {colonneTri === 'ecart' ? (ordreTri === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th onClick={() => gererTri('statut_versement')} className="p-1.5 text-center cursor-pointer hover:bg-slate-200 transition select-none">
                        Statut {colonneTri === 'statut_versement' ? (ordreTri === 'asc' ? '▲' : '▼') : '↕'}
                      </th>
                      <th className="p-1.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {etatsCaisseTries.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="p-3 text-center text-slate-500 font-bold">Aucun état.</td>
                      </tr>
                    ) : (
                      etatsCaisseTries.map((etat, indexEtat) => {
                        const estVerse = etat.statut_versement === 'VERSE';
                        const nomCaissierAffichage = moduleActuel === 'LIVRAISON' ? (etat.caissier || '-') : obtenirNomCaissier(etat.caissier);
                        
                        const dateObj = new Date(etat.date_debut);
                        const dateFormatee = !isNaN(dateObj) ? dateObj.toLocaleDateString('fr-FR') : etat.date_debut;
                        const numeroClotureAffichage = etat.code_piece || `CL-${indexEtat + 1}`;

                        const montantAttenduNum = Number(etat.montant_attendu) || 0;
                        const montantVerseNum = Number(etat.montant_verse) || 0;
                        const ecartNum = Number(etat.ecart) || (montantVerseNum - montantAttenduNum);

                        return (
                          <tr key={etat.id} className="hover:bg-slate-50">
                            <td className="p-1.5 font-bold text-slate-800 whitespace-nowrap w-20">
                              {dateFormatee}
                            </td>
                            <td className="p-1.5 font-mono font-black text-orange-600 whitespace-nowrap">
                              {numeroClotureAffichage}
                            </td>
                            <td className="p-1.5 uppercase font-bold text-slate-900 truncate max-w-[90px]">{nomCaissierAffichage}</td>
                            <td className="p-1.5 text-right font-bold text-slate-700">{montantAttenduNum.toLocaleString('fr-FR')}</td>
                            <td className="p-1.5 text-right font-black text-emerald-700">{montantVerseNum.toLocaleString('fr-FR')}</td>
                            <td className={`p-1.5 text-right font-black ${ecartNum === 0 ? 'text-slate-600' : ecartNum > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              {ecartNum > 0 ? `+${ecartNum.toLocaleString('fr-FR')}` : ecartNum.toLocaleString('fr-FR')}
                            </td>
                            <td className="p-1.5 text-center">
                              <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black ${estVerse ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                                {estVerse ? 'VERSÉ' : 'NON'}
                              </span>
                            </td>
                            <td className="p-1.5 text-center">
                              {!estVerse ? (
                                <button
                                  onClick={() => verserEtatCaisse(etat)}
                                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-2 py-0.5 rounded-lg text-[9px] shadow-2xs"
                                >
                                  Verser 🚀
                                </button>
                              ) : (
                                <span className="text-[9px] text-slate-400 font-bold">Clôturé</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {etatsCaisseTries.length > 0 && (
                    <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-black text-slate-900 text-[10px]">
                      <tr>
                        <td colSpan="3" className="p-2 uppercase text-[9px]">Totaux :</td>
                        <td className="p-2 text-right font-black text-slate-950">
                          {totalAttendu.toLocaleString('fr-FR')}
                        </td>
                        <td className="p-2 text-right font-black text-emerald-800">
                          {totalVerse.toLocaleString('fr-FR')}
                        </td>
                        <td className={`p-2 text-right font-black ${totalEcart === 0 ? 'text-slate-950' : totalEcart > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                          {totalEcart > 0 ? `+${totalEcart.toLocaleString('fr-FR')}` : totalEcart.toLocaleString('fr-FR')}
                        </td>
                        <td colSpan="2"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}