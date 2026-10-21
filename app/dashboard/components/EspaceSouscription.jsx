'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function EspaceSouscription({ entrepriseId = '4TS-TEST' }) {
  const [entreprise, setEntreprise] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [sauvegarde, setSauvegarde] = useState(false);

  const [nombreUtilisateursChoisi, setNombreUtilisateursChoisi] = useState(1);
  const [nombreMoisChoisi, setNombreMoisChoisi] = useState(1);
  
  const PRIX_UNITAIRE_MOIS = 5000;
  const LISTE_MODULES_PRINCIPAUX = ['BOUTIQUE', 'LIVRAISON', 'LOGISTIQUE', 'TONTINE'];

  const chargerInfosEntreprise = async () => {
    setChargement(true);
    try {
      const { data, error } = await supabase
        .from('entreprises')
        .select('*')
        .or(`id.eq.${entrepriseId},id_entreprise.eq.${entrepriseId},code_entreprise.eq.${entrepriseId}`)
        .single();

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

  const mettreAJourParametres = async (e) => {
    e.preventDefault();
    if (!entreprise) return;

    setSauvegarde(true);
    try {
      let query = supabase.from('entreprises').update({
        gestion_perissables: entreprise.gestion_perissables,
      });

      if (entreprise.id) {
        query = query.eq('id', entreprise.id);
      } else {
        query = query.eq('id_entreprise', entreprise.id_entreprise || entrepriseId);
      }

      const { error } = await query;
      if (error) throw error;
      alert('Paramètres de l’entreprise mis à jour avec succès !');
    } catch (err) {
      alert('Erreur lors de la mise à jour : ' + err.message);
    } finally {
      setSauvegarde(false);
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

  const obtenirDateExpiration = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + (entreprise?.duree_abonnement_mois || 1));
    return date.toLocaleDateString('fr-FR');
  };

  const souscrireSurMesure = async () => {
    const ancienTotalUtilisateurs = parseInt(entreprise?.limite_utilisateurs || 1);
    const nouveauTotalCumule = ancienTotalUtilisateurs + parseInt(nombreUtilisateursChoisi);

    if (!confirm(`Confirmer l'ajout de ${nombreUtilisateursChoisi} utilisateur(s) supplémentaire(s) (Total cumulé : ${nouveauTotalCumule}) pour ${nombreMoisChoisi} mois, soit ${montantTotalCalculé.toLocaleString()} FCFA ?`)) return;

    try {
      const payloadMiseAJour = {
        statut_licence: 'ACTIF',
        duree_abonnement_mois: nombreMoisChoisi,
        limite_utilisateurs: nouveauTotalCumule,
      };

      let query = supabase.from('entreprises').update(payloadMiseAJour);

      if (entreprise?.id) {
        query = query.eq('id', entreprise.id);
      } else {
        query = query.eq('id_entreprise', entreprise?.id_entreprise || entrepriseId);
      }

      const { error } = await query;
      if (error) throw error;

      setEntreprise(prev => ({
        ...prev,
        ...payloadMiseAJour
      }));

      alert(`Félicitations ! Votre abonnement a été mis à jour. Nouvelle limite totale : ${nouveauTotalCumule} utilisateurs.`);
      chargerInfosEntreprise();
    } catch (err) {
      alert('Erreur lors du renouvellement : ' + err.message);
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

  // Récupération sécurisée des modules souscrits et du module actif depuis l'objet entreprise
  const modulesSouscrits = Array.isArray(entreprise?.modules_souscrits) 
    ? entreprise.modules_souscrits 
    : (typeof entreprise?.modules_souscrits === 'string' ? entreprise.modules_souscrits.split(',').map(m => m.trim()) : ['BOUTIQUE', 'LIVRAISON', 'LOGISTIQUE', 'TONTINE']);
  
  const moduleActifCourant = (entreprise?.module_actif || entreprise?.module_courant || 'BOUTIQUE').toUpperCase();

  if (chargement) {
    return <div className="p-6 text-center text-slate-500 font-bold text-xs">Chargement de l'espace de souscription...</div>;
  }

  return (
    <div className="space-y-3 font-sans text-xs pb-16">
      
      {/* EN-TÊTE */}
      <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="font-extrabold text-slate-900 uppercase text-xs flex items-center gap-1.5">
          <span>💳</span> ESPACE DE SOUSCRIPTION & PARAMÈTRES
        </h3>
        <span className="bg-orange-100 text-orange-900 px-2 py-0.5 rounded font-black text-[10px] border border-orange-200">
          {entreprise?.nom_entreprise || 'Mon Entreprise'}
        </span>
      </div>

      {/* SECTION INTERCALAIRE : MODULES SOUSCRITS ET MODULE ACTIF */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
        <h4 className="font-black text-slate-800 uppercase text-[10px] border-b pb-1">🧩 Modules & État de l'Entreprise</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          
          {/* Modules Souscrits */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5">
            <span className="block font-black text-[9px] text-slate-500 uppercase">Modules souscrits :</span>
            <div className="flex flex-wrap gap-1">
              {LISTE_MODULES_PRINCIPAUX.map((mod) => {
                const estSouscrit = modulesSouscrits.includes(mod) || modulesSouscrits.includes(mod.toLowerCase());
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

          {/* Module Actif */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1.5 flex flex-col justify-center">
            <span className="block font-black text-[9px] text-slate-500 uppercase">Module Actif :</span>
            <div>
              <span className="bg-orange-100 text-orange-900 border border-orange-300 px-2.5 py-1 rounded-lg font-black text-xs inline-block shadow-2xs">
                ⚡ {moduleActifCourant}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 1 : CONFIGURATION MÉTIER */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
        <h4 className="font-black text-slate-800 uppercase text-[10px] border-b pb-1">⚙️ Préférences de Gestion</h4>
        
        <form onSubmit={mettreAJourParametres} className="space-y-3">
          <div className="bg-orange-50/60 border border-orange-200 rounded-xl p-2.5 flex items-center justify-between gap-3">
            <div>
              <label className="font-black text-slate-900 block text-[11px]">
                Vendez-vous des articles périssables ?
              </label>
              <p className="text-[10px] text-slate-600 leading-tight">
                Active l'affichage de la zone de saisie de la date de péremption dans le formulaire des articles.
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

      {/* SECTION 2 : STATUT DE L'ABONNEMENT ACTUEL (3 ÉLÉMENTS SUR LA MÊME LIGNE) */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
        <h4 className="font-black text-slate-800 uppercase text-[10px] border-b pb-1">📊 STATUT DE VOTRE LICENCE</h4>
        
        <div className="grid grid-cols-3 gap-1.5">
          <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl flex flex-col items-center text-center">
            <span className="text-[9px] font-black uppercase text-slate-500">Licence</span>
            <span className={`mt-1 px-2 py-0.5 rounded font-black text-[11px] border ${obtenirStyleStatut(entreprise?.statut_licence)}`}>
              {entreprise?.statut_licence || 'ACTIF'}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl flex flex-col items-center text-center">
            <span className="text-[9px] font-black uppercase text-slate-500">Durée</span>
            <span className="mt-1 font-black text-slate-900 text-xs truncate">
              {entreprise?.duree_abonnement_mois || 1} Mois
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl flex flex-col items-center text-center">
            <span className="text-[9px] font-black uppercase text-slate-500">Limite User</span>
            <span className="mt-1 font-black text-orange-600 text-xs truncate">
              {entreprise?.limite_utilisateurs || 1}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 3 : PERSONNALISATION DE LA SOUSCRIPTION (SUR-MESURE) */}
      <div className="bg-white p-3 rounded-xl border-2 border-orange-500/50 shadow-md space-y-2.5">
        <h4 className="font-black text-[10px] text-orange-700 uppercase border-b pb-1">⚙️ PERSONNALISER VOTRE ABONNEMENT SUR-MESURE</h4>
        <p className="text-[9.5px] text-slate-600 leading-tight">
          Ajustez ci-dessous le nombre d'utilisateurs <span className="text-emerald-700 font-black">Réductions : 3 Mois (-5%), 6 Mois (-10%), 9 Mois (-15%), 12 Mois (-20%) !</span>
        </p>

        {/* NOUVEAUX USERS ET DURÉE SUR LA MÊME LIGNE */}
        <div className="grid grid-cols-[1.3fr_0.7fr] gap-2">
          
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 space-y-1">
            <label className="block font-black text-[9px] text-slate-700 uppercase truncate">
              👥 NOUVEAUX USERS : <span className="text-orange-600">{nombreUtilisateursChoisi}</span>
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

        {/* ZONE DE CALCUL AUTOMATIQUE DU MONTANT ET BOUTON DE VALIDATION CÔTE À CÔTE */}
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
            Valider l'abonnement 🚀
          </button>

        </div>
      </div>

      {/* SECTION 4 : HISTORIQUE DES PAIEMENTS */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
        <h4 className="font-black text-slate-800 uppercase text-[10px] border-b pb-1">📜 Historique des Paiements</h4>
        
        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
          <table className="w-full text-left text-xs table-fixed">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 uppercase text-[9px] font-black">
                <th className="p-2.5 w-[50%]">Date</th>
                <th className="p-2.5 w-[50%]">Expire le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[10px]">
              <tr>
                <td className="p-2.5 font-mono text-slate-600">10/01/2026</td>
                <td className="p-2.5 font-black text-emerald-700 font-mono">{obtenirDateExpiration()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}