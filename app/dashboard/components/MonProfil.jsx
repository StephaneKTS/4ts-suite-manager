'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const LISTE_MODULES_PRINCIPAUX = ['BOUTIQUE', 'LIVRAISON', 'LOGISTIQUE', 'TONTINE'];

const TARIFS_MODULES = {
  Boutique: { installation: 25000, mensuelPerUser: 5000, disponible: true },
  Livraison: { installation: 25000, mensuelPerUser: 5000, disponible: true },
  Logistique: { installation: 20000, mensuelPerUser: 4000, disponible: false }, // Verrouillé (en développement)
  Tontine: { installation: 25000, mensuelPerUser: 2500, disponible: true },
};

export default function MonProfil({ entrepriseId = '', isDarkMode = false }) {
  const [entreprise, setEntreprise] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [nomUtilisateurConnecte, setNomUtilisateurConnecte] = useState('');
  const [emailUtilisateurConnecte, setEmailUtilisateurConnecte] = useState('');
  const [telephoneUtilisateur, setTelephoneUtilisateur] = useState('');
  const [roleUtilisateur, setRoleUtilisateur] = useState('');
  const [avatarUtilisateur, setAvatarUtilisateur] = useState('');

  const [modulesAutorisesUser, setModulesAutorisesUser] = useState(['BOUTIQUE']);

  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmerMotDePasse, setConfirmerMotDePasse] = useState('');
  const [logoEntreprise, setLogoEntreprise] = useState('');
  const [modeModificationMdp, setModeModificationMdp] = useState(false);

  const [modeAction, setModeAction] = useState(null);
  const [nouveauxModulesChoisis, setNouveauxModulesChoisis] = useState({
    BOUTIQUE: false,
    LIVRAISON: false,
    LOGISTIQUE: false,
    TONTINE: false,
  });
  const [activationEnCours, setActivationEnCours] = useState(false);
  const [changementModuleEnCours, setChangementModuleEnCours] = useState(false);

  const fileInputLogoRef = useRef(null);

  const moduleActuel = typeof window !== 'undefined' ? (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase() : 'BOUTIQUE';
  const emailConnecte = typeof window !== 'undefined' ? (localStorage.getItem('emailConnecte') || 'stephs7352@gmail.com') : 'stephs7352@gmail.com';
  const utilisateurConnecte = typeof window !== 'undefined' ? (localStorage.getItem('utilisateurConnecte') || localStorage.getItem('utilisateur_connecte') || '') : '';

  const estSuperAdmin = 
    emailConnecte.toLowerCase().trim() === 'stephs7352@gmail.com' || 
    emailConnecte.toLowerCase().trim() === 'bureauisma26@gmail.com' || 
    emailConnecte.toLowerCase().trim() === 'stephanekts1312@gmail.com' ||
    utilisateurConnecte.includes('STÉPHANE') || 
    utilisateurConnecte.includes('KENMOE');

  const estAdminEntreprise = 
    estSuperAdmin || 
    roleUtilisateur.toUpperCase().includes('ADMIN') ||
    nomUtilisateurConnecte.toUpperCase().includes('ADMIN') || 
    (entreprise && nomUtilisateurConnecte.toUpperCase() === (entreprise.nom_entreprise || '').toUpperCase());

  useEffect(() => {
    chargerInfosUtilisateurEtEntreprise();
  }, [entrepriseId, moduleActuel]);

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
      let modulesDisponiblesPourUser = [moduleActuel];

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
          modulesDisponiblesPourUser = correspondanceUser.map(u => (u.module || 'BOUTIQUE').toUpperCase());
        }
      }

      setModulesAutorisesUser(Array.from(new Set(modulesDisponiblesPourUser)));

      let nomFinal = utilisateurTrouve ? (`${utilisateurTrouve.nom || utilisateurTrouve.nom_complet || ''} ${utilisateurTrouve.prenom || ''}`.trim()) : (entrepriseTrouvee?.nom_entreprise || 'STÉPHANE KTS');
      let emailFinal = utilisateurTrouve?.email || emailConnecte || entrepriseTrouvee?.email || 'stephs7352@gmail.com';
      let telephoneFinal = utilisateurTrouve?.telephone || entrepriseTrouvee?.telephone || '655597099';
      let roleFinal = utilisateurTrouve?.role || utilisateurTrouve?.type_collaborateur || (estAdminEntreprise ? 'Administrateur' : 'Employé');

      setNomUtilisateurConnecte(nomFinal);
      setEmailUtilisateurConnecte(emailFinal);
      setTelephoneUtilisateur(telephoneFinal);
      setRoleUtilisateur(roleFinal);

      const logoLocal = (typeof window !== 'undefined') ? (localStorage.getItem(`logo_entreprise_${idEffectif}`) || utilisateurTrouve?.avatar || '') : '';
      if (logoLocal) setLogoEntreprise(logoLocal);

    } catch (err) {
      console.error('Erreur chargement profil strict :', err.message);
    } finally {
      setChargement(false);
    }
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

  // Normalisation des espaces souscrits (Boutique, Livraison et Tontine sont actifs par défaut pour l'entreprise)
  const donneesBrutesEspaces = entreprise?.espaces_souscrits;
  let espacesSouscrits = [moduleActuel, 'BOUTIQUE', 'LIVRAISON', 'TONTINE'];
  if (donneesBrutesEspaces) {
    if (Array.isArray(donneesBrutesEspaces)) {
      espacesSouscrits = donneesBrutesEspaces.map(m => String(m).trim().toUpperCase());
    } else if (typeof donneesBrutesEspaces === 'string') {
      espacesSouscrits = donneesBrutesEspaces.split(',').map(m => m.trim().toUpperCase());
    }
  }
  // S'assurer que Boutique, Livraison et Tontine sont reconnus comme acquis/souscrits
  if (!espacesSouscrits.includes('BOUTIQUE')) espacesSouscrits.push('BOUTIQUE');
  if (!espacesSouscrits.includes('LIVRAISON')) espacesSouscrits.push('LIVRAISON');
  if (!espacesSouscrits.includes('TONTINE')) espacesSouscrits.push('TONTINE');
  espacesSouscrits = Array.from(new Set(espacesSouscrits));

  const basculerModuleActif = async (nouveauModule) => {
    const modUpper = nouveauModule.toUpperCase();

    // Vérification du module Logistique (en cours de développement)
    if (modUpper === 'LOGISTIQUE') {
      alert('🚧 Le module Logistique est actuellement en cours de développement et sera bientôt disponible.');
      return;
    }

    if (!entreprise) return;
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

      alert(`Affichage basculé vers le module : ${modUpper} 🚀`);
      window.location.reload(); 
    } catch (err) {
      alert('Erreur lors du changement de module : ' + err.message);
    } finally {
      setChangementModuleEnCours(false);
    }
  };

  const validerActivationNouveauxModules = async () => {
    if (!entreprise) return;
    setActivationEnCours(true);

    try {
      const modulesSelectionnesListe = Object.keys(nouveauxModulesChoisis).filter(m => nouveauxModulesChoisis[m]);
      if (modulesSelectionnesListe.length === 0) {
        alert('⚠️ Veuillez sélectionner au moins un module à ajouter.');
        setActivationEnCours(false);
        return;
      }

      const nouveauxEspaces = Array.from(new Set([...espacesSouscrits, ...modulesSelectionnesListe.map(m => m.toUpperCase())]));
      const identifiantCible = entreprise.id_entreprise || entreprise.id;
      const champCle = entreprise.id_entreprise ? 'id_entreprise' : 'id';

      const { error } = await supabase
        .from('entreprises')
        .update({ espaces_souscrits: nouveauxEspaces })
        .eq(champCle, identifiantCible);

      if (error) throw error;

      alert('🎉 Nouveaux modules activés avec succès pour votre entreprise !');
      setModeAction(null);
      await chargerInfosUtilisateurEtEntreprise();
      window.location.reload();
    } catch (err) {
      alert('Erreur lors de l’activation des modules : ' + err.message);
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

  const identifiantEntrepriseActuelle = entreprise?.id_entreprise || entreprise?.id || '';
  const domaineActuel = typeof window !== 'undefined' ? window.location.origin : 'https://4ts-suite-manager.vercel.app';
  const lienQrCodeEntreprise = `${domaineActuel}/client?entrepriseId=${identifiantEntrepriseActuelle}`;
  const imageUrlQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(lienQrCodeEntreprise)}`;

  const containerBg = isDarkMode ? 'bg-[#0b1329] border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm';
  const innerCardBg = isDarkMode ? 'bg-[#0f1c3f] border-slate-800/80 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800';
  const inputBg = isDarkMode ? 'bg-[#1b263b] text-white border-slate-700' : 'bg-white text-slate-900 border-slate-300';
  const disabledInputBg = isDarkMode ? 'bg-slate-900/60 text-slate-400 border-slate-800' : 'bg-slate-100 text-slate-500 border-slate-200';
  const labelText = isDarkMode ? 'text-slate-300 font-bold' : 'text-slate-700 font-bold';
  const headerTitleText = isDarkMode ? 'text-white' : 'text-slate-900';

  const actionButtonClass = isDarkMode 
    ? 'w-full bg-[#1b263b] hover:bg-orange-600 text-slate-200 hover:text-white border border-slate-700 hover:border-orange-500 font-bold py-2 px-1 rounded-xl shadow-xs transition uppercase text-[8px] flex flex-col items-center justify-center gap-1' 
    : 'w-full bg-slate-900 hover:bg-orange-600 text-white font-bold py-2 px-1 rounded-xl shadow-xs transition uppercase text-[8px] flex flex-col items-center justify-center gap-1';

  if (chargement && !entreprise) {
    return <div className={`p-6 text-center text-xs font-bold animate-pulse ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Chargement instantané du profil...</div>;
  }

  if (!entreprise) {
    return <div className="p-6 text-center text-rose-400 text-xs font-bold">Impossible de charger les informations.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-3 font-sans text-xs pb-6">
      
      <div className={`${containerBg} border rounded-2xl p-4 shadow-xl space-y-4 transition-colors`}>
        
        <div className={`border-b pb-3 flex items-center space-x-2 ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
          <span className="text-base">👤</span>
          <h3 className={`font-black uppercase text-xs tracking-wider ${headerTitleText}`}>
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
              className={`w-14 h-14 rounded-xl border-2 border-orange-500 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer relative group shadow-md ${isDarkMode ? 'bg-slate-900' : 'bg-slate-200'}`}
            >
              {(logoEntreprise || avatarUtilisateur) ? (
                <img src={logoEntreprise || avatarUtilisateur} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-orange-500 font-black text-base">👤</span>
              )}
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[9px] text-white font-bold text-center p-1">
                {uploadingLogo ? 'Envoi...' : 'Modifier Photo'}
              </div>
            </div>

            <div className="space-y-1 overflow-hidden">
              <span className={`block text-[9px] uppercase font-bold ${labelText}`}>
                ENTREPRISE RATTACHÉE : <strong className="text-orange-500">{entreprise.nom_entreprise || 'N/A'}</strong>
              </span>
              <span className={`text-[9px] font-mono block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                ID : {identifiantEntrepriseActuelle || 'N/A'}
              </span>
              <h4 className={`font-extrabold uppercase text-sm truncate ${headerTitleText}`}>
                {nomUtilisateurConnecte || entreprise.nom_entreprise || 'Stéphane KTS'}
              </h4>
            </div>
          </div>

          {/* MENU DES BOUTONS D'ACTION */}
          {estAdminEntreprise ? (
            <div className="grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => setModeAction(modeAction === 'reabonnement' ? null : 'reabonnement')}
                className={actionButtonClass}
              >
                <span className="text-xs">🔄</span>
                <span className="text-center w-full">{modeAction === 'reabonnement' ? 'Fermer' : 'Réabonnement'}</span>
              </button>

              <button
                type="button"
                onClick={() => setModeAction(modeAction === 'switcher_module' ? null : 'switcher_module')}
                className={actionButtonClass}
              >
                <span className="text-xs">⚡</span>
                <span className="text-center w-full">{modeAction === 'switcher_module' ? 'Fermer' : 'Modules'}</span>
              </button>

              <button
                type="button"
                onClick={() => setModeAction(modeAction === 'nouveau_module' ? null : 'nouveau_module')}
                className={actionButtonClass}
              >
                <span className="text-xs">➕</span>
                <span className="text-center w-full">{modeAction === 'nouveau_module' ? 'Fermer' : 'Ajouter'}</span>
              </button>

              <button
                type="button"
                onClick={() => setModeAction(modeAction === 'generateur_qr' ? null : 'generateur_qr')}
                className={actionButtonClass}
              >
                <span className="text-xs">📱</span>
                <span className="text-center w-full">{modeAction === 'generateur_qr' ? 'Fermer' : 'QR Code'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModeAction(modeAction === 'switcher_module' ? null : 'switcher_module')}
                className={actionButtonClass}
              >
                <span className="text-xs">⚡</span>
                <span>{modeAction === 'switcher_module' ? 'Fermer' : 'Changer module'}</span>
              </button>

              <button
                type="button"
                onClick={() => setModeAction(modeAction === 'generateur_qr' ? null : 'generateur_qr')}
                className={actionButtonClass}
              >
                <span className="text-xs">📱</span>
                <span>{modeAction === 'generateur_qr' ? 'Fermer' : 'Mon QR Code'}</span>
              </button>
            </div>
          )}

          {/* PANNEAU D'AFFICHAGE DU QR CODE */}
          {modeAction === 'generateur_qr' && (
            <div className={`${innerCardBg} border border-orange-500/40 p-4 rounded-xl space-y-3 text-center shadow-md`}>
              <h4 className="font-black text-orange-500 uppercase text-xs flex items-center justify-between">
                <span>📱 CODE QR DE VOTRE BOUTIQUE</span>
                <span className="font-mono text-[10px]">ID : {identifiantEntrepriseActuelle}</span>
              </h4>
              <div className="bg-white p-4 rounded-2xl inline-block shadow-md border border-slate-300 mx-auto">
                <img src={imageUrlQrCode} alt="Code QR" className="w-48 h-48 object-contain mx-auto" />
                <p className="mt-2 font-black text-slate-900 text-xs uppercase">{entreprise.nom_entreprise || 'BOUTIQUE'}</p>
              </div>
            </div>
          )}

          {/* PANNEAU DE SWITCH DE MODULE */}
          {modeAction === 'switcher_module' && (
            <div className={`${innerCardBg} border border-slate-700 p-3 rounded-xl space-y-3 shadow-md`}>
              <h4 className="font-black text-orange-500 uppercase text-[10px] flex items-center justify-between">
                <span>⚡ Choix & Basculement de Module</span>
                <span className="font-normal">Actif : <strong className="text-orange-500">{moduleActuel}</strong></span>
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {LISTE_MODULES_PRINCIPAUX.map((mod) => {
                  const estActif = moduleActuel === mod;
                  const estLogistique = mod === 'LOGISTIQUE';

                  return (
                    <button
                      key={mod}
                      type="button"
                      disabled={estActif || changementModuleEnCours}
                      onClick={() => basculerModuleActif(mod)}
                      className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                        estActif 
                          ? 'bg-orange-600 border-orange-500 text-white font-black' 
                          : estLogistique 
                            ? (isDarkMode ? 'bg-slate-900/80 border-slate-800 text-slate-400 opacity-80 cursor-pointer' : 'bg-slate-100 border-slate-300 text-slate-500 cursor-pointer') 
                            : (isDarkMode ? 'bg-[#1b263b] hover:bg-slate-800 border-slate-700 text-slate-200' : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800')
                      }`}
                    >
                      <span className="text-xs uppercase font-black">{mod}</span>
                      <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded ${
                        estActif 
                          ? 'bg-orange-500 text-white' 
                          : estLogistique 
                            ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' 
                            : (isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700')
                      }`}>
                        {estActif ? 'Module Actif ✓' : estLogistique ? 'En cours de dev 🚧' : 'Cliquer pour basculer ⚡'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* PANNEAU POUR AJOUTER UN NOUVEAU MODULE */}
          {estAdminEntreprise && modeAction === 'nouveau_module' && (
            <div className={`${innerCardBg} border border-orange-500/40 p-3 rounded-xl space-y-2.5 shadow-md`}>
              <h4 className="font-black text-orange-500 uppercase text-[10px]">
                ➕ Souscrire à un nouveau module :
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {LISTE_MODULES_PRINCIPAUX.map((mod) => {
                  const estLogistique = mod === 'LOGISTIQUE';
                  const estDejaSouscrit = espacesSouscrits.includes(mod) || estLogistique;

                  return (
                    <label
                      key={mod}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition ${
                        estDejaSouscrit 
                          ? 'opacity-60 cursor-not-allowed ' + (isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-500')
                          : nouveauxModulesChoisis[mod] 
                            ? 'bg-orange-600 text-white border-orange-500 font-bold' 
                            : inputBg
                      }`}
                    >
                      <span className="text-[10px]">
                        {mod} {estLogistique ? '(En dev 🚧)' : estDejaSouscrit && '(Déjà actif)'}
                      </span>
                      <input
                        type="checkbox"
                        disabled={estDejaSouscrit}
                        checked={estLogistique ? false : (estDejaSouscrit ? true : nouveauxModulesChoisis[mod])}
                        onChange={(e) => {
                          if (!estDejaSouscrit && !estLogistique) {
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
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-2 rounded-lg text-[10px] uppercase shadow-md transition"
              >
                {activationEnCours ? 'Souscription...' : 'Activer les nouveaux modules 🚀'}
              </button>
            </div>
          )}

          {/* INFORMATIONS DE SESSION */}
          <div className={`grid grid-cols-3 gap-2 text-center p-2.5 rounded-xl border ${innerCardBg}`}>
            <div>
              <span className={`block text-[8.5px] uppercase font-bold ${labelText}`}>Rôle / Statut</span>
              <span className="text-[10px] font-black text-orange-500 uppercase">{roleUtilisateur || 'Administrateur'}</span>
            </div>
            <div>
              <span className={`block text-[8.5px] uppercase font-bold ${labelText}`}>Module actif</span>
              <span className="text-[10px] font-black text-orange-500 uppercase">{moduleActuel}</span>
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

            <div className={`space-y-2 pt-1 border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex justify-between items-center">
                <label className={`block text-[9px] uppercase font-bold ${labelText}`}>Mot de passe / Code PIN</label>
                <button
                  type="button"
                  onClick={() => setModeModificationMdp(!modeModificationMdp)}
                  className={`text-[9.5px] font-bold px-2 py-0.5 rounded ${modeModificationMdp ? 'bg-slate-700 text-slate-200' : 'bg-orange-600 text-white'}`}
                >
                  {modeModificationMdp ? 'Annuler' : 'Modifier'}
                </button>
              </div>
              
              {modeModificationMdp && (
                <div className="space-y-2 animate-fadeIn">
                  <input
                    type="password"
                    value={nouveauMotDePasse}
                    onChange={(e) => setNouveauMotDePasse(e.target.value)}
                    placeholder="Nouveau mot de passe"
                    className={`w-full border rounded-lg p-2 text-xs font-bold ${inputBg} border-orange-500/60`}
                  />
                  <input
                    type="password"
                    value={confirmerMotDePasse}
                    onChange={(e) => setConfirmerMotDePasse(e.target.value)}
                    placeholder="Confirmer le nouveau mot de passe"
                    className={`w-full border rounded-lg p-2 text-xs font-bold ${inputBg} border-orange-500/60`}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="submit"
              disabled={enTrainDeSauvegarder || !modeModificationMdp || !nouveauMotDePasse.trim()}
              className={`w-full font-black py-2.5 px-2 rounded-xl shadow-md transition uppercase text-[10px] flex items-center justify-center gap-1 ${
                modeModificationMdp && nouveauMotDePasse.trim() ? 'bg-orange-600 hover:bg-orange-500 text-white' : 'bg-slate-700 text-slate-400 opacity-60 cursor-not-allowed'
              }`}
            >
              <span>💾</span>
              <span>{enTrainDeSauvegarder ? 'Enreg...' : 'Mettre à jour'}</span>
            </button>

            <button
              type="button"
              onClick={seDeconnecter}
              className={`w-full border font-black py-2.5 px-2 rounded-xl shadow-md transition uppercase text-[10px] flex items-center justify-center gap-1 ${
                isDarkMode 
                  ? 'bg-slate-900 hover:bg-rose-950 text-rose-400 border-rose-900/50' 
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
              }`}
            >
              <span>🚪</span>
              <span>Se déconnecter</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}