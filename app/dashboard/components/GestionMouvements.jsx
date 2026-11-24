'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { localSync } from '../../lib/localSync';

export default function GestionMouvements({ entrepriseId = '4TS-290136' }) {
  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();
  const estModeBoutique = moduleActuel === 'BOUTIQUE';

  const libelleLivreur = estModeBoutique ? 'Emplacement' : 'Livreur';
  const libellePlaceholderSource = estModeBoutique ? '-- Emplacement --' : '-- Livreur --';
  const libellePlaceholderDest = estModeBoutique ? '-- Emplacement (Optionnel) --' : '-- Livreur (Optionnel) --';
  const libelleAucunLivreur = estModeBoutique ? '-- Aucun emplacement --' : '-- Aucun livreur --';
  const libelleRechercheLivreur = estModeBoutique ? 'RECHERCHER UN EMPLACEMENT...' : 'RECHERCHER UN LIVREUR...';

  const cleCacheMouvements = `mouvements_stock_${entrepriseId}_${moduleActuel}`;
  const cleCacheArticles = `articles_${entrepriseId}_${moduleActuel}`;
  const cleCacheDepots = `depots_${entrepriseId}_${moduleActuel}`;
  const cleCacheEmplacements = `emplacements_${entrepriseId}_${moduleActuel}`;
  const cleCacheFournisseurs = `fournisseurs_${entrepriseId}_${moduleActuel}`;

  const obtenirNomOperateurConnecte = () => {
    if (typeof window === 'undefined') return 'DC KTS';
    
    try {
      const clesObjets = ['utilisateur_connecte', 'utilisateurConnecte'];
      for (const cleObj of clesObjets) {
        const strVal = localStorage.getItem(cleObj);
        if (strVal) {
          try {
            const userObj = JSON.parse(strVal);
            if (userObj) {
              const nomTrouve = userObj.nom_complet || userObj.nom_utilisateur || userObj.nom || userObj.prenom || userObj.name || userObj.username;
              if (nomTrouve && String(nomTrouve).trim() !== '' && String(nomTrouve).trim().toLowerCase() !== 'utilisateur') {
                return String(nomTrouve).trim().toUpperCase();
              }
            }
          } catch (errJson) {
            if (strVal.trim() !== '' && strVal.trim().toLowerCase() !== 'utilisateur') {
              return strVal.trim().toUpperCase();
            }
          }
        }
      }

      const clesPossibles = [
        'nom_complet',
        'nom_utilisateur_connecte', 
        'nom_utilisateur', 
        'utilisateur_connecte_nom', 
        'current_user_name',
        'user_name',
        'operateur'
      ];
      for (const cle of clesPossibles) {
        const val = localStorage.getItem(cle);
        if (val && val.trim() !== '' && val.trim().toLowerCase() !== 'utilisateur' && val !== 'Utilisateur Inconnu') {
          return val.trim().toUpperCase();
        }
      }
    } catch (e) {
      console.error('Erreur lecture utilisateur connecté:', e);
    }

    return 'ZOA ABATE KATY';
  };

  const [mouvements, setMouvements] = useState(() => {
    if (typeof window !== 'undefined') {
      const data = localSync.recupererDonneesLocales(cleCacheMouvements);
      return Array.isArray(data) ? data : [];
    }
    return [];
  });

  const [articles, setArticles] = useState(() => {
    if (typeof window !== 'undefined') {
      const data = localSync.recupererDonneesLocales(cleCacheArticles);
      return Array.isArray(data) ? data : [];
    }
    return [];
  });

  const [depots, setDepots] = useState(() => {
    if (typeof window !== 'undefined') {
      const data = localSync.recupererDonneesLocales(cleCacheDepots);
      return Array.isArray(data) ? data : [];
    }
    return [];
  });

  const [emplacements, setEmplacements] = useState(() => {
    if (typeof window !== 'undefined') {
      const data = localSync.recupererDonneesLocales(cleCacheEmplacements);
      return Array.isArray(data) ? data : [];
    }
    return [];
  });

  const [fournisseurs, setFournisseurs] = useState(() => {
    if (typeof window !== 'undefined') {
      const data = localSync.recupererDonneesLocales(cleCacheFournisseurs);
      return Array.isArray(data) ? data : [];
    }
    return [];
  });

  const [familles, setFamilles] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);
  const [enTrainDInsertion, setEnTrainDInsertion] = useState(false);

  const [modalMessage, setModalMessage] = useState(null); 
  const [modalConfirmation, setModalConfirmation] = useState(null); 

  const [roleNom, setRoleNom] = useState('');
  const [emailConnecteUser, setEmailConnecteUser] = useState('');
  const [nomUtilisateurConnecte, setNomUtilisateurConnecte] = useState(obtenirNomOperateurConnecte);
  const [permissions, setPermissions] = useState({
    peut_creer: true,
    peut_modifier: true,
    peut_supprimer: true,
    peut_valider: true
  });

  const [limiteDocuments, setLimiteDocuments] = useState(20);
  
  const [ongletPrincipal, setOngletPrincipal] = useState(null);
  const [modeAffichage, setModeAffichage] = useState('SAISIE');
  const [typeOperation, setTypeOperation] = useState('TRANSFERT');

  // États pour la gestion des règlements d'achats
  const [statutReglement, setStatutReglement] = useState('SOLDE'); // SOLDE, AVANCE, NON_PAYE
  const [montantPayeAchat, setMontantPayeAchat] = useState(0);
  const [modalReglementOuvert, setModalReglementOuvert] = useState(false);

  const [filtreDateDebut, setFiltreDateDebut] = useState('');
  const [filtreDateFin, setFiltreDateFin] = useState('');
  const [filtrePartenaire, setFiltrePartenaire] = useState('');
  const [filtreLivreur, setFiltreLivreur] = useState('');

  const [modalFiltrePartenaireOuvert, setModalFiltrePartenaireOuvert] = useState(false);
  const [modalFiltreLivreurOuvert, setModalFiltreLivreurOuvert] = useState(false);
  const [rechercheFiltreModal, setRechercheFiltreModal] = useState('');

  const [enTeteDoc, setEnTeteDoc] = useState({
    numeroDoc: '',
    numeroAffichage: '',
    dateDoc: new Date().toISOString().split('T')[0],
    id_depot_source: '',
    id_emplacement_source: '',
    id_depot_destination: '',
    id_emplacement_destination: '',
    id_fournisseur: '',
    referenceDoc: '',
    motif: '',
    famille_filtre: 'TOUTES',
    operateur: obtenirNomOperateurConnecte(),
  });

  const [modalArticleOuvert, setModalArticleOuvert] = useState(false);
  const [recherchePopup, setRecherchePopup] = useState('');
  const [articleSelectionneTemp, setArticleSelectionneTemp] = useState(null);
  const [quantiteSaisie, setQuantiteSaisie] = useState(1);
  const [prixUnitaireSaisi, setPrixUnitaireSaisi] = useState(0);

  const [modalDepotSourceOuvert, setModalDepotSourceOuvert] = useState(false);
  const [modalDepotDestOuvert, setModalDepotDestOuvert] = useState(false);
  const [modalLivreurSourceOuvert, setModalLivreurSourceOuvert] = useState(false);
  const [modalLivreurDestOuvert, setModalLivreurDestOuvert] = useState(false);
  const [modalFournisseurOuvert, setModalFournisseurOuvert] = useState(false);
  const [modalTypeMouvementOuvert, setModalTypeMouvementOuvert] = useState(false);
  const [rechercheModalPopup, setRechercheModalPopup] = useState('');

  const [lignesPanier, setLignesPanier] = useState([]);
  const [mouvementEnEditionId, setMouvementEnEditionId] = useState(null);
  const [numeroDocOriginal, setNumeroDocOriginal] = useState(null);
  const [documentEnLectureSeule, setDocumentEnLectureSeule] = useState(false);

  const [etatInitialEdition, setEtatInitialEdition] = useState(null);

  const [colonneTri, setColonneTri] = useState('date');
  const [ordreTri, setOrdreTri] = useState('desc');

  const inputQuantiteRef = useRef(null);
  const inputPrixRef = useRef(null);
  const boutonSelectionArticleRef = useRef(null);

  const afficherMessage = (texte, type = 'info', titre = 'Notification') => {
    setModalMessage({ texte, type, titre });
  };

  const libellesTypesMouvement = {
    TRANSFERT: 'TRANSFERT ENTRE DÉPÔTS (TR)',
    ENTREE: 'ACHAT / APPROVISIONNEMENT (APP)',
    ENTREE_STOCK: 'ENTRÉE EN STOCK (ES)',
    SORTIE: 'SORTIE DE STOCK (MS)',
    AVARIES: 'AVARIES & PERTES (AV)',
    INVENTAIRE: 'SAISIE D’INVENTAIRE (INV)',
  };

  const descriptionsTypesMouvement = {
    TRANSFERT: 'Transférer des articles d’un dépôt ou emplacement vers un autre.',
    ENTREE_STOCK: 'Ajouter directement du stock en interne (ex: régularisation, don, etc.).',
    SORTIE: 'Enregistrer une sortie de stock interne ou une consommation.',
    AVARIES: 'Déclarer des articles perdus, endommagés ou périmés.',
    INVENTAIRE: 'Réajuster l’inventaire physique réel d’un dépôt.',
  };

  const genererNumeroDocSecurise = (type) => {
    const prefixes = { ENTREE: 'APP', ENTREE_STOCK: 'ES', SORTIE: 'MS', AVARIES: 'AV', TRANSFERT: 'TR', INVENTAIRE: 'INV' };
    const prefix = prefixes[type] || 'TR';
    const timestampAleatoire = Date.now().toString().slice(-6);
    const suffixeAleatoire = Math.floor(Math.random() * 900 + 100);
    return `${prefix}-${timestampAleatoire}-${suffixeAleatoire}`;
  };

  // Calcul du montant total de la facture d'achat
  const montantTotalFacture = useMemo(() => {
    return lignesPanier.reduce((acc, ligne) => acc + (Number(ligne.quantite || 0) * Number(ligne.prix_unitaire || 0)), 0);
  }, [lignesPanier]);

  // Synchronisation du montant payé selon le statut choisi
  useEffect(() => {
    if (statutReglement === 'SOLDE') {
      setMontantPayeAchat(montantTotalFacture);
    } else if (statutReglement === 'NON_PAYE') {
      setMontantPayeAchat(0);
    }
  }, [statutReglement, montantTotalFacture]);

  const resteAVerserFacture = Math.max(0, montantTotalFacture - Number(montantPayeAchat || 0));

  const chargerDonnees = async (silencieux = false) => {
    const mouvementsLocaux = localSync.recupererDonneesLocales(cleCacheMouvements);
    if (!silencieux && mouvementsLocaux && mouvementsLocaux.length > 0) {
      setMouvements(mouvementsLocaux);
      setChargement(false);
    } else if (!silencieux) {
      setChargement(true);
    }

    try {
      const nomConnecteEffectif = obtenirNomOperateurConnecte();
      
      if (typeof window !== 'undefined') {
        const utilisateurConnecteStr = localStorage.getItem('utilisateur_connecte');
        if (utilisateurConnecteStr) {
          try {
            const userObj = JSON.parse(utilisateurConnecteStr);
            const emailConnecte = (userObj.email || '').trim().toLowerCase();
            setEmailConnecteUser(emailConnecte);

            const nomRoleUser = (userObj.nom_role || userObj.role || '').trim().toUpperCase();
            setRoleNom(nomRoleUser);

            const estSuperAdminOuAdmin = emailConnecte === 'stephs7352@gmail.com' || nomRoleUser.includes('ADMINISTRATEUR') || nomRoleUser === 'ADMINISTRATEUR' || nomRoleUser.includes('ADMIN');
            
            if (estSuperAdminOuAdmin) {
              setPermissions({
                peut_creer: true,
                peut_modifier: true,
                peut_supprimer: true,
                peut_valider: true
              });
            } else if (nomRoleUser) {
              const { data: roleData } = await supabase
                .from('roles')
                .select('permissions')
                .eq('id_entreprise', entrepriseId)
                .eq('module', moduleActuel)
                .ilike('nom_role', nomRoleUser)
                .maybeSingle();

              if (roleData && roleData.permissions) {
                if (roleData.permissions._plein_acces) {
                  setPermissions({ peut_creer: true, peut_modifier: true, peut_supprimer: true, peut_valider: true });
                } else {
                  const permsMod = roleData.permissions['mouvements_stock'] || roleData.permissions[moduleActuel.toLowerCase()] || {};
                  setPermissions({
                    peut_creer: !!permsMod.creation,
                    peut_modifier: !!permsMod.modification,
                    peut_supprimer: !!permsMod.suppression,
                    peut_valider: !!permsMod.modification || !!permsMod.creation
                  });
                }
              }
            }
          } catch (e) {}
        }
      }

      setNomUtilisateurConnecte(nomConnecteEffectif);
      setEnTeteDoc(prev => ({ ...prev, operateur: nomConnecteEffectif }));

      const { data: dataDepots } = await supabase
        .from('depots_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      const depotsList = Array.isArray(dataDepots) ? dataDepots : [];
      setDepots(depotsList);
      localSync.sauvegarderDonneesLocales(cleCacheDepots, depotsList);

      const { data: dataEmplacements } = await supabase
        .from('emplacements_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      const emplacementsList = Array.isArray(dataEmplacements) ? dataEmplacements : [];
      setEmplacements(emplacementsList);
      localSync.sauvegarderDonneesLocales(cleCacheEmplacements, emplacementsList);

      const { data: dataFournisseurs } = await supabase
        .from('fournisseurs')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      const fournisseursList = Array.isArray(dataFournisseurs) ? dataFournisseurs : [];
      setFournisseurs(fournisseursList);
      localSync.sauvegarderDonneesLocales(cleCacheFournisseurs, fournisseursList);

      const { data: dataArticles } = await supabase
        .from('articles_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      if (Array.isArray(dataArticles)) {
        setArticles(dataArticles);
        localSync.sauvegarderDonneesLocales(cleCacheArticles, dataArticles);
      }

      const { data: dataFamilles } = await supabase
        .from('familles_articles')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setFamilles(Array.isArray(dataFamilles) ? dataFamilles : []);

      let mouvementsList = [];
      const { data: mouvementsRpc, error: rpcError } = await supabase.rpc('recuperer_mouvements_stock', {
        p_entreprise_id: entrepriseId,
        p_module: moduleActuel
      });

      if (rpcError || !mouvementsRpc) {
        const { data: dataMouvements, error: errMouv } = await supabase
          .from('mouvements_stock')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .eq('module', moduleActuel)
          .order('created_at', { ascending: false });

        if (errMouv) throw errMouv;
        mouvementsList = Array.isArray(dataMouvements) ? dataMouvements : [];
      } else {
        mouvementsList = Array.isArray(mouvementsRpc) ? mouvementsRpc : [];
      }

      setMouvements(mouvementsList);
      localSync.sauvegarderDonneesLocales(cleCacheMouvements, mouvementsList);

      if (!mouvementEnEditionId) {
        setEnTeteDoc((prev) => ({ ...prev, numeroDoc: genererNumeroDocSecurise(typeOperation), operateur: nomConnecteEffectif }));
      }
    } catch (err) { 
      console.error('Erreur (mode hors-ligne actif) :', err.message); 
    } finally { 
      setChargement(false); 
    }
  };

  useEffect(() => { 
    chargerDonnees(); 
    localSync.synchroniserVersCloud(supabase);
  }, [entrepriseId, moduleActuel]);

  const basculerVersAchats = () => {
    if (enTrainDeSauvegarder) return;
    setOngletPrincipal('ACHATS');
    setTypeOperation('ENTREE');
    setModeAffichage('SAISIE');
    setMouvementEnEditionId(null);
    setNumeroDocOriginal(null);
    setDocumentEnLectureSeule(false);
    setEtatInitialEdition(null);
    setLignesPanier([]);
    setArticleSelectionneTemp(null);
    setStatutReglement('SOLDE');
    setMontantPayeAchat(0);
    setEnTeteDoc(prev => ({
      ...prev,
      id_depot_source: '',
      id_depot_destination: '',
      id_fournisseur: '',
      referenceDoc: '',
      numeroDoc: genererNumeroDocSecurise('ENTREE'),
      numeroAffichage: '',
      operateur: obtenirNomOperateurConnecte()
    }));
  };

  const basculerVersMouvements = () => {
    if (enTrainDeSauvegarder) return;
    setOngletPrincipal('MOUVEMENTS');
    const typeParDefaut = typeOperation === 'ENTREE' ? 'TRANSFERT' : typeOperation;
    setTypeOperation(typeParDefaut);
    setModeAffichage('SAISIE');
    setMouvementEnEditionId(null);
    setNumeroDocOriginal(null);
    setDocumentEnLectureSeule(false);
    setEtatInitialEdition(null);
    setLignesPanier([]);
    setArticleSelectionneTemp(null);
    setEnTeteDoc(prev => ({
      ...prev,
      id_depot_source: '',
      id_depot_destination: '',
      id_fournisseur: '',
      referenceDoc: '',
      numeroDoc: genererNumeroDocSecurise(typeParDefaut),
      numeroAffichage: '',
      operateur: obtenirNomOperateurConnecte()
    }));
  };

  const emplacementsSourceFiltres = Array.isArray(emplacements) ? emplacements : [];
  const emplacementsDestinationFiltres = Array.isArray(emplacements) ? emplacements : [];

  const correspondAuDepot = (valeurDepotFlux, depotCibleId) => {
    if (!valeurDepotFlux || !depotCibleId) return false;
    if (String(valeurDepotFlux) === String(depotCibleId)) return true;
    const depotObj = depots.find((d) => String(d.id) === String(depotCibleId));
    if (depotObj && depotObj.nom_depot && String(valeurDepotFlux).trim().toUpperCase() === String(depotObj.nom_depot).trim().toUpperCase()) return true;
    return false;
  };

  const obtenirNomDepotParId = (depotId) => {
    if (!depotId) return '-';
    const depotTrouve = depots.find(d => String(d.id) === String(depotId));
    if (depotTrouve) return depotTrouve.nom_depot || depotTrouve.nom || depotId;
    return depotId;
  };

  const obtenirNomFournisseurParId = (fournId) => {
    if (!fournId) return '';
    const fObj = fournisseurs.find(f => String(f.id) === String(fournId));
    return fObj ? (fObj.nom_fournisseur || fObj.nom || '') : '';
  };

  const obtenirNomEmplacementParId = (empId) => {
    if (!empId) return '-';
    const emp = emplacements.find(e => String(e.id) === String(empId));
    if (emp) {
      return emp.nom_emplacement || emp.code_emplacement || emp.responsable_emplacement || '-';
    }
    return '-';
  };

  const obtenirNomDestinationParMvt = (mvt) => {
    if (!mvt) return '-';
    if (mvt.id_emplacement_destination) {
      return obtenirNomEmplacementParId(mvt.id_emplacement_destination);
    }
    if (mvt.id_depot_destination) {
      return obtenirNomDepotParId(mvt.id_depot_destination);
    }
    if (mvt.id_emplacement_source) {
      return obtenirNomEmplacementParId(mvt.id_emplacement_source);
    }
    return '-';
  };

  const obtenirTousLesFluxArticle = (articleId, numeroDocExclu = null) => {
    let flux = [];
    mouvements
      .filter((m) => {
        if (numeroDocExclu && String(m.motif_remarque) === String(numeroDocExclu)) return false;
        return String(m.id_article) === String(articleId);
      })
      .forEach((m) => {
        flux.push({ 
          date: m.created_at || '', 
          depot_source: m.id_depot_source, 
          depot_destination: m.id_depot_destination, 
          emplacement_source: m.id_emplacement_source,
          emplacement_destination: m.id_emplacement_destination,
          quantite: parseInt(m.quantite || 0), 
          type: (m.type_mouvement || '').toUpperCase() 
        });
      });

    flux.sort((a, b) => new Date(a.date) - new Date(b.date));
    return flux;
  };

  const calculerStockPourEmplacement = (articleId, emplacementId) => {
    let stockEmp = 0;
    const fluxArticle = obtenirTousLesFluxArticle(articleId, numeroDocOriginal || (mouvementEnEditionId ? enTeteDoc.numeroDoc : null));
    
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
      if (typeMvt === 'ENTREE_STOCK' && matchSource) {
        stockEmp += qte;
        return;
      }
      if (matchDest) stockEmp += qte;
      if (matchSource) stockEmp -= qte;
    });

    return Math.max(0, stockEmp);
  };

  const calculerStockPourDepotActuel = (articleId) => {
    const emplacementCibleId = enTeteDoc.id_emplacement_source;
    if (emplacementCibleId) {
      return calculerStockPourEmplacement(articleId, emplacementCibleId);
    }

    const depotCibleId = enTeteDoc.id_depot_source;
    if (!depotCibleId) {
      const artObj = articles.find(a => String(a.id_article || a.id) === String(articleId));
      return parseInt(artObj?.Quantite_Stock || artObj?.quantite_stock || 0);
    }
    let stockDepot = 0;
    const fluxArticle = obtenirTousLesFluxArticle(articleId, numeroDocOriginal || (mouvementEnEditionId ? enTeteDoc.numeroDoc : null));
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
        if (matchDepotSource && matchDepotDest) {
          return;
        }
        if (matchDepotDest) stockDepot += qte; 
        if (matchDepotSource) stockDepot -= qte; 
        return; 
      }
      if (typeMvt === 'ENTREE_STOCK' && matchDepotSource) {
        stockDepot += qte;
        return;
      }
      if (typeMvt === 'ENTREE' || typeMvt === 'APPROVISIONNEMENT' || typeMvt.includes('ACHAT') || typeMvt.includes('APPRO') || typeMvt.includes('FACTURE')) {
        if (matchDepotSource || matchDepotDest) stockDepot += qte;
      } else if (typeMvt === 'SORTIE' || typeMvt === 'AVARIES') {
        if (matchDepotSource) stockDepot -= qte;
      } else {
        if (matchDepotSource || matchDepotDest) stockDepot += qte;
      }
    });
    return Math.max(0, stockDepot);
  };

  const documentsGroupes = useMemo(() => {
    const documentsBruts = Object.values(
      mouvements
        .filter((mvt) => {
          const motif = (mvt.motif_remarque || '').trim().toUpperCase();
          const typeMvt = (mvt.type_mouvement || 'TRANSFERT').toUpperCase();
          
          const estSystemeAuto = (
            motif.includes('CMD-') || 
            motif.includes('LIVRAISON') || 
            motif.includes('RESTITUTION') ||
            motif.includes('VENTE') ||
            motif.includes('VENTE TICKET')
          );
          if (estSystemeAuto) return false;

          if (ongletPrincipal === 'ACHATS') {
            return typeMvt === 'ENTREE' || typeMvt === 'APPROVISIONNEMENT';
          } else {
            return typeMvt !== 'ENTREE' && typeMvt !== 'APPROVISIONNEMENT';
          }
        })
        .reduce((acc, mvt) => {
          const numDocBrut = mvt.motif_remarque || 'SANS-REF';
          
          if (!acc[numDocBrut]) { 
            const operateurEnBase = mvt.operateur;
            const operateurAffiche = (operateurEnBase && String(operateurEnBase).trim() !== '' && String(operateurEnBase).trim().toLowerCase() !== 'utilisateur' && String(operateurEnBase).trim() !== 'Utilisateur Inconnu') 
              ? String(operateurEnBase).trim().toUpperCase() 
              : obtenirNomOperateurConnecte();

            const refDocAssociee = mvt.reference || '';

            acc[numDocBrut] = { 
              numeroDocBrut: numDocBrut,
              referenceDoc: refDocAssociee,
              date: mvt.created_at || '', 
              type: (mvt.type_mouvement || 'TRANSFERT').toUpperCase(), 
              depotNom: obtenirNomDepotParId(mvt.id_depot_source), 
              depotDestNom: obtenirNomDestinationParMvt(mvt),
              id_emplacement_source: mvt.id_emplacement_source,
              id_emplacement_destination: mvt.id_emplacement_destination,
              operateur: operateurAffiche, 
              lignesCount: 0 
            }; 
          }
          if (!acc[numDocBrut].referenceDoc && mvt.reference) {
            acc[numDocBrut].referenceDoc = mvt.reference;
          }
          acc[numDocBrut].lignesCount += 1;
          return acc;
        }, {})
    );

    documentsBruts.sort((a, b) => new Date(a.date) - new Date(b.date));

    const compteursParType = {};
    return documentsBruts.map((doc) => {
      const typeMvt = doc.type;
      const prefixes = { ENTREE: 'APP', ENTREE_STOCK: 'ES', SORTIE: 'MS', AVARIES: 'AV', TRANSFERT: 'TR', INVENTAIRE: 'INV' };
      const prefix = prefixes[typeMvt] || 'TR';

      if (!compteursParType[prefix]) {
        compteursParType[prefix] = 0;
      }
      compteursParType[prefix] += 1;
      const numeroSequentiel = `${prefix}-${String(compteursParType[prefix]).padStart(2, '0')}`;

      return {
        ...doc,
        numeroDoc: numeroSequentiel
      };
    });
  }, [mouvements, depots, emplacements, ongletPrincipal]);

  const articlesPopupFiltres = articles.filter((art) => {
    const designation = (art.Designation || art.designation || '').toLowerCase();
    const matchRecherche = designation.includes((recherchePopup || '').toLowerCase());
    if (!matchRecherche) return false;

    const artEntreprise = String(art.id_entreprise || art.entreprise_id || entrepriseId);
    const artModule = String(art.module || moduleActuel).toUpperCase();
    if (artEntreprise !== String(entrepriseId)) return false;
    if (artModule !== String(moduleActuel)) return false;

    const artPartenaire = String(art.partenaire || art.id_partenaire || art.fournisseur || '').trim().toUpperCase();
    const emplacementSourceId = enTeteDoc.id_emplacement_source;

    if (emplacementSourceId) {
      const empObj = emplacements.find(e => String(e.id) === String(emplacementSourceId));
      if (empObj) {
        const empPartenaire = String(empObj.partenaire || empObj.id_partenaire || '').trim().toUpperCase();
        if (empPartenaire && artPartenaire && empPartenaire !== artPartenaire) {
          return false;
        }
      }
    }

    if (ongletPrincipal === 'ACHATS' && enTeteDoc.id_fournisseur) {
      const fournNom = obtenirNomFournisseurParId(enTeteDoc.id_fournisseur).toUpperCase();
      if (artPartenaire && artPartenaire !== String(enTeteDoc.id_fournisseur).toUpperCase() && artPartenaire !== fournNom) {
        return false;
      }
    }

    const artId = art.id_article || art.id;
    if (ongletPrincipal === 'MOUVEMENTS' && (typeOperation === 'SORTIE' || typeOperation === 'TRANSFERT' || typeOperation === 'AVARIES')) {
      if (emplacementSourceId) {
        const stockEmp = calculerStockPourEmplacement(artId, emplacementSourceId);
        if (stockEmp <= 0) return false;
      } else if (enTeteDoc.id_depot_source) {
        const stockDep = calculerStockPourDepotActuel(artId);
        if (stockDep <= 0) return false;
      }
    }

    return true;
  });

  const verifierEnTeteAvantSaisie = () => {
    if (documentEnLectureSeule) {
      afficherMessage('Ce document est en lecture seule (journée clôturée).', 'erreur', 'Accès restreint');
      return false;
    }

    const dateDuJour = new Date().toISOString().split('T')[0];
    if (enTeteDoc.dateDoc < dateDuJour) {
      afficherMessage(`Modification interdite : le document est daté du ${enTeteDoc.dateDoc} (journée clôturée et verrouillée).`, 'erreur', 'Journée clôturée');
      return false;
    }

    if (!enTeteDoc.referenceDoc || String(enTeteDoc.referenceDoc).trim() === '') {
      afficherMessage(ongletPrincipal === 'ACHATS' ? 'La référence / N° Facture ou Motif est obligatoire.' : 'La zone Motif est obligatoire pour pouvoir ajouter des articles.', 'erreur', 'Champ manquant');
      return false;
    }

    if (typeOperation === 'TRANSFERT' && ongletPrincipal === 'MOUVEMENTS') {
      if (!enTeteDoc.id_depot_source) { 
        afficherMessage('Sélectionnez le dépôt source (départ).', 'erreur', 'Dépôt manquant'); 
        return false; 
      }
      if (!enTeteDoc.id_depot_destination) { 
        afficherMessage('Sélectionnez le dépôt destination.', 'erreur', 'Dépôt manquant'); 
        return false; 
      }
    } else {
      if (!enTeteDoc.id_depot_source) { 
        afficherMessage('Sélectionnez le dépôt ou partenaire.', 'erreur', 'Dépôt manquant'); 
        return false; 
      }
    }
    return true;
  };

  const selectionnerArticleEtFocusQte = (art) => {
    if (enTrainDeSauvegarder || documentEnLectureSeule) return;
    if (!verifierEnTeteAvantSaisie()) return;
    setArticleSelectionneTemp(art);
    
    // En mode Achat, on récupère en priorité le Prix d'Achat
    const puDefaut = Number(art.Prix_Achat || art.prix_achat || art.Prix_Vente || art.prix_vente || art.prix_unitaire || art.PU || 0);
    setPrixUnitaireSaisi(puDefaut > 0 ? puDefaut : 0);
    setModalArticleOuvert(false);
    setRecherchePopup('');
    setTimeout(() => { if (inputQuantiteRef.current) { inputQuantiteRef.current.focus(); inputQuantiteRef.current.select(); } }, 50);
  };

  const modifierLignePanier = (ligne) => {
    if (enTrainDeSauvegarder || documentEnLectureSeule) return;
    const dateDuJour = new Date().toISOString().split('T')[0];
    if (enTeteDoc.dateDoc < dateDuJour) {
      afficherMessage(`Modification interdite : ce document appartient à une journée clôturée (${enTeteDoc.dateDoc}).`, 'erreur', 'Journée clôturée');
      return;
    }
    const artObj = articles.find(a => String(a.id_article || a.id) === String(ligne.id_article)) || { id_article: ligne.id_article, Designation: ligne.designation };
    setArticleSelectionneTemp(artObj);
    setQuantiteSaisie(ligne.quantite);
    setPrixUnitaireSaisi(ligne.prix_unitaire || 0);
    setLignesPanier(lignesPanier.filter((l) => String(l.id_article) !== String(ligne.id_article)));
    setTimeout(() => { if (inputQuantiteRef.current) { inputQuantiteRef.current.focus(); inputQuantiteRef.current.select(); } }, 50);
  };

  const ajouterArticleAuPanier = () => {
    if (enTrainDeSauvegarder || documentEnLectureSeule || enTrainDInsertion) return;
    
    if (!permissions.peut_creer && !mouvementEnEditionId) {
      afficherMessage('Action non autorisée : Votre profil n’a pas le droit de créer des mouvements.', 'erreur', 'Permission refusée');
      return;
    }
    if (!verifierEnTeteAvantSaisie() || !articleSelectionneTemp) { 
      if (!articleSelectionneTemp) afficherMessage('Sélectionnez un article.', 'erreur', 'Article manquant'); 
      return; 
    }
    
    const qte = parseInt(quantiteSaisie);
    const pu = ongletPrincipal === 'ACHATS' ? parseFloat(prixUnitaireSaisi) : 0;

    if (isNaN(qte) || (typeOperation === 'INVENTAIRE' ? qte < 0 : qte <= 0)) { 
      afficherMessage('Quantité invalide.', 'erreur', 'Erreur de saisie'); 
      return; 
    }

    if (ongletPrincipal === 'ACHATS' && (isNaN(pu) || pu < 0)) {
      afficherMessage('Prix unitaire d\'achat invalide.', 'erreur', 'Erreur de saisie');
      return;
    }

    setEnTrainDInsertion(true);

    const artId = String(articleSelectionneTemp.id_article || articleSelectionneTemp.id);
    const stockActuelDepot = calculerStockPourDepotActuel(artId);
    
    if (ongletPrincipal === 'MOUVEMENTS' && (typeOperation === 'SORTIE' || typeOperation === 'TRANSFERT' || typeOperation === 'AVARIES') && qte > stockActuelDepot) {
      afficherMessage(`Stock insuffisant (${stockActuelDepot} disponible(s)).`, 'erreur', 'Stock insuffisant');
      setEnTrainDInsertion(false);
      return;
    }

    let stockReelPrevisionnel = stockActuelDepot;
    if (ongletPrincipal === 'ACHATS' || typeOperation === 'ENTREE' || typeOperation === 'ENTREE_STOCK') stockReelPrevisionnel = stockActuelDepot + qte;
    else if (typeOperation === 'SORTIE' || typeOperation === 'AVARIES' || typeOperation === 'TRANSFERT') stockReelPrevisionnel = Math.max(0, stockActuelDepot - qte);
    else if (typeOperation === 'INVENTAIRE') stockReelPrevisionnel = qte;

    setLignesPanier((prevPanier) => {
      const dejaPresentIndex = prevPanier.findIndex((l) => String(l.id_article) === artId);

      if (dejaPresentIndex !== -1) {
        const nouveauPanier = [...prevPanier];
        const nouvelleQte = typeOperation === 'INVENTAIRE' ? qte : Number(nouveauPanier[dejaPresentIndex].quantite) + qte;
        nouveauPanier[dejaPresentIndex] = {
          ...nouveauPanier[dejaPresentIndex],
          quantite: nouvelleQte,
          prix_unitaire: pu,
          montant_total: nouvelleQte * pu,
          stockReel: stockReelPrevisionnel
        };
        return nouveauPanier;
      } else {
        return [
          ...prevPanier, 
          { 
            id_article: artId, 
            designation: articleSelectionneTemp.Designation || articleSelectionneTemp.designation, 
            quantite: qte, 
            prix_unitaire: pu,
            montant_total: qte * pu,
            stockActuel: stockActuelDepot, 
            stockReel: stockReelPrevisionnel 
          }
        ];
      }
    });

    setArticleSelectionneTemp(null);
    setQuantiteSaisie(1);
    setPrixUnitaireSaisi(0);
    
    setTimeout(() => { 
      if (boutonSelectionArticleRef.current) boutonSelectionArticleRef.current.focus(); 
      setEnTrainDInsertion(false); 
    }, 400);
  };

  const gererKeyDownQuantite = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (ongletPrincipal === 'ACHATS' && inputPrixRef.current) {
        inputPrixRef.current.focus();
        inputPrixRef.current.select();
      } else {
        ajouterArticleAuPanier();
      }
    }
  };

  const gererKeyDownPrix = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      ajouterArticleAuPanier();
    }
  };

  const verifierDroitSuppressionEffectif = () => {
    if (typeof window === 'undefined') return true;
    try {
      const utilisateurConnecteStr = localStorage.getItem('utilisateur_connecte');
      if (utilisateurConnecteStr) {
        const userObj = JSON.parse(utilisateurConnecteStr);
        const email = (userObj.email || '').trim().toLowerCase();
        const role = (userObj.nom_role || userObj.role || '').trim().toUpperCase();
        if (email === 'stephs7352@gmail.com' || role.includes('ADMIN') || role.includes('ADMINISTRATEUR')) {
          return true;
        }
      }
    } catch (e) {}

    const estSuperAdminOuAdmin = emailConnecteUser === 'stephs7352@gmail.com' || roleNom.includes('ADMINISTRATEUR') || roleNom === 'ADMINISTRATEUR' || roleNom.includes('ADMIN');
    return estSuperAdminOuAdmin || permissions.peut_supprimer;
  };

  const supprimerDocumentActuel = async () => {
    if (enTrainDeSauvegarder || documentEnLectureSeule) return;

    const dateDuJour = new Date().toISOString().split('T')[0];
    if (enTeteDoc.dateDoc < dateDuJour) {
      afficherMessage(`Suppression interdite : ce document appartient à une journée clôturée (${enTeteDoc.dateDoc}).`, 'erreur', 'Journée clôturée');
      return;
    }

    if (!verifierDroitSuppressionEffectif()) {
      afficherMessage('Action non autorisée : Seuls l’Administrateur et le Super Administrateur peuvent supprimer une opération.', 'erreur', 'Permission refusée');
      return;
    }

    if (lignesPanier.length === 0 && !mouvementEnEditionId) {
      afficherMessage('Aucune opération active ou document en cours à supprimer.', 'info', 'Information');
      return;
    }

    const motifSuppr = (mouvementEnEditionId && numeroDocOriginal) ? numeroDocOriginal : enTeteDoc.numeroDoc;

    setModalConfirmation({
      titre: 'Confirmation de suppression',
      texte: `Voulez-vous vraiment supprimer définitivement ce document (${enTeteDoc.numeroAffichage || enTeteDoc.numeroDoc}) ?`,
      onConfirm: async () => {
        setModalConfirmation(null);
        setEnTrainDeSauvegarder(true);
        try {
          if (motifSuppr) {
            const { error } = await supabase.from('mouvements_stock').delete().eq('motif_remarque', motifSuppr);
            if (error) {
              localSync.ajouterFileAttente('DELETE', 'mouvements_stock', { motif_remarque: motifSuppr });
            }

            const listeMaj = mouvements.filter(m => m.motif_remarque !== motifSuppr);
            setMouvements(listeMaj);
            localSync.sauvegarderDonneesLocales(cleCacheMouvements, listeMaj);
            localStorage.removeItem(cleCacheMouvements);
          }

          afficherMessage('Document supprimé avec succès.', 'succès', 'Suppression réussie');
          setLignesPanier([]);
          setMouvementEnEditionId(null);
          setNumeroDocOriginal(null);
          setDocumentEnLectureSeule(false);
          setEtatInitialEdition(null);
          setArticleSelectionneTemp(null);
          setQuantiteSaisie(1);
          setPrixUnitaireSaisi(0);
          setStatutReglement('SOLDE');
          setMontantPayeAchat(0);
          setEnTeteDoc(prev => ({
            ...prev,
            id_depot_source: '',
            id_depot_destination: '',
            id_fournisseur: '',
            referenceDoc: '',
            numeroDoc: genererNumeroDocSecurise(typeOperation),
            numeroAffichage: '',
            operateur: obtenirNomOperateurConnecte()
          }));
          await chargerDonnees(true);
          setModeAffichage('LISTE_DOCS');
        } catch (err) { 
          afficherMessage('Erreur : ' + err.message, 'erreur', 'Erreur système'); 
        } finally {
          setEnTrainDeSauvegarder(false);
        }
      }
    });
  };

  const validerDocumentMouvement = async () => {
    if (enTrainDeSauvegarder || documentEnLectureSeule) return;

    const dateDuJour = new Date().toISOString().split('T')[0];
    if (enTeteDoc.dateDoc < dateDuJour) {
      afficherMessage(`Modification interdite : impossible d'enregistrer sur la date du ${enTeteDoc.dateDoc} car cette journée est clôturée.`, 'erreur', 'Journée clôturée');
      return;
    }

    if (mouvementEnEditionId && !permissions.peut_modifier) {
      afficherMessage('Action non autorisée : Votre profil n’a pas le droit de modifier les mouvements.', 'erreur', 'Permission refusée');
      return;
    }
    if (!mouvementEnEditionId && !permissions.peut_creer) {
      afficherMessage('Action non autorisée : Votre profil n’a pas le droit de créer des mouvements.', 'erreur', 'Permission refusée');
      return;
    }
    if (!permissions.peut_valider) {
      afficherMessage('Action non autorisée : Votre profil n’a pas le droit de valider des documents.', 'erreur', 'Permission refusée');
      return;
    }

    if (!verifierEnTeteAvantSaisie() || lignesPanier.length === 0) { 
      if (lignesPanier.length === 0) afficherMessage('Ajoutez des articles.', 'erreur', 'Panier vide'); 
      return; 
    }

    setEnTrainDeSauvegarder(true);
    try {
      const motifDocumentFinal = (mouvementEnEditionId && numeroDocOriginal) ? numeroDocOriginal : enTeteDoc.numeroDoc;

      if (motifDocumentFinal) {
        await supabase.from('mouvements_stock').delete().eq('motif_remarque', motifDocumentFinal);
      }
      if (mouvementEnEditionId && enTeteDoc.numeroDoc && enTeteDoc.numeroDoc !== motifDocumentFinal) {
        await supabase.from('mouvements_stock').delete().eq('motif_remarque', enTeteDoc.numeroDoc);
      }
      
      const operateurActuel = obtenirNomOperateurConnecte();
      const referenceSaisie = (enTeteDoc.referenceDoc || '').trim().toUpperCase();
      
      let dateMvtIso = new Date().toISOString();
      if (enTeteDoc.dateDoc) {
        const dateSaisieObj = new Date(enTeteDoc.dateDoc);
        if (!isNaN(dateSaisieObj.getTime())) {
          const heureActuelle = new Date();
          dateSaisieObj.setHours(heureActuelle.getHours(), heureActuelle.getMinutes(), heureActuelle.getSeconds(), heureActuelle.getMilliseconds());
          dateMvtIso = dateSaisieObj.toISOString();
        }
      }

      const lignesUniquesMap = {};
      for (const ligne of lignesPanier) {
        const artId = String(ligne.id_article);
        const qte = Number(ligne.quantite || 0);
        const pu = Number(ligne.prix_unitaire || 0);
        if (qte <= 0) continue;
        if (!lignesUniquesMap[artId]) {
          lignesUniquesMap[artId] = { designation: ligne.designation, quantite: 0, prix_unitaire: pu };
        }
        lignesUniquesMap[artId].quantite += qte;
      }

      let nouveauxMouvementsAjoutes = [];
      for (const [artId, dataLigne] of Object.entries(lignesUniquesMap)) {
        const typeMvEff = ongletPrincipal === 'ACHATS' ? 'ENTREE' : typeOperation;
        
        // Payload strictement aligné sur les colonnes existantes de mouvements_stock
        const payload = {
          id_entreprise: entrepriseId,
          module: moduleActuel,
          type_mouvement: typeMvEff,
          id_depot_source: enTeteDoc.id_depot_source || null,
          id_emplacement_source: enTeteDoc.id_emplacement_source || null,
          id_depot_destination: (ongletPrincipal === 'MOUVEMENTS' && typeOperation === 'TRANSFERT') ? (enTeteDoc.id_depot_destination || null) : null,
          id_emplacement_destination: (ongletPrincipal === 'MOUVEMENTS' && typeOperation === 'TRANSFERT') ? (enTeteDoc.id_emplacement_destination || null) : null,
          id_article: parseInt(artId),
          quantite: dataLigne.quantite,
          motif_remarque: motifDocumentFinal,
          reference: referenceSaisie,
          operateur: operateurActuel,
          created_at: dateMvtIso,
        };

        const idTemp = 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(7);
        const objetInsertion = { ...payload, id: idTemp, prix_unitaire: dataLigne.prix_unitaire, montant_total: dataLigne.quantite * dataLigne.prix_unitaire };
        nouveauxMouvementsAjoutes.push(objetInsertion);

        const { error } = await supabase.from('mouvements_stock').insert([payload]);
        if (error) {
          localSync.ajouterFileAttente('INSERT', 'mouvements_stock', payload);
        }
      }

      // Enregistrement de l'impact financier sur le compte du partenaire en cas d'achat
      if (ongletPrincipal === 'ACHATS' && (enTeteDoc.id_fournisseur || enTeteDoc.id_depot_source)) {
        const partenaireId = enTeteDoc.id_fournisseur || enTeteDoc.id_depot_source;
        const creditRestant = resteAVerserFacture;
        if (creditRestant > 0 && statutReglement !== 'SOLDE') {
          const payloadFinancier = {
            id_entreprise: entrepriseId,
            module: moduleActuel,
            id_partenaire: partenaireId,
            type_operation: 'ACHAT_CREDIT',
            montant: creditRestant,
            reference_doc: motifDocumentFinal,
            date_operation: dateMvtIso,
            operateur: operateurActuel
          };
          await supabase.from('compte_partenaires').insert([payloadFinancier]).catch(() => {});
        }
      }

      const mouvementsFiltres = mouvements.filter(m => m.motif_remarque !== motifDocumentFinal && m.motif_remarque !== enTeteDoc.numeroDoc);
      const listeMaj = [...nouveauxMouvementsAjoutes, ...mouvementsFiltres];
      setMouvements(listeMaj);
      localSync.sauvegarderDonneesLocales(cleCacheMouvements, listeMaj);
      localStorage.removeItem(cleCacheMouvements);

      afficherMessage(`${ongletPrincipal === 'ACHATS' ? 'Achat / Approvisionnement' : 'Document'} validé avec succès par ${operateurActuel} !`, 'succès', 'Validation réussie');
      setLignesPanier([]);
      setMouvementEnEditionId(null);
      setNumeroDocOriginal(null);
      setDocumentEnLectureSeule(false);
      setEtatInitialEdition(null);
      setStatutReglement('SOLDE');
      setMontantPayeAchat(0);
      const typeReset = ongletPrincipal === 'ACHATS' ? 'ENTREE' : typeOperation;
      setEnTeteDoc((prev) => ({ 
        ...prev, 
        id_depot_source: '',
        id_depot_destination: '',
        id_fournisseur: '',
        referenceDoc: '', 
        numeroDoc: genererNumeroDocSecurise(typeReset),
        numeroAffichage: '',
        operateur: obtenirNomOperateurConnecte() 
      }));
      await chargerDonnees(true);
      setModeAffichage('LISTE_DOCS');
    } catch (err) { 
      afficherMessage('Erreur : ' + err.message, 'erreur', 'Erreur système'); 
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const ouvrirDocumentDepuisListe = (numeroDocUnique) => {
    if (enTrainDeSauvegarder) return;

    const lignesAssociees = mouvements.filter(m => m.motif_remarque === numeroDocUnique);
    if (lignesAssociees.length === 0) return;
    const premier = lignesAssociees[0];
    
    const docGroupeTrouve = documentsGroupes.find(d => String(d.numeroDocBrut) === String(numeroDocUnique));
    const numeroAffichageEffectif = docGroupeTrouve ? docGroupeTrouve.numeroDoc : '';
    
    const dateDocStr = premier.created_at ? premier.created_at.split('T')[0] : new Date().toISOString().split('T')[0];
    const dateDuJour = new Date().toISOString().split('T')[0];
    const estVerrouille = dateDocStr < dateDuJour;

    const typeDoc = (premier.type_mouvement || 'TRANSFERT').toUpperCase();
    const estAchat = typeDoc === 'ENTREE' || typeDoc === 'APPROVISIONNEMENT';

    setOngletPrincipal(estAchat ? 'ACHATS' : 'MOUVEMENTS');
    setDocumentEnLectureSeule(estVerrouille);
    setTypeOperation(typeDoc);
    
    const operateurDoc = premier.operateur && String(premier.operateur).trim() !== '' && String(premier.operateur).trim().toLowerCase() !== 'utilisateur' && String(premier.operateur).trim() !== 'Utilisateur Inconnu' 
      ? String(premier.operateur).trim().toUpperCase() 
      : obtenirNomOperateurConnecte();

    const refEnregistree = premier.reference || premier.motif || '';

    const nouvelEnTete = { 
      ...enTeteDoc, 
      numeroDoc: numeroDocUnique, 
      numeroAffichage: numeroAffichageEffectif,
      dateDoc: dateDocStr, 
      id_depot_source: premier.id_depot_source || '', 
      id_emplacement_source: premier.id_emplacement_source || '',
      id_depot_destination: premier.id_depot_destination || '', 
      id_emplacement_destination: premier.id_emplacement_destination || '',
      id_fournisseur: '',
      referenceDoc: refEnregistree,
      operateur: operateurDoc
    };

    const nouvellesLignes = lignesAssociees.map(mvt => {
      const art = articles.find((a) => String(a.id_article || a.id) === String(mvt.id_article));
      const qte = Number(mvt.quantite || 0);
      const pu = estAchat ? Number(mvt.prix_unitaire || art?.Prix_Achat || art?.prix_achat || art?.Prix_Vente || art?.prix_vente || 0) : 0;
      return { 
        id_article: String(mvt.id_article), 
        designation: art ? (art.Designation || art.designation) : `Article #${mvt.id_article}`, 
        quantite: qte, 
        prix_unitaire: pu,
        montant_total: qte * pu,
        stockActuel: calculerStockPourDepotActuel(mvt.id_article), 
        stockReel: qte 
      };
    });

    setNumeroDocOriginal(numeroDocUnique);
    setEnTeteDoc(nouvelEnTete);
    setLignesPanier(nouvellesLignes);
    setMouvementEnEditionId(premier.id);
    setStatutReglement('SOLDE');
    setMontantPayeAchat(nouvellesLignes.reduce((acc, l) => acc + l.montant_total, 0));
    
    setEtatInitialEdition({
      enTete: JSON.parse(JSON.stringify(nouvelEnTete)),
      lignes: JSON.parse(JSON.stringify(nouvellesLignes)),
      typeOp: typeDoc
    });

    setModeAffichage('SAISIE');
  };

  const documentModifie = useMemo(() => {
    if (!mouvementEnEditionId || !etatInitialEdition) return false;

    const norm = (val) => (val === null || val === undefined ? '' : String(val).trim());

    const initEnTete = etatInitialEdition.enTete || {};
    const enTeteModifie = 
      norm(enTeteDoc.dateDoc) !== norm(initEnTete.dateDoc) ||
      norm(enTeteDoc.referenceDoc) !== norm(initEnTete.referenceDoc) ||
      norm(enTeteDoc.id_fournisseur) !== norm(initEnTete.id_fournisseur) ||
      norm(enTeteDoc.id_depot_source) !== norm(initEnTete.id_depot_source) ||
      norm(enTeteDoc.id_emplacement_source) !== norm(initEnTete.id_emplacement_source) ||
      norm(enTeteDoc.id_depot_destination) !== norm(initEnTete.id_depot_destination) ||
      norm(enTeteDoc.id_emplacement_destination) !== norm(initEnTete.id_emplacement_destination);

    const typeModifie = typeOperation !== etatInitialEdition.typeOp;

    const initLignes = etatInitialEdition.lignes || [];
    let lignesModifiees = lignesPanier.length !== initLignes.length;
    if (!lignesModifiees) {
      for (let i = 0; i < lignesPanier.length; i++) {
        const cur = lignesPanier[i];
        const init = initLignes[i];
        if (
          norm(cur.id_article) !== norm(init.id_article) ||
          Number(cur.quantite) !== Number(init.quantite) ||
          Number(cur.prix_unitaire) !== Number(init.prix_unitaire)
        ) {
          lignesModifiees = true;
          break;
        }
      }
    }

    return enTeteModifie || typeModifie || lignesModifiees;
  }, [mouvementEnEditionId, etatInitialEdition, enTeteDoc, typeOperation, lignesPanier]);

  const documentsFiltresParCriteres = documentsGroupes.filter((doc) => {
    if (doc.date) {
      const dateDocStr = doc.date.split('T')[0];
      if (filtreDateDebut && dateDocStr < filtreDateDebut) return false;
      if (filtreDateFin && dateDocStr > filtreDateFin) return false;
    }
    if (filtrePartenaire) {
      const depotNomDoc = (doc.depotNom || '').toUpperCase();
      const depotCibleObj = depots.find(d => String(d.id) === String(filtrePartenaire));
      const depotCibleNom = depotCibleObj ? (depotCibleObj.nom_depot || depotCibleObj.nom || '').toUpperCase() : filtrePartenaire.toUpperCase();
      if (!depotNomDoc.includes(depotCibleNom)) return false;
    }
    if (filtreLivreur) {
      const empCibleObj = emplacements.find(e => String(e.id) === String(filtreLivreur));
      const empCibleNom = empCibleObj ? (empCibleObj.nom_emplacement || empCibleObj.code_emplacement || '').toUpperCase() : filtreLivreur.toUpperCase();

      const matchSource = String(doc.id_emplacement_source) === String(filtreLivreur);
      const matchDest = String(doc.id_emplacement_destination) === String(filtreLivreur);
      const depotDestNom = (doc.depotDestNom || '').toUpperCase();

      if (!matchSource && !matchDest && !depotDestNom.includes(empCibleNom)) return false;
    }
    return true;
  });

  const gererTri = (colonne) => {
    if (enTrainDeSauvegarder) return;
    if (colonneTri === colonne) setOrdreTri(ordreTri === 'asc' ? 'desc' : 'asc');
    else { setColonneTri(colonne); setOrdreTri('asc'); }
  };

  const documentsTries = [...documentsFiltresParCriteres].sort((a, b) => {
    let valA = a[colonneTri]; let valB = b[colonneTri];
    if (colonneTri === 'date') { valA = new Date(valA); valB = new Date(valB); }
    else { valA = String(valA).toLowerCase(); valB = String(valB).toLowerCase(); }
    if (valA < valB) return ordreTri === 'asc' ? -1 : 1;
    if (valA > valB) return ordreTri === 'asc' ? 1 : -1;
    return 0;
  });

  const documentsAffiches = documentsTries.slice(0, limiteDocuments);
  const enTeteVerrouille = lignesPanier.length > 0 || enTrainDeSauvegarder || documentEnLectureSeule;

  if (ongletPrincipal === null) {
    return (
      <div className="space-y-4 font-sans text-[10px] p-2 max-w-2xl mx-auto">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-center space-y-1">
          <h2 className="text-xs font-black uppercase text-slate-900 tracking-wider">
            📦 APPROVISIONNEMENT ET MOUVEMENT DE STOCK
          </h2>
          <p className="text-[10px] text-slate-500 font-bold">
            Sélectionnez l'opération que vous souhaitez effectuer :
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div 
            onClick={basculerVersAchats}
            className="bg-white p-4 rounded-2xl border-2 border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-50/20 transition cursor-pointer shadow-sm flex flex-col justify-between space-y-3 group"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-lg font-black group-hover:scale-105 transition">
                🛒
              </div>
              <h3 className="font-black text-xs uppercase text-emerald-900">
                Achat & Approvisionnement
              </h3>
              <p className="text-[9.5px] font-semibold text-slate-600 leading-relaxed">
                Permet d'enregistrer les entrées de stock issues des fournisseurs ou des achats.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-emerald-700 font-black text-[9.5px]">
              <span>Ouvrir le module</span>
              <span>→</span>
            </div>
          </div>

          <div 
            onClick={basculerVersMouvements}
            className="bg-white p-4 rounded-2xl border-2 border-orange-500/40 hover:border-orange-500 hover:bg-orange-50/20 transition cursor-pointer shadow-sm flex flex-col justify-between space-y-3 group"
          >
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center text-lg font-black group-hover:scale-105 transition">
                🔀
              </div>
              <h3 className="font-black text-xs uppercase text-orange-900">
                Mouvement de stock
              </h3>
              <p className="text-[9.5px] font-semibold text-slate-600 leading-relaxed">
                Permet d'effectuer des transferts entre dépôts, des sorties, des avaries ou des inventaires.
              </p>
            </div>
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-orange-700 font-black text-[9.5px]">
              <span>Ouvrir le module</span>
              <span>→</span>
            </div>
          </div>
        </div>

        {modalMessage && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-5 space-y-4 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 text-orange-600 text-xl font-black">
                {modalMessage.type === 'erreur' ? '⚠️' : modalMessage.type === 'succès' ? '✅' : 'ℹ️'}
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-slate-900 text-sm uppercase">{modalMessage.titre}</h3>
                <p className="text-slate-600 font-medium text-xs leading-relaxed">{modalMessage.texte}</p>
              </div>
              <button
                type="button"
                onClick={() => setModalMessage(null)}
                className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase rounded-xl transition shadow-md"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2 font-sans text-[10px]">
      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button 
            type="button" 
            onClick={() => setOngletPrincipal(null)} 
            className="p-1 px-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-[9.5px] transition cursor-pointer flex items-center gap-1 border border-slate-300"
            title="Retour au choix principal"
          >
            <span>←</span> Retour
          </button>
          <span className="font-extrabold uppercase text-slate-900 text-[10.5px]">
            {ongletPrincipal === 'ACHATS' ? '🛒 ACHAT' : '🔀 MOUVEMENT DE STOCK'}
          </span>
          {roleNom && (
            <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold border border-slate-200">
              {roleNom}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button 
            type="button" 
            disabled={enTrainDeSauvegarder} 
            onClick={() => { 
              if (enTrainDeSauvegarder) return;
              const typeCible = ongletPrincipal === 'ACHATS' ? 'ENTREE' : (typeOperation === 'ENTREE' ? 'TRANSFERT' : typeOperation);
              setTypeOperation(typeCible);
              setModeAffichage('SAISIE'); 
              setMouvementEnEditionId(null); 
              setNumeroDocOriginal(null);
              setDocumentEnLectureSeule(false);
              setEtatInitialEdition(null);
              setLignesPanier([]); 
              setStatutReglement('SOLDE');
              setMontantPayeAchat(0);
              setEnTeteDoc(prev => ({ ...prev, id_depot_source: '', id_depot_destination: '', id_fournisseur: '', referenceDoc: '', numeroDoc: genererNumeroDocSecurise(typeCible), numeroAffichage: '', operateur: obtenirNomOperateurConnecte() })); 
            }} 
            className={`py-1 px-3 rounded-lg font-black transition text-center text-[9.5px] uppercase border ${
              modeAffichage === 'SAISIE' 
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
            }`}
          >
            ✍️ {mouvementEnEditionId ? 'Modifier' : (ongletPrincipal === 'ACHATS' ? 'Nouvel Achat' : 'Créer Mouvement')}
          </button>
          <button 
            type="button" 
            disabled={enTrainDeSauvegarder} 
            onClick={() => { if (!enTrainDeSauvegarder) setModeAffichage('LISTE_DOCS'); }} 
            className={`py-1 px-3 rounded-lg font-black transition text-center text-[9.5px] uppercase border ${
              modeAffichage === 'LISTE_DOCS' 
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
            }`}
          >
            📋 Liste ({documentsFiltresParCriteres.length})
          </button>
        </div>
      </div>

      {modeAffichage === 'SAISIE' && (
        <>
          {documentEnLectureSeule && (
            <div className="bg-amber-50 border-2 border-amber-300 text-amber-900 p-2 rounded-xl text-center font-black text-[10px] uppercase shadow-xs flex items-center justify-center gap-2">
              <span>🔒 DOCUMENT EN CONSULTATION SEULE (Journée clôturée et verrouillée)</span>
            </div>
          )}

          {ongletPrincipal === 'MOUVEMENTS' && (
            <div className="bg-white border border-slate-200 p-2 rounded-xl flex items-center justify-between gap-2 shadow-2xs">
              <span className="font-extrabold text-[9px] text-slate-700 uppercase shrink-0">Type d'opération</span>
              <button
                type="button"
                disabled={enTeteVerrouille || !!mouvementEnEditionId}
                onClick={() => setModalTypeMouvementOuvert(true)}
                className="bg-slate-50 border rounded px-2.5 py-1 font-extrabold text-orange-600 text-[9.5px] truncate w-full flex justify-between items-center disabled:opacity-70"
              >
                <span className="truncate">{libellesTypesMouvement[typeOperation]}</span>
                <span>🔍</span>
              </button>
            </div>
          )}

          {modalTypeMouvementOuvert && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                    <span>🔀</span> SÉLECTIONNER LE TYPE DE MOUVEMENT
                  </h4>
                  <button type="button" onClick={() => setModalTypeMouvementOuvert(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100 transition">✕</button>
                </div>
                
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {[
                    { id: 'TRANSFERT', libelle: 'TRANSFERT ENTRE DÉPÔTS (TR)', icone: '🔀' },
                    { id: 'ENTREE_STOCK', libelle: 'ENTRÉE EN STOCK (ES)', icone: '📥' },
                    { id: 'SORTIE', libelle: 'SORTIE DE STOCK (MS)', icone: '📤' },
                    { id: 'AVARIES', libelle: 'AVARIES & PERTES (AV)', icone: '⚠️' },
                    { id: 'INVENTAIRE', libelle: 'SAISIE D’INVENTAIRE (INV)', icone: '📊' }
                  ].map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => {
                        if (mouvementEnEditionId) return;
                        setTypeOperation(item.id);
                        setEnTeteDoc(prev => ({ ...prev, id_depot_source: '', id_depot_destination: '', numeroDoc: genererNumeroDocSecurise(item.id), numeroAffichage: '', operateur: obtenirNomOperateurConnecte() }));
                        setModalTypeMouvementOuvert(false);
                      }} 
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between shadow-2xs ${
                        typeOperation === item.id ? 'bg-orange-50 border-orange-500 text-orange-900' : 'bg-white border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{item.icone}</span>
                        <div>
                          <span className="font-black text-xs uppercase block">{item.libelle}</span>
                          <span className="text-[8.5px] text-slate-500 font-bold">{descriptionsTypesMouvement[item.id]}</span>
                        </div>
                      </div>
                      {typeOperation === item.id && <span className="text-orange-600 font-bold text-xs">✓</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className={`bg-white border-2 ${ongletPrincipal === 'ACHATS' ? 'border-emerald-500/50' : 'border-orange-500/50'} p-2 rounded-xl shadow-2xs space-y-1.5 ${enTeteVerrouille ? 'bg-slate-50/80' : ''}`}>
            <div className="flex justify-between items-center pb-1 border-b">
              <div className="flex flex-col">
                <span className={`font-extrabold text-[10px] uppercase ${ongletPrincipal === 'ACHATS' ? 'text-emerald-700' : 'text-orange-600'}`}>
                  {libellesTypesMouvement[typeOperation]} {enTeteVerrouille && '🔒'}
                </span>
                <span className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">
                  OPÉRATEUR CONNECTÉ : <strong className="text-slate-800">{mouvementEnEditionId ? enTeteDoc.operateur : obtenirNomOperateurConnecte()}</strong>
                </span>
              </div>
              <span className={`${ongletPrincipal === 'ACHATS' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'} px-1.5 py-0.5 rounded font-mono font-bold text-[9px]`}>
                {enTeteDoc.numeroAffichage || enTeteDoc.numeroDoc}
              </span>
            </div>
            
            <div className="space-y-1.5 text-[9.5px]">
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <input 
                    type="date" 
                    disabled={documentEnLectureSeule} 
                    value={enTeteDoc.dateDoc} 
                    onChange={(e) => setEnTeteDoc({ ...enTeteDoc, dateDoc: e.target.value })} 
                    className="w-full bg-slate-50 border rounded p-1 font-bold text-slate-900 disabled:opacity-70 text-[9.5px]" 
                  />
                </div>
                <div>
                  <input 
                    type="text" 
                    disabled={documentEnLectureSeule} 
                    value={enTeteDoc.referenceDoc} 
                    placeholder={ongletPrincipal === 'ACHATS' ? 'N° Facture / Motif *' : 'Motif * (Obligatoire)'}
                    onChange={(e) => setEnTeteDoc({ ...enTeteDoc, referenceDoc: e.target.value })} 
                    className="w-full bg-slate-50 border rounded p-1 font-extrabold uppercase text-slate-900 disabled:opacity-70 text-[9.5px]" 
                  />
                </div>
              </div>

              {ongletPrincipal === 'ACHATS' ? (
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <div className="space-y-1 bg-emerald-50/40 p-1.5 rounded-lg border border-emerald-200">
                    <button 
                      type="button"
                      disabled={enTeteVerrouille}
                      onClick={() => { setRechercheModalPopup(''); setModalFournisseurOuvert(true); }}
                      className="w-full bg-white border rounded p-1 text-left font-extrabold text-emerald-700 text-[9px] flex justify-between items-center disabled:opacity-70"
                    >
                      <span className="truncate">🤝 {obtenirNomFournisseurParId(enTeteDoc.id_fournisseur) || 'Fournisseur'}</span>
                      <span>🔍</span>
                    </button>
                  </div>

                  <div className="space-y-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    <button 
                      type="button"
                      disabled={enTeteVerrouille}
                      onClick={() => { setRechercheModalPopup(''); setModalDepotSourceOuvert(true); }}
                      className="w-full bg-white border rounded p-1 text-left font-extrabold text-orange-600 text-[9.5px] flex justify-between items-center disabled:opacity-70"
                    >
                      <span className="truncate">🏢 {obtenirNomDepotParId(enTeteDoc.id_depot_source) !== '-' ? obtenirNomDepotParId(enTeteDoc.id_depot_source) : '-- Dépôt / Partenaire --'}</span>
                      <span>🔍</span>
                    </button>
                  </div>

                  <div className="space-y-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    <button 
                      type="button"
                      disabled={enTeteVerrouille}
                      onClick={() => { setRechercheModalPopup(''); setModalLivreurSourceOuvert(true); }}
                      className="w-full bg-white border rounded p-1 text-left font-bold text-slate-800 text-[9px] flex justify-between items-center disabled:opacity-70"
                    >
                      <span className="truncate">📍 {obtenirNomEmplacementParId(enTeteDoc.id_emplacement_source) !== '-' ? obtenirNomEmplacementParId(enTeteDoc.id_emplacement_source) : libelleLivreur}</span>
                      <span>🔍</span>
                    </button>
                  </div>
                </div>
              ) : typeOperation === 'TRANSFERT' ? (
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <div className="space-y-1 bg-orange-50/40 p-1.5 rounded-lg border border-orange-200">
                    <button 
                      type="button"
                      disabled={enTeteVerrouille}
                      onClick={() => { setRechercheModalPopup(''); setModalDepotSourceOuvert(true); }}
                      className="w-full bg-white border rounded p-1 text-left font-extrabold text-orange-700 text-[9px] flex justify-between items-center disabled:opacity-70"
                    >
                      <span className="truncate">🏢 {enTeteDoc.id_depot_source ? obtenirNomDepotParId(enTeteDoc.id_depot_source) : '-- Départ --'}</span>
                      <span>🔍</span>
                    </button>
                    <button 
                      type="button"
                      disabled={enTeteVerrouille}
                      onClick={() => { setRechercheModalPopup(''); setModalLivreurSourceOuvert(true); }}
                      className="w-full bg-white border rounded p-1 text-left font-bold text-slate-800 text-[9px] flex justify-between items-center mt-1 disabled:opacity-70"
                    >
                      <span className="truncate">📍 {obtenirNomEmplacementParId(enTeteDoc.id_emplacement_source) !== '-' ? obtenirNomEmplacementParId(enTeteDoc.id_emplacement_source) : libellePlaceholderSource}</span>
                      <span>🔍</span>
                    </button>
                  </div>

                  <div className="space-y-1 bg-blue-50/40 p-1.5 rounded-lg border border-blue-200">
                    <button 
                      type="button"
                      disabled={enTeteVerrouille}
                      onClick={() => { setRechercheModalPopup(''); setModalDepotDestOuvert(true); }}
                      className="w-full bg-white border rounded p-1 text-left font-extrabold text-blue-700 text-[9px] flex justify-between items-center disabled:opacity-70"
                    >
                      <span className="truncate">🎯 {enTeteDoc.id_depot_destination ? obtenirNomDepotParId(enTeteDoc.id_depot_destination) : '-- Destination --'}</span>
                      <span>🔍</span>
                    </button>
                    <button 
                      type="button"
                      disabled={enTeteVerrouille}
                      onClick={() => { setRechercheModalPopup(''); setModalLivreurDestOuvert(true); }}
                      className="w-full bg-white border rounded p-1 text-left font-bold text-slate-800 text-[9px] flex justify-between items-center mt-1 disabled:opacity-70"
                    >
                      <span className="truncate">📍 {obtenirNomEmplacementParId(enTeteDoc.id_emplacement_destination) !== '-' ? obtenirNomEmplacementParId(enTeteDoc.id_emplacement_destination) : libellePlaceholderDest}</span>
                      <span>🔍</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <div className="space-y-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    <button 
                      type="button"
                      disabled={enTeteVerrouille}
                      onClick={() => { setRechercheModalPopup(''); setModalDepotSourceOuvert(true); }}
                      className="w-full bg-white border rounded p-1 text-left font-extrabold text-orange-600 text-[9px] flex justify-between items-center disabled:opacity-70"
                    >
                      <span className="truncate">🏢 {enTeteDoc.id_depot_source ? obtenirNomDepotParId(enTeteDoc.id_depot_source) : '-- Dépôt / Partenaire --'}</span>
                      <span>🔍</span>
                    </button>
                  </div>
                  <div className="space-y-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    <button 
                      type="button"
                      disabled={enTeteVerrouille}
                      onClick={() => { setRechercheModalPopup(''); setModalLivreurSourceOuvert(true); }}
                      className="w-full bg-white border rounded p-1 text-left font-bold text-slate-800 text-[9px] flex justify-between items-center disabled:opacity-70"
                    >
                      <span className="truncate">📍 {obtenirNomEmplacementParId(enTeteDoc.id_emplacement_source) !== '-' ? obtenirNomEmplacementParId(enTeteDoc.id_emplacement_source) : libelleLivreur}</span>
                      <span>🔍</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {modalFournisseurOuvert && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5"><span>🤝</span> SÉLECTIONNER UN FOURNISSEUR / PARTENAIRE</h4>
                  <button type="button" onClick={() => setModalFournisseurOuvert(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100 transition">✕</button>
                </div>
                <div>
                  <input type="text" value={rechercheModalPopup} onChange={(e) => setRechercheModalPopup(e.target.value.toUpperCase())} placeholder="RECHERCHER UN FOURNISSEUR..." autoFocus className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>
                <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
                  <div onClick={() => { setEnTeteDoc(prev => ({ ...prev, id_fournisseur: '' })); setModalFournisseurOuvert(false); }} className="col-span-2 p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition cursor-pointer font-bold text-slate-500 text-xs text-center bg-slate-50">
                    -- Tous les articles / Fournisseur libre --
                  </div>
                  {fournisseurs.filter(f => (f.nom_fournisseur || f.nom || '').toUpperCase().includes(rechercheModalPopup)).map((f) => (
                    <div key={f.id} onClick={() => { 
                      const nomF = (f.nom_fournisseur || f.nom || '').trim().toUpperCase();
                      const depotAssocie = depots.find(d => (d.nom_depot || '').trim().toUpperCase() === nomF || String(d.id) === String(f.id_depot));
                      setEnTeteDoc(prev => ({ 
                        ...prev, 
                        id_fournisseur: f.id,
                        id_depot_source: depotAssocie ? depotAssocie.id : prev.id_depot_source
                      })); 
                      setModalFournisseurOuvert(false); 
                    }} className="p-3 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 transition cursor-pointer flex flex-col justify-between shadow-2xs">
                      <span className="font-black text-xs text-slate-900 uppercase truncate">{f.nom_fournisseur || f.nom}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {modalDepotSourceOuvert && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5"><span>🔍</span> SÉLECTIONNER UN PARTENAIRE / DÉPÔT</h4>
                  <button type="button" onClick={() => setModalDepotSourceOuvert(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100 transition">✕</button>
                </div>
                <div>
                  <input type="text" value={rechercheModalPopup} onChange={(e) => setRechercheModalPopup(e.target.value.toUpperCase())} placeholder="RECHERCHER UN DÉPÔT..." autoFocus className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
                  {depots.filter(d => (d.nom_depot || '').toUpperCase().includes(rechercheModalPopup)).length === 0 ? (
                    <div className="col-span-2 py-6 text-center text-slate-400 font-bold italic text-xs">Aucun dépôt trouvé.</div>
                  ) : (
                    depots.filter(d => (d.nom_depot || '').toUpperCase().includes(rechercheModalPopup)).map((dep) => (
                      <div key={dep.id} onClick={() => { 
                        setEnTeteDoc(prev => ({ 
                          ...prev, 
                          id_depot_source: dep.id,
                          id_depot_destination: (typeOperation === 'TRANSFERT' && (!prev.id_depot_destination || prev.id_depot_destination === prev.id_depot_source)) ? dep.id : prev.id_depot_destination
                        })); 
                        setModalDepotSourceOuvert(false); 
                      }} className="p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 transition cursor-pointer flex flex-col justify-between shadow-2xs">
                        <span className="font-black text-xs text-slate-900 uppercase truncate">{dep.nom_depot}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {modalDepotDestOuvert && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5"><span>🔍</span> SÉLECTIONNER LE DÉPÔT DESTINATION</h4>
                  <button type="button" onClick={() => setModalDepotDestOuvert(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100 transition">✕</button>
                </div>
                <div>
                  <input type="text" value={rechercheModalPopup} onChange={(e) => setRechercheModalPopup(e.target.value.toUpperCase())} placeholder="RECHERCHER UN DÉPÔT..." autoFocus className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
                  {depots.filter(d => (d.nom_depot || '').toUpperCase().includes(rechercheModalPopup)).length === 0 ? (
                    <div className="col-span-2 py-6 text-center text-slate-400 font-bold italic text-xs">Aucun dépôt trouvé.</div>
                  ) : (
                    depots.filter(d => (d.nom_depot || '').toUpperCase().includes(rechercheModalPopup)).map((dep) => (
                      <div key={dep.id} onClick={() => { setEnTeteDoc(prev => ({ ...prev, id_depot_destination: dep.id })); setModalDepotDestOuvert(false); }} className="p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 transition cursor-pointer flex flex-col justify-between shadow-2xs">
                        <span className="font-black text-xs text-slate-900 uppercase truncate">{dep.nom_depot}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {modalLivreurSourceOuvert && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5"><span>🔍</span> SÉLECTIONNER UN {libelleLivreur.toUpperCase()}</h4>
                  <button type="button" onClick={() => setModalLivreurSourceOuvert(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100 transition">✕</button>
                </div>
                <div>
                  <input type="text" value={rechercheModalPopup} onChange={(e) => setRechercheModalPopup(e.target.value.toUpperCase())} placeholder={libelleRechercheLivreur} autoFocus className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
                  <div onClick={() => { setEnTeteDoc(prev => ({ ...prev, id_emplacement_source: '' })); setModalLivreurSourceOuvert(false); }} className="p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 transition cursor-pointer flex flex-col justify-between shadow-2xs bg-slate-50">
                    <span className="font-black text-xs text-slate-500 uppercase truncate">{libelleAucunLivreur}</span>
                  </div>
                  {emplacementsSourceFiltres.filter(e => (e.nom_emplacement || e.code_emplacement || '').toUpperCase().includes(rechercheModalPopup)).map((emp) => (
                    <div key={emp.id} onClick={() => { setEnTeteDoc(prev => ({ ...prev, id_emplacement_source: emp.id })); setModalLivreurSourceOuvert(false); }} className="p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 transition cursor-pointer flex flex-col justify-between shadow-2xs">
                      <span className="font-black text-xs text-slate-900 uppercase truncate">{emp.nom_emplacement || emp.code_emplacement}</span>
                      {emp.responsable_emplacement && <span className="text-[9px] text-slate-500 font-bold mt-0.5">{emp.responsable_emplacement}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {modalLivreurDestOuvert && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5"><span>🔍</span> SÉLECTIONNER LE {libelleLivreur.toUpperCase()} DESTINATION</h4>
                  <button type="button" onClick={() => setModalLivreurDestOuvert(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100 transition">✕</button>
                </div>
                <div>
                  <input type="text" value={rechercheModalPopup} onChange={(e) => setRechercheModalPopup(e.target.value.toUpperCase())} placeholder={libelleRechercheLivreur} autoFocus className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
                  <div onClick={() => { setEnTeteDoc(prev => ({ ...prev, id_emplacement_destination: '' })); setModalLivreurDestOuvert(false); }} className="p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 transition cursor-pointer flex flex-col justify-between shadow-2xs bg-slate-50">
                    <span className="font-black text-xs text-slate-500 uppercase truncate">{libelleAucunLivreur}</span>
                  </div>
                  {emplacementsDestinationFiltres.filter(e => (e.nom_emplacement || e.code_emplacement || '').toUpperCase().includes(rechercheModalPopup)).map((emp) => (
                    <div key={emp.id} onClick={() => { setEnTeteDoc(prev => ({ ...prev, id_emplacement_destination: emp.id })); setModalLivreurDestOuvert(false); }} className="p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 transition cursor-pointer flex flex-col justify-between shadow-2xs">
                      <span className="font-black text-xs text-slate-900 uppercase truncate">{emp.nom_emplacement || emp.code_emplacement}</span>
                      {emp.responsable_emplacement && <span className="text-[9px] text-slate-500 font-bold mt-0.5">{emp.responsable_emplacement}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="bg-white border p-2 rounded-xl shadow-2xs space-y-1.5">
            <span className="font-extrabold text-slate-800 uppercase text-[8.5px]">Articles [{moduleActuel}]</span>
            
            {!documentEnLectureSeule && (
              ongletPrincipal === 'ACHATS' ? (
                /* ORDRE ACHAT & APPRO : ARTICLE -> QTE -> PU ACHAT -> MONTANT -> OK */
                <div className="grid grid-cols-12 gap-1 items-end bg-slate-50 p-1.5 rounded-lg border text-[9.5px]">
                  <div className="col-span-4">
                    <label className="block font-bold text-[7.5px] text-slate-600 mb-0.5">Article *</label>
                    <button ref={boutonSelectionArticleRef} type="button" disabled={enTrainDeSauvegarder} onClick={() => { if (enTrainDeSauvegarder) return; if (!verifierEnTeteAvantSaisie()) return; setModalArticleOuvert(true); }} className="w-full bg-white border rounded p-1 text-left font-extrabold text-slate-900 flex justify-between items-center truncate">
                      <span className="truncate">{articleSelectionneTemp ? `${articleSelectionneTemp.Designation || articleSelectionneTemp.designation}` : '-- Sélectionner --'}</span>
                      <span className="text-emerald-600 shrink-0 ml-1">🔍</span>
                    </button>
                  </div>

                  <div className="col-span-2">
                    <label className="block font-bold text-[7.5px] text-slate-600 mb-0.5">Qte *</label>
                    <input 
                      ref={inputQuantiteRef} 
                      type="number" 
                      min="1" 
                      value={quantiteSaisie} 
                      disabled={enTrainDeSauvegarder}
                      onFocus={(e) => e.target.select()} 
                      onChange={(e) => setQuantiteSaisie(e.target.value)} 
                      onKeyDown={gererKeyDownQuantite}
                      className="w-full bg-white border rounded p-1 font-black text-emerald-600 text-center" 
                    />
                  </div>

                  <div className="col-span-3">
                    <label className="block font-bold text-[7.5px] text-slate-600 mb-0.5">PU Achat *</label>
                    <input 
                      ref={inputPrixRef}
                      type="number" 
                      min="0" 
                      value={prixUnitaireSaisi} 
                      disabled={enTrainDeSauvegarder}
                      onFocus={(e) => e.target.select()} 
                      onChange={(e) => setPrixUnitaireSaisi(e.target.value)} 
                      onKeyDown={gererKeyDownPrix}
                      className="w-full bg-white border rounded p-1 font-black text-slate-900 text-center" 
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block font-bold text-[7.5px] text-slate-600 mb-0.5">Montant</label>
                    <div className="w-full bg-slate-100 border rounded p-1 font-black text-slate-800 text-right truncate">
                      {(Number(quantiteSaisie || 0) * Number(prixUnitaireSaisi || 0)).toLocaleString()}
                    </div>
                  </div>

                  <div className="col-span-1">
                    <button 
                      type="button" 
                      disabled={enTrainDeSauvegarder || enTrainDInsertion || (!permissions.peut_creer && !mouvementEnEditionId)} 
                      onClick={ajouterArticleAuPanier} 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-black p-1 rounded text-center text-[9px] shadow-2xs" 
                      title="Valider l'article (ou Entrée)"
                    >
                      {enTrainDInsertion ? '...' : 'OK'}
                    </button>
                  </div>
                </div>
              ) : (
                /* ORDRE MOUVEMENT DE STOCK : UNIQUEMENT ARTICLE -> QTE -> OK */
                <div className="grid grid-cols-12 gap-1 items-end bg-slate-50 p-1.5 rounded-lg border text-[9.5px]">
                  <div className="col-span-8">
                    <label className="block font-bold text-[7.5px] text-slate-600 mb-0.5">Article *</label>
                    <button ref={boutonSelectionArticleRef} type="button" disabled={enTrainDeSauvegarder} onClick={() => { if (enTrainDeSauvegarder) return; if (!verifierEnTeteAvantSaisie()) return; setModalArticleOuvert(true); }} className="w-full bg-white border rounded p-1 text-left font-extrabold text-slate-900 flex justify-between items-center truncate">
                      <span className="truncate">{articleSelectionneTemp ? `${articleSelectionneTemp.Designation || articleSelectionneTemp.designation}` : '-- Sélectionner --'}</span>
                      <span className="text-orange-600 shrink-0 ml-1">🔍</span>
                    </button>
                  </div>
                  
                  <div className="col-span-3">
                    <label className="block font-bold text-[7.5px] text-slate-600 mb-0.5">Qte *</label>
                    <input 
                      ref={inputQuantiteRef} 
                      type="number" 
                      min="1" 
                      value={quantiteSaisie} 
                      disabled={enTrainDeSauvegarder}
                      onFocus={(e) => e.target.select()} 
                      onChange={(e) => setQuantiteSaisie(e.target.value)} 
                      onKeyDown={gererKeyDownQuantite}
                      className="w-full bg-white border rounded p-1 font-black text-emerald-600 text-center" 
                    />
                  </div>

                  <div className="col-span-1">
                    <button 
                      type="button" 
                      disabled={enTrainDeSauvegarder || enTrainDInsertion || (!permissions.peut_creer && !mouvementEnEditionId)} 
                      onClick={ajouterArticleAuPanier} 
                      className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-black p-1 rounded text-center text-[9px] shadow-2xs" 
                      title="Valider l'article (ou Entrée)"
                    >
                      {enTrainDInsertion ? '...' : 'OK'}
                    </button>
                  </div>
                </div>
              )
            )}

            {modalArticleOuvert && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                      <span>🔍</span> ARTICLE
                    </h4>
                    <button type="button" onClick={() => setModalArticleOuvert(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100 transition">✕</button>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={recherchePopup}
                      onChange={(e) => setRecherchePopup(e.target.value.toUpperCase())}
                      placeholder="RECHERCHER..."
                      autoFocus
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
                    {articlesPopupFiltres.length === 0 ? (
                      <div className="col-span-2 py-6 text-center text-slate-400 font-bold italic text-xs">Aucun article trouvé pour ce partenaire / cet emplacement.</div>
                    ) : (
                      articlesPopupFiltres.map((art) => {
                        const artId = art.id_article || art.id;
                        const stockActuel = calculerStockPourDepotActuel(artId);
                        const estEpuise = stockActuel <= 0 && ongletPrincipal !== 'ACHATS';
                        return (
                          <div 
                            key={artId} 
                            onClick={() => !enTrainDeSauvegarder && selectionnerArticleEtFocusQte(art)} 
                            className={`p-3 rounded-xl border transition cursor-pointer flex flex-col justify-between shadow-2xs ${
                              estEpuise ? 'bg-slate-100 border-slate-200 opacity-60' : 'bg-white border-slate-200 hover:border-orange-500 hover:bg-orange-50/50'
                            }`}
                          >
                            <span className="font-black text-xs text-slate-900 uppercase truncate">{art.Designation || art.designation}</span>
                            <span className="font-black text-[10px] mt-1 text-slate-700">
                              Stock : <strong className={stockActuel <= 0 ? 'text-rose-600' : 'text-emerald-700'}>{stockActuel}</strong>
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {lignesPanier.length === 0 ? (<p className="text-center text-slate-400 py-1.5 italic text-[9.5px]">Aucun article ajouté.</p>) : (
              <div className="overflow-x-auto border rounded-lg bg-white">
                {ongletPrincipal === 'ACHATS' ? (
                  /* TABLEAU ACHAT & APPRO : ARTICLE - QTE - PU ACHAT - MONTANT */
                  <table className="w-full text-left text-[9.5px] table-fixed">
                    <thead className="bg-slate-50 text-slate-700 uppercase text-[7.5px] font-extrabold border-b">
                      <tr>
                        <th className="p-1 w-[42%]">ARTICLE</th>
                        <th className="p-1 w-[13%] text-center">QTE</th>
                        <th className="p-1 w-[17%] text-center">PU ACHAT</th>
                        <th className="p-1 w-[18%] text-right">MONTANT</th>
                        {!documentEnLectureSeule && <th className="p-1 w-[10%] text-center">⚙️</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y text-[9px]">
                      {lignesPanier.map((ligne, index) => (
                        <tr key={index} onClick={() => !documentEnLectureSeule && !enTrainDeSauvegarder && modifierLignePanier(ligne)} className={!documentEnLectureSeule ? "hover:bg-emerald-50/70 cursor-pointer transition" : "transition"}>
                          <td className="p-1.5 font-extrabold uppercase text-slate-900 truncate">{ligne.designation}</td>
                          <td className="p-1.5 text-center font-black text-emerald-600">{ligne.quantite}</td>
                          <td className="p-1.5 text-center font-bold text-slate-700">{Number(ligne.prix_unitaire).toLocaleString()}</td>
                          <td className="p-1.5 text-right font-black text-slate-900">{Number(ligne.montant_total).toLocaleString()}</td>
                          {!documentEnLectureSeule && (
                            <td className="p-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setLignesPanier(lignesPanier.filter((_, i) => i !== index))} className="p-0.5 bg-slate-100 hover:bg-red-100 disabled:opacity-50 rounded text-[9px]" title="Supprimer">🗑️</button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  /* TABLEAU MOUVEMENT DE STOCK : UNIQUEMENT ARTICLE - QTE */
                  <table className="w-full text-left text-[9.5px] table-fixed">
                    <thead className="bg-slate-50 text-slate-700 uppercase text-[7.5px] font-extrabold border-b">
                      <tr>
                        <th className="p-1 w-[72%]">ARTICLE</th>
                        <th className="p-1 w-[18%] text-center">QTE</th>
                        {!documentEnLectureSeule && <th className="p-1 w-[10%] text-center">⚙️</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y text-[9px]">
                      {lignesPanier.map((ligne, index) => (
                        <tr key={index} onClick={() => !documentEnLectureSeule && !enTrainDeSauvegarder && modifierLignePanier(ligne)} className={!documentEnLectureSeule ? "hover:bg-orange-50/70 cursor-pointer transition" : "transition"}>
                          <td className="p-1.5 font-extrabold uppercase text-slate-900 truncate">{ligne.designation}</td>
                          <td className="p-1.5 text-center font-black text-emerald-600">{ligne.quantite}</td>
                          {!documentEnLectureSeule && (
                            <td className="p-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setLignesPanier(lignesPanier.filter((_, i) => i !== index))} className="p-0.5 bg-slate-100 hover:bg-red-100 disabled:opacity-50 rounded text-[9px]" title="Supprimer">🗑️</button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* Total général de la facture et options de règlement en mode Achat */}
            {ongletPrincipal === 'ACHATS' && lignesPanier.length > 0 && (
              <div className="bg-emerald-50/60 border border-emerald-200 p-2 rounded-xl space-y-1.5 text-[9.5px]">
                <div className="flex justify-between items-center font-black text-emerald-900 text-[10.5px]">
                  <span>NET À PAYER (FACTURE) :</span>
                  <span className="font-mono text-emerald-700">{montantTotalFacture.toLocaleString()} FCFA</span>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-emerald-200">
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-slate-700">Règlement :</span>
                    <button
                      type="button"
                      disabled={documentEnLectureSeule}
                      onClick={() => setModalReglementOuvert(true)}
                      className="bg-white border border-emerald-400 px-2 py-1 rounded-lg font-black text-emerald-800 text-[9px] uppercase shadow-2xs flex items-center gap-1"
                    >
                      <span>💳 {statutReglement === 'SOLDE' ? 'Soldé' : statutReglement === 'AVANCE' ? 'Avancé' : 'Non payé'}</span>
                      <span>▼</span>
                    </button>
                  </div>
                  
                  <div className="text-right font-bold text-slate-700">
                    Payé : <strong className="text-emerald-700">{Number(montantPayeAchat).toLocaleString()}</strong> | Reste : <strong className="text-rose-600">{resteAVerserFacture.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            )}

            {modalReglementOuvert && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-4 space-y-3">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h4 className="font-black text-slate-900 uppercase text-xs">OPTION DE RÈGLEMENT</h4>
                    <button type="button" onClick={() => setModalReglementOuvert(false)} className="text-slate-400 font-bold text-sm">✕</button>
                  </div>
                  <div className="space-y-2">
                    {[
                      { id: 'SOLDE', libelle: 'Soldé (Totalité réglée)' },
                      { id: 'AVANCE', libelle: 'Avancé (Paiement partiel)' },
                      { id: 'NON_PAYE', libelle: 'Non payé (Crédit fournisseur)' }
                    ].map((opt) => (
                      <div
                        key={opt.id}
                        onClick={() => {
                          setStatutReglement(opt.id);
                          if (opt.id === 'SOLDE') setMontantPayeAchat(montantTotalFacture);
                          if (opt.id === 'NON_PAYE') setMontantPayeAchat(0);
                          setModalReglementOuvert(false);
                        }}
                        className={`p-3 rounded-xl border cursor-pointer font-black text-xs uppercase flex justify-between items-center ${
                          statutReglement === opt.id ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : 'bg-slate-50 border-slate-200 hover:border-emerald-400'
                        }`}
                      >
                        <span>{opt.libelle}</span>
                        {statutReglement === opt.id && <span className="text-emerald-600">✓</span>}
                      </div>
                    ))}

                    {statutReglement === 'AVANCE' && (
                      <div className="pt-2 space-y-1">
                        <label className="block font-extrabold text-[8.5px] text-slate-700 uppercase">Montant réellement payé (Avance) *</label>
                        <input
                          type="number"
                          min="0"
                          max={montantTotalFacture}
                          value={montantPayeAchat}
                          onChange={(e) => setMontantPayeAchat(Math.min(montantTotalFacture, Number(e.target.value)))}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-emerald-700 text-center text-sm"
                        />
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setModalReglementOuvert(false)}
                    className="w-full py-2 bg-emerald-600 text-white font-black text-xs uppercase rounded-xl shadow-md"
                  >
                    Valider l'option
                  </button>
                </div>
              </div>
            )}

            <div className="pt-1.5 flex items-center justify-between gap-1 flex-nowrap overflow-x-auto">
              <div className="flex items-center gap-1 shrink-0">
                {!documentEnLectureSeule && verifierDroitSuppressionEffectif() && (
                  <button 
                    type="button" 
                    disabled={enTrainDeSauvegarder} 
                    onClick={supprimerDocumentActuel} 
                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold px-1.5 py-1 rounded text-[8px] shadow-2xs whitespace-nowrap"
                    title="Supprimer définitivement ce document"
                  >
                    🗑️ Suppr.
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" disabled={enTrainDeSauvegarder} onClick={() => window.print()} className="bg-slate-800 text-white font-bold px-1.5 py-1 rounded text-[8px] whitespace-nowrap">🖨️ Imp.</button>
                
                {!documentEnLectureSeule && ((mouvementEnEditionId && permissions.peut_modifier) || (!mouvementEnEditionId && permissions.peut_creer)) && permissions.peut_valider && (
                  <button 
                    type="button" 
                    onClick={validerDocumentMouvement} 
                    disabled={lignesPanier.length === 0 || enTrainDeSauvegarder || (mouvementEnEditionId && !documentModifie)} 
                    className={`font-bold px-2 py-1 rounded text-[8px] whitespace-nowrap ${
                      lignesPanier.length > 0 && !enTrainDeSauvegarder && (!mouvementEnEditionId || documentModifie) 
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {enTrainDeSauvegarder ? 'Valid...' : (mouvementEnEditionId ? (documentModifie ? 'Mettre à jour' : '🔒 Aucun changement') : '✅ Valider')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {modeAffichage === 'LISTE_DOCS' && (
        <div className="bg-white border rounded-xl overflow-hidden shadow-2xs space-y-2">
          <div className="p-2 bg-slate-50 border-b flex justify-between items-center text-[9.5px]">
            <span className="font-extrabold uppercase text-slate-800">
              {ongletPrincipal === 'ACHATS' ? 'Achats & Entrées Enregistrés' : 'Mouvements Internes Enregistrés'} [{moduleActuel}] ({documentsAffiches.length} / {documentsTries.length})
            </span>
            <span className={`${ongletPrincipal === 'ACHATS' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'} px-1.5 py-0.5 rounded font-bold`}>{documentsTries.length}</span>
          </div>

          <div className="px-2 pt-1">
            <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-black text-[8.5px] text-slate-700 uppercase">🔍 FILTRER LES DOCUMENTS</span>
                {(filtreDateDebut || filtreDateFin || filtrePartenaire || filtreLivreur) && (
                  <button 
                    type="button" 
                    onClick={() => { setFiltreDateDebut(''); setFiltreDateFin(''); setFiltrePartenaire(''); setFiltreLivreur(''); }} 
                    className="text-[8px] text-orange-600 font-bold underline hover:text-orange-700"
                  >
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5 items-end">
                <div>
                  <label className="block text-[7.5px] font-bold text-slate-600 mb-0.5">Date début</label>
                  <input 
                    type="date" 
                    value={filtreDateDebut} 
                    onChange={(e) => setFiltreDateDebut(e.target.value)} 
                    className="w-full bg-white border rounded p-1 font-bold text-slate-800 text-[8.5px]" 
                  />
                </div>
                <div>
                  <label className="block text-[7.5px] font-bold text-slate-600 mb-0.5">Date fin</label>
                  <input 
                    type="date" 
                    value={filtreDateFin} 
                    onChange={(e) => setFiltreDateFin(e.target.value)} 
                    className="w-full bg-white border rounded p-1 font-bold text-slate-800 text-[8.5px]" 
                  />
                </div>
                <div>
                  <label className="block text-[7.5px] font-bold text-slate-600 mb-0.5">Partenaire / Dépôt</label>
                  <button
                    type="button"
                    onClick={() => { setRechercheFiltreModal(''); setModalFiltrePartenaireOuvert(true); }}
                    className="w-full bg-white border rounded p-1 font-bold text-slate-800 text-[8.5px] text-left truncate flex justify-between items-center"
                  >
                    <span className="truncate">
                      {filtrePartenaire ? (depots.find(d => String(d.id) === String(filtrePartenaire))?.nom_depot || filtrePartenaire) : 'Tous'}
                    </span>
                    <span className="text-slate-400 shrink-0 text-[7px]">🔍</span>
                  </button>
                </div>
                <div>
                  <label className="block text-[7.5px] font-bold text-slate-600 mb-0.5">{libelleLivreur}</label>
                  <button
                    type="button"
                    onClick={() => { setRechercheFiltreModal(''); setModalFiltreLivreurOuvert(true); }}
                    className="w-full bg-white border rounded p-1 font-bold text-slate-800 text-[8.5px] uppercase text-left truncate flex justify-between items-center"
                  >
                    <span className="truncate">
                      {filtreLivreur ? (emplacements.find(e => String(e.id) === String(filtreLivreur))?.nom_emplacement || emplacements.find(e => String(e.id) === String(filtreLivreur))?.code_emplacement || filtreLivreur) : 'Tous'}
                    </span>
                    <span className="text-slate-400 shrink-0 text-[7px]">🔍</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[9.5px]">
              <thead className="bg-slate-50 text-slate-700 uppercase text-[7.5px] font-extrabold border-b">
                <tr>
                  <th onClick={() => !enTrainDeSauvegarder && gererTri('date')} className="p-1.5 cursor-pointer">Date</th>
                  <th onClick={() => !enTrainDeSauvegarder && gererTri('numeroDoc')} className="p-1.5 cursor-pointer">N° DOC</th>
                  <th onClick={() => !enTrainDeSauvegarder && gererTri('referenceDoc')} className="p-1.5 cursor-pointer">MOTIF / RÉF</th>
                  <th onClick={() => !enTrainDeSauvegarder && gererTri('depotNom')} className="p-1.5 cursor-pointer">DÉPÔT</th>
                  <th onClick={() => !enTrainDeSauvegarder && gererTri('depotDestNom')} className="p-1.5 cursor-pointer">DESTINATION</th>
                  <th onClick={() => !enTrainDeSauvegarder && gererTri('operateur')} className="p-1.5 cursor-pointer">OPÉRATEUR</th>
                </tr>
              </thead>
              <tbody className="divide-y text-[9.5px]">
                {documentsAffiches.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-4 text-center text-slate-400 font-bold">Aucun document ne correspond à vos critères de filtre.</td>
                  </tr>
                ) : (
                  documentsAffiches.map((doc, idx) => (
                    <tr key={idx} onClick={() => !enTrainDeSauvegarder && ouvrirDocumentDepuisListe(doc.numeroDocBrut)} className="hover:bg-orange-50/70 cursor-pointer">
                      <td className="p-1.5 font-mono font-bold text-slate-800 text-[9px] whitespace-nowrap">{new Date(doc.date).toLocaleDateString('fr-FR')}</td>
                      <td className={`p-1.5 font-mono font-black whitespace-nowrap ${ongletPrincipal === 'ACHATS' ? 'text-emerald-700' : 'text-orange-600'}`}>{doc.numeroDoc}</td>
                      <td className="p-1.5 font-bold text-slate-700 uppercase truncate max-w-[90px]" title={doc.referenceDoc}>{doc.referenceDoc || '-'}</td>
                      <td className="p-1.5 font-bold text-slate-700 truncate max-w-[90px]" title={doc.depotNom}>{doc.depotNom}</td>
                      <td className="p-1.5 font-bold text-blue-700 truncate max-w-[90px]" title={doc.depotDestNom}>{doc.depotDestNom}</td>
                      <td className="p-1.5 font-extrabold uppercase text-slate-900 truncate max-w-[100px]" title={doc.operateur}>{doc.operateur}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {limiteDocuments < documentsTries.length && (
            <div className="text-center pt-2 pb-3 px-2">
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={() => setLimiteDocuments(prev => prev + 20)}
                className="bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 font-extrabold px-4 py-2 rounded-xl text-[10px] transition shadow-xs border border-slate-300 w-full"
              >
                📥 Charger 20 documents de plus ({documentsTries.length - limiteDocuments} restants)
              </button>
            </div>
          )}
        </div>
      )}

      {modalFiltrePartenaireOuvert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-black text-slate-900 uppercase text-xs">FILTRER PAR PARTENAIRE / DÉPÔT</h4>
              <button type="button" onClick={() => setModalFiltrePartenaireOuvert(false)} className="text-slate-400 font-black text-sm">✕</button>
            </div>
            <input
              type="text"
              value={rechercheFiltreModal}
              onChange={(e) => setRechercheFiltreModal(e.target.value.toUpperCase())}
              placeholder="RECHERCHER..."
              autoFocus
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs"
            />
            <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2">
              <div onClick={() => { setFiltrePartenaire(''); setModalFiltrePartenaireOuvert(false); }} className="col-span-2 p-3 rounded-xl border border-slate-200 hover:bg-orange-50 cursor-pointer font-bold text-slate-500 text-xs text-center">
                -- Tous les partenaires --
              </div>
              {depots.filter(d => (d.nom_depot || '').toUpperCase().includes(rechercheFiltreModal)).map(d => (
                <div key={d.id} onClick={() => { setFiltrePartenaire(d.id); setModalFiltrePartenaireOuvert(false); }} className="p-3 rounded-xl border border-slate-200 hover:bg-orange-50 cursor-pointer font-black text-xs text-slate-900 uppercase truncate">
                  {d.nom_depot || d.nom}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modalFiltreLivreurOuvert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-black text-slate-900 uppercase text-xs">FILTRER PAR {libelleLivreur.toUpperCase()}</h4>
              <button type="button" onClick={() => setModalFiltreLivreurOuvert(false)} className="text-slate-400 font-black text-sm">✕</button>
            </div>
            <input
              type="text"
              value={rechercheFiltreModal}
              onChange={(e) => setRechercheFiltreModal(e.target.value.toUpperCase())}
              placeholder={`RECHERCHER UN ${libelleLivreur.toUpperCase()}...`}
              autoFocus
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs"
            />
            <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2">
              <div onClick={() => { setFiltreLivreur(''); setModalFiltreLivreurOuvert(false); }} className="col-span-2 p-3 rounded-xl border border-slate-200 hover:bg-orange-50 cursor-pointer font-bold text-slate-500 text-xs text-center">
                -- Tous les {libelleLivreur.toLowerCase()}s --
              </div>
              {emplacements.filter(e => (e.nom_emplacement || e.code_emplacement || '').toUpperCase().includes(rechercheFiltreModal)).map((emp) => {
                const nomEmp = emp.nom_emplacement || emp.code_emplacement || '';
                return (
                  <div key={emp.id} onClick={() => { setFiltreLivreur(emp.id); setModalFiltreLivreurOuvert(false); }} className="p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 transition cursor-pointer flex flex-col justify-between shadow-2xs bg-white">
                    <span className="font-black text-xs text-slate-900 uppercase truncate">{nomEmp}</span>
                    {emp.responsable_emplacement && <span className="text-[9px] text-slate-500 font-bold mt-0.5">{emp.responsable_emplacement}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {modalMessage && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-5 space-y-4 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 text-orange-600 text-xl font-black">
              {modalMessage.type === 'erreur' ? '⚠️' : modalMessage.type === 'succès' ? '✅' : 'ℹ️'}
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-slate-900 text-sm uppercase">{modalMessage.titre}</h3>
              <p className="text-slate-600 font-medium text-xs leading-relaxed">{modalMessage.texte}</p>
            </div>
            <button
              type="button"
              onClick={() => setModalMessage(null)}
              className="w-full py-2.5 px-4 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase rounded-xl transition shadow-md"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {modalConfirmation && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-5 space-y-4 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 text-red-600 text-xl font-black">
              ❓
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-slate-900 text-sm uppercase">{modalConfirmation.titre}</h3>
              <p className="text-slate-600 font-medium text-xs leading-relaxed">{modalConfirmation.texte}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalConfirmation(null)}
                className="py-2.5 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-black text-xs uppercase rounded-xl transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={modalConfirmation.onConfirm}
                className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase rounded-xl transition shadow-md"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}