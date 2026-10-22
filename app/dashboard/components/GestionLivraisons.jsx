'use client';

import { useState } from 'react';

export default function GestionLivraisons({ entrepriseId = '4TS-TEST' }) {
  // Onglet actif par défaut dans le module Livraison
  const [ongletActif, setOngletActif] = useState('saisie');

  // Récupération dynamique et robuste du module actif (Boutique, Livraison, Logistique, Tontine, etc.)[cite: 30]
  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'LIVRAISON').toUpperCase();
    }
    return 'LIVRAISON';
  };

  const moduleActuel = obtenirModuleActuel();

  return (
    <div className="space-y-3 font-sans text-xs pb-16">
      {/* EN-TÊTE DU MODULE LIVRAISON */}
      <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="font-extrabold text-slate-900 uppercase text-xs flex items-center gap-1.5">
          <span>🛵</span> ESPACE LIVRAISON & COURSES [{moduleActuel}]
        </h3>
        <span className="bg-orange-100 text-orange-900 px-2 py-0.5 rounded font-black text-[10px] border border-orange-200">
          MODULE ACTIF : {moduleActuel}
        </span>
      </div>

      {/* BARRE DE NAVIGATION INTERNE DU MODULE LIVRAISON */}
      <div className="flex flex-wrap gap-1 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <button
          type="button"
          onClick={() => setOngletActif('saisie')}
          className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase transition ${
            ongletActif === 'saisie'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          📦 Saisie Livraison
        </button>

        <button
          type="button"
          onClick={() => setOngletActif('livreur')}
          className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase transition ${
            ongletActif === 'livreur'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          🏍️ Espace Livreur
        </button>

        <button
          type="button"
          onClick={() => setOngletActif('partenaire')}
          className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase transition ${
            ongletActif === 'partenaire'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          🤝 Gestion Partenaire
        </button>

        <button
          type="button"
          onClick={() => setOngletActif('gestion_livreur')}
          className={`px-3 py-1.5 rounded-lg font-black text-[10px] uppercase transition ${
            ongletActif === 'gestion_livreur'
              ? 'bg-orange-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          👥 Gestion Livreur
        </button>
      </div>

      {/* CONTENU AFFICHÉ SELON L'ONGLET SÉLECTIONNÉ */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        {ongletActif === 'saisie' && (
          <div className="space-y-2">
            <h4 className="font-black text-slate-800 uppercase text-xs border-b pb-1">📝 Saisie Livraison [{moduleActuel}]</h4>
            <p className="text-slate-500 text-[11px]">Interface de saisie et d'enregistrement des courses et colis pour le module {moduleActuel}.</p>
          </div>
        )}

        {ongletActif === 'livreur' && (
          <div className="space-y-2">
            <h4 className="font-black text-slate-800 uppercase text-xs border-b pb-1">🏍️ Espace Livreur [{moduleActuel}]</h4>
            <p className="text-slate-500 text-[11px]">Rattachement et gestion des livreurs associés au module {moduleActuel}.</p>
          </div>
        )}

        {ongletActif === 'partenaire' && (
          <div className="space-y-2">
            <h4 className="font-black text-slate-800 uppercase text-xs border-b pb-1">🤝 Gestion Partenaire [{moduleActuel}]</h4>
            <p className="text-slate-500 text-[11px]">Gestion des partenaires e-commerçants avec option de suivi de stockage (Oui/Non) pour {moduleActuel}.</p>
          </div>
        )}

        {ongletActif === 'gestion_livreur' && (
          <div className="space-y-2">
            <h4 className="font-black text-slate-800 uppercase text-xs border-b pb-1">👥 Gestion Livreur [{moduleActuel}]</h4>
            <p className="text-slate-500 text-[11px]">Suivi, annuaire et performances des livreurs sous le module {moduleActuel}.</p>
          </div>
        )}
      </div>
    </div>
  );
}