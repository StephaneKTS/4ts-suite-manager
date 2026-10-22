'use client';

import { useState } from 'react';
import GestionVentesHistoriques from './GestionVentesHistoriques';
import GestionJournalCaisse from './GestionJournalCaisse';

export default function GestionRapports({ entrepriseId = '4TS-TEST' }) {
  const [vueActive, setVueActive] = useState('ventes'); // 'ventes' ou ID de la sous-table de saisie comptable
  const [tiroirTresorerieOuvert, setTiroirTresorerieOuvert] = useState(false);

  // Récupération dynamique et robuste du module actif (Boutique, Livraison, Logistique, Tontine, etc.)
  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();

  // Sous-tables du bloc Saisie Comptable
  const tablesTresorerie = [
    {
      id: 'saisie_operations',
      nom: '📝 Saisie des Opérations',
      icon: '✍️',
      desc: 'Entrées, dépenses multi-lignes et pièces auto',
    },
    {
      id: 'grand_livre',
      nom: '📚 Grand Livre & Journal',
      icon: '📖',
      desc: 'Mouvements par période et par compte',
    },
    {
      id: 'controle_cloture',
      nom: '🔐 Contrôle & Clôture',
      icon: '🛡️',
      desc: 'Vérification caisse et versement central',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Grille des 2 grands blocs de rapports */}
      {vueActive === 'ventes' && !tiroirTresorerieOuvert && (
        <div className="space-y-4">
          <div className="text-center font-black text-xs text-orange-600 uppercase">
            RAPPORTS & COMPTABILITÉ — [{moduleActuel}]
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto pt-2">
            
            {/* Bloc 1 : Journal des Ventes */}
            <button
              onClick={() => setVueActive('ventes_detail')}
              className="bg-white hover:bg-slate-50 border border-slate-200 p-6 rounded-3xl flex flex-col items-center text-center gap-3 shadow-sm hover:shadow-md transition duration-200"
            >
              <span className="text-4xl p-3 bg-emerald-50 text-emerald-700 rounded-2xl">📊</span>
              <div>
                <span className="font-extrabold text-sm text-slate-900 block">Journal des Ventes [{moduleActuel}]</span>
                <span className="text-[11px] text-slate-600 font-bold mt-1 block leading-snug">
                  Consultation des tickets émis, filtres par période, dépôt et vendeur.
                </span>
              </div>
            </button>

            {/* Bloc 2 : Saisie Comptable (Ouvre le tiroir des 3 icônes) */}
            <button
              onClick={() => setTiroirTresorerieOuvert(true)}
              className="bg-white hover:bg-slate-50 border border-slate-200 p-6 rounded-3xl flex flex-col items-center text-center gap-3 shadow-sm hover:shadow-md transition duration-200"
            >
              <span className="text-4xl p-3 bg-orange-50 text-orange-600 rounded-2xl">💵</span>
              <div>
                <span className="font-extrabold text-sm text-slate-900 block">Saisie Comptable [{moduleActuel}]</span>
                <span className="text-[11px] text-slate-600 font-bold mt-1 block leading-snug">
                  Saisie des opérations, grand livre, journal de caisse et contrôle de clôture.
                </span>
              </div>
            </button>

          </div>
        </div>
      )}

      {/* Affichage du Journal des Ventes détaillé */}
      {vueActive === 'ventes_detail' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <button
              onClick={() => setVueActive('ventes')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1"
            >
              ⬅️ Retour aux blocs de rapports
            </button>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200">
              ● Journal des Ventes Actif [{moduleActuel}]
            </span>
          </div>
          <GestionVentesHistoriques entrepriseId={entrepriseId} />
        </div>
      )}

      {/* Affichage des modules de Saisie Comptable selon la sélection du tiroir */}
      {['saisie_operations', 'grand_livre', 'controle_cloture'].includes(vueActive) && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <button
              onClick={() => setVueActive('ventes')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition flex items-center gap-1"
            >
              ⬅️ Retour aux blocs de rapports
            </button>
            <span className="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-full border border-orange-200">
              ● Module Saisie Comptable Actif [{moduleActuel}]
            </span>
          </div>
          <GestionJournalCaisse entrepriseId={entrepriseId} vueInitiale={vueActive} />
        </div>
      )}

      {/* TIROIR / BOTTOM SHEET POUR LES 3 ICONES DE SAISIE COMPTABLE */}
      {tiroirTresorerieOuvert && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">💵</span>
                <h3 className="font-extrabold text-base text-slate-900">Saisie Comptable [{moduleActuel}]</h3>
              </div>
              <button
                onClick={() => setTiroirTresorerieOuvert(false)}
                className="text-slate-500 hover:text-slate-700 font-black p-1 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {tablesTresorerie.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setVueActive(t.id);
                    setTiroirTresorerieOuvert(false);
                  }}
                  className="bg-slate-50 hover:bg-orange-50 hover:border-orange-200 border border-slate-200 p-4 rounded-2xl flex flex-col items-center text-center gap-2 transition"
                >
                  <span className="text-3xl">{t.icon}</span>
                  <span className="font-extrabold text-xs text-slate-900 leading-tight">{t.nom}</span>
                  <span className="text-[10px] text-slate-600 font-semibold line-clamp-2">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}