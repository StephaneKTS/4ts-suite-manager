'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const LISTE_MODULES_PRINCIPAUX = ['BOUTIQUE', 'LIVRAISON', 'LOGISTIQUE', 'TONTINE'];

const TARIFS_MODULES = {
  Boutique: { installation: 25000, mensuelPerUser: 5000, disponible: true },
  Livraison: { installation: 25000, mensuelPerUser: 5000, disponible: true },
  Logistique: { installation: 20000, mensuelPerUser: 4000, disponible: false },
  Tontine: { installation: 25000, mensuelPerUser: 2500, disponible: true }, // ✅ Activé ici
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

  // Modules autorisés pour l'employé connecté
  const [modulesAutorisesUser, setModulesAutorisesUser] = useState(['BOUTIQUE']);

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
  const emailConnecte = typeof window !== 'undefined' ? (localStorage.getItem('emailConnecte') || 'stephs7352@gmail.com') : 'stephs7352@gmail.com';
  const utilisateurConnecte = typeof window !== 'undefined' ? (localStorage.getItem('utilisateurConnecte') || localStorage.getItem('utilisateur_connecte') || '') : '';

  // Vérification explicite et prioritaire de l'e-mail Super-Admin
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
    
    const cleCacheLocal = `4ts_profil_cache_${idEffectif}_${moduleActuel}`;

    try {
      if (typeof window !== 'undefined') {
        const donneesCachees = localStorage.getItem(cleCacheLocal);
        if (donneesCachees) {
          const parsed = JSON.parse(donneesCachees);
          setEntreprise(parsed.entreprise);
          setNomUtilisateurConnecte(parsed.nomUtilisateurConnecte || 'STEPHANE KTS');
          setEmailUtilisateurConnecte(parsed.emailUtilisateurConnecte || 'stephs7352@gmail.com');
          setTelephoneUtilisateur(parsed.telephoneUtilisateur || '655597099');
          setRoleUtilisateur(parsed.roleUtilisateur || 'Administrateur');
          setAvatarUtilisateur(parsed.avatarUtilisateur || '');
          if (parsed.logoEntreprise) setLogoEntreprise(parsed.logoEntreprise);
          setChargement(false);
        }
      }

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
          const matchNom = nomRecherche && (nomCompletBase.includes(nomRecherche) || nomRecherche.includes(nomCompletBase));
          const matchEmail = emailConnecte && u.email && u.email.toLowerCase() === emailConnecte.toLowerCase();
          return matchNom || matchEmail;
        });

        if (correspondanceUser.length > 0) {
          utilisateurTrouve = correspondanceUser[0];
          modulesDisponiblesPourUser = correspondanceUser.map(u => (u.module || 'BOUTIQUE').toUpperCase());
        }
      }

      setModulesAutorisesUser(Array.from(new Set(modulesDisponiblesPourUser)));

      let nomFinal = utilisateurTrouve ? (`${utilisateurTrouve.nom || utilisateurTrouve.nom_complet || ''} ${utilisateurTrouve.prenom || ''}`.trim()) : (entrepriseTrouvee?.nom_entreprise || 'STEPHANE KTS');
      let emailFinal = utilisateurTrouve?.email || emailConnecte || entrepriseTrouvee?.email || 'stephs7352@gmail.com';
      let telephoneFinal = utilisateurTrouve?.telephone || entrepriseTrouvee?.telephone || '655597099';
      let roleFinal = utilisateurTrouve?.role || utilisateurTrouve?.type_collaborateur || (estAdminEntreprise ? 'Administrateur' : 'Employé');
      let avatarFinal = utilisateurTrouve?.avatar || utilisateurTrustAvatar(utilisateurTrouve) || '';

      function utilisateurTrustAvatar(u) {
        return u?.photo || '';
      }

      setNomUtilisateurConnecte(nomFinal);
      setEmailUtilisateurConnecte(emailFinal);
      setTelephoneUtilisateur(telephoneFinal);
      setRoleUtilisateur(roleFinal);
      if (avatarFinal) setAvatarUtilisateur(avatarFinal);

      const logoLocal = (typeof window !== 'undefined') ? (localStorage.getItem(`logo_entreprise_${idEffectif}`) || avatarFinal) : '';
      if (logoLocal) setLogoEntreprise(logoLocal);

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

  const seDeconnecter = () => {
    if (confirm('Voulez-vous vraiment vous déconnecter de l’application ?')) {
      if (typeof window !== 'undefined') {
        localStorage.clear();
        window.location.href = '/connexion';
      }
    }
  };

  // Génération dynamique et universelle du lien QR code de la boutique
  const identifiantEntrepriseActuelle = entreprise?.id_entreprise || entreprise?.id || '';
  const domaineActuel = typeof window !== 'undefined' ? window.location.origin : 'https://4ts-suite-manager.vercel.app';
  const lienQrCodeEntreprise = `${domaineActuel}/client?entrepriseId=${identifiantEntrepriseActuelle}`;
  
  // URL de l'API publique pour générer l'image du QR code directement en grand format
  const imageUrlQrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(lienQrCodeEntreprise)}`;

  // Styles dynamiques selon isDarkMode
  const containerBg = isDarkMode ? 'bg-[#0b1329] border-cyan-900/60 text-slate-100' : 'bg-white border-blue-600/30 text-slate-900 shadow-sm';
  const innerCardBg = isDarkMode ? 'bg-[#0d1b2a] border-blue-900/40' : 'bg-slate-50 border-slate-200';
  const inputBg = isDarkMode ? 'bg-[#1b263b] text-white border-blue-900' : 'bg-white text-slate-900 border-slate-300';
  const disabledInputBg = isDarkMode ? 'bg-slate-900/60 text-slate-300 border-blue-900/50' : 'bg-slate-100 text-slate-600 border-slate-200';
  const labelText = isDarkMode ? 'text-blue-300' : 'text-slate-700 font-bold';
  const headerTitleText = isDarkMode ? 'text-white' : 'text-slate-900';

  if (chargement && !entreprise) {
    return <div className={`p-6 text-center text-xs font-bold animate-pulse ${isDarkMode ? 'text-cyan-400' : 'text-blue-600'}`}>Chargement instantané du profil...</div>;
  }

  if (!entreprise) {
    return <div className="p-6 text-center text-rose-400 text-xs font-bold">Impossible de charger les informations.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-3 font-sans text-xs pb-6">
      
      <div className={`${containerBg} border rounded-2xl p-4 shadow-xl space-y-4 transition-colors`}>
        
        <div className={`border-b pb-3 flex items-center space-x-2 ${isDarkMode ? 'border-blue-900/60' : 'border-slate-200'}`}>
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
              <span className={`block text-[9px] uppercase font-bold ${labelText}`}>
                ENTREPRISE RATTACHÉE : <strong className="text-orange-400">{entreprise.nom_entreprise || 'N/A'}</strong>
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
            <div className="grid grid-cols-4 gap-1">
              <button
                type="button"
                onClick={() => setModeAction(modeAction === 'reabonnement' ? null : 'reabonnement')}
                className="w-full bg-red-600 hover:bg-red-500 text-white border-red-500 font-black py-1.5 px-1 rounded-xl shadow transition uppercase text-[7.5px] leading-tight flex flex-col items-center justify-center gap-0.5 border"
              >
                <span className="text-xs">🔄</span>
                <span className="text-center w-full">{modeAction === 'reabonnement' ? 'Fermer' : 'Réabonnement'}</span>
              </button>

              <button
                type="button"
                onClick={() => setModeAction(modeAction === 'switcher_module' ? null : 'switcher_module')}
                className="w-full bg-red-600 hover:bg-red-500 text-white border-red-500 font-black py-1.5 px-1 rounded-xl shadow transition uppercase text-[7.5px] leading-tight flex flex-col items-center justify-center gap-0.5 border"
              >
                <span className="text-xs">⚡</span>
                <span className="text-center w-full">{modeAction === 'switcher_module' ? 'Fermer' : 'Modules'}</span>
              </button>

              <button
                type="button"
                onClick={() => setModeAction(modeAction === 'nouveau_module' ? null : 'nouveau_module')}
                className="w-full bg-red-600 hover:bg-red-500 text-white border-red-500 font-black py-1.5 px-1 rounded-xl shadow transition uppercase text-[7.5px] leading-tight flex flex-col items-center justify-center gap-0.5 border"
              >
                <span className="text-xs">➕</span>
                <span className="text-center w-full">{modeAction === 'nouveau_module' ? 'Fermer' : 'Ajouter'}</span>
              </button>

              <button
                type="button"
                onClick={() => setModeAction(modeAction === 'generateur_qr' ? null : 'generateur_qr')}
                className="w-full bg-red-600 hover:bg-red-500 text-white border-red-500 font-black py-1.5 px-1 rounded-xl shadow transition uppercase text-[7.5px] leading-tight flex flex-col items-center justify-center gap-0.5 border"
              >
                <span className="text-xs">📱</span>
                <span className="text-center w-full">{modeAction === 'generateur_qr' ? 'Fermer' : 'Mon QR Code'}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setModeAction(modeAction === 'switcher_module' ? null : 'switcher_module')}
                className="w-full bg-red-600 hover:bg-red-500 text-white border-red-500 font-black py-2.5 px-2 rounded-xl shadow transition uppercase text-[9px] flex items-center justify-center gap-1 border"
              >
                <span>⚡</span>
                <span>{modeAction === 'switcher_module' ? 'Fermer' : 'Changer module'}</span>
              </button>

              <button
                type="button"
                onClick={() => setModeAction(modeAction === 'generateur_qr' ? null : 'generateur_qr')}
                className="w-full bg-red-600 hover:bg-red-500 text-white border-red-500 font-black py-2.5 px-2 rounded-xl shadow transition uppercase text-[9px] flex items-center justify-center gap-1 border"
              >
                <span>📱</span>
                <span>{modeAction === 'generateur_qr' ? 'Fermer' : 'Mon QR Code'}</span>
              </button>
            </div>
          )}

          {/* PANNEAU D'AFFICHAGE DIRECT DU QR CODE EN GRAND ÉCRAN */}
          {modeAction === 'generateur_qr' && (
            <div className={`${innerCardBg} border-2 border-amber-500/60 p-4 rounded-xl space-y-3 shadow-inner animate-fadeIn text-center transition-colors`}>
              <h4 className="font-black text-amber-400 uppercase text-xs flex items-center justify-between">
                <span>📱 CODE QR DE VOTRE BOUTIQUE</span>
                <span className="text-orange-400 font-mono text-[10px]">ID : {identifiantEntrepriseActuelle}</span>
              </h4>

              <p className={`text-[10px] ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Présentez cet écran directement à votre client. Il lui suffit de le scanner avec son téléphone pour accéder instantanément à votre menu.
              </p>

              <div className="bg-white p-4 rounded-2xl inline-block shadow-md border-2 border-slate-200 mx-auto">
                <img 
                  src={imageUrlQrCode} 
                  alt="Code QR de la boutique" 
                  className="w-48 h-48 object-contain mx-auto"
                />
                <p className="mt-2 font-black text-slate-900 text-xs uppercase">{entreprise.nom_entreprise || 'BOUTIQUE'}</p>
              </div>

              <div className="flex justify-center gap-2 pt-2">
                <a
                  href={imageUrlQrCode}
                  download={`QR-Code-${identifiantEntrepriseActuelle}.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded-xl text-xs uppercase shadow transition flex items-center gap-1"
                >
                  <span>📥</span> Télécharger l'image
                </a>
                <button
                  type="button"
                  onClick={() => {
                    const fenetreImpression = window.open('', '_blank', 'width=500,height=600');
                    fenetreImpression.document.write(`
                      <html>
                        <head><title>QR Code - ${entreprise.nom_entreprise}</title></head>
                        <body style="text-align:center; font-family:Arial; padding-top:40px;">
                          <h2 style="text-transform:uppercase;">${entreprise.nom_entreprise}</h2>
                          <img src="${imageUrlQrCode}" style="width:300px; height:300px;" />
                          <p style="font-weight:bold; margin-top:20px;">Scannez pour commander</p>
                        </body>
                      </html>
                    `);
                    fenetreImpression.document.close();
                    fenetreImpression.print();
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-black px-4 py-2 rounded-xl text-xs uppercase shadow transition flex items-center gap-1"
                >
                  <span>🖨️</span> Imprimer
                </button>
              </div>
            </div>
          )}

          {/* PANNEAU DE SWITCH RAPIDE DE MODULE */}
          {modeAction === 'switcher_module' && (
            <div className={`${innerCardBg} border-2 border-indigo-500/60 p-3 rounded-xl space-y-3 shadow-inner animate-fadeIn transition-colors`}>
              <h4 className="font-black text-indigo-400 uppercase text-[10px] flex items-center justify-between">
                <span>⚡ Choix & Basculement de Module</span>
                <span className={isDarkMode ? 'text-slate-400 font-normal' : 'text-slate-600 font-normal'}>Actif : <strong className="text-orange-400">{moduleActuel}</strong></span>
              </h4>

              <div className="grid grid-cols-2 gap-2">
                {LISTE_MODULES_PRINCIPAUX.map((mod) => {
                  const estSouscrit = espacesSouscrits.includes(mod);
                  const estAutorisePourUser = estAdminEntreprise || estSuperAdmin || modulesAutorisesUser.includes(mod);
                  const estActif = moduleActuel === mod;
                  const modCapitalized = mod.charAt(0) + mod.slice(1).toLowerCase();
                  const infoTarif = TARIFS_MODULES[modCapitalized] || { disponible: true };

                  if (!estAdminEntreprise && !estSuperAdmin && !estAutorisePourUser) {
                    return (
                      <div
                        key={mod}
                        className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-600 flex flex-col items-center justify-center gap-1 cursor-not-allowed opacity-50"
                      >
                        <span className="text-xs uppercase font-bold">{mod}</span>
                        <span className="text-[8px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded font-bold">
                          🔒 Non autorisé
                        </span>
                      </div>
                    );
                  }

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

                  if (estSouscrit || estAutorisePourUser) {
                    return (
                      <button
                        key={mod}
                        type="button"
                        disabled={estActif || changementModuleEnCours}
                        onClick={() => basculerModuleActif(mod)}
                        className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center gap-1 ${
                          estActif 
                            ? 'bg-orange-600/40 border-orange-500 text-white font-black cursor-default shadow' 
                            : isDarkMode ? 'bg-[#1b263b] hover:bg-indigo-950/60 border-indigo-500/50 text-indigo-200' : 'bg-white hover:bg-indigo-50 border-indigo-500/50 text-indigo-700'
                        }`}
                      >
                        <span className="text-xs uppercase font-black">{mod}</span>
                        <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded ${estActif ? 'bg-orange-500 text-white' : 'bg-emerald-950 text-emerald-400'}`}>
                          {estActif ? 'Module Actif ✓' : 'Cliquer pour basculer ⚡'}
                        </span>
                      </button>
                    );
                  } else {
                    return (
                      <div 
                        key={mod}
                        onClick={() => {
                          if (estAdminEntreprise) setModeAction('nouveau_module');
                        }}
                        className="p-2.5 rounded-xl border border-slate-700 bg-slate-900/60 text-slate-500 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-orange-500/50 transition group"
                      >
                        <span className="text-xs uppercase font-bold line-through group-hover:text-slate-300">{mod}</span>
                        <span className="text-[8px] bg-slate-800 text-orange-400 group-hover:bg-orange-600 group-hover:text-white px-2 py-0.5 rounded font-bold transition">
                          🔒 Non souscrit
                        </span>
                      </div>
                    );
                  }
                })}
              </div>
            </div>
          )}

          <div className={`grid grid-cols-3 gap-2 text-center p-2.5 rounded-xl border transition-colors ${innerCardBg}`}>
            <div>
              <span className={`block text-[8.5px] uppercase font-bold ${labelText}`}>Rôle / Statut</span>
              <span className="text-[10px] font-black text-emerald-400 uppercase">{roleUtilisateur || 'Administrateur'}</span>
            </div>
            <div>
              <span className={`block text-[8.5px] uppercase font-bold ${labelText}`}>Module actif</span>
              <span className="text-[10px] font-black text-orange-400 uppercase">{moduleActuel}</span>
            </div>
            <div>
              <span className={`block text-[8.5px] uppercase font-bold ${labelText}`}>Statut session</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Actif
              </span>
            </div>
          </div>

          <div className={`space-y-2.5 p-3 rounded-xl border transition-colors ${innerCardBg}`}>
            <div>
              <label className={`block text-[9px] uppercase font-bold mb-1 ${labelText}`}>
                Adresse e-mail personnelle <span className="text-slate-500 font-normal">(Non modifiable)</span>
              </label>
              <input
                type="email"
                disabled
                value={emailUtilisateurConnecte || 'stephs7352@gmail.com'}
                className={`w-full border rounded-lg p-2 text-xs cursor-not-allowed font-medium ${disabledInputBg}`}
              />
            </div>

            <div>
              <label className={`block text-[9px] uppercase font-bold mb-1 ${labelText}`}>
                Numéro de téléphone personnel <span className="text-slate-500 font-normal">(Non modifiable)</span>
              </label>
              <input
                type="text"
                disabled
                value={telephoneUtilisateur || '655597099'}
                className={`w-full border rounded-lg p-2 text-xs cursor-not-allowed font-medium ${disabledInputBg}`}
              />
            </div>

            <div className={`space-y-2 pt-1 border-t ${isDarkMode ? 'border-blue-900/40' : 'border-slate-200'}`}>
              <div className="flex justify-between items-center">
                <label className={`block text-[9px] uppercase font-bold ${labelText}`}>
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
                  className={`w-full border rounded-lg p-2 pr-16 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none transition ${
                    modeModificationMdp 
                      ? isDarkMode ? 'bg-[#1b263b] border-orange-500/60 text-white' : 'bg-white border-orange-500/60 text-slate-900'
                      : disabledInputBg
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
                    className={`w-full border rounded-lg p-2 text-xs font-bold focus:ring-2 focus:ring-orange-500 focus:outline-none ${inputBg} border-orange-500/60`}
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