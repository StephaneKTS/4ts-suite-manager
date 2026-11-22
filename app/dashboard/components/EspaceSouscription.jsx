'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function EspaceSouscription({ entrepriseId: propEntrepriseId }) {
  const [entreprise, setEntreprise] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [changementModuleEnCours, setChangementModuleEnCours] = useState(false);

  // 🏷️ Tarifs et grilles dynamiques par défaut (synchronisés avec le Super Admin)
  const [tarifsPlateforme, setTarifsPlateforme] = useState({
    Boutique: { installation: 25000, mensuelPerUser: 5000 },
    Logistique: { installation: 20000, mensuelPerUser: 4000 },
    Livraison: { installation: 25000, mensuelPerUser: 5000 },
    Tontine: { installation: 25000, mensuelPerUser: 2500 },
    remisesDuree: [
      { seuil: 3, taux: 5 },
      { seuil: 6, taux: 10 },
      { seuil: 12, taux: 15 }
    ],
    remisesUsers: [
      { seuil: 10, taux: 5 },
      { seuil: 20, taux: 10 },
      { seuil: 50, taux: 15 }
    ]
  });

  // Paramètres de personnalisation par module actif
  const [nombreUtilisateursChoisi, setNombreUtilisateursChoisi] = useState(1);
  const [nombreMoisChoisi, setNombreMoisChoisi] = useState(1);
  
  // États pour l'extension de nouveaux modules
  const [modeAjoutModule, setModeAjoutModule] = useState(false);
  const [nouveauxModulesChoisis, setNouveauxModulesChoisis] = useState({
    Boutique: false,
    Logistique: false,
    Livraison: false,
    Tontine: false,
  });
  const [activationEnCours, setActivationEnCours] = useState(false);

  // 🪟 État pour les jolies modales personnalisées
  const [modaleInfo, setModaleInfo] = useState({
    ouverte: false,
    titre: '',
    message: '',
    type: 'info', // 'info', 'confirmation', 'succes', 'erreur'
    onConfirmer: null
  });

  const LISTE_MODULES_PRINCIPAUX = ['BOUTIQUE', 'LIVRAISON', 'LOGISTIQUE', 'TONTINE'];

  // Récupération blindée de l'ID d'entreprise (Prop -> URL -> LocalStorage -> Fallback)
  const getEntrepriseIdEffectif = () => {
    if (propEntrepriseId && propEntrepriseId !== '4TS-TEST') return propEntrepriseId;
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const entUrl = params.get('entreprise');
      if (entUrl) return entUrl;
      const entLocal = localStorage.getItem('entrepriseId') || localStorage.getItem('entreprise_id');
      if (entLocal) return entLocal;
    }
    return propEntrepriseId || '4TS-TEST';
  };

  const entrepriseIdEffectif = getEntrepriseIdEffectif();

  const chargerInfosEntrepriseEtTarifs = async () => {
    setChargement(true);
    try {
      const { data, error } = await supabase
        .from('entreprises')
        .select('*')
        .or(`id_entreprise.eq.${entrepriseIdEffectif},code_entreprise.eq.${entrepriseIdEffectif}`)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setEntreprise(data);
        setNombreUtilisateursChoisi(1);
        if (data.duree_abonnement_mois) setNombreMoisChoisi(data.duree_abonnement_mois);
      }

      const { data: configTarifs } = await supabase
        .from('configuration_globale')
        .select('valeur')
        .eq('cle', '4ts_tarifs_plateforme')
        .maybeSingle();

      if (configTarifs && configTarifs.valeur) {
        const parsedTarifs = typeof configTarifs.valeur === 'string' 
          ? JSON.parse(configTarifs.valeur) 
          : configTarifs.valeur;

        setTarifsPlateforme({
          Boutique: parsedTarifs.Boutique || { installation: 25000, mensuelPerUser: 5000 },
          Logistique: parsedTarifs.Logistique || { installation: 20000, mensuelPerUser: 4000 },
          Livraison: parsedTarifs.Livraison || { installation: 25000, mensuelPerUser: 5000 },
          Tontine: parsedTarifs.Tontine || { installation: 25000, mensuelPerUser: 2500 },
          remisesDuree: Array.isArray(parsedTarifs.remisesDuree) ? parsedTarifs.remisesDuree : [
            { seuil: 3, taux: 5 }, { seuil: 6, taux: 10 }, { seuil: 12, taux: 15 }
          ],
          remisesUsers: Array.isArray(parsedTarifs.remisesUsers) ? parsedTarifs.remisesUsers : [
            { seuil: 10, taux: 5 }, { seuil: 20, taux: 10 }, { seuil: 50, taux: 15 }
          ]
        });
      }
    } catch (err) {
      console.error('Erreur chargement entreprise ou tarifs :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerInfosEntrepriseEtTarifs();
  }, [entrepriseIdEffectif]);

  // 🎯 Lecture unifiée et prioritaire des clés du module courant
  const moduleActifCourant = (
    typeof window !== 'undefined' ? (localStorage.getItem('module_actif') || localStorage.getItem('moduleActif')) : null
  ) || (entreprise?.module_actif || entreprise?.module_courant || 'BOUTIQUE').toUpperCase();

  const configModuleCourant = tarifsPlateforme[moduleActifCourant.charAt(0) + moduleActifCourant.slice(1).toLowerCase()] || tarifsPlateforme['Boutique'] || { installation: 25000, mensuelPerUser: 5000 };
  const prixUnitaireMoisCourant = Number(configModuleCourant.mensuelPerUser) || 5000;

  const basculerModuleActif = async (nouveauModule) => {
    if (!entreprise) return;
    setChangementModuleEnCours(true);

    try {
      const moduleUpper = nouveauModule.toUpperCase();
      const identifiantCible = entreprise.id_entreprise || entreprise.code_entreprise || entrepriseIdEffectif;
      
      // 🎯 Sauvegarde unifiée sur les deux clés de stockage pour éviter les conflits
      if (typeof window !== 'undefined') {
        localStorage.setItem('module_actif', moduleUpper);
        localStorage.setItem('moduleActif', moduleUpper);
      }

      await supabase
        .from('entreprises')
        .update({ module_actif: moduleUpper })
        .eq('id_entreprise', identifiantCible);

      setEntreprise(prev => ({ ...prev, module_actif: moduleUpper }));
      
      setModaleInfo({
        ouverte: true,
        titre: 'Module basculé',
        message: `Affichage basculé vers le module : ${moduleUpper} 🚀`,
        type: 'succes',
        onConfirmer: () => {
          window.location.href = `/dashboard?entreprise=${identifiantCible}`;
        }
      });
    } catch (err) {
      setModaleInfo({
        ouverte: true,
        titre: 'Erreur',
        message: 'Erreur lors du changement de module : ' + err.message,
        type: 'erreur',
        onConfirmer: null
      });
    } finally {
      setChangementModuleEnCours(false);
    }
  };

  const calculerTauxReductionGlobal = (mois, users) => {
    let tauxDuree = 0;
    const paliersDuree = [...(tarifsPlateforme.remisesDuree || [])].sort((a, b) => b.seuil - a.seuil);
    for (const palier of paliersDuree) {
      if (mois >= Number(palier.seuil)) {
        tauxDuree = Number(palier.taux) / 100;
        break;
      }
    }

    let tauxUsers = 0;
    const paliersUsers = [...(tarifsPlateforme.remisesUsers || [])].sort((a, b) => b.seuil - a.seuil);
    for (const palier of paliersUsers) {
      if (users >= Number(palier.seuil)) {
        tauxUsers = Number(palier.taux) / 100;
        break;
      }
    }

    return tauxDuree + tauxUsers;
  };

  const tauxReductionGlobal = calculerTauxReductionGlobal(nombreMoisChoisi, nombreUtilisateursChoisi);

  const calculerMontantTotal = () => {
    const brut = nombreUtilisateursChoisi * nombreMoisChoisi * prixUnitaireMoisCourant;
    return Math.round(brut * (1 - tauxReductionGlobal));
  };

  const montantTotalCalculé = calculerMontantTotal();

  const calculerDetailsNouveauxModules = () => {
    let fraisInstallationTotal = 0;
    let abonnementUtilisateurTotal = 0;

    Object.keys(nouveauxModulesChoisis).forEach((mod) => {
      if (nouveauxModulesChoisis[mod]) {
        const tarifKey = Object.keys(tarifsPlateforme).find(k => k.toUpperCase() === mod.toUpperCase()) || 'Boutique';
        const tarif = tarifsPlateforme[tarifKey] || { installation: 25000, mensuelPerUser: 5000 };
        
        fraisInstallationTotal += Number(tarif.installation) || 0;
        abonnementUtilisateurTotal += (Number(tarif.mensuelPerUser) || 5000) * nombreUtilisateursChoisi * nombreMoisChoisi;
      }
    });

    return {
      fraisInstallation: fraisInstallationTotal,
      abonnementUtilisateur: abonnementUtilisateurTotal,
      totalGeneral: fraisInstallationTotal + abonnementUtilisateurTotal
    };
  };

  const detailsNouveauxModules = calculerDetailsNouveauxModules();

  const declencherValidationActivation = () => {
    const modulesSelectionnes = Object.keys(nouveauxModulesChoisis).filter(m => nouveauxModulesChoisis[m]);
    if (modulesSelectionnes.length === 0) {
      setModaleInfo({
        ouverte: true,
        titre: 'Sélection requise',
        message: 'Veuillez sélectionner au moins un module à activer.',
        type: 'erreur',
        onConfirmer: null
      });
      return;
    }

    setModaleInfo({
      ouverte: true,
      titre: 'Confirmation d’activation',
      message: `Voulez-vous activer directement les nouveaux modules [${modulesSelectionnes.join(', ')}] ?`,
      type: 'confirmation',
      onConfirmer: validerActivationNouveauxModules
    });
  };

  const validerActivationNouveauxModules = async () => {
    const modulesSelectionnes = Object.keys(nouveauxModulesChoisis).filter(m => nouveauxModulesChoisis[m]);
    setActivationEnCours(true);
    try {
      const donneesBrutesEspaces = entreprise?.espaces_souscrits || ['BOUTIQUE'];
      let espacesActuels = ['BOUTIQUE'];

      if (Array.isArray(donneesBrutesEspaces)) {
        espacesActuels = donneesBrutesEspaces.map(m => String(m).trim().toUpperCase());
      } else if (typeof donneesBrutesEspaces === 'string') {
        espacesActuels = donneesBrutesEspaces.split(',').map(m => m.trim().toUpperCase());
      }

      const nouveauxUpper = modulesSelectionnes.map(m => m.toUpperCase());
      const fusionEspaces = Array.from(new Set([...espacesActuels, ...nouveauxUpper]));

      const identifiantCible = entreprise?.id_entreprise || entreprise?.code_entreprise || entrepriseIdEffectif;

      const { error } = await supabase
        .from('entreprises')
        .update({
          espaces_souscrits: fusionEspaces,
          statut_licence: 'ACTIF',
        })
        .eq('id_entreprise', identifiantCible)
        .select();

      if (error) throw error;

      setModaleInfo({
        ouverte: true,
        titre: 'Succès 🚀',
        message: `Modules activés avec succès : ${fusionEspaces.join(', ')}`,
        type: 'succes',
        onConfirmer: () => {
          setModeAjoutModule(false);
          chargerInfosEntrepriseEtTarifs();
          window.location.reload();
        }
      });
    } catch (err) {
      setModaleInfo({
        ouverte: true,
        titre: 'Erreur critique',
        message: "Erreur lors de l'activation : " + err.message,
        type: 'erreur',
        onConfirmer: null
      });
    } finally {
      setActivationEnCours(false);
    }
  };

  const obtenirDateExpiration = () => {
    const mois = entreprise?.duree_abonnement_mois || 1;
    const date = new Date();
    date.setMonth(date.getMonth() + mois);
    return date.toLocaleDateString('fr-FR');
  };

  const declencherSouscriptionSurMesure = () => {
    setModaleInfo({
      ouverte: true,
      titre: 'Confirmation d’abonnement',
      message: `Valider l'abonnement pour ${nombreUtilisateursChoisi} utilisateur(s) supplémentaire(s) pour un montant de ${montantTotalCalculé.toLocaleString()} F ?`,
      type: 'confirmation',
      onConfirmer: souscrireSurMesure
    });
  };

  const souscrireSurMesure = async () => {
    const ancienTotalUtilisateurs = parseInt(entreprise?.limite_utilisateurs || 1);
    const nouveauTotalCumule = ancienTotalUtilisateurs + parseInt(nombreUtilisateursChoisi);

    try {
      const identifiantCible = entreprise?.id_entreprise || entreprise?.code_entreprise || entrepriseIdEffectif;
      
      let modeContournementActif = false;
      const { data: configCinet } = await supabase
        .from('configuration_globale')
        .select('valeur')
        .eq('cle', '4ts_contournement_cinetpay')
        .maybeSingle();

      if (configCinet) {
        modeContournementActif = String(configCinet.valeur) === 'true' || configCinet.valeur === true;
      }

      if (modeContournementActif) {
        const nouvelleDureeMois = (Number(entreprise?.duree_abonnement_mois) || 1) + nombreMoisChoisi;
        const { error } = await supabase
          .from('entreprises')
          .update({
            statut_licence: 'ACTIF',
            duree_abonnement_mois: nouvelleDureeMois,
            limite_utilisateurs: nouveauTotalCumule,
          })
          .eq('id_entreprise', identifiantCible);

        if (error) throw error;

        setModaleInfo({
          ouverte: true,
          titre: '🎉 Abonnement Validé',
          message: `Mise à jour réussie ! Nouvelle limite : ${nouveauTotalCumule} utilisateurs.`,
          type: 'succes',
          onConfirmer: () => {
            chargerInfosEntrepriseEtTarifs();
            window.location.reload();
          }
        });
      } else {
        setModaleInfo({
          ouverte: true,
          titre: 'Redirection CinetPay',
          message: `Redirection vers la passerelle de paiement pour un montant de ${montantTotalCalculé.toLocaleString()} XAF...`,
          type: 'info',
          onConfirmer: null
        });
      }
    } catch (err) {
      setModaleInfo({
        ouverte: true,
        titre: 'Erreur',
        message: 'Erreur lors de la mise à jour : ' + err.message,
        type: 'erreur',
        onConfirmer: null
      });
    }
  };

  const obtenirStyleStatut = (statut) => {
    const s = (statut || 'ACTIF').toUpperCase();
    if (s.includes('ACTIF') || s.includes('ACTIVE')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    } else if (s.includes('ALERTE') || s.includes('REABONNEMENT')) {
      return 'bg-amber-100 text-amber-800 border-amber-200';
    } else if (s.includes('EXPIRE') || s.includes('INACTIF')) {
      return 'bg-rose-100 text-rose-800 border-rose-200';
    }
    return 'bg-emerald-100 text-emerald-800 border-emerald-200';
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

  const statutLicenceActif = entreprise?.statut_licence || 'ACTIF';
  const dureeMoisActif = entreprise?.duree_abonnement_mois || 1;
  const limiteUsersActif = entreprise?.limite_utilisateurs || 1;

  if (chargement) {
    return <div className="p-6 text-center text-slate-500 font-bold text-xs">Chargement de l'espace de souscription et des tarifs...</div>;
  }

  return (
    <div className="space-y-3 font-sans text-xs pb-16 relative">
      
      {/* EN-TÊTE */}
      <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="font-extrabold text-slate-900 uppercase text-xs flex items-center gap-1.5">
          <span>💳</span> ESPACE DE SOUSCRIPTION & PARAMÈTRES — <span className="text-orange-600">[{moduleActifCourant}]</span>
        </h3>
        <span className="bg-orange-100 text-orange-900 px-2 py-0.5 rounded font-black text-[10px] border border-orange-200">
          {entreprise?.nom_entreprise || 'Mon Entreprise'} ({entrepriseIdEffectif})
        </span>
      </div>

      {/* SECTION INTERCALAIRE : MODULES À SOUSCRIRE & MODULE ACTIF */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
        <div className="flex justify-between items-center border-b pb-1">
          <h4 className="font-black text-slate-800 uppercase text-[10px]">🧩 MODULES À SOUSCRIRE</h4>
          
          <button
            type="button"
            onClick={() => setModeAjoutModule(!modeAjoutModule)}
            className="bg-orange-600 hover:bg-orange-500 text-white font-black text-[10px] px-2.5 py-1 rounded-lg shadow-2xs transition flex items-center gap-1 uppercase cursor-pointer"
          >
            <span>{modeAjoutModule ? '✖ Fermer' : '➕ Souscrire à un nouveau module'}</span>
          </button>
        </div>

        {/* FORMULAIRE D'EXTENSION DE NOUVEAUX MODULES */}
        {modeAjoutModule && (
          <div className="bg-orange-50/80 border-2 border-orange-400 p-3 rounded-xl space-y-2.5 animate-fadeIn">
            <h5 className="font-black text-orange-900 uppercase text-[10px]">🛒 Extension de modules (Tarifs Super Admin)</h5>
            <p className="text-[9.5px] text-slate-700 leading-tight">
              Cochez les modules à activer pour votre entreprise :
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LISTE_MODULES_PRINCIPAUX.map((mod) => {
                const estDejaSouscrit = espacesSouscrits.includes(mod);
                if (estDejaSouscrit) return null;

                const tarifMod = tarifsPlateforme[mod.charAt(0) + mod.slice(1).toLowerCase()] || { installation: 25000, mensuelPerUser: 5000 };

                return (
                  <label
                    key={mod}
                    className={`flex flex-col p-2 rounded-lg border cursor-pointer transition gap-1 ${
                      nouveauxModulesChoisis[mod] ? 'bg-orange-600 text-white border-orange-600 font-bold' : 'bg-white text-slate-800 border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black">{mod}</span>
                      <input
                        type="checkbox"
                        checked={!!nouveauxModulesChoisis[mod]}
                        onChange={(e) => setNouveauxModulesChoisis({ ...nouveauxModulesChoisis, [mod]: e.target.checked })}
                        className="accent-orange-700 w-4 h-4 cursor-pointer"
                      />
                    </div>
                    <div className={`text-[8.5px] ${nouveauxModulesChoisis[mod] ? 'text-orange-100' : 'text-slate-500'}`}>
                      Installation : {Number(tarifMod.installation).toLocaleString()} F<br />
                      User/Mois : {Number(tarifMod.mensuelPerUser).toLocaleString()} F
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="bg-white border border-orange-200 p-2.5 rounded-xl space-y-1 text-[10px] text-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-600">Frais d'installation :</span>
                <span className="font-bold">{detailsNouveauxModules.fraisInstallation.toLocaleString()} FCFA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Abonnement utilisateurs :</span>
                <span className="font-bold">{detailsNouveauxModules.abonnementUtilisateur.toLocaleString()} FCFA</span>
              </div>
              <div className="border-t pt-1 flex justify-between font-black text-xs text-orange-600">
                <span>TOTAL SIMULÉ :</span>
                <span>{detailsNouveauxModules.totalGeneral.toLocaleString()} FCFA</span>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                disabled={activationEnCours}
                onClick={declencherValidationActivation}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded-lg text-[10px] shadow-2xs transition uppercase cursor-pointer"
              >
                {activationEnCours ? 'Enregistrement...' : 'Enregistrer dans la base & Activer 🚀'}
              </button>
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
            <span className="block font-black text-[9px] text-slate-500 uppercase">Modules trouvés en base :</span>
            <div className="flex flex-wrap gap-1">
              {LISTE_MODULES_PRINCIPAUX.map((mod) => {
                const estSouscrit = espacesSouscrits.includes(mod);
                return (
                  <span 
                    key={mod} 
                    className={`px-2 py-0.5 rounded font-black text-[9.5px] border ${
                      estSouscrit 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                        : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                    }`}
                  >
                    {mod}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <span className="block font-black text-[9px] text-slate-500 uppercase">Module Actif :</span>
              <span className="bg-orange-100 text-orange-900 border border-orange-300 px-2 py-0.5 rounded-md font-black text-[10px] shadow-2xs">
                ⚡ {moduleActifCourant} ({prixUnitaireMoisCourant} F/mois/user)
              </span>
            </div>

            <div className="pt-1 border-t border-slate-200 space-y-1">
              <span className="block font-black text-[8.5px] text-slate-600 uppercase">Changer vers :</span>
              <div className="flex flex-wrap gap-1">
                {LISTE_MODULES_PRINCIPAUX.map((mod) => {
                  const estActif = moduleActifCourant === mod;
                  const estSouscrit = espacesSouscrits.includes(mod);
                  
                  if (!estSouscrit) return null;

                  return (
                    <button
                      key={mod}
                      type="button"
                      disabled={estActif || changementModuleEnCours}
                      onClick={() => basculerModuleActif(mod)}
                      className={`px-2 py-1 rounded font-black text-[9px] transition uppercase border cursor-pointer ${
                        estActif
                          ? 'bg-orange-600 text-white border-orange-600 cursor-default shadow-xs'
                          : 'bg-white hover:bg-orange-50 text-slate-700 border-slate-300 shadow-2xs'
                      }`}
                    >
                      {estActif ? `✓ ${mod}` : mod}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 1 : STATUT DE LICENCE */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
        <h4 className="font-black text-slate-800 uppercase text-[10px] border-b pb-1">📊 STATUT DE VOTRE LICENCE — [{moduleActifCourant}]</h4>
        
        <div className="grid grid-cols-3 gap-1.5">
          <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl flex flex-col items-center text-center">
            <span className="text-[9px] font-black uppercase text-slate-500">Licence</span>
            <span className={`mt-1 px-2 py-0.5 rounded font-black text-[11px] border ${obtenirStyleStatut(statutLicenceActif)}`}>
              {statutLicenceActif}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl flex flex-col items-center text-center">
            <span className="text-[9px] font-black uppercase text-slate-500">Durée</span>
            <span className="mt-1 font-black text-slate-900 text-xs truncate">
              {dureeMoisActif} Mois
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl flex flex-col items-center text-center">
            <span className="text-[9px] font-black uppercase text-slate-500">Limite User</span>
            <span className="mt-1 font-black text-orange-600 text-xs truncate">
              {limiteUsersActif}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2 : PERSONNALISATION DE LA SOUSCRIPTION SUR-MESURE */}
      <div className="bg-white p-3 rounded-xl border-2 border-orange-500/50 shadow-md space-y-2.5">
        <h4 className="font-black text-[10px] text-orange-700 uppercase border-b pb-1">⚙️ PERSONNALISER ABONNEMENT — [{moduleActifCourant}]</h4>
        <div className="text-[9.5px] text-slate-600 leading-tight space-y-1">
          <p>Ajustez les paramètres pour le module actif. Tarifs et paliers gérés par le Super Admin.</p>
          <div className="bg-orange-50 border border-orange-200 p-1.5 rounded text-[9px] text-orange-900 font-bold">
            Grille de réductions active : {tarifsPlateforme.remisesDuree?.map(p => `${p.seuil}M (-${p.taux}%)`).join(', ')}
          </div>
        </div>

        <div className="grid grid-cols-[1.3fr_0.7fr] gap-2">
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-1">
            <label className="block font-black text-[9px] text-slate-700 uppercase truncate">
              👥 USERS SUPPLÉMENTAIRES : <span className="text-orange-600">{nombreUtilisateursChoisi}</span>
            </label>
            <div className="flex items-center justify-between bg-white border border-slate-300 rounded-lg p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setNombreUtilisateursChoisi(prev => Math.max(1, prev - 1))}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-black px-2.5 py-0.5 rounded-md text-xs transition cursor-pointer"
              >
                -
              </button>
              <span className="font-black text-xs text-slate-900">{nombreUtilisateursChoisi}</span>
              <button
                type="button"
                onClick={() => setNombreUtilisateursChoisi(prev => prev + 1)}
                className="bg-orange-600 hover:bg-orange-500 text-white font-black px-2.5 py-0.5 rounded-md text-xs transition cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-1">
            <label className="block font-black text-[9px] text-slate-700 uppercase flex justify-between items-center truncate">
              <span>📅 DURÉE : <span className="text-orange-600">{nombreMoisChoisi}</span></span>
              {tauxReductionGlobal > 0 && (
                <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-black">
                  -{Math.round(tauxReductionGlobal * 100)}%
                </span>
              )}
            </label>
            <div className="flex items-center justify-between bg-white border border-slate-300 rounded-lg p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setNombreMoisChoisi(prev => Math.max(1, prev - 1))}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-black px-2.5 py-0.5 rounded-md text-xs transition cursor-pointer"
              >
                -
              </button>
              <span className="font-black text-xs text-slate-900">{nombreMoisChoisi}</span>
              <button
                type="button"
                onClick={() => setNombreMoisChoisi(prev => prev + 1)}
                className="bg-orange-600 hover:bg-orange-500 text-white font-black px-2.5 py-0.5 rounded-md text-xs transition cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_1.4fr] gap-2 items-center pt-1">
          <div className="bg-orange-50 border border-orange-200 p-2 rounded-xl text-center flex flex-col justify-center">
            <span className="text-[8.5px] font-black text-orange-900 uppercase">Montant Total Calculé</span>
            <span className="text-xs font-black text-orange-700 font-mono">{montantTotalCalculé.toLocaleString()} F</span>
          </div>

          <button
            type="button"
            onClick={declencherSouscriptionSurMesure}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-2.5 px-2 rounded-xl transition shadow-xs text-xs uppercase tracking-wide truncate cursor-pointer"
          >
            Valider l'abonnement 🚀
          </button>
        </div>
      </div>

      {/* SECTION 3 : HISTORIQUE DES PAIEMENTS */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
        <h4 className="font-black text-slate-800 uppercase text-[10px] border-b pb-1">📜 Historique des Activations — [{moduleActifCourant}]</h4>
        
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
          <table className="w-full text-left text-xs table-fixed">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 uppercase text-[9px] font-black">
                <th className="p-2.5 w-[40%]">Date</th>
                <th className="p-2.5 w-[30%]">Module</th>
                <th className="p-2.5 w-[30%]">Expire le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[10px]">
              <tr>
                <td className="p-2.5 font-mono text-slate-600">{new Date().toLocaleDateString('fr-FR')}</td>
                <td className="p-2.5 font-black text-orange-600">{moduleActifCourant}</td>
                <td className="p-2.5 font-black text-emerald-700 font-mono">{obtenirDateExpiration()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 🪟 JOLIE MODALE DE NOTIFICATION / CONFIRMATION STYLISÉE */}
      {modaleInfo.ouverte && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-5 space-y-4 text-center shadow-2xl">
            
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl font-black ${
              modaleInfo.type === 'confirmation' ? 'bg-amber-500/20 text-amber-600 border border-amber-500/30' :
              modaleInfo.type === 'succes' ? 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30' : 
              modaleInfo.type === 'erreur' ? 'bg-rose-500/20 text-rose-600 border border-rose-500/30' :
              'bg-blue-500/20 text-blue-600 border border-blue-500/30'
            }`}>
              {modaleInfo.type === 'confirmation' ? '❓' :
               modaleInfo.type === 'succes' ? '✓' : 
               modaleInfo.type === 'erreur' ? '⚠️' : 'ℹ️'}
            </div>

            <div className="space-y-1">
              <h4 className="font-black text-sm uppercase tracking-wider text-slate-900">
                {modaleInfo.titre}
              </h4>
              <p className="text-xs font-medium leading-relaxed text-slate-600">
                {modaleInfo.message}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              {modaleInfo.type === 'confirmation' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setModaleInfo({ ...modaleInfo, ouverte: false })}
                    className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const action = modaleInfo.onConfirmer;
                      setModaleInfo({ ...modaleInfo, ouverte: false });
                      if (action) action();
                    }}
                    className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-black py-2.5 rounded-xl text-xs shadow-md transition cursor-pointer"
                  >
                    Confirmer
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const action = modaleInfo.onConfirmer;
                    setModaleInfo({ ...modaleInfo, ouverte: false });
                    if (action) action();
                  }}
                  className="w-full bg-[#0a1931] hover:bg-[#132d5c] text-white font-black py-2.5 rounded-xl text-xs shadow-md transition cursor-pointer"
                >
                  Compris 👍
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}