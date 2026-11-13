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
  const cleCacheAppro = `approvisionnements_${entrepriseId}_${moduleActuel}`;
  const cleCacheDepots = `depots_${entrepriseId}_${moduleActuel}`;
  const cleCacheEmplacements = `emplacements_${entrepriseId}_${moduleActuel}`;

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

  const [approvisionnements, setApprovisionnements] = useState(() => {
    if (typeof window !== 'undefined') {
      const data = localSync.recupererDonneesLocales(cleCacheAppro);
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

  const [familles, setFamilles] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);
  const [enTrainDInsertion, setEnTrainDInsertion] = useState(false);

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
  const [modeAffichage, setModeAffichage] = useState('SAISIE');
  const [typeOperation, setTypeOperation] = useState('TRANSFERT');

  // États pour les filtres de la liste
  const [filtreDateDebut, setFiltreDateDebut] = useState('');
  const [filtreDateFin, setFiltreDateFin] = useState('');
  const [filtrePartenaire, setFiltrePartenaire] = useState('');
  const [filtreLivreur, setFiltreLivreur] = useState('');

  // Modales de filtres
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
    referenceDoc: '',
    motif: '',
    famille_filtre: 'TOUTES',
    operateur: obtenirNomOperateurConnecte(),
  });

  const [modalArticleOuvert, setModalArticleOuvert] = useState(false);
  const [recherchePopup, setRecherchePopup] = useState('');
  const [articleSelectionneTemp, setArticleSelectionneTemp] = useState(null);

  const [modalDepotSourceOuvert, setModalDepotSourceOuvert] = useState(false);
  const [modalDepotDestOuvert, setModalDepotDestOuvert] = useState(false);
  const [modalLivreurSourceOuvert, setModalLivreurSourceOuvert] = useState(false);
  const [modalLivreurDestOuvert, setModalLivreurDestOuvert] = useState(false);
  const [rechercheModalPopup, setRechercheModalPopup] = useState('');

  const [quantiteSaisie, setQuantiteSaisie] = useState(1);
  const [lignesPanier, setLignesPanier] = useState([]);
  const [mouvementEnEditionId, setMouvementEnEditionId] = useState(null);
  const [documentEnLectureSeule, setDocumentEnLectureSeule] = useState(false);

  const [etatInitialEdition, setEtatInitialEdition] = useState(null);

  const [colonneTri, setColonneTri] = useState('date');
  const [ordreTri, setOrdreTri] = useState('desc');

  const inputQuantiteRef = useRef(null);
  const boutonSelectionArticleRef = useRef(null);

  const libellesTypesMouvement = {
    TRANSFERT: 'TRANSFERT ENTRE DÉPÔTS (TR)',
    ENTREE: 'ENTRÉE DE STOCK (ME)',
    SORTIE: 'SORTIE DE STOCK (MS)',
    AVARIES: 'AVARIES & PERTES (AV)',
    INVENTAIRE: 'SAISIE D’INVENTAIRE (INV)',
  };

  const genererNumeroDocSecurise = (type) => {
    const prefixes = { ENTREE: 'ME', SORTIE: 'MS', AVARIES: 'AV', TRANSFERT: 'TR', INVENTAIRE: 'INV' };
    const prefix = prefixes[type] || 'TR';
    const timestampAleatoire = Date.now().toString().slice(-6);
    const suffixeAleatoire = Math.floor(Math.random() * 900 + 100);
    return `${prefix}-${timestampAleatoire}-${suffixeAleatoire}`;
  };

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

      if (depotsList.length > 0 && !enTeteDoc.id_depot_source && !mouvementEnEditionId) {
        setEnTeteDoc((prev) => ({ 
          ...prev, 
          id_depot_source: depotsList[0].id,
          id_depot_destination: depotsList[0].id 
        }));
      }

      const { data: dataEmplacements } = await supabase
        .from('emplacements_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      const emplacementsList = Array.isArray(dataEmplacements) ? dataEmplacements : [];
      setEmplacements(emplacementsList);
      localSync.sauvegarderDonneesLocales(cleCacheEmplacements, emplacementsList);

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

      if (rpcError) {
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

      const { data: dataAppro } = await supabase
        .from('approvisionnements')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      if (Array.isArray(dataAppro)) {
        setApprovisionnements(dataAppro);
        localSync.sauvegarderDonneesLocales(cleCacheAppro, dataAppro);
      }

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
  }, [entrepriseId, typeOperation, moduleActuel]);

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

  const obtenirTousLesFluxArticle = (articleId) => {
    let flux = [];
    mouvements.filter((m) => String(m.id_article) === String(articleId)).forEach((m) => {
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
        const idArtLigne = ligne.id_article || ligne.article_id;
        if (String(idArtLigne) === String(articleId)) {
          flux.push({ 
            date: app.created_at || app.date_approvisionnement || '', 
            depot_source: null, 
            depot_destination: app.id_depot_destination || app.id_depot,
            emplacement_source: null,
            emplacement_destination: null,
            quantite: parseInt(ligne.quantite || 0), 
            type: 'APPROVISIONNEMENT' 
          });
        }
      });
    });

    flux.sort((a, b) => new Date(a.date) - new Date(b.date));
    return flux;
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
        if (matchDepotSource && matchDepotDest) {
          return;
        }
        if (matchDepotDest) stockDepot += qte; 
        if (matchDepotSource) stockDepot -= qte; 
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
          return (
            !motif.includes('CMD-') && 
            !motif.includes('LIVRAISON') && 
            !motif.includes('RESTITUTION') &&
            !motif.includes('VENTE') &&
            !motif.includes('VENTE TICKET')
          );
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
      const prefixes = { ENTREE: 'ME', SORTIE: 'MS', AVARIES: 'AV', TRANSFERT: 'TR', INVENTAIRE: 'INV' };
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
  }, [mouvements, depots, emplacements]);

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

    const artId = art.id_article || art.id;
    if (typeOperation === 'SORTIE' || typeOperation === 'TRANSFERT' || typeOperation === 'AVARIES') {
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
      alert('🔒 Ce document est en lecture seule (journée clôturée).');
      return false;
    }

    const dateDuJour = new Date().toISOString().split('T')[0];
    if (enTeteDoc.dateDoc < dateDuJour) {
      alert(`❌ Modification interdite : le document est daté du ${enTeteDoc.dateDoc} (journée clôturée et verrouillée).`);
      return false;
    }

    if (!enTeteDoc.referenceDoc || String(enTeteDoc.referenceDoc).trim() === '') {
      alert('⚠️ La zone Motif est obligatoire pour pouvoir ajouter des articles.');
      return false;
    }

    if (typeOperation === 'TRANSFERT') {
      if (!enTeteDoc.id_depot_source) { 
        alert('⚠️ Sélectionnez le dépôt source (origine).'); 
        return false; 
      }
      if (!enTeteDoc.id_depot_destination) { 
        alert('⚠️ Sélectionnez le dépôt destination.'); 
        return false; 
      }
    } else {
      if (!enTeteDoc.id_depot_source) { 
        alert('⚠️ Sélectionnez le dépôt.'); 
        return false; 
      }
    }
    return true;
  };

  const selectionnerArticleEtFocusQte = (art) => {
    if (enTrainDeSauvegarder || documentEnLectureSeule) return;
    if (!verifierEnTeteAvantSaisie()) return;
    setArticleSelectionneTemp(art);
    setModalArticleOuvert(false);
    setRecherchePopup('');
    setTimeout(() => { if (inputQuantiteRef.current) { inputQuantiteRef.current.focus(); inputQuantiteRef.current.select(); } }, 50);
  };

  const modifierLignePanier = (ligne) => {
    if (enTrainDeSauvegarder || documentEnLectureSeule) return;
    const dateDuJour = new Date().toISOString().split('T')[0];
    if (enTeteDoc.dateDoc < dateDuJour) {
      alert(`❌ Modification interdite : ce document appartient à une journée clôturée (${enTeteDoc.dateDoc}).`);
      return;
    }
    const artObj = articles.find(a => String(a.id_article || a.id) === String(ligne.id_article)) || { id_article: ligne.id_article, Designation: ligne.designation };
    setArticleSelectionneTemp(artObj);
    setQuantiteSaisie(ligne.quantite);
    setLignesPanier(lignesPanier.filter((l) => String(l.id_article) !== String(ligne.id_article)));
    setTimeout(() => { if (inputQuantiteRef.current) { inputQuantiteRef.current.focus(); inputQuantiteRef.current.select(); } }, 50);
  };

  const ajouterArticleAuPanier = () => {
    if (enTrainDeSauvegarder || documentEnLectureSeule || enTrainDInsertion) return;
    
    if (!permissions.peut_creer && !mouvementEnEditionId) {
      alert('⛔ Action non autorisée : Votre profil n’a pas le droit de créer des mouvements.');
      return;
    }
    if (!verifierEnTeteAvantSaisie() || !articleSelectionneTemp) { 
      if (!articleSelectionneTemp) alert('Sélectionnez un article.'); 
      return; 
    }
    
    const qte = parseInt(quantiteSaisie);
    if (isNaN(qte) || (typeOperation === 'INVENTAIRE' ? qte < 0 : qte <= 0)) { 
      alert('Quantité invalide.'); 
      return; 
    }

    setEnTrainDInsertion(true);

    const artId = String(articleSelectionneTemp.id_article || articleSelectionneTemp.id);
    const stockActuelDepot = calculerStockPourDepotActuel(artId);
    
    if ((typeOperation === 'SORTIE' || typeOperation === 'TRANSFERT' || typeOperation === 'AVARIES') && qte > stockActuelDepot) {
      alert(`⛔ Stock insuffisant (${stockActuelDepot} disp.).`);
      setEnTrainDInsertion(false);
      return;
    }

    let stockReelPrevisionnel = stockActuelDepot;
    if (typeOperation === 'ENTREE') stockReelPrevisionnel = stockActuelDepot + qte;
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
            stockActuel: stockActuelDepot, 
            stockReel: stockReelPrevisionnel 
          }
        ];
      }
    });

    setArticleSelectionneTemp(null);
    setQuantiteSaisie(1);
    
    setTimeout(() => { 
      if (boutonSelectionArticleRef.current) boutonSelectionArticleRef.current.focus(); 
      setEnTrainDInsertion(false); 
    }, 400);
  };

  const gererKeyDownQuantite = (e) => {
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
      alert(`❌ Suppression interdite : ce document appartient à une journée clôturée (${enTeteDoc.dateDoc}).`);
      return;
    }

    if (!verifierDroitSuppressionEffectif()) {
      alert('⛔ Action non autorisée : Seuls l’Administrateur et le Super Administrateur peuvent supprimer une opération.');
      return;
    }

    if (lignesPanier.length === 0 && !mouvementEnEditionId) {
      alert('Aucune opération active ou document en cours à supprimer.');
      return;
    }

    if (!confirm(`Voulez-vous vraiment supprimer définitivement ce document (${enTeteDoc.numeroAffichage || enTeteDoc.numeroDoc}) ?`)) return;

    setEnTrainDeSauvegarder(true);
    try {
      if (mouvementEnEditionId) {
        const { error } = await supabase.from('mouvements_stock').delete().eq('motif_remarque', enTeteDoc.numeroDoc);
        if (error) {
          localSync.ajouterFileAttente('DELETE', 'mouvements_stock', { motif_remarque: enTeteDoc.numeroDoc });
        }

        const listeMaj = mouvements.filter(m => m.motif_remarque !== enTeteDoc.numeroDoc);
        setMouvements(listeMaj);
        localSync.sauvegarderDonneesLocales(cleCacheMouvements, listeMaj);
        localStorage.removeItem(cleCacheMouvements);
      }

      alert('Document supprimé avec succès.');
      setLignesPanier([]);
      setMouvementEnEditionId(null);
      setDocumentEnLectureSeule(false);
      setEtatInitialEdition(null);
      setArticleSelectionneTemp(null);
      setQuantiteSaisie(1);
      setEnTeteDoc(prev => ({
        ...prev,
        referenceDoc: '',
        numeroDoc: genererNumeroDocSecurise(typeOperation),
        numeroAffichage: '',
        operateur: obtenirNomOperateurConnecte()
      }));
      await chargerDonnees(true);
      setModeAffichage('LISTE_DOCS');
    } catch (err) { 
      alert('Erreur : ' + err.message); 
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const validerDocumentMouvement = async () => {
    if (enTrainDeSauvegarder || documentEnLectureSeule) return;

    const dateDuJour = new Date().toISOString().split('T')[0];
    if (enTeteDoc.dateDoc < dateDuJour) {
      alert(`❌ Modification interdite : impossible d'enregistrer sur la date du ${enTeteDoc.dateDoc} car cette journée est clôturée.`);
      return;
    }

    if (mouvementEnEditionId && !permissions.peut_modifier) {
      alert('⛔ Action non autorisée : Votre profil n’a pas le droit de modifier les mouvements.');
      return;
    }
    if (!mouvementEnEditionId && !permissions.peut_creer) {
      alert('⛔ Action non autorisée : Votre profil n’a pas le droit de créer des mouvements.');
      return;
    }
    if (!permissions.peut_valider) {
      alert('⛔ Action non autorisée : Votre profil n’a pas le droit de valider des documents.');
      return;
    }

    if (!verifierEnTeteAvantSaisie() || lignesPanier.length === 0) { if (lignesPanier.length === 0) alert('Ajoutez des articles.'); return; }

    setEnTrainDeSauvegarder(true);
    try {
      if (mouvementEnEditionId) {
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

      let nouveauxMouvementsAjoutes = [];
      for (const ligne of lignesPanier) {
        const payload = {
          id_entreprise: entrepriseId,
          module: moduleActuel,
          type_mouvement: typeOperation,
          id_depot_source: enTeteDoc.id_depot_source || null,
          id_emplacement_source: enTeteDoc.id_emplacement_source || null,
          id_depot_destination: typeOperation === 'TRANSFERT' ? (enTeteDoc.id_depot_destination || null) : null,
          id_emplacement_destination: typeOperation === 'TRANSFERT' ? (enTeteDoc.id_emplacement_destination || null) : null,
          id_article: parseInt(ligne.id_article),
          quantite: ligne.quantite,
          motif_remarque: enTeteDoc.numeroDoc,
          reference: referenceSaisie,
          operateur: operateurActuel,
          created_at: dateMvtIso,
        };

        const idTemp = 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(7);
        const objetInsertion = { ...payload, id: idTemp };
        nouveauxMouvementsAjoutes.push(objetInsertion);

        const { error } = await supabase.from('mouvements_stock').insert([payload]);
        if (error) {
          localSync.ajouterFileAttente('INSERT', 'mouvements_stock', payload);
        }
      }

      const mouvementsFiltres = mouvements.filter(m => m.motif_remarque !== enTeteDoc.numeroDoc);
      const listeMaj = [...nouveauxMouvementsAjoutes, ...mouvementsFiltres];
      setMouvements(listeMaj);
      localSync.sauvegarderDonneesLocales(cleCacheMouvements, listeMaj);
      localStorage.removeItem(cleCacheMouvements);

      alert(`Document validé avec succès par ${operateurActuel} dans le module ${moduleActuel} !`);
      setLignesPanier([]);
      setMouvementEnEditionId(null);
      setDocumentEnLectureSeule(false);
      setEtatInitialEdition(null);
      setEnTeteDoc((prev) => ({ 
        ...prev, 
        referenceDoc: '', 
        numeroDoc: genererNumeroDocSecurise(typeOperation),
        numeroAffichage: '',
        operateur: obtenirNomOperateurConnecte() 
      }));
      await chargerDonnees(true);
      setModeAffichage('LISTE_DOCS');
    } catch (err) { 
      alert('Erreur : ' + err.message); 
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

    setDocumentEnLectureSeule(estVerrouille);
    setTypeOperation(premier.type_mouvement || 'TRANSFERT');
    
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
      referenceDoc: refEnregistree,
      operateur: operateurDoc
    };

    const nouvellesLignes = lignesAssociees.map(mvt => {
      const art = articles.find((a) => String(a.id_article || a.id) === String(mvt.id_article));
      return { id_article: mvt.id_article, designation: art ? (art.Designation || art.designation) : `Article #${mvt.id_article}`, quantite: mvt.quantite, stockActuel: calculerStockPourDepotActuel(mvt.id_article), stockReel: mvt.quantite };
    });

    setEnTeteDoc(nouvelEnTete);
    setLignesPanier(nouvellesLignes);
    setMouvementEnEditionId(premier.id);
    
    setEtatInitialEdition({
      enTete: JSON.parse(JSON.stringify(nouvelEnTete)),
      lignes: JSON.parse(JSON.stringify(nouvellesLignes)),
      typeOp: premier.type_mouvement || 'TRANSFERT'
    });

    setModeAffichage('SAISIE');
  };

  const documentModifie = useMemo(() => {
    if (!mouvementEnEditionId || !etatInitialEdition) return true;
    const enTeteModifie = JSON.stringify(enTeteDoc) !== JSON.stringify(etatInitialEdition.enTete);
    const typeModifie = typeOperation !== etatInitialEdition.typeOp;
    const lignesModifiees = JSON.stringify(lignesPanier) !== JSON.stringify(etatInitialEdition.lignes);
    return enTeteModifie || typeModifie || lignesModifiees;
  }, [mouvementEnEditionId, etatInitialEdition, enTeteDoc, typeOperation, lignesPanier]);

  // Filtrage avancé des documents par date, partenaire et livreur sur une seule ligne
  const documentsFiltresParCriteres = documentsGroupes.filter((doc) => {
    // 1. Plage de dates
    if (doc.date) {
      const dateDocStr = doc.date.split('T')[0];
      if (filtreDateDebut && dateDocStr < filtreDateDebut) return false;
      if (filtreDateFin && dateDocStr > filtreDateFin) return false;
    }
    // 2. Partenaire / Dépôt source
    if (filtrePartenaire) {
      const depotNomDoc = (doc.depotNom || '').toUpperCase();
      const depotCibleObj = depots.find(d => String(d.id) === String(filtrePartenaire));
      const depotCibleNom = depotCibleObj ? (depotCibleObj.nom_depot || depotCibleObj.nom || '').toUpperCase() : filtrePartenaire.toUpperCase();
      if (!depotNomDoc.includes(depotCibleNom)) return false;
    }
    // 3. Livreur / Opérateur
    if (filtreLivreur) {
      const opDoc = (doc.operateur || '').toUpperCase();
      if (!opDoc.includes(filtreLivreur.toUpperCase())) return false;
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

  return (
    <div className="space-y-2 font-sans text-[10px]">
      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-extrabold uppercase text-slate-900">MOUVEMENTS DE STOCK</span>
          {roleNom && (
            <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold border border-slate-200">
              Rôle : {roleNom}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button 
            type="button" 
            disabled={enTrainDeSauvegarder} 
            onClick={() => { 
              if (enTrainDeSauvegarder) return;
              setModeAffichage('SAISIE'); 
              setMouvementEnEditionId(null); 
              setDocumentEnLectureSeule(false);
              setEtatInitialEdition(null);
              setLignesPanier([]); 
              setEnTeteDoc(prev => ({ ...prev, referenceDoc: '', numeroDoc: genererNumeroDocSecurise(typeOperation), numeroAffichage: '', operateur: obtenirNomOperateurConnecte() })); 
            }} 
            className={`py-1 px-3 rounded-lg font-bold transition text-center text-[10px] ${modeAffichage === 'SAISIE' ? 'bg-orange-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-800'}`}
          >
            ✍️ {mouvementEnEditionId ? 'Modifier' : 'Créer'}
          </button>
          <button 
            type="button" 
            disabled={enTrainDeSauvegarder} 
            onClick={() => { if (!enTrainDeSauvegarder) setModeAffichage('LISTE_DOCS'); }} 
            className={`py-1 px-3 rounded-lg font-bold transition text-center text-[10px] ${modeAffichage === 'LISTE_DOCS' ? 'bg-orange-600 text-white shadow-2xs' : 'bg-slate-100 text-slate-800'}`}
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

          <div className="grid grid-cols-2 gap-2 items-center">
            <button
              type="button"
              disabled={enTrainDeSauvegarder}
              onClick={() => {
                if (enTrainDeSauvegarder) return;
                if (!documentEnLectureSeule && lignesPanier.length > 0 && !confirm('Voulez-vous quitter sans enregistrer ? Vos articles non validés seront ignorés.')) {
                  return;
                }
                setModeAffichage('LISTE_DOCS');
                setMouvementEnEditionId(null);
                setDocumentEnLectureSeule(false);
                setEtatInitialEdition(null);
                setLignesPanier([]);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-white font-black px-2 py-1.5 rounded-xl text-[9px] uppercase shadow-xs transition flex items-center justify-center gap-1 border border-slate-700 w-full truncate"
            >
              <span>←</span> Retour liste
            </button>

            <div className="bg-white border border-slate-200 px-2 py-1 rounded-xl flex items-center justify-between gap-1 shadow-2xs">
              <span className="font-extrabold text-[8px] text-slate-700 uppercase shrink-0">Type</span>
              <select 
                disabled={enTeteVerrouille || !!mouvementEnEditionId} 
                value={typeOperation} 
                onChange={(e) => { 
                  if (mouvementEnEditionId) return;
                  const nt = e.target.value; 
                  setTypeOperation(nt); 
                  if (!mouvementEnEditionId) setEnTeteDoc(prev => ({ ...prev, numeroDoc: genererNumeroDocSecurise(nt), numeroAffichage: '', operateur: obtenirNomOperateurConnecte() })); 
                }} 
                className="bg-slate-50 border rounded px-1.5 py-0.5 font-extrabold text-orange-600 text-[9px] truncate w-full"
              >
                <option value="TRANSFERT">🔀 Transfert (TR)</option>
                <option value="ENTREE">📥 Entrée (ME)</option>
                <option value="SORTIE">📤 Sortie (MS)</option>
                <option value="AVARIES">⚠️ Avaries (AV)</option>
                <option value="INVENTAIRE">📊 Inventaire (INV)</option>
              </select>
            </div>
          </div>

          <div className={`bg-white border-2 border-orange-500/50 p-2 rounded-xl shadow-2xs space-y-1.5 ${enTeteVerrouille ? 'bg-slate-50/80' : ''}`}>
            <div className="flex justify-between items-center pb-1 border-b">
              <div className="flex flex-col">
                <span className="font-extrabold text-[10px] text-orange-600 uppercase">
                  {libellesTypesMouvement[typeOperation]} {enTeteVerrouille && '🔒'}
                </span>
                <span className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">
                  OPÉRATEUR CONNECTÉ : <strong className="text-slate-800">{mouvementEnEditionId ? enTeteDoc.operateur : obtenirNomOperateurConnecte()}</strong>
                </span>
              </div>
              <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-mono font-bold text-[9px]">
                {enTeteDoc.numeroAffichage || enTeteDoc.numeroDoc}
              </span>
            </div>
            
            <div className="space-y-1.5 text-[9.5px]">
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block font-bold text-[7.5px] text-slate-600 mb-0.5">Date *</label>
                  <input type="date" disabled={documentEnLectureSeule} value={enTeteDoc.dateDoc} onChange={(e) => setEnTeteDoc({ ...enTeteDoc, dateDoc: e.target.value })} className="w-full bg-slate-50 border rounded p-1 font-bold text-slate-900 disabled:opacity-70" />
                </div>
                <div>
                  <label className="block font-bold text-[7.5px] text-slate-600 mb-0.5">Motif * (Obligatoire)</label>
                  <input type="text" disabled={documentEnLectureSeule} value={enTeteDoc.referenceDoc} onChange={(e) => setEnTeteDoc({ ...enTeteDoc, referenceDoc: e.target.value })} className="w-full bg-slate-50 border rounded p-1 font-extrabold uppercase text-slate-900 disabled:opacity-70" />
                </div>
              </div>

              {typeOperation === 'TRANSFERT' ? (
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <div className="space-y-1 bg-orange-50/40 p-1.5 rounded-lg border border-orange-200">
                    <label className="block font-black text-[8px] text-orange-800 uppercase">🏢 Origine (Source) *</label>
                    <button 
                      type="button"
                      disabled={enTeteVerrouille}
                      onClick={() => { setRechercheModalPopup(''); setModalDepotSourceOuvert(true); }}
                      className="w-full bg-white border rounded p-1 text-left font-extrabold text-orange-700 text-[9px] flex justify-between items-center disabled:opacity-70"
                    >
                      <span className="truncate">{obtenirNomDepotParId(enTeteDoc.id_depot_source) || '-- Dépôt --'}</span>
                      <span>🔍</span>
                    </button>
                    <button 
                      type="button"
                      disabled={enTeteVerrouille}
                      onClick={() => { setRechercheModalPopup(''); setModalLivreurSourceOuvert(true); }}
                      className="w-full bg-white border rounded p-1 text-left font-bold text-slate-800 text-[9px] flex justify-between items-center mt-1 disabled:opacity-70"
                    >
                      <span className="truncate">{obtenirNomEmplacementParId(enTeteDoc.id_emplacement_source) !== '-' ? obtenirNomEmplacementParId(enTeteDoc.id_emplacement_source) : libellePlaceholderSource}</span>
                      <span>🔍</span>
                    </button>
                  </div>

                  <div className="space-y-1 bg-blue-50/40 p-1.5 rounded-lg border border-blue-200">
                    <label className="block font-black text-[8px] text-blue-800 uppercase">🎯 Destination *</label>
                    <button 
                      type="button"
                      disabled={enTeteVerrouille}
                      onClick={() => { setRechercheModalPopup(''); setModalDepotDestOuvert(true); }}
                      className="w-full bg-white border rounded p-1 text-left font-extrabold text-blue-700 text-[9px] flex justify-between items-center disabled:opacity-70"
                    >
                      <span className="truncate">{obtenirNomDepotParId(enTeteDoc.id_depot_destination) || '-- Dépôt --'}</span>
                      <span>🔍</span>
                    </button>
                    <button 
                      type="button"
                      disabled={enTeteVerrouille}
                      onClick={() => { setRechercheModalPopup(''); setModalLivreurDestOuvert(true); }}
                      className="w-full bg-white border rounded p-1 text-left font-bold text-slate-800 text-[9px] flex justify-between items-center mt-1 disabled:opacity-70"
                    >
                      <span className="truncate">{obtenirNomEmplacementParId(enTeteDoc.id_emplacement_destination) !== '-' ? obtenirNomEmplacementParId(enTeteDoc.id_emplacement_destination) : libellePlaceholderDest}</span>
                      <span>🔍</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <div className="space-y-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    <label className="block font-black text-[8px] text-slate-700 uppercase">🏢 Dépôt *</label>
                    <button 
                      type="button"
                      disabled={enTeteVerrouille}
                      onClick={() => { setRechercheModalPopup(''); setModalDepotSourceOuvert(true); }}
                      className="w-full bg-white border rounded p-1 text-left font-extrabold text-orange-600 text-[9px] flex justify-between items-center disabled:opacity-70"
                    >
                      <span className="truncate">{obtenirNomDepotParId(enTeteDoc.id_depot_source) || '-- Dépôt --'}</span>
                      <span>🔍</span>
                    </button>
                  </div>
                  <div className="space-y-1 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    <label className="block font-black text-[8px] text-slate-700 uppercase">📍 {libelleLivreur}</label>
                    <button 
                      type="button"
                      disabled={enTeteVerrouille}
                      onClick={() => { setRechercheModalPopup(''); setModalLivreurSourceOuvert(true); }}
                      className="w-full bg-white border rounded p-1 text-left font-bold text-slate-800 text-[9px] flex justify-between items-center disabled:opacity-70"
                    >
                      <span className="truncate">{obtenirNomEmplacementParId(enTeteDoc.id_emplacement_source) !== '-' ? obtenirNomEmplacementParId(enTeteDoc.id_emplacement_source) : '-- Aucun --'}</span>
                      <span>🔍</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

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
                        const estEpuise = stockActuel <= 0;
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
                              Stock : <strong className={estEpuise ? 'text-rose-600' : 'text-emerald-700'}>{stockActuel}</strong>
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
                <table className="w-full text-left text-[9.5px] table-fixed">
                  <thead className="bg-slate-50 text-slate-700 uppercase text-[7.5px] font-extrabold border-b">
                    <tr>
                      <th className="p-1 w-[60%]">ARTICLE</th>
                      <th className="p-1 w-[25%] text-center">QTE</th>
                      {!documentEnLectureSeule && <th className="p-1 w-[15%] text-center">⚙️</th>}
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
            <span className="font-extrabold uppercase text-slate-800">Documents Enregistrés [{moduleActuel}] ({documentsAffiches.length} / {documentsTries.length})</span>
            <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-bold">{documentsTries.length}</span>
          </div>

          {/* Ligne de filtres compacte : Date, Partenaire, Livreur */}
          <div className="px-2 pt-1">
            <div className="bg-slate-50/80 p-2 rounded-xl border border-slate-200 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-black text-[8.5px] text-slate-700 uppercase">🔍 FILTRER LES MOUVEMENTS</span>
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
                  <label className="block text-[7.5px] font-bold text-slate-600 mb-0.5">Livreur / Opérateur</label>
                  <button
                    type="button"
                    onClick={() => { setRechercheFiltreModal(''); setModalFiltreLivreurOuvert(true); }}
                    className="w-full bg-white border rounded p-1 font-bold text-slate-800 text-[8.5px] uppercase text-left truncate flex justify-between items-center"
                  >
                    <span className="truncate">{filtreLivreur || 'Tous'}</span>
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
                  <th onClick={() => !enTrainDeSauvegarder && gererTri('referenceDoc')} className="p-1.5 cursor-pointer">MOTIF</th>
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
                      <td className="p-1.5 font-mono font-black text-orange-600 whitespace-nowrap">{doc.numeroDoc}</td>
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

      {/* Modale Filtre Partenaire */}
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

      {/* Modale Filtre Livreur / Opérateur */}
      {modalFiltreLivreurOuvert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-black text-slate-900 uppercase text-xs">FILTRER PAR LIVREUR / OPÉRATEUR</h4>
              <button type="button" onClick={() => setModalFiltreLivreurOuvert(false)} className="text-slate-400 font-black text-sm">✕</button>
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
              <div onClick={() => { setFiltreLivreur(''); setModalFiltreLivreurOuvert(false); }} className="col-span-2 p-3 rounded-xl border border-slate-200 hover:bg-orange-50 cursor-pointer font-bold text-slate-500 text-xs text-center">
                -- Tous les livreurs / opérateurs --
              </div>
              {Array.from(new Set(documentsGroupes.map(d => d.operateur))).filter(op => op && op.toUpperCase().includes(rechercheFiltreModal)).map((op, idx) => (
                <div key={idx} onClick={() => { setFiltreLivreur(op); setModalFiltreLivreurOuvert(false); }} className="p-3 rounded-xl border border-slate-200 hover:bg-orange-50 cursor-pointer font-black text-xs text-slate-900 uppercase truncate">
                  {op}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}