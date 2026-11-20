'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import EspaceSouscription from './EspaceSouscription';

export default function MonProfil({ entrepriseId = '', isDarkMode = false }) {
  const idEffectif = entrepriseId || (typeof window !== 'undefined' ? (localStorage.getItem('entrepriseId') || localStorage.getItem('entreprise_id')) : null) || '4TS-234321';
  
  // ⚡ 1. RÉCUPÉRATION INSTANTANÉE DU CACHE COMPLET
  const profilCache = typeof window !== 'undefined' ? (() => {
    try {
      const brutCache = localStorage.getItem(`4ts_cache_profil_complet_${idEffectif}`);
      if (brutCache) return JSON.parse(brutCache);
    } catch (e) {}

    let sessionObj = null;
    const brutJson = localStorage.getItem('utilisateur_connecte') || localStorage.getItem('utilisateurConnecte') || localStorage.getItem('user');
    if (brutJson && brutJson.trim().startsWith('{')) {
      try { sessionObj = JSON.parse(brutJson); } catch (e) {}
    }
    const cachedEntreprise = localStorage.getItem(`cache_entreprise_${idEffectif}`);
    let nomEnt = 'ISMA LOGISTIQUE';
    if (cachedEntreprise) {
      try { nomEnt = JSON.parse(cachedEntreprise).nom_entreprise || 'ISMA LOGISTIQUE'; } catch(e) {}
    }

    return {
      id: sessionObj?.id || localStorage.getItem('utilisateurId') || null,
      email: (sessionObj?.email || localStorage.getItem('emailConnecte') || '').trim().toLowerCase(),
      telephone: (sessionObj?.telephone || localStorage.getItem('telephoneConnecte') || '').trim(),
      nom: sessionObj ? `${sessionObj.nom_complet || sessionObj.nom || ''} ${sessionObj.prenom || ''}`.trim() : (brutJson && !brutJson.trim().startsWith('{') ? brutJson.trim() : 'UTILISATEUR'),
      role: (sessionObj?.nom_role || sessionObj?.role || localStorage.getItem('roleUtilisateur') || 'Employé').trim(),
      entrepriseNom: nomEnt,
      avatar: sessionObj?.photo || localStorage.getItem(`logo_entreprise_${idEffectif}`) || '',
      modules: ['BOUTIQUE', 'LIVRAISON']
    };
  })() : { id: null, email: '', nom: 'UTILISATEUR', telephone: '', role: 'Employé', entrepriseNom: 'ISMA LOGISTIQUE', avatar: '', modules: ['BOUTIQUE', 'LIVRAISON'] };

  const [entreprise, setEntreprise] = useState({ nom_entreprise: profilCache.entrepriseNom, id_entreprise: idEffectif });
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [utilisateurDbId, setUtilisateurDbId] = useState(profilCache.id);
  const [nomUtilisateurConnecte, setNomUtilisateurConnecte] = useState(profilCache.nom);
  const [emailUtilisateurConnecte, setEmailUtilisateurConnecte] = useState(profilCache.email);
  const [telephoneUtilisateur, setTelephoneUtilisateur] = useState(profilCache.telephone);
  const [roleUtilisateur, setRoleUtilisateur] = useState(profilCache.role);
  const [avatarUtilisateur, setAvatarUtilisateur] = useState(profilCache.avatar);

  const [modulesAutorisesUser, setModulesAutorisesUser] = useState(profilCache.modules);
  const [espacesModulesConfig, setEspacesModulesConfig] = useState([]);

  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmerMotDePasse, setConfirmerMotDePasse] = useState('');
  const [afficherMdp, setAfficherMdp] = useState(false);
  
  const [logoEntreprise, setLogoEntreprise] = useState(profilCache.avatar);
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
  const [modalesMessage, setModalesMessage] = useState({ ouverte: false, titre: '', message: '', type: 'succes' });

  const fileInputLogoRef = useRef(null);

  const roleUpper = String(roleUtilisateur).trim().toUpperCase();
  const estAdminEntreprise = roleUpper === 'ADMINISTRATEUR' || roleUpper === 'ADMIN' || roleUpper === 'SUPER ADMIN' || emailUtilisateurConnecte === 'stephs7352@gmail.com';

  useEffect(() => {
    chargerInfosUtilisateurEtEntrepriseSilencieux();
    chargerConfigModulesSupabase();
  }, [entrepriseId]);

  const chargerConfigModulesSupabase = async () => {
    try {
      const { data, error } = await supabase.from('espaces_modules').select('*');
      if (!error && data) setEspacesModulesConfig(data);
    } catch (err) {
      console.warn("Erreur chargement configuration modules :", err);
    }
  };

  // 🔄 SYNCHRONISATION SILENCIEUSE ET MISE À JOUR DU CACHE
  const chargerInfosUtilisateurEtEntrepriseSilencieux = async () => {
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
        const { data: dataFallback } = await supabase.from('entreprises').select('*').eq('id', idEffectif).maybeSingle();
        if (dataFallback) entrepriseTrouvee = dataFallback;
      }

      if (entrepriseTrouvee) setEntreprise(entrepriseTrouvee);

      const { data: usersList } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('id_entreprise', idEffectif);

      let utilisateurTrouve = null;
      let modulesUser = modulesAutorisesUser;

      if (usersList && usersList.length > 0) {
        let correspondances = usersList.filter(u => {
          if (profilCache.id && String(u.id) === String(profilCache.id)) return true;
          if (profilCache.email && u.email && u.email.trim().toLowerCase() === profilCache.email) return true;
          return false;
        });

        if (correspondances.length === 0 && profilCache.nom) {
          const nomRecherche = profilCache.nom.toLowerCase();
          correspondances = usersList.filter(u => {
            const nomBase = `${u.nom_complet || u.nom || ''} ${u.prenom || ''}`.trim().toLowerCase();
            return nomBase === nomRecherche || nomBase.includes(nomRecherche) || nomRecherche.includes(nomBase);
          });
        }

        if (correspondances.length > 0) {
          utilisateurTrouve = correspondances[0];
          const identiteBase = (utilisateurTrouve.nom_complet || '').trim().toUpperCase();
          const lignesMemeEmploye = usersList.filter(u => 
            (utilisateurTrouve.email && u.email && u.email.toLowerCase() === utilisateurTrouve.email.toLowerCase()) ||
            (identiteBase && (u.nom_complet || '').trim().toUpperCase() === identiteBase)
          );
          const mods = lignesMemeEmploye.map(u => (u.module || '').trim().toUpperCase()).filter(Boolean);
          if (mods.length > 0) modulesUser = Array.from(new Set(mods));
        }
      }

      let roleFinal = profilCache.role;
      if (utilisateurTrouve?.id_role) {
        const { data: roleData } = await supabase.from('roles').select('nom_role').eq('id', utilisateurTrouve.id_role).maybeSingle();
        if (roleData?.nom_role) roleFinal = roleData.nom_role;
      } else if (utilisateurTrouve?.nom_role) {
        roleFinal = utilisateurTrouve.nom_role;
      }

      const nomFinal = utilisateurTrouve ? `${utilisateurTrouve.nom_complet || utilisateurTrouve.nom || ''} ${utilisateurTrouve.prenom || ''}`.trim() : profilCache.nom;
      const emailFinal = utilisateurTrouve?.email || profilCache.email;
      const telFinal = utilisateurTrouve?.telephone || profilCache.telephone;
      const photoFinal = utilisateurTrouve?.photo || profilCache.avatar;
      const entNomFinal = entrepriseTrouvee?.nom_entreprise || profilCache.entrepriseNom;

      setModulesAutorisesUser(modulesUser);
      if (utilisateurTrouve) setUtilisateurDbId(utilisateurTrouve.id);
      setNomUtilisateurConnecte(nomFinal);
      setEmailUtilisateurConnecte(emailFinal);
      setTelephoneUtilisateur(telFinal);
      setRoleUtilisateur(roleFinal);
      if (photoFinal) { setAvatarUtilisateur(photoFinal); setLogoEntreprise(photoFinal); }

      if (typeof window !== 'undefined') {
        const profilAEnregistrer = {
          id: utilisateurTrouve?.id || profilCache.id,
          email: emailFinal,
          telephone: telFinal,
          nom: nomFinal,
          role: roleFinal,
          entrepriseNom: entNomFinal,
          avatar: photoFinal,
          modules: modulesUser
        };
        localStorage.setItem(`4ts_cache_profil_complet_${idEffectif}`, JSON.stringify(profilAEnregistrer));
        if (entrepriseTrouvee) {
          localStorage.setItem(`cache_entreprise_${idEffectif}`, JSON.stringify(entrepriseTrouvee));
        }
      }
    } catch (err) {
      console.warn("Erreur actualisation arrière-plan :", err.message);
    }
  };

  const donneesBrutesEspaces = entreprise?.espaces_souscrits || entreprise?.modules_souscrits;
  let espacesSouscrits = [];
  if (donneesBrutesEspaces) {
    if (Array.isArray(donneesBrutesEspaces)) {
      espacesSouscrits = donneesBrutesEspaces.map(m => String(m).trim().toUpperCase());
    } else if (typeof donneesBrutesEspaces === 'string') {
      espacesSouscrits = donneesBrutesEspaces.split(',').map(m => m.trim().toUpperCase());
    }
  }
  espacesSouscrits = Array.from(new Set(espacesSouscrits));

  const modulesAccessiblesEffectifs = estAdminEntreprise 
    ? (espacesSouscrits.length > 0 ? espacesSouscrits : modulesAutorisesUser) 
    : modulesAutorisesUser;

  const premierModuleAutorise = modulesAccessiblesEffectifs[0] || espacesSouscrits[0] || 'LIVRAISON';
  const moduleActif = typeof window !== 'undefined' ? (localStorage.getItem('module_actif') || premierModuleAutorise).toUpperCase() : premierModuleAutorise.toUpperCase();

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
        if (utilisateurDbId) {
          await supabase.from('utilisateurs').update({ photo: resultatBase64 }).eq('id', utilisateurDbId);
        }
        setUploadingLogo(false);
        afficherModaleNotification("Succès", "✅ Photo de profil mise à jour !", "succes");
      };
      lecteur.readAsDataURL(file);
    } catch (err) {
      afficherModaleNotification("Erreur", err.message, "erreur");
      setUploadingLogo(false);
    }
  };

  const MettreAJourProfil = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder || !nouveauMotDePasse.trim()) return;
    if (nouveauMotDePasse !== confirmerMotDePasse) {
      afficherModaleNotification("Erreur", "❌ Les mots de passe ne correspondent pas.", "erreur");
      return;
    }
    setEnTrainDeSauvegarder(true);
    try {
      const mdpPropre = nouveauMotDePasse.trim();
      if (utilisateurDbId) {
        await supabase.from('utilisateurs').update({ mot_de_passe: mdpPropre }).eq('id', utilisateurDbId);
      }
      if (estAdminEntreprise) {
        await supabase.from('entreprises').update({ mot_de_passe: mdpPropre, code_pin_activation: mdpPropre }).eq('id_entreprise', idEffectif);
      }
      afficherModaleNotification("Succès", "✅ Mot de passe mis à jour !", "succes");
      setNouveauMotDePasse('');
      setConfirmerMotDePasse('');
      setModeModificationMdp(false);
    } catch (err) {
      afficherModaleNotification("Erreur", err.message, "erreur");
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const initierBasculementModule = (nouveauModule) => {
    const modUpper = nouveauModule.toUpperCase();
    if (modUpper === moduleActif) return;
    setModuleEnAttenteDeBasculement(modUpper);
    setModalConfirmationBasculementOuverte(true);
  };

  const confirmerBasculementModule = async () => {
    if (!moduleEnAttenteDeBasculement) return;
    const modUpper = moduleEnAttenteDeBasculement;
    setModalConfirmationBasculementOuverte(false);
    setChangementModuleEnCours(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('module_actif', modUpper);
    }
    window.location.reload();
  };

  const executerDeconnexion = () => {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      window.location.href = '/connexion';
    }
  };

  const domaineActuel = typeof window !== 'undefined' ? window.location.origin : 'https://4ts-suite-manager.vercel.app';
  const lienQrCodeEntreprise = `${domaineActuel}/client?entrepriseId=${idEffectif}`;
  const imageUrlQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(lienQrCodeEntreprise)}`;
  const modificationEffectuee = modeModificationMdp && nouveauMotDePasse.trim().length > 0 && (nouveauMotDePasse === confirmerMotDePasse);

  // Styles & Couleurs
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
            <input type="file" ref={fileInputLogoRef} onChange={gererSelectionLogo} accept="image/*" className="hidden" />
            
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
                ENTREPRISE RATTACHÉE : <strong className={titleColor}>{entreprise.nom_entreprise || profilCache.entrepriseNom}</strong>
              </span>
              <span className={`text-[9px] font-mono block ${subTitleColor}`}>
                ID : {idEffectif}
              </span>
              <h4 className={`font-extrabold uppercase text-sm truncate ${titleColor}`}>
                {nomUtilisateurConnecte}
              </h4>
            </div>
          </div>

          {/* BOUTONS D'ACTION */}
          {estAdminEntreprise ? (
            <div className="grid grid-cols-4 gap-2">
              <button type="button" onClick={() => setModeAction('reabonnement')} className={actionButtonClass}>
                <span className="text-sm">🔄</span><span>Réabo</span>
              </button>
              <button type="button" onClick={() => setModeAction('switcher_module')} className={actionButtonClass}>
                <span className="text-sm">⚡</span><span>Modules</span>
              </button>
              <button type="button" onClick={() => setModeAction('nouveau_module')} className={actionButtonClass}>
                <span className="text-sm">➕</span><span>Ajouter</span>
              </button>
              <button type="button" onClick={() => setModeAction('generateur_qr')} className={actionButtonClass}>
                <span className="text-sm">📱</span><span>QR Code</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setModeAction('switcher_module')} className={actionButtonClass}>
                <span className="text-sm">⚡</span><span>Modules</span>
              </button>
              <button type="button" onClick={() => setModeAction('generateur_qr')} className={actionButtonClass}>
                <span className="text-sm">📱</span><span>QR Code</span>
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
                    if (modeModificationMdp) { setNouveauMotDePasse(''); setConfirmerMotDePasse(''); }
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
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs cursor-pointer"
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
                isDarkMode ? 'bg-slate-800 hover:bg-rose-950 text-rose-400 border-slate-700' : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
              }`}
            >
              <span>🚪</span>
              <span>Se déconnecter</span>
            </button>
          </div>

        </form>
      </div>

      {/* MODALES */}
      {modeAction === 'reabonnement' && estAdminEntreprise && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border p-5 space-y-4 max-h-[90vh] overflow-y-auto ${cardBg}`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-300/40">
              <h4 className={`font-black uppercase text-xs ${titleColor}`}>🔄 ESPACE RÉABONNEMENT</h4>
              <button type="button" onClick={() => setModeAction(null)} className={`text-xs font-bold px-3 py-1 rounded-lg ${secondaryBtnBg}`}>Fermer ✕</button>
            </div>
            <EspaceSouscription entrepriseId={idEffectif} isDarkMode={isDarkMode} />
          </div>
        </div>
      )}

      {modeAction === 'switcher_module' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl border p-5 space-y-4 ${cardBg}`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-300/40">
              <h4 className={`font-black uppercase text-xs ${titleColor}`}>⚡ Basculement de Module</h4>
              <button type="button" onClick={() => setModeAction(null)} className={`text-xs font-bold px-3 py-1 rounded-lg ${secondaryBtnBg}`}>Fermer ✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {['BOUTIQUE', 'LIVRAISON', 'LOGISTIQUE', 'TONTINE']
                .filter(mod => {
                  const estAutoriseUser = estAdminEntreprise || modulesAutorisesUser.includes(mod) || mod === moduleActif;
                  const estSouscrit = espacesSouscrits.includes(mod) || mod === moduleActif || estAdminEntreprise;
                  return estAutoriseUser && estSouscrit;
                })
                .map((mod) => {
                  const estActif = moduleActif === mod;
                  return (
                    <button
                      key={mod}
                      type="button"
                      disabled={estActif}
                      onClick={() => { setModeAction(null); initierBasculementModule(mod); }}
                      className={`p-3 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1.5 cursor-pointer ${estActif ? accentBtnBg + ' font-black' : innerCardBg}`}
                    >
                      <span className="text-xs uppercase font-black">{mod}</span>
                      <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded ${estActif ? 'bg-white/20 text-white' : secondaryBtnBg}`}>
                        {estActif ? 'Actif ✓' : 'Basculer ⚡'}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* MODALE QR CODE AVEC LE JOLI MESSAGE */}
      {modeAction === 'generateur_qr' && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl border p-5 space-y-4 text-center ${cardBg}`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-300/40">
              <h4 className={`font-black uppercase text-xs ${titleColor}`}>📱 CODE QR DE VOTRE BOUTIQUE</h4>
              <button type="button" onClick={() => setModeAction(null)} className={`text-xs font-bold px-3 py-1 rounded-lg cursor-pointer ${secondaryBtnBg}`}>Fermer ✕</button>
            </div>
            
            <div className="bg-white p-4 rounded-2xl inline-block shadow-md border border-slate-300 mx-auto">
              <img src={imageUrlQrCode} alt="Code QR" className="w-48 h-48 object-contain mx-auto" />
              <p className="mt-2 font-black text-slate-900 text-xs uppercase">{entreprise.nom_entreprise || 'BOUTIQUE'}</p>
            </div>

            {/* Joli message incitatif à scanner pour commander */}
            <div className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-white shadow-lg border border-amber-300/50 animate-pulse">
              <p className="text-xs sm:text-sm font-black tracking-wider uppercase drop-shadow-md">
                📱 Flashez ce code pour commander en un clin d'œil !
              </p>
            </div>
          </div>
        </div>
      )}

      {modalesMessage.ouverte && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl border p-5 space-y-4 text-center ${cardBg}`}>
            <h4 className={`font-black text-sm uppercase ${titleColor}`}>{modalesMessage.titre}</h4>
            <p className={`text-[11px] ${subTitleColor}`}>{modalesMessage.message}</p>
            <button type="button" onClick={() => setModalesMessage({ ...modalesMessage, ouverte: false })} className={`w-full py-2.5 rounded-xl font-black text-xs uppercase ${accentBtnBg}`}>Compris 👍</button>
          </div>
        </div>
      )}

      {modalConfirmationBasculementOuverte && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl border p-5 space-y-4 text-center ${cardBg}`}>
            <h4 className={`font-black text-sm uppercase ${titleColor}`}>Confirmation de basculement</h4>
            <p className={`text-[11px] ${subTitleColor}`}>Basculer vers <strong className={titleColor}>{moduleEnAttenteDeBasculement}</strong> ?</p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button type="button" onClick={() => setModalConfirmationBasculementOuverte(false)} className={`py-2 rounded-xl font-black text-xs uppercase border ${secondaryBtnBg}`}>Annuler</button>
              <button type="button" onClick={confirmerBasculementModule} className={`py-2 rounded-xl font-black text-xs uppercase ${accentBtnBg}`}>Oui</button>
            </div>
          </div>
        </div>
      )}

      {modalDeconnexionOuverte && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-sm rounded-2xl shadow-2xl border p-5 space-y-4 text-center ${cardBg}`}>
            <h4 className={`font-black text-sm uppercase ${titleColor}`}>Déconnexion</h4>
            <p className={`text-[11px] ${subTitleColor}`}>Voulez-vous vraiment vous déconnecter ?</p>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button type="button" onClick={() => setModalDeconnexionOuverte(false)} className={`py-2 rounded-xl font-black text-xs uppercase border ${secondaryBtnBg}`}>Annuler</button>
              <button type="button" onClick={executerDeconnexion} className="py-2 rounded-xl font-black text-xs uppercase bg-rose-600 hover:bg-rose-700 text-white">Se déconnecter</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}