'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/lib/usePermissions';
import { localSync } from '../../lib/localSync';

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
  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();
  const cleCacheFournisseurs = `fournisseurs_${entrepriseId}_${moduleActuel}`;
  const estModeLivraison = moduleActuel === 'LIVRAISON';
  const libelleEntite = estModeLivraison ? 'PARTENAIRES' : 'FOURNISSEURS';

  const [utilisateurConnecte, setUtilisateurConnecte] = useState('');
  const [emailConnecte, setEmailConnecte] = useState('');
  const nomInputRef = useRef(null);

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
    lecture: verifierPermission('fournisseurs', estSuperAdmin),
    creation: verifierCreation('fournisseurs', estSuperAdmin),
    modification: verifierModification('fournisseurs', estSuperAdmin),
    suppression: verifierSuppression('fournisseurs', estSuperAdmin),
  };

  const [partenaires, setPartenaires] = useState(() => {
    if (typeof window !== 'undefined') {
      return localSync.recupererDonneesLocales(cleCacheFournisseurs) || [];
    }
    return [];
  });

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

  const [partenaireHistoriqueId, setPartenaireHistoriqueId] = useState(() => {
    if (typeof window !== 'undefined') {
      const cached = localSync.recupererDonneesLocales(cleCacheFournisseurs);
      return cached && cached.length > 0 ? cached[0].id : '';
    }
    return '';
  });

  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [factureSelectionnee, setFactureSelectionnee] = useState(null);
  const [montantReglementSaisi, setMontantReglementSaisi] = useState('');

  const [afficherForm, setAfficherForm] = useState(false);
  const [partenaireEnEdition, setPartenaireEnEdition] = useState(null);
  const [recherche, setRecherche] = useState('');

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

  const chargerPermissionsEtDonnees = async (silencieux = false) => {
    if (!silencieux && partenaires.length === 0) setChargement(true);
    try {
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
      localSync.sauvegarderDonneesLocales(cleCacheFournisseurs, listPartenaires);

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
    localSync.synchroniserVersCloud(supabase);
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

    if (partenaireEnEdition && !permissions.modification) {
      alert('⛔ Action non autorisée : Modification interdite par votre profil.');
      return;
    }
    if (!partenaireEnEdition && !permissions.creation) {
      alert('⛔ Action non autorisée : Création interdite par votre profil.');
      return;
    }

    const paysObj = LISTE_PAYS.find(p => p.code === nouveauPartenaire.pays) || LISTE_PAYS[0];
    const chiffresPur = (nouveauPartenaire.telephone || '').replace(/[^0-9]/g, '');

    if (chiffresPur.length > 0 && chiffresPur.length !== paysObj.longueur) {
      alert(`⚠️ Numéro invalide pour ${paysObj.code}. Le numéro doit comporter exactement ${paysObj.longueur} chiffres.`);
      return;
    }

    const numeroComplet = chiffresPur ? `${paysObj.indicatif}${chiffresPur}` : '';
    const nomPartenaireClean = (nouveauPartenaire.nom_fournisseur || '').trim().toUpperCase();
    
    // En mode livraison, le dépôt est strictement lié au nom du partenaire
    const nomDepotAssocie = estModeLivraison ? nomPartenaireClean : (nouveauPartenaire.id_depot || nomPartenaireClean).trim().toUpperCase();

    setEnTrainDeSauvegarder(true);
    try {
      let depotIdFinal = nouveauPartenaire.id_depot;

      if (estModeLivraison && nouveauPartenaire.statut_stockage === 'AVEC_STOCKAGE') {
        const { data: depotExistant } = await supabase
          .from('depots_stock')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .eq('module', moduleActuel)
          .ilike('nom_depot', nomDepotAssocie)
          .maybeSingle();

        if (depotExistant) {
          depotIdFinal = depotExistant.id || depotExistant.ID;
        } else {
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

          if (errDepot) {
            localSync.ajouterFileAttente('INSERT', 'depots_stock', payloadNouveauDepot);
          } else if (depotCree) {
            depotIdFinal = depotCree.id || depotCree.ID;
          }
        }
      }

      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        nom_fournisseur: nomPartenaireClean,
        statut_stockage: nouveauPartenaire.statut_stockage,
        id_depot: nouveauPartenaire.statut_stockage === 'AVEC_STOCKAGE' ? (estModeLivraison ? nomDepotAssocie : depotIdFinal) : null,
        pays: nouveauPartenaire.pays,
        telephone: numeroComplet,
        email: (nouveauPartenaire.email || '').trim().toLowerCase(),
        adresse: (nouveauPartenaire.adresse || '').trim().toUpperCase(),
      };

      if (partenaireEnEdition) {
        payload.id = partenaireEnEdition.id;
        let { error } = await supabase
          .from('fournisseurs')
          .update(payload)
          .eq('id', partenaireEnEdition.id);

        if (error) {
          localSync.ajouterFileAttente('UPDATE', 'fournisseurs', payload);
        }

        const listeMaj = partenaires.map(p => p.id === partenaireEnEdition.id ? { ...p, ...payload } : p);
        setPartenaires(listeMaj);
        localSync.sauvegarderDonneesLocales(cleCacheFournisseurs, listeMaj);

        alert('Mise à jour réussie !');
      } else {
        const idTemp = 'temp_' + Date.now();
        const nouvelObjet = { ...payload, id: idTemp, solde_dette: 0, created_at: new Date().toISOString() };
        
        let { error } = await supabase.from('fournisseurs').insert([payload]);

        if (error) {
          localSync.ajouterFileAttente('INSERT', 'fournisseurs', payload);
        }

        const listeMaj = [nouvelObjet, ...partenaires];
        setPartenaires(listeMaj);
        localSync.sauvegarderDonneesLocales(cleCacheFournisseurs, listeMaj);

        alert('Enregistrement réussi !');
      }

      localStorage.removeItem(cleCacheFournisseurs);
      annulerForm();
      await chargerPermissionsEtDonnees(true);
    } catch (err) {
      alert('Erreur : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const ouvrirEdition = (partenaire) => {
    if (enTrainDeSauvegarder) return;
    if (!permissions.modification) {
      alert('⛔ Action non autorisée : Modification interdite par votre profil.');
      return;
    }
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
      id_depot: estModeLivraison ? (partenaire.nom_fournisseur || partenaire.nom || '') : (partenaire.id_depot || ''),
    });
    setAfficherForm(true);

    setTimeout(() => {
      if (nomInputRef.current) {
        nomInputRef.current.focus();
        nomInputRef.current.select();
      }
    }, 50);
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
    if (!permissions.suppression) {
      alert('⛔ Action non autorisée : Suppression interdite par votre profil.');
      return;
    }

    setEnTrainDeSauvegarder(true);
    try {
      const partenaireIdStr = String(partenaireEnEdition.id);
      const partenaireNomStr = String(partenaireEnEdition.nom_fournisseur || partenaireEnEdition.nom || '').trim().toUpperCase();

      const [resAppro, resBC] = await Promise.all([
        supabase.from('approvisionnements').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('bons_commande_fournisseurs').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel)
      ]);

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
        alert(`❌ SUPPRESSION BLOQUÉE : Cet élément ("${partenaireNomStr}") possède déjà ${totalOperations} opération(s).`);
        setEnTrainDeSauvegarder(false);
        return;
      }

      if (!confirm(`Voulez-vous vraiment supprimer définitivement "${partenaireNomStr}" ?`)) {
        setEnTrainDeSauvegarder(false);
        return;
      }

      const { error } = await supabase.from('fournisseurs').delete().eq('id', partenaireEnEdition.id);
      if (error) {
        localSync.ajouterFileAttente('DELETE', 'fournisseurs', { id: partenaireEnEdition.id });
      }

      const listeMaj = partenaires.filter(p => p.id !== partenaireEnEdition.id);
      setPartenaires(listeMaj);
      localSync.sauvegarderDonneesLocales(cleCacheFournisseurs, listeMaj);

      localStorage.removeItem(cleCacheFournisseurs);
      alert('Suppression effectuée avec succès.');
      annulerForm();
      await chargerPermissionsEtDonnees(true);
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
  const paysActuelObj = LISTE_PAYS.find(p => p.code === nouveauPartenaire.pays) || LISTE_PAYS[0];

  return (
    <div className="space-y-2.5 text-[11px] font-sans">
      <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-slate-900 uppercase text-xs flex items-center gap-1.5">
            <span>🏢</span> GESTION DES {libelleEntite} ({partenairesAffiches.length} / {partenairesFiltres.length})
          </h3>
          {utilisateurConnecte && (
            <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold border border-slate-200">
              Utilisateur : {utilisateurConnecte}
            </span>
          )}
        </div>
        {permissions.creation && (
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

                setTimeout(() => {
                  if (nomInputRef.current) {
                    nomInputRef.current.focus();
                    nomInputRef.current.select();
                  }
                }, 50);
              }
            }}
            className="bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-2xs text-xs"
          >
            {afficherForm ? '✖' : 'Nouveau'}
          </button>
        )}
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
          {afficherForm && permissions.creation ? (
            <form onSubmit={enregistrerPartenaire} className="bg-white border-2 border-orange-500/50 p-3 rounded-xl space-y-2.5 shadow-md">
              <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                <h4 className="font-extrabold text-orange-600 uppercase text-[10px]">
                  {partenaireEnEdition ? `✏️ Fiche du ${estModeLivraison ? 'partenaire' : 'fournisseur'}` : `➕ Nouveau ${estModeLivraison ? 'partenaire' : 'fournisseur'}`}
                </h4>
                <button type="button" disabled={enTrainDeSauvegarder} onClick={annulerForm} className="text-slate-400 hover:text-slate-700 font-bold text-xs p-0.5">✖</button>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Nom / Raison Sociale *</label>
                  <input
                    ref={nomInputRef}
                    autoFocus
                    type="text"
                    required
                    disabled={enTrainDeSauvegarder}
                    value={nouveauPartenaire.nom_fournisseur}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setNouveauPartenaire({ 
                        ...nouveauPartenaire, 
                        nom_fournisseur: val, 
                        id_depot: estModeLivraison ? val : (!nouveauPartenaire.id_depot || nouveauPartenaire.id_depot === nouveauPartenaire.nom_fournisseur ? val : nouveauPartenaire.id_depot)
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
                      nouveauPartenaire.statut_stockage === 'AVEC_STOCKAGE' ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-xs' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}>
                      <input
                        type="radio"
                        name="statut_stockage"
                        value="AVEC_STOCKAGE"
                        checked={nouveauPartenaire.statut_stockage === 'AVEC_STOCKAGE'}
                        onChange={(e) => setNouveauPartenaire({ ...nouveauPartenaire, statut_stockage: e.target.value, id_depot: estModeLivraison ? nouveauPartenaire.nom_fournisseur : nouveauPartenaire.id_depot })}
                        disabled={enTrainDeSauvegarder}
                        className="accent-orange-600 w-4 h-4 cursor-pointer"
                      />
                      <span>📦 Avec Stockage</span>
                    </label>

                    <label className={`flex items-center gap-2 p-2 rounded border cursor-pointer font-extrabold text-xs transition ${
                      nouveauPartenaire.statut_stockage === 'SANS_STOCKAGE' ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-xs' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
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

                {nouveauPartenaire.statut_stockage === 'AVEC_STOCKAGE' && estModeLivraison && (
                  <div>
                    <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">DÉPÔT ASSOCIÉ (Identique au partenaire)</label>
                    <input
                      type="text"
                      disabled
                      value={nouveauPartenaire.nom_fournisseur}
                      className="w-full bg-slate-100 border border-slate-300 rounded p-1.5 font-extrabold text-slate-800 text-xs shadow-xs uppercase cursor-not-allowed"
                    />
                  </div>
                )}
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
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Tel *</label>
                  <div className="flex items-center bg-white border border-slate-300 rounded overflow-hidden shadow-xs">
                    <span className="bg-slate-100 px-2 py-1.5 text-[11px] font-black text-slate-800 border-r border-slate-300 shrink-0">{paysActuelObj.indicatif}</span>
                    <input
                      type="text"
                      required
                      disabled={enTrainDeSauvegarder}
                      maxLength={paysActuelObj.longueur}
                      value={nouveauPartenaire.telephone}
                      onFocus={(e) => e.target.select()}
                      onChange={gererSaisieTelephone}
                      placeholder="6XXXXXXXX"
                      className="w-full p-1.5 font-mono text-[11px] font-extrabold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end items-center gap-1.5">
                <button type="button" disabled={enTrainDeSauvegarder} onClick={annulerForm} className="bg-slate-200 text-slate-800 font-black px-3 py-1.5 rounded text-[10px]">Annuler</button>
                {permissions.modification && (
                  <button type="submit" disabled={enTrainDeSauvegarder} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-1.5 rounded text-[10px] shadow-xs">
                    {enTrainDeSauvegarder ? 'Enregistrement...' : (partenaireEnEdition ? 'Mettre à jour' : 'Enregistrer')}
                  </button>
                )}
              </div>
            </form>
          ) : (
            <div className="space-y-2">
              <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                <input
                  type="text"
                  disabled={enTrainDeSauvegarder}
                  value={recherche}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setRecherche(e.target.value.toUpperCase())}
                  placeholder="RECHERCHER..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-extrabold uppercase text-slate-900 text-xs shadow-xs"
                />
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                <table className="w-full text-left text-xs table-fixed">
                  <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 uppercase text-[9px] font-black select-none">
                    <tr>
                      <th onClick={() => gererTri('nom_fournisseur')} className="p-2.5 w-[50%] cursor-pointer hover:bg-slate-200 transition">Nom / Raison Sociale</th>
                      <th className="p-2.5 w-[50%]">Dépôt Source / Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[10.5px]">
                    {partenairesAffiches.map((f) => {
                      const nomP = f.nom_fournisseur || f.nom || '';
                      const estSansStock = f.statut_stockage === 'SANS_STOCKAGE';

                      return (
                        <tr key={f.id} onClick={() => permissions.modification && ouvrirEdition(f)} className="hover:bg-orange-50/70 cursor-pointer transition select-none">
                          <td className="p-2.5 font-black uppercase text-slate-900 truncate">{nomP}</td>
                          <td className="p-2.5 whitespace-nowrap">
                            <span className={`px-1.5 py-0.5 rounded font-black text-[9px] ${estSansStock ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                              {estSansStock ? '🚚 SANS STOCK' : `🏢 Dépôt : ${nomP}`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}