'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
};

export default function PanneauSuperAdmin({ isDarkMode = false }) {
  const [ongletActif, setOngletActif] = useState('paiements');
  const [modeContournement, setModeContournement] = useState(false);
  const [chargement, setChargement] = useState(false);

  // 🌟 État pour la jolie modale personnalisée
  const [modalInfo, setModalInfo] = useState({
    ouverte: false,
    titre: '',
    message: '',
    type: 'succes' // 'succes' ou 'erreur'
  });

  const afficherMessageModal = (titre, message, type = 'succes') => {
    setModalInfo({
      ouverte: true,
      titre,
      message,
      type
    });
  };

  // Charger l'état initial depuis Supabase au montage du composant
  useEffect(() => {
    const verifierEtatGlobal = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from('configuration_globale')
          .select('valeur')
          .eq('cle', '4ts_contournement_cinetpay')
          .maybeSingle();

        if (!error && data) {
          const actif = String(data.valeur) === 'true' || data.valeur === true;
          setModeContournement(actif);
          if (typeof window !== 'undefined') {
            localStorage.setItem('4ts_contournement_cinetpay', String(actif));
          }
        } else if (typeof window !== 'undefined') {
          // Repli localStorage si la table n'est pas encore interrogée
          setModeContournement(localStorage.getItem('4ts_contournement_cinetpay') === 'true');
        }
      } catch (err) {
        console.warn("Erreur chargement état global :", err);
      }
    };

    verifierEtatGlobal();
  }, []);

  const basculerContournementCinetPay = async (nouveauStatut) => {
    setModeContournement(nouveauStatut);
    try {
      const supabase = getSupabaseClient();
      
      // 🌐 Enregistrement synchrone et global dans Supabase pour impacter tous les clients instantanément
      const { error: upsertError } = await supabase
        .from('configuration_globale')
        .upsert([{ cle: '4ts_contournement_cinetpay', valeur: String(nouveauStatut) }], { onConflict: 'cle' });

      if (upsertError) {
        console.warn("Avertissement synchronisation Supabase (sauvegarde locale de secours) :", upsertError.message);
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('4ts_contournement_cinetpay', String(nouveauStatut));
      }

      afficherMessageModal(
        "Mise à jour réussie (Global)",
        nouveauStatut 
          ? "Mode contournement CinetPay activé globalement ! Tous les clients sur le lien de souscription sont maintenant en mode direct." 
          : "Mode contournement CinetPay désactivé globalement. Les paiements par passerelle sont à nouveau requis pour tous.",
        "succes"
      );
    } catch (err) {
      console.error("Erreur sauvegarde globale :", err);
      setModeContournement(!nouveauStatut);
      afficherMessageModal(
        "Erreur de synchronisation",
        `Impossible d'enregistrer le paramètre sur le serveur distant.`,
        "erreur"
      );
    }
  };

  const cardBg = isDarkMode ? 'bg-[#0b1329] border-cyan-900/50 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm';
  const subCardBg = isDarkMode ? 'bg-[#0f1d3e] border-cyan-950 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800';

  return (
    <div className={`space-y-4 p-3 sm:p-5 text-xs font-sans ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>
      
      {/* EN-TÊTE DU PANNEAU */}
      <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 gap-2 ${isDarkMode ? 'border-cyan-900/60' : 'border-blue-200'}`}>
        <div>
          <h2 className={`font-black uppercase text-sm tracking-wide ${isDarkMode ? 'text-cyan-400' : 'text-blue-700'}`}>
            🛡️ PANNEAU SUPER ADMINISTRATEUR
          </h2>
          <p className={`text-[10px] ${isDarkMode ? 'text-cyan-200/70' : 'text-slate-500'}`}>
            Supervision globale, passerelles de paiement et maintenance de la plateforme 4TS.
          </p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className={`${isDarkMode ? 'bg-cyan-950 text-cyan-300 border-cyan-800 hover:bg-cyan-900' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'} border font-bold px-3 py-1.5 rounded-xl text-[10px] transition shadow-2xs cursor-pointer flex items-center gap-1.5`}
        >
          <span>🔄</span> Actualiser l'état
        </button>
      </div>

      {/* ONGLETS DE NAVIGATION DU SUPER ADMIN */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setOngletActif('paiements')}
          className={`py-2 px-3 rounded-xl font-black uppercase text-[10px] transition border cursor-pointer flex items-center justify-center gap-1.5 ${
            ongletActif === 'paiements'
              ? 'bg-orange-600 text-white border-orange-500 shadow-md'
              : (isDarkMode ? 'bg-[#0b1329] border-cyan-900/50 text-slate-300 hover:bg-cyan-950/40' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50')
          }`}
        >
          <span>💳</span> Paiements & Souscriptions
        </button>
        <button
          onClick={() => setOngletActif('modules')}
          className={`py-2 px-3 rounded-xl font-black uppercase text-[10px] transition border cursor-pointer flex items-center justify-center gap-1.5 ${
            ongletActif === 'modules'
              ? 'bg-orange-600 text-white border-orange-500 shadow-md'
              : (isDarkMode ? 'bg-[#0b1329] border-cyan-900/50 text-slate-300 hover:bg-cyan-950/40' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50')
          }`}
        >
          <span>🧩</span> Modules & Fonctionnalités
        </button>
        <button
          onClick={() => setOngletActif('maintenance')}
          className={`py-2 px-3 rounded-xl font-black uppercase text-[10px] transition border cursor-pointer flex items-center justify-center gap-1.5 ${
            ongletActif === 'maintenance'
              ? 'bg-orange-600 text-white border-orange-500 shadow-md'
              : (isDarkMode ? 'bg-[#0b1329] border-cyan-900/50 text-slate-300 hover:bg-cyan-950/40' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50')
          }`}
        >
          <span>⚙️</span> Système & Maintenance
        </button>
      </div>

      {/* CONTENU DE L'ONGLET PAIEMENTS */}
      {ongletActif === 'paiements' && (
        <div className={`space-y-3 p-4 rounded-2xl border ${cardBg}`}>
          <h3 className="font-black uppercase text-xs text-orange-500 flex items-center gap-1.5">
            <span>💳</span> Gestion de la passerelle de paiement
          </h3>

          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${subCardBg}`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-black uppercase text-xs">Passerelle CinetPay (1.0 Aurore)</span>
                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  MODE CONTOURNEMENT {modeContournement ? '(ACTIF)' : '(INACTIF)'}
                </span>
              </div>
              <p className={`text-[10px] leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                Lorsque le contournement est actif, CinetPay est court-circuité globalement : les nouvelles entreprises sur le lien public sont créées et activées immédiatement sans exigence de paiement.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input 
                type="checkbox" 
                checked={modeContournement}
                onChange={(e) => basculerContournementCinetPay(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
            </label>
          </div>
        </div>
      )}

      {ongletActif === 'modules' && (
        <div className={`p-4 rounded-2xl border text-center py-8 ${cardBg}`}>
          <p className="text-slate-400 font-bold">Module de gestion centralisée des fonctionnalités en cours de chargement...</p>
        </div>
      )}

      {ongletActif === 'maintenance' && (
        <div className={`p-4 rounded-2xl border text-center py-8 ${cardBg}`}>
          <p className="text-slate-400 font-bold">Outils de maintenance et journaux système (Logs).</p>
        </div>
      )}

      {/* 🌟 JOLIE MODALE DE NOTIFICATION PERSONNALISÉE */}
      {modalInfo.ouverte && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`${isDarkMode ? 'bg-[#0f1c3f] border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'} w-full max-w-sm rounded-2xl shadow-2xl border p-5 space-y-4 text-center`}>
            
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl font-black ${
              modalInfo.type === 'succes' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-500'
            }`}>
              {modalInfo.type === 'succes' ? '✓' : '✕'}
            </div>

            <div className="space-y-1.5">
              <h4 className={`font-black text-sm uppercase tracking-wider ${
                modalInfo.type === 'succes' ? 'text-emerald-400' : 'text-rose-500'
              }`}>
                {modalInfo.titre}
              </h4>
              <p className={`text-[11px] leading-relaxed font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                {modalInfo.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setModalInfo({ ...modalInfo, ouverte: false })}
              className="w-full py-2.5 px-3 rounded-xl font-black text-xs uppercase bg-orange-600 hover:bg-orange-500 text-white transition shadow-lg cursor-pointer"
            >
              Compris 👍
            </button>

          </div>
        </div>
      )}

    </div>
  );
}