'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import HistoriqueDiffusionsSuperAdmin from './HistoriqueDiffusionsSuperAdmin';

const MODULES_DISPONIBLES = [
  { id: 'BOUTIQUE', label: 'Module Boutique 🛍️' },
  { id: 'LIVRAISON', label: 'Module Livraison 🚚' },
  { id: 'TONTINE', label: 'Module Tontine 💰' },
  { id: 'LOGISTIQUE', label: 'Module Logistique 📦' }
];

export default function CentreNotificationSuperAdmin({ isDarkMode = false }) {
  const [titre, setTitre] = useState('');
  const [message, setMessage] = useState('');
  const [modulesSelectionnes, setModulesSelectionnes] = useState(['TOUS']);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  // États pour les modales (confirmation, message résultat et historique des diffusions)
  const [modalConfirmationOuverte, setModalConfirmationOuverte] = useState(false);
  const [modalHistoriqueOuverte, setModalHistoriqueOuverte] = useState(false);
  const [modalMessage, setModalMessage] = useState({ ouverte: false, titre: '', texte: '', type: 'succes' });

  const toggleModule = (idModule) => {
    if (idModule === 'TOUS') {
      if (modulesSelectionnes.includes('TOUS')) {
        setModulesSelectionnes([]);
      } else {
        setModulesSelectionnes(['TOUS', ...MODULES_DISPONIBLES.map(m => m.id)]);
      }
      return;
    }

    let nouveauxModules = [...modulesSelectionnes];
    if (nouveauxModules.includes('TOUS')) {
      nouveauxModules = [];
    }

    if (nouveauxModules.includes(idModule)) {
      nouveauxModules = nouveauxModules.filter(m => m !== idModule);
    } else {
      nouveauxModules.push(idModule);
    }

    if (nouveauxModules.length === MODULES_DISPONIBLES.length) {
      nouveauxModules = ['TOUS', ...MODULES_DISPONIBLES.map(m => m.id)];
    }

    setModulesSelectionnes(nouveauxModules);
  };

  const toutCocher = () => {
    if (modulesSelectionnes.length === MODULES_DISPONIBLES.length + 1) {
      setModulesSelectionnes([]);
    } else {
      setModulesSelectionnes(['TOUS', ...MODULES_DISPONIBLES.map(m => m.id)]);
    }
  };

  const verifierAvantEnvoi = (e) => {
    e.preventDefault();
    if (!titre.trim() || !message.trim()) {
      setModalMessage({
        ouverte: true,
        titre: "Champ requis",
        texte: "Veuillez remplir le titre et le message de la notification.",
        type: 'erreur'
      });
      return;
    }

    if (modulesSelectionnes.length === 0) {
      setModalMessage({
        ouverte: true,
        titre: "Module requis",
        texte: "Veuillez sélectionner au moins un module cible.",
        type: 'erreur'
      });
      return;
    }

    setModalConfirmationOuverte(true);
  };

  const executerDiffusionNotification = async () => {
    setModalConfirmationOuverte(false);
    setEnvoiEnCours(true);

    const moduleCibleStr = modulesSelectionnes.includes('TOUS') 
      ? 'TOUS' 
      : modulesSelectionnes.join(', ');

    try {
      const { error } = await supabase
        .from('notifications_globales')
        .insert([{
          titre: titre.trim(),
          message: message.trim(),
          module_cible: moduleCibleStr,
          auteur: 'Super Administrateur 4TS',
          created_at: new Date()
        }]);

      if (error) throw error;

      setModalMessage({
        ouverte: true,
        titre: "Diffusion réussie 🚀",
        texte: `La notification a été diffusée avec succès aux modules : [${moduleCibleStr}] !`,
        type: 'succes'
      });

      setTitre('');
      setMessage('');
      setModulesSelectionnes(['TOUS']);
    } catch (err) {
      console.error("Erreur RLS Supabase :", err);
      setModalMessage({
        ouverte: true,
        titre: "Erreur d'insertion (RLS)",
        texte: "Erreur Supabase : " + err.message + "\n\nAstuce SQL : Exécutez la politique d'insertion RLS sur la table 'notifications_globales' dans votre dashboard Supabase.",
        type: 'erreur'
      });
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const cardBg = isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900';
  const inputBg = isDarkMode ? 'bg-slate-950 text-white border-slate-700' : 'bg-slate-50 text-slate-900 border-slate-300';
  const titleColor = isDarkMode ? 'text-slate-200' : 'text-[#0d2347]';
  const subTitleColor = isDarkMode ? 'text-slate-400' : 'text-slate-700';
  const btnBg = isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-[#0d2347] hover:bg-[#133265] text-white';
  const secondaryBtnBg = isDarkMode
    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
    : 'bg-slate-100 hover:bg-slate-200 text-[#0d2347] border border-slate-300';

  return (
    <div className={`p-4 rounded-2xl border shadow-sm space-y-4 font-sans text-xs ${cardBg}`}>
      <div className="border-b pb-2.5 flex flex-wrap items-center justify-between gap-2 border-slate-300/40">
        <h3 className={`font-extrabold uppercase flex items-center gap-1.5 ${titleColor}`}>
          <span>📢</span> Centre de Diffusion des Notifications Globales
        </h3>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModalHistoriqueOuverte(true)}
            className={`px-2.5 py-1 rounded-lg font-extrabold text-[10px] uppercase transition cursor-pointer flex items-center gap-1 shadow-2xs ${secondaryBtnBg}`}
          >
            <span>📜</span> Historique des diffusions
          </button>
          <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-[#0d2347]/10 text-[#0d2347]'}`}>
            Super Admin
          </span>
        </div>
      </div>

      <form onSubmit={verifierAvantEnvoi} className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className={`block font-bold uppercase text-[9px] ${subTitleColor}`}>
              Modules Cibles <span className="text-rose-600">*</span>
            </label>
            <button
              type="button"
              onClick={toutCocher}
              className={`text-[10px] font-bold underline cursor-pointer ${isDarkMode ? 'text-cyan-400' : 'text-[#0d2347]'}`}
            >
              {modulesSelectionnes.length === MODULES_DISPONIBLES.length + 1 ? 'Tout décocher ✕' : 'Tout cocher ✓'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className={`flex items-center space-x-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
              modulesSelectionnes.includes('TOUS') 
                ? (isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-[#0d2347]/10 border-[#0d2347]/40 font-bold') 
                : (isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200')
            }`}>
              <input
                type="checkbox"
                checked={modulesSelectionnes.includes('TOUS')}
                onChange={() => toggleModule('TOUS')}
                className="w-4 h-4 rounded accent-[#0d2347] cursor-pointer"
              />
              <span className="uppercase font-extrabold text-[11px]">🌟 TOUS LES MODULES</span>
            </label>

            {MODULES_DISPONIBLES.map((mod) => {
              const estCoche = modulesSelectionnes.includes(mod.id) || modulesSelectionnes.includes('TOUS');
              return (
                <label 
                  key={mod.id}
                  className={`flex items-center space-x-2.5 p-2.5 rounded-xl border cursor-pointer transition ${
                    estCoche 
                      ? (isDarkMode ? 'bg-slate-800 border-slate-600' : 'bg-[#0d2347]/10 border-[#0d2347]/40 font-bold') 
                      : (isDarkMode ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200')
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={estCoche}
                    onChange={() => toggleModule(mod.id)}
                    className="w-4 h-4 rounded accent-[#0d2347] cursor-pointer"
                  />
                  <span className="uppercase text-[11px] font-bold">{mod.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <label className={`block font-bold uppercase text-[9px] mb-1 ${subTitleColor}`}>
            Titre de l'annonce <span className="text-rose-600">*</span>
          </label>
          <input
            type="text"
            required
            placeholder="Ex: Maintenance système / Nouvelle mise à jour 🚀"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            className={`w-full border rounded-xl p-2.5 font-bold text-xs focus:outline-none focus:ring-2 ${inputBg}`}
          />
        </div>

        <div>
          <label className={`block font-bold uppercase text-[9px] mb-1 ${subTitleColor}`}>
            Message détaillé <span className="text-rose-600">*</span>
          </label>
          <textarea
            required
            rows={4}
            placeholder="Rédigez votre message ici..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className={`w-full border rounded-xl p-2.5 font-medium text-xs focus:outline-none focus:ring-2 ${inputBg}`}
          />
        </div>

        <button
          type="submit"
          disabled={envoiEnCours}
          className={`w-full font-black py-3 rounded-xl uppercase tracking-wider text-xs shadow-md transition cursor-pointer ${btnBg}`}
        >
          {envoiEnCours ? 'Diffusion en cours...' : 'Diffuser la notification sélectionnée 🚀'}
        </button>
      </form>

      {/* 📜 MODALE HISTORIQUE DES DIFFUSIONS */}
      {modalHistoriqueOuverte && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-2xl rounded-2xl shadow-2xl border p-5 space-y-4 max-h-[90vh] overflow-y-auto ${cardBg}`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-300/40">
              <h3 className={`font-black uppercase text-xs sm:text-sm flex items-center gap-1.5 ${titleColor}`}>
                <span>📜</span> Historique des Diffusions
              </h3>
              <button
                type="button"
                onClick={() => setModalHistoriqueOuverte(false)}
                className={`font-bold px-3 py-1 rounded-lg text-xs cursor-pointer ${secondaryBtnBg}`}
              >
                Fermer ✕
              </button>
            </div>
            <HistoriqueDiffusionsSuperAdmin isDarkMode={isDarkMode} />
          </div>
        </div>
      )}

      {/* 🌟 MODALE DE CONFIRMATION AVANT DIFFUSION */}
      {modalConfirmationOuverte && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-sm rounded-2xl p-5 space-y-4 text-center shadow-2xl border ${cardBg}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl font-black ${isDarkMode ? 'bg-slate-800 text-cyan-400' : 'bg-[#0d2347]/10 text-[#0d2347]'}`}>
              ❓
            </div>
            <div className="space-y-1.5">
              <h4 className={`font-black text-sm uppercase tracking-wider ${titleColor}`}>
                Confirmer la diffusion
              </h4>
              <p className={`text-[11px] font-semibold leading-relaxed ${subTitleColor}`}>
                Voulez-vous réellement diffuser cette notification à l'ensemble des utilisateurs des modules sélectionnés ?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalConfirmationOuverte(false)}
                className={`py-2 px-3 rounded-xl font-black text-xs uppercase cursor-pointer ${isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'}`}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={executerDiffusionNotification}
                className={`py-2 px-3 rounded-xl font-black text-xs uppercase transition shadow-md cursor-pointer ${btnBg}`}
              >
                Oui, diffuser 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 MODALE DE RÉSULTAT (SUCCÈS / ERREUR) */}
      {modalMessage.ouverte && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-sm rounded-2xl p-5 space-y-4 text-center shadow-2xl border ${cardBg}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl font-black ${modalMessage.type === 'succes' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
              {modalMessage.type === 'succes' ? '✓' : '⚠️'}
            </div>
            <div className="space-y-1.5">
              <h4 className={`font-black text-sm uppercase tracking-wider ${modalMessage.type === 'succes' ? 'text-emerald-500' : 'text-rose-500'}`}>
                {modalMessage.titre}
              </h4>
              <p className={`text-[11px] font-semibold leading-relaxed whitespace-pre-line ${subTitleColor}`}>
                {modalMessage.texte}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalMessage({ ...modalMessage, ouverte: false })}
              className={`w-full py-2.5 px-3 rounded-xl font-black text-xs uppercase transition shadow-md cursor-pointer ${btnBg}`}
            >
              Compris 👍
            </button>
          </div>
        </div>
      )}
    </div>
  );
}