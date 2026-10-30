'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const LISTE_MODULES_PRINCIPAUX = ['BOUTIQUE', 'LIVRAISON', 'LOGISTIQUE', 'TONTINE'];

const TARIFS_MODULES = {
  Boutique: { installation: 25000, mensuelPerUser: 5000, disponible: true },
  Livraison: { installation: 25000, mensuelPerUser: 5000, disponible: true },
  Logistique: { installation: 20000, mensuelPerUser: 4000, disponible: false },
  Tontine: { installation: 25000, mensuelPerUser: 2500, disponible: false },
};

export default function MonProfil({ entrepriseId = '' }) {
  const [entreprise, setEntreprise] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [nomUtilisateurConnecte, setNomUtilisateurConnecte] = useState('');
  const [emailUtilisateurConnecte, setEmailUtilisateurConnecte] = useState('');
  const [telephoneUtilisateur, setTelephoneUtilisateur] = useState('');
  const [roleUtilisateur, setRoleUtilisateur] = useState('');
  const [avatarUtilisateur, setAvatarUtilisateur] = useState('');

  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmerMotDePasse, setConfirmerMotDePasse] = useState('');
  const [logoEntreprise, setLogoEntreprise] = useState('');
  const [afficherMdp, setAfficherMdp] = useState(false);
  const [modeModificationMdp, setModeModificationMdp] = useState(false);

  const [modeAction, setModeAction] = useState(null);
  const [moduleSelectionneInfo, setModuleSelectionneInfo] = useState('');
  const [nombreUtilisateursChoisi, setNombreUtilisateursChoisi] = useState(1);
  const [nombreMoisChoisi, setNombreMoisChoisi] = useState(1);
  const [nouveauxModulesChoisis, setNouveauxModulesChoisis] = useState({
    Boutique: false,
    Logistique: false,
    Livraison: false,
    Tontine: false,
  });
  const [activationEnCours, setActivationEnCours] = useState(false);
  const [changementModuleEnCours, setChangementModuleEnCours] = useState(false);

  const [listeEntreprisesGlobales, setListeEntreprisesGlobales] = useState([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [panneauAdminOuvert, setPanneauAdminOuvert] = useState(false);

  const fileInputLogoRef = useRef(null);

  const moduleActuel = typeof window !== 'undefined' ? (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase() : 'BOUTIQUE';
  const emailConnecte = typeof window !== 'undefined' ? (localStorage.getItem('emailConnecte') || '') : '';
  const utilisateurConnecte = typeof window !== 'undefined' ? (localStorage.getItem('utilisateurConnecte') || localStorage.getItem('utilisateur_connecte') || '') : '';

  const estSuperAdmin = 
    emailConnecte.toLowerCase().trim() === 'stephs7352@gmail.com' || 
    emailConnecte.toLowerCase().trim() === 'bureauisma26@gmail.com' || 
    emailConnecte.toLowerCase().trim() === 'stephanekts1312@gmail.com' ||
    utilisateurConnecte.includes('STÉPHANE') || 
    utilisateurConnecte.includes('KENMOE');

  const estCompteEntreprise = Boolean(entrepriseId) && entrepriseId !== 'UTILISATEUR';

  const estAdminEntreprise = 
    estSuperAdmin || 
    roleUtilisateur.toUpperCase().includes('ADMIN') ||
    nomUtilisateurConnecte.toUpperCase().includes('ADMIN') || 
    (entreprise && nomUtilisateurConnecte.toUpperCase() === (entreprise.nom_entreprise || '').toUpperCase());

  // Nettoyage et initialisation du cache local strict par entreprise & module
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ancienneCleCacheGlobal = '4ts_cache_global_legacy';
      if (localStorage.getItem(ancienneCleCacheGlobal)) {
        localStorage.removeItem(ancienneCleCacheGlobal);
      }
    }
    chargerInfosUtilisateurEtEntreprise();
  }, [entrepriseId, moduleActuel]);

  const chargerToutesLesEntreprises = async () => {
    setLoadingAdmin(true);
    try {
      const { data } = await supabase.from('entreprises').select('*');
      if (data) {
        setListeEntreprisesGlobales(data);
      }
    } catch (err) {
      console.error("Erreur chargement entreprises globales :", err);
    } finally {
      setLoadingAdmin(false);
    }
  };

  useEffect(() => {
    if (panneauAdminOuvert) {
      chargerToutesLesEntreprises();
    }
  }, [panneauAdminOuvert]);

  const chargerInfosUtilisateurEtEntreprise = async () => {
    setChargement(true);
    const idEffectif = entrepriseId || (typeof window !== 'undefined' ? (localStorage.getItem('entrepriseId') || localStorage.getItem('entreprise_id')) : null) || '4TS-234321';
    
    // Clé de cache local stricte isolée par entreprise et par module
    const cleCacheLocal = `4ts_profil_cache_${idEffectif}_${moduleActuel}`;

    try {
      // 1. Affichage instantané depuis le cache local s'il existe
      if (typeof window !== 'undefined') {
        const donneesCachees = localStorage.getItem(cleCacheLocal);
        if (donneesCachees) {
          const parsed = JSON.parse(donneesCachees);
          setEntreprise(parsed.entreprise);
          setNomUtilisateurConnecte(parsed.nomUtilisateurConnecte || '');
          setEmailUtilisateurConnecte(parsed.emailUtilisateurConnecte || '');
          setTelephoneUtilisateur(parsed.telephoneUtilisateur || '');
          setRoleUtilisateur(parsed.roleUtilisateur || '');
          setAvatarUtilisateur(parsed.avatarUtilisateur || '');
          if (parsed.logoEntreprise) setLogoEntreprise(parsed.logoEntreprise);
          setChargement(false);
        }
      }

      // 2. Synchronisation en arrière-plan avec Supabase avec filtrage strict
      let entrepriseTrouvee = null;
      const { data, error } = await supabase
        .from('entreprises')
        .select('*')
        .eq('id_entreprise', idEffectif)
        .maybeSingle();

      if (!error && data) {
        entrepriseTrouvee = data;
      } else {
        const { data: dataFallback } = await supabase
          .from('entreprises')
          .select('*')
          .eq('id', idEffectif)
          .maybeSingle();
        if (dataFallback) entrepriseTrouvee = dataFallback;
      }

      if (entrepriseTrouvee) {
        setEntreprise(entrepriseTrouvee);
        if (entrepriseTrouvee.duree_abonnement_mois) setNombreMoisChoisi(entrepriseTrouvee.duree_abonnement_mois);
      }

      // Récupération sécurisée et filtrée de l'utilisateur rattaché à l'entreprise
      let utilisateurTrouve = null;
      const { data: usersList } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('id_entreprise', idEffectif);

      if (usersList && usersList.length > 0) {
        utilisateurTrouve = usersList.find(u => {
          const nomCompletBase = `${u.nom_complet || u.nom || ''} ${u.prenom || ''}`.trim().toLowerCase();
          const nomRecherche = utilisateurConnecte.toLowerCase();
          const matchNom = nomCompletBase.includes(nomRecherche) || nomRecherche.includes(nomCompletBase);
          const matchEmail = emailConnecte && u.email && u.email.toLowerCase() === emailConnecte.toLowerCase();
          return matchNom || matchEmail;
        });
      }

      let nomFinal = utilisateurConnecte || 'Stéphane KTS';
      let emailFinal = emailConnecte || '';
      let telephoneFinal = '';
      let roleFinal = 'Administrateur';
      let avatarFinal = '';

      if (utilisateurTrouve) {
        nomFinal = `${utilisateurTrouve.nom || utilisateurTrouve.nom_complet || ''} ${utilisateurTrouve.prenom || ''}`.trim() || nomFinal;
        emailFinal = utilisateurTrouve.email || emailFinal;
        telephoneFinal = utilisateurTrouve.telephone || utilisateurTrouve.phone || '';
        roleFinal = utilisateurTrouve.role || utilisateurTrouve.type_collaborateur || roleFinal;
        avatarFinal = utilisateurTrouve.avatar || utilisateurTrustAvatar(utilisateurTrouve.photo) || '';
      }

      setNomUtilisateurConnecte(nomFinal);
      setEmailUtilisateurConnecte(emailFinal);
      setTelephoneUtilisateur(telephoneFinal);
      setRoleUtilisateur(roleFinal);
      if (avatarFinal) setAvatarUtilisateur(avatarFinal);

      const logoLocal = (typeof window !== 'undefined') ? (localStorage.getItem(`logo_entreprise_${idEffectif}`) || avatarFinal) : '';
      if (logoLocal) setLogoEntreprise(logoLocal);

      // Mise à jour instantanée du nouveau cache local
      if (typeof window !== 'undefined') {
        const payloadCache = {
          entreprise: entrepriseTrouvee || entreprise,
          nomUtilisateurConnecte: nomFinal,
          emailUtilisateurConnecte: emailFinal,
          telephoneUtilisateur: telephoneFinal,
          roleUtilisateur: roleFinal,
          avatarUtilisateur: avatarFinal,
          logoEntreprise: logoLocal
        };
        localStorage.setItem(cleCacheLocal, JSON.stringify(payloadCache));
      }

    } catch (err) {
      console.error('Erreur chargement profil strict :', err.message);
    } finally {
      setChargement(false);
    }
  };

  const utilisateurTrustAvatar = (photo) => photo || '';

  const gererSelectionLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingLogo(true);
    try {
      const lecteur = new FileReader();
      lecteur.onloadend = async () => {
        const resultatBase64 = lecteur.result;
        setLogoEntreprise(resultatBase64);
        setAvatarUtilisateur(resultatBase64);
        const targetId = entreprise?.id_entreprise || '4TS-234321';
        
        if (typeof window !== 'undefined') {
          localStorage.setItem(`logo_entreprise_${targetId}`, resultatBase64);
          localStorage.setItem(`avatar_user_${nomUtilisateurConnecte}`, resultatBase64);
        }

        try {
          await supabase
            .from('utilisateurs')
            .update({ avatar: resultatBase64 })
            .eq('id_entreprise', targetId)
            .ilike('nom', `%${nomUtilisateurConnecte}%`);
        } catch (updateErr) {
          console.warn("Mise à jour avatar base de données ignorée :", updateErr);
        }

        setUploadingLogo(false);
        alert('✅ Photo de profil mise à jour avec succès !');
      };
      lecteur.readAsDataURL(file);
    } catch (err) {
      alert('Erreur lors du chargement de l’image : ' + err.message);
      setUploadingLogo(false);
    }
  };

  const MettreAJourProfil = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder || !entreprise) return;

    if (!modeModificationMdp || !nouveauMotDePasse.trim()) return;

    if (nouveauMotDePasse !== confirmerMotDePasse) {
      alert('❌ Les deux mots de passe ne correspondent pas.');
      return;
    }

    setEnTrainDeSauvegarder(true);
    try {
      const payload = {
        mot_de_passe: nouveauMotDePasse.trim(),
        code_pin_activation: nouveauMotDePasse.trim()
      };

      const targetId = entreprise.id_entreprise || entreprise.id;
      const champCle = entreprise.id_entreprise ? 'id_entreprise' : 'id';

      const { error } = await supabase
        .from('entreprises')
        .update(payload)
        .eq(champCle, targetId);

      if (error) throw error;

      alert('✅ Mot de passe mis à jour avec succès !');
      setNouveauMotDePasse('');
      setConfirmerMotDePasse('');
      setModeModificationMdp(false);
      await chargerInfosUtilisateurEtEntreprise();
    } catch (err) {
      alert('❌ Erreur lors de la mise à jour : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const donneesBrutesEspaces = entreprise?.espaces_souscrits;
  let espacesSouscrits = ['BOUTIQUE'];
  if (donneesBrutesEspaces) {
    if (Array.isArray(donneesBrutesEspaces)) {
      espacesSouscrits = donneesBrutesEspaces.map(m => String(m).trim().toUpperCase());
    } else if (typeof donneesBrutesEspaces === 'string') {
      espacesSouscrits = donneesBrutesEspaces.split(',').map(m => m.trim().toUpperCase());
    }
  }

  const gererClicModule = (mod) => {
    const modCapitalized = mod.charAt(0) + mod.slice(1).toLowerCase();
    const infoTarif = TARIFS_MODULES[modCapitalized] || { disponible: true };

    if (!infoTarif.disponible) {
      setModuleSelectionneInfo(mod);
      setModeAction('module_indisponible');
      return;
    }

    const estSouscrit = espacesSouscrits.includes(mod.toUpperCase());
    if (estSouscrit) {
      basculerModuleActif(mod);
    } else {
      setModeAction('nouveau_module');
    }
  };

  const basculerModuleActif = async (nouveauModule) => {
    if (!entreprise) return;
    setChangementModuleEnCours(true);

    try {
      const moduleUpper = nouveauModule.toUpperCase();
      const identifiantCible = entreprise.id_entreprise || entreprise.id;
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('module_actif', moduleUpper);
      }

      await supabase
        .from('entreprises')
        .update({ module_actif: moduleUpper })
        .eq(entreprise.id_entreprise ? 'id_entreprise' : 'id', identifiantCible);

      alert(`Affichage basculé vers le module : ${moduleUpper} 🚀`);
      window.location.reload(); 
    } catch (err) {
      alert('Erreur lors du changement de module : ' + err.message);
    } finally {
      setChangementModuleEnCours(false);
    }
  };

  const obtenirTarifModuleActuel = () => {
    const key = Object.keys(TARIFS_MODULES).find(k => k.toUpperCase() === moduleActuel) || 'Boutique';
    return TARIFS_MODULES[key].mensuelPerUser;
  };

  const obtenirTauxReduction = (mois, totalUsers) => {
    let remiseDuree = 0;
    if (mois >= 12) remiseDuree = 0.20;
    else if (mois >= 9) remiseDuree = 0.15;
    else if (mois >= 6) remiseDuree = 0.10;
    else if (mois >= 3) remiseDuree = 0.05;

    let remiseUsers = 0;
    if (totalUsers >= 50) remiseUsers = 0.15;
    else if (totalUsers >= 20) remiseUsers = 0.10;
    else if (totalUsers >= 10) remiseUsers = 0.05;

    return Math.min(0.35, remiseDuree + remiseUsers);
  };

  const calculerMontantReabonnement = () => {
    const tarifUnitaire = obtenirTarifModuleActuel();
    const totalUsersEstime = parseInt(entreprise?.limite_utilisateurs || 1) + parseInt(nombreUtilisateursChoisi);
    const brut = nombreUtilisateursChoisi * nombreMoisChoisi * tarifUnitaire;
    const taux = obtenirTauxReduction(nombreMoisChoisi, totalUsersEstime);
    return {
      montantNet: Math.round(brut * (1 - taux)),
      tauxRemise: Math.round(taux * 100),
      tarifUnitaire
    };
  };

  const detailsCalculReabonnement = calculerMontantReabonnement();
  const modificationReabonnementEffectuee = nombreUtilisateursChoisi > 1 || nombreMoisChoisi > (entreprise?.duree_abonnement_mois || 1);

  const souscrireSurMesure = async () => {
    if (!modificationReabonnementEffectuee) return;

    const ancienTotalUtilisateurs = parseInt(entreprise?.limite_utilisateurs || 1);
    const nouveauTotalCumule = ancienTotalUtilisateurs + parseInt(nombreUtilisateursChoisi);

    if (!confirm(`Valider le réabonnement pour ${nombreUtilisateursChoisi} utilisateur(s) supp. sur ${nombreMoisChoisi} mois (Total: ${detailsCalculReabonnement.montantNet.toLocaleString()} F) ?`)) return;

    try {
      const identifiantCible = entreprise?.id_entreprise || entreprise?.id;
      const { error } = await supabase
        .from('entreprises')
        .update({
          statut_licence: 'ACTIF',
          duree_abonnement_mois: nombreMoisChoisi,
          limite_utilisateurs: nouveauTotalCumule,
        })
        .eq(entreprise.id_entreprise ? 'id_entreprise' : 'id', identifiantCible);

      if (error) throw error;

      alert(`Réabonnement validé avec succès ! Nouvelle limite : ${nouveauTotalCumule} utilisateurs.`);
      setModeAction(null);
      chargerInfosUtilisateurEtEntreprise();
    } catch (err) {
      alert('Erreur lors du réabonnement : ' + err.message);
    }
  };

  const validerActivationNouveauxModules = async () => {
    const modulesSelectionnes = Object.keys(nouveauxModulesChoisis).filter(m => nouveauxModulesChoisis[m]);
    if (modulesSelectionnes.length === 0) {
      alert("Veuillez sélectionner au moins un module à souscrire.");
      return;
    }

    const moduleNonDispo = modulesSelectionnes.find(m => {
      const k = m.charAt(0) + m.slice(1).toLowerCase();
      return TARIFS_MODULES[k] && !TARIFS_MODULES[k].disponible;
    });

    if (moduleNonDispo) {
      setModuleSelectionneInfo(moduleNonDispo);
      setModeAction('module_indisponible');
      return;
    }

    if (!confirm(`Souscrire et activer les nouveaux modules [${modulesSelectionnes.join(', ')}] ?`)) return;

    setActivationEnCours(true);
    try {
      const nouveauxUpper = modulesSelectionnes.map(m => m.toUpperCase());
      const fusionEspaces = Array.from(new Set([...espacesSouscrits, ...nouveauxUpper]));
      const identifiantCible = entreprise?.id_entreprise || entreprise?.id;

      const { error } = await supabase
        .from('entreprises')
        .update({
          espaces_souscrits: fusionEspaces,
          statut_licence: 'ACTIF',
        })
        .eq(entreprise.id_entreprise ? 'id_entreprise' : 'id', identifiantCible);

      if (error) throw error;

      alert(`Succès ! Nouveaux modules souscrits : ${fusionEspaces.join(', ')} 🚀`);
      setNouveauxModulesChoisis({ Boutique: false, Logistique: false, Livraison: false, Tontine: false });
      setModeAction(null);
      await chargerInfosUtilisateurEtEntreprise();
      window.location.reload();
    } catch (err) {
      alert("Erreur critique lors de la souscription : " + err.message);
    } finally {
      setActivationEnCours(false);
    }
  };

  const seDeconnecter = () => {
    if (confirm('Voulez-vous vraiment vous déconnecter de l’application ?')) {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        window.location.href = '/connexion';
      }
    }
  };

  if (chargement && !entreprise) {
    return <div className="p-6 text-center text-cyan-400 text-xs font-bold animate-pulse">Chargement instantané du profil...</div>;
  }

  if (!entreprise) {
    return <div className="p-6 text-center text-rose-400 text-xs font-bold">Impossible de charger les informations.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-3 font-sans text-xs pb-6">
      
      <div className="bg-[#1b263b] border border-blue-900/60 rounded-2xl p-4 shadow-xl text-slate-100 space-y-4">
        
        <div className="border-b border-blue-900/60 pb-3 flex items-center space-x-2">
          <span className="text-base">👤</span>
          <h3 className="font-black text-white uppercase text-xs tracking-wider">
            MON PROFIL & INFORMATIONS PERSONNELLES
          </h3>
        </div>

        <form onSubmit={MettreAJourProfil} className="space-y-3">
          
          <div className="bg-[#0d1b2a] p-3 rounded-xl border border-blue-900/40 flex items-center gap-4">
            <input 
              type="file" 
              ref={fileInputLogoRef} 
              onChange={gererSelectionLogo} 
              accept="image/*" 
              className="hidden" 
            />
            
            <div 
              onClick={() => fileInputLogoRef.current && fileInputLogoRef.current.click()}
              title="Cliquer pour modifier votre photo de profil"
              className="w-14 h-14 rounded-xl bg-slate-900 border-2 border-orange-500 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer relative group shadow-md"
            >
              {(logoEntreprise || avatarUtilisateur) ? (
                <img src={logoEntreprise || avatarUtilisateur} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-orange-400 font-black text-base">👤</span>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[9px] text-white font-bold text-center p-1">
                {uploadingLogo ? 'Envoi...' : 'Modifier Photo'}
              </div>
            </div>

            <div className="space-y-1 overflow-hidden">
              {estCompteEntreprise ? (
                <>
                  <span className="block text-[9px] uppercase font-bold text-blue-300">Entreprise rattachée : <strong className="text-orange-400">{entreprise.nom_entreprise || 'N/A'}</strong></span>
                  <span className="text-[9px] font-mono text-slate-400 block">ID : {entreprise.id_entreprise || 'N/A'}</span>
                </>
              ) : (
                <span className="block text-[9px] uppercase font-bold text-blue-300">Compte Utilisateur Standard</span>
              )}
              <h4 className="font-extrabold text-white uppercase text-sm truncate">
                {nomUtilisateurConnecte || 'Stéphane KTS'}
              </h4>
            </div>
          </div>

          {estAdminEntreprise && (
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setModeAction(modeAction === 'reabonnement' ? null : 'reabonnement')}
                className={`w-full font-black py-1.5 px-1 rounded-xl shadow transition uppercase text-[7.5px] leading-tight flex flex-col items-center justify-center gap-0.5 border ${
                  modeAction === 'reabonnement' 
                    ? 'bg-orange-700 text-white border-orange-400' 
                    : 'bg-cyan-700 hover:bg-cyan-600 text-white border-cyan-500'
                }`}
              >
                <span className="text-xs">🔄</span>
                <span className="text-center w-full">{modeAction === 'reabonnement' ? 'Fermer' : 'Se réabonner'}</span>
              </button>

              <button
                type="button"
                onClick={() => setModeAction(modeAction === 'switcher_module' ? null : 'switcher_module')}
                className={`w-full font-black py-1.5 px-1 rounded-xl shadow transition uppercase text-[7.5px] leading-tight flex flex-col items-center justify-center gap-0.5 border ${
                  modeAction === 'switcher_module' 
                    ? 'bg-orange-700 text-white border-orange-400' 
                    : 'bg-indigo-700 hover:bg-indigo-600 text-white border-indigo-500'
                }`}
              >
                <span className="text-xs">⚡</span>
                <span className="text-center w-full">{modeAction === 'switcher_module' ? 'Fermer' : 'Changer module'}</span>
              </button>

              <button
                type="button"
                onClick={() => setModeAction(modeAction === 'nouveau_module' ? null : 'nouveau_module')}
                className={`w-full font-black py-1.5 px-1 rounded-xl shadow transition uppercase text-[7.5px] leading-tight flex flex-col items-center justify-center gap-0.5 border ${
                  modeAction === 'nouveau_module' 
                    ? 'bg-orange-700 text-white border-orange-400' 
                    : 'bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-500'
                }`}
              >
                <span className="text-xs">➕</span>
                <span className="text-center w-full">{modeAction === 'nouveau_module' ? 'Fermer' : 'Nouveau module'}</span>
              </button>
            </div>
          )}

          {estAdminEntreprise && modeAction === 'module_indisponible' && (
            <div className="bg-[#0d1b2a] border-2 border-amber-500/80 p-4 rounded-xl space-y-3 shadow-2xl animate-fadeIn text-center">
              <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto text-lg font-bold">
                ⏳
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-amber-400 uppercase text-xs tracking-wide">
                  Module [{moduleSelectionneInfo}] en cours de développement
                </h4>
                <p className="text-[10px] text-slate-300 leading-relaxed px-2">
                  Notre équipe technique prépare une version ultra-performante du module <strong className="text-white">{moduleSelectionneInfo}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModeAction('switcher_module')}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-2 rounded-lg text-[10px] uppercase shadow transition"
              >
                Retourner aux modules disponibles 👍
              </button>
            </div>
          )}

          {estAdminEntreprise && modeAction === 'switcher_module' && (
            <div className="bg-[#0d1b2a] border-2 border-indigo-500/60 p-3 rounded-xl space-y-3 shadow-inner animate-fadeIn">
              <h4 className="font-black text-indigo-400 uppercase text-[10px] flex items-center justify-between">
                <span>⚡ Gestion & Changement de Module</span>
                <span className="text-slate-400 font-normal">Actif : <strong className="text-orange-400">{moduleActuel}</strong></span>
              </h4>

              <div className="grid grid-cols-2 gap-2">
                {LISTE_MODULES_PRINCIPAUX.map((mod) => {
                  const estSouscrit = espacesSouscrits.includes(mod);
                  const estActif = moduleActuel === mod;
                  const modCapitalized = mod.charAt(0) + mod.slice(1).toLowerCase();
                  const infoTarif = TARIFS_MODULES[modCapitalized] || { disponible: true };

                  if (!infoTarif.disponible) {
                    return (
                      <div
                        key={mod}
                        onClick={() => gererClicModule(mod)}
                        className="p-2.5 rounded-xl border border-amber-500/40 bg-amber-950/20 text-slate-300 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-amber-950/40 transition"
                      >
                        <span className="text-xs uppercase font-bold text-amber-300">{mod}</span>
                        <span className="text-[8px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold">
                          ⏳ Bientôt disponible
                        </span>
                      </div>
                    );
                  }

                  if (estSouscrit) {
                    return (
                      <button
                        key={mod}
                        type="button"
                        disabled={estActif || changementModuleEnCours}
                        onClick={() => gererClicModule(mod)}
                        className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                          estActif 
                            ? 'bg-orange-600/40 border-orange-500 text-white font-black cursor-default shadow' 
                            : 'bg-[#1b263b] hover:bg-indigo-950/60 border-indigo-500/50 text-indigo-200 cursor-pointer'
                        }`}
                      >
                        <span className="text-xs uppercase font-black">{mod}</span>
                        <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded ${estActif ? 'bg-orange-500 text-white' : 'bg-emerald-950 text-emerald-400'}`}>
                          {estActif ? 'Module Actif ✓' : 'Cliquer pour switcher ⚡'}
                        </span>
                      </button>
                    );
                  } else {
                    return (
                      <div 
                        key={mod}
                        onClick={() => setModeAction('nouveau_module')}
                        className="p-2.5 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-500 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-orange-500/50 transition group"
                      >
                        <span className="text-xs uppercase font-bold line-through group-hover:text-slate-300">{mod}</span>
                        <span className="text-[8px] bg-slate-800 text-orange-400 group-hover:bg-orange-600 group-hover:text-white px-2 py-0.5 rounded font-bold transition">
                          🔒 Non souscrit (Souscrire ➔)
                        </span>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          )}

          {estAdminEntreprise && modeAction === 'reabonnement' && (
            <div className="bg-[#0d1b2a] border-2 border-cyan-500/60 p-3 rounded-xl space-y-3 shadow-inner animate-fadeIn">
              <h4 className="font-black text-cyan-400 uppercase text-[10px]">
                🔄 Réabonnement & Extension — Module : <span className="text-orange-400">{moduleActuel}</span>
              </h4>

              <div className="grid grid-cols-2 gap-2 bg-[#1b263b] p-2.5 rounded-xl border border-blue-900/50 text-center">
                <div>
                  <span className="block text-[8px] uppercase font-bold text-slate-400">Utilisateurs Actuels</span>
                  <span className="text-xs font-black text-orange-400">{entreprise.limite_utilisateurs || 1} User(s)</span>
                </div>
                <div>
                  <span className="block text-[8px] uppercase font-bold text-slate-400">Durée Restante</span>
                  <span className="text-xs font-black text-emerald-400">{entreprise.duree_abonnement_mois || 1} Mois</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[8.5px] text-slate-300 mb-1 uppercase font-bold">Users Supplémentaires (+)</label>
                  <input
                    type="number"
                    min="1"
                    value={nombreUtilisateursChoisi}
                    onChange={(e) => setNombreUtilisateursChoisi(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#1b263b] border border-blue-900 rounded-lg p-1.5 text-xs text-white font-bold text-center"
                  />
                </div>
                <div>
                  <label className="block text-[8.5px] text-slate-300 mb-1 uppercase font-bold">Durée à ajouter (Mois)</label>
                  <input
                    type="number"
                    min="1"
                    value={nombreMoisChoisi}
                    onChange={(e) => setNombreMoisChoisi(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full bg-[#1b263b] border border-blue-900 rounded-lg p-1.5 text-xs text-white font-bold text-center"
                  />
                </div>
              </div>

              <div className="bg-[#1b263b] border border-orange-500/40 p-2.5 rounded-xl space-y-1 text-[10px]">
                <div className="flex justify-between font-black text-xs text-orange-400">
                  <span>MONTANT TOTAL À PAYER :</span>
                  <span>{detailsCalculReabonnement.montantNet.toLocaleString()} XAF</span>
                </div>
              </div>

              <button
                type="button"
                disabled={!modificationReabonnementEffectuee}
                onClick={souscrireSurMesure}
                className={`w-full font-black py-2.5 rounded-lg text-[10px] uppercase shadow-md transition ${
                  modificationReabonnementEffectuee 
                    ? 'bg-orange-600 hover:bg-orange-500 text-white cursor-pointer' 
                    : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
                }`}
              >
                {modificationReabonnementEffectuee ? 'Valider le réabonnement 🚀' : 'Modifiez les valeurs pour valider 🔒'}
              </button>
            </div>
          )}

          {estAdminEntreprise && modeAction === 'nouveau_module' && (
            <div className="bg-[#0d1b2a] border-2 border-emerald-500/60 p-3 rounded-xl space-y-2.5 shadow-inner animate-fadeIn">
              <h4 className="font-black text-emerald-400 uppercase text-[10px]">
                ➕ Souscrire à un nouveau module :
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {LISTE_MODULES_PRINCIPAUX.map((mod) => {
                  const estDejaSouscrit = espacesSouscrits.includes(mod);
                  const modCapitalized = mod.charAt(0) + mod.slice(1).toLowerCase();
                  const estDispo = TARIFS_MODULES[modCapitalized]?.disponible ?? true;

                  return (
                    <label
                      key={mod}
                      onClick={(e) => {
                        if (!estDispo) {
                          e.preventDefault();
                          gererClicModule(mod);
                        }
                      }}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition ${
                        estDejaSouscrit 
                          ? 'bg-slate-900 text-slate-500 border-slate-800 opacity-60' 
                          : !estDispo
                            ? 'bg-amber-950/20 text-amber-300 border-amber-500/40'
                            : nouveauxModulesChoisis[mod] 
                              ? 'bg-orange-600 text-white border-orange-500 font-bold' 
                              : 'bg-[#1b263b] text-slate-300 border-blue-900'
                      }`}
                    >
                      <span className="text-[10px]">
                        {mod} {estDejaSouscrit && '(Actif)'} {!estDispo && '⏳ (Bientôt)'}
                      </span>
                      <input
                        type="checkbox"
                        disabled={estDejaSouscrit}
                        checked={estDejaSouscrit ? true : nouveauxModulesChoisis[mod]}
                        onChange={(e) => {
                          if (estDispo) {
                            setNouveauxModulesChoisis({ ...nouveauxModulesChoisis, [mod]: e.target.checked });
                          }
                        }}
                        className="accent-orange-500 w-3.5 h-3.5"
                      />
                    </label>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={activationEnCours}
                onClick={validerActivationNouveauxModules}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2 rounded-lg text-[10px] uppercase shadow-md transition"
              >
                {activationEnCours ? 'Souscription...' : 'Activer les nouveaux modules 🚀'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 text-center bg-[#0d1b2a] p-2.5 rounded-xl border border-blue-900/40">
            <div>
              <span className="block text-[8.5px] uppercase font-bold text-blue-300">Rôle / Statut</span>
              <span className="text-[10px] font-black text-emerald-400 uppercase">{roleUtilisateur || 'Administrateur'}</span>
            </div>
            <div>
              <span className="block text-[8.5px] uppercase font-bold text-blue-300">Module actif</span>
              <span className="text-[10px] font-black text-orange-400 uppercase">{moduleActuel}</span>
            </div>
            <div>
              <span className="block text-[8.5px] uppercase font-bold text-blue-300">Statut session</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Actif
              </span>
            </div>
          </div>

          <div className="space-y-2.5 bg-[#0d1b2a] p-3 rounded-xl border border-blue-900/40">
            <div>
              <label className="block text-[9px] uppercase font-bold text-blue-300 mb-1">
                Adresse e-mail personnelle <span className="text-slate-500 font-normal">(Non modifiable)</span>
              </label>
              <input
                type="email"
                disabled
                value={emailUtilisateurConnecte || 'Non renseigné'}
                className="w-full bg-slate-900/60 border border-blue-900/50 rounded-lg p-2 text-xs text-slate-300 cursor-not-allowed font-medium"
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase font-bold text-blue-300 mb-1">
                Numéro de téléphone personnel <span className="text-slate-500 font-normal">(Non modifiable)</span>
              </label>
              <input
                type="text"
                disabled
                value={telephoneUtilisateur || 'Non renseigné'}
                className="w-full bg-slate-900/60 border border-blue-900/50 rounded-lg p-2 text-xs text-slate-300 cursor-not-allowed font-medium"
              />
            </div>

            <div className="space-y-2 pt-1 border-t border-blue-900/40">
              <div className="flex justify-between items-center">
                <label className="block text-[9px] uppercase font-bold text-blue-300">
                  Mot de passe / Code PIN personnel
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setModeModificationMdp(!modeModificationMdp);
                    if (modeModificationMdp) {
                      setNouveauMotDePasse('');
                      setConfirmerMotDePasse('');
                    }
                  }}
                  className={`text-[9.5px] font-bold px-2 py-0.5 rounded transition ${
                    modeModificationMdp 
                      ? 'bg-rose-900 text-rose-200 hover:bg-rose-800' 
                      : 'bg-cyan-700 text-white hover:bg-cyan-600'
                  }`}
                >
                  {modeModificationMdp ? 'Annuler' : 'Modifier'}
                </button>
              </div>
              
              <div className="relative">
                <input
                  type={afficherMdp ? 'text' : 'password'}
                  disabled={enTrainDeSauvegarder || !modeModificationMdp}
                  value={nouveauMotDePasse}
                  onChange={(e) => setNouveauMotDePasse(e.target.value)}
                  placeholder={modeModificationMdp ? "Nouveau mot de passe" : "••••••"}
                  className={`w-full border rounded-lg p-2 pr-16 text-xs font-bold text-white focus:ring-2 focus:ring-orange-500 focus:outline-none transition ${
                    modeModificationMdp 
                      ? 'bg-[#1b263b] border-orange-500/60' 
                      : 'bg-slate-900/80 border-blue-900/50 text-slate-400 cursor-not-allowed'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setAfficherMdp(!afficherMdp)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-orange-400 hover:text-white text-[10px] font-bold px-1.5 py-0.5 bg-slate-800/80 rounded border border-slate-700 transition"
                >
                  {afficherMdp ? 'Masquer' : 'Afficher'}
                </button>
              </div>

              {modeModificationMdp && (
                <div className="animate-fadeIn">
                  <input
                    type={afficherMdp ? 'text' : 'password'}
                    disabled={enTrainDeSauvegarder}
                    value={confirmerMotDePasse}
                    onChange={(e) => setConfirmerMotDePasse(e.target.value)}
                    placeholder="Confirmer le nouveau mot de passe"
                    className="w-full bg-[#1b263b] border border-orange-500/60 rounded-lg p-2 text-xs font-bold text-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="submit"
              disabled={enTrainDeSauvegarder || uploadingLogo || !modeModificationMdp || !nouveauMotDePasse.trim()}
              className={`w-full font-black py-2.5 px-2 rounded-xl shadow-md transition uppercase tracking-tighter text-[10px] flex items-center justify-center gap-1 ${
                modeModificationMdp && nouveauMotDePasse.trim() 
                  ? 'bg-orange-600 hover:bg-orange-500 text-white cursor-pointer' 
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <span>💾</span>
              <span className="truncate">{enTrainDeSauvegarder ? 'Enreg...' : 'Mettre à jour'}</span>
            </button>

            <button
              type="button"
              onClick={seDeconnecter}
              className="w-full bg-rose-950/60 hover:bg-rose-900 text-rose-300 hover:text-white border border-rose-800 font-black py-2.5 px-2 rounded-xl shadow-md transition uppercase tracking-tighter text-[10px] flex items-center justify-center gap-1"
            >
              <span>🚪</span>
              <span className="truncate">Se déconnecter</span>
            </button>
          </div>

        </form>

      </div>

    </div>
  );
}