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

  const [telephone, setTelephone] = useState('');
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('');
  const [confirmerMotDePasse, setConfirmerMotDePasse] = useState('');
  const [logoEntreprise, setLogoEntreprise] = useState('');
  const [afficherMdp, setAfficherMdp] = useState(false);
  const [modeModificationMdp, setModeModificationMdp] = useState(false);

  // États pour les actions ciblées ('reabonnement', 'nouveau_module', 'switcher_module', 'module_indisponible')
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

  // États pour le Super-Admin Global
  const [listeEntreprisesGlobales, setListeEntreprisesGlobales] = useState([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [panneauAdminOuvert, setPanneauAdminOuvert] = useState(false);

  const fileInputLogoRef = useRef(null);

  const moduleActuel = typeof window !== 'undefined' ? (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase() : 'BOUTIQUE';
  const emailConnecte = typeof window !== 'undefined' ? (localStorage.getItem('emailConnecte') || '') : '';
  const utilisateurConnecte = typeof window !== 'undefined' ? (localStorage.getItem('utilisateurConnecte') || '') : '';

  // Vérification stricte Super-Admin
  const estSuperAdmin = 
    emailConnecte.toLowerCase().trim() === 'stephs7352@gmail.com' || 
    emailConnecte.toLowerCase().trim() === 'bureauisma26@gmail.com' || 
    emailConnecte.toLowerCase().trim() === 'stephanekts1312@gmail.com' ||
    utilisateurConnecte.includes('STÉPHANE') || 
    utilisateurConnecte.includes('KENMOE');

  useEffect(() => {
    chargerInfosEntreprise();
  }, [entrepriseId]);

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

  const chargerInfosEntreprise = async () => {
    setChargement(true);
    try {
      const idEffectif = entrepriseId || (typeof window !== 'undefined' ? localStorage.getItem('entrepriseId') : null) || '4TS-234321';

      const { data, error } = await supabase
        .from('entreprises')
        .select('*')
        .eq('id_entreprise', idEffectif)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setEntreprise(data);
        setTelephone(data.telephone || '');
        if (data.duree_abonnement_mois) setNombreMoisChoisi(data.duree_abonnement_mois);
      } else {
        const { data: dataFallback } = await supabase
          .from('entreprises')
          .select('*')
          .eq('id', idEffectif)
          .maybeSingle();

        if (dataFallback) {
          setEntreprise(dataFallback);
          setTelephone(dataFallback.telephone || '');
          if (dataFallback.duree_abonnement_mois) setNombreMoisChoisi(dataFallback.duree_abonnement_mois);
        } else {
          setEntreprise({
            id_entreprise: idEffectif,
            nom_entreprise: '4TS SUITE MANAGER',
            email: emailConnecte || 'contact@4ts.com',
            telephone: '600000000',
            limite_utilisateurs: 5,
            duree_abonnement_mois: 1,
            espaces_souscrits: ['BOUTIQUE', 'LIVRAISON']
          });
        }
      }

      if (typeof window !== 'undefined' && idEffectif) {
        const logoLocal = localStorage.getItem(`logo_entreprise_${idEffectif}`);
        if (logoLocal) {
          setLogoEntreprise(logoLocal);
        }
      }
    } catch (err) {
      console.error('Erreur chargement profil entreprise :', err.message);
      setEntreprise({
        id_entreprise: '4TS-234321',
        nom_entreprise: '4TS SUITE MANAGER',
        email: emailConnecte || 'contact@4ts.com',
        telephone: '600000000',
        limite_utilisateurs: 5,
        duree_abonnement_mois: 1,
        espaces_souscrits: ['BOUTIQUE', 'LIVRAISON']
      });
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
      lecteur.onloadend = () => {
        const resultatBase64 = lecteur.result;
        setLogoEntreprise(resultatBase64);
        const targetId = entreprise?.id_entreprise || '4TS-234321';
        if (typeof window !== 'undefined') {
          localStorage.setItem(`logo_entreprise_${targetId}`, resultatBase64);
        }
        setUploadingLogo(false);
        alert('✅ Logo de l’entreprise mis à jour avec succès !');
        window.location.reload();
      };
      lecteur.readAsDataURL(file);
    } catch (err) {
      alert('Erreur lors du chargement du logo : ' + err.message);
      setUploadingLogo(false);
    }
  };

  const MettreAJourProfil = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder || !entreprise) return;

    if (modeModificationMdp && nouveauMotDePasse && nouveauMotDePasse !== confirmerMotDePasse) {
      alert('❌ Les deux mots de passe ne correspondent pas.');
      return;
    }

    setEnTrainDeSauvegarder(true);
    try {
      const payload = {};

      if (modeModificationMdp && nouveauMotDePasse && nouveauMotDePasse.trim() !== '') {
        payload.mot_de_passe = nouveauMotDePasse.trim();
        payload.code_pin_activation = nouveauMotDePasse.trim();
      }

      const targetId = entreprise.id_entreprise || entreprise.id;
      const champCle = entreprise.id_entreprise ? 'id_entreprise' : 'id';

      if (Object.keys(payload).length > 0) {
        const { error } = await supabase
          .from('entreprises')
          .update(payload)
          .eq(champCle, targetId);

        if (error) throw error;
      }

      alert('✅ Mot de passe et paramètres mis à jour avec succès !');
      setNouveauMotDePasse('');
      setConfirmerMotDePasse('');
      setModeModificationMdp(false);
      await chargerInfosEntreprise();
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

      const { error } = await supabase
        .from('entreprises')
        .update({ module_actif: moduleUpper })
        .eq(entreprise.id_entreprise ? 'id_entreprise' : 'id', identifiantCible);

      if (error) throw error;

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

  const souscrireSurMesure = async () => {
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
      chargerInfosEntreprise();
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
      await chargerInfosEntreprise();
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

  if (chargement) {
    return <div className="p-6 text-center text-cyan-400 text-xs font-bold animate-pulse">Chargement du profil...</div>;
  }

  if (!entreprise) {
    return <div className="p-6 text-center text-rose-400 text-xs font-bold">Impossible de charger les informations de l'entreprise.</div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-3 font-sans text-xs pb-6">
      
      <div className="bg-[#1b263b] border border-blue-900/60 rounded-2xl p-4 shadow-xl text-slate-100 space-y-4">
        
        {/* Titre seul sur sa ligne sans aucun bouton */}
        <div className="border-b border-blue-900/60 pb-3 flex items-center space-x-2">
          <span className="text-base">🏢</span>
          <h3 className="font-black text-white uppercase text-xs tracking-wider">
            MON PROFIL & PARAMÈTRES DE L'ENTREPRISE
          </h3>
        </div>

        <form onSubmit={MettreAJourProfil} className="space-y-3">
          
          {/* Identité & Logo de l'entreprise */}
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
              title="Cliquer pour modifier le logo de l'entreprise"
              className="w-14 h-14 rounded-xl bg-slate-900 border-2 border-orange-500 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer relative group shadow-md"
            >
              {logoEntreprise ? (
                <img src={logoEntreprise} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-orange-400 font-black text-base">🏢</span>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[9px] text-white font-bold text-center p-1">
                {uploadingLogo ? 'Envoi...' : 'Modifier Logo'}
              </div>
            </div>

            <div className="space-y-1 overflow-hidden">
              <span className="block text-[9px] uppercase font-bold text-blue-300">Identifiant Unique & Nom</span>
              <span className="text-xs font-black text-orange-400 font-mono block">
                {entreprise.id_entreprise || entreprise.id || 'N/A'}
              </span>
              <h4 className="font-extrabold text-white uppercase text-sm truncate">
                {entreprise.nom_entreprise || entreprise.nom || 'Non renseigné'}
              </h4>
            </div>
          </div>

          {/* Ligne des trois boutons forcés sur la même ligne (Se réabonner, Changer module, Nouveau module) */}
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setModeAction(modeAction === 'reabonnement' ? null : 'reabonnement')}
              className={`w-full font-black py-2 px-1 rounded-xl shadow-md transition uppercase tracking-tighter text-[9.5px] flex items-center justify-center gap-0.5 border ${
                modeAction === 'reabonnement' 
                  ? 'bg-orange-700 text-white border-orange-400' 
                  : 'bg-cyan-700 hover:bg-cyan-600 text-white border-cyan-500'
              }`}
            >
              <span>🔄</span>
              <span className="truncate">{modeAction === 'reabonnement' ? 'Fermer' : 'Se réabonner'}</span>
            </button>

            <button
              type="button"
              onClick={() => setModeAction(modeAction === 'switcher_module' ? null : 'switcher_module')}
              className={`w-full font-black py-2 px-1 rounded-xl shadow-md transition uppercase tracking-tighter text-[9.5px] flex items-center justify-center gap-0.5 border ${
                modeAction === 'switcher_module' 
                  ? 'bg-orange-700 text-white border-orange-400' 
                  : 'bg-indigo-700 hover:bg-indigo-600 text-white border-indigo-500'
              }`}
            >
              <span>⚡</span>
              <span className="truncate">{modeAction === 'switcher_module' ? 'Fermer' : 'Changer module'}</span>
            </button>

            <button
              type="button"
              onClick={() => setModeAction(modeAction === 'nouveau_module' ? null : 'nouveau_module')}
              className={`w-full font-black py-2 px-1 rounded-xl shadow-md transition uppercase tracking-tighter text-[9.5px] flex items-center justify-center gap-0.5 border ${
                modeAction === 'nouveau_module' 
                  ? 'bg-orange-700 text-white border-orange-400' 
                  : 'bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-500'
              }`}
            >
              <span>➕</span>
              <span className="truncate">{modeAction === 'nouveau_module' ? 'Fermer' : 'Nouveau module'}</span>
            </button>
          </div>

          {/* MESSAGE POUR MODULES NON ENCORE DISPONIBLES (Logistique / Tontine) */}
          {modeAction === 'module_indisponible' && (
            <div className="bg-[#0d1b2a] border-2 border-amber-500/80 p-4 rounded-xl space-y-3 shadow-2xl animate-fadeIn text-center">
              <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto text-lg font-bold">
                ⏳
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-amber-400 uppercase text-xs tracking-wide">
                  Module [{moduleSelectionneInfo}] en cours de développement
                </h4>
                <p className="text-[10px] text-slate-300 leading-relaxed px-2">
                  Excellente nouvelle ! Notre équipe technique met les bouchées doubles pour vous préparer une version ultra-performante du module <strong className="text-white">{moduleSelectionneInfo}</strong>. Celui-ci n'est pas encore disponible, mais vous serez notifié en priorité dès son lancement officiel sur la plateforme 4TS Suite Manager ! 🚀
                </p>
              </div>

              <div className="bg-[#1b263b] border border-blue-900/60 p-2.5 rounded-xl text-[9.5px] text-slate-200">
                💡 En attendant, profitez pleinement de la puissance de nos modules actuellement disponibles (<strong className="text-orange-400">Boutique</strong> et <strong className="text-orange-400">Livraison</strong>) pour dynamiser votre activité !
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

          {/* PANNEAU CONDITIONNEL : CHANGER / SWITCHER DE MODULE */}
          {modeAction === 'switcher_module' && (
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
                        title="Module non souscrit. Cliquez pour souscrire !"
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

          {/* PANNEAU CONDITIONNEL : SE RÉABONNER */}
          {modeAction === 'reabonnement' && (
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
                  <span className="block text-[8px] uppercase font-bold text-slate-400">Durée Restante (Licence)</span>
                  <span className="text-xs font-black text-emerald-400">{entreprise.duree_abonnement_mois || 1} Mois</span>
                </div>
              </div>

              <div className="bg-orange-950/40 border border-orange-500/50 p-2 rounded-xl text-orange-200 text-[9.5px] leading-tight space-y-0.5">
                <span className="font-black uppercase block text-orange-400">💡 Profitez de nos remises exceptionnelles !</span>
                <p>
                  Bénéficiez de remises automatiques : <strong className="text-white">3 mois (-5%)</strong>, <strong className="text-white">6 mois (-10%)</strong>, et <strong className="text-white">12 mois (-20%)</strong>. Remises sur volume d'utilisateurs également appliquées !
                </p>
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
                <div className="flex justify-between text-slate-300">
                  <span>Tarif unitaire :</span>
                  <span className="font-bold">{detailsCalculReabonnement.tarifUnitaire.toLocaleString()} XAF / user / mois</span>
                </div>
                {detailsCalculReabonnement.tauxRemise > 0 && (
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>Remise appliquée :</span>
                    <span>-{detailsCalculReabonnement.tauxRemise}%</span>
                  </div>
                )}
                <div className="border-t border-blue-900 pt-1 flex justify-between font-black text-xs text-orange-400">
                  <span>MONTANT TOTAL À PAYER :</span>
                  <span>{detailsCalculReabonnement.montantNet.toLocaleString()} XAF</span>
                </div>
              </div>

              <button
                type="button"
                onClick={souscrireSurMesure}
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-2.5 rounded-lg text-[10px] uppercase shadow-md transition"
              >
                Valider le réabonnement 🚀
              </button>
            </div>
          )}

          {/* PANNEAU CONDITIONNEL : SOUSCRIRE À UN NOUVEAU MODULE */}
          {modeAction === 'nouveau_module' && (
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

          {/* Bloc Rôle / Statut / Module actif */}
          <div className="grid grid-cols-3 gap-2 text-center bg-[#0d1b2a] p-2.5 rounded-xl border border-blue-900/40">
            <div>
              <span className="block text-[8.5px] uppercase font-bold text-blue-300">Rôle / Statut</span>
              <span className="text-[10px] font-black text-emerald-400 uppercase">Administrateur</span>
            </div>
            <div>
              <span className="block text-[8.5px] uppercase font-bold text-blue-300">Module actif</span>
              <span className="text-[10px] font-black text-orange-400 uppercase">{moduleActuel}</span>
            </div>
            <div>
              <span className="block text-[8.5px] uppercase font-bold text-blue-300">Statut de la session</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Actif
              </span>
            </div>
          </div>

          {/* Champs de configuration (Email, Téléphone, Mot de passe) */}
          <div className="space-y-2.5 bg-[#0d1b2a] p-3 rounded-xl border border-blue-900/40">
            <div>
              <label className="block text-[9px] uppercase font-bold text-blue-300 mb-1">
                Adresse e-mail de l'entreprise <span className="text-slate-500 font-normal">(Non modifiable)</span>
              </label>
              <input
                type="email"
                disabled
                value={entreprise.email || 'Non renseigné'}
                className="w-full bg-slate-900/60 border border-blue-900/50 rounded-lg p-2 text-xs text-slate-300 cursor-not-allowed font-medium"
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase font-bold text-blue-300 mb-1">
                Numéro de téléphone <span className="text-slate-500 font-normal">(Non modifiable)</span>
              </label>
              <input
                type="text"
                disabled
                value={telephone}
                className="w-full bg-slate-900/60 border border-blue-900/50 rounded-lg p-2 text-xs text-slate-300 cursor-not-allowed font-medium"
              />
            </div>

            <div className="space-y-2 pt-1 border-t border-blue-900/40">
              <div className="flex justify-between items-center">
                <label className="block text-[9px] uppercase font-bold text-blue-300">
                  Mot de passe / Code PIN
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

          {/* Boutons Mettre à jour et Se déconnecter forcés sur la même ligne */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="submit"
              disabled={enTrainDeSauvegarder || uploadingLogo}
              className="w-full bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 text-white font-black py-2.5 px-2 rounded-xl shadow-md transition uppercase tracking-tighter text-[10px] flex items-center justify-center gap-1"
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

      {/* BANNIÈRE FIXE ET ENTIÈREMENT VISIBLE */}
      <div className="bg-gradient-to-r from-[#0d1b2a] via-[#112240] to-[#0a192f] border border-cyan-500/40 rounded-2xl p-3 shadow-xl space-y-2 text-left">
        
        {/* Titre centralisé */}
        <div className="flex items-center justify-center gap-2 text-center pb-1.5 border-b border-cyan-900/60">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          <h4 className="font-black text-cyan-400 uppercase text-[10px] tracking-wider">
            🚀 4TS SUITE MANAGER — ÉCOSYSTÈME PROFESSIONNEL INTÉGRÉ
          </h4>
        </div>

        {/* Ligne 1 : Modules Disponibles */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-slate-300 pt-0.5">
          <span className="text-amber-400 font-black">✨ Modules Disponibles :</span>
          <span className="bg-[#1b263b] border border-blue-900 px-2 py-0.5 rounded text-cyan-300">🛒 Boutique (Gestion de stocks & ventes)</span>
          <span className="text-slate-500">•</span>
          <span className="bg-[#1b263b] border border-blue-900 px-2 py-0.5 rounded text-cyan-300">🚚 Livraison (Suivi logistique & courses)</span>
        </div>

        {/* Ligne 2 : Modules Bientôt Disponibles */}
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold text-slate-300 pt-1 border-t border-cyan-900/30">
          <span className="text-blue-400 font-black">⏳ Bientôt Disponibles :</span>
          <span className="bg-[#1b263b]/60 border border-blue-950 px-2 py-0.5 rounded text-slate-400">📦 Logistique (Prochainement)</span>
          <span className="text-slate-500">•</span>
          <span className="bg-[#1b263b]/60 border border-blue-950 px-2 py-0.5 rounded text-slate-400">🪙 Tontine (Prochainement)</span>
        </div>

      </div>

      {/* PANNEAU SUPER-ADMIN GLOBAL UNIQUE (Réservé strictement au Super-Admin) */}
      {estSuperAdmin && (
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => setPanneauAdminOuvert(!panneauAdminOuvert)}
            className="w-full bg-gradient-to-r from-sky-700 via-cyan-600 to-teal-700 hover:from-sky-600 hover:to-teal-600 text-white font-black p-3 rounded-xl transition flex items-center justify-between shadow-lg text-xs uppercase tracking-wider border border-cyan-400/40"
          >
            <span className="flex items-center gap-2">
              <span>🛡️</span> {panneauAdminOuvert ? 'Fermer le Panneau Super-Admin' : 'Ouvrir le Panneau Super-Admin Global'}
            </span>
            <span>{panneauAdminOuvert ? '▲' : '▼'}</span>
          </button>

          {panneauAdminOuvert && (
            <div className="bg-[#0b1329] border-2 border-cyan-500/80 p-4 rounded-xl space-y-3 shadow-2xl animate-fadeIn">
              <div className="flex justify-between items-center border-b border-cyan-900 pb-2">
                <div>
                  <h4 className="font-black text-cyan-400 uppercase text-xs">🛡️ Gestion Globale des Entreprises</h4>
                  <p className="text-[9.5px] text-cyan-200/70">Ajoutez des licences, ajustez les utilisateurs ou supprimez des entreprises.</p>
                </div>
                <button 
                  onClick={chargerToutesLesEntreprises}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-2.5 py-1 rounded-lg text-[10px] transition"
                >
                  🔄 Actualiser
                </button>
              </div>

              {loadingAdmin ? (
                <div className="text-center py-4 text-cyan-300 font-bold text-[10px]">Chargement des entreprises...</div>
              ) : (
                <div className="space-y-2.5">
                  <p className="font-bold text-slate-200 text-[10px]">Total entreprises enregistrées : <span className="text-cyan-400">{listeEntreprisesGlobales.length}</span></p>
                  
                  <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                    {listeEntreprisesGlobales.map((ent) => (
                      <div key={ent.id_entreprise || ent.id} className="bg-[#1b263b] border border-cyan-900/50 p-2.5 rounded-xl flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-black text-white uppercase text-[11px]">{ent.nom_entreprise}</span>
                            <span className="ml-2 bg-cyan-950 text-cyan-400 font-mono text-[9px] px-1.5 py-0.5 rounded border border-cyan-800">{ent.id_entreprise}</span>
                            <p className="text-[9px] text-slate-400 mt-0.5">📧 {ent.email || 'Aucun email'} | 📞 {ent.telephone || 'Aucun téléphone'}</p>
                          </div>
                          <span className="text-[9px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-bold">Licence : {ent.statut_licence || 'ACTIF'}</span>
                        </div>

                        {/* Actions rapides Admin pour chaque entreprise */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-blue-950">
                          <button
                            onClick={async () => {
                              const moisSup = prompt(`Ajouter combien de mois gratuits (licence) pour ${ent.nom_entreprise} ?`, '3');
                              if (!moisSup) return;
                              const nouveauMois = (parseInt(ent.duree_abonnement_mois) || 1) + parseInt(moisSup);
                              const { error } = await supabase.from('entreprises').update({ duree_abonnement_mois: nouveauMois, statut_licence: 'ACTIF' }).eq('id_entreprise', ent.id_entreprise);
                              if (error) alert('Erreur : ' + error.message);
                              else { alert('Licence mise à jour avec succès !'); chargerToutesLesEntreprises(); }
                            }}
                            className="bg-emerald-700 hover:bg-emerald-600 text-white font-bold px-2 py-1 rounded text-[9px] transition"
                          >
                            🎁 Ajouter Licence Gratuite
                          </button>

                          <button
                            onClick={async () => {
                              const limitSup = prompt(`Nouvelle limite d'utilisateurs max pour ${ent.nom_entreprise} ?`, String(ent.limite_utilisateurs || 5));
                              if (!limitSup) return;
                              const { error } = await supabase.from('entreprises').update({ limite_utilisateurs: parseInt(limitSup) }).eq('id_entreprise', ent.id_entreprise);
                              if (error) alert('Erreur : ' + error.message);
                              else { alert('Limite utilisateurs mise à jour !'); chargerToutesLesEntreprises(); }
                            }}
                            className="bg-sky-700 hover:bg-sky-600 text-white font-bold px-2 py-1 rounded text-[9px] transition"
                          >
                            👥 Ajuster Utilisateurs
                          </button>

                          <button
                            onClick={() => {
                              window.location.href = `/dashboard?entreprise=${ent.id_entreprise}`;
                            }}
                            className="bg-indigo-700 hover:bg-indigo-600 text-white font-bold px-2 py-1 rounded text-[9px] transition"
                          >
                            Accéder →
                          </button>

                          <button
                            onClick={async () => {
                              if (confirm(`Supprimer définitivement l'entreprise "${ent.nom_entreprise}" (${ent.id_entreprise}) ?`)) {
                                await supabase.from('utilisateurs').delete().eq('id_entreprise', ent.id_entreprise);
                                await supabase.from('entreprises').delete().eq('id_entreprise', ent.id_entreprise);
                                alert('Entreprise supprimée.');
                                chargerToutesLesEntreprises();
                              }
                            }}
                            className="bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-bold px-2 py-1 rounded text-[9px] transition ml-auto"
                          >
                            🗑️ Supprimer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  );
}