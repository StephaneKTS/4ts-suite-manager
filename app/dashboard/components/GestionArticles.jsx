'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/lib/usePermissions';
import { localSync } from '../../lib/localSync';

export default function GestionArticles({ entrepriseId = '4TS-234321', isDarkMode = false }) {
  const [articles, setArticles] = useState([]);
  const [depots, setDepots] = useState([]); 
  const [emplacements, setEmplacements] = useState([]);
  const [familles, setFamilles] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [approvisionnements, setApprovisionnements] = useState([]);
  const [entrepriseInfo, setInfosEntreprise] = useState(null);

  const [limiteArticles, setLimiteArticles] = useState(20);

  const [utilisateurConnecte, setUtilisateurConnecte] = useState('Stephane KTS');
  const [emailConnecte, setEmailConnecte] = useState('');

  // 🔔 État pour la modale unifiée de confirmation et de succès
  const [etatModale, setEtatModale] = useState({
    ouverte: false,
    titre: '',
    message: '',
    type: 'info', // 'confirmation', 'succes', 'erreur'
    onConfirmer: null
  });

  // ⚙️ États pour le menu d'options et l'importation en masse
  const [afficherModalOptions, setAfficherModalOptions] = useState(false);
  const [afficherModalImport, setAfficherModalImport] = useState(false);
  const [donneesImportees, setDonneesImportees] = useState([]);
  const [nomFichierImport, setNomFichierImport] = useState('');
  const importInputRef = useRef(null);

  // État pour la modale de sélection du Partenaire dans le rapport
  const [afficherModalSelectionDepotRapport, setAfficherModalSelectionDepotRapport] = useState(false);
  const [rechercheModalDepotRapport, setRechercheModalDepotRapport] = useState('');

  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();
  const estModeBoutique = moduleActuel === 'BOUTIQUE';
  const libelleLivreurOuEmplacement = estModeBoutique ? 'Emplacement' : 'Livreur';
  const libelleDepotPartenaire = moduleActuel === 'LIVRAISON' ? 'Partenaire' : 'Dépôt';

  const cleCacheArticles = `articles_${entrepriseId}_${moduleActuel}`;

  const [rechercheArticleInput, setRechercheArticleInput] = useState('');
  const [rechercheRapportInput, setRechercheRapportInput] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userLocal = localStorage.getItem('utilisateurConnecte') || localStorage.getItem('utilisateur_connecte');
      const emailLocal = localStorage.getItem('emailConnecte') || localStorage.getItem('email_connecte');
      if (userLocal) {
        try {
          const parsed = JSON.parse(userLocal);
          setUtilisateurConnecte((parsed.nom_complet || parsed.nom || userLocal).toUpperCase());
          if (parsed.email) setEmailConnecte(parsed.email);
        } catch {
          setUtilisateurConnecte(userLocal.toUpperCase());
        }
      }
      if (emailLocal) setEmailConnecte(emailLocal);
    }
  }, []);

  const emailActuel = emailConnecte || '';
  const estSuperAdmin = emailActuel.toLowerCase().trim() === 'stephs7352@gmail.com';

  const { verifierPermission, verifierCreation, verifierModification, verifierSuppression } = usePermissions(
    entrepriseId,
    utilisateurConnecte,
    emailConnecte,
    moduleActuel
  );

  const permissions = {
    lecture: verifierPermission('articles_stock', estSuperAdmin),
    creation: verifierCreation('articles_stock', estSuperAdmin),
    modification: verifierModification('articles_stock', estSuperAdmin),
    suppression: verifierSuppression('articles_stock', estSuperAdmin),
  };

  const [modeVue, setModeVue] = useState('catalogue');
  const [articleSelectionneStatId, setArticleSelectionneStatId] = useState('');
  
  const [depotStatFiltre, setDepotStatFiltre] = useState('TOUS');
  const [emplacementStatFiltre, setEmplacementStatFiltre] = useState('TOUS');
  
  const [afficherModalSelectionArticle, setAfficherModalSelectionArticle] = useState(false);
  const [rechercheModalArticle, setRechercheModalArticle] = useState('');

  const [afficherModalSelectionDepot, setAfficherModalSelectionDepot] = useState(false);
  const [rechercheModalDepot, setRechercheModalDepot] = useState('');

  const [afficherModalSelectionEmp, setAfficherModalSelectionEmp] = useState(false);
  const [rechercheModalEmp, setRechercheModalEmp] = useState('');

  const [afficherModalFamilleCat, setAfficherModalFamilleCat] = useState(false);
  const [rechercheModalFamilleCat, setRechercheModalFamilleCat] = useState('');

  const [afficherModalDepotCat, setAfficherModalDepotCat] = useState(false);
  const [rechercheModalDepotCat, setRechercheModalDepotCat] = useState('');

  const [afficherModalEmpCat, setAfficherModalEmpCat] = useState(false);
  const [rechercheModalEmpCat, setRechercheModalEmpCat] = useState('');

  const [depotRapportFiltre, setDepotRapportFiltre] = useState('TOUS');

  const designationInputRef = useRef(null);

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

  const [dateDebutRapport, setDateDebutRapport] = useState(obtenirPremierJourDuMois());
  const [dateFinRapport, setDateFinRapport] = useState(obtenirDernierJourDuMois());

  const [dateDebutStat, setDateDebutStat] = useState(obtenirPremierJourDuMois());
  const [dateFinStat, setDateFinStat] = useState(obtenirDernierJourDuMois());

  const [chargement, setChargement] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);
  
  const [afficherModalForm, setAfficherModalForm] = useState(false);
  const [articleEnEdition, setArticleEnEdition] = useState(null);

  const [familleFiltre, setFamilleFiltre] = useState('TOUTES');
  const [depotFiltre, setDepotFiltre] = useState('TOUS');
  const [emplacementFiltre, setEmplacementFiltre] = useState('TOUS');

  const [colonneTri, setColonneTri] = useState('Designation');
  const [ordreTri, setOrdreTri] = useState('asc');

  const [colonneTriRapport, setColonneTriRapport] = useState('Designation');
  const [ordreTriRapport, setOrdreTriRapport] = useState('asc');

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
    suivi_stock: true,
  });

  const toutesLesSuggestionsArticles = Array.from(
    new Set(articles.map(art => (art.Designation || art.designation || '').trim().toUpperCase()))
  ).sort();

  const obtenirNomEmplacementParId = (empId) => {
    if (!empId || empId === 'TOUS') return moduleActuel === 'LIVRAISON' ? 'Tous les livreurs' : 'Tous les emplacements';
    const emp = emplacements.find(e => String(e.id || e.id_emplacement) === String(empId));
    if (emp) {
      return emp.nom_emplacement || emp.code_emplacement || emp.responsable_emplacement || '-';
    }
    return '-';
  };

  const obtenirNomDepotParId = (depotId) => {
    if (!depotId || depotId === 'TOUS') return moduleActuel === 'LIVRAISON' ? 'Tous les partenaires' : 'Tous les dépôts';
    const depotTrouve = depots.find(d => String(d.id) === String(depotId));
    if (depotTrouve) return depotTrouve.nom_depot || depotTrouve.Nom_Depot || depotId;
    return depotId;
  };

  const obtenirNomFamilleParId = (famId) => {
    if (!famId || famId === 'TOUTES') return 'Toutes';
    const fam = familles.find(f => String(f.id) === String(famId));
    if (fam) return fam.nom_famille || fam.Nom_Famille || famId;
    return famId;
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

  const chargerDonneesReference = async () => {
    const familleLocale = localSync.recupererDonneesLocales(`familles_articles_${entrepriseId}_${moduleActuel}`);
    const depotsLocaux = localSync.recupererDonneesLocales(`depots_stock_${entrepriseId}_${moduleActuel}`);
    const emplacementsLocaux = localSync.recupererDonneesLocales(`emplacements_stock_${entrepriseId}_${moduleActuel}`);
    const mouvementsLocaux = localSync.recupererDonneesLocales(`mouvements_stock_${entrepriseId}_${moduleActuel}`);
    const approvisionnementsLocaux = localSync.recupererDonneesLocales(`approvisionnements_${entrepriseId}_${moduleActuel}`);
    const entrepriseLocale = localSync.recupererDonneesLocales(`entreprise_info_${entrepriseId}`);

    if (familleLocale && familleLocale.length > 0) {
      setFamilles(familleLocale);
      setNouveauArticle(prev => ({ 
        ...prev, 
        Famille: prev.Famille || familleLocale[0].id,
        suivi_stock: prev.Famille ? prev.suivi_stock : (familleLocale[0].suivi_stock ?? true) 
      }));
    }
    if (depotsLocaux && depotsLocaux.length > 0) {
      setDepots(depotsLocaux);
    }
    if (emplacementsLocaux) setEmplacements(emplacementsLocaux);
    if (mouvementsLocaux) setMouvements(mouvementsLocaux);
    if (approvisionnementsLocaux) setApprovisionnements(approvisionnementsLocaux);
    if (entrepriseLocale) setInfosEntreprise(entrepriseLocale);

    if (typeof window !== 'undefined' && !navigator.onLine) {
      return;
    }

    try {
      const { data: dataEnt } = await supabase
        .from('entreprises')
        .select('*')
        .or(`id.eq.${entrepriseId},id_entreprise.eq.${entrepriseId},code_entreprise.eq.${entrepriseId}`)
        .single();
      
      if (dataEnt) {
        setInfosEntreprise(dataEnt);
        localSync.sauvegarderDonneesLocales(`entreprise_info_${entrepriseId}`, dataEnt);
      }

      const { data: dataFam } = await supabase
        .from('familles_articles')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('created_at', { ascending: true });
      
      const listeFam = dataFam || [];
      setFamilles(listeFam);
      localSync.sauvegarderDonneesLocales(`familles_articles_${entrepriseId}_${moduleActuel}`, listeFam);

      if (listeFam.length > 0) {
        setNouveauArticle(prev => ({ 
          ...prev, 
          Famille: prev.Famille || listeFam[0].id,
          suivi_stock: prev.Famille ? prev.suivi_stock : (listeFam[0].suivi_stock ?? true) 
        }));
      }

      const { data: dataDep } = await supabase
        .from('depots_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      const listeDepots = dataDep || [];
      setDepots(listeDepots);
      localSync.sauvegarderDonneesLocales(`depots_stock_${entrepriseId}_${moduleActuel}`, listeDepots);

      const { data: dataEmp } = await supabase
        .from('emplacements_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      const listeEmp = dataEmp || [];
      setEmplacements(listeEmp);
      localSync.sauvegarderDonneesLocales(`emplacements_stock_${entrepriseId}_${moduleActuel}`, listeEmp);

      const { data: dataMouv } = await supabase
        .from('mouvements_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      const listeMouv = dataMouv || [];
      setMouvements(listeMouv);
      localSync.sauvegarderDonneesLocales(`mouvements_stock_${entrepriseId}_${moduleActuel}`, listeMouv);

      const { data: dataAppro } = await supabase
        .from('approvisionnements')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      const listeAppro = dataAppro || [];
      setApprovisionnements(listeAppro);
      localSync.sauvegarderDonneesLocales(`approvisionnements_${entrepriseId}_${moduleActuel}`, listeAppro);

    } catch (err) {
      console.warn('Mode hors-ligne ou échec réseau sur les références :', err.message);
    }
  };

  const chargerArticles = async () => {
    setChargement(true);
    const articlesLocaux = localSync.recupererDonneesLocales(cleCacheArticles);
    if (articlesLocaux && articlesLocaux.length > 0) {
      setArticles(articlesLocaux);
    }

    try {
      let { data, error } = await supabase
        .from('articles_stock')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const liste = data || [];
      
      setArticles(liste);
      localSync.sauvegarderDonneesLocales(cleCacheArticles, liste);
    } catch (err) {
      console.warn('Mode hors-ligne ou échec réseau :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonneesReference();
    chargerArticles();
    if (typeof window !== 'undefined') {
      localSync.synchroniserVersCloud(supabase);
    }
  }, [entrepriseId, moduleActuel]);

  const telechargerModeleExcel = () => {
    let enTetes = "Designation;ID_Famille;Famille;Prix_Vente;Prix_Achat;Seuil_Alerte;Code_Barre;Suivi_Stock\n";
    
    let lignesExemples = "";
    if (familles.length > 0) {
      const prem = familles[0];
      const sec = familles.length > 1 ? familles[1] : prem;
      
      const id1 = prem.id ? `ID-${prem.id}` : '';
      const nom1 = prem.nom_famille || prem.Nom_Famille || 'BOISSONS';
      const id2 = sec.id ? `ID-${sec.id}` : '';
      const nom2 = sec.nom_famille || sec.Nom_Famille || 'REPAS';

      lignesExemples = `COCA COLA 33CL;${id1};${nom1};500;350;10;5449000000496;OUI\n` +
                       `POULET DG;${id2};${nom2};3500;2500;5;;OUI\n`;
    } else {
      lignesExemples = `COCA COLA 33CL;ID-32;BOISSONS;500;350;10;5449000000496;OUI\n` +
                       `POULET DG;ID-33;REPAS;3500;2500;5;;OUI\n`;
    }

    const contenuCsv = "\ufeff" + enTetes + lignesExemples;
    const blob = new Blob([contenuCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const lien = document.createElement('a');
    lien.href = url;
    lien.setAttribute('download', `Modele_Import_Articles_${moduleActuel}.csv`);
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    setAfficherModalOptions(false);
  };

  const exporterCatalogueExcel = () => {
    let enTetes = "Designation;ID_Famille;Famille;Prix_Vente;Prix_Achat;Seuil_Alerte;Code_Barre;Suivi_Stock\n";
    let lignesCatalogue = "";

    articles.forEach(art => {
      const designation = (art.Designation || art.designation || '').replace(/;/g, ' ');
      const idFamilleBrut = art.Famille || art.famille || '';
      const idFamille = idFamilleBrut ? `ID-${idFamilleBrut}` : '';
      const nomFamille = obtenirNomFamilleParId(idFamilleBrut).replace(/;/g, ' ');
      const prixVente = art.Prix_Vente || art.prix_vente || 0;
      const prixAchat = art.Prix_Achat || art.prix_achat || 0;
      const seuilAlerte = art.Seuil_Alerte || art.seuil_alerte || 5;
      const codeBarre = (art.Code_Barre || art.code_barre || '').replace(/;/g, ' ');
      const suiviStock = (art.suivi_stock ?? true) ? 'OUI' : 'NON';

      lignesCatalogue += `${designation};${idFamille};${nomFamille};${prixVente};${prixAchat};${seuilAlerte};${codeBarre};${suiviStock}\n`;
    });

    const contenuCsv = "\ufeff" + enTetes + lignesCatalogue;
    const blob = new Blob([contenuCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const lien = document.createElement('a');
    lien.href = url;
    lien.setAttribute('download', `Catalogue_Articles_${moduleActuel}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    setAfficherModalOptions(false);
  };

  const gererFichierImport = (e) => {
    const fichier = e.target.files[0];
    if (!fichier) return;

    if (!permissions.creation) {
      setEtatModale({
        ouverte: true,
        titre: 'Action non autorisée',
        message: 'Vous n’avez pas les droits de création pour importer des articles.',
        type: 'erreur',
        onConfirmer: null
      });
      if (importInputRef.current) importInputRef.current.value = '';
      return;
    }

    setNomFichierImport(fichier.name);
    const lecteur = new FileReader();

    lecteur.onload = (evenement) => {
      const contenu = evenement.target.result || '';
      const lignes = contenu.split(/\r\n|\n/);
      const articlesParses = [];

      for (let i = 1; i < lignes.length; i++) {
        const ligne = lignes[i].trim();
        if (!ligne || ligne.startsWith('#')) continue;

        const separateur = ligne.includes(';') ? ';' : ',';
        const colonnes = ligne.split(separateur);

        if (colonnes.length >= 1) {
          const designation = (colonnes[0] || '')
            .trim()
            .replace(/^['"]+|['"]+$/g, '')
            .replace(/\s+/g, ' ')
            .toUpperCase();

          if (!designation) continue;

          const saisieIdFamilleBrut = (colonnes[1] || '').trim().replace(/^['"]+|['"]+$/g, '');
          const saisieIdFamille = saisieIdFamilleBrut.replace(/^ID-/i, '');
          const saisieNomFamille = (colonnes[2] || '').trim().replace(/^['"]+|['"]+$/g, '').toUpperCase();
          
          const prixVenteBrut = (colonnes[3] || '0').trim().replace(/\s+/g, '').replace(',', '.');
          const prixAchatBrut = (colonnes[4] || '0').trim().replace(/\s+/g, '').replace(',', '.');
          const seuilBrut = (colonnes[5] || '5').trim().replace(/\s+/g, '');
          const codeBarre = (colonnes[6] || '').trim().replace(/^['"]+|['"]+$/g, '').toUpperCase();
          const suiviStockTexte = (colonnes[7] || 'OUI').trim().replace(/^['"]+|['"]+$/g, '').toUpperCase();

          const prixVente = parseFloat(prixVenteBrut) || 0;
          const prixAchat = moduleActuel !== 'LIVRAISON' ? (parseFloat(prixAchatBrut) || 0) : 0;
          const seuilAlerte = seuilBrut !== '' && !isNaN(parseInt(seuilBrut)) ? parseInt(seuilBrut) : 5;
          const suiviStock = !(suiviStockTexte === 'NON' || suiviStockTexte === 'FAUX' || suiviStockTexte === 'FALSE' || suiviStockTexte === '0');

          let familleId = familles.length > 0 ? familles[0].id : null;
          let familleNomAffichee = familles.length > 0 ? (familles[0].nom_famille || familles[0].Nom_Famille || 'DÉFAUT') : 'AUCUNE';
          let familleReconnue = false;

          const familleTrouveeParId = familles.find(f => String(f.id) === String(saisieIdFamille));
          const familleTrouveeParNom = familles.find(
            f => (f.nom_famille || f.Nom_Famille || '').trim().toUpperCase() === saisieNomFamille
          );

          if (familleTrouveeParId) {
            familleId = familleTrouveeParId.id;
            familleNomAffichee = familleTrouveeParId.nom_famille || familleTrouveeParId.Nom_Famille;
            familleReconnue = true;
          } else if (familleTrouveeParNom) {
            familleId = familleTrouveeParNom.id;
            familleNomAffichee = familleTrouveeParNom.nom_famille || familleTrouveeParNom.Nom_Famille;
            familleReconnue = true;
          }

          articlesParses.push({
            _tempId: `imp_${i}_${Date.now()}`,
            _familleNomAffichee: familleNomAffichee,
            _familleReconnue: familleReconnue,
            payload: {
              id_entreprise: entrepriseId,
              module: moduleActuel,
              Designation: designation,
              Famille: familleId,
              Prix_Vente: prixVente,
              Prix_Achat: prixAchat,
              Seuil_Alerte: seuilAlerte,
              Code_Barre: codeBarre,
              Photo: '',
              Disponible_Menu_QR: true,
              date_peremption: null,
              suivi_stock: suiviStock,
              Quantite_Stock: 0
            }
          });
        }
      }

      if (importInputRef.current) importInputRef.current.value = '';

      if (articlesParses.length === 0) {
        setEtatModale({
          ouverte: true,
          titre: 'Fichier vide ou invalide',
          message: 'Aucun article valide n’a été détecté dans ce fichier.',
          type: 'erreur',
          onConfirmer: null
        });
        return;
      }

      setDonneesImportees(articlesParses);
      setAfficherModalOptions(false);
      setAfficherModalImport(true);
    };

    lecteur.readAsText(fichier, 'UTF-8');
  };

  const retirerLigneImport = (tempId) => {
    if (enTrainDeSauvegarder) return;
    setDonneesImportees(prev => prev.filter(item => item._tempId !== tempId));
  };

  const validerImportationMassive = async () => {
    if (enTrainDeSauvegarder || donneesImportees.length === 0) return;

    setEnTrainDeSauvegarder(true);
    const payloadsAInserer = donneesImportees.map(item => item.payload);

    try {
      const tailleLot = 100;
      let echecCloud = false;

      for (let i = 0; i < payloadsAInserer.length; i += tailleLot) {
        const lot = payloadsAInserer.slice(i, i + tailleLot);
        const { error } = await supabase.from('articles_stock').insert(lot);
        if (error) {
          echecCloud = true;
          lot.forEach(art => localSync.ajouterFileAttente('INSERT', 'articles_stock', art));
        }
      }

      const nouveauxLocaux = payloadsAInserer.map((p, idx) => ({
        ...p,
        id: `local_imp_${Date.now()}_${idx}`,
        id_article: `local_imp_${Date.now()}_${idx}`
      }));

      const articlesMaj = [...nouveauxLocaux, ...articles];
      setArticles(articlesMaj);
      localSync.sauvegarderDonneesLocales(cleCacheArticles, articlesMaj);

      const totalImportes = payloadsAInserer.length;
      setAfficherModalImport(false);
      setDonneesImportees([]);
      setNomFichierImport('');

      if (!echecCloud) {
        await chargerArticles();
      }

      setEtatModale({
        ouverte: true,
        titre: 'Importation terminée',
        message: echecCloud
          ? `${totalImportes} article(s) enregistré(s) localement (synchronisation cloud automatique dès le retour de la connexion).`
          : `${totalImportes} article(s) ont été importés avec succès dans le module ${moduleActuel} !`,
        type: 'succes',
        onConfirmer: null
      });
    } catch (err) {
      setEtatModale({
        ouverte: true,
        titre: 'Erreur d’importation',
        message: 'Une erreur est survenue lors de l’importation : ' + err.message,
        type: 'erreur',
        onConfirmer: null
      });
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const isGestionPerissablesActive = () => {
    if (!entrepriseInfo) return false;
    if (entrepriseInfo.gestion_perissables === true) return true;
    if (entrepriseInfo.options_config && entrepriseInfo.options_config.gestion_perissables === true) return true;
    return false;
  };

  const articleAeuMouvementChezPartenaire = (articleId, depotId) => {
    if (!depotId || depotId === 'TOUS') return true;

    const aMouvement = mouvements.some(m => {
      if (String(m.id_article) !== String(articleId)) return false;
      const matchSource = String(m.id_depot_source || '') === String(depotId);
      const matchDest = String(m.id_depot_destination || '') === String(depotId);
      return matchSource || matchDest;
    });

    if (aMouvement) return true;

    const aAppro = approvisionnements.some(app => {
      const depApp = String(app.id_depot_destination || app.id_depot || '');
      if (depApp !== String(depotId)) return false;

      let listArt = [];
      if (typeof app.details_articles === 'string') {
        try { listArt = JSON.parse(app.details_articles); } catch (e) {}
      } else if (Array.isArray(app.details_articles)) {
        listArt = app.details_articles;
      }

      return listArt.some(item => String(item.id_article || item.article_id) === String(articleId));
    });

    return aAppro;
  };

  const calculerLigneRapportStockPourDepot = (articleId, dCible) => {
    let stockInitial = 0;
    let entrees = 0;
    let sorties = 0;

    mouvements.forEach(m => {
      if (String(m.id_article) !== String(articleId)) return;
      const qte = parseInt(m.quantite || 0);
      const typeMvt = (m.type_mouvement || '').toUpperCase();

      const estSource = String(m.id_depot_source || '') === String(dCible);
      const estDestination = String(m.id_depot_destination || '') === String(dCible);
      const memeDepotInterne = m.id_depot_source && m.id_depot_destination && String(m.id_depot_source) === String(m.id_depot_destination);

      if (dCible !== 'TOUS' && !estSource && !estDestination) return;

      if (typeMvt === 'INVENTAIRE') {
        stockInitial = qte;
      } else {
        if (typeMvt === 'SORTIE' || typeMvt === 'AVARIES') {
          if (dCible === 'TOUS' || estSource) sorties += qte;
        } else if (typeMvt === 'ENTREE' || typeMvt === 'APPROVISIONNEMENT') {
          entrees += qte;
        } else if (typeMvt === 'TRANSFERT' || typeMvt === 'TR') {
          if (memeDepotInterne) {
            // Neutre
          } else if (dCible !== 'TOUS') {
            if (estSource) sorties += qte;
            if (estDestination) entrees += qte;
          }
        } else {
          entrees += qte;
        }
      }
    });

    approvisionnements.forEach(app => {
      const matchDepot = dCible === 'TOUS' || String(app.id_depot_destination || app.id_depot || '') === String(dCible);
      if (!matchDepot) return;

      let listArt = [];
      if (typeof app.details_articles === 'string') {
        try { listArt = JSON.parse(app.details_articles); } catch (e) {}
      } else if (Array.isArray(app.details_articles)) {
        listArt = app.details_articles;
      }

      listArt.forEach(item => {
        if (String(item.id_article || item.article_id) !== String(articleId)) return;
        const qte = parseInt(item.quantite || 0);
        entrees += qte;
      });
    });

    stockInitial = Math.max(0, stockInitial);
    const stockTotal = stockInitial + entrees;
    const stockReel = Math.max(0, stockTotal - sorties);

    return stockReel;
  };

  const calculerStockReelDirect = (articleId, depotCible = 'TOUS', emplacementCible = 'TOUS') => {
    if (emplacementCible !== 'TOUS') {
      let stockEmp = 0;
      mouvements.forEach(m => {
        if (String(m.id_article) !== String(articleId)) return;
        
        if (depotCible !== 'TOUS') {
          const matchDepSource = String(m.id_depot_source || '') === String(depotCible);
          const matchDepDest = String(m.id_depot_destination || '') === String(depotCible);
          if (!matchDepSource && !matchDepDest) return;
        }

        const qte = parseInt(m.quantite || 0);
        const typeMvt = (m.type_mouvement || '').toUpperCase();
        
        const empSource = String(m.id_emplacement_source || '');
        const empDest = String(m.id_emplacement_destination || '');

        const matchSource = empSource === String(emplacementCible);
        const matchDest = empDest === String(emplacementCible);

        if (typeMvt === 'INVENTAIRE' && matchSource) {
          stockEmp = qte;
          return;
        }
        if (typeMvt === 'TRANSFERT' || typeMvt === 'TR') {
          if (matchDest) stockEmp += qte;
          if (matchSource) stockEmp -= qte;
          return;
        }
        if (matchDest) stockEmp += qte;
        if (matchSource) stockEmp -= qte;
      });
      return Math.max(0, stockEmp);
    }

    return calculerLigneRapportStockPourDepot(articleId, depotCible);
  };

  const obtenirNumeroDocVisuelPourMouvement = (mvtCible) => {
    if (!mvtCible) return 'MVT';
    const motifMvt = (mvtCible.motif_remarque || '').trim().toUpperCase();
    
    const documentsBruts = Object.values(
      mouvements
        .filter((mvt) => {
          const motif = (mvt.motif_remarque || '').trim().toUpperCase();
          
          const estSystemeAuto = (
            motif.includes('CMD-') || 
            motif.includes('LIVRAISON') || 
            motif.includes('RESTITUTION') ||
            motif.includes('VENTE') ||
            motif.includes('VENTE TICKET')
          );
          if (estSystemeAuto) return false;

          return true;
        })
        .reduce((acc, mvt) => {
          const numDocBrut = mvt.motif_remarque || 'SANS-REF';
          if (!acc[numDocBrut]) {
            acc[numDocBrut] = {
              numeroDocBrut: numDocBrut,
              date: mvt.created_at || '',
              type: (mvt.type_mouvement || 'TRANSFERT').toUpperCase(),
            };
          }
          return acc;
        }, {})
    );

    documentsBruts.sort((a, b) => new Date(a.date) - new Date(b.date));

    const compteursParType = {};
    for (const doc of documentsBruts) {
      const typeMvt = doc.type;
      const prefixes = { ENTREE: 'APP', ENTREE_STOCK: 'ES', SORTIE: 'MS', AVARIES: 'AV', TRANSFERT: 'TR', INVENTAIRE: 'INV' };
      const prefix = prefixes[typeMvt] || 'TR';

      if (!compteursParType[prefix]) {
        compteursParType[prefix] = 0;
      }
      compteursParType[prefix] += 1;
      const numeroSequentiel = `${prefix}-${String(compteursParType[prefix]).padStart(2, '0')}`;

      if (doc.numeroDocBrut === motifMvt) {
        return numeroSequentiel;
      }
    }

    const typeMvtFallback = (mvtCible.type_mouvement || '').toUpperCase();
    const prefixesFallback = { ENTREE: 'APP', ENTREE_STOCK: 'ES', SORTIE: 'MS', AVARIES: 'AV', TRANSFERT: 'TR', INVENTAIRE: 'INV' };
    return prefixesFallback[typeMvtFallback] || 'TR';
  };

  const obtenirHistoriqueChronologiqueStat = (articleId) => {
    if (!articleId) return { lignes: [], stockFinal: 0 };

    let evenements = [];
    const dCible = depotStatFiltre;
    const eCible = emplacementStatFiltre;

    if (eCible === 'TOUS') {
      approvisionnements.forEach(app => {
        const matchDepot = dCible === 'TOUS' || String(app.id_depot_destination || app.id_depot) === String(dCible);
        if (!matchDepot) return;

        let listArt = [];
        if (typeof app.details_articles === 'string') {
          try { listArt = JSON.parse(app.details_articles); } catch (e) {}
        } else if (Array.isArray(app.details_articles)) {
          listArt = app.details_articles;
        }

        listArt.forEach(item => {
          if (String(item.id_article || item.article_id) === String(articleId)) {
            const motifRef = (app.reference || app.motif || app.motif_remarque || '').trim();
            const estLivraison = (app.type_mouvement || '').toUpperCase() === 'LIVRAISON' || motifRef.toUpperCase().includes('LIVRAISON');
            const motifAffichage = estLivraison ? 'LIVRAISON' : (motifRef !== '' ? motifRef : 'APPROVISIONNEMENT');

            evenements.push({
              date: app.created_at || '',
              typeAbr: 'APP',
              motifLigne: motifAffichage,
              emplacementDest: obtenirNomDestinationParMvt(app),
              quantiteMouvementee: parseInt(item.quantite || 0),
              impactStock: parseInt(item.quantite || 0),
              prioriteOrdre: 0,
              estTypeInventaire: false,
              valeurInventaire: 0
            });
          }
        });
      });

      mouvements.forEach(m => {
        if (String(m.id_article) !== String(articleId)) return;
        
        const qte = parseInt(m.quantite || 0);
        const typeMvt = (m.type_mouvement || '').toUpperCase();
        const estSource = String(m.id_depot_source) === String(dCible);
        const estDestination = String(m.id_depot_destination) === String(dCible);

        if (dCible !== 'TOUS' && !estSource && !estDestination) return;

        const typeAbr = obtenirNumeroDocVisuelPourMouvement(m);
        const emplacementDestNom = obtenirNomDestinationParMvt(m);

        const motifRemarque = (m.motif_remarque || '').trim();
        const referenceMvt = (m.reference || '').trim();
        
        const estLivraison = typeMvt === 'LIVRAISON' || motifRemarque.toUpperCase().includes('LIVRAISON') || referenceMvt.toUpperCase().includes('LIVRAISON');
        const motifAffichage = estLivraison ? 'LIVRAISON' : (referenceMvt !== '' ? referenceMvt : (motifRemarque !== '' ? motifRemarque : typeMvt));

        let impact = 0;
        let prioriteOrdre = 1;
        let estTypeInventaire = false;

        if (typeMvt === 'INVENTAIRE') {
          impact = qte;
          estTypeInventaire = true;
          prioriteOrdre = 0;
        } else if (typeMvt === 'ENTREE' || typeMvt === 'APPROVISIONNEMENT') {
          impact = qte;
          prioriteOrdre = 0;
        } else if (typeMvt === 'SORTIE' || typeMvt === 'AVARIES') {
          impact = -qte;
          prioriteOrdre = 2;
        } else if (typeMvt === 'TRANSFERT' || typeMvt === 'TR') {
          const memeDepot = m.id_depot_source && m.id_depot_destination && String(m.id_depot_source) === String(m.id_depot_destination);
          if (memeDepot) {
            impact = 0;
            prioriteOrdre = 1;
          } else {
            if (dCible === 'TOUS') {
              impact = 0;
              prioriteOrdre = 1;
            } else {
              if (estSource) {
                impact = -qte;
                prioriteOrdre = 2;
              }
              if (estDestination) {
                impact = qte;
                prioriteOrdre = 0;
              }
            }
          }
        } else {
          impact = qte;
          prioriteOrdre = 1;
        }

        evenements.push({
          date: m.created_at || '',
          typeAbr: typeAbr,
          motifLigne: motifAffichage,
          emplacementDest: emplacementDestNom,
          quantiteMouvementee: qte,
          impactStock: impact,
          prioriteOrdre: prioriteOrdre,
          estTypeInventaire: estTypeInventaire,
          valeurInventaire: qte
        });
      });

    } else {
      approvisionnements.forEach(app => {
        const matchDepot = dCible === 'TOUS' || String(app.id_depot_destination || app.id_depot) === String(dCible);
        if (!matchDepot) return;

        const matchEmpApp = String(app.id_emplacement_destination || app.id_emplacement || '') === String(eCible);
        if (!matchEmpApp) return;

        let listArt = [];
        if (typeof app.details_articles === 'string') {
          try { listArt = JSON.parse(app.details_articles); } catch (e) {}
        } else if (Array.isArray(app.details_articles)) {
          listArt = app.details_articles;
        }

        listArt.forEach(item => {
          if (String(item.id_article || item.article_id) === String(articleId)) {
            const motifRef = (app.reference || app.motif || app.motif_remarque || '').trim();
            const estLivraison = (app.type_mouvement || '').toUpperCase() === 'LIVRAISON' || motifRef.toUpperCase().includes('LIVRAISON');
            const motifAffichage = estLivraison ? 'LIVRAISON' : (motifRef !== '' ? motifRef : 'APPROVISIONNEMENT');

            evenements.push({
              date: app.created_at || '',
              typeAbr: 'APP',
              motifLigne: motifAffichage,
              emplacementDest: obtenirNomDestinationParMvt(app),
              quantiteMouvementee: parseInt(item.quantite || 0),
              impactStock: parseInt(item.quantite || 0),
              prioriteOrdre: 0,
              estTypeInventaire: false,
              valeurInventaire: 0
            });
          }
        });
      });

      mouvements.forEach(m => {
        if (String(m.id_article) !== String(articleId)) return;

        if (dCible !== 'TOUS') {
          const matchDepSource = String(m.id_depot_source || '') === String(dCible);
          const matchDepDest = String(m.id_depot_destination || '') === String(dCible);
          if (!matchDepSource && !matchDepDest) return;
        }

        const qte = parseInt(m.quantite || 0);
        const typeMvt = (m.type_mouvement || '').toUpperCase();
        
        const empSource = String(m.id_emplacement_source || '');
        const empDest = String(m.id_emplacement_destination || '');

        const matchSource = empSource === String(eCible);
        const matchDest = empDest === String(eCible);

        if (!matchSource && !matchDest) return;

        const typeAbr = obtenirNumeroDocVisuelPourMouvement(m);
        const emplacementDestNom = obtenirNomDestinationParMvt(m);

        const motifRemarque = (m.motif_remarque || '').trim();
        const referenceMvt = (m.reference || '').trim();
        
        const estLivraison = typeMvt === 'LIVRAISON' || motifRemarque.toUpperCase().includes('LIVRAISON') || referenceMvt.toUpperCase().includes('LIVRAISON');
        const motifAffichage = estLivraison ? 'LIVRAISON' : (referenceMvt !== '' ? referenceMvt : (motifRemarque !== '' ? motifRemarque : typeMvt));

        let impact = 0;
        let prioriteOrdre = 1;
        let estTypeInventaire = false;

        if (typeMvt === 'INVENTAIRE' && matchSource) {
          estTypeInventaire = true;
          prioriteOrdre = 0;
        } else if (matchDest && !matchSource) {
          impact = qte; 
          prioriteOrdre = 0; 
        } else if (matchSource && !matchDest) {
          impact = -qte; 
          prioriteOrdre = 2; 
        } else if (matchSource && matchDest) {
          impact = 0;
          prioriteOrdre = 1;
        }

        evenements.push({
          date: m.created_at || '',
          typeAbr: typeAbr,
          motifLigne: motifAffichage,
          emplacementDest: emplacementDestNom,
          quantiteMouvementee: qte,
          impactStock: impact,
          prioriteOrdre: prioriteOrdre,
          estTypeInventaire: estTypeInventaire,
          valeurInventaire: qte
        });
      });
    }

    evenements.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      const jourA = (a.date || '').split('T')[0];
      const jourB = (b.date || '').split('T')[0];

      if (jourA === jourB) {
        if (a.prioriteOrdre !== b.prioriteOrdre) {
          return a.prioriteOrdre - b.prioriteOrdre;
        }
      }
      return dateA - dateB;
    });

    let stockCourant = 0;
    let lignesResultat = [];

    evenements.forEach(ev => {
      const dateEv = (ev.date || '').split('T')[0];
      const estAvantPeriode = dateDebutStat && dateEv && dateEv < dateDebutStat;

      if (ev.estTypeInventaire) {
        stockCourant = ev.valeurInventaire;
        if (!estAvantPeriode && ((!dateDebutStat || !dateEv || dateEv >= dateDebutStat) && (!dateFinStat || !dateEv || dateEv <= dateFinStat))) {
          lignesResultat.push({
            ...ev,
            stockProgressif: Math.max(0, stockCourant)
          });
        }
      } else {
        stockCourant += ev.impactStock;
        if (!estAvantPeriode && ((!dateDebutStat || !dateEv || dateEv >= dateDebutStat) && (!dateFinStat || !dateEv || dateEv <= dateFinStat))) {
          lignesResultat.push({
            ...ev,
            stockProgressif: Math.max(0, stockCourant)
          });
        }
      }
    });

    return { lignes: lignesResultat, stockFinal: Math.max(0, stockCourant) };
  };

  const compresserImage = (file, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Erreur de compression de l'image"));
                return;
              }
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            quality
          );
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const gererUploadImage = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;

      setUploadingPhoto(true);
      const fichierCompresse = await compresserImage(file, 800, 0.7);

      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      const filePath = `articles/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('articles-images')
        .upload(filePath, fichierCompresse);

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data: urlData } = supabase.storage
        .from('articles-images')
        .getPublicUrl(filePath);

      setNouveauArticle(prev => ({ ...prev, Photo: urlData.publicUrl }));
    } catch (err) {
      setEtatModale({ ouverte: true, titre: 'Erreur', message: 'Erreur chargement photo : ' + err.message, type: 'erreur', onConfirmer: null });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const preparerEnregistrementArticle = (e) => {
    if (e) e.preventDefault();

    if (articleEnEdition && !permissions.modification) {
      setEtatModale({ ouverte: true, titre: 'Action non autorisée', message: 'Modification interdite par votre profil.', type: 'erreur', onConfirmer: null });
      return;
    }
    if (!articleEnEdition && !permissions.creation) {
      setEtatModale({ ouverte: true, titre: 'Action non autorisée', message: 'Création interdite par votre profil.', type: 'erreur', onConfirmer: null });
      return;
    }

    const designationClean = (nouveauArticle.Designation || '').trim().replace(/\s+/g, ' ').toUpperCase();
    if (!designationClean) {
      setEtatModale({ ouverte: true, titre: 'Champ requis', message: 'Veuillez renseigner la désignation de l\'article.', type: 'erreur', onConfirmer: null });
      return;
    }

    setEtatModale({
      ouverte: true,
      titre: 'Confirmation requise',
      message: `Voulez-vous véritablement valider et enregistrer l'article "${designationClean}" ?`,
      type: 'confirmation',
      onConfirmer: executerEnregistrementArticle
    });
  };

  const executerEnregistrementArticle = async () => {
    if (enTrainDeSauvegarder) return;

    let familleIdFinale = nouveauArticle.Famille;
    if (!familleIdFinale && familles.length > 0) {
      familleIdFinale = familles[0].id;
    }

    const designationClean = (nouveauArticle.Designation || '').trim().replace(/\s+/g, ' ').toUpperCase();

    setEnTrainDeSauvegarder(true);
    try {
      const payloadArticle = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        Designation: designationClean,
        Code_Barre: (nouveauArticle.Code_Barre || '').trim().toUpperCase(),
        Famille: familleIdFinale,
        Prix_Achat: moduleActuel !== 'LIVRAISON' ? (parseFloat(nouveauArticle.Prix_Achat) || 0) : 0,
        Prix_Vente: parseFloat(nouveauArticle.Prix_Vente) || 0,
        Seuil_Alerte: parseInt(nouveauArticle.Seuil_Alerte) || 5,
        Photo: nouveauArticle.Photo,
        Disponible_Menu_QR: nouveauArticle.Disponible_Menu_QR,
        date_peremption: isGestionPerissablesActive() && nouveauArticle.date_peremption ? nouveauArticle.date_peremption : null,
        suivi_stock: nouveauArticle.suivi_stock ?? true
      };

      if (articleEnEdition) {
        const targetId = articleEnEdition.id_article || articleEnEdition.id;
        const { error } = await supabase
          .from('articles_stock')
          .update(payloadArticle)
          .eq(articleEnEdition.id_article ? 'id_article' : 'id', targetId)
          .eq('id_entreprise', entrepriseId);

        if (error) {
          localSync.ajouterFileAttente('UPDATE', 'articles_stock', { ...payloadArticle, id: targetId });
        }
      } else {
        payloadArticle.Quantite_Stock = 0;
        const { error } = await supabase.from('articles_stock').insert([payloadArticle]);
        if (error) {
          localSync.ajouterFileAttente('INSERT', 'articles_stock', payloadArticle);
        }
      }

      const artIdFinal = articleEnEdition ? (articleEnEdition.id_article || articleEnEdition.id) : ('local_' + Date.now());
      const articleMajItem = { ...payloadArticle, id: artIdFinal, id_article: artIdFinal };
      const articlesMaj = articleEnEdition
        ? articles.map(a => String(a.id_article || a.id) === String(artIdFinal) ? articleMajItem : a)
        : [articleMajItem, ...articles];

      setArticles(articlesMaj);
      localSync.sauvegarderDonneesLocales(cleCacheArticles, articlesMaj);

      annulerForm();
      setAfficherModalForm(false);
      await chargerArticles();

      setEtatModale({
        ouverte: true,
        titre: 'Opération réussie',
        message: 'Article enregistré avec succès !',
        type: 'succes',
        onConfirmer: null
      });

    } catch (err) {
      setEtatModale({
        ouverte: true,
        titre: 'Erreur',
        message: 'Erreur lors de l’enregistrement : ' + err.message,
        type: 'erreur',
        onConfirmer: null
      });
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const ouvrirEdition = (article) => {
    if (enTrainDeSauvegarder) return;
    if (!permissions.modification) {
      setEtatModale({ ouverte: true, titre: 'Action non autorisée', message: 'Vous n’avez pas le droit de modifier les articles.', type: 'erreur', onConfirmer: null });
      return;
    }
    setArticleEnEdition(article);
    setNouveauArticle({
      Code_Barre: article.Code_Barre || article.code_barre || '',
      Designation: article.Designation || article.designation || '',
      Famille: article.Famille || article.famille || (familles.length > 0 ? familles[0].id : ''),
      Prix_Achat: article.Prix_Achat || article.prix_achat || 0,
      Prix_Vente: article.Prix_Vente || article.prix_vente || 0,
      Seuil_Alerte: article.Seuil_Alerte || article.seuil_alerte || 5,
      Photo: article.Photo || article.photo || '',
      Disponible_Menu_QR: article.Disponible_Menu_QR ?? true,
      date_peremption: article.date_peremption || '',
      suivi_stock: article.suivi_stock ?? true,
    });
    setAfficherModalForm(true);
    setTimeout(() => {
      if (designationInputRef.current) {
        designationInputRef.current.focus();
        designationInputRef.current.select();
      }
    }, 50);
  };

  const annulerForm = () => {
    if (enTrainDeSauvegarder) return;
    setArticleEnEdition(null);
    const premiereFamille = familles.length > 0 ? familles[0] : null;
    setNouveauArticle({
      Code_Barre: '',
      Designation: '',
      Famille: premiereFamille ? premiereFamille.id : '',
      Prix_Achat: 0,
      Prix_Vente: 0,
      Seuil_Alerte: 5,
      Photo: '',
      Disponible_Menu_QR: true,
      date_peremption: '',
      suivi_stock: premiereFamille ? (premiereFamille.suivi_stock ?? true) : true,
    });
  };

  const supprimerArticleDepuisFormulaire = async () => {
    if (enTrainDeSauvegarder || !articleEnEdition) return;

    if (!permissions.suppression) {
      setEtatModale({ ouverte: true, titre: 'Action non autorisée', message: 'Suppression interdite par votre profil.', type: 'erreur', onConfirmer: null });
      return;
    }

    const artId = articleEnEdition.id_article || articleEnEdition.id;
    const stockGlobalActuel = calculerStockReelDirect(artId, depotFiltre, emplacementFiltre);

    if (stockGlobalActuel > 0) {
      setEtatModale({ ouverte: true, titre: 'Suppression bloquée', message: `Impossible de supprimer ! L'article possède encore un stock de ${stockGlobalActuel} unité(s).`, type: 'erreur', onConfirmer: null });
      return;
    }

    setEtatModale({
      ouverte: true,
      titre: 'Confirmer la suppression',
      message: `Voulez-vous vraiment supprimer définitivement cet article ?`,
      type: 'confirmation',
      onConfirmer: async () => {
        setEnTrainDeSauvegarder(true);
        try {
          const { error } = await supabase
            .from('articles_stock')
            .delete()
            .eq(articleEnEdition.id_article ? 'id_article' : 'id', artId)
            .eq('id_entreprise', entrepriseId);

          if (error) {
            localSync.ajouterFileAttente('DELETE', 'articles_stock', { id: artId });
          }

          const articlesMaj = articles.filter(a => String(a.id_article || a.id) !== String(artId));
          setArticles(articlesMaj);
          localSync.sauvegarderDonneesLocales(cleCacheArticles, articlesMaj);

          annulerForm();
          setAfficherModalForm(false);
          chargerArticles();

          setEtatModale({
            ouverte: true,
            titre: 'Succès',
            message: 'Article supprimé avec succès.',
            type: 'succes',
            onConfirmer: null
          });
        } catch (err) {
          setEtatModale({ ouverte: true, titre: 'Erreur', message: 'Erreur : ' + err.message, type: 'erreur', onConfirmer: null });
        } finally {
          setEnTrainDeSauvegarder(false);
        }
      }
    });
  };

  const articlesFiltres = articles.filter((art) => {
    const artId = art.id_article || art.id;

    const designationArt = (art.Designation || art.designation || '').toLowerCase();
    if (rechercheArticleInput.trim() !== '' && !designationArt.includes(rechercheArticleInput.trim().toLowerCase())) {
      return false;
    }

    const matchFamille = familleFiltre === 'TOUTES' || !familleFiltre || String(art.Famille || art.famille) === String(familleFiltre);
    if (!matchFamille) return false;

    const matchDepotMouvement = articleAeuMouvementChezPartenaire(artId, depotFiltre);
    if (!matchDepotMouvement) return false;

    return true;
  });

  const articlesRapportFiltres = articles.filter((art) => {
    const artId = art.id_article || art.id;

    const designationArt = (art.Designation || art.designation || '').toLowerCase();
    if (rechercheRapportInput.trim() !== '' && !designationArt.includes(rechercheRapportInput.trim().toLowerCase())) {
      return false;
    }

    return articleAeuMouvementChezPartenaire(artId, depotRapportFiltre);
  });

  const gererTri = (colonne) => {
    if (enTrainDeSauvegarder) return;
    if (colonneTri === colonne) {
      setOrdreTri(ordreTri === 'asc' ? 'desc' : 'asc');
    } else {
      setColonneTri(colonne);
      setOrdreTri('asc');
    }
  };

  const gererTriRapport = (colonne) => {
    if (enTrainDeSauvegarder) return;
    if (colonneTriRapport === colonne) {
      setOrdreTriRapport(ordreTriRapport === 'asc' ? 'desc' : 'asc');
    } else {
      setColonneTriRapport(colonne);
      setOrdreTriRapport('asc');
    }
  };

  const articlesTries = [...articlesFiltres].sort((a, b) => {
    let valA, valB;

    if (colonneTri === 'Designation') {
      valA = String(a.Designation || a.designation || '').toLowerCase();
      valB = String(b.Designation || b.designation || '').toLowerCase();
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

  const articlesRapportTries = [...articlesRapportFiltres].sort((a, b) => {
    let valA, valB;
    if (colonneTriRapport === 'Designation') {
      valA = String(a.Designation || a.designation || '').toLowerCase();
      valB = String(b.Designation || b.designation || '').toLowerCase();
    }
    if (valA < valB) return ordreTriRapport === 'asc' ? -1 : 1;
    if (valA > valB) return ordreTriRapport === 'asc' ? 1 : -1;
    return 0;
  });

  const articlesAffiches = articlesTries.slice(0, limiteArticles);

  const emplacementsStatDisponibles = depotStatFiltre === 'TOUS'
    ? emplacements
    : emplacements.filter(emp => {
        const empId = String(emp.id || '');
        return mouvements.some(m => {
          const matchDepot = String(m.id_depot_source || '') === String(depotStatFiltre) || String(m.id_depot_destination || '') === String(depotStatFiltre);
          const matchEmplacement = String(m.id_emplacement_source || '') === empId || String(m.id_emplacement_destination || '') === empId;
          return matchDepot && matchEmplacement;
        });
      });

  const emplacementsCatDisponibles = depotFiltre === 'TOUS'
    ? emplacements
    : emplacements.filter(emp => {
        const empId = String(emp.id || '');
        return mouvements.some(m => {
          const matchDepot = String(m.id_depot_source || '') === String(depotFiltre) || String(m.id_depot_destination || '') === String(depotFiltre);
          const matchEmplacement = String(m.id_emplacement_source || '') === empId || String(m.id_emplacement_destination || '') === empId;
          return matchDepot && matchEmplacement;
        });
      });

  const emplacementsTableau = emplacementFiltre !== 'TOUS'
    ? emplacements.filter(emp => String(emp.id || emp.id_emplacement || '') === String(emplacementFiltre))
    : emplacementsCatDisponibles;

  const articlesModalFiltres = articles.filter(art => {
    const nom = (art.Designation || art.designation || '').toLowerCase();
    return nom.includes(rechercheModalArticle.toLowerCase());
  });

  const depotsModalFiltres = [
    { id: 'TOUS', nom_depot: moduleActuel === 'LIVRAISON' ? 'Tous les partenaires' : 'Tous les dépôts' },
    ...depots.filter(d => (d.nom_depot || d.Nom_Depot || '').toLowerCase().includes(rechercheModalDepot.toLowerCase()))
  ];

  const depotsRapportModalFiltres = [
    { id: 'TOUS', nom_depot: moduleActuel === 'LIVRAISON' ? 'Tous les partenaires' : 'Tous les dépôts' },
    ...depots.filter(d => (d.nom_depot || d.Nom_Depot || '').toLowerCase().includes(rechercheModalDepotRapport.toLowerCase()))
  ];

  const emplacementsModalFiltres = [
    { id: 'TOUS', nom_emplacement: moduleActuel === 'LIVRAISON' ? 'Tous les livreurs' : 'Tous les emplacements' },
    ...emplacementsStatDisponibles.filter(e => (e.nom_emplacement || '').toLowerCase().includes(rechercheModalEmp.toLowerCase()))
  ];

  const famillesCatModalFiltres = [
    { id: 'TOUTES', nom_famille: 'Toutes' },
    ...familles.filter(f => (f.nom_famille || f.Nom_Famille || '').toLowerCase().includes(rechercheModalFamilleCat.toLowerCase()))
  ];

  const depotsCatModalFiltres = [
    { id: 'TOUS', nom_depot: moduleActuel === 'LIVRAISON' ? 'Tous les partenaires' : 'Tous les dépôts' },
    ...depots.filter(d => (d.nom_depot || d.Nom_Depot || '').toLowerCase().includes(rechercheModalDepotCat.toLowerCase()))
  ];

  const emplacementsCatModalFiltres = [
    { id: 'TOUS', nom_emplacement: moduleActuel === 'LIVRAISON' ? 'Tous les livreurs' : 'Tous les emplacements' },
    ...emplacementsCatDisponibles.filter(e => (e.nom_emplacement || '').toLowerCase().includes(rechercheModalEmpCat.toLowerCase()))
  ];

  const articleStatObjet = articles.find(a => String(a.id_article || a.id) === String(articleSelectionneStatId));

  const colSpanTotal = 2 + emplacementsTableau.length + (moduleActuel !== 'LIVRAISON' ? 2 : 1);

  const calculerLigneRapportStock = (articleId) => {
    const dCible = depotRapportFiltre;
    
    let stockInitial = 0;
    let entrees = 0;
    let sorties = 0;

    mouvements.forEach(m => {
      if (String(m.id_article) !== String(articleId)) return;
      const dateMvt = (m.created_at || '').split('T')[0];
      const qte = parseInt(m.quantite || 0);
      const typeMvt = (m.type_mouvement || '').toUpperCase();

      const estSource = String(m.id_depot_source || '') === String(dCible);
      const estDestination = String(m.id_depot_destination || '') === String(dCible);
      const memeDepotInterne = m.id_depot_source && m.id_depot_destination && String(m.id_depot_source) === String(m.id_depot_destination);

      if (dCible !== 'TOUS' && !estSource && !estDestination) return;

      if (dateDebutRapport && dateMvt && dateMvt < dateDebutRapport) {
        if (typeMvt === 'SORTIE' || typeMvt === 'AVARIES') {
          if (dCible === 'TOUS' || estSource) stockInitial -= qte;
        } else if (typeMvt === 'ENTREE' || typeMvt === 'APPROVISIONNEMENT') {
          stockInitial += qte;
        } else if (typeMvt === 'TRANSFERT' || typeMvt === 'TR') {
          if (!memeDepotInterne && dCible !== 'TOUS') {
            if (estSource) stockInitial -= qte;
            if (estDestination) stockInitial += qte;
          }
        } else {
          stockInitial += qte;
        }
      } else if ((!dateDebutRapport || !dateMvt || dateMvt >= dateDebutRapport) && (!dateFinRapport || !dateMvt || dateMvt <= dateFinRapport)) {
        if (typeMvt === 'SORTIE' || typeMvt === 'AVARIES') {
          if (dCible === 'TOUS' || estSource) sorties += qte;
        } else if (typeMvt === 'ENTREE' || typeMvt === 'APPROVISIONNEMENT') {
          entrees += qte;
        } else if (typeMvt === 'TRANSFERT' || typeMvt === 'TR') {
          if (memeDepotInterne) {
            // Neutre
          } else if (dCible !== 'TOUS') {
            if (estSource) sorties += qte;
            if (estDestination) entrees += qte;
          }
        } else {
          entrees += qte;
        }
      }
    });

    approvisionnements.forEach(app => {
      const dateApp = (app.created_at || '').split('T')[0];
      const matchDepot = dCible === 'TOUS' || String(app.id_depot_destination || app.id_depot || '') === String(dCible);
      if (!matchDepot) return;

      let listArt = [];
      if (typeof app.details_articles === 'string') {
        try { listArt = JSON.parse(app.details_articles); } catch (e) {}
      } else if (Array.isArray(app.details_articles)) {
        listArt = app.details_articles;
      }

      listArt.forEach(item => {
        if (String(item.id_article || item.article_id) !== String(articleId)) return;
        const qte = parseInt(item.quantite || 0);

        if (dateDebutRapport && dateApp && dateApp < dateDebutRapport) {
          stockInitial += qte;
        } else if ((!dateDebutRapport || !dateApp || dateApp >= dateDebutRapport) && (!dateFinRapport || !dateApp || dateApp <= dateFinRapport)) {
          entrees += qte;
        }
      });
    });

    stockInitial = Math.max(0, stockInitial);
    const stockTotal = stockInitial + entrees;
    const stockReel = Math.max(0, stockTotal - sorties);

    return { stockInitial, entrees, stockTotal, sorties, stockReel };
  };

  const imprimerOngletActif = (titreDocument) => {
    const contenuActuel = document.getElementById(`section-impression-${modeVue}`);
    if (!contenuActuel) {
      window.print();
      return;
    }

    const nomEntreprise = entrepriseInfo?.nom_entreprise || entrepriseInfo?.nom || '4TS Suite manager';
    const dateImpression = new Date().toLocaleDateString('fr-FR');
    
    const formatIsoDateFr = (isoStr) => {
      if (!isoStr) return '';
      const parts = isoStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return isoStr;
    };

    let infosFiltresHtml = '';
    const libelleDepotRapport = moduleActuel === 'LIVRAISON' ? 'Partenaire' : 'Dépôt';

    if (modeVue === 'catalogue') {
      const famObj = familles.find(f => String(f.id) === String(familleFiltre));
      const depObj = depots.find(d => String(d.id) === String(depotFiltre));
      const empObj = emplacements.find(e => String(e.id) === String(emplacementFiltre));
      
      const nomDepotPartenaire = depObj ? (depObj.nom_depot || depObj.Nom_Depot) : 'Tous';

      infosFiltresHtml = `
        <div class="meta-info">
          <span><strong>Famille :</strong> ${famObj ? (famObj.nom_famille || famObj.Nom_Famille) : 'Toutes'}</span>
          <span><strong>${libelleDepotRapport} :</strong> ${nomDepotPartenaire}</span>
          <span><strong>${libelleLivreurOuEmplacement} :</strong> ${empObj ? empObj.nom_emplacement : 'Tous'}</span>
        </div>
      `;
    } else if (modeVue === 'statistiques') {
      const depObj = depots.find(d => String(d.id) === String(depotStatFiltre));
      const empObj = emplacements.find(e => String(e.id) === String(emplacementStatFiltre));
      const nomDepotPartenaire = depObj ? (depObj.nom_depot || depObj.Nom_Depot) : (moduleActuel === 'LIVRAISON' ? 'Tous les partenaires' : 'Tous les dépôts');
      const nomLivreurEmplacement = empObj ? empObj.nom_emplacement : 'Tous';
      
      const periodeTexte = (dateDebutStat && dateFinStat)
        ? `Du ${formatIsoDateFr(dateDebutStat)} au ${formatIsoDateFr(dateFinStat)}`
        : 'Période globale';

      infosFiltresHtml = `
        <div class="meta-info">
          <span><strong>${libelleDepotRapport} :</strong> ${nomDepotPartenaire}</span>
          <span><strong>${libelleLivreurOuEmplacement} :</strong> ${nomLivreurEmplacement}</span>
          <span><strong>Période :</strong> ${periodeTexte}</span>
        </div>
      `;
    } else if (modeVue === 'rapport') {
      const depObj = depots.find(d => String(d.id) === String(depotRapportFiltre));
      const nomDepotPartenaire = depObj ? (depObj.nom_depot || depObj.Nom_Depot) : (moduleActuel === 'LIVRAISON' ? 'Tous les partenaires' : 'Tous les dépôts');
      
      const periodeTexte = (dateDebutRapport && dateFinRapport)
        ? `Du ${formatIsoDateFr(dateDebutRapport)} au ${formatIsoDateFr(dateFinRapport)}`
        : 'Période globale';

      infosFiltresHtml = `
        <div class="meta-info">
          <span><strong>${libelleDepotRapport} :</strong> ${nomDepotPartenaire}</span>
          <span><strong>Période :</strong> ${periodeTexte}</span>
        </div>
      `;
    }

    const fenetreImpression = window.open('', '_blank', 'width=950,height=700');
    fenetreImpression.document.write(`
      <html>
        <head>
          <title>${titreDocument}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 25px; color: #0f172a; background: #fff; }
            .header-box { border-bottom: 3px solid #ea580c; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
            .company-title { font-size: 18px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin: 0; }
            .doc-subtitle { font-size: 11px; font-weight: bold; color: #ea580c; text-transform: uppercase; margin-top: 4px; }
            .print-date { font-size: 11px; font-weight: bold; color: #475569; text-align: right; }
            .meta-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 15px; display: flex; flex-wrap: wrap; gap: 20px; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
            th { background-color: #f8fafc; text-transform: uppercase; font-weight: 900; font-size: 10px; color: #334155; }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div>
              <h1 class="company-title">📦 ${nomEntreprise}</h1>
              <div class="doc-subtitle">${titreDocument}</div>
            </div>
            <div class="print-date">Édité le : ${dateImpression}</div>
          </div>
          ${infosFiltresHtml}
          <div>${contenuActuel.innerHTML}</div>
        </body>
      </html>
    `);
    fenetreImpression.document.close();
    fenetreImpression.focus();
    setTimeout(() => {
      fenetreImpression.print();
      fenetreImpression.close();
    }, 500);
  };

  const cardStyle = 'bg-white rounded-xl border border-slate-200 shadow-2xs';
  const inputStyle = 'w-full bg-slate-50 border border-slate-200 rounded-lg p-1 font-bold text-slate-900 text-[10px] focus:ring-1 focus:ring-orange-500 focus:outline-none uppercase';
  const selectTriggerStyle = 'w-full bg-slate-50 border border-slate-200 rounded-lg p-1 text-[10px] font-extrabold text-slate-900 cursor-pointer flex justify-between items-center hover:border-orange-400 transition';
  const tableHeaderStyle = 'bg-slate-50 text-slate-700 uppercase text-[8.5px] font-extrabold border-b border-slate-200';

  return (
    <div className="space-y-1.5 font-sans text-[10px]">
      
      {/* Barre supérieure épurée sur une seule ligne */}
      <div className={`flex justify-between items-center px-2.5 py-1.5 gap-2 flex-nowrap ${cardStyle}`}>
        <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
          <span className="font-extrabold uppercase text-slate-900 text-[10px] truncate">
            📦 ARTICLES ({articlesFiltres.length})
          </span>
          {isGestionPerissablesActive() && (
            <span className="text-[7.5px] bg-amber-50 text-amber-800 px-1.5 py-0.2 rounded-full font-bold border border-amber-200 shrink-0">
              Périssables
            </span>
          )}
        </div>
        
        {permissions.creation && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setAfficherModalOptions(true)}
              title="Options"
              className="py-1 px-2 rounded-lg font-black transition text-center text-[9px] uppercase flex items-center justify-center gap-0.5 border bg-slate-800 hover:bg-slate-700 text-white border-slate-700 shadow-xs cursor-pointer"
            >
              <span>⚙️</span> Option
            </button>

            <button
              type="button"
              disabled={enTrainDeSauvegarder}
              onClick={() => {
                setModeVue('catalogue');
                annulerForm();
                if (familles.length > 0) {
                  const premiereFam = familles[0];
                  setNouveauArticle(prev => ({ 
                    ...prev, 
                    Famille: premiereFam.id,
                    suivi_stock: premiereFam.suivi_stock ?? true 
                  }));
                }
                setAfficherModalForm(true);
                setTimeout(() => {
                  if (designationInputRef.current) {
                    designationInputRef.current.focus();
                    designationInputRef.current.select();
                  }
                }, 50);
              }}
              className="py-1 px-2.5 rounded-lg font-black transition text-center text-[9px] uppercase flex items-center justify-center gap-0.5 border bg-orange-600 hover:bg-orange-700 text-white border-orange-700 shadow-xs cursor-pointer"
            >
              <span>＋</span> Nouveau
            </button>
          </div>
        )}
      </div>

      {/* Sous-barre de navigation */}
      <div className="grid grid-cols-3 gap-1 w-full">
        <button
          type="button"
          disabled={enTrainDeSauvegarder}
          onClick={() => {
            setModeVue('catalogue');
            annulerForm();
          }}
          className={`py-1 px-0.5 rounded-lg font-black transition text-center text-[9px] uppercase border cursor-pointer truncate ${
            modeVue === 'catalogue' 
              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs' 
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
          }`}
        >
          📦 Article
        </button>

        <button
          type="button"
          disabled={enTrainDeSauvegarder}
          onClick={() => {
            setModeVue('statistiques');
            annulerForm();
          }}
          className={`py-1 px-0.5 rounded-lg font-black transition text-center text-[9px] uppercase border cursor-pointer truncate ${
            modeVue === 'statistiques' 
              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs' 
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
          }`}
        >
          📈 Stat
        </button>

        <button
          type="button"
          disabled={enTrainDeSauvegarder}
          onClick={() => {
            setModeVue('rapport');
            annulerForm();
          }}
          className={`py-1 px-0.5 rounded-lg font-black transition text-center text-[8.5px] uppercase border cursor-pointer truncate ${
            modeVue === 'rapport' 
              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs' 
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
          }`}
        >
          📊 Rapport Stock
        </button>
      </div>

      {modeVue === 'catalogue' && (
        <div className="space-y-1.5">
          <div className={`p-2 space-y-1.5 border-2 border-orange-500/40 ${cardStyle}`}>
            <div className="flex justify-between items-center gap-2 pb-1 border-b border-slate-100">
              <span className="font-extrabold text-[9px] uppercase text-orange-600 shrink-0">
                🔍 FILTRE & RECHERCHE
              </span>

              <div className="relative flex-1 max-w-[240px]">
                <input
                  type="text"
                  disabled={enTrainDeSauvegarder}
                  value={rechercheArticleInput}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setRechercheArticleInput(e.target.value)}
                  placeholder="SAISIR UNE DÉSIGNATION..."
                  className={`${inputStyle} pl-6 py-0.5`}
                />
                <span className="absolute left-1.5 top-1 text-slate-400 text-[9px]">🔍</span>
                {rechercheArticleInput && (
                  <button
                    type="button"
                    onClick={() => setRechercheArticleInput('')}
                    className="absolute right-1.5 top-0.5 text-slate-400 hover:text-slate-700 font-black text-[9px]"
                  >
                    ✕
                  </button>
                )}
              </div>

              {(rechercheArticleInput || familleFiltre !== 'TOUTES' || depotFiltre !== 'TOUS' || emplacementFiltre !== 'TOUS') && (
                <button
                  type="button"
                  onClick={() => {
                    setRechercheArticleInput('');
                    setFamilleFiltre('TOUTES');
                    setDepotFiltre('TOUS');
                    setEmplacementFiltre('TOUS');
                  }}
                  className="text-[8px] text-orange-600 font-bold underline hover:text-orange-700 cursor-pointer shrink-0"
                >
                  Réinit.
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1 pt-0.5">
              <div>
                <div
                  onClick={() => {
                    if (enTrainDeSauvegarder) return;
                    setRechercheModalFamilleCat('');
                    setAfficherModalFamilleCat(true);
                  }}
                  className={selectTriggerStyle}
                >
                  <span className="truncate uppercase text-orange-600">Famille: {obtenirNomFamilleParId(familleFiltre)}</span>
                  <span className="text-[8px] text-slate-400 shrink-0 ml-0.5">🔍</span>
                </div>
              </div>

              <div>
                <div
                  onClick={() => {
                    if (enTrainDeSauvegarder) return;
                    setRechercheModalDepotCat('');
                    setAfficherModalDepotCat(true);
                  }}
                  className={selectTriggerStyle}
                >
                  <span className="truncate uppercase text-orange-600">Partenaire: {obtenirNomDepotParId(depotFiltre)}</span>
                  <span className="text-[8px] text-slate-400 shrink-0 ml-0.5">🔍</span>
                </div>
              </div>

              <div>
                <div
                  onClick={() => {
                    if (enTrainDeSauvegarder) return;
                    setRechercheModalEmpCat('');
                    setAfficherModalEmpCat(true);
                  }}
                  className={selectTriggerStyle}
                >
                  <span className="truncate uppercase text-slate-800">Livreur: {obtenirNomEmplacementParId(emplacementFiltre)}</span>
                  <span className="text-[8px] text-slate-400 shrink-0 ml-0.5">🔍</span>
                </div>
              </div>
            </div>
          </div>

          <div className={`overflow-hidden ${cardStyle}`}>
            <div className="p-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold uppercase text-slate-800 text-[9.5px]">
                  📦 STOCK DES ARTICLES [{moduleActuel}]
                </span>
                <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-bold text-[9px]">
                  {articlesAffiches.length} / {articlesFiltres.length}
                </span>
              </div>
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={() => imprimerOngletActif('STOCK DES ARTICLES')}
                className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold px-2 py-1 rounded text-[8.5px] flex items-center gap-1 cursor-pointer"
              >
                <span>🖨️ Imp.</span>
              </button>
            </div>

            <div id="section-impression-catalogue" className="overflow-x-auto">
              <table className="w-full text-left text-[9.5px] border-collapse">
                <thead>
                  <tr className={tableHeaderStyle}>
                    <th 
                      onClick={() => !enTrainDeSauvegarder && gererTri('Designation')} 
                      className="p-2 cursor-pointer hover:text-orange-600 select-none whitespace-nowrap"
                    >
                      Désignation {colonneTri === 'Designation' && (ordreTri === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="p-2 text-center whitespace-nowrap">STOCK</th>

                    {emplacementsTableau.map((emp) => (
                      <th key={emp.id} className="p-2 text-center whitespace-nowrap">
                        📍 {emp.nom_emplacement || emp.code_emplacement}
                      </th>
                    ))}

                    {moduleActuel !== 'LIVRAISON' && (
                      <th 
                        onClick={() => !enTrainDeSauvegarder && gererTri('Prix_Achat')} 
                        className="p-2 text-right cursor-pointer hover:text-orange-600 select-none whitespace-nowrap"
                      >
                        PA {colonneTri === 'Prix_Achat' && (ordreTri === 'asc' ? '▲' : '▼')}
                      </th>
                    )}

                    <th 
                      onClick={() => !enTrainDeSauvegarder && gererTri('Prix_Vente')} 
                      className="p-2 text-right cursor-pointer hover:text-orange-600 select-none whitespace-nowrap"
                    >
                      PV {colonneTri === 'Prix_Vente' && (ordreTri === 'asc' ? '▲' : '▼')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-900 bg-white">
                  {chargement && articles.length === 0 ? (
                    <tr>
                      <td colSpan={colSpanTotal} className="p-4 text-center text-slate-400 italic font-bold">Chargement instantané...</td>
                    </tr>
                  ) : articlesAffiches.length === 0 ? (
                    <tr>
                      <td colSpan={colSpanTotal} className="p-4 text-center text-slate-400 italic font-bold">Aucun article enregistré pour le module {moduleActuel}.</td>
                    </tr>
                  ) : (
                    articlesAffiches.map((art) => {
                      const artId = art.id_article || art.id;
                      const stockCalculé = calculerStockReelDirect(artId, depotFiltre, emplacementFiltre);
                      const prixAchatValeur = art.Prix_Achat || art.prix_achat || 0;
                      const suiviStockActif = art.suivi_stock ?? true;

                      return (
                        <tr 
                          key={artId}
                          onClick={() => {
                            if (enTrainDeSauvegarder) return;
                            if (!permissions.modification) {
                              setEtatModale({ ouverte: true, titre: 'Action non autorisée', message: 'Vous n’avez pas le droit de modifier les articles.', type: 'erreur', onConfirmer: null });
                              return;
                            }
                            ouvrirEdition(art);
                          }}
                          className={`transition select-none ${permissions.modification ? 'hover:bg-orange-50/70 cursor-pointer' : 'cursor-default'}`}
                        >
                          <td className="p-2 font-extrabold text-[9.5px] whitespace-nowrap uppercase flex items-center gap-1.5 text-slate-900">
                            <span>{art.Designation || art.designation}</span>
                            {!suiviStockActif && (
                              <span className="bg-slate-100 text-slate-600 text-[8px] font-bold px-1.5 py-0.5 rounded border border-slate-200">
                                Non suivi
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-center whitespace-nowrap">
                            {suiviStockActif ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {stockCalculé}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-slate-100 text-slate-500 italic">
                                Libre
                              </span>
                            )}
                          </td>

                          {emplacementsTableau.map((emp) => {
                            const stockEmp = calculerStockReelDirect(artId, depotFiltre, emp.id);
                            return (
                              <td key={emp.id} className="p-2 text-center whitespace-nowrap">
                                {suiviStockActif ? (
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${stockEmp > 0 ? 'bg-slate-100 text-slate-800 border border-slate-200' : 'text-slate-400 font-bold'}`}>
                                    {stockEmp}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[8.5px]">-</span>
                                )}
                              </td>
                            );
                          })}

                          {moduleActuel !== 'LIVRAISON' && (
                            <td className="p-2 text-right font-bold text-[9.5px] whitespace-nowrap text-slate-700">
                              {prixAchatValeur}
                            </td>
                          )}
                          <td className="p-2 text-right font-black text-emerald-600 text-[9.5px] whitespace-nowrap">
                            {art.Prix_Vente || art.prix_vente || 0}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {limiteArticles < articlesFiltres.length && (
              <div className="p-2 bg-slate-50 border-t border-slate-100">
                <button
                  type="button"
                  disabled={enTrainDeSauvegarder}
                  onClick={() => setLimiteArticles(prev => prev + 20)}
                  className="bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-800 font-extrabold px-4 py-1.5 rounded-xl text-[9.5px] transition shadow-2xs border border-slate-300 w-full cursor-pointer"
                >
                  📥 Charger 20 articles de plus ({articlesFiltres.length - limiteArticles} restants)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {modeVue === 'statistiques' && (() => {
        const artObj = articleStatObjet;
        const nomArticle = artObj ? (artObj.Designation || artObj.designation || '') : '';
        const stats = artObj ? obtenirHistoriqueChronologiqueStat(artObj.id_article || artObj.id) : { lignes: [], stockFinal: 0 };

        const nomDepotActuel = obtenirNomDepotParId(depotStatFiltre);
        const nomEmpActuel = obtenirNomEmplacementParId(emplacementStatFiltre);

        return (
          <div className="space-y-1.5">
            <div className={`p-2 space-y-1.5 border-2 border-orange-500/40 ${cardStyle}`}>
              <div className="flex justify-between items-center gap-2 pb-1 border-b border-slate-100">
                <span className="font-extrabold text-[9px] uppercase text-orange-600 shrink-0">
                  📈 STAT
                </span>

                <div className="flex items-center gap-1.5 flex-1 justify-end">
                  <div className="flex items-center gap-1">
                    <span className="text-[7px] font-bold text-slate-500 uppercase">Du</span>
                    <input
                      type="date"
                      disabled={enTrainDeSauvegarder}
                      value={dateDebutStat}
                      onChange={(e) => setDateDebutStat(e.target.value)}
                      className={`${inputStyle} font-mono py-0.5 w-26`}
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[7px] font-bold text-slate-500 uppercase">Au</span>
                    <input
                      type="date"
                      disabled={enTrainDeSauvegarder}
                      value={dateFinStat}
                      onChange={(e) => setDateFinStat(e.target.value)}
                      className={`${inputStyle} font-mono py-0.5 w-26`}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1 pt-0.5">
                <div>
                  <div
                    onClick={() => {
                      if (enTrainDeSauvegarder) return;
                      setRechercheModalDepot('');
                      setAfficherModalSelectionDepot(true);
                    }}
                    className={selectTriggerStyle}
                  >
                    <span className="truncate uppercase text-orange-600">Partenaire: {nomDepotActuel}</span>
                    <span className="text-[8px] text-slate-400 shrink-0 ml-0.5">🔍</span>
                  </div>
                </div>

                <div>
                  <div
                    onClick={() => {
                      if (enTrainDeSauvegarder) return;
                      setRechercheModalEmp('');
                      setAfficherModalSelectionEmp(true);
                    }}
                    className={selectTriggerStyle}
                  >
                    <span className="truncate uppercase text-slate-800">Livreur: {nomEmpActuel}</span>
                    <span className="text-[8px] text-slate-400 shrink-0 ml-0.5">🔍</span>
                  </div>
                </div>

                <div>
                  <div
                    onClick={() => {
                      if (enTrainDeSauvegarder) return;
                      setRechercheModalArticle('');
                      setAfficherModalSelectionArticle(true);
                    }}
                    className={selectTriggerStyle}
                  >
                    <span className="truncate uppercase text-orange-600">
                      Article: {artObj ? nomArticle : 'Sélectionner...'}
                    </span>
                    <span className="text-[8px] text-slate-400 shrink-0 ml-0.5">🔍</span>
                  </div>
                </div>
              </div>
            </div>

            {artObj ? (
              <div className={`overflow-hidden ${cardStyle}`}>
                <div className="p-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                  <span className="font-extrabold uppercase text-slate-800 text-[9.5px] truncate">
                    📈 MOUVEMENTS : <strong className="text-orange-600">{nomArticle}</strong>
                  </span>
                  <button
                    type="button"
                    disabled={enTrainDeSauvegarder}
                    onClick={() => imprimerOngletActif('STATISTIQUES ARTICLE')}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-2 py-1 rounded text-[8.5px] flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>🖨️ Imp.</span>
                  </button>
                </div>

                <div id="section-impression-statistiques" className="overflow-x-auto">
                  <table className="w-full text-left text-[9.5px] border-collapse">
                    <thead>
                      <tr className={tableHeaderStyle}>
                        <th className="p-2">Date</th>
                        <th className="p-2">Motif</th>
                        <th className="p-2 text-center">Type Mvt</th>
                        <th className="p-2 text-center">Livreur</th>
                        <th className="p-2 text-center">Quantité</th>
                        <th className="p-2 text-center">Cumul</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[9.5px] text-slate-900 bg-white">
                      {stats.lignes.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="p-4 text-center italic font-bold text-slate-400">Aucun mouvement enregistré sur cette période.</td>
                        </tr>
                      ) : (
                        stats.lignes.map((ligne, idx) => (
                          <tr key={idx} className="transition hover:bg-orange-50/70">
                            <td className="p-2 font-mono font-bold text-slate-800 whitespace-nowrap">
                              {ligne.date ? new Date(ligne.date).toLocaleDateString('fr-FR') : '-'}
                            </td>
                            <td className="p-2 font-extrabold uppercase text-slate-900">{ligne.motifLigne || '-'}</td>
                            <td className="p-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded-full font-black text-[8.5px] border ${
                                ligne.typeAbr === 'APP' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                ligne.typeAbr.startsWith('ES') ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                ligne.typeAbr.startsWith('MS') ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                ligne.typeAbr.startsWith('TR') ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                'bg-blue-50 text-blue-700 border-blue-200'
                              }`}>
                                {ligne.typeAbr}
                              </span>
                            </td>
                            <td className="p-2 text-center font-bold text-blue-700 uppercase">{ligne.emplacementDest || '-'}</td>
                            <td className={`p-2 text-center font-black ${ligne.impactStock < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {ligne.impactStock > 0 ? `+${ligne.quantiteMouvementee}` : ligne.impactStock < 0 ? `-${ligne.quantiteMouvementee}` : ligne.quantiteMouvementee}
                            </td>
                            <td className="p-2 text-center font-black text-slate-900 bg-slate-50">
                              {ligne.stockProgressif}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className={`p-6 text-center text-slate-400 font-bold italic text-[9.5px] ${cardStyle}`}>
                👆 Veuillez cliquer sur le champ "Article" ci-dessus pour sélectionner un article et afficher ses statistiques.
              </div>
            )}
          </div>
        );
      })()}

      {modeVue === 'rapport' && (
        <div className="space-y-1.5">
          {/* Bloc Rapport mis à jour avec le titre RAPPORT, les zones de dates réduites et le bouton Partenaire ouvrant une modale */}
          <div className={`p-2 space-y-1.5 border-2 border-orange-500/40 ${cardStyle}`}>
            <div className="flex justify-between items-center gap-1 pb-1 border-b border-slate-100">
              <span className="font-extrabold text-[8.5px] uppercase text-orange-600 shrink-0">
                RAPPORT
              </span>

              <div className="flex items-center gap-1 flex-1 justify-end">
                <div className="flex items-center gap-0.5">
                  <span className="text-[7px] font-bold text-slate-500 uppercase">Du</span>
                  <input
                    type="date"
                    disabled={enTrainDeSauvegarder}
                    value={dateDebutRapport}
                    onChange={(e) => setDateDebutRapport(e.target.value)}
                    className={`${inputStyle} font-mono py-0.5 px-0.5 w-[92px] text-[9px]`}
                  />
                </div>
                <div className="flex items-center gap-0.5">
                  <span className="text-[7px] font-bold text-slate-500 uppercase">Au</span>
                  <input
                    type="date"
                    disabled={enTrainDeSauvegarder}
                    value={dateFinRapport}
                    onChange={(e) => setDateFinRapport(e.target.value)}
                    className={`${inputStyle} font-mono py-0.5 px-0.5 w-[92px] text-[9px]`}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 pt-0.5">
              <div>
                <div
                  onClick={() => {
                    if (enTrainDeSauvegarder) return;
                    setRechercheModalDepotRapport('');
                    setAfficherModalSelectionDepotRapport(true);
                  }}
                  className={selectTriggerStyle}
                >
                  <span className="truncate uppercase text-orange-600">
                    Partenaire: {obtenirNomDepotParId(depotRapportFiltre)}
                  </span>
                  <span className="text-[8px] text-slate-400 shrink-0 ml-0.5">🔍</span>
                </div>
              </div>

              <div>
                <div className="relative">
                  <input
                    type="text"
                    disabled={enTrainDeSauvegarder}
                    value={rechercheRapportInput}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setRechercheRapportInput(e.target.value)}
                    placeholder="SAISIR UN ARTICLE..."
                    className={`${inputStyle} pl-5 py-1 text-[9px]`}
                  />
                  <span className="absolute left-1.5 top-1 text-slate-400 text-[8px]">🔍</span>
                  {rechercheRapportInput && (
                    <button
                      type="button"
                      onClick={() => setRechercheRapportInput('')}
                      className="absolute right-1.5 top-0.5 text-slate-400 hover:text-slate-700 font-black text-[9px]"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className={`overflow-hidden ${cardStyle}`}>
            <div className="p-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold uppercase text-slate-800 text-[9.5px]">📊 RAPPORT DE STOCK PAR ARTICLE</span>
                <span className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded font-bold text-[9px]">{articlesRapportTries.length}</span>
              </div>
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={() => imprimerOngletActif('RAPPORT DE STOCK')}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-2 py-1 rounded text-[8.5px] flex items-center gap-1 cursor-pointer"
              >
                <span>🖨️ Imp.</span>
              </button>
            </div>

            <div id="section-impression-rapport" className="overflow-x-auto">
              <table className="w-full text-left text-[9.5px] border-collapse">
                <thead>
                  <tr className={tableHeaderStyle}>
                    <th 
                      onClick={() => !enTrainDeSauvegarder && gererTriRapport('Designation')}
                      className="p-2 cursor-pointer hover:text-orange-600 select-none whitespace-nowrap"
                    >
                      Désignation {colonneTriRapport === 'Designation' && (ordreTriRapport === 'asc' ? '▲' : '▼')}
                    </th>
                    <th className="p-2 text-center">Stock Initial</th>
                    <th className="p-2 text-center text-emerald-700">Entrées</th>
                    <th className="p-2 text-center">Stock Total</th>
                    <th className="p-2 text-center text-rose-700">Sorties</th>
                    <th className="p-2 text-center">Stock Réel</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[9.5px] text-slate-900 bg-white">
                  {articlesRapportTries.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-4 text-center italic font-bold text-slate-400">Aucun article ne correspond à votre recherche.</td>
                    </tr>
                  ) : (
                    articlesRapportTries.map((art) => {
                      const artId = art.id_article || art.id;
                      const rep = calculerLigneRapportStock(artId);

                      return (
                        <tr key={artId} className="transition hover:bg-orange-50/70">
                          <td className="p-2 font-extrabold uppercase text-slate-900">{art.Designation || art.designation}</td>
                          <td className="p-2 text-center font-bold text-slate-700">{rep.stockInitial}</td>
                          <td className="p-2 text-center font-black text-emerald-600">+{rep.entrees}</td>
                          <td className="p-2 text-center font-bold text-slate-900">{rep.stockTotal}</td>
                          <td className="p-2 text-center font-black text-rose-600">-{rep.sorties}</td>
                          <td className="p-2 text-center font-black text-slate-900 bg-slate-50">{rep.stockReel}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ⚙️ BOÎTE DE DIALOGUE "OPTION" */}
      {afficherModalOptions && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col p-5 space-y-4 text-slate-900">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-black uppercase text-xs flex items-center gap-1.5 text-slate-900">
                <span>⚙️</span> OPTIONS DU CATALOGUE ARTICLES [{moduleActuel}]
              </h4>
              <button
                type="button"
                onClick={() => setAfficherModalOptions(false)}
                className="text-slate-400 hover:text-slate-700 font-black text-sm px-2 py-1 rounded-md hover:bg-slate-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-[11px] font-semibold text-slate-600 leading-relaxed">
              Sélectionnez une option pour gérer l'importation ou l'exportation de vos catalogues d'articles.
            </p>

            <div className="grid grid-cols-1 gap-2.5 pt-1">
              <button
                type="button"
                onClick={telechargerModeleExcel}
                className="p-3.5 rounded-xl border-2 border-orange-200 bg-orange-50 hover:bg-orange-100/70 transition flex items-center gap-3 text-left cursor-pointer group"
              >
                <span className="text-xl p-2 bg-white rounded-lg shadow-2xs border border-orange-200 group-hover:scale-105 transition">
                  📊
                </span>
                <div>
                  <span className="block font-black text-[11px] uppercase text-orange-900">
                    1. Télécharger le modèle
                  </span>
                  <span className="text-[9.5px] font-bold text-orange-700">
                    Modèle à télécharger pour remplir vos différents articles et les réimporter ensuite.
                  </span>
                </div>
              </button>

              <label
                className="p-3.5 rounded-xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 transition flex items-center gap-3 text-left cursor-pointer group"
              >
                <span className="text-xl p-2 bg-white rounded-lg shadow-2xs border border-slate-200 group-hover:scale-105 transition">
                  📂
                </span>
                <div className="flex-1">
                  <span className="block font-black text-[11px] uppercase text-slate-900">
                    2. Importer le fichier rempli
                  </span>
                  <span className="text-[9.5px] font-bold text-slate-500">
                    Sélectionnez votre fichier CSV/Excel configuré pour l'importer.
                  </span>
                </div>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={gererFichierImport}
                  className="hidden"
                  disabled={enTrainDeSauvegarder}
                />
              </label>

              <button
                type="button"
                onClick={exporterCatalogueExcel}
                className="p-3.5 rounded-xl border-2 border-slate-200 bg-slate-50 hover:bg-slate-100 transition flex items-center gap-3 text-left cursor-pointer group"
              >
                <span className="text-xl p-2 bg-white rounded-lg shadow-2xs border border-slate-200 group-hover:scale-105 transition">
                  📤
                </span>
                <div>
                  <span className="block font-black text-[11px] uppercase text-slate-900">
                    3. Exporter le catalogue existant
                  </span>
                  <span className="text-[9.5px] font-bold text-slate-500">
                    Téléchargez la liste de vos articles actuels pour les analyser ou les modifier sur Excel.
                  </span>
                </div>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setAfficherModalOptions(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-2 rounded-xl text-[10px] transition cursor-pointer"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 📥 MODALE DE PRÉVISUALISATION DE L'IMPORTATION */}
      {afficherModalImport && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-start justify-center pt-4 z-50 p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
            
            <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex justify-between items-center gap-2">
              <div>
                <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                  <span>📥</span> PRÉVISUALISATION DE L'IMPORTATION [{moduleActuel}]
                </h4>
                <p className="text-[9.5px] font-bold text-slate-500 mt-0.5">
                  Fichier : <span className="text-slate-800">{nomFichierImport}</span> •{' '}
                  <span className="text-orange-600 font-black">{donneesImportees.length} article(s) prêt(s) à importer</span>
                </p>
              </div>
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={() => {
                  setAfficherModalImport(false);
                  setDonneesImportees([]);
                }}
                className="text-slate-400 hover:text-slate-700 font-black text-sm px-2 py-1 rounded-md hover:bg-slate-200 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="px-3.5 py-2 bg-amber-50 border-b border-amber-200 text-[9px] font-bold text-amber-900 flex flex-wrap items-center justify-between gap-2">
              <span>
                💡 Le rattachement s’effectue automatiquement via l'ID de la famille (Colonne B).
              </span>
              <span className="bg-white px-2 py-0.5 rounded border border-amber-300 font-black">
                Total : {donneesImportees.length} lignes
              </span>
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full text-left text-[9.5px] border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 uppercase text-[8.5px] font-extrabold border-b border-slate-200">
                  <tr>
                    <th className="p-2 text-center w-10">#</th>
                    <th className="p-2">Désignation</th>
                    <th className="p-2">Famille (ID / Nom)</th>
                    <th className="p-2 text-right">PV</th>
                    {moduleActuel !== 'LIVRAISON' && <th className="p-2 text-right">PA</th>}
                    <th className="p-2 text-center">Seuil</th>
                    <th className="p-2">Code-Barres</th>
                    <th className="p-2 text-center">Suivi Stock</th>
                    <th className="p-2 text-center w-10">Retirer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-900 bg-white">
                  {donneesImportees.map((item, idx) => {
                    const p = item.payload;
                    return (
                      <tr key={item._tempId} className="hover:bg-orange-50/50 transition">
                        <td className="p-2 text-center font-mono font-bold text-slate-400">{idx + 1}</td>
                        <td className="p-2 font-black uppercase text-slate-900">{p.Designation}</td>
                        <td className="p-2">
                          <span className={`px-1.5 py-0.5 rounded text-[8.5px] font-bold border ${
                            item._familleReconnue
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}>
                            ID: {p.Famille} ({item._familleNomAffichee})
                          </span>
                        </td>
                        <td className="p-2 text-right font-black text-emerald-600">{p.Prix_Vente}</td>
                        {moduleActuel !== 'LIVRAISON' && (
                          <td className="p-2 text-right font-bold text-slate-700">{p.Prix_Achat}</td>
                        )}
                        <td className="p-2 text-center font-bold text-slate-700">{p.Seuil_Alerte}</td>
                        <td className="p-2 font-mono text-slate-600">{p.Code_Barre || '-'}</td>
                        <td className="p-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black border ${
                            p.suivi_stock
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {p.suivi_stock ? 'OUI' : 'NON'}
                          </span>
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            disabled={enTrainDeSauvegarder}
                            onClick={() => retirerLigneImport(item._tempId)}
                            title="Retirer cette ligne de l'importation"
                            className="text-rose-500 hover:text-rose-700 font-black px-1.5 py-0.5 rounded hover:bg-rose-50 transition cursor-pointer"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-between items-center gap-2">
              <button
                type="button"
                disabled={enTrainDeSauvegarder}
                onClick={() => {
                  setAfficherModalImport(false);
                  setDonneesImportees([]);
                }}
                className="bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold px-4 py-2 rounded-xl text-[10px] transition cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={enTrainDeSauvegarder || donneesImportees.length === 0}
                onClick={validerImportationMassive}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black px-5 py-2 rounded-xl text-[10px] uppercase shadow-sm transition cursor-pointer flex items-center gap-1.5"
              >
                <span>✅</span>
                {enTrainDeSauvegarder
                  ? 'Importation en cours...'
                  : `Valider et importer ${donneesImportees.length} article(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE FORMULAIRE ARTICLE */}
      {afficherModalForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-3.5 border-b border-slate-100 flex justify-between items-center">
              <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                <span>📦</span> {articleEnEdition ? `MODIFIER UN ARTICLE [${moduleActuel}]` : `CRÉER UN ARTICLE [${moduleActuel}]`}
              </h4>
              <button disabled={enTrainDeSauvegarder} onClick={() => { annulerForm(); setAfficherModalForm(false); }} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100 transition cursor-pointer">✕</button>
            </div>

            <form onSubmit={preparerEnregistrementArticle} className="p-4 space-y-3 overflow-y-auto text-[10px]">
              <div className="grid grid-cols-[4fr_7fr] gap-2">
                <div>
                  <label className="block font-bold text-[8px] text-slate-600 uppercase mb-1">Famille *</label>
                  <select
                    required
                    disabled={enTrainDeSauvegarder}
                    value={nouveauArticle.Famille || (familles.length > 0 ? familles[0].id : '')}
                    onChange={(e) => {
                      const famIdChoisie = e.target.value;
                      const famObjTrouvee = familles.find(f => String(f.id) === String(famIdChoisie));
                      setNouveauArticle({ 
                        ...nouveauArticle, 
                        Famille: famIdChoisie,
                        suivi_stock: articleEnEdition ? nouveauArticle.suivi_stock : (famObjTrouvee ? (famObjTrouvee.suivi_stock ?? true) : true)
                      });
                      setTimeout(() => {
                        if (designationInputRef.current) {
                          designationInputRef.current.focus();
                          designationInputRef.current.select();
                        }
                      }, 50);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">-- Choisir --</option>
                    {familles.map((fam) => (
                      <option key={fam.id} value={fam.id}>
                        🏷️ {fam.nom_famille || fam.Nom_Famille} (ID: {fam.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[8px] text-slate-600 uppercase mb-1">Désignation *</label>
                  <input
                    ref={designationInputRef}
                    autoFocus
                    type="text"
                    required
                    disabled={enTrainDeSauvegarder}
                    list="liste-suggestions-articles"
                    value={nouveauArticle.Designation}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Designation: e.target.value.toUpperCase() })}
                    placeholder="EX: JUS 250ML"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-black text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <datalist id="liste-suggestions-articles">
                    {toutesLesSuggestionsArticles.map((nomArt, index) => (
                      <option key={index} value={nomArt} />
                    ))}
                  </datalist>
                </div>
              </div>

              {moduleActuel !== 'LIVRAISON' ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-[8px] text-slate-600 uppercase mb-1">PA</label>
                    <input
                      type="number"
                      disabled={enTrainDeSauvegarder}
                      value={nouveauArticle.Prix_Achat}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNouveauArticle({ ...nouveauArticle, Prix_Achat: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-black text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[8px] text-slate-600 uppercase mb-1">PV *</label>
                    <input
                      type="number"
                      required
                      disabled={enTrainDeSauvegarder}
                      value={nouveauArticle.Prix_Vente}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNouveauArticle({ ...nouveauArticle, Prix_Vente: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-black text-emerald-600"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-[8px] text-slate-600 uppercase mb-1">PV *</label>
                  <input
                    type="number"
                    required
                    disabled={enTrainDeSauvegarder}
                    value={nouveauArticle.Prix_Vente}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Prix_Vente: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-black text-emerald-600"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-[8px] text-slate-600 uppercase mb-1">S.ALERTE</label>
                  <input
                    type="number"
                    disabled={enTrainDeSauvegarder}
                    value={nouveauArticle.Seuil_Alerte}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Seuil_Alerte: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-black text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[8px] text-slate-600 uppercase mb-1">CODE-BARRES</label>
                  <input
                    type="text"
                    disabled={enTrainDeSauvegarder}
                    value={nouveauArticle.Code_Barre}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, Code_Barre: e.target.value.toUpperCase() })}
                    placeholder="600123"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-bold font-mono text-slate-900 uppercase"
                  />
                </div>
              </div>

              {isGestionPerissablesActive() && (
                <div>
                  <label className="block font-bold text-[8px] text-slate-600 uppercase mb-1">Date Péremption</label>
                  <input
                    type="date"
                    disabled={enTrainDeSauvegarder}
                    value={nouveauArticle.date_peremption}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, date_peremption: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-mono font-bold text-slate-900"
                  />
                </div>
              )}

              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div>
                  <span className="block font-black text-[9.5px] uppercase text-slate-900">Suivi de stock (Article)</span>
                  <span className="text-[8.5px] font-semibold text-slate-500">Hérité de la famille, modifiable pour cet article.</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={enTrainDeSauvegarder}
                    checked={nouveauArticle.suivi_stock}
                    onChange={(e) => setNouveauArticle({ ...nouveauArticle, suivi_stock: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-600"></div>
                </label>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-[8px] text-slate-600 uppercase">Photo de l'article</label>
                
                {nouveauArticle.Photo ? (
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                    <div className="shrink-0">
                      <img
                        src={nouveauArticle.Photo}
                        alt="Photo de l'article"
                        className="w-14 h-14 object-cover rounded-xl border border-slate-200 shadow-2xs"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 shrink-0">
                      <label className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg font-black text-[10px] cursor-pointer flex items-center justify-center gap-1 transition">
                        <span>📷 {uploadingPhoto ? 'Envoi...' : 'Modifier'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={gererUploadImage}
                          className="hidden"
                          disabled={uploadingPhoto || enTrainDeSauvegarder}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={enTrainDeSauvegarder}
                        onClick={() => setNouveauArticle({ ...nouveauArticle, Photo: '' })}
                        className="text-rose-600 hover:text-rose-700 font-bold text-[9px] text-center underline cursor-pointer"
                      >
                        Retirer la photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      disabled={enTrainDeSauvegarder}
                      value={nouveauArticle.Photo}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => setNouveauArticle({ ...nouveauArticle, Photo: e.target.value })}
                      placeholder="https://lien-image.com/photo.jpg"
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-900 truncate"
                    />

                    <label className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-xl font-black text-[10px] cursor-pointer flex items-center justify-center transition shrink-0">
                      <span>📷 Filmer</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={gererUploadImage}
                        className="hidden"
                        disabled={uploadingPhoto || enTrainDeSauvegarder}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="qrCheck"
                  disabled={enTrainDeSauvegarder}
                  checked={nouveauArticle.Disponible_Menu_QR}
                  onChange={(e) => setNouveauArticle({ ...nouveauArticle, Disponible_Menu_QR: e.target.checked })}
                  className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500 cursor-pointer"
                />
                <label htmlFor="qrCheck" className="text-[10px] font-black cursor-pointer select-none leading-tight text-slate-900">
                  📱 Visible au Scan Code QR par les clients
                </label>
              </div>

              <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                {articleEnEdition && permissions.suppression ? (
                  <button 
                    type="button" 
                    disabled={enTrainDeSauvegarder}
                    onClick={supprimerArticleDepuisFormulaire} 
                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] shadow-2xs cursor-pointer transition"
                  >
                    {enTrainDeSauvegarder ? 'Patientez...' : '🗑️ Supprimer'}
                  </button>
                ) : <div />}

                <div className="flex gap-2 ml-auto">
                  <button 
                    type="button" 
                    disabled={enTrainDeSauvegarder} 
                    onClick={() => { annulerForm(); setAfficherModalForm(false); }} 
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold px-3.5 py-1.5 rounded-lg text-[10px] transition cursor-pointer"
                  >
                    Annuler
                  </button>
                  
                  {permissions.modification && (
                    <button 
                      type="submit" 
                      disabled={enTrainDeSauvegarder}
                      className="font-black px-4 py-1.5 rounded-lg text-[10px] shadow-2xs transition cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white"
                    >
                      {enTrainDeSauvegarder ? 'Enregistrement...' : '✅ Enregistrer'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE UNIFIÉE */}
      {etatModale.ouverte && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 space-y-4 text-center shadow-2xl text-slate-900">
            
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl font-black border ${
              etatModale.type === 'confirmation' ? 'bg-orange-50 text-orange-600 border-orange-200' :
              etatModale.type === 'succes' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-rose-50 text-rose-600 border-rose-200'
            }`}>
              {etatModale.type === 'confirmation' ? '❓' :
               etatModale.type === 'succes' ? '✓' : '⚠️'}
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-xs uppercase tracking-wider text-slate-900">
                {etatModale.titre}
              </h4>
              <p className="text-[11px] font-semibold leading-relaxed text-slate-600">
                {etatModale.message}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              {etatModale.type === 'confirmation' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setEtatModale({ ...etatModale, ouverte: false })}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold py-2 rounded-xl text-[10px] transition cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const action = etatModale.onConfirmer;
                      setEtatModale({ ...etatModale, ouverte: false });
                      if (action) action();
                    }}
                    className="flex-1 font-black py-2 rounded-xl text-[10px] shadow-2xs transition cursor-pointer bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    Confirmer
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setEtatModale({ ...etatModale, ouverte: false })}
                  className="w-full font-black py-2 rounded-xl text-[10px] transition shadow-2xs cursor-pointer bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Compris 👍
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* MODALE DE SÉLECTION D'ARTICLE */}
      {afficherModalSelectionArticle && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                <span>🔍</span> SÉLECTIONNER UN ARTICLE [{moduleActuel}]
              </h4>
              <button disabled={enTrainDeSauvegarder} onClick={() => setAfficherModalSelectionArticle(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100 transition cursor-pointer">✕</button>
            </div>

            <input
              type="text"
              autoFocus
              disabled={enTrainDeSauvegarder}
              value={rechercheModalArticle}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setRechercheModalArticle(e.target.value.toUpperCase())}
              placeholder="RECHERCHER..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500"
            />

            <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
              {articlesModalFiltres.length === 0 ? (
                <div className="col-span-2 py-6 text-center text-slate-400 font-bold italic text-xs">Aucun article trouvé.</div>
              ) : (
                articlesModalFiltres.map((art) => {
                  const idA = String(art.id_article || art.id);
                  const nomArt = art.Designation || art.designation || '';

                  return (
                    <div
                      key={idA}
                      onClick={() => {
                        if (enTrainDeSauvegarder) return;
                        setArticleSelectionneStatId(idA);
                        setAfficherModalSelectionArticle(false);
                      }}
                      className="p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 transition cursor-pointer flex flex-col justify-between shadow-2xs bg-white"
                    >
                      <span className="font-black text-xs text-slate-900 uppercase truncate">{nomArt}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE SÉLECTION DE DÉPÔT */}
      {afficherModalSelectionDepot && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                <span>🔍</span> SÉLECTIONNER UN {libelleDepotPartenaire.toUpperCase()}
              </h4>
              <button disabled={enTrainDeSauvegarder} onClick={() => setAfficherModalSelectionDepot(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100 transition cursor-pointer">✕</button>
            </div>

            <input
              type="text"
              autoFocus
              disabled={enTrainDeSauvegarder}
              value={rechercheModalDepot}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setRechercheModalDepot(e.target.value.toUpperCase())}
              placeholder="RECHERCHER..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500"
            />

            <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
              {depotsModalFiltres.length === 0 ? (
                <div className="col-span-2 py-6 text-center text-slate-400 font-bold italic text-xs">Aucun résultat.</div>
              ) : (
                depotsModalFiltres.map((dep) => {
                  const idD = String(dep.id);
                  const nomD = dep.nom_depot || dep.Nom_Depot || '';

                  return (
                    <div
                      key={idD}
                      onClick={() => {
                        if (enTrainDeSauvegarder) return;
                        setDepotStatFiltre(idD);
                        setEmplacementStatFiltre('TOUS');
                        setAfficherModalSelectionDepot(false);
                      }}
                      className={`p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 transition cursor-pointer flex flex-col justify-between shadow-2xs ${idD === 'TOUS' ? 'col-span-2 bg-slate-50 text-center' : 'bg-white'}`}
                    >
                      <span className={`font-black text-xs uppercase truncate ${idD === 'TOUS' ? 'text-slate-500' : 'text-slate-900'}`}>{nomD}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE SÉLECTION DE PARTENAIRE (RAPPORT) */}
      {afficherModalSelectionDepotRapport && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                <span>🔍</span> SÉLECTIONNER UN {libelleDepotPartenaire.toUpperCase()}
              </h4>
              <button disabled={enTrainDeSauvegarder} onClick={() => setAfficherModalSelectionDepotRapport(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100 transition cursor-pointer">✕</button>
            </div>

            <input
              type="text"
              autoFocus
              disabled={enTrainDeSauvegarder}
              value={rechercheModalDepotRapport}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setRechercheModalDepotRapport(e.target.value.toUpperCase())}
              placeholder="RECHERCHER..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500"
            />

            <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
              {depotsRapportModalFiltres.length === 0 ? (
                <div className="col-span-2 py-6 text-center text-slate-400 font-bold italic text-xs">Aucun résultat.</div>
              ) : (
                depotsRapportModalFiltres.map((dep) => {
                  const idD = String(dep.id);
                  const nomD = dep.nom_depot || dep.Nom_Depot || '';

                  return (
                    <div
                      key={idD}
                      onClick={() => {
                        if (enTrainDeSauvegarder) return;
                        setDepotRapportFiltre(idD);
                        setAfficherModalSelectionDepotRapport(false);
                      }}
                      className={`p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 transition cursor-pointer flex flex-col justify-between shadow-2xs ${idD === 'TOUS' ? 'col-span-2 bg-slate-50 text-center' : 'bg-white'}`}
                    >
                      <span className={`font-black text-xs uppercase truncate ${idD === 'TOUS' ? 'text-slate-500' : 'text-slate-900'}`}>{nomD}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE SÉLECTION D'EMPLACEMENT */}
      {afficherModalSelectionEmp && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                <span>🔍</span> SÉLECTIONNER UN {libelleLivreurOuEmplacement.toUpperCase()}
              </h4>
              <button disabled={enTrainDeSauvegarder} onClick={() => setAfficherModalSelectionEmp(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100 transition cursor-pointer">✕</button>
            </div>

            <input
              type="text"
              autoFocus
              disabled={enTrainDeSauvegarder}
              value={rechercheModalEmp}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setRechercheModalEmp(e.target.value.toUpperCase())}
              placeholder="RECHERCHER..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500"
            />

            <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
              {emplacementsModalFiltres.length === 0 ? (
                <div className="col-span-2 py-6 text-center text-slate-400 font-bold italic text-xs">Aucun résultat.</div>
              ) : (
                emplacementsModalFiltres.map((emp) => {
                  const idE = String(emp.id);
                  const nomE = emp.nom_emplacement || '';

                  return (
                    <div
                      key={idE}
                      onClick={() => {
                        if (enTrainDeSauvegarder) return;
                        setEmplacementStatFiltre(idE);
                        setAfficherModalSelectionEmp(false);
                      }}
                      className={`p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 transition cursor-pointer flex flex-col justify-between shadow-2xs ${idE === 'TOUS' ? 'col-span-2 bg-slate-50 text-center' : 'bg-white'}`}
                    >
                      <span className={`font-black text-xs uppercase truncate ${idE === 'TOUS' ? 'text-slate-500' : 'text-slate-900'}`}>{nomE}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE SÉLECTION DE FAMILLE */}
      {afficherModalFamilleCat && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                <span>🔍</span> SÉLECTIONNER UNE FAMILLE
              </h4>
              <button disabled={enTrainDeSauvegarder} onClick={() => setAfficherModalFamilleCat(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100 transition cursor-pointer">✕</button>
            </div>

            <input
              type="text"
              autoFocus
              disabled={enTrainDeSauvegarder}
              value={rechercheModalFamilleCat}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setRechercheModalFamilleCat(e.target.value.toUpperCase())}
              placeholder="RECHERCHER..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500"
            />

            <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
              {famillesCatModalFiltres.length === 0 ? (
                <div className="col-span-2 py-6 text-center text-slate-400 font-bold italic text-xs">Aucun résultat.</div>
              ) : (
                famillesCatModalFiltres.map((fam) => {
                  const idF = String(fam.id);
                  const nomF = fam.nom_famille || fam.Nom_Famille || 'Toutes';

                  return (
                    <div
                      key={idF}
                      onClick={() => {
                        if (enTrainDeSauvegarder) return;
                        setFamilleFiltre(idF);
                        setAfficherModalFamilleCat(false);
                      }}
                      className={`p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 transition cursor-pointer flex flex-col justify-between shadow-2xs ${idF === 'TOUTES' ? 'col-span-2 bg-slate-50 text-center' : 'bg-white'}`}
                    >
                      <span className={`font-black text-xs uppercase truncate ${idF === 'TOUTES' ? 'text-slate-500' : 'text-slate-900'}`}>{nomF}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE SÉLECTION DE DÉPÔT (CATALOGUE) */}
      {afficherModalDepotCat && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                <span>🔍</span> SÉLECTIONNER UN {libelleDepotPartenaire.toUpperCase()}
              </h4>
              <button disabled={enTrainDeSauvegarder} onClick={() => setAfficherModalDepotCat(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100 transition cursor-pointer">✕</button>
            </div>

            <input
              type="text"
              autoFocus
              disabled={enTrainDeSauvegarder}
              value={rechercheModalDepotCat}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setRechercheModalDepotCat(e.target.value.toUpperCase())}
              placeholder="RECHERCHER..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500"
            />

            <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
              {depotsCatModalFiltres.length === 0 ? (
                <div className="col-span-2 py-6 text-center text-slate-400 font-bold italic text-xs">Aucun résultat.</div>
              ) : (
                depotsCatModalFiltres.map((dep) => {
                  const idD = String(dep.id);
                  const nomD = dep.nom_depot || dep.Nom_Depot || '';

                  return (
                    <div
                      key={idD}
                      onClick={() => {
                        if (enTrainDeSauvegarder) return;
                        setDepotFiltre(idD);
                        setEmplacementFiltre('TOUS');
                        setAfficherModalDepotCat(false);
                      }}
                      className={`p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 transition cursor-pointer flex flex-col justify-between shadow-2xs ${idD === 'TOUS' ? 'col-span-2 bg-slate-50 text-center' : 'bg-white'}`}
                    >
                      <span className={`font-black text-xs uppercase truncate ${idD === 'TOUS' ? 'text-slate-500' : 'text-slate-900'}`}>{nomD}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE SÉLECTION D'EMPLACEMENT (CATALOGUE) */}
      {afficherModalEmpCat && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-6 z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-3 p-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                <span>🔍</span> SÉLECTIONNER UN {libelleLivreurOuEmplacement.toUpperCase()}
              </h4>
              <button disabled={enTrainDeSauvegarder} onClick={() => setAfficherModalEmpCat(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm px-1.5 py-0.5 rounded-md hover:bg-slate-100 transition cursor-pointer">✕</button>
            </div>

            <input
              type="text"
              autoFocus
              disabled={enTrainDeSauvegarder}
              value={rechercheModalEmpCat}
              onFocus={(e) => e.target.select()}
              onChange={(e) => setRechercheModalEmpCat(e.target.value.toUpperCase())}
              placeholder="RECHERCHER..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-xs shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500"
            />

            <div className="max-h-[350px] overflow-y-auto grid grid-cols-2 gap-2 pr-1">
              {emplacementsCatModalFiltres.length === 0 ? (
                <div className="col-span-2 py-6 text-center text-slate-400 font-bold italic text-xs">Aucun résultat.</div>
              ) : (
                emplacementsCatModalFiltres.map((emp) => {
                  const idE = String(emp.id);
                  const nomE = emp.nom_emplacement || '';

                  return (
                    <div
                      key={idE}
                      onClick={() => {
                        if (enTrainDeSauvegarder) return;
                        setEmplacementFiltre(idE);
                        setAfficherModalEmpCat(false);
                      }}
                      className={`p-3 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/50 transition cursor-pointer flex flex-col justify-between shadow-2xs ${idE === 'TOUS' ? 'col-span-2 bg-slate-50 text-center' : 'bg-white'}`}
                    >
                      <span className={`font-black text-xs uppercase truncate ${idE === 'TOUS' ? 'text-slate-500' : 'text-slate-900'}`}>{nomE}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}