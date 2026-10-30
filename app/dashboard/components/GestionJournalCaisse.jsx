'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionJournalCaisse({ entrepriseId = '4TS-234321', vueInitiale = 'saisie_operations', utilisateurActif = 'THEODORE STEPHANE' }) {
  const [modeSaisie, setModeSaisie] = useState('nouveau');
  const [sousOngletControle, setSousOngletControle] = useState('nouveau_controle');

  // --- LIMITES D'AFFICHAGE ---
  const [limiteHistorique, setLimiteHistorique] = useState(20);
  const [limiteGrandLivre, setLimiteGrandLivre] = useState(20);
  const [limiteJournal, setLimiteJournal] = useState(20);
  const [limiteEtatsCaisse, setLimiteEtatsCaisse] = useState(20);

  // --- MODALE DE RECHERCHE PERSONNALISÉE (TIERS / PERSONNEL) ---
  const [afficherModaleTiers, setAfficherModaleTiers] = useState(false);
  const [rechercheTiersInput, setRechercheTiersInput] = useState('');

  // --- FILTRES DE DATES (MOIS EN COURS) ---
  const obtenirPremierJourDuMois = () => {
    const d = new Date();
    const annee = d.getFullYear();
    const mois = String(d.getMonth() + 1).padStart(2, '0');
    return `${annee}-${mois}-01`;
  };

  const obtenirDernierJourDuMois = () => {
    const d = new Date();
    const annee = d.getFullYear();
    const mois = d.getMonth() + 1;
    const dernierJour = new Date(annee, mois, 0).getDate();
    return `${annee}-${String(mois).padStart(2, '0')}-${String(dernierJour).padStart(2, '0')}`;
  };

  const premierJourMoisStr = obtenirPremierJourDuMois();
  const dernierJourMoisStr = obtenirDernierJourDuMois();

  const [dateDebutJournal, setDateDebutJournal] = useState(premierJourMoisStr);
  const [dateFinJournal, setDateFinJournal] = useState(dernierJourMoisStr);
  const [caisseSelectionneeJournal, setCaisseSelectionneeJournal] = useState('');

  const [colonneTriJournal, setColonneTriJournal] = useState('created_at');
  const [ordreTriJournal, setOrdreTriJournal] = useState('asc');

  const [colonneTriGrandLivre, setColonneTriGrandLivre] = useState('created_at');
  const [ordreTriGrandLivre, setOrdreTriGrandLivre] = useState('asc');

  const [caisses, setCaisses] = useState([]);
  const [comptes, setComptes] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [ventes, setVentes] = useState([]);
  const [approvisionnements, setApprovisionnements] = useState([]);
  const [commandesLivraison, setCommandesLivraison] = useState([]);
  const [emplacementsStock, setEmplacementsStock] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [etatsCaisseList, setEtatsCaisseList] = useState([]);
  const [cloturesCaissesList, setCloturesCaissesList] = useState([]);
  const [chargement, setChargement] = useState(false);

  const [filtreDateDebut, setFiltreDateDebut] = useState(premierJourMoisStr);
  const [filtreDateFin, setFiltreDateFin] = useState(dernierJourMoisStr);
  const [filtreCaisseId, setFiltreCaisseId] = useState('');
  const [filtreCaissierId, setFiltreCaissierId] = useState('');

  const [colonneTri, setColonneTri] = useState('date_debut');
  const [ordreTri, setOrdreTri] = useState('desc');

  const [dateControle, setDateControle] = useState(new Date().toISOString().split('T')[0]);
  const [caisseControleId, setCaisseControleId] = useState('');
  const [caissierFiltre, setCaissierFiltre] = useState('');
  const [livreurControle, setLivreurControle] = useState('');
  const [montantVerse, setMontantVerse] = useState('');
  
  const [dernierEtatIdValidé, setDernierEtatIdValidé] = useState(null);
  const [numeroPieceCloture, setNumeroPieceCloture] = useState('');

  // --- MODALE DE CHOIX DE CAISSE DE VERSEMENT ---
  const [afficherModaleVersement, setAfficherModaleVersement] = useState(false);
  const [caisseDestinationVersement, setCaisseDestinationVersement] = useState('');
  const [etatEnCoursDeVersement, setEtatEnCoursDeVersement] = useState(null);

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
    piece_physique: '',
    id_utilisateur_tiers: ''
  });
  const [utilisateurMotif, setUtilisateurMotif] = useState('');

  const [dateDebutLivre, setDateDebutLivre] = useState(premierJourMoisStr);
  const [dateFinLivre, setDateFinLivre] = useState(dernierJourMoisStr);
  const [compteLivreId, setCompteLivreId] = useState('');
  const [tiersLivreFiltre, setTiersLivreFiltre] = useState('');

  const genererCodePieceSequentiel = (dateStr, listeEtats, listeClotures) => {
    const dClean = (dateStr || new Date().toISOString().split('T')[0]).replace(/-/g, '');
    
    const elementsMemeDate = [
      ...listeEtats.filter(e => (e.date_debut || '').replace(/-/g, '') === dClean),
      ...listeClotures.filter(cl => (cl.date_debut || cl.created_at || '').split('T')[0].replace(/-/g, '') === dClean)
    ];

    let maxNum = 0;
    elementsMemeDate.forEach(item => {
      const piece = item.code_piece || item.code_cloture || '';
      const parts = piece.split('-');
      if (parts.length >= 3) {
        const num = parseInt(parts[2], 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });

    const prochainIndex = maxNum + 1;
    return `CL-${dClean}-${prochainIndex}`;
  };

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
        .eq('id_entreprise', entrepriseId);

      setCaisses(dataCaisses || []);

      const caisseEntrepriseObj = (dataCaisses || []).find(c => (c.nature || '').toUpperCase() === 'CAISSE ENTREPRISE' || (c.nom_caisse || '').toUpperCase().includes('PRINCIPALE')) || 
                                  (dataCaisses || []).find(c => (c.nature || '').toUpperCase() === 'PRINCIPALE');
      
      if (caisseEntrepriseObj && !enteteSaisie.id_caisse) {
        setEnteteSaisie(prev => ({ ...prev, id_caisse: caisseEntrepriseObj.id }));
      }

      const caissesPrincipales = (dataCaisses || []).filter(c => (c.nature || '').toUpperCase() === 'PRINCIPALE' || (c.nature || '').toUpperCase() === 'CAISSE ENTREPRISE' || (c.nom_caisse || '').toUpperCase().includes('PRINCIPALE'));
      if (caissesPrincipales.length > 0 && !caisseDestinationVersement) {
        setCaisseDestinationVersement(caissesPrincipales[0].id);
      }

      const { data: dataComptes } = await supabase
        .from('comptes_comptables')
        .select('*')
        .eq('id_entreprise', entrepriseId);
      setComptes(dataComptes || []);

      const { data: dataRoles } = await supabase
        .from('roles')
        .select('*')
        .eq('id_entreprise', entrepriseId);
      setRoles(dataRoles || []);

      const { data: dataMvts } = await supabase
        .from('mouvements_caisse')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .order('created_at', { ascending: true });
      setMouvements(dataMvts || []);

      const { data: dataVentes } = await supabase
        .from('ventes_historiques')
        .select('*')
        .eq('id_entreprise', entrepriseId);
      setVentes(dataVentes || []);

      const { data: dataAppros } = await supabase
        .from('approvisionnements')
        .select('*')
        .eq('id_entreprise', entrepriseId);
      setApprovisionnements(dataAppros || []);

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
        .order('created_at', { ascending: false });
      setEtatsCaisseList(dataEtats || []);

      const { data: dataCloturesCaisses } = await supabase
        .from('clotures_caisses')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .order('created_at', { ascending: false });
      setCloturesCaissesList(dataCloturesCaisses || []);

      const prochainNum = genererCodePieceSequentiel(dateControle, dataEtats || [], dataCloturesCaisses || []);
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

  useEffect(() => {
    const prochainNum = genererCodePieceSequentiel(dateControle, etatsCaisseList, cloturesCaissesList);
    setNumeroPieceCloture(prochainNum);
  }, [dateControle, etatsCaisseList, cloturesCaissesList]);

  const preparerNouvelleCloture = () => {
    setCaisseControleId('');
    setCaissierFiltre('');
    setLivreurControle('');
    setMontantVerse('');
    setDernierEtatIdValidé(null);
    const prochainNum = genererCodePieceSequentiel(dateControle, etatsCaisseList, cloturesCaissesList);
    setNumeroPieceCloture(prochainNum);
  };

  const calculerSoldeCaisse = (caisseId) => {
    if (!caisseId) return 0;
    
    const caisseObj = caisses.find(c => String(c.id) === String(caisseId));
    const estCaissePrin = caisseObj && ((caisseObj.nature || '').toUpperCase() === 'PRINCIPALE' || (caisseObj.nature || '').toUpperCase() === 'CAISSE ENTREPRISE' || (caisseObj.nom_caisse || '').toUpperCase().includes('PRINCIPALE'));

    let totalMvts = mouvements
      .filter(m => String(m.id_caisse) === String(caisseId))
      .reduce((acc, m) => {
        return m.type_mouvement === 'ENTREE' ? acc + Number(m.montant) : acc - Number(m.montant);
      }, 0);

    if (estCaissePrin) {
      const totalVersementsEtats = etatsCaisseList
        .filter(e => e.statut_versement === 'VERSE')
        .reduce((acc, e) => acc + Number(e.montant_verse || 0), 0);

      const totalVersementsClotures = cloturesCaissesList
        .filter(cl => String(cl.id_caisse_destination) === String(caisseId) || !cl.id_caisse_destination)
        .reduce((acc, cl) => acc + Number((cl.montant_reel_verse ?? cl.montant_attendu ?? cl.montant_total_encaisse) || 0), 0);

      totalMvts += (totalVersementsEtats + totalVersementsClotures);
    } else {
      const totalVentesCaisse = ventes
        .filter(v => String(v.id_caisse) === String(caisseId))
        .reduce((acc, v) => acc + Number(v.montant_regle ?? v.total_montant ?? 0), 0);
      totalMvts += totalVentesCaisse;
    }

    return totalMvts;
  };

  const enregistrerOperationUnique = async (e) => {
    if (e) e.preventDefault();
    if (moduleActuel !== 'LIVRAISON' && !enteteSaisie.id_caisse) {
      alert('Veuillez sélectionner une caisse.');
      return;
    }

    try {
      let libelleFinal = '';
      if (utilisateurMotif) {
        libelleFinal = utilisateurMotif.toUpperCase();
      } else {
        libelleFinal = 'MOUVEMENT INTERNE';
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
        alert(`Opération enregistrée avec succès par ${utilisateurActif}.`);
      }

      setLigneUnique({ id_compte: '', montant: '', piece_physique: '', id_utilisateur_tiers: '' });
      setUtilisateurMotif('');
      chargerDonneesGlobales();
      setModeSaisie('historique');
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const gererKeyDownFormulaire = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      enregistrerOperationUnique();
    }
  };

  const gererChangementCompte = (e) => {
    const compteId = e.target.value;
    setLigneUnique({ ...ligneUnique, id_compte: compteId });

    if (compteId) {
      const compteObj = comptes.find(c => String(c.id) === String(compteId));
      if (compteObj) {
        const natureCompte = (compteObj.nature || compteObj.type_compte || compteObj.classe || '').toUpperCase();
        if (natureCompte.includes('PRODUIT') || natureCompte.includes('RECETTE') || natureCompte.includes('VENTE')) {
          setEnteteSaisie(prev => ({ ...prev, type_mouvement: 'ENTREE' }));
        } else if (natureCompte.includes('CHARGE') || natureCompte.includes('DEPENSE') || natureCompte.includes('ACHAT')) {
          setEnteteSaisie(prev => ({ ...prev, type_mouvement: 'SORTIE' }));
        }
      }
    }
  };

  const gererChangementTiers = (e) => {
    const val = e.target.value;
    setLigneUnique({ ...ligneUnique, id_utilisateur_tiers: val });
    if (!val) {
      setUtilisateurMotif('MOUVEMENT INTERNE');
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
      piece_physique: mvt.piece_physique || '',
      id_utilisateur_tiers: ''
    });
    setUtilisateurMotif(mvt.libelle && !['MOUVEMENT INTERNE', 'DEPENSE INTERNE', 'CHARGE INTERNE'].includes(mvt.libelle) ? mvt.libelle : '');
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
      setLigneUnique({ id_compte: '', montant: '', piece_physique: '', id_utilisateur_tiers: '' });
      setUtilisateurMotif('');
      chargerDonneesGlobales();
      setModeSaisie('historique');
    } catch (err) {
      alert('Erreur lors de la suppression : ' + err.message);
    }
  };

  const caissesPrincipalesPourSaisie = caisses.filter(c => (c.nature || '').toUpperCase() === 'PRINCIPALE' || (c.nature || '').toUpperCase() === 'CAISSE ENTREPRISE' || (c.nom_caisse || '').toUpperCase().includes('PRINCIPALE'));
  const caissesFacturationPourControle = caisses.filter(c => (c.nature || '').toUpperCase() === 'FACTURATION' || !(c.nom_caisse || '').toUpperCase().includes('PRINCIPALE'));

  const listeLivreurs = Array.from(new Set([
    ...(commandesLivraison.map(c => c.vendeur_livreur).filter(Boolean)),
    ...(emplacementsStock.map(e => e.nom_emplacement || e.responsable_emplacement).filter(Boolean))
  ])).map(l => l.toUpperCase());

  const mapTiersCategories = new Map();
  utilisateurs.forEach(u => {
    const nom = (u.nom_complet || u.email || '').trim().toUpperCase();
    if (nom) mapTiersCategories.set(nom, 'EMPLOYÉ / UTILISATEUR');
  });
  ventes.forEach(v => {
    const nom = (v.nom_client || '').trim().toUpperCase();
    if (nom && !mapTiersCategories.has(nom)) mapTiersCategories.set(nom, 'CLIENT');
  });
  approvisionnements.forEach(a => {
    const nom = (a.nom_fournisseur || '').trim().toUpperCase();
    if (nom && !mapTiersCategories.has(nom)) mapTiersCategories.set(nom, 'FOURNISSEUR');
  });
  commandesLivraison.forEach(c => {
    const nom = (c.vendeur_livreur || '').trim().toUpperCase();
    if (nom && !mapTiersCategories.has(nom)) mapTiersCategories.set(nom, 'LIVREUR');
  });

  const listeTiersGlobale = Array.from(mapTiersCategories.entries()).map(([nom, cat]) => ({ nom, categorie: cat }));
  const listeTiersFiltresModale = listeTiersGlobale.filter(t => 
    t.nom.includes(rechercheTiersInput.toUpperCase()) || t.categorie.includes(rechercheTiersInput.toUpperCase())
  );

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

  const obtenirNomCaissier = (idOuNom) => {
    if (!idOuNom) return '-';
    const utilisateurTrouve = utilisateurs.find(u => String(u.id) === String(idOuNom) || String(u.email) === String(idOuNom));
    if (utilisateurTrouve) {
      return utilisateurTrouve.nom_complet || utilisateurTrouve.email || idOuNom;
    }
    return idOuNom;
  };

  // --- GRAND LIVRE TRANSVERSAL ---
  const mouvementsMvtsGrandLivre = mouvements.map(m => ({
    id: `mvt-${m.id}`,
    created_at: m.created_at,
    piece_physique: m.piece_physique || '-',
    id_compte: m.id_compte,
    libelle: m.libelle || 'MOUVEMENT CAISSE',
    type_mouvement: m.type_mouvement,
    montant: Number(m.montant || 0)
  }));

  const ventesGrandLivre = ventes.map(v => ({
    id: `vente-${v.id}`,
    created_at: v.created_at,
    piece_physique: v.numero_ticket || `TICK-${v.id}`,
    id_compte: v.id_compte || null,
    libelle: `VENTE TICKET #${v.numero_ticket || '-'} (${v.nom_client || 'CLIENTS DIVERS'})`,
    type_mouvement: 'ENTREE',
    montant: Number(v.montant_regle ?? v.total_montant ?? 0)
  }));

  const approsGrandLivre = approvisionnements.map(a => ({
    id: `appro-${a.id}`,
    created_at: a.created_at || a.date_approvisionnement || new Date().toISOString(),
    piece_physique: a.reference || `APRO-${a.id}`,
    id_compte: a.id_compte || null,
    libelle: `APPROVISIONNEMENT FOURNISSEUR (${a.nom_fournisseur || 'FOURNISSEUR'})`,
    type_mouvement: 'SORTIE',
    montant: Number(a.montant_total || a.montant || 0)
  }));

  const tousLesMouvementsGrandLivre = [...mouvementsMvtsGrandLivre, ...ventesGrandLivre, ...approsGrandLivre];

  const resultatGrandLivre = tousLesMouvementsGrandLivre.filter(m => {
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
      valA = a.piece_physique || '';
      valB = b.piece_physique || '';
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

  const resultatGrandLivreAffiches = resultatGrandLivreTries.slice(0, limiteGrandLivre);

  const totalEntreesGrandLivre = resultatGrandLivreTries
    .filter(m => m.type_mouvement === 'ENTREE')
    .reduce((acc, m) => acc + Number(m.montant || 0), 0);

  const totalSortiesGrandLivre = resultatGrandLivreTries
    .filter(m => m.type_mouvement === 'SORTIE')
    .reduce((acc, m) => acc + Number(m.montant || 0), 0);

  const resultatNetGrandLivre = totalEntreesGrandLivre - totalSortiesGrandLivre;

  // --- JOURNAL DE CAISSE CORRIGÉ ---
  const caisseSelectionneeObj = caisses.find(c => String(c.id) === String(caisseSelectionneeJournal));
  const estCaissePrincipaleSelectionnee = caisseSelectionneeObj && ((caisseSelectionneeObj.nature || '').toUpperCase() === 'PRINCIPALE' || (caisseSelectionneeObj.nature || '').toUpperCase() === 'CAISSE ENTREPRISE' || (caisseSelectionneeObj.nom_caisse || '').toUpperCase().includes('PRINCIPALE'));

  const mouvementsDeCaisseFiltres = mouvements.filter(m => {
    if (caisseSelectionneeJournal && String(m.id_caisse) !== String(caisseSelectionneeJournal)) return false;
    const dateMvt = m.created_at ? m.created_at.split('T')[0] : '';
    if (dateDebutJournal && dateMvt < dateDebutJournal) return false;
    if (dateFinJournal && dateMvt > dateFinJournal) return false;
    return true;
  });

  const ventesTransformeesEnMouvements = ventes
    .filter(v => {
      // Si une caisse spécifique est sélectionnée, on filtre strictement par cette caisse
      if (caisseSelectionneeJournal) {
        if (String(v.id_caisse) !== String(caisseSelectionneeJournal)) return false;
      } else {
        // Si aucune caisse n'est sélectionnée, on exclut les ventes des caisses secondaires si on veut éviter les doublons avec les versements de caisse principale, ou on les affiche si elles proviennent directement de la caisse.
        // Ici, on affiche toutes les ventes si aucune caisse n'est sélectionnée.
      }
      const dateVente = v.created_at ? v.created_at.split('T')[0] : '';
      if (dateDebutJournal && dateVente < dateDebutJournal) return false;
      if (dateFinJournal && dateVente > dateFinJournal) return false;
      return true;
    })
    .map(v => ({
      id: `vente-${v.id}`,
      id_entreprise: v.id_entreprise,
      module: v.module,
      id_caisse: v.id_caisse,
      type_mouvement: 'ENTREE',
      montant: Number(v.montant_regle ?? v.total_montant ?? 0),
      libelle: `VENTE TICKET #${v.numero_ticket || '-'} (${v.nom_client || 'CLIENTS DIVERS'})`,
      id_compte: v.id_compte || null,
      piece_physique: v.numero_ticket || `TICK-${v.id}`,
      created_at: v.created_at
    }));

  const versementsClotureTransformesFromClotures = cloturesCaissesList
    .filter(cl => {
      const dateCl = cl.date_debut || cl.created_at?.split('T')[0] || '';
      if (dateDebutJournal && dateCl < dateDebutJournal) return false;
      if (dateFinJournal && dateCl > dateFinJournal) return false;
      if (caisseSelectionneeJournal) {
        // Un versement de clôture va dans la caisse de destination (souvent la caisse principale)
        const idDest = cl.id_caisse_destination || caissesPrincipalesPourSaisie[0]?.id;
        if (String(idDest) !== String(caisseSelectionneeJournal)) return false;
      }
      return true;
    })
    .map(cl => ({
      id: `cloture-caisse-${cl.id}`,
      id_entreprise: cl.id_entreprise,
      module: cl.module,
      id_caisse: cl.id_caisse_destination || caissesPrincipalesPourSaisie[0]?.id || null,
      type_mouvement: 'ENTREE',
      montant: Number((cl.montant_reel_verse ?? cl.montant_attendu ?? cl.montant_total_encaisse) || 0),
      libelle: `VERSEMENT CLÔTURE CAISSE [${cl.code_cloture || 'CL'}] (${cl.caissier || 'CAISSIER'})`,
      id_compte: null,
      piece_physique: cl.code_cloture || `CL-${cl.id}`,
      created_at: cl.created_at || `${cl.date_debut}T00:00:00`
    }));

  const versementsClotureTransformesFromEtats = etatsCaisseList
    .filter(e => {
      if (e.statut_versement !== 'VERSE') return false;
      const dateEtat = e.date_debut || '';
      if (dateDebutJournal && dateEtat < dateDebutJournal) return false;
      if (dateFinJournal && dateEtat > dateFinJournal) return false;
      if (caisseSelectionneeJournal) {
        if (String(e.id_caisse) !== String(caisseSelectionneeJournal)) return false;
      }
      return true;
    })
    .map(e => ({
      id: `versement-etat-${e.id}`,
      id_entreprise: e.id_entreprise,
      module: e.module,
      id_caisse: e.id_caisse || caissesPrincipalesPourSaisie[0]?.id || null,
      type_mouvement: 'ENTREE',
      montant: Number(e.montant_verse || 0),
      libelle: `VERSEMENT CLÔTURE CAISSE [${e.code_piece || 'CL'}] (${obtenirNomCaissier(e.caissier)})`,
      id_compte: null,
      piece_physique: e.code_piece || `CL-${e.id}`,
      created_at: e.created_at || `${e.date_debut}T00:00:00`
    }));

  const tousLesVersementsClotures = [...versementsClotureTransformesFromClotures, ...versementsClotureTransformesFromEtats];

  // Si une caisse spécifique autre que la principale est sélectionnée, on affiche ses ventes directes. Si c'est la caisse principale ou "Toutes", on combine avec les mouvements et versements.
  const mouvementsJournalTries = [
    ...mouvementsDeCaisseFiltres, 
    ...ventesTransformeesEnMouvements, 
    ...tousLesVersementsClotures
  ].sort((a, b) => {
    let valA, valB;
    if (colonneTriJournal === 'created_at') {
      valA = a.created_at || '';
      valB = b.created_at || '';
    } else if (colonneTriJournal === 'piece') {
      valA = a.piece_physique || '';
      valB = b.piece_physique || '';
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

  const gererTriJournal = (colonne) => {
    if (colonneTriJournal === colonne) {
      setOrdreTriJournal(ordreTriJournal === 'asc' ? 'desc' : 'asc');
    } else {
      setColonneTriJournal(colonne);
      setOrdreTriJournal('asc');
    }
  };

  const mouvementsJournalAffiches = mouvementsJournalTries.slice(0, limiteJournal);

  const totalEntreesJournal = mouvementsJournalTries
    .filter(m => m.type_mouvement === 'ENTREE')
    .reduce((acc, m) => acc + Number(m.montant || 0), 0);

  const totalSortiesJournal = mouvementsJournalTries
    .filter(m => m.type_mouvement === 'SORTIE')
    .reduce((acc, m) => acc + Number(m.montant || 0), 0);

  const soldeJournal = totalEntreesJournal - totalSortiesJournal;

  const mouvementsManuelsFiltres = mouvements.filter(m => {
    if (caisseSelectionneeJournal && String(m.id_caisse) !== String(caisseSelectionneeJournal)) return false;
    const lib = (m.libelle || '').toUpperCase();
    if (lib === 'VERSEMENT' || lib.includes('VERSEMENT ÉTAT') || lib.includes('CLÔTURE')) return false;
    const dateMvt = m.created_at ? m.created_at.split('T')[0] : '';
    if (dateDebutJournal && dateMvt < dateDebutJournal) return false;
    if (dateFinJournal && dateMvt > dateFinJournal) return false;
    return true;
  });

  const mouvementsManuelsAffiches = mouvementsManuelsFiltres.slice(0, limiteHistorique);

  const reportAntérieur = mouvements.filter(m => {
    if (caisseSelectionneeJournal && String(m.id_caisse) !== String(caisseSelectionneeJournal)) return false;
    const lib = (m.libelle || '').toUpperCase();
    if (lib === 'VERSEMENT' || lib.includes('VERSEMENT ÉTAT') || lib.includes('CLÔTURE')) return false;
    const dateMvt = m.created_at ? m.created_at.split('T')[0] : '';
    return dateDebutJournal && dateMvt < dateDebutJournal;
  }).reduce((acc, m) => {
    return m.type_mouvement === 'ENTREE' ? acc + Number(m.montant) : acc - Number(m.montant);
  }, 0);

  // --- MONTANT ATTENDU BASÉ STRICTEMENT SUR LE MONTANT RÉGLÉ (ENCAISSÉ) ---
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
              if (caissierFiltre && String(v.id_utilisateur || v.vender) !== String(caissierFiltre)) return false;
              return true;
            })
            .reduce((sum, v) => sum + (Number(v.montant_regle ?? v.total_montant) || 0), 0)
        : 0);

  const ecartCaisse = montantVerse !== '' ? Number(montantVerse) - montantAttenduCaisse : 0;

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
      const codePieceActuel = genererCodePieceSequentiel(dateControle, etatsCaisseList, cloturesCaissesList);

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
        code_piece: codePieceActuel,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from('etats_caisse').insert([payloadEtat]).select().single();
      if (error) throw error;

      alert(`✅ Clôture de caisse [${codePieceActuel}] validée avec succès ! Montant de ${montantV.toLocaleString('fr-FR')} CFA prêt à être versé dans la caisse principale.`);
      if (data) {
        setDernierEtatIdValidé(data.id);
      }
      chargerDonneesGlobales();
    } catch (err) {
      alert('Erreur lors de la validation : ' + err.message);
    }
  };

  const declencherOuvertureModalVersement = (etat) => {
    setEtatEnCoursDeVersement(etat);
    const caissePrin = caissesPrincipalesPourSaisie[0];
    if (caissePrin) {
      setCaisseDestinationVersement(caissePrin.id);
    }
    setAfficherModaleVersement(true);
  };

  const executerVersementModale = async () => {
    if (!etatEnCoursDeVersement || !caisseDestinationVersement) {
      alert('Veuillez sélectionner une caisse de destination valide.');
      return;
    }
    try {
      const etat = etatEnCoursDeVersement;
      const numClotureAssocie = etat.code_piece || `CL-${(etat.date_debut || '').replace(/-/g, '')}-1`;

      const payloadMvt = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        id_caisse: caisseDestinationVersement,
        type_mouvement: 'ENTREE',
        montant: Number(etat.montant_verse),
        libelle: `VERSEMENT CLÔTURE CAISSE [${numClotureAssocie}] (${obtenirNomCaissier(etat.caissier)})`,
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

      alert(`🚀 Versement de la clôture [${numClotureAssocie}] effectué avec succès dans le journal de caisse !`);
      setAfficherModaleVersement(false);
      setEtatEnCoursDeVersement(null);
      chargerDonneesGlobales();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const executerVersementActif = async () => {
    if (!dernierEtatIdValidé) return;
    const etatConcerne = etatsCaisseList.find(e => String(e.id) === String(dernierEtatIdValidé)) || {
      id: dernierEtatIdValidé,
      montant_verse: Number(montantVerse),
      caissier: moduleActuel === 'LIVRAISON' ? livreurControle : caissierFiltre,
      code_piece: numeroPieceCloture
    };
    declencherOuvertureModalVersement(etatConcerne);
  };

  const verserEtatCaisse = async (etat) => {
    declencherOuvertureModalVersement(etat);
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

  const etatsCaisseAffiches = etatsCaisseTries.slice(0, limiteEtatsCaisse);

  return (
    <div className="space-y-2 text-[11px] font-sans max-w-full overflow-hidden px-0.5 sm:px-0 relative">
      
      {/* 1. VUE : SAISIE DES OPÉRATIONS */}
      {vueInitiale === 'saisie_operations' && (
        <div className="space-y-2">
          
          <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
            <h4 className="font-extrabold text-slate-900 text-xs uppercase leading-tight">
              Saisie & Comptabilité
            </h4>
            <div className="grid grid-cols-2 sm:flex gap-1.5 w-full pt-1 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIdOperationEnCoursModif(null);
                  setNumeroPieceEnCoursModif('');
                  setLigneUnique({ id_compte: '', montant: '', piece_physique: '', id_utilisateur_tiers: '' });
                  setUtilisateurMotif('');
                  setModeSaisie('nouveau');
                }}
                className={`py-1.5 px-3 rounded-xl font-black text-[10px] transition shadow-2xs text-center flex-1 sm:flex-none ${
                  modeSaisie === 'nouveau' ? 'bg-orange-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                ＋ Nouveau
              </button>
              <button
                type="button"
                onClick={() => setModeSaisie('historique')}
                className={`py-1.5 px-3 rounded-xl font-black text-[10px] transition shadow-2xs text-center flex-1 sm:flex-none ${
                  modeSaisie === 'historique' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                📋 Historique
              </button>
              <button
                type="button"
                onClick={() => setModeSaisie('grand_livre')}
                className={`py-1.5 px-3 rounded-xl font-black text-[10px] transition shadow-2xs text-center flex-1 sm:flex-none ${
                  modeSaisie === 'grand_livre' ? 'bg-orange-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                📖 Grand Livre
              </button>
              <button
                type="button"
                onClick={() => setModeSaisie('journal_caisse')}
                className={`py-1.5 px-3 rounded-xl font-black text-[10px] transition shadow-2xs text-center flex-1 sm:flex-none ${
                  modeSaisie === 'journal_caisse' ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                📋 Journal de Caisse
              </button>
            </div>
          </div>

          {/* CONTENU : FORMULAIRE NOUVEAU */}
          {modeSaisie === 'nouveau' && (
            <form onSubmit={enregistrerOperationUnique} onKeyDown={gererKeyDownFormulaire} className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                <span className="font-bold text-slate-500 uppercase text-[9px]">
                  {idOperationEnCoursModif ? 'Modifier' : 'Formulaire'}
                </span>
                <div className="flex items-center gap-1.5">
                  {idOperationEnCoursModif && numeroPieceEnCoursModif && (
                    <div className="bg-orange-50 text-orange-800 px-2 py-1 rounded-xl text-right border border-orange-200 shadow-2xs">
                      <span className="block text-[8px] uppercase text-orange-600 font-black">N° PIÈCE</span>
                      <span className="text-[11px] font-mono font-black text-orange-700">{numeroPieceEnCoursModif}</span>
                    </div>
                  )}
                  {moduleActuel !== 'LIVRAISON' && enteteSaisie.id_caisse && (
                    <div className={`px-2.5 py-1 rounded-xl text-right border shadow-2xs flex items-center gap-2 ${
                      calculerSoldeCaisse(enteteSaisie.id_caisse) < 0 
                        ? 'bg-red-50 border-red-200 text-red-700' 
                        : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    }`}>
                      <span className="text-[9px] uppercase font-black">SOLDE CAISSE</span>
                      <span className="text-[11px] font-black">
                        {calculerSoldeCaisse(enteteSaisie.id_caisse).toLocaleString('fr-FR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className={`grid ${moduleActuel === 'LIVRAISON' ? 'grid-cols-2' : 'grid-cols-3'} gap-1.5`}>
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
                        <option value="">-- Caisse Entreprise / Autre --</option>
                        {caisses.map((c) => (
                          <option key={c.id} value={c.id}>💵 {c.nom_caisse || c.code_caisse}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Type (Auto) *</label>
                    <select
                      disabled
                      value={enteteSaisie.type_mouvement}
                      className="w-full bg-slate-100 border border-slate-300 rounded-lg p-1.5 font-black text-slate-700 text-[11px] shadow-2xs cursor-not-allowed"
                    >
                      <option value="ENTREE">🟢 Entrée (Produit)</option>
                      <option value="SORTIE">🔴 Sortie (Charge)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Compte *</label>
                    <select
                      required
                      value={ligneUnique.id_compte}
                      onChange={gererChangementCompte}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[11px] font-black text-slate-900 shadow-2xs truncate uppercase"
                    >
                      <option value="">-- Sélectionner un compte --</option>
                      {comptes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.numero_compte ? `${c.numero_compte} - ` : ''}{c.intitule_compte}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-black text-slate-700 text-[9px] mb-0.5">Tiers / Personnel *</label>
                    <select
                      required
                      value={ligneUnique.id_utilisateur_tiers}
                      onChange={gererChangementTiers}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[11px] font-black text-slate-900 shadow-2xs truncate uppercase"
                    >
                      <option value="">-- Aucun (Interne) --</option>
                      {utilisateurs.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nom_complet || u.email || `Utilisateur #${u.id}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-black text-slate-700 text-[9px] mb-0.5">N° pièce</label>
                    <input
                      type="text"
                      placeholder="OPTIONNEL"
                      value={ligneUnique.piece_physique}
                      onChange={(e) => setLigneUnique({ ...ligneUnique, piece_physique: e.target.value.toUpperCase() })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[11px] font-mono font-bold text-slate-900 uppercase shadow-2xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block font-black text-slate-700 text-[9px] mb-0.5">Motif</label>
                    <input
                      type="text"
                      placeholder={!ligneUnique.id_utilisateur_tiers ? "MOUVEMENT INTERNE" : "Motif de l'opération..."}
                      value={utilisateurMotif}
                      onChange={(e) => setUtilisateurMotif(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 text-[11px] font-black text-slate-900 uppercase shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block font-black text-slate-700 text-[9px] mb-0.5">Montant *</label>
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
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center pt-1.5 border-t border-slate-100 gap-1.5">
                <div className="flex gap-1.5 w-full sm:w-auto">
                  {idOperationEnCoursModif && (
                    <>
                      <button
                        type="button"
                        onClick={() => supprimerOperation(idOperationEnCoursModif)}
                        className="bg-red-600 hover:bg-red-500 text-white font-black px-3 py-1.5 rounded-xl text-[11px]"
                      >
                        🗑️ Suppr
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIdOperationEnCoursModif(null);
                          setNumeroPieceEnCoursModif('');
                          setLigneUnique({ id_compte: '', montant: '', piece_physique: '', id_utilisateur_tiers: '' });
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
          )}

          {/* CONTENU : HISTORIQUE */}
          {modeSaisie === 'historique' && (
            <div className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-2">
                <h5 className="font-extrabold text-slate-900 text-[11px] uppercase">Historique ({mouvementsManuelsAffiches.length} / {mouvementsManuelsFiltres.length})</h5>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-100 text-slate-900 border-b border-slate-200 font-black uppercase text-[9px]">
                    <tr>
                      <th className="p-1.5">Date</th>
                      <th className="p-1.5 font-mono">N° Pièce</th>
                      <th className="p-1.5">Compte</th>
                      <th className="p-1.5">Motif</th>
                      <th className="p-1.5 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-900">
                    {reportAntérieur !== 0 && (
                      <tr className="bg-slate-50 italic text-[9px]">
                        <td className="p-1.5 font-bold text-slate-600">-</td>
                        <td className="p-1.5 font-mono font-bold text-slate-600">REPORT</td>
                        <td className="p-1.5 font-bold text-slate-600">Report Antérieur</td>
                        <td className="p-1.5 font-bold text-slate-600">Avant {dateDebutJournal}</td>
                        <td className={`p-1.5 font-black text-right ${reportAntérieur >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {reportAntérieur >= 0 ? `+ ${reportAntérieur.toLocaleString('fr-FR')}` : `${reportAntérieur.toLocaleString('fr-FR')}`}
                        </td>
                      </tr>
                    )}
                    {mouvementsManuelsAffiches.length === 0 && reportAntérieur === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-3 text-center text-slate-500 font-bold text-[10px]">Aucune opération.</td>
                      </tr>
                    ) : (
                      mouvementsManuelsAffiches.map((m, indexMvt) => {
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
                            <td className="p-1.5 font-bold text-slate-900 truncate uppercase">{nomCompteAffichage}</td>
                            <td className="p-1.5 font-extrabold uppercase truncate">{m.libelle || '-'}</td>
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
            </div>
          )}

          {/* CONTENU : GRAND LIVRE TRANSVERSAL */}
          {modeSaisie === 'grand_livre' && (
            <div className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-1.5">
                <h4 className="font-extrabold text-slate-900 text-[10px] sm:text-[11px] uppercase">📖 GRAND LIVRE TRANSVERSAL ({resultatGrandLivreAffiches.length} / {resultatGrandLivreTries.length})</h4>
                <button
                  onClick={() => window.print()}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-2 py-1 rounded-xl transition shadow-2xs text-[9px] shrink-0"
                >
                  🖨️ Imprimer
                </button>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Du :</label>
                    <input
                      type="date"
                      value={dateDebutLivre}
                      onChange={(e) => setDateDebutLivre(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-bold text-slate-900 text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Au :</label>
                    <input
                      type="date"
                      value={dateFinLivre}
                      onChange={(e) => setDateFinLivre(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-bold text-slate-900 text-[10px]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Compte :</label>
                    <select
                      value={compteLivreId}
                      onChange={(e) => setCompteLivreId(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-black text-slate-900 text-[10px] truncate uppercase"
                    >
                      <option value="">-- Tous les comptes --</option>
                      {comptes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.numero_compte ? `${c.numero_compte} - ` : ''}{c.intitule_compte}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Tiers / Fournisseur / Personnel :</label>
                    <div 
                      onClick={() => setAfficherModaleTiers(true)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-black text-slate-900 text-[10px] cursor-pointer truncate shadow-2xs flex justify-between items-center"
                    >
                      <span className="uppercase">{tiersLivreFiltre || '-- TOUS LES TIERS / CLIENTS / EMPLOYÉS --'}</span>
                      <span className="text-slate-400">🔍</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 font-black text-[9px] uppercase">
                    <tr>
                      <th onClick={() => gererTriGrandLivre('created_at')} className="p-1.5 cursor-pointer">Date ↕</th>
                      <th onClick={() => gererTriGrandLivre('piece')} className="p-1.5 cursor-pointer font-mono">N° Pièce ↕</th>
                      <th onClick={() => gererTriGrandLivre('compte')} className="p-1.5 cursor-pointer">Compte ↕</th>
                      <th onClick={() => gererTriGrandLivre('libelle')} className="p-1.5 cursor-pointer">Libellé / Source ↕</th>
                      <th onClick={() => gererTriGrandLivre('montant')} className="p-1.5 text-right cursor-pointer">Montant ↕</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {resultatGrandLivreAffiches.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-3 text-center text-slate-500 font-bold text-[10px]">Aucun mouvement trouvé dans le grand livre.</td>
                      </tr>
                    ) : (
                      resultatGrandLivreAffiches.map((m, idx) => {
                        const estEntree = m.type_mouvement === 'ENTREE';
                        const compteAssocie = comptes.find(c => String(c.id) === String(m.id_compte));
                        return (
                          <tr key={m.id} className="hover:bg-slate-50">
                            <td className="p-1.5 text-slate-800 font-bold whitespace-nowrap">{new Date(m.created_at).toLocaleDateString('fr-FR')}</td>
                            <td className="p-1.5 font-mono font-black text-orange-600 whitespace-nowrap">{m.piece_physique}</td>
                            <td className="p-1.5 font-bold text-slate-900 truncate uppercase">{compteAssocie ? compteAssocie.intitule_compte : 'COMPTE NON LIÉ'}</td>
                            <td className="p-1.5 font-black text-slate-900 uppercase truncate">{m.libelle}</td>
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
                        <td className="p-2 text-right font-black text-emerald-800">+{totalEntreesGrandLivre.toLocaleString('fr-FR')}</td>
                      </tr>
                      <tr>
                        <td colSpan="4" className="p-2 uppercase text-[9px]">Total Sorties :</td>
                        <td className="p-2 text-right font-black text-red-700">-{totalSortiesGrandLivre.toLocaleString('fr-FR')}</td>
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
          )}

          {/* CONTENU : JOURNAL DE CAISSE */}
          {modeSaisie === 'journal_caisse' && (
            <div className="bg-white p-2.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
              <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 pb-1.5">
                <h4 className="font-extrabold text-slate-900 text-[10px] sm:text-[11px] uppercase whitespace-nowrap">📋 JOURNAL DE CAISSE ({mouvementsJournalAffiches.length})</h4>
                <button
                  onClick={() => window.print()}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-2 py-1 rounded-xl transition shadow-2xs text-[9px]"
                >
                  🖨️ Imprimer
                </button>
              </div>

              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Date Début :</label>
                    <input
                      type="date"
                      value={dateDebutJournal}
                      onChange={(e) => setDateDebutJournal(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-bold text-slate-900 text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Date Fin :</label>
                    <input
                      type="date"
                      value={dateFinJournal}
                      onChange={(e) => setDateFinJournal(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-bold text-slate-900 text-[10px]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 w-full">
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
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-left text-[10px]">
                  <thead className="bg-slate-100 text-slate-900 border-b border-slate-200 font-black text-[9px] uppercase">
                    <tr>
                      <th className="p-1.5">Date</th>
                      <th className="p-1.5 font-mono">N° Pièce</th>
                      <th className="p-1.5">Caisse</th>
                      <th className="p-1.5">Compte</th>
                      <th className="p-1.5">Motif</th>
                      <th className="p-1.5 text-right">Entrée</th>
                      <th className="p-1.5 text-right">Sortie</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-900">
                    {mouvementsJournalAffiches.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-3 text-center text-slate-500 font-bold">Aucun mouvement de caisse.</td>
                      </tr>
                    ) : (
                      mouvementsJournalAffiches.map((m, idx) => {
                        const caisseObj = caisses.find(c => String(c.id) === String(m.id_caisse));
                        const compteObj = comptes.find(c => String(c.id) === String(m.id_compte));
                        const estEntree = m.type_mouvement === 'ENTREE';
                        const montantNum = Number(m.montant) || 0;

                        return (
                          <tr key={m.id} className="hover:bg-slate-50">
                            <td className="p-1.5 font-bold text-slate-800 whitespace-nowrap">{new Date(m.created_at).toLocaleDateString('fr-FR')}</td>
                            <td className="p-1.5 font-mono font-black text-orange-600 whitespace-nowrap">{m.piece_physique || `PC-${idx + 1}`}</td>
                            <td className="p-1.5 font-bold text-slate-900 truncate max-w-[80px]">{caisseObj ? caisseObj.nom_caisse : '-'}</td>
                            <td className="p-1.5 font-bold text-slate-900 truncate max-w-[80px] uppercase">{compteObj ? compteObj.intitule_compte : '-'}</td>
                            <td className="p-1.5 font-black text-slate-900 uppercase truncate max-w-[120px]">{m.libelle}</td>
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
                        <td className="p-2 text-right font-black text-emerald-800">{totalEntreesJournal.toLocaleString('fr-FR')}</td>
                        <td className="p-2 text-right font-black text-red-700">{totalSortiesJournal.toLocaleString('fr-FR')}</td>
                      </tr>
                      <tr className="bg-orange-50 border-t border-slate-200">
                        <td colSpan="5" className="p-2 uppercase text-[9px] text-orange-900 font-black">Solde Net :</td>
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

      {/* 2. VUE : CONTRÔLE & CLÔTURE & ÉTATS DE CAISSE */}
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
              📋 États ({etatsCaisseList.length + cloturesCaissesList.length})
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

                {moduleActuel === 'LIVRAISON' ? (
                  <div>
                    <label className="block font-black text-slate-800 mb-0.5 text-[9px]">Livreur * :</label>
                    <select
                      required
                      disabled={Boolean(dernierEtatIdValidé)}
                      value={livreurControle}
                      onChange={(e) => setLivreurControle(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-black text-slate-900 text-[10px] truncate shadow-2xs disabled:bg-slate-100 uppercase"
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
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-black text-slate-900 text-[10px] truncate shadow-2xs disabled:bg-slate-100"
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
                        className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-black text-slate-900 text-[10px] truncate shadow-2xs disabled:bg-slate-100"
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
                      className="w-full bg-white border border-slate-300 rounded-lg p-1.5 font-black text-emerald-700 text-[10px] shadow-2xs disabled:bg-slate-100"
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
                    !dernierEtatIdValidé ? 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  💾 Valider Clôture
                </button>
                <button
                  type="button"
                  disabled={!dernierEtatIdValidé}
                  onClick={executerVersementActif}
                  className={`w-full py-2 px-1.5 rounded-xl shadow-2xs transition text-[10px] font-black text-center truncate ${
                    dernierEtatIdValidé ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
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
                  {(filtreDateDebut !== premierJourMoisStr || filtreDateFin !== dernierJourMoisStr || filtreCaisseId || filtreCaissierId) && (
                    <button
                      onClick={() => {
                        setFiltreDateDebut(premierJourMoisStr);
                        setFiltreDateFin(dernierJourMoisStr);
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
              </div>
              
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs max-h-[340px]">
                <table className="w-full text-left text-[10px] border-collapse">
                  <thead className="bg-slate-100 text-slate-900 border-b border-slate-200 font-black text-[9px] uppercase sticky top-0 z-10">
                    <tr>
                      <th onClick={() => gererTri('date_debut')} className="p-1.5 cursor-pointer">Date ↕</th>
                      <th onClick={() => gererTri('code_piece')} className="p-1.5 cursor-pointer font-mono">N° ↕</th>
                      <th onClick={() => gererTri('caissier')} className="p-1.5 cursor-pointer">Caissier ↕</th>
                      <th onClick={() => gererTri('montant_attendu')} className="p-1.5 text-right cursor-pointer">Attendu ↕</th>
                      <th onClick={() => gererTri('montant_verse')} className="p-1.5 text-right cursor-pointer">Versé ↕</th>
                      <th onClick={() => gererTri('ecart')} className="p-1.5 text-right cursor-pointer">Écart ↕</th>
                      <th onClick={() => gererTri('statut_versement')} className="p-1.5 text-center cursor-pointer">Statut ↕</th>
                      <th className="p-1.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {etatsCaisseAffiches.length === 0 && cloturesCaissesList.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="p-3 text-center text-slate-500 font-bold">Aucun état.</td>
                      </tr>
                    ) : (
                      <>
                        {etatsCaisseAffiches.map((etat) => {
                          const estVerse = etat.statut_versement === 'VERSE';
                          const nomCaissierAffichage = moduleActuel === 'LIVRAISON' ? (etat.caissier || '-') : obtenirNomCaissier(etat.caissier);
                          const dateObj = new Date(etat.date_debut);
                          const dateFormatee = !isNaN(dateObj) ? dateObj.toLocaleDateString('fr-FR') : etat.date_debut;
                          const numeroClotureAffichage = etat.code_piece || `CL-${(etat.date_debut || '').replace(/-/g, '')}-1`;
                          const montantAttenduNum = Number(etat.montant_attendu) || 0;
                          const montantVerseNum = Number(etat.montant_verse) || 0;
                          const ecartNum = Number(etat.ecart) || (montantVerseNum - montantAttenduNum);

                          return (
                            <tr key={etat.id} className="hover:bg-slate-50">
                              <td className="p-1.5 font-bold text-slate-800 whitespace-nowrap">{dateFormatee}</td>
                              <td className="p-1.5 font-mono font-black text-orange-600 whitespace-nowrap">{numeroClotureAffichage}</td>
                              <td className="p-1.5 uppercase font-bold text-slate-900 truncate">{nomCaissierAffichage}</td>
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
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-2 py-0.5 rounded-lg text-[9px]"
                                  >
                                    Verser 🚀
                                  </button>
                                ) : (
                                  <span className="text-[9px] text-slate-400 font-bold">Clôturé</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                        {cloturesCaissesList.map((cl) => {
                          const dateObj = new Date(cl.date_debut || cl.created_at);
                          const dateFormatee = !isNaN(dateObj) ? dateObj.toLocaleDateString('fr-FR') : cl.date_debut;
                          const montantAttenduNum = Number(cl.montant_attendu || cl.montant_total_encaisse) || 0;
                          const montantVerseNum = Number(cl.montant_reel_verse || montantAttenduNum) || 0;
                          const ecartNum = Number(cl.ecart_caisse || (montantVerseNum - montantAttenduNum)) || 0;

                          return (
                            <tr key={`cloture-${cl.id}`} className="hover:bg-slate-50 bg-orange-50/30">
                              <td className="p-1.5 font-bold text-slate-800 whitespace-nowrap">{dateFormatee}</td>
                              <td className="p-1.5 font-mono font-black text-orange-600 whitespace-nowrap">{cl.code_cloture || `CL-${(cl.date_debut || '').replace(/-/g, '')}-1`}</td>
                              <td className="p-1.5 uppercase font-bold text-slate-900 truncate">{cl.caissier || 'CAISSIER'}</td>
                              <td className="p-1.5 text-right font-bold text-slate-700">{montantAttenduNum.toLocaleString('fr-FR')}</td>
                              <td className="p-1.5 text-right font-black text-emerald-700">{montantVerseNum.toLocaleString('fr-FR')}</td>
                              <td className={`p-1.5 text-right font-black ${ecartNum === 0 ? 'text-slate-600' : ecartNum > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                {ecartNum > 0 ? `+${ecartNum.toLocaleString('fr-FR')}` : ecartNum.toLocaleString('fr-FR')}
                              </td>
                              <td className="p-1.5 text-center">
                                <span className="px-1.5 py-0.5 rounded-full text-[8px] font-black bg-emerald-100 text-emerald-800">
                                  VERSÉ
                                </span>
                              </td>
                              <td className="p-1.5 text-center">
                                <span className="text-[9px] text-emerald-700 font-bold">Automatique</span>
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- MODALE DE SÉLECTION DE LA CAISSE DE VERSEMENT --- */}
      {afficherModaleVersement && etatEnCoursDeVersement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-2xs p-4">
          <div className="bg-slate-900 text-white w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden p-4 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-orange-400">
                🏦 CHOISIR LA CAISSE DE VERSEMENT [{etatEnCoursDeVersement.code_piece || 'CL'}]
              </h3>
              <button
                onClick={() => setAfficherModaleVersement(false)}
                className="text-slate-400 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] text-slate-300">
              Indiquez la caisse dans laquelle vous souhaitez verser la recette de clôture <span className="font-mono font-bold text-orange-400">[{etatEnCoursDeVersement.code_piece || 'CL'}]</span> d'un montant de <span className="font-bold text-emerald-400">{Number(etatEnCoursDeVersement.montant_verse).toLocaleString('fr-FR')} CFA</span>.
            </p>

            <div>
              <label className="block font-black text-slate-400 text-[9px] uppercase mb-1">Caisse de Destination *</label>
              <select
                value={caisseDestinationVersement}
                onChange={(e) => setCaisseDestinationVersement(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2 font-black text-white text-[11px]"
              >
                {caisses.map((c) => (
                  <option key={c.id} value={c.id}>💵 {c.nom_caisse}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAfficherModaleVersement(false)}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl text-[10px]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={executerVersementModale}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-5 py-2 rounded-xl text-[10px] shadow-2xs"
              >
                Validation...
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALE DE RECHERCHE DE TIERS --- */}
      {afficherModaleTiers && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 bg-slate-950/70 backdrop-blur-2xs p-4">
          <div className="bg-white text-slate-900 w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-3.5 border-b border-slate-200 bg-slate-900 text-white">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-orange-400">
                SÉLECTIONNER UN TIERS / CLIENT / EMPLOYÉ
              </h3>
              <button
                onClick={() => {
                  setAfficherModaleTiers(false);
                  setRechercheTiersInput('');
                }}
                className="text-slate-400 hover:text-white font-bold p-1 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 space-y-2 max-h-[75vh] overflow-y-auto">
              <div className="relative mb-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="RECHERCHER..."
                  value={rechercheTiersInput}
                  onChange={(e) => setRechercheTiersInput(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 font-bold text-slate-900 text-[11px] uppercase placeholder-slate-400 shadow-inner focus:outline-none focus:border-orange-500"
                />
              </div>

              <div
                onClick={() => {
                  setTiersLivreFiltre('');
                  setAfficherModaleTiers(false);
                  setRechercheTiersInput('');
                }}
                className="bg-white hover:bg-slate-50 text-slate-900 font-black p-3 rounded-xl border border-slate-300 cursor-pointer transition shadow-2xs uppercase text-[10px] flex justify-between items-center"
              >
                <span>⭐ -- TOUS LES TIERS / CLIENTS / EMPLOYÉS --</span>
                <span className="text-[9px] text-orange-600 font-black">TOUS</span>
              </div>

              <div className="space-y-1.5">
                {listeTiersFiltresModale.length === 0 ? (
                  <div className="p-4 text-center text-slate-500 font-bold text-[11px]">
                    Aucun tiers trouvé.
                  </div>
                ) : (
                  listeTiersFiltresModale.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setTiersLivreFiltre(item.nom);
                        setAfficherModaleTiers(false);
                        setRechercheTiersInput('');
                      }}
                      className="bg-white hover:bg-orange-50 text-slate-900 font-black p-3 rounded-xl border border-slate-300 cursor-pointer transition shadow-2xs uppercase text-[11px] flex justify-between items-center"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-orange-600 text-[9px] font-mono shrink-0">({item.categorie})</span>
                        <span className="truncate">{item.nom}</span>
                      </div>
                      <span className="text-[10px] text-slate-600 font-bold border border-slate-300 px-2 py-1 rounded-lg shrink-0">SÉLECTIONNER</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}