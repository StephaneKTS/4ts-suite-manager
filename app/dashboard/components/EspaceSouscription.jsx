'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const TARIFS_MODULES = {
  Boutique: { installation: 25000, mensuelPerUser: 5000 },
  Logistique: { installation: 20000, mensuelPerUser: 4000 },
  Livraison: { installation: 25000, mensuelPerUser: 5000 },
  Tontine: { installation: 25000, mensuelPerUser: 2500 },
};

export default function EspaceSouscription({ entrepriseId = '4TS-TEST' }) {
  const [entreprise, setEntreprise] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [changementModuleEnCours, setChangementModuleEnCours] = useState(false);

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

  const PRIX_UNITAIRE_MOIS = 5000;
  const LISTE_MODULES_PRINCIPAUX = ['BOUTIQUE', 'LIVRAISON', 'LOGISTIQUE', 'TONTINE'];

  const chargerInfosEntreprise = async () => {
    setChargement(true);
    try {
      const { data, error } = await supabase
        .from('entreprises')
        .select('*')
        .or(`id_entreprise.eq.${entrepriseId},code_entreprise.eq.${entrepriseId}`)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setEntreprise(data);
        setNombreUtilisateursChoisi(1);
        if (data.duree_abonnement_mois) setNombreMoisChoisi(data.duree_abonnement_mois);
      }
    } catch (err) {
      console.error('Erreur chargement entreprise :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerInfosEntreprise();
  }, [entrepriseId]);

  // Récupération sécurisée du module actif (priorité au localStorage si défini, sinon Supabase)
  const moduleActifCourant = (
    typeof window !== 'undefined' ? localStorage.getItem('module_actif') : null
  ) || (entreprise?.module_actif || entreprise?.module_courant || 'BOUTIQUE').toUpperCase();

  const mettreAJourParametres = async (e) => {
    e.preventDefault();
    if (!entreprise) return;

    setSauvegarde(true);
    try {
      const identifiantCible = entreprise.id_entreprise || entreprise.code_entreprise || entrepriseId;
      const { error } = await supabase
        .from('entreprises')
        .update({
          gestion_perissables: entreprise.gestion_perissables ?? false,
        })
        .eq('id_entreprise', identifiantCible);

      if (error) throw error;
      alert(`Paramètres du module ${moduleActifCourant} mis à jour avec succès !`);
      chargerInfosEntreprise();
    } catch (err) {
      alert('Erreur lors de la mise à jour : ' + err.message);
    } finally {
      setSauvegarde(false);
    }
  };

  // FONCTION POUR CHANGER DE MODULE ACTIF (AVEC LOCALSTORAGE POUR FORCER L'AFFICHAGE)
  const basculerModuleActif = async (nouveauModule) => {
    if (!entreprise) return;
    setChangementModuleEnCours(true);

    try {
      const moduleUpper = nouveauModule.toUpperCase();
      const identifiantCible = entreprise.id_entreprise || entreprise.code_entreprise || entrepriseId;
      
      // 1. Sauvegarde dans le navigateur pour un affichage immédiat et garanti
      localStorage.setItem('module_actif', moduleUpper);

      // 2. Tentative d'écriture en base (si la colonne existe)
      await supabase
        .from('entreprises')
        .update({ module_actif: moduleUpper })
        .eq('id_entreprise', identifiantCible);

      setEntreprise(prev => ({ ...prev, module_actif: moduleUpper }));
      alert(`Affichage basculé vers le module : ${moduleUpper} 🚀`);
      window.location.reload(); 
    } catch (err) {
      alert('Erreur lors du changement de module : ' + err.message);
    } finally {
      setChangementModuleEnCours(false);
    }
  };

  const obtenirTauxReduction = (mois) => {
    if (mois >= 12) return 0.20;
    if (mois >= 9) return 0.15;
    if (mois >= 6) return 0.10;
    if (mois >= 3) return 0.05;
    return 0;
  };

  const tauxReduction = obtenirTauxReduction(nombreMoisChoisi);

  const calculerMontantTotal = () => {
    const brut = nombreUtilisateursChoisi * nombreMoisChoisi * PRIX_UNITAIRE_MOIS;
    return Math.round(brut * (1 - tauxReduction));
  };

  const montantTotalCalculé = calculerMontantTotal();

  const calculerDetailsNouveauxModules = () => {
    let fraisInstallationTotal = 0;
    let abonnementUtilisateurTotal = 0;

    Object.keys(nouveauxModulesChoisis).forEach((mod) => {
      if (nouveauxModulesChoisis[mod]) {
        const tarifKey = Object.keys(TARIFS_MODULES).find(k => k.toUpperCase() === mod.toUpperCase()) || 'Boutique';
        const tarif = TARIFS_MODULES[tarifKey] || { installation: 25000, mensuelPerUser: 5000 };
        
        fraisInstallationTotal += tarif.installation;
        abonnementUtilisateurTotal += tarif.mensuelPerUser * nombreUtilisateursChoisi * nombreMoisChoisi;
      }
    });

    return {
      fraisInstallation: fraisInstallationTotal,
      abonnementUtilisateur: abonnementUtilisateurTotal,
      totalGeneral: fraisInstallationTotal + abonnementUtilisateurTotal
    };
  };

  const detailsNouveauxModules = calculerDetailsNouveauxModules();

  // VALIDATION DE L'ACTIVATION DU MODULE
  const validerActivationNouveauxModules = async () => {
    const modulesSelectionnes = Object.keys(nouveauxModulesChoisis).filter(m => nouveauxModulesChoisis[m]);
    if (modulesSelectionnes.length === 0) {
      alert("Veuillez sélectionner au moins un module à activer.");
      return;
    }

    if (!confirm(`Mode Test : Activer directement les nouveaux modules [${modulesSelectionnes.join(', ')}] sans passer par le paiement ?`)) {
      return;
    }

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

      const identifiantCible = entreprise?.id_entreprise || entreprise?.code_entreprise || entrepriseId;

      const { error } = await supabase
        .from('entreprises')
        .update({
          espaces_souscrits: fusionEspaces,
          statut_licence: 'ACTIF',
        })
        .eq('id_entreprise', identifiantCible)
        .select();

      if (error) throw error;

      alert(`Succès réel ! Modules activés : ${fusionEspaces.join(', ')} 🚀`);
      
      setModeAjoutModule(false);
      await chargerInfosEntreprise();
      window.location.reload();
    } catch (err) {
      alert("Erreur critique lors de l'activation : " + err.message);
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

  const souscrireSurMesure = async () => {
    const ancienTotalUtilisateurs = parseInt(entreprise?.limite_utilisateurs || 1);
    const nouveauTotalCumule = ancienTotalUtilisateurs + parseInt(nombreUtilisateursChoisi);

    if (!confirm(`Mode Test : Valider l'abonnement pour ${nombreUtilisateursChoisi} utilisateur(s) supplémentaire(s) sans paiement ?`)) return;

    try {
      const identifiantCible = entreprise?.id_entreprise || entreprise?.code_entreprise || entrepriseId;
      const { error } = await supabase
        .from('entreprises')
        .update({
          statut_licence: 'ACTIF',
          duree_abonnement_mois: nombreMoisChoisi,
          limite_utilisateurs: nouveauTotalCumule,
        })
        .eq('id_entreprise', identifiantCible);

      if (error) throw error;

      alert(`Abonnement mis à jour avec succès. Nouvelle limite : ${nouveauTotalCumule} utilisateurs.`);
      chargerInfosEntreprise();
    } catch (err) {
      alert('Erreur lors de la mise à jour : ' + err.message);
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

  // Extraction sécurisée des espaces souscrits
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
    return <div className="p-6 text-center text-slate-500 font-bold text-xs">Chargement de l'espace de souscription...</div>;
  }

  return (
    <div className="space-y-3 font-sans text-xs pb-16">
      
      {/* EN-TÊTE */}
      <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="font-extrabold text-slate-900 uppercase text-xs flex items-center gap-1.5">
          <span>💳</span> ESPACE DE SOUSCRIPTION & PARAMÈTRES — <span className="text-orange-600">[{moduleActifCourant}]</span>
        </h3>
        <span className="bg-orange-100 text-orange-900 px-2 py-0.5 rounded font-black text-[10px] border border-orange-200">
          {entreprise?.nom_entreprise || 'Mon Entreprise'}
        </span>
      </div>

      {/* SECTION INTERCALAIRE : MODULES À SOUSCRIRE & MODULE ACTIF */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
        <div className="flex justify-between items-center border-b pb-1">
          <h4 className="font-black text-slate-800 uppercase text-[10px]">🧩 MODULES À SOUSCRIRE</h4>
          
          <button
            type="button"
            onClick={() => setModeAjoutModule(!modeAjoutModule)}
            className="bg-orange-600 hover:bg-orange-500 text-white font-black text-[10px] px-2.5 py-1 rounded-lg shadow-2xs transition flex items-center gap-1 uppercase"
          >
            <span>{modeAjoutModule ? '✖ Fermer' : '➕ Souscrire à un nouveau module'}</span>
          </button>
        </div>

        {/* FORMULAIRE SÉPARÉ D'EXTENSION DE NOUVEAUX MODULES (MODE TEST SANS PAIEMENT) */}
        {modeAjoutModule && (
          <div className="bg-orange-50/80 border-2 border-orange-400 p-3 rounded-xl space-y-2.5 animate-fadeIn">
            <h5 className="font-black text-orange-900 uppercase text-[10px]">🛒 Extension de modules (Vérification & Activation Base de Données)</h5>
            <p className="text-[9.5px] text-slate-700 leading-tight">
              Cochez les modules absents de votre base de données pour les activer :
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {LISTE_MODULES_PRINCIPAUX.map((mod) => {
                const estDejaSouscrit = espacesSouscrits.includes(mod);
                if (estDejaSouscrit) return null;

                const tarifMod = TARIFS_MODULES[mod.charAt(0) + mod.slice(1).toLowerCase()] || { installation: 25000, mensuelPerUser: 5000 };

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
                        checked={nouveauxModulesChoisis[mod]}
                        onChange={(e) => setNouveauxModulesChoisis({ ...nouveauxModulesChoisis, [mod]: e.target.checked })}
                        className="accent-orange-700 w-4 h-4"
                      />
                    </div>
                    <div className={`text-[8.5px] ${nouveauxModulesChoisis[mod] ? 'text-orange-100' : 'text-slate-500'}`}>
                      Installation : {tarifMod.installation.toLocaleString()} F<br />
                      User/Mois : {tarifMod.mensuelPerUser.toLocaleString()} F
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
                onClick={validerActivationNouveauxModules}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-2 rounded-lg text-[10px] shadow-2xs transition uppercase"
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
                ⚡ {moduleActifCourant}
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
                      className={`px-2 py-1 rounded font-black text-[9px] transition uppercase border ${
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

      {/* SECTION 1 : CONFIGURATION MÉTIER */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
        <h4 className="font-black text-slate-800 uppercase text-[10px] border-b pb-1">⚙️ Préférences de Gestion [{moduleActifCourant}]</h4>
        
        <form onSubmit={mettreAJourParametres} className="space-y-3">
          <div className="bg-orange-50/60 border border-orange-200 rounded-xl p-2.5 flex items-center justify-between gap-3">
            <div>
              <label className="font-black text-slate-900 block text-[11px]">
                Vendez-vous des articles périssables ? ({moduleActifCourant})
              </label>
              <p className="text-[10px] text-slate-600 leading-tight">
                Active l'affichage de la zone de péremption de manière indépendante pour ce module.
              </p>
            </div>

            <input
              type="checkbox"
              checked={entreprise?.gestion_perissables || false}
              onChange={(e) => setEntreprise({ ...entreprise, gestion_perissables: e.target.checked })}
              className="w-5 h-5 text-orange-600 rounded border-slate-300 focus:ring-orange-500 cursor-pointer shrink-0"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={sauvegarde}
              className="bg-orange-600 hover:bg-orange-500 text-white font-black px-4 py-1.5 rounded-lg transition shadow-2xs text-xs"
            >
              {sauvegarde ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2 : STATUT DE LICENCE */}
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

      {/* SECTION 3 : PERSONNALISATION DE LA SOUSCRIPTION SUR-MESURE */}
      <div className="bg-white p-3 rounded-xl border-2 border-orange-500/50 shadow-md space-y-2.5">
        <h4 className="font-black text-[10px] text-orange-700 uppercase border-b pb-1">⚙️ PERSONNALISER ABONNEMENT — [{moduleActifCourant}]</h4>
        <p className="text-[9.5px] text-slate-600 leading-tight">
          Ajustez les paramètres spécifiques au module actif <span className="text-emerald-700 font-black">Réductions : 3 Mois (-5%), 6 Mois (-10%), 12 Mois (-20%) !</span>
        </p>

        <div className="grid grid-cols-[1.3fr_0.7fr] gap-2">
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-1">
            <label className="block font-black text-[9px] text-slate-700 uppercase truncate">
              👥 USERS SUPPLÉMENTAIRES : <span className="text-orange-600">{nombreUtilisateursChoisi}</span>
            </label>
            <div className="flex items-center justify-between bg-white border border-slate-300 rounded-lg p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setNombreUtilisateursChoisi(prev => Math.max(1, prev - 1))}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-black px-2.5 py-0.5 rounded-md text-xs transition"
              >
                -
              </button>
              <span className="font-black text-xs text-slate-900">{nombreUtilisateursChoisi}</span>
              <button
                type="button"
                onClick={() => setNombreUtilisateursChoisi(prev => prev + 1)}
                className="bg-orange-600 hover:bg-orange-500 text-white font-black px-2.5 py-0.5 rounded-md text-xs transition"
              >
                +
              </button>
            </div>
          </div>

          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-1">
            <label className="block font-black text-[9px] text-slate-700 uppercase flex justify-between items-center truncate">
              <span>📅 DURÉE : <span className="text-orange-600">{nombreMoisChoisi}</span></span>
              {tauxReduction > 0 && (
                <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1 py-0.2 rounded font-black">
                  -{tauxReduction * 100}%
                </span>
              )}
            </label>
            <div className="flex items-center justify-between bg-white border border-slate-300 rounded-lg p-1 shadow-xs">
              <button
                type="button"
                onClick={() => setNombreMoisChoisi(prev => Math.max(1, prev - 1))}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-black px-2.5 py-0.5 rounded-md text-xs transition"
              >
                -
              </button>
              <span className="font-black text-xs text-slate-900">{nombreMoisChoisi}</span>
              <button
                type="button"
                onClick={() => setNombreMoisChoisi(prev => prev + 1)}
                className="bg-orange-600 hover:bg-orange-500 text-white font-black px-2.5 py-0.5 rounded-md text-xs transition"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_1.4fr] gap-2 items-center pt-1">
          <div className="bg-orange-50 border border-orange-200 p-2 rounded-xl text-center flex flex-col justify-center">
            <span className="text-[8.5px] font-black text-orange-900 uppercase">Montant Total</span>
            <span className="text-xs font-black text-orange-700 font-mono">{montantTotalCalculé.toLocaleString()} F</span>
          </div>

          <button
            type="button"
            onClick={souscrireSurMesure}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-2.5 px-2 rounded-xl transition shadow-xs text-xs uppercase tracking-wide truncate"
          >
            Valider l'abonnement (Mode Test) 🚀
          </button>
        </div>
      </div>

      {/* SECTION 4 : HISTORIQUE DES PAIEMENTS */}
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
                <td className="p-2.5 font-mono text-slate-600">10/01/2026</td>
                <td className="p-2.5 font-black text-orange-600">{moduleActifCourant}</td>
                <td className="p-2.5 font-black text-emerald-700 font-mono">{obtenirDateExpiration()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}