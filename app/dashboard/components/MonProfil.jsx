'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import EspaceSouscription from './EspaceSouscription';

export default function MonProfil({ entrepriseId = '', isDarkMode = false }) {
  const [entreprise, setEntreprise] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [nomUtilisateurConnecte, setNomUtilisateurConnecte] = useState('');
  const [emailUtilisateurConnecte, setEmailUtilisateurConnecte] = useState('');
  const [telephoneUtilisateur, setTelephoneUtilisateur] = useState('');
  const [roleUtilisateur, setRoleUtilisateur] = useState('Administrateur');
  const [avatarUtilisateur, setAvatarUtilisateur] = useState('');

  const [modulesAutorisesUser, setModulesAutorisesUser] = useState(['BOUTIQUE']);
  
  // 🧩 Stockage complet des configurations de modules depuis Supabase (visibilité & souscriptibilité)
  const [espacesModulesConfig, setEspacesModulesConfig] = useState([]);

  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmerMotDePasse, setConfirmerMotDePasse] = useState('');
  const [afficherMdp, setAfficherMdp] = useState(false);
  
  const [logoEntreprise, setLogoEntreprise] = useState('');
  const [modeModificationMdp, setModeModificationMdp] = useState(false);

  const [modeAction, setModeAction] = useState(null);
  const [nouveauxModulesChoisis, setNouveauxModulesChoisis] = useState({});
  const [activationEnCours, setActivationEnCours] = useState(false);
  const [changementModuleEnCours, setChangementModuleEnCours] = useState(false);

  const [moduleEnAttenteDeBasculement, setModuleEnAttenteDeBasculement] = useState(null);
  const [modalConfirmationBasculementOuverte, setModalConfirmationBasculementOuverte] = useState(false);

  const [moduleNonSouscritMessage, setModuleNonSouscritMessage] = useState(null);
  const [modalModuleNonSouscritOuverte, setModalModuleNonSouscritOuverte] = useState(false);

  const [modalDeconnexionOuverte, setModalDeconnexionOuverte] = useState(false);
  const [modalConfirmationAjoutModuleOuverte, setModalConfirmationAjoutModuleOuverte] = useState(false);
  const [modalesMessage, setModalesMessage] = useState({ ouverte: false, titre: '', message: '', type: 'succes' });

  const fileInputLogoRef = useRef(null);

  const emailConnecte = typeof window !== 'undefined' ? (localStorage.getItem('emailConnecte') || 'stephs7352@gmail.com') : 'stephs7352@gmail.com';
  const utilisateurConnecte = typeof window !== 'undefined' ? (localStorage.getItem('utilisateurConnecte') || localStorage.getItem('utilisateur_connecte') || '') : '';

  // 🔐 VÉRIFICATION STRICTE ADMIN : Administrateur principal ou rôle Administrateur
  const [estAdminEntreprise, setEstAdminEntreprise] = useState(false);

  useEffect(() => {
    chargerInfosUtilisateurEtEntreprise();
    chargerConfigModulesSupabase();
  }, [entrepriseId]);

  // 🧩 Récupération complète des configurations de la table "espaces_modules"
  const chargerConfigModulesSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('espaces_modules')
        .select('*');

      if (!error && data) {
        setEspacesModulesConfig(data);
      }
    } catch (err) {
      console.warn("Erreur chargement configuration des modules :", err);
    }
  };

  const chargerInfosUtilisateurEtEntreprise = async () => {
    setChargement(true);
    const idEffectif = entrepriseId || (typeof window !== 'undefined' ? (localStorage.getItem('entrepriseId') || localStorage.getItem('entreprise_id')) : null) || '4TS-234321';

    try {
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
      }

      let utilisateurTrouve = null;
      let modulesDisponiblesPourUser = ['BOUTIQUE'];

      const { data: usersList } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('id_entreprise', idEffectif);

      if (usersList && usersList.length > 0) {
        const correspondanceUser = usersList.filter(u => {
          const nomCompletBase = `${u.nom_complet || u.nom || ''} ${u.prenom || ''}`.trim().toLowerCase();
          const nomRecherche = utilisateurConnecte.toLowerCase();
          return (nomRecherche && nomCompletBase.includes(nomRecherche)) || (emailConnecte && u.email && u.email.toLowerCase() === emailConnecte.toLowerCase());
        });

        if (correspondanceUser.length > 0) {
          utilisateurTrouve = correspondanceUser[0];
          modulesDisponiblesPourUser = correspondanceUser.map(u => (u.module || '').toUpperCase());
        }
      }

      setModulesAutorisesUser(Array.from(new Set(modulesDisponiblesPourUser)));

      let nomFinal = utilisateurTrouve ? (`${utilisateurTrouve.nom || utilisateurTrouve.nom_complet || ''} ${utilisateurTrouve.prenom || ''}`.trim()) : (entrepriseTrouvee?.nom_entreprise || 'STÉPHANE KTS');
      let emailFinal = utilisateurTrouve?.email || emailConnecte || entrepriseTrouvee?.email || 'stephs7352@gmail.com';
      let telephoneFinal = utilisateurTrouve?.telephone || entrepriseTrouvee?.telephone || '655597099';
      let roleFinal = utilisateurTrouve?.nom_role || utilisateurTrouve?.role || 'Administrateur';

      setNomUtilisateurConnecte(nomFinal);
      setEmailUtilisateurConnecte(emailFinal);
      setTelephoneUtilisateur(telephoneFinal);
      setRoleUtilisateur(roleFinal);

      // Vérification si c'est l'admin de l'entreprise ou un rôle ADMIN
      const estAdminMail = emailFinal.toLowerCase().trim() === (entrepriseTrouvee?.email || '').toLowerCase().trim();
      const estRoleAdmin = String(roleFinal).toUpperCase().includes('ADMIN');
      const estSuperAdmin = emailFinal.toLowerCase().trim() === 'stephs7352@gmail.com';
      
      setEstAdminEntreprise(estAdminMail || estRoleAdmin || estSuperAdmin);

      const logoLocal = (typeof window !== 'undefined') ? (localStorage.getItem(`logo_entreprise_${idEffectif}`) || utilisateurTrouve?.avatar || '') : '';
      if (logoLocal) setLogoEntreprise(logoLocal);

    } catch (err) {
      console.error('Erreur chargement profil strict :', err.message);
    } finally {
      setChargement(false);
    }
  };

  const donneesBrutesEspaces = entreprise?.espaces_souscrits;
  let espacesSouscrits = [];
  
  if (donneesBrutesEspaces) {
    if (Array.isArray(donneesBrutesEspaces)) {
      espacesSouscrits = donneesBrutesEspaces.map(m => String(m).trim().toUpperCase());
    } else if (typeof donneesBrutesEspaces === 'string') {
      espacesSouscrits = donneesBrutesEspaces.split(',').map(m => m.trim().toUpperCase());
    }
  }
  espacesSouscrits = Array.from(new Set(espacesSouscrits));

  const premierModuleSouscrit = espacesSouscrits[0] || 'BOUTIQUE';
  const moduleActif = typeof window !== 'undefined' 
    ? (localStorage.getItem('module_actif') || entreprise?.module_actif || premierModuleSouscrit).toUpperCase() 
    : (entreprise?.module_actif || premierModuleSouscrit).toUpperCase();

  const afficherModaleNotification = (titre, message, type = 'succes') => {
    setModalesMessage({ ouverte: true, titre, message, type });
  };

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
        }

        setUploadingLogo(false);
        afficherModaleNotification("Succès", "✅ Photo de profil mise à jour avec succès !", "succes");
      };
      lecteur.readAsDataURL(file);
    } catch (err) {
      afficherModaleNotification("Erreur", "Erreur lors du chargement de l’image : " + err.message, "erreur");
      setUploadingLogo(false);
    }
  };

  const MettreAJourProfil = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder || !entreprise) return;

    if (!modeModificationMdp || !nouveauMotDePasse.trim()) return;

    if (nouveauMotDePasse !== confirmerMotDePasse) {
      afficherModaleNotification("Erreur", "❌ Les deux mots de passe ne correspondent pas.", "erreur");
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

      afficherModaleNotification("Succès", "✅ Mot de passe mis à jour avec succès !", "succes");
      setNouveauMotDePasse('');
      setConfirmerMotDePasse('');
      setModeModificationMdp(false);
      await chargerInfosUtilisateurEtEntreprise();
    } catch (err) {
      afficherModaleNotification("Erreur", "❌ Erreur lors de la mise à jour : " + err.message, "erreur");
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const initierBasculementModule = (nouveauModule) => {
    const modUpper = nouveauModule.toUpperCase();

    const configModule = espacesModulesConfig.find(m => (m.code_espace || '').toUpperCase().includes(modUpper));
    const estEnDeveloppement = modUpper === 'LOGISTIQUE' || (configModule && configModule.en_developpement === true);

    if (estEnDeveloppement) {
      afficherModaleNotification("En développement", `🚧 Le module ${modUpper} est actuellement en plein développement et sera bientôt disponible.`, "erreur");
      return;
    }

    if (!espacesSouscrits.includes(modUpper)) {
      setModuleNonSouscritMessage(modUpper);
      setModalModuleNonSouscritOuverte(true);
      return;
    }

    if (modUpper === moduleActif) return;

    setModuleEnAttenteDeBasculement(modUpper);
    setModalConfirmationBasculementOuverte(true);
  };

  const confirmerBasculementModule = async () => {
    if (!moduleEnAttenteDeBasculement || !entreprise) return;
    const modUpper = moduleEnAttenteDeBasculement;
    
    setModalConfirmationBasculementOuverte(false);
    setChangementModuleEnCours(true);

    try {
      const identifiantCible = entreprise.id_entreprise || entreprise.id;
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('module_actif', modUpper);
      }

      await supabase
        .from('entreprises')
        .update({ module_actif: modUpper })
        .eq(entreprise.id_entreprise ? 'id_entreprise' : 'id', identifiantCible);

      window.location.reload(); 
    } catch (err) {
      afficherModaleNotification("Erreur", "Erreur lors du changement de module : " + err.message, "erreur");
      setChangementModuleEnCours(false);
    }
  };

  const initierAjoutNouveauxModules = (e) => {
    e.preventDefault();
    const modulesSelectionnesListe = Object.keys(nouveauxModulesChoisis).filter(m => nouveauxModulesChoisis[m]);
    if (modulesSelectionnesListe.length === 0) {
      afficherModaleNotification("Attention", "⚠️ Veuillez sélectionner au moins un module à ajouter.", "erreur");
      return;
    }
    setModalConfirmationAjoutModuleOuverte(true);
  };

  const validerActivationNouveauxModules = async () => {
    setModalConfirmationAjoutModuleOuverte(false);
    if (!entreprise) return;
    setActivationEnCours(true);

    try {
      const modulesSelectionnesListe = Object.keys(nouveauxModulesChoisis).filter(m => nouveauxModulesChoisis[m]);
      const nouveauxEspaces = Array.from(new Set([...espacesSouscrits, ...modulesSelectionnesListe.map(m => m.toUpperCase())]));
      const identifiantCible = entreprise.id_entreprise || entreprise.id;
      const champCle = entreprise.id_entreprise ? 'id_entreprise' : 'id';

      let modeContournementActif = false;
      try {
        const { data: configData } = await supabase
          .from('configuration_globale')
          .select('valeur')
          .eq('cle', '4ts_contournement_cinetpay')
          .maybeSingle();

        if (configData) {
          modeContournementActif = String(configData.valeur) === 'true' || configData.valeur === true;
        }
      } catch (errConfig) {
        modeContournementActif = typeof window !== 'undefined' && localStorage.getItem('4ts_contournement_cinetpay') === 'true';
      }

      const { error } = await supabase
        .from('entreprises')
        .update({ espaces_souscrits: nouveauxEspaces })
        .eq(champCle, identifiantCible);

      if (error) throw error;

      setActivationEnCours(false);
      
      if (modeContournementActif) {
        afficherModaleNotification("Succès", "🎉 Nouveaux modules activés avec succès pour votre entreprise !", "succes");
        setTimeout(() => {
          setModeAction(null);
          window.location.reload();
        }, 1500);
      } else {
        setModeAction('reabonnement');
      }
    } catch (err) {
      setActivationEnCours(false);
      afficherModaleNotification("Erreur", "Erreur lors l’activation des modules : " + err.message, "erreur");
    }
  };

  const executerDeconnexion = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      window.location.href = '/connexion';
    }
  };

  const identifiantEntrepriseActuelle = entreprise?.id_entreprise || entreprise?.id || '';
  const domaineActuel = typeof window !== 'undefined' ? window.location.origin : 'https://4ts-suite-manager.vercel.app';
  const lienQrCodeEntreprise = `${domaineActuel}/client?entrepriseId=${identifiantEntrepriseActuelle}`;
  const imageUrlQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(lienQrCodeEntreprise)}`;

  const modificationEffectuee = modeModificationMdp && nouveauMotDePasse.trim().length > 0 && (nouveauMotDePasse === confirmerMotDePasse);

  // ================= DESIGN & CHARTE COULEURS =================
  const mainBg = isDarkMode ? 'text-slate-100' : 'text-slate-900';
  const cardBg = isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-xl' : 'bg-white border-[#0d2347]/30 text-slate-900 shadow-xl';
  const innerCardBg = isDarkMode ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-900';
  const inputBg = isDarkMode ? 'bg-slate-950 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-300 font-bold';
  const disabledInputBg = isDarkMode ? 'bg-slate-900/60 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-500 border-slate-200';
  
  const titleColor = isDarkMode ? 'text-slate-200' : 'text-[#0d2347]';
  const subTitleColor = isDarkMode ? 'text-slate-400' : 'text-slate-600';
  const labelText = isDarkMode ? 'text-slate-300 font-bold' : 'text-[#0d2347] font-bold';
  
  const accentBtnBg = isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700' : 'bg-[#0d2347] hover:bg-[#133265] text-white';
  const secondaryBtnBg = isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700' : 'bg-slate-200 hover:bg-slate-300 text-[#0d2347] font-bold border border-slate-300';
  
  const actionButtonClass = isDarkMode 
    ? 'w-full py-2.5 px-2 rounded-xl font-black uppercase text-[9px] transition border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 shadow-sm cursor-pointer flex flex-col items-center justify-center text-center gap-1' 
    : 'w-full py-2.5 px-2 rounded-xl font-black uppercase text-[9px] transition border border-[#0d2347]/30 bg-white hover:bg-slate-50 text-[#0d2347] shadow-sm cursor-pointer flex flex-col items-center justify-center text-center gap-1';

  if (chargement && !entreprise) {
    return <div className={`p-6 text-center text-xs font-bold animate-pulse ${subTitleColor}`}>Chargement instantané du profil...</div>;
  }

  if (!entreprise) {
    return <div className={`p-6 text-center text-rose-400 text-xs font-bold`}>Impossible de charger les informations.</div>;
  }

  const codesModulesRef = ['BOUTIQUE', 'LIVRAISON', 'LOGISTIQUE', 'TONTINE', 'ESPACE_BOUTIQUE', 'ESPACE_LIVRAISON', 'ESPACE_LOGISTIQUE', 'ESPACE_TONTINE', 'ESPACE_E_COMMERCE'];

  const modulesVisiblesEffectifs = espacesModulesConfig.length > 0 
    ? espacesModulesConfig.filter(m => m.visible !== false).map(m => (m.code_espace || '').toUpperCase())
    : codesModulesRef;

  return (
    <div className={`max-w-2xl mx-auto space-y-3 font-sans text-xs pb-6 ${mainBg}`}>
      
      <div className={`${cardBg} rounded-2xl p-4 space-y-4 transition-colors`}>
        
        <div className={`border-b pb-3 flex items-center space-x-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-300'}`}>
          <span className="text-base">👤</span>
          <h3 className={`font-black uppercase text-xs sm:text-sm tracking-wider ${titleColor}`}>
            MON PROFIL & INFORMATIONS PERSONNELLES
          </h3>
        </div>

        <form onSubmit={MettreAJourProfil} className="space-y-3">
          
          <div className={`${innerCardBg} p-3 rounded-xl border flex items-center gap-4 transition-colors`}>
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
              className={`w-14 h-14 rounded-xl border-2 border-[#0d2347] flex items-center justify-center overflow-hidden shrink-0 cursor-pointer relative group shadow-md ${isDarkMode ? 'bg-slate-950 border-slate-600' : 'bg-slate-200'}`}
            >
              {(logoEntreprise || avatarUtilisateur) ? (
                <img src={logoEntreprise || avatarUtilisateur} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className={`font-black text-base ${titleColor}`}>👤</span>
              )}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[9px] text-white font-bold text-center p-1">
                {uploadingLogo ? 'Envoi...' : 'Modifier Photo'}
              </div>
            </div>

            <div className="space-y-1 overflow-hidden">
              <span className={`block text-[9px] uppercase font-bold ${labelText}`}>
                ENTREPRISE RATTACHÉE : <strong className={titleColor}>{entreprise.nom_entreprise || 'N/A'}</strong>
              </span>
              <span className={`text-[9px] font-mono block ${subTitleColor}`}>
                ID : {identifiantEntrepriseActuelle || 'N/A'}
              </span>
              <h4 className={`font-extrabold uppercase text-sm truncate ${titleColor}`}>
                {nomUtilisateurConnecte || entreprise.nom_entreprise || 'Stéphane KTS'}
              </h4>
            </div>
          </div>

          {/* MENU DES BOUTONS D'ACTION */}
          {estAdminEntreprise ? (
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => setModeAction('reabonnement')}
                className={`${actionButtonClass} cursor-pointer`}
              >
                <span className="text-sm">🔄</span>
                <span className="text-center w-full">Réabo</span>
              </button>

              <button
                type="button"
                onClick={() => setModeAction('switcher_module')}
                className={`${actionButtonClass} cursor-pointer`}
              >
                <span className="text-sm">⚡</span>
                <span className="text-center w-full">Modules</span>
              </button>

              <button
                type="button"
                onClick={() => setModeAction('nouveau_module')}
                className={`${actionButtonClass} cursor-pointer`}
              >
                <span className="text-sm">➕</span>
                <span className="text-center w-full">Ajouter</span>
              </button>

              <button
                type="button"
                onClick={() => setModeAction('generateur_qr')}
                className={`${actionButtonClass} cursor-pointer`}
              >
                <span className="text-sm">📱</span>
                <span className="text-center w-full">QR Code</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModeAction('switcher_module')}
                className={`${actionButtonClass} cursor-pointer`}
              >
                <span className="text-sm">⚡</span>
                <span className="text-center w-full">Modules</span>
              </button>

              <button
                type="button"
                onClick={() => setModeAction('generateur_qr')}
                className={`${actionButtonClass} cursor-pointer`}
              >
                <span className="text-sm">📱</span>
                <span className="text-center w-full">QR Code</span>
              </button>
            </div>
          )}

          {/* INFORMATIONS DE SESSION */}
          <div className={`grid grid-cols-3 gap-2 text-center p-2.5 rounded-xl border ${innerCardBg}`}>
            <div>
              <span className={`block text-[8.5px] uppercase font-bold ${labelText}`}>Rôle / Statut</span>
              <span className={`text-[10px] font-black uppercase ${titleColor}`}>{roleUtilisateur}</span>
            </div>
            <div>
              <span className={`block text-[8.5px] uppercase font-bold ${labelText}`}>Module actif</span>
              <span className={`text-[10px] font-black uppercase ${titleColor}`}>{moduleActif}</span>
            </div>
            <div>
              <span className={`block text-[8.5px] uppercase font-bold ${labelText}`}>Statut session</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-500 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Actif
              </span>
            </div>
          </div>

          {/* CHAMPS PERSONNELS & MOT DE PASSE */}
          <div className={`space-y-2.5 p-3 rounded-xl border ${innerCardBg}`}>
            <div>
              <label className={`block text-[9px] uppercase font-bold mb-1 ${labelText}`}>Adresse e-mail personnelle</label>
              <input type="email" disabled value={emailUtilisateurConnecte} className={`w-full border rounded-lg p-2 text-xs cursor-not-allowed ${disabledInputBg}`} />
            </div>
            <div>
              <label className={`block text-[9px] uppercase font-bold mb-1 ${labelText}`}>Numéro de téléphone personnel</label>
              <input type="text" disabled value={telephoneUtilisateur} className={`w-full border rounded-lg p-2 text-xs cursor-not-allowed ${disabledInputBg}`} />
            </div>

            <div className={`space-y-2 pt-1 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-300'}`}>
              <div className="flex justify-between items-center">
                <label className={`block text-[9px] uppercase font-bold ${labelText}`}>Mot de passe / Code PIN</label>
                <button
                  type="button"
                  onClick={() => {
                    setModeModificationMdp(!modeModificationMdp);
                    if (modeModificationMdp) {
                      setNouveauMotDePasse('');
                      setConfirmerMotDePasse('');
                    }
                  }}
                  className={`text-[9.5px] font-bold px-2 py-1 rounded cursor-pointer ${modeModificationMdp ? secondaryBtnBg : accentBtnBg}`}
                >
                  {modeModificationMdp ? 'Annuler' : 'Modifier'}
                </button>
              </div>
              
              {modeModificationMdp && (
                <div className="space-y-2 animate-fadeIn">
                  <div className="relative">
                    <input
                      type={afficherMdp ? "text" : "password"}
                      value={nouveauMotDePasse}
                      onChange={(e) => setNouveauMotDePasse(e.target.value)}
                      placeholder="Nouveau mot de passe"
                      className={`w-full border rounded-lg p-2 pr-9 text-xs font-bold ${inputBg}`}
                    />
                    <button
                      type="button"
                      onClick={() => setAfficherMdp(!afficherMdp)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs focus:outline-none cursor-pointer"
                      title={afficherMdp ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {afficherMdp ? '👁️‍🗨️' : '👁️'}
                    </button>
                  </div>

                  <input
                    type={afficherMdp ? "text" : "password"}
                    value={confirmerMotDePasse}
                    onChange={(e) => setConfirmerMotDePasse(e.target.value)}
                    placeholder="Confirmer le nouveau mot de passe"
                    className={`w-full border rounded-lg p-2 text-xs font-bold ${inputBg}`}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="submit"
              disabled={enTrainDeSauvegarder || !modificationEffectuee}
              className={`w-full font-black py-2.5 px-2 rounded-xl shadow-md transition uppercase text-[10px] flex items-center justify-center gap-1 ${
                modificationEffectuee ? accentBtnBg + ' cursor-pointer' : 'bg-slate-500/30 text-slate-400 cursor-not-allowed'
              }`}
            >
              <span>💾</span>
              <span>{enTrainDeSauvegarder ? 'Enreg...' : 'Mettre à jour'}</span>
            </button>

            <button
              type="button"
              onClick={() => setModalDeconnexionOuverte(true)}
              className={`w-full border font-black py-2.5 px-2 rounded-xl shadow-md transition uppercase text-[10px] flex items-center justify-center gap-1 cursor-pointer ${
                isDarkMode 
                  ? 'bg-slate-800 hover:bg-rose-950 text-rose-400 border-slate-700' 
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
              }`}
            >
              <span>🚪</span>
              <span>Se déconnecter</span>
            </button>
          </div>

        </form>
      </div>

      {/* ================= MODALES ================= */}

      {/* 1. MODALE RÉABONNEMENT */}
      {modeAction === 'reabonnement' && estAdminEntreprise && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border p-5 space-y-4 max-h-[90vh] overflow-y-auto ${cardBg}`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-300/40">
              <h4 className={`font-black uppercase text-xs ${titleColor}`}>🔄 ESPACE RÉABONNEMENT</h4>
              <button 
                type="button" 
                onClick={() => setModeAction(null)}
                className={`text-xs font-bold px-3 py-1 rounded-lg cursor-pointer ${secondaryBtnBg}`}
              >
                Fermer ✕
              </button>
            </div>
            <EspaceSouscription entrepriseId={identifiantEntrepriseActuelle} isDarkMode={isDarkMode} />
          </div>
        </div>
      )}

      {/* 2. MODALE BASCULEMENT DE MODULE */}
      {modeAction === 'switcher_module' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl border p-5 space-y-4 ${cardBg}`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-300/40">
              <h4 className={`font-black uppercase text-xs flex items-center gap-1.5 ${titleColor}`}>
                <span>⚡</span> <span>Basculement de Module</span>
              </h4>
              <button 
                type="button" 
                onClick={() => setModeAction(null)}
                className={`text-xs font-bold px-3 py-1 rounded-lg cursor-pointer ${secondaryBtnBg}`}
              >
                Fermer ✕
              </button>
            </div>
            
            <p className={`text-[11px] ${subTitleColor}`}>
              Module actuellement actif : <strong className={`uppercase ${titleColor}`}>{moduleActif}</strong>
            </p>

            <div className="grid grid-cols-2 gap-2.5">
              {['BOUTIQUE', 'LIVRAISON', 'LOGISTIQUE', 'TONTINE']
                .filter(mod => {
                  const estSouscrit = espacesSouscrits.includes(mod) || mod === moduleActif;
                  const estVisibleParAdmin = modulesVisiblesEffectifs.some(v => v.includes(mod));
                  return estSouscrit && estVisibleParAdmin;
                })
                .map((mod) => {
                  const estActif = moduleActif === mod;

                  return (
                    <button
                      key={mod}
                      type="button"
                      disabled={estActif || changementModuleEnCours}
                      onClick={() => {
                        setModeAction(null);
                        initierBasculementModule(mod);
                      }}
                      className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                        estActif 
                          ? accentBtnBg + ' font-black' 
                          : innerCardBg + ' hover:opacity-90'
                      }`}
                    >
                      <span className="text-xs uppercase font-black">{mod}</span>
                      <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded ${
                        estActif 
                          ? 'bg-white/20 text-white' 
                          : secondaryBtnBg
                      }`}>
                        {estActif ? 'Actif ✓' : 'Basculer ⚡'}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* 3. MODALE AJOUT DE NOUVEAU MODULE */}
      {modeAction === 'nouveau_module' && estAdminEntreprise && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl border p-5 space-y-4 ${cardBg}`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-300/40">
              <h4 className={`font-black uppercase text-xs flex items-center gap-1.5 ${titleColor}`}>
                <span>➕</span> <span>Souscrire à un module</span>
              </h4>
              <button 
                type="button" 
                onClick={() => setModeAction(null)}
                className={`text-xs font-bold px-3 py-1 rounded-lg cursor-pointer ${secondaryBtnBg}`}
              >
                Fermer ✕
              </button>
            </div>

            <div className="space-y-2">
              {['BOUTIQUE', 'LIVRAISON', 'LOGISTIQUE', 'TONTINE']
                .filter(mod => modulesVisiblesEffectifs.some(v => v.includes(mod)))
                .map((mod) => {
                  const configMod = espacesModulesConfig.find(m => (m.code_espace || '').toUpperCase().includes(mod));
                  const estEnDev = mod === 'LOGISTIQUE' || (configMod && configMod.en_developpement === true);
                  const estDejaSouscrit = espacesSouscrits.includes(mod) || estEnDev;

                  return (
                    <label
                      key={mod}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                        estDejaSouscrit 
                          ? 'opacity-60 cursor-not-allowed ' + innerCardBg
                          : nouveauxModulesChoisis[mod] 
                            ? accentBtnBg + ' font-bold' 
                            : innerCardBg
                      }`}
                    >
                      <span className="text-[11px] font-bold">
                        {mod} {estEnDev ? '(En dev 🚧)' : estDejaSouscrit && '(Déjà actif)'}
                      </span>
                      <input
                        type="checkbox"
                        disabled={estDejaSouscrit}
                        checked={estEnDev ? false : (estDejaSouscrit ? true : nouveauxModulesChoisis[mod])}
                        onChange={(e) => {
                          if (!estDejaSouscrit && !estEnDev) {
                            setNouveauxModulesChoisis({ ...nouveauxModulesChoisis, [mod]: e.target.checked });
                          }
                        }}
                        className="accent-slate-700 w-4 h-4 cursor-pointer"
                      />
                    </label>
                  );
                })}
            </div>

            <button
              type="button"
              disabled={activationEnCours}
              onClick={(e) => {
                setModeAction(null);
                initierAjoutNouveauxModules(e);
              }}
              className={`w-full font-black py-2.5 rounded-xl text-xs uppercase shadow-md transition cursor-pointer ${accentBtnBg}`}
            >
              {activationEnCours ? 'Souscription...' : 'Activer les modules sélectionnés 🚀'}
            </button>
          </div>
        </div>
      )}

      {/* 4. MODALE QR CODE AVEC APPEL À L'ACTION ULTRA VIVANT ET LISIBLE JOUR/NUIT */}
      {modeAction === 'generateur_qr' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl border p-5 space-y-4 text-center ${cardBg}`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-300/40">
              <h4 className={`font-black uppercase text-xs ${titleColor}`}>📱 CODE QR DE VOTRE BOUTIQUE</h4>
              <button 
                type="button" 
                onClick={() => setModeAction(null)}
                className={`text-xs font-bold px-3 py-1 rounded-lg cursor-pointer ${secondaryBtnBg}`}
              >
                Fermer ✕
              </button>
            </div>
            
            <div className="bg-white p-4 rounded-2xl inline-block shadow-md border border-slate-300 mx-auto">
              <img src={imageUrlQrCode} alt="Code QR" className="w-48 h-48 object-contain mx-auto" />
              <p className="mt-2 font-black text-slate-900 text-xs uppercase">{entreprise.nom_entreprise || 'BOUTIQUE'}</p>
            </div>
            
            {/* 🚀 MESSAGE INCITATIF VIVANT ET LUMINEUX (PARFAIT MODE JOUR & NUIT) */}
            <div className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white shadow-lg border border-amber-300/50 animate-pulse">
              <p className="text-xs sm:text-sm font-black tracking-wider uppercase drop-shadow-md">
                📱 Scannez-moi pour commander !
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODALE NOTIFICATION / ERREUR / CONFIRMATION */}
      {modalesMessage.ouverte && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl border p-5 space-y-4 text-center ${cardBg}`}>
            
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl font-black bg-slate-500/20 text-slate-300">
              {modalesMessage.type === 'succes' ? '✓' : 'ℹ️'}
            </div>

            <div className="space-y-1">
              <h4 className={`font-black text-sm uppercase tracking-wider ${titleColor}`}>
                {modalesMessage.titre}
              </h4>
              <p className={`text-[11px] leading-relaxed ${subTitleColor}`}>
                {modalesMessage.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setModalesMessage({ ...modalesMessage, ouverte: false })}
              className={`w-full py-2.5 px-3 rounded-xl font-black text-xs uppercase transition shadow-md cursor-pointer ${accentBtnBg}`}
            >
              Compris 👍
            </button>

          </div>
        </div>
      )}

      {/* MODALE CONFIRMATION BASCULEMENT */}
      {modalConfirmationBasculementOuverte && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl border p-5 space-y-4 text-center ${cardBg}`}>
            <div className="w-12 h-12 bg-slate-500/20 text-slate-300 rounded-full flex items-center justify-center mx-auto text-xl font-black">⚡</div>
            <div className="space-y-1">
              <h4 className={`font-black text-sm uppercase tracking-wider ${titleColor}`}>Confirmation de basculement</h4>
              <p className={`text-[11px] ${subTitleColor}`}>
                Voulez-vous réellement basculer vers le module <strong className={`uppercase ${titleColor}`}>{moduleEnAttenteDeBasculement}</strong> 🚀 ?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button type="button" onClick={() => setModalConfirmationBasculementOuverte(false)} className={`py-2 px-3 rounded-xl font-black text-xs uppercase transition border cursor-pointer ${secondaryBtnBg}`}>Annuler</button>
              <button type="button" onClick={confirmerBasculementModule} className={`py-2 px-3 rounded-xl font-black text-xs uppercase transition shadow-md cursor-pointer ${accentBtnBg}`}>Oui, basculer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE MODULE NON SOUSCRIT */}
      {modalModuleNonSouscritOuverte && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl border p-5 space-y-4 text-center ${cardBg}`}>
            <div className="w-12 h-12 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto text-xl font-black">🔒</div>
            <div className="space-y-1.5">
              <h4 className={`font-black text-sm uppercase tracking-wider ${titleColor}`}>Module non souscrit</h4>
              <p className={`text-[11px] font-medium leading-relaxed ${subTitleColor}`}>
                Vous n'avez pas souscrit au module <strong className={`uppercase ${titleColor}`}>{moduleNonSouscritMessage}</strong>. Veuillez l'ajouter tout de suite pour en profiter.
              </p>
            </div>
            <div className="space-y-2 pt-1">
              {estAdminEntreprise && (
                <button type="button" onClick={() => { setModalModuleNonSouscritOuverte(false); setModeAction('nouveau_module'); }} className={`w-full py-2.5 px-3 rounded-xl font-black text-xs uppercase transition shadow-lg flex items-center justify-center gap-1.5 cursor-pointer ${accentBtnBg}`}>
                  <span>➕</span><span>Ajouter tout de suite ➔</span>
                </button>
              )}
              <button type="button" onClick={() => setModalModuleNonSouscritOuverte(false)} className={`w-full py-2 px-3 rounded-xl font-black text-xs uppercase transition border cursor-pointer ${secondaryBtnBg}`}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DÉCONNEXION */}
      {modalDeconnexionOuverte && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl border p-5 space-y-4 text-center ${cardBg}`}>
            <div className="w-12 h-12 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mx-auto text-xl font-black">🚪</div>
            <div className="space-y-1.5">
              <h4 className={`font-black text-sm uppercase tracking-wider ${titleColor}`}>Déconnexion de l'application</h4>
              <p className={`text-[11px] font-medium leading-relaxed ${subTitleColor}`}>Voulez-vous vraiment vous déconnecter de votre session en cours ?</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button type="button" onClick={() => setModalDeconnexionOuverte(false)} className={`py-2 px-3 rounded-xl font-black text-xs uppercase transition border cursor-pointer ${secondaryBtnBg}`}>Annuler</button>
              <button type="button" onClick={executerDeconnexion} className="py-2 px-3 rounded-xl font-black text-xs uppercase bg-rose-600 hover:bg-rose-700 text-white transition shadow-md cursor-pointer">Se déconnecter</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}