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
  const libelleTiers = estModeBoutique ? 'Fournisseur' : 'Partenaire';

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

  const nettoyerFileAttenteSync = (motifASupprimer = null) => {
    if (typeof window === 'undefined') return;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const cle = localStorage.key(i);
        if (!cle) continue;
        const brut = localStorage.getItem(cle);
        if (!brut || !brut.includes('mouvements_stock')) continue;
        try {
          const parsed = JSON.parse(brut);
          if (Array.isArray(parsed)) {
            let modifie = false;
            const listeNettoyee = parsed
              .filter((item) => {
                if (!item || item.table !== 'mouvements_stock') return true;
                const cible = item.data || item.payload || item.donnees;
                if (motifASupprimer && cible && String(cible.motif_remarque) === String(motifASupprimer)) {
                  modifie = true;
                  return false;
                }
                return true;
              })
              .map((item) => {
                if (item && item.table === 'mouvements_stock') {
                  const cible = item.data || item.payload || item.donnees;
                  if (cible && ('prix_unitaire' in cible || 'montant_total' in cible)) {
                    const { prix_unitaire, montant_total, ...donneesValides } = cible;
                    modifie = true;
                    if (item.data) return { ...item, data: donneesValides };
                    if (item.payload) return { ...item, payload: donneesValides };
                    if (item.donnees) return { ...item, donnees: donneesValides };
                  }
                }
                return item;
              });
            if (modifie) {
              localStorage.setItem(cle, JSON.stringify(listeNettoyee));
            }
          }
        } catch (errParse) {}
      }
    } catch (e) {}
  };

  const [mouvements, setMouvements] = useState(() => {
    if (typeof window !== 'undefined' && localSync && typeof localSync.recupererDonneesLocales === 'function') {
      const data = localSync.recupererDonneesLocales(cleCacheMouvements);
      return Array.isArray(data) ? data : [];
    }
    return [];
  });

  const [articles, setArticles] = useState(() => {
    if (typeof window !== 'undefined' && localSync && typeof localSync.recupererDonneesLocales === 'function') {
      const data = localSync.recupererDonneesLocales(cleCacheArticles);
      return Array.isArray(data) ? data : [];
    }
    return [];
  });

  const [depots, setDepots] = useState(() => {
    if (typeof window !== 'undefined' && localSync && typeof localSync.recupererDonneesLocales === 'function') {
      const data = localSync.recupererDonneesLocales(cleCacheDepots);
      return Array.isArray(data) ? data : [];
    }
    return [];
  });

  const [emplacements, setEmplacements] = useState(() => {
    if (typeof window !== 'undefined' && localSync && typeof localSync.recupererDonneesLocales === 'function') {
      const data = localSync.recupererDonneesLocales(cleCacheEmplacements);
      return Array.isArray(data) ? data : [];
    }
    return [];
  });

  const [fournisseurs, setFournisseurs] = useState(() => {
    if (typeof window !== 'undefined' && localSync && typeof localSync.recupererDonneesLocales === 'function') {
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

  const [statutReglement, setStatutReglement] = useState('SOLDE');
  const [montantPayeAchat, setMontantPayeAchat] = useState(0);
  const [modalReglementOuvert, setModalReglementOuvert] = useState(false);

  const [filtreDateDebut, setFiltreDateDebut] = useState('');
  const [filtreDateFin, setFiltreDateFin] = useState('');
  const [filtrePartenaire, setFiltrePartenaire] = useState('');
  const [filtreLivreur, setFiltreLivreur] = useState('');

  const [modalFiltrePartenaireOuvert, setModalFiltrePartenaireOuvert] = useState(false);
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

  const numeroDocOriginalRef = useRef(numeroDocOriginal);
  useEffect(() => {
    numeroDocOriginalRef.current = numeroDocOriginal;
  }, [numeroDocOriginal]);

  const afficherMessage = (texte, type = 'info', titre = 'Notification') => {
    setModalMessage({ texte, type, titre });
  };

  const libererVerrouDoc = (numeroDocUnique) => {
    if (!numeroDocUnique) return;
    const operateurActuel = obtenirNomOperateurConnecte();
    supabase
      .from('verrous_documents')
      .delete()
      .eq('id_entreprise', entrepriseId)
      .eq('module', moduleActuel)
      .eq('numero_doc', numeroDocUnique)
      .eq('utilisateur', operateurActuel)
      .then(() => {})
      .catch(() => {});
  };

  const acquerirVerrouDoc = async (numeroDocUnique) => {
    if (!numeroDocUnique) return true;
    try {
      const operateurActuel = obtenirNomOperateurConnecte();
      
      const { data } = await supabase
        .from('verrous_documents')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .eq('numero_doc', numeroDocUnique)
        .maybeSingle();

      if (data && data.utilisateur && data.utilisateur !== operateurActuel) {
        afficherMessage(`Ce document est actuellement ouvert et verrouillé par ${data.utilisateur}. Accès refusé.`, 'erreur', 'Document verrouillé');
        return false;
      }

      await supabase
        .from('verrous_documents')
        .upsert({
          id_entreprise: entrepriseId,
          module: moduleActuel,
          numero_doc: numeroDocUnique,
          utilisateur: operateurActuel,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id_entreprise,module,numero_doc' });

      return true;
    } catch (e) {
      return true; 
    }
  };

  useEffect(() => {
    const gererFermetureFenetre = () => {
      const docActif = numeroDocOriginalRef.current;
      if (docActif) {
        const operateurActuel = obtenirNomOperateurConnecte();
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (supabaseUrl && supabaseKey) {
          const endpoint = `${supabaseUrl}/rest/v1/verrous_documents?id_entreprise=eq.${entrepriseId}&module=eq.${moduleActuel}&numero_doc=eq.${docActif}&utilisateur=eq.${encodeURIComponent(operateurActuel)}`;
          fetch(endpoint, {
            method: 'DELETE',
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            keepalive: true
          }).catch(() => {});
        }
      }
    };

    window.addEventListener('beforeunload', gererFermetureFenetre);
    return () => {
      window.removeEventListener('beforeunload', gererFermetureFenetre);
      const docActif = numeroDocOriginalRef.current;
      if (docActif) {
        libererVerrouDoc(docActif);
      }
    };
  }, [entrepriseId, moduleActuel]);

  const libellesTypesMouvement = {
    TRANSFERT: 'TRANSFERT',
    ENTREE: 'ACHAT',
    ENTREE_STOCK: 'ENTRÉE EN STOCK',
    SORTIE: 'SORTIE DE STOCK',
    AVARIES: 'AVARIES & PERTES',
    INVENTAIRE: 'INVENTAIRE',
  };

  const descriptionsTypesMouvement = {
    TRANSFERT: 'Transférer des articles d’un dépôt ou emplacement vers un autre.',
    ENTREE_STOCK: 'Ajouter directement du stock en interne.',
    SORTIE: 'Enregistrer une sortie de stock interne.',
    AVARIES: 'Déclarer des articles perdus ou endommagés.',
    INVENTAIRE: 'Réajuster l’inventaire physique réel d’un dépôt.',
  };

  const genererNumeroDocSecurise = (type) => {
    const prefixes = { ENTREE: 'APP', ENTREE_STOCK: 'ES', SORTIE: 'MS', AVARIES: 'AV', TRANSFERT: 'TR', INVENTAIRE: 'INV' };
    const prefix = prefixes[type] || 'TR';
    const timestampAleatoire = Date.now().toString().slice(-6);
    const suffixeAleatoire = Math.floor(Math.random() * 900 + 100);
    return `${prefix}-${timestampAleatoire}-${suffixeAleatoire}`;
  };

  const montantTotalFacture = useMemo(() => {
    if (!estModeBoutique && ongletPrincipal === 'ACHATS') return 0;
    return lignesPanier.reduce((acc, ligne) => acc + (Number(ligne.quantite || 0) * Number(ligne.prix_unitaire || 0)), 0);
  }, [lignesPanier, estModeBoutique, ongletPrincipal]);

  useEffect(() => {
    if (statutReglement === 'SOLDE') {
      setMontantPayeAchat(montantTotalFacture);
    } else if (statutReglement === 'NON_PAYE') {
      setMontantPayeAchat(0);
    }
  }, [statutReglement, montantTotalFacture]);

  const resteAVerserFacture = Math.max(0, montantTotalFacture - Number(montantPayeAchat || 0));

  const chargerDonnees = async (silencieux = false) => {
    const mouvementsLocaux = (localSync && typeof localSync.recupererDonneesLocales === 'function') 
      ? localSync.recupererDonneesLocales(cleCacheMouvements) 
      : [];
    
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
              setPermissions({ peut_creer: true, peut_modifier: true, peut_supprimer: true, peut_valider: true });
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

      const { data: dataDepots } = await supabase.from('depots_stock').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel);
      const depotsList = Array.isArray(dataDepots) ? dataDepots : [];
      setDepots(depotsList);
      if (localSync && typeof localSync.sauvegarderDonneesLocales === 'function') {
        localSync.sauvegarderDonneesLocales(cleCacheDepots, depotsList);
      }

      const { data: dataEmplacements } = await supabase.from('emplacements_stock').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel);
      const emplacementsList = Array.isArray(dataEmplacements) ? dataEmplacements : [];
      setEmplacements(emplacementsList);
      if (localSync && typeof localSync.sauvegarderDonneesLocales === 'function') {
        localSync.sauvegarderDonneesLocales(cleCacheEmplacements, emplacementsList);
      }

      const { data: dataFournisseurs } = await supabase.from('fournisseurs').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel);
      const fournisseursList = Array.isArray(dataFournisseurs) ? dataFournisseurs : [];
      setFournisseurs(fournisseursList);
      if (localSync && typeof localSync.sauvegarderDonneesLocales === 'function') {
        localSync.sauvegarderDonneesLocales(cleCacheFournisseurs, fournisseursList);
      }

      const { data: dataArticles } = await supabase.from('articles_stock').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel);
      if (Array.isArray(dataArticles)) {
        setArticles(dataArticles);
        if (localSync && typeof localSync.sauvegarderDonneesLocales === 'function') {
          localSync.sauvegarderDonneesLocales(cleCacheArticles, dataArticles);
        }
      }

      const { data: dataFamilles } = await supabase.from('familles_articles').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel);
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
      if (localSync && typeof localSync.sauvegarderDonneesLocales === 'function') {
        localSync.sauvegarderDonneesLocales(cleCacheMouvements, mouvementsList);
      }

      if (!mouvementEnEditionId) {
        setEnTeteDoc((prev) => ({ ...prev, numeroDoc: genererNumeroDocSecurise(typeOperation), operateur: nomConnecteEffectif }));
      }
    } catch (err) { 
      console.error('Erreur :', err.message); 
    } finally { 
      setChargement(false); 
    }
  };

  useEffect(() => { 
    nettoyerFileAttenteSync();
    chargerDonnees(); 
    if (localSync && typeof localSync.synchroniserVersCloud === 'function') {
      localSync.synchroniserVersCloud(supabase);
    }
  }, [entrepriseId, moduleActuel]);

  const basculerVersAchats = () => {
    if (enTrainDeSauvegarder) return;
    if (numeroDocOriginal) {
      libererVerrouDoc(numeroDocOriginal);
    }
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
      id_emplacement_source: '',
      id_depot_destination: '',
      id_emplacement_destination: '',
      id_fournisseur: '',
      referenceDoc: '',
      numeroDoc: genererNumeroDocSecurise('ENTREE'),
      numeroAffichage: '',
      operateur: obtenirNomOperateurConnecte()
    }));
  };

  const basculerVersMouvements = () => {
    if (enTrainDeSauvegarder) return;
    if (numeroDocOriginal) {
      libererVerrouDoc(numeroDocOriginal);
    }
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
      id_emplacement_source: '',
      id_depot_destination: '',
      id_emplacement_destination: '',
      id_fournisseur: '',
      referenceDoc: '',
      numeroDoc: genererNumeroDocSecurise(typeParDefaut),
      numeroAffichage: '',
      operateur: obtenirNomOperateurConnecte()
    }));
  };

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

  const obtenirNomPartenairePourDoc = (mvt) => {
    if (!mvt) return '-';
    if (mvt.id_fournisseur) {
      const nomFourn = obtenirNomFournisseurParId(mvt.id_fournisseur);
      if (nomFourn) return nomFourn;
    }
    if (mvt.id_depot_source) {
      const nomDep = obtenirNomDepotParId(mvt.id_depot_source);
      if (nomDep && nomDep !== '-') return nomDep;
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

      if (typeMvt === 'INVENTAIRE' && matchSource) { stockEmp = qte; return; }
      if (typeMvt === 'TRANSFERT') {
        if (matchDest) stockEmp += qte;
        if (matchSource) stockEmp -= qte;
        return;
      }
      if (typeMvt === 'ENTREE_STOCK' && matchSource) { stockEmp += qte; return; }
      if (matchDest) stockEmp += qte;
      if (matchSource) stockEmp -= qte;
    });

    return Math.max(0, stockEmp);
  };

  const calculerStockPourDepotActuel = (articleId) => {
    const emplacementCibleId = (ongletPrincipal === 'MOUVEMENTS' && typeOperation === 'TRANSFERT') ? enTeteDoc.id_emplacement_source : '';
    if (emplacementCibleId) return calculerStockPourEmplacement(articleId, emplacementCibleId);

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

      if (typeMvt === 'INVENTAIRE' && matchDepotSource) { stockDepot = qte; return; }
      if (typeMvt === 'TRANSFERT') { 
        if (matchDepotSource && matchDepotDest) return;
        if (matchDepotDest) stockDepot += qte; 
        if (matchDepotSource) stockDepot -= qte; 
        return; 
      }
      if (typeMvt === 'ENTREE_STOCK' && matchDepotSource) { stockDepot += qte; return; }
      if (typeMvt === 'ENTREE' || typeMvt === 'APPROVISIONNEMENT' || typeMvt.includes('ACHAT') || typeMvt.includes('APPRO') || typeMvt.includes('FACTURE')) {
        if (matchDepotSource || matchDepotDest) stockDepot += qte;
      } else if (typeMvt === 'SORTIE' || typeMvt === 'AVARIES' || typeMvt === 'VENTE') {
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
          
          const estSystemeAuto = (motif.includes('CMD-') || motif.includes('LIVRAISON') || motif.includes('RESTITUTION') || motif.includes('VENTE') || motif.includes('VENTE TICKET'));
          if (estSystemeAuto) return false;

          const estAchatOuAppro = typeMvt === 'ENTREE' || typeMvt === 'APPROVISIONNEMENT';
          if (ongletPrincipal === 'ACHATS') return estAchatOuAppro;
          return !estAchatOuAppro;
        })
        .reduce((acc, mvt) => {
          const numDocBrut = mvt.motif_remarque || 'SANS-REF';
          
          if (!acc[numDocBrut]) { 
            const operateurEnBase = mvt.operateur;
            const operateurAffiche = (operateurEnBase && String(operateurEnBase).trim() !== '' && String(operateurEnBase).trim().toLowerCase() !== 'utilisateur' && String(operateurEnBase).trim() !== 'Utilisateur Inconnu') 
              ? String(operateurEnBase).trim().toUpperCase() 
              : obtenirNomOperateurConnecte();

            const motifSaisiManuel = mvt.reference || mvt.motif_remarque || '';

            acc[numDocBrut] = { 
              numeroDocBrut: numDocBrut,
              motifSaisi: motifSaisiManuel,
              date: mvt.created_at || '', 
              type: (mvt.type_mouvement || 'TRANSFERT').toUpperCase(), 
              partenaireNom: obtenirNomPartenairePourDoc(mvt),
              id_depot_source: mvt.id_depot_source,
              id_fournisseur: mvt.id_fournisseur,
              id_emplacement_source: mvt.id_emplacement_source,
              id_emplacement_destination: mvt.id_emplacement_destination,
              operateur: operateurAffiche, 
              lignesCount: 0 
            }; 
          }
          if (!acc[numDocBrut].motifSaisi && mvt.reference) {
            acc[numDocBrut].motifSaisi = mvt.reference;
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

      if (!compteursParType[prefix]) compteursParType[prefix] = 0;
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
    const emplacementSourceId = (ongletPrincipal === 'MOUVEMENTS' && typeOperation === 'TRANSFERT') ? enTeteDoc.id_emplacement_source : '';

    if (emplacementSourceId) {
      const empObj = emplacements.find(e => String(e.id) === String(emplacementSourceId));
      if (empObj) {
        const empPartenaire = String(empObj.partenaire || empObj.id_partenaire || '').trim().toUpperCase();
        if (empPartenaire && artPartenaire && empPartenaire !== artPartenaire) return false;
      }
    }

    if (ongletPrincipal === 'ACHATS' && enTeteDoc.id_fournisseur) {
      const fournNom = obtenirNomFournisseurParId(enTeteDoc.id_fournisseur).toUpperCase();
      if (artPartenaire && artPartenaire !== String(enTeteDoc.id_fournisseur).toUpperCase() && artPartenaire !== fournNom) return false;
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
      afficherMessage(`Modification interdite : le document est daté du ${enTeteDoc.dateDoc} (journée clôturée).`, 'erreur', 'Journée clôturée');
      return false;
    }

    if (!enTeteDoc.referenceDoc || String(enTeteDoc.referenceDoc).trim() === '') {
      afficherMessage(ongletPrincipal === 'ACHATS' ? 'La référence / N° Facture ou Motif est obligatoire.' : 'La zone Motif est obligatoire.', 'erreur', 'Champ manquant');
      return false;
    }

    if (ongletPrincipal === 'ACHATS') {
      if (estModeBoutique) {
        if (!enTeteDoc.id_fournisseur) {
          afficherMessage('La sélection du fournisseur est obligatoire.', 'erreur', 'Fournisseur manquant');
          return false;
        }
        if (!enTeteDoc.id_depot_source) {
          afficherMessage('La sélection du dépôt de réception est obligatoire.', 'erreur', 'Dépôt manquant');
          return false;
        }
      } else {
        if (!enTeteDoc.id_fournisseur && !enTeteDoc.id_depot_source) {
          afficherMessage('La sélection du partenaire est obligatoire.', 'erreur', 'Partenaire manquant');
          return false;
        }
        if (!enTeteDoc.id_depot_source) {
          afficherMessage('Aucun dépôt n’est rattaché à ce partenaire. Veuillez créer ou associer un dépôt à ce partenaire.', 'erreur', 'Dépôt partenaire introuvable');
          return false;
        }
      }
    } else if (typeOperation === 'TRANSFERT' && ongletPrincipal === 'MOUVEMENTS') {
      if (!enTeteDoc.id_depot_source) { afficherMessage('Sélectionnez le dépôt départ.', 'erreur', 'Source manquante'); return false; }
      if (!enTeteDoc.id_depot_destination) { afficherMessage('Sélectionnez le dépôt destination (arrivée).', 'erreur', 'Destination manquante'); return false; }
    } else {
      if (!enTeteDoc.id_depot_source) { afficherMessage(`Sélectionnez le ${estModeBoutique ? 'dépôt' : 'partenaire'}.`, 'erreur', `${estModeBoutique ? 'Dépôt' : 'Partenaire'} manquant`); return false; }
    }
    return true;
  };

  const selectionnerArticleEtFocusQte = (art) => {
    if (enTrainDeSauvegarder || documentEnLectureSeule) return;
    if (!verifierEnTeteAvantSaisie()) return;
    setArticleSelectionneTemp(art);
    
    const puDefaut = (estModeBoutique && ongletPrincipal === 'ACHATS') 
      ? Number(art.Prix_Achat || art.prix_achat || art.Prix_Vente || art.prix_vente || art.prix_unitaire || art.PU || 0) 
      : 0;
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
    const pu = (estModeBoutique && ongletPrincipal === 'ACHATS') ? parseFloat(prixUnitaireSaisi) : 0;

    if (isNaN(qte) || (typeOperation === 'INVENTAIRE' ? qte < 0 : qte <= 0)) { afficherMessage('Quantité invalide.', 'erreur', 'Erreur de saisie'); return; }
    if (ongletPrincipal === 'ACHATS' && estModeBoutique && (isNaN(pu) || pu < 0)) { afficherMessage('Prix unitaire d\'achat invalide.', 'erreur', 'Erreur de saisie'); return; }

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
      if (ongletPrincipal === 'ACHATS' && estModeBoutique && inputPrixRef.current) {
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
        if (email === 'stephs7352@gmail.com' || role.includes('ADMIN') || role.includes('ADMINISTRATEUR')) return true;
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
            libererVerrouDoc(motifSuppr);
            nettoyerFileAttenteSync(motifSuppr);
            const { error } = await supabase
              .from('mouvements_stock')
              .delete()
              .eq('id_entreprise', entrepriseId)
              .eq('module', moduleActuel)
              .eq('motif_remarque', motifSuppr);

            if (error && localSync && typeof localSync.ajouterFileAttente === 'function') {
              localSync.ajouterFileAttente('DELETE', 'mouvements_stock', { motif_remarque: motifSuppr });
            }

            const listeMaj = mouvements.filter(m => m.motif_remarque !== motifSuppr);
            setMouvements(listeMaj);
            if (localSync && typeof localSync.sauvegarderDonneesLocales === 'function') {
              localSync.sauvegarderDonneesLocales(cleCacheMouvements, listeMaj);
            }
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
            id_emplacement_source: '',
            id_depot_destination: '',
            id_emplacement_destination: '',
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

  const executerValidationDocument = async () => {
    if (documentEnLectureSeule) return;

    const dateDuJour = new Date().toISOString().split('T')[0];
    if (enTeteDoc.dateDoc < dateDuJour) {
      afficherMessage(`Modification interdite : impossible d'enregistrer sur la date du ${enTeteDoc.dateDoc} car cette journée est clôturée.`, 'erreur', 'Journée clôturée');
      setEnTrainDeSauvegarder(false);
      return;
    }

    if (mouvementEnEditionId && !permissions.peut_modifier) { afficherMessage('Action non autorisée : Modification refusée.', 'erreur', 'Permission refusée'); setEnTrainDeSauvegarder(false); return; }
    if (!mouvementEnEditionId && !permissions.peut_creer) { afficherMessage('Action non autorisée : Création refusée.', 'erreur', 'Permission refusée'); setEnTrainDeSauvegarder(false); return; }
    if (!permissions.peut_valider) { afficherMessage('Action non autorisée : Validation refusée.', 'erreur', 'Permission refusée'); setEnTrainDeSauvegarder(false); return; }

    if (!verifierEnTeteAvantSaisie() || lignesPanier.length === 0) { 
      if (lignesPanier.length === 0) afficherMessage('Ajoutez des articles.', 'erreur', 'Panier vide'); 
      setEnTrainDeSauvegarder(false);
      return; 
    }

    try {
      const motifDocumentFinal = (mouvementEnEditionId && numeroDocOriginal) ? numeroDocOriginal : enTeteDoc.numeroDoc;

      if (motifDocumentFinal) {
        nettoyerFileAttenteSync(motifDocumentFinal);
        await supabase
          .from('mouvements_stock')
          .delete()
          .eq('id_entreprise', entrepriseId)
          .eq('module', moduleActuel)
          .eq('motif_remarque', motifDocumentFinal);
      }
      if (enTeteDoc.numeroDoc && enTeteDoc.numeroDoc !== motifDocumentFinal) {
        nettoyerFileAttenteSync(enTeteDoc.numeroDoc);
        await supabase
          .from('mouvements_stock')
          .delete()
          .eq('id_entreprise', entrepriseId)
          .eq('module', moduleActuel)
          .eq('motif_remarque', enTeteDoc.numeroDoc);
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
        const pu = (estModeBoutique && ongletPrincipal === 'ACHATS') ? Number(ligne.prix_unitaire || 0) : 0;
        if (qte <= 0) continue;
        if (!lignesUniquesMap[artId]) lignesUniquesMap[artId] = { designation: ligne.designation, quantite: 0, prix_unitaire: pu };
        lignesUniquesMap[artId].quantite += qte;
      }

      const estTransfertMouvement = ongletPrincipal === 'MOUVEMENTS' && typeOperation === 'TRANSFERT';

      const nettoyerId = (val) => {
        if (!val || val === '' || val === '-' || val === 'null' || val === 'undefined') return null;
        return isNaN(val) ? val : parseInt(val, 10);
      };

      let nouveauxMouvementsAjoutes = [];
      for (const [artId, dataLigne] of Object.entries(lignesUniquesMap)) {
        const typeMvEff = ongletPrincipal === 'ACHATS' ? 'ENTREE' : typeOperation;
        
        const payload = {
          id_entreprise: entrepriseId,
          module: moduleActuel,
          type_mouvement: typeMvEff,
          id_depot_source: nettoyerId(enTeteDoc.id_depot_source),
          id_emplacement_source: (estTransfertMouvement && !estModeBoutique) ? nettoyerId(enTeteDoc.id_emplacement_source) : null,
          id_depot_destination: estTransfertMouvement ? nettoyerId(enTeteDoc.id_depot_destination) : null,
          id_emplacement_destination: (estTransfertMouvement && !estModeBoutique) ? nettoyerId(enTeteDoc.id_emplacement_destination) : null,
          id_article: nettoyerId(artId),
          quantite: Number(dataLigne.quantite || 0),
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
          if (localSync && typeof localSync.ajouterFileAttente === 'function') {
            localSync.ajouterFileAttente('INSERT', 'mouvements_stock', payload);
          } else {
            console.error("Erreur détaillée Supabase mouvements_stock:", error);
            afficherMessage(`Erreur enregistrement : ${error.message || JSON.stringify(error)}`, 'erreur', 'Erreur base de données');
            setEnTrainDeSauvegarder(false);
            return;
          }
        }
      }

      if (ongletPrincipal === 'ACHATS' && estModeBoutique) {
        const creditRestant = resteAVerserFacture;
        const fournisseurCibleId = enTeteDoc.id_fournisseur || enTeteDoc.id_depot_source;
        const nomFournisseurCible = obtenirNomFournisseurParId(enTeteDoc.id_fournisseur) || obtenirNomDepotParId(enTeteDoc.id_depot_source);

        if (creditRestant > 0 && statutReglement !== 'SOLDE' && fournisseurCibleId) {
          try {
            const payloadFinancier = {
              id_entreprise: entrepriseId,
              module: moduleActuel,
              id_partenaire: String(fournisseurCibleId),
              nom_partenaire: nomFournisseurCible !== '-' ? nomFournisseurCible : '',
              type_operation: 'ACHAT_CREDIT',
              montant: creditRestant,
              montant_total: montantTotalFacture,
              montant_paye: Number(montantPayeAchat || 0),
              reste_a_payer: creditRestant,
              reference_doc: motifDocumentFinal,
              reference_facture: referenceSaisie,
              date_operation: dateMvtIso,
              operateur: operateurActuel
            };
            await supabase.from('compte_partenaires').insert([payloadFinancier]);
          } catch (errCompte) {
            console.warn('Insertion compte_partenaires ignorée:', errCompte);
          }

          try {
            if (enTeteDoc.id_fournisseur) {
              const fournObj = fournisseurs.find(f => String(f.id) === String(enTeteDoc.id_fournisseur));
              if (fournObj) {
                const ancienSolde = Number(fournObj.solde || fournObj.dette || fournObj.reste_a_payer || 0);
                const nouveauSolde = ancienSolde + creditRestant;
                const updateFields = {};
                if ('solde' in fournObj) updateFields.solde = nouveauSolde;
                if ('dette' in fournObj) updateFields.dette = nouveauSolde;
                if ('reste_a_payer' in fournObj) updateFields.reste_a_payer = nouveauSolde;

                if (Object.keys(updateFields).length > 0) {
                  await supabase
                    .from('fournisseurs')
                    .update(updateFields)
                    .eq('id', enTeteDoc.id_fournisseur);
                }
              }
            }
          } catch (errFourn) {
            console.warn('Mise à jour solde fournisseur ignorée:', errFourn);
          }
        }
      }

      libererVerrouDoc(motifDocumentFinal);

      const mouvementsFiltres = mouvements.filter(m => m.motif_remarque !== motifDocumentFinal && m.motif_remarque !== enTeteDoc.numeroDoc);
      const listeMaj = [...nouveauxMouvementsAjoutes, ...mouvementsFiltres];
      setMouvements(listeMaj);
      if (localSync && typeof localSync.sauvegarderDonneesLocales === 'function') {
        localSync.sauvegarderDonneesLocales(cleCacheMouvements, listeMaj);
      }
      localStorage.removeItem(cleCacheMouvements);

      afficherMessage(`Document enregistré avec succès par ${operateurActuel} !`, 'succès', 'Succès');
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
        id_emplacement_source: '',
        id_depot_destination: '',
        id_emplacement_destination: '',
        id_fournisseur: '',
        referenceDoc: '', 
        numeroDoc: genererNumeroDocSecurise(typeReset),
        numeroAffichage: '',
        operateur: obtenirNomOperateurConnecte() 
      }));
      await chargerDonnees(true);
      setModeAffichage('LISTE_DOCS');
    } catch (err) { 
      afficherMessage('Erreur : ' + (err?.message || String(err)), 'erreur', 'Erreur système'); 
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const validerDocumentMouvement = () => {
    if (enTrainDeSauvegarder || documentEnLectureSeule) return;
    setEnTrainDeSauvegarder(true);
    setModalConfirmation({
      titre: 'Confirmation de validation',
      texte: `Voulez-vous valider et enregistrer ce document (${enTeteDoc.numeroAffichage || enTeteDoc.numeroDoc}) ?`,
      onConfirm: async () => {
        setModalConfirmation(null);
        await executerValidationDocument();
      },
      onCancel: () => {
        setModalConfirmation(null);
        setEnTrainDeSauvegarder(false);
      }
    });
  };

  const ouvrirDocumentDepuisListe = (numeroDocUnique) => {
    if (enTrainDeSauvegarder) return;

    const lignesAssociees = mouvements.filter(m => m.motif_remarque === numeroDocUnique);
    if (lignesAssociees.length === 0) {
      afficherMessage('Document introuvable dans le cache local.', 'erreur', 'Erreur');
      return;
    }
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

    const depotSourceDoc = premier.id_depot_source || '';
    const fournisseurDoc = premier.id_fournisseur || '';
    const nomDepotDoc = obtenirNomDepotParId(depotSourceDoc).trim().toUpperCase();
    const tiersAssocie = fournisseurs.find(
      f => String(f.id) === String(fournisseurDoc) || String(f.id_depot) === String(depotSourceDoc) || (f.nom_fournisseur || f.nom || '').trim().toUpperCase() === nomDepotDoc
    );

    const nouvelEnTete = { 
      ...enTeteDoc, 
      numeroDoc: numeroDocUnique, 
      numeroAffichage: numeroAffichageEffectif,
      dateDoc: dateDocStr, 
      id_depot_source: depotSourceDoc, 
      id_emplacement_source: premier.id_emplacement_source || '',
      id_depot_destination: premier.id_depot_destination || '', 
      id_emplacement_destination: premier.id_emplacement_destination || '',
      id_fournisseur: fournisseurDoc || (tiersAssocie ? tiersAssocie.id : ''),
      referenceDoc: refEnregistree,
      operateur: operateurDoc
    };

    const mapArticlesAgreges = {};
    lignesAssociees.forEach(mvt => {
      const artId = String(mvt.id_article);
      const art = articles.find((a) => String(a.id_article || a.id) === artId);
      const qte = Number(mvt.quantite || 0);
      const pu = (estAchat && estModeBoutique) ? Number(mvt.prix_unitaire || art?.Prix_Achat || art?.prix_achat || art?.Prix_Vente || art?.prix_vente || 0) : 0;
      
      if (!mapArticlesAgreges[artId]) {
        mapArticlesAgreges[artId] = {
          id_article: artId,
          designation: art ? (art.Designation || art.designation) : `Article #${mvt.id_article}`,
          quantite: 0,
          prix_unitaire: pu,
          montant_total: 0,
          stockActuel: 0,
          stockReel: 0
        };
      }
      mapArticlesAgreges[artId].quantite += qte;
      mapArticlesAgreges[artId].montant_total = mapArticlesAgreges[artId].quantite * mapArticlesAgreges[artId].prix_unitaire;
      mapArticlesAgreges[artId].stockReel = mapArticlesAgreges[artId].quantite;
    });

    const nouvellesLignes = Object.values(mapArticlesAgreges);

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

    acquerirVerrouDoc(numeroDocUnique).catch(() => {});
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
      const partenaireNomDoc = (doc.partenaireNom || '').toUpperCase();
      const depotCibleObj = depots.find(d => String(d.id) === String(filtrePartenaire));
      const depotCibleNom = depotCibleObj ? (depotCibleObj.nom_depot || depotCibleObj.nom || '').toUpperCase() : filtrePartenaire.toUpperCase();
      if (!partenaireNomDoc.includes(depotCibleNom)) return false;
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

  const nomPartenaireSelectionne = obtenirNomFournisseurParId(enTeteDoc.id_fournisseur) || (obtenirNomDepotParId(enTeteDoc.id_depot_source) !== '-' ? obtenirNomDepotParId(enTeteDoc.id_depot_source) : '');

  if (ongletPrincipal === null) {
    return (
      <div className="space-y-4 font-sans text-xs p-3 max-w-2xl mx-auto">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center space-y-1.5">
          <h2 className="text-sm font-black uppercase text-slate-900 tracking-wider">
            📦 GESTION DU STOCK
          </h2>
          <p className="text-xs text-slate-500 font-bold">
            Sélectionnez l'opération que vous souhaitez effectuer :
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div 
            onClick={basculerVersAchats}
            className="bg-white p-5 rounded-2xl border-2 border-emerald-500/40 hover:border-emerald-500 hover:bg-emerald-50/20 transition cursor-pointer shadow-sm flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-2.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl font-black group-hover:scale-105 transition">
                🛒
              </div>
              <h3 className="font-black text-sm uppercase text-emerald-900">
                Achat
              </h3>
              <p className="text-xs font-medium text-slate-600 leading-relaxed">
                {estModeBoutique
                  ? "Permet d'enregistrer les entrées de stock issues des fournisseurs vers un dépôt."
                  : "Permet d'enregistrer les entrées de stock directement dans le dépôt du partenaire."}
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-emerald-700 font-black text-xs">
              <span>Ouvrir</span>
              <span>→</span>
            </div>
          </div>

          <div 
            onClick={basculerVersMouvements}
            className="bg-white p-5 rounded-2xl border-2 border-orange-500/40 hover:border-orange-500 hover:bg-orange-50/20 transition cursor-pointer shadow-sm flex flex-col justify-between space-y-4 group"
          >
            <div className="space-y-2.5">
              <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center text-xl font-black group-hover:scale-105 transition">
                🔀
              </div>
              <h3 className="font-black text-sm uppercase text-orange-900">
                Gestion des Mouvements
              </h3>
              <p className="text-xs font-medium text-slate-600 leading-relaxed">
                Permet d'effectuer des transferts, des sorties, des avaries ou des inventaires.
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-orange-700 font-black text-xs">
              <span>Ouvrir</span>
              <span>→</span>
            </div>
          </div>
        </div>

        {modalMessage && (
          <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-6 space-y-4 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 text-orange-600 text-xl font-black">
                {modalMessage.type === 'erreur' ? '⚠️' : 'ℹ️'}
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-slate-900 text-sm uppercase">{modalMessage.titre}</h3>
                <p className="text-slate-600 font-medium text-xs leading-relaxed">{modalMessage.texte}</p>
              </div>
              <button
                type="button"
                onClick={() => setModalMessage(null)}
                className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase rounded-xl transition shadow-md"
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
    <div className="space-y-2 font-sans text-xs max-w-5xl mx-auto p-1">
      
      {/* 1. BARRE DE NAVIGATION SUPÉRIEURE */}
      <div className="bg-slate-900 text-white px-3 py-2 rounded-xl shadow-md flex flex-nowrap justify-between items-center gap-2 overflow-x-auto whitespace-nowrap">
        <div className="flex items-center gap-2 shrink-0">
          <button 
            type="button" 
            onClick={() => {
              if (numeroDocOriginal) {
                libererVerrouDoc(numeroDocOriginal);
              }
              setOngletPrincipal(null);
            }} 
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-black text-xs transition cursor-pointer flex items-center gap-1 border border-slate-700"
          >
            <span>←</span> Accueil
          </button>
          
          <span className={`px-2 py-1 rounded-lg font-black text-xs uppercase ${ongletPrincipal === 'ACHATS' ? 'bg-emerald-600 text-white' : 'bg-orange-600 text-white'}`}>
            {ongletPrincipal === 'ACHATS' ? 'ACHAT' : 'MOUVEMENT'}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button 
            type="button" 
            disabled={enTrainDeSauvegarder} 
            onClick={() => { 
              if (enTrainDeSauvegarder) return;
              if (numeroDocOriginal) {
                libererVerrouDoc(numeroDocOriginal);
              }
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
              setEnTeteDoc(prev => ({ ...prev, id_depot_source: '', id_emplacement_source: '', id_depot_destination: '', id_emplacement_destination: '', id_fournisseur: '', referenceDoc: '', numeroDoc: genererNumeroDocSecurise(typeCible), numeroAffichage: '', operateur: obtenirNomOperateurConnecte() })); 
            }} 
            className={`py-1 px-3 rounded-lg font-black transition text-xs uppercase cursor-pointer flex items-center gap-1 ${
              modeAffichage === 'SAISIE' 
                ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-md' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <span>✏️</span> Saisie
          </button>

          <button 
            type="button" 
            disabled={enTrainDeSauvegarder} 
            onClick={() => { 
              if (!enTrainDeSauvegarder) {
                if (numeroDocOriginal) {
                  libererVerrouDoc(numeroDocOriginal);
                }
                setNumeroDocOriginal(null);
                setMouvementEnEditionId(null);
                setModeAffichage('LISTE_DOCS');
              }
            }} 
            className={`py-1 px-3 rounded-lg font-black transition text-xs uppercase cursor-pointer flex items-center gap-1 ${
              modeAffichage === 'LISTE_DOCS' 
                ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-md' 
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
            }`}
          >
            <span>📜</span> Liste ({documentsFiltresParCriteres.length})
          </button>
        </div>
      </div>

      {modeAffichage === 'SAISIE' && (
        <div className="space-y-2">
          {documentEnLectureSeule && (
            <div className="bg-amber-50 border-2 border-amber-300 text-amber-900 p-2 rounded-xl text-center font-black text-xs uppercase shadow-xs">
              🔒 DOCUMENT EN CONSULTATION SEULE (Journée clôturée)
            </div>
          )}

          {modalTypeMouvementOuvert && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-5">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-2">
                    <span>🔀</span> SÉLECTIONNER LE TYPE DE MOUVEMENT
                  </h4>
                  <button type="button" onClick={() => setModalTypeMouvementOuvert(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm p-1">✕</button>
                </div>
                
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {[
                    { id: 'TRANSFERT', libelle: 'TRANSFERT', icone: '🔀' },
                    { id: 'ENTREE_STOCK', libelle: 'ENTRÉE EN STOCK', icone: '📥' },
                    { id: 'SORTIE', libelle: 'SORTIE DE STOCK', icone: '📤' },
                    { id: 'AVARIES', libelle: 'AVARIES & PERTES', icone: '⚠️' },
                    { id: 'INVENTAIRE', libelle: 'INVENTAIRE', icone: '📊' }
                  ].map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => {
                        if (mouvementEnEditionId) return;
                        setTypeOperation(item.id);
                        setEnTeteDoc(prev => ({ 
                          ...prev, 
                          id_depot_source: '', 
                          id_emplacement_source: '', 
                          id_depot_destination: '', 
                          id_emplacement_destination: '', 
                          id_fournisseur: '',
                          numeroDoc: genererNumeroDocSecurise(item.id), 
                          numeroAffichage: '', 
                          operateur: obtenirNomOperateurConnecte() 
                        }));
                        setModalTypeMouvementOuvert(false);
                      }} 
                      className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between shadow-2xs ${
                        typeOperation === item.id ? 'bg-orange-50 border-orange-500 text-orange-900' : 'bg-white border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{item.icone}</span>
                        <div>
                          <span className="font-black text-xs uppercase block">{item.libelle}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{descriptionsTypesMouvement[item.id]}</span>
                        </div>
                      </div>
                      {typeOperation === item.id && <span className="text-orange-600 font-black text-sm">✓</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. CARTE D'EN-TÊTE DOCUMENT AVEC TITRE MODIFIÉ EN "ACHAT" */}
          <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm space-y-2">
            <div className="flex justify-between items-center pb-1.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {ongletPrincipal === 'MOUVEMENTS' ? (
                  <button
                    type="button"
                    disabled={enTeteVerrouille || !!mouvementEnEditionId}
                    onClick={() => setModalTypeMouvementOuvert(true)}
                    className="bg-orange-50 hover:bg-orange-100 border border-orange-300 text-orange-800 px-2.5 py-1 rounded-lg font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer disabled:opacity-70 transition shadow-2xs"
                  >
                    <span>🔀 {libellesTypesMouvement[typeOperation]}</span>
                    <span>▼</span>
                  </button>
                ) : (
                  <h4 className="font-black text-xs uppercase text-slate-900 flex items-center gap-1.5">
                    <span>ACHAT</span>
                  </h4>
                )}

                {/* USER INSÉRÉ JUSTE APRÈS ACHAT / TYPE */}
                <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded-lg font-black text-[11px] uppercase shadow-2xs flex items-center gap-1" title="Opérateur connecté">
                  <span>👤</span> {enTeteDoc.operateur || obtenirNomOperateurConnecte()}
                </span>
              </div>

              <span className="bg-orange-50 text-orange-600 border border-orange-200 px-2.5 py-0.5 rounded-lg font-mono font-black text-xs shadow-2xs" title={enTeteDoc.numeroDoc}>
                {enTeteDoc.numeroAffichage || (documentsGroupes.find(d => String(d.numeroDocBrut) === String(enTeteDoc.numeroDoc))?.numeroDoc) || `${ongletPrincipal === 'ACHATS' ? 'APP' : (typeOperation === 'ENTREE_STOCK' ? 'ES' : typeOperation === 'SORTIE' ? 'MS' : typeOperation === 'AVARIES' ? 'AV' : typeOperation === 'INVENTAIRE' ? 'INV' : 'TR')}-01`}
              </span>
            </div>

            {/* Structure spécifique selon s'il s'agit d'un Transfert, d'un Achat ou d'un autre mouvement */}
            {(ongletPrincipal === 'MOUVEMENTS' && typeOperation === 'TRANSFERT') ? (
              <div className="space-y-2">
                {estModeBoutique ? (
                  /* Transfert en mode Boutique : Date, Dépôt départ, Dépôt arrivée, Motif (pas de partenaire, pas de livreur) */
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <input 
                          type="date" 
                          disabled={documentEnLectureSeule} 
                          value={enTeteDoc.dateDoc} 
                          onChange={(e) => setEnTeteDoc({ ...enTeteDoc, dateDoc: e.target.value })} 
                          className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-xs shadow-2xs focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:opacity-70 cursor-pointer" 
                        />
                      </div>
                      <div>
                        <input 
                          type="text" 
                          disabled={documentEnLectureSeule} 
                          value={enTeteDoc.referenceDoc} 
                          placeholder="Motif / Référence..."
                          onChange={(e) => setEnTeteDoc({ ...enTeteDoc, referenceDoc: e.target.value })} 
                          className="w-full bg-white border border-slate-300 rounded-xl p-2 font-extrabold uppercase text-slate-900 text-xs shadow-2xs focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:opacity-70" 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <button 
                          type="button"
                          disabled={enTeteVerrouille}
                          onClick={() => { setRechercheModalPopup(''); setModalDepotSourceOuvert(true); }}
                          className="w-full bg-white border border-orange-400 rounded-xl p-2 text-left font-extrabold text-orange-700 text-xs flex justify-between items-center shadow-2xs hover:bg-orange-50/50 transition cursor-pointer disabled:opacity-70"
                        >
                          <span className="truncate">🏢 Dépôt Départ : {enTeteDoc.id_depot_source ? obtenirNomDepotParId(enTeteDoc.id_depot_source) : 'Sélectionner *'}</span>
                          <span className="shrink-0 ml-1 text-orange-600">🔍</span>
                        </button>
                      </div>
                      <div>
                        <button 
                          type="button"
                          disabled={enTeteVerrouille}
                          onClick={() => { setRechercheModalPopup(''); setModalDepotDestOuvert(true); }}
                          className="w-full bg-white border border-blue-400 rounded-xl p-2 text-left font-extrabold text-blue-700 text-xs flex justify-between items-center shadow-2xs hover:bg-blue-50/50 transition cursor-pointer disabled:opacity-70"
                        >
                          <span className="truncate">🎯 Dépôt Arrivée : {enTeteDoc.id_depot_destination ? obtenirNomDepotParId(enTeteDoc.id_depot_destination) : 'Sélectionner *'}</span>
                          <span className="shrink-0 ml-1 text-blue-600">🔍</span>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Transfert en mode Livraison (Complet avec partenaires/livreurs) */
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <input 
                          type="date" 
                          disabled={documentEnLectureSeule} 
                          value={enTeteDoc.dateDoc} 
                          onChange={(e) => setEnTeteDoc({ ...enTeteDoc, dateDoc: e.target.value })} 
                          className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-xs shadow-2xs focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:opacity-70 cursor-pointer" 
                        />
                      </div>
                      <div>
                        <input 
                          type="text" 
                          disabled={documentEnLectureSeule} 
                          value={enTeteDoc.referenceDoc} 
                          placeholder="Motif / Référence..."
                          onChange={(e) => setEnTeteDoc({ ...enTeteDoc, referenceDoc: e.target.value })} 
                          className="w-full bg-white border border-slate-300 rounded-xl p-2 font-extrabold uppercase text-slate-900 text-xs shadow-2xs focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:opacity-70" 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <button 
                          type="button"
                          disabled={enTeteVerrouille}
                          onClick={() => { setRechercheModalPopup(''); setModalDepotSourceOuvert(true); }}
                          className="w-full bg-white border border-orange-400 rounded-xl p-2 text-left font-extrabold text-orange-700 text-xs flex justify-between items-center shadow-2xs hover:bg-orange-50/50 transition cursor-pointer disabled:opacity-70"
                        >
                          <span className="truncate">🏢 Départ Partenaire : {enTeteDoc.id_depot_source ? obtenirNomDepotParId(enTeteDoc.id_depot_source) : 'Sélectionner *'}</span>
                          <span className="shrink-0 ml-1 text-orange-600">🔍</span>
                        </button>
                      </div>
                      <div>
                        <button 
                          type="button"
                          disabled={enTeteVerrouille}
                          onClick={() => { setRechercheModalPopup(''); setModalLivreurSourceOuvert(true); }}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2 text-left font-extrabold text-slate-800 text-xs flex justify-between items-center shadow-2xs hover:bg-slate-50 transition cursor-pointer disabled:opacity-70"
                        >
                          <span className="truncate">🛵 Départ Livreur : {enTeteDoc.id_emplacement_source ? obtenirNomEmplacementParId(enTeteDoc.id_emplacement_source) : 'Aucun (Optionnel)'}</span>
                          <span className="shrink-0 ml-1 text-slate-600">🔍</span>
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <button 
                          type="button"
                          disabled={enTeteVerrouille}
                          onClick={() => { setRechercheModalPopup(''); setModalDepotDestOuvert(true); }}
                          className="w-full bg-white border border-blue-400 rounded-xl p-2 text-left font-extrabold text-blue-700 text-xs flex justify-between items-center shadow-2xs hover:bg-blue-50/50 transition cursor-pointer disabled:opacity-70"
                        >
                          <span className="truncate">🎯 Arrivée Partenaire : {enTeteDoc.id_depot_destination ? obtenirNomDepotParId(enTeteDoc.id_depot_destination) : 'Sélectionner *'}</span>
                          <span className="shrink-0 ml-1 text-blue-600">🔍</span>
                        </button>
                      </div>
                      <div>
                        <button 
                          type="button"
                          disabled={enTeteVerrouille}
                          onClick={() => { setRechercheModalPopup(''); setModalLivreurDestOuvert(true); }}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2 text-left font-extrabold text-slate-800 text-xs flex justify-between items-center shadow-2xs hover:bg-slate-50 transition cursor-pointer disabled:opacity-70"
                        >
                          <span className="truncate">🛵 Arrivée Livreur : {enTeteDoc.id_emplacement_destination ? obtenirNomEmplacementParId(enTeteDoc.id_emplacement_destination) : 'Aucun (Optionnel)'}</span>
                          <span className="shrink-0 ml-1 text-slate-600">🔍</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : ongletPrincipal === 'ACHATS' ? (
              <div className="space-y-2">
                {estModeBoutique ? (
                  /* Module Boutique : Date, Fournisseur et Dépôt sur la même ligne */
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <input 
                        type="date" 
                        disabled={documentEnLectureSeule} 
                        value={enTeteDoc.dateDoc} 
                        onChange={(e) => setEnTeteDoc({ ...enTeteDoc, dateDoc: e.target.value })} 
                        className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-xs shadow-2xs focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:opacity-70 cursor-pointer" 
                      />
                    </div>
                    <div>
                      <button 
                        type="button"
                        disabled={enTeteVerrouille}
                        onClick={() => { setRechercheModalPopup(''); setModalFournisseurOuvert(true); }}
                        className="w-full bg-white border border-emerald-400 rounded-xl p-2 text-left font-extrabold text-emerald-800 text-xs flex justify-between items-center shadow-2xs hover:bg-emerald-50/50 transition cursor-pointer disabled:opacity-70"
                      >
                        <span className="truncate">🤝 {obtenirNomFournisseurParId(enTeteDoc.id_fournisseur) || 'FOURNISSEUR *'}</span>
                        <span className="shrink-0 ml-1 text-emerald-600">🔍</span>
                      </button>
                    </div>
                    <div>
                      <button 
                        type="button"
                        disabled={enTeteVerrouille}
                        onClick={() => { setRechercheModalPopup(''); setModalDepotSourceOuvert(true); }}
                        className="w-full bg-white border border-orange-400 rounded-xl p-2 text-left font-extrabold text-orange-600 text-xs flex justify-between items-center shadow-2xs hover:bg-orange-50/50 transition cursor-pointer disabled:opacity-70"
                      >
                        <span className="truncate">🏢 {obtenirNomDepotParId(enTeteDoc.id_depot_source) !== '-' ? obtenirNomDepotParId(enTeteDoc.id_depot_source) : 'DÉPÔT *'}</span>
                        <span className="shrink-0 ml-1 text-orange-600">🔍</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Module Livraison : Date, Partenaire et Motif sur la même ligne (Pas de dépôt) */
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <input 
                        type="date" 
                        disabled={documentEnLectureSeule} 
                        value={enTeteDoc.dateDoc} 
                        onChange={(e) => setEnTeteDoc({ ...enTeteDoc, dateDoc: e.target.value })} 
                        className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-xs shadow-2xs focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:opacity-70 cursor-pointer" 
                      />
                    </div>
                    <div>
                      <button 
                        type="button"
                        disabled={enTeteVerrouille}
                        onClick={() => { setRechercheModalPopup(''); setModalFournisseurOuvert(true); }}
                        className="w-full bg-white border border-emerald-400 rounded-xl p-2 text-left font-extrabold text-emerald-800 text-xs flex justify-between items-center shadow-2xs hover:bg-emerald-50/50 transition cursor-pointer disabled:opacity-70"
                      >
                        <span className="truncate">🤝 {nomPartenaireSelectionne || 'PARTENAIRE *'}</span>
                        <span className="shrink-0 ml-1 text-emerald-600">🔍</span>
                      </button>
                    </div>
                    <div>
                      <input 
                        type="text" 
                        disabled={documentEnLectureSeule} 
                        value={enTeteDoc.referenceDoc} 
                        placeholder="MOTIF / RÉFÉRENCE..."
                        onChange={(e) => setEnTeteDoc({ ...enTeteDoc, referenceDoc: e.target.value })} 
                        className="w-full bg-white border border-slate-300 rounded-xl p-2 font-extrabold uppercase text-slate-900 text-xs shadow-2xs focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:opacity-70" 
                      />
                    </div>
                  </div>
                )}
                {estModeBoutique && (
                  <div>
                    <input 
                      type="text" 
                      disabled={documentEnLectureSeule} 
                      value={enTeteDoc.referenceDoc} 
                      placeholder="Ex: FACT-2026-089 ou BL-004..."
                      onChange={(e) => setEnTeteDoc({ ...enTeteDoc, referenceDoc: e.target.value })} 
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 font-extrabold uppercase text-slate-900 text-xs shadow-2xs focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:opacity-70" 
                    />
                  </div>
                )}
              </div>
            ) : (
              /* Pour Entrée en stock, Sortie, Avaries et Inventaire : Date, Dépôt et Motif sur la même ligne */
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <input 
                    type="date" 
                    disabled={documentEnLectureSeule} 
                    value={enTeteDoc.dateDoc} 
                    onChange={(e) => setEnTeteDoc({ ...enTeteDoc, dateDoc: e.target.value })} 
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-xs shadow-2xs focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:opacity-70 cursor-pointer" 
                  />
                </div>
                <div>
                  <button 
                    type="button"
                    disabled={enTeteVerrouille}
                    onClick={() => { setRechercheModalPopup(''); setModalDepotSourceOuvert(true); }}
                    className="w-full bg-white border border-orange-400 rounded-xl p-2 text-left font-extrabold text-orange-700 text-xs flex justify-between items-center shadow-2xs hover:bg-orange-50/50 transition cursor-pointer disabled:opacity-70"
                  >
                    <span className="truncate">🏢 {enTeteDoc.id_depot_source ? obtenirNomDepotParId(enTeteDoc.id_depot_source) : (estModeBoutique ? 'DÉPÔT *' : 'PARTENAIRE *')}</span>
                    <span className="shrink-0 ml-1 text-orange-600">🔍</span>
                  </button>
                </div>
                <div>
                  <input 
                    type="text" 
                    disabled={documentEnLectureSeule} 
                    value={enTeteDoc.referenceDoc} 
                    placeholder="Motif / Référence..."
                    onChange={(e) => setEnTeteDoc({ ...enTeteDoc, referenceDoc: e.target.value })} 
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 font-extrabold uppercase text-slate-900 text-xs shadow-2xs focus:ring-2 focus:ring-orange-500 focus:outline-none disabled:opacity-70" 
                  />
                </div>
              </div>
            )}
          </div>

          {modalFournisseurOuvert && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-5">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-2"><span>🤝</span> SÉLECTIONNER LE {libelleTiers.toUpperCase()}</h4>
                  <button type="button" onClick={() => setModalFournisseurOuvert(false)} className="text-slate-400 font-black text-sm p-1">✕</button>
                </div>
                <div>
                  <input type="text" value={rechercheModalPopup} onChange={(e) => setRechercheModalPopup(e.target.value.toUpperCase())} placeholder="RECHERCHER..." autoFocus className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-black text-slate-900 uppercase text-xs" />
                </div>
                <div className="max-h-[350px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
                  {fournisseurs.filter(f => (f.nom_fournisseur || f.nom || '').toUpperCase().includes(rechercheModalPopup)).length === 0 ? (
                    <div className="col-span-2 py-4 text-center text-slate-400 font-bold text-xs">
                      Aucun {libelleTiers.toLowerCase()} trouvé.
                    </div>
                  ) : (
                    fournisseurs.filter(f => (f.nom_fournisseur || f.nom || '').toUpperCase().includes(rechercheModalPopup)).map((f) => {
                      const nomF = (f.nom_fournisseur || f.nom || '').trim().toUpperCase();
                      const depotAssocie = depots.find(d => (d.nom_depot || '').trim().toUpperCase() === nomF || String(d.id) === String(f.id_depot));
                      return (
                        <div key={f.id} onClick={() => { 
                          setEnTeteDoc(prev => ({ 
                            ...prev, 
                            id_fournisseur: f.id,
                            id_depot_source: depotAssocie ? depotAssocie.id : (!estModeBoutique ? (depotAssocie?.id || prev.id_depot_source) : prev.id_depot_source)
                          })); 
                          setModalFournisseurOuvert(false); 
                        }} className="p-3.5 rounded-xl border border-slate-200 hover:bg-emerald-50 cursor-pointer flex flex-col justify-between shadow-2xs">
                          <span className="font-black text-xs text-slate-900 uppercase truncate">{f.nom_fournisseur || f.nom}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {modalDepotSourceOuvert && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-5">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-2"><span>🏢</span> SÉLECTIONNER LE DÉPÔT / PARTENAIRE</h4>
                  <button type="button" onClick={() => setModalDepotSourceOuvert(false)} className="text-slate-400 font-black text-sm p-1">✕</button>
                </div>
                <div>
                  <input type="text" value={rechercheModalPopup} onChange={(e) => setRechercheModalPopup(e.target.value.toUpperCase())} placeholder="RECHERCHER..." autoFocus className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-black text-slate-900 uppercase text-xs" />
                </div>
                <div className="max-h-[350px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
                  {depots.filter(d => (d.nom_depot || '').toUpperCase().includes(rechercheModalPopup)).map((dep) => (
                    <div key={dep.id} onClick={() => { 
                      setEnTeteDoc(prev => ({ 
                        ...prev, 
                        id_depot_source: dep.id,
                        id_depot_destination: (typeOperation === 'TRANSFERT' && (!prev.id_depot_destination || prev.id_depot_destination === prev.id_depot_source)) ? dep.id : prev.id_depot_destination
                      })); 
                      setModalDepotSourceOuvert(false); 
                    }} className="p-3.5 rounded-xl border border-slate-200 hover:bg-orange-50 cursor-pointer flex flex-col justify-between shadow-2xs">
                      <span className="font-black text-xs text-slate-900 uppercase truncate">{dep.nom_depot}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {modalDepotDestOuvert && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-5">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-2"><span>🎯</span> SÉLECTIONNER LA DESTINATION</h4>
                  <button type="button" onClick={() => setModalDepotDestOuvert(false)} className="text-slate-400 font-black text-sm p-1">✕</button>
                </div>
                <div>
                  <input type="text" value={rechercheModalPopup} onChange={(e) => setRechercheModalPopup(e.target.value.toUpperCase())} placeholder="RECHERCHER..." autoFocus className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-black text-slate-900 uppercase text-xs" />
                </div>
                <div className="max-h-[350px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
                  {depots.filter(d => (d.nom_depot || '').toUpperCase().includes(rechercheModalPopup)).map((dep) => (
                    <div key={dep.id} onClick={() => { setEnTeteDoc(prev => ({ ...prev, id_depot_destination: dep.id })); setModalDepotDestOuvert(false); }} className="p-3.5 rounded-xl border border-slate-200 hover:bg-orange-50 cursor-pointer flex flex-col justify-between shadow-2xs">
                      <span className="font-black text-xs text-slate-900 uppercase truncate">{dep.nom_depot}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {modalLivreurSourceOuvert && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-5">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-2"><span>🛵</span> SÉLECTIONNER LE {libelleLivreur.toUpperCase()} DÉPART</h4>
                  <button type="button" onClick={() => setModalLivreurSourceOuvert(false)} className="text-slate-400 font-black text-sm p-1">✕</button>
                </div>
                <div>
                  <input type="text" value={rechercheModalPopup} onChange={(e) => setRechercheModalPopup(e.target.value.toUpperCase())} placeholder="RECHERCHER..." autoFocus className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-black text-slate-900 uppercase text-xs" />
                </div>
                <div className="max-h-[350px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
                  <div onClick={() => { setEnTeteDoc(prev => ({ ...prev, id_emplacement_source: '' })); setModalLivreurSourceOuvert(false); }} className="col-span-2 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer font-bold text-slate-500 text-xs text-center">Aucun (Optionnel)</div>
                  {emplacements.filter(e => (e.nom_emplacement || e.code_emplacement || '').toUpperCase().includes(rechercheModalPopup)).map((emp) => (
                    <div key={emp.id} onClick={() => { setEnTeteDoc(prev => ({ ...prev, id_emplacement_source: emp.id })); setModalLivreurSourceOuvert(false); }} className="p-3.5 rounded-xl border border-slate-200 hover:bg-orange-50 cursor-pointer flex flex-col justify-between shadow-2xs">
                      <span className="font-black text-xs text-slate-900 uppercase truncate">{emp.nom_emplacement || emp.code_emplacement}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {modalLivreurDestOuvert && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-5">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-2"><span>🛵</span> SÉLECTIONNER LE {libelleLivreur.toUpperCase()} ARRIVÉE</h4>
                  <button type="button" onClick={() => setModalLivreurDestOuvert(false)} className="text-slate-400 font-black text-sm p-1">✕</button>
                </div>
                <div>
                  <input type="text" value={rechercheModalPopup} onChange={(e) => setRechercheModalPopup(e.target.value.toUpperCase())} placeholder="RECHERCHER..." autoFocus className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-black text-slate-900 uppercase text-xs" />
                </div>
                <div className="max-h-[350px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
                  <div onClick={() => { setEnTeteDoc(prev => ({ ...prev, id_emplacement_destination: '' })); setModalLivreurDestOuvert(false); }} className="col-span-2 p-3.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer font-bold text-slate-500 text-xs text-center">Aucun (Optionnel)</div>
                  {emplacements.filter(e => (e.nom_emplacement || e.code_emplacement || '').toUpperCase().includes(rechercheModalPopup)).map((emp) => (
                    <div key={emp.id} onClick={() => { setEnTeteDoc(prev => ({ ...prev, id_emplacement_destination: emp.id })); setModalLivreurDestOuvert(false); }} className="p-3.5 rounded-xl border border-slate-200 hover:bg-orange-50 cursor-pointer flex flex-col justify-between shadow-2xs">
                      <span className="font-black text-xs text-slate-900 uppercase truncate">{emp.nom_emplacement || emp.code_emplacement}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 3. CARTE D'AJOUT D'ARTICLE */}
          {!documentEnLectureSeule && (
            <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm">
              {ongletPrincipal === 'ACHATS' && estModeBoutique ? (
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 sm:col-span-5">
                    <label className="block font-black text-[10px] text-slate-700 uppercase mb-1">ARTICLE À AJOUTER*</label>
                    <button ref={boutonSelectionArticleRef} type="button" disabled={enTrainDeSauvegarder} onClick={() => { if (enTrainDeSauvegarder) return; if (!verifierEnTeteAvantSaisie()) return; setModalArticleOuvert(true); }} className="w-full bg-white border border-orange-400 rounded-xl p-2 text-left font-extrabold text-orange-600 text-xs flex justify-between items-center shadow-2xs hover:bg-orange-50/35 transition cursor-pointer">
                      <span className="truncate">{articleSelectionneTemp ? `${articleSelectionneTemp.Designation || articleSelectionneTemp.designation}` : '🔍 CHOISIR UN ARTICLE...'}</span>
                      <span className="shrink-0 ml-1">▼</span>
                    </button>
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <label className="block font-black text-[10px] text-slate-700 uppercase mb-1">QTÉ*</label>
                    <input 
                      ref={inputQuantiteRef} 
                      type="number" 
                      min="1" 
                      value={quantiteSaisie} 
                      disabled={enTrainDeSauvegarder}
                      onFocus={(e) => e.target.select()} 
                      onChange={(e) => setQuantiteSaisie(e.target.value)} 
                      onKeyDown={gererKeyDownQuantite}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 font-black text-slate-900 text-center text-xs shadow-2xs focus:ring-2 focus:ring-orange-500 focus:outline-none" 
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-2">
                    <label className="block font-black text-[10px] text-slate-700 uppercase mb-1">P.U.*</label>
                    <input 
                      ref={inputPrixRef}
                      type="number" 
                      min="0" 
                      value={prixUnitaireSaisi} 
                      disabled={enTrainDeSauvegarder}
                      onFocus={(e) => e.target.select()} 
                      onChange={(e) => setPrixUnitaireSaisi(e.target.value)} 
                      onKeyDown={gererKeyDownPrix}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 font-black text-slate-900 text-center text-xs shadow-2xs focus:ring-2 focus:ring-orange-500 focus:outline-none" 
                    />
                  </div>

                  <div className="col-span-4 sm:col-span-3">
                    <button 
                      type="button" 
                      disabled={enTrainDeSauvegarder || enTrainDInsertion || (!permissions.peut_creer && !mouvementEnEditionId)} 
                      onClick={ajouterArticleAuPanier} 
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black p-2 rounded-xl text-center text-xs uppercase shadow-md transition cursor-pointer"
                    >
                      {enTrainDInsertion ? '...' : '+ AJOUTER'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 sm:col-span-7">
                    <label className="block font-black text-[10px] text-slate-700 uppercase mb-1">ARTICLE À AJOUTER*</label>
                    <button ref={boutonSelectionArticleRef} type="button" disabled={enTrainDeSauvegarder} onClick={() => { if (enTrainDeSauvegarder) return; if (!verifierEnTeteAvantSaisie()) return; setModalArticleOuvert(true); }} className="w-full bg-white border border-orange-400 rounded-xl p-2 text-left font-extrabold text-orange-600 text-xs flex justify-between items-center shadow-2xs hover:bg-orange-50/35 transition cursor-pointer">
                      <span className="truncate">{articleSelectionneTemp ? `${articleSelectionneTemp.Designation || articleSelectionneTemp.designation}` : '🔍 CHOISIR UN ARTICLE...'}</span>
                      <span className="shrink-0 ml-1">▼</span>
                    </button>
                  </div>
                  
                  <div className="col-span-6 sm:col-span-2">
                    <label className="block font-black text-[10px] text-slate-700 uppercase mb-1">QTÉ*</label>
                    <input 
                      ref={inputQuantiteRef} 
                      type="number" 
                      min="1" 
                      value={quantiteSaisie} 
                      disabled={enTrainDeSauvegarder}
                      onFocus={(e) => e.target.select()} 
                      onChange={(e) => setQuantiteSaisie(e.target.value)} 
                      onKeyDown={gererKeyDownQuantite}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 font-black text-slate-900 text-center text-xs shadow-2xs focus:ring-2 focus:ring-orange-500 focus:outline-none" 
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <button 
                      type="button" 
                      disabled={enTrainDeSauvegarder || enTrainDInsertion || (!permissions.peut_creer && !mouvementEnEditionId)} 
                      onClick={ajouterArticleAuPanier} 
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black p-2 rounded-xl text-center text-xs uppercase shadow-md transition cursor-pointer"
                    >
                      {enTrainDInsertion ? '...' : '+ AJOUTER'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {modalArticleOuvert && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-5">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-2"><span>🔍</span> SÉLECTIONNER UN ARTICLE</h4>
                  <button type="button" onClick={() => setModalArticleOuvert(false)} className="text-slate-400 font-black text-sm p-1">✕</button>
                </div>
                <div>
                  <input type="text" value={recherchePopup} onChange={(e) => setRecherchePopup(e.target.value.toUpperCase())} placeholder="RECHERCHER UN ARTICLE..." autoFocus className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-black text-slate-900 uppercase text-xs" />
                </div>
                <div className="max-h-[350px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
                  {articlesPopupFiltres.length === 0 ? (
                    <div className="col-span-2 py-6 text-center text-slate-400 font-bold italic text-xs">Aucun article trouvé.</div>
                  ) : (
                    articlesPopupFiltres.map((art) => {
                      const artId = art.id_article || art.id;
                      const stockActuel = calculerStockPourDepotActuel(artId);
                      const estEpuise = stockActuel <= 0 && ongletPrincipal !== 'ACHATS';
                      return (
                        <div key={artId} onClick={() => !enTrainDeSauvegarder && selectionnerArticleEtFocusQte(art)} className={`p-3.5 rounded-xl border transition cursor-pointer flex flex-col justify-between shadow-2xs ${estEpuise ? 'bg-slate-100 opacity-60' : 'bg-white hover:border-orange-500'}`}>
                          <span className="font-black text-xs text-slate-900 uppercase truncate">{art.Designation || art.designation}</span>
                          <span className="font-black text-xs mt-1 text-slate-700">Stock : <strong className={stockActuel <= 0 ? 'text-rose-600' : 'text-emerald-700'}>{stockActuel}</strong></span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 4. CARTE TABLEAU & TOTAUX */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm space-y-2.5 p-3">
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              {ongletPrincipal === 'ACHATS' && estModeBoutique ? (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      <th className="p-2.5 w-[8%] text-center">#</th>
                      <th className="p-2.5 w-[42%]">DÉSIGNATION</th>
                      <th className="p-2.5 w-[15%] text-center">QTÉ</th>
                      <th className="p-2.5 w-[15%] text-right">P.U.</th>
                      <th className="p-2.5 w-[20%] text-right">TOTAL</th>
                      {!documentEnLectureSeule && <th className="p-2.5 w-[10%] text-center">ACT</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-900">
                    {lignesPanier.length === 0 ? (
                      <tr>
                        <td colSpan={documentEnLectureSeule ? 5 : 6} className="p-6 text-center text-slate-400 font-medium italic">
                          Aucun article ajouté.
                        </td>
                      </tr>
                    ) : (
                      lignesPanier.map((ligne, index) => (
                        <tr key={index} onClick={() => !documentEnLectureSeule && !enTrainDeSauvegarder && modifierLignePanier(ligne)} className={!documentEnLectureSeule ? "hover:bg-orange-50/70 cursor-pointer transition" : "transition"}>
                          <td className="p-2.5 text-center text-slate-500">{index + 1}</td>
                          <td className="p-2.5 font-black uppercase text-slate-900 truncate">{ligne.designation}</td>
                          <td className="p-2.5 text-center font-black text-emerald-600">{ligne.quantite}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-slate-700">{Number(ligne.prix_unitaire).toLocaleString()}</td>
                          <td className="p-2.5 text-right font-mono font-black text-slate-900">{Number(ligne.montant_total).toLocaleString()}</td>
                          {!documentEnLectureSeule && (
                            <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setLignesPanier(lignesPanier.filter((_, i) => i !== index))} className="p-1 bg-slate-100 hover:bg-rose-100 rounded-lg text-xs cursor-pointer">🗑️</button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-wider">
                    <tr>
                      <th className="p-2.5 w-[10%] text-center">#</th>
                      <th className="p-2.5 w-[60%]">DÉSIGNATION</th>
                      <th className="p-2.5 w-[20%] text-center">QTÉ</th>
                      {!documentEnLectureSeule && <th className="p-2.5 w-[10%] text-center">ACT</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-900">
                    {lignesPanier.length === 0 ? (
                      <tr>
                        <td colSpan={documentEnLectureSeule ? 3 : 4} className="p-6 text-center text-slate-400 font-medium italic">
                          Aucun article ajouté.
                        </td>
                      </tr>
                    ) : (
                      lignesPanier.map((ligne, index) => (
                        <tr key={index} onClick={() => !documentEnLectureSeule && !enTrainDeSauvegarder && modifierLignePanier(ligne)} className={!documentEnLectureSeule ? "hover:bg-orange-50/70 cursor-pointer transition" : "transition"}>
                          <td className="p-2.5 text-center text-slate-500">{index + 1}</td>
                          <td className="p-2.5 font-black uppercase text-slate-900 truncate">{ligne.designation}</td>
                          <td className="p-2.5 text-center font-black text-emerald-600">{ligne.quantite}</td>
                          {!documentEnLectureSeule && (
                            <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setLignesPanier(lignesPanier.filter((_, i) => i !== index))} className="p-1 bg-slate-100 hover:bg-rose-100 rounded-lg text-xs cursor-pointer">🗑️</button>
                            </td>
                          )}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {ongletPrincipal === 'ACHATS' && estModeBoutique && lignesPanier.length > 0 && (
              <div className="bg-emerald-50/60 border border-emerald-200 p-2.5 rounded-xl flex flex-wrap justify-between items-center gap-2 text-xs">
                <div className="font-black text-emerald-900 flex items-center gap-1.5">
                  <span>NET :</span>
                  <span className="font-mono text-emerald-700 text-xs">{montantTotalFacture.toLocaleString()} FCFA</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="font-extrabold text-slate-700">Règlement :</span>
                    <button
                      type="button"
                      disabled={documentEnLectureSeule}
                      onClick={() => setModalReglementOuvert(true)}
                      className="bg-white border border-emerald-400 px-2.5 py-1 rounded-lg font-black text-emerald-800 text-xs uppercase shadow-2xs flex items-center gap-1 cursor-pointer"
                    >
                      <span>💳 {statutReglement === 'SOLDE' ? 'Soldé' : statutReglement === 'AVANCE' ? 'Avancé' : 'Non payé'}</span>
                      <span>▼</span>
                    </button>
                  </div>
                  
                  <div className="text-right font-bold text-slate-700 text-[11px]">
                    Payé : <strong className="text-emerald-700">{Number(montantPayeAchat).toLocaleString()}</strong> | Reste : <strong className="text-rose-600">{resteAVerserFacture.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            )}

            {modalReglementOuvert && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h4 className="font-black text-slate-900 uppercase text-xs">STATUT DU RÈGLEMENT</h4>
                    <button type="button" onClick={() => setModalReglementOuvert(false)} className="text-slate-400 font-bold text-sm">✕</button>
                  </div>
                  <div className="space-y-2">
                    {[
                      { id: 'SOLDE', libelle: 'Soldé' },
                      { id: 'AVANCE', libelle: 'Avancé' },
                      { id: 'NON_PAYE', libelle: 'Non payé' }
                    ].map((opt) => (
                      <div
                        key={opt.id}
                        onClick={() => {
                          setStatutReglement(opt.id);
                          if (opt.id === 'SOLDE') setMontantPayeAchat(montantTotalFacture);
                          if (opt.id === 'NON_PAYE') setMontantPayeAchat(0);
                          if (opt.id !== 'AVANCE') {
                            setModalReglementOuvert(false);
                          }
                        }}
                        className={`p-3 rounded-xl border cursor-pointer font-black text-xs uppercase flex justify-between items-center shadow-2xs ${
                          statutReglement === opt.id ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-900 hover:bg-slate-100'
                        }`}
                      >
                        <span>{opt.libelle}</span>
                        {statutReglement === opt.id && <span className="text-emerald-600">✓</span>}
                      </div>
                    ))}

                    {statutReglement === 'AVANCE' && (
                      <div className="pt-2 space-y-1">
                        <label className="block font-extrabold text-[10px] text-slate-700 uppercase">Montant payé *</label>
                        <input
                          type="number"
                          min="0"
                          max={montantTotalFacture}
                          value={montantPayeAchat}
                          onChange={(e) => setMontantPayeAchat(Math.min(montantTotalFacture, Number(e.target.value)))}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-black text-emerald-700 text-center text-sm"
                          autoFocus
                        />
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => setModalReglementOuvert(false)} className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase rounded-xl cursor-pointer">OK</button>
                </div>
              </div>
            )}

            {/* BAS DU TABLEAU */}
            <div className="flex flex-nowrap justify-between items-center pt-1.5 gap-1.5 overflow-x-auto whitespace-nowrap text-[11px]">
              <div className="flex items-center gap-2 font-extrabold text-slate-700 shrink-0">
                <span>Lignes: <strong className="text-slate-900">{lignesPanier.length}</strong></span>
                <span>Pièces: <strong className="text-slate-900">{lignesPanier.reduce((acc, l) => acc + Number(l.quantite || 0), 0)}</strong></span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {!documentEnLectureSeule && verifierDroitSuppressionEffectif() && (
                  <button 
                    type="button" 
                    disabled={enTrainDeSauvegarder} 
                    onClick={supprimerDocumentActuel} 
                    className="bg-white hover:bg-rose-50 text-rose-600 border border-rose-300 font-black px-2.5 py-1.5 rounded-lg text-[11px] uppercase transition shadow-2xs cursor-pointer"
                  >
                    Réinit.
                  </button>
                )}

                <button 
                  type="button" 
                  disabled={enTrainDeSauvegarder} 
                  onClick={() => window.print()} 
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-black px-2 py-1.5 rounded-lg text-[11px] uppercase transition shadow-2xs cursor-pointer"
                >
                  🖨️
                </button>
                
                {!documentEnLectureSeule && ((mouvementEnEditionId && permissions.peut_modifier) || (!mouvementEnEditionId && permissions.peut_creer)) && permissions.peut_valider && (
                  <button 
                    type="button" 
                    onClick={validerDocumentMouvement} 
                    disabled={lignesPanier.length === 0 || enTrainDeSauvegarder || (mouvementEnEditionId && !documentModifie)} 
                    className={`font-black px-3 py-1.5 rounded-lg text-[11px] uppercase transition shadow-md cursor-pointer ${
                      lignesPanier.length > 0 && !enTrainDeSauvegarder && (!mouvementEnEditionId || documentModifie) 
                        ? 'bg-slate-200 hover:bg-slate-300 text-slate-900 border border-slate-300' 
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                    }`}
                  >
                    {enTrainDeSauvegarder ? 'Enreg...' : (mouvementEnEditionId ? (documentModifie ? '✅ Mettre à jour' : '🔒 Inchangé') : '✅ Valider')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {modeAffichage === 'LISTE_DOCS' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm space-y-2.5 p-3">
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
            <span className="font-extrabold uppercase text-slate-800">
              {ongletPrincipal === 'ACHATS' ? 'Achats Enregistrés' : 'Mouvements Enregistrés'} [{moduleActuel}] ({documentsAffiches.length} / {documentsTries.length})
            </span>
            <span className={`${ongletPrincipal === 'ACHATS' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'} px-2 py-0.5 rounded-lg font-black`}>{documentsTries.length}</span>
          </div>

          <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-black text-xs text-slate-700 uppercase">🔍 FILTRER LES DOCUMENTS</span>
              {(filtreDateDebut || filtreDateFin || filtrePartenaire) && (
                <button type="button" onClick={() => { setFiltreDateDebut(''); setFiltreDateFin(''); setFiltrePartenaire(''); }} className="text-xs text-orange-600 font-bold underline cursor-pointer">
                  Réinitialiser les filtres
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Date début</label>
                <input type="date" value={filtreDateDebut} onChange={(e) => setFiltreDateDebut(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-800 text-xs shadow-2xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">Date fin</label>
                <input type="date" value={filtreDateFin} onChange={(e) => setFiltreDateFin(e.target.value)} className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-800 text-xs shadow-2xs" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">{libelleTiers}</label>
                <button type="button" onClick={() => { setRechercheFiltreModal(''); setModalFiltrePartenaireOuvert(true); }} className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-800 text-xs text-left truncate flex justify-between items-center shadow-2xs cursor-pointer">
                  <span className="truncate">{filtrePartenaire ? (depots.find(d => String(d.id) === String(filtrePartenaire))?.nom_depot || filtrePartenaire) : `Tous les ${libelleTiers.toLowerCase()}s`}</span>
                  <span className="text-slate-400">🔍</span>
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white uppercase text-[10px] font-black tracking-wider">
                <tr>
                  <th onClick={() => gererTri('date')} className="p-2.5 cursor-pointer hover:bg-slate-800 transition">Date</th>
                  <th onClick={() => gererTri('numeroDoc')} className="p-2.5 cursor-pointer hover:bg-slate-800 transition">N° DOC</th>
                  <th onClick={() => gererTri('motifSaisi')} className="p-2.5 cursor-pointer hover:bg-slate-800 transition">MOTIF / RÉFÉRENCE</th>
                  <th onClick={() => gererTri('partenaireNom')} className="p-2.5 cursor-pointer hover:bg-slate-800 transition">{libelleTiers.toUpperCase()}</th>
                  <th onClick={() => gererTri('operateur')} className="p-2.5 cursor-pointer hover:bg-slate-800 transition">OPÉRATEUR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-900">
                {documentsAffiches.length === 0 ? (
                  <tr><td colSpan="5" className="p-6 text-center text-slate-400 font-medium">Aucun document trouvé.</td></tr>
                ) : (
                  documentsAffiches.map((doc, idx) => (
                    <tr key={idx} onClick={() => ouvrirDocumentDepuisListe(doc.numeroDocBrut)} className="hover:bg-orange-50/70 cursor-pointer transition">
                      <td className="p-2.5 font-mono font-bold text-slate-800 whitespace-nowrap">{new Date(doc.date).toLocaleDateString('fr-FR')}</td>
                      <td className={`p-2.5 font-mono font-black whitespace-nowrap ${ongletPrincipal === 'ACHATS' ? 'text-emerald-700' : 'text-orange-600'}`}>{doc.numeroDoc}</td>
                      <td className="p-2.5 font-bold text-slate-700 uppercase truncate max-w-[200px]" title={doc.motifSaisi}>{doc.motifSaisi || '-'}</td>
                      <td className="p-2.5 font-bold text-slate-700 truncate max-w-[150px]" title={doc.partenaireNom}>{doc.partenaireNom}</td>
                      <td className="p-2.5 font-extrabold uppercase text-slate-900 truncate max-w-[120px]" title={doc.operateur}>{doc.operateur}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {limiteDocuments < documentsTries.length && (
            <div className="text-center pt-1.5">
              <button type="button" disabled={enTrainDeSauvegarder} onClick={() => setLimiteDocuments(prev => prev + 20)} className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold px-3 py-2 rounded-xl text-xs w-full transition cursor-pointer">
                📥 Charger plus de documents ({documentsTries.length - limiteDocuments} restants)
              </button>
            </div>
          )}
        </div>
      )}

      {modalFiltrePartenaireOuvert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-black text-slate-900 uppercase text-xs">FILTRER PAR {libelleTiers.toUpperCase()}</h4>
              <button type="button" onClick={() => setModalFiltrePartenaireOuvert(false)} className="text-slate-400 font-black text-sm p-1">✕</button>
            </div>
            <input type="text" value={rechercheFiltreModal} onChange={(e) => setRechercheFiltreModal(e.target.value.toUpperCase())} placeholder="RECHERCHER..." autoFocus className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-black text-xs" />
            <div className="max-h-[350px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div onClick={() => { setFiltrePartenaire(''); setModalFiltrePartenaireOuvert(false); }} className="col-span-2 p-3.5 rounded-xl border border-slate-200 hover:bg-orange-50 cursor-pointer font-bold text-slate-500 text-xs text-center">Tous les {libelleTiers.toLowerCase()}s</div>
              {depots.filter(d => (d.nom_depot || '').toUpperCase().includes(rechercheFiltreModal)).map(d => (
                <div key={d.id} onClick={() => { setFiltrePartenaire(d.id); setModalFiltrePartenaireOuvert(false); }} className="p-3.5 rounded-xl border border-slate-200 hover:bg-orange-50 cursor-pointer font-black text-xs text-slate-900 uppercase truncate">{d.nom_depot || d.nom}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modalMessage && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-6 space-y-4 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 text-orange-600 text-xl font-black">ℹ️</div>
            <div className="space-y-1">
              <h3 className="font-black text-slate-900 text-sm uppercase">{modalMessage.titre}</h3>
              <p className="text-slate-600 font-medium text-xs leading-relaxed">{modalMessage.texte}</p>
            </div>
            <button type="button" onClick={() => setModalMessage(null)} className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase rounded-xl transition shadow-md cursor-pointer">OK</button>
          </div>
        </div>
      )}

      {modalConfirmation && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-6 space-y-4 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-orange-100 text-orange-600 text-xl font-black">❓</div>
            <div className="space-y-1">
              <h3 className="font-black text-slate-900 text-sm uppercase">{modalConfirmation.titre}</h3>
              <p className="text-slate-600 font-medium text-xs leading-relaxed">{modalConfirmation.texte}</p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button type="button" onClick={modalConfirmation.onCancel} className="py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 font-black text-xs uppercase rounded-xl transition cursor-pointer">Annuler</button>
              <button type="button" onClick={modalConfirmation.onConfirm} className="py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase rounded-xl transition shadow-md cursor-pointer">Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}