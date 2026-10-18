'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtdqodqhkdxanrelxtrq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GestionVentesHistoriques({ entrepriseId = '4TS-TEST' }) {
  const [ventes, setVentes] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [filtreModePaiement, setFiltreModePaiement] = useState('TOUS');
  const [ticketSelectionne, setTicketSelectionne] = useState(null);

  const chargerVentes = async () => {
    setChargement(true);
    try {
      const { data, error } = await supabase
        .from('ventes_historiques')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVentes(data || []);
    } catch (err) {
      console.error('Erreur chargement historique ventes :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerVentes();
  }, [entrepriseId]);

  const ventesFiltrees = ventes.filter((v) => {
    const numTicket = (v.numero_ticket || '').toLowerCase();
    const matchQuery = numTicket.includes(recherche.toLowerCase());
    const matchPaiement =
      filtreModePaiement === 'TOUS' || (v.mode_paiement || '').toUpperCase() === filtreModePaiement;
    return matchQuery && matchPaiement;
  });

  const calculerTotalGeneral = () => {
    return ventesFiltrees.reduce((acc, v) => acc + (Number(v.total_montant) || 0), 0);
  };

  return (
    <div className="space-y-4 text-xs">
      {/* En-tête du composant */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm uppercase">📊 Historique des Ventes & Tickets</h3>
          <p className="text-slate-500">Consultation des tickets émis, audit des règlements et détails des articles vendus.</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-right">
          <span className="block text-[10px] uppercase font-bold text-emerald-600">Total Ventes Sélectionnées</span>
          <span className="text-base font-black text-emerald-700">
            {calculerTotalGeneral().toLocaleString('fr-FR')} F CFA
          </span>
        </div>
      </div>

      {/* Barre de filtres et recherche */}
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className="block font-bold text-slate-700 mb-1">Rechercher un Ticket :</label>
          <input
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="N° de ticket (ex: TK-2026-001)..."
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block font-bold text-slate-700 mb-1">Mode de Règlement :</label>
          <select
            value={filtreModePaiement}
            onChange={(e) => setFiltreModePaiement(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-bold text-slate-800"
          >
            <option value="TOUS">Tous les règlements</option>
            <option value="ESPECES">💵 Espèces</option>
            <option value="MOBILE_MONEY">📱 Mobile Money</option>
            <option value="CARTE">CB Carte Bancaire</option>
            <option value="CREDIT">🧾 Crédit Client</option>
          </select>
        </div>
      </div>

      <div className="flex justify-between items-center text-[11px] text-slate-500 px-1">
        <span>Historique : <strong>{ventesFiltrees.length}</strong> ticket(s) trouvé(s)</span>
      </div>

      {/* Tableau de l'historique des ventes */}
      {chargement ? (
        <div className="p-8 text-center text-slate-400">Chargement de l'historique des ventes...</div>
      ) : ventesFiltrees.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
          Aucun ticket de vente trouvé.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-3">Date & Heure</th>
                <th className="p-3">N° Ticket</th>
                <th className="p-3">Mode de Paiement</th>
                <th className="p-3">Articles</th>
                <th className="p-3">Montant Total</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ventesFiltrees.map((v) => {
                const detailsArr = Array.isArray(v.details_articles) ? v.details_articles : [];
                return (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-500 font-medium">
                      {new Date(v.created_at).toLocaleString('fr-FR')}
                    </td>
                    <td className="p-3 font-mono font-bold text-orange-600">{v.numero_ticket || '-'}</td>
                    <td className="p-3 font-bold">
                      <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-lg text-[10px]">
                        💳 {v.mode_paiement || 'Espèces'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-600 font-medium">
                      {detailsArr.length > 0 ? `${detailsArr.length} article(s)` : 'Détails non dispo'}
                    </td>
                    <td className="p-3 font-black text-emerald-700 text-sm">
                      {Number(v.total_montant || 0).toLocaleString('fr-FR')} F
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setTicketSelectionne(v)}
                        className="bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 px-3 py-1 rounded-xl font-bold transition shadow-sm"
                      >
                        👁️ Détails Ticket
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* POPUP MODAL : DÉTAILS D'UN TICKET */}
      {ticketSelectionne && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h4 className="font-extrabold text-sm uppercase">Ticket #{ticketSelectionne.numero_ticket}</h4>
                <p className="text-[10px] text-slate-400">
                  {new Date(ticketSelectionne.created_at).toLocaleString('fr-FR')}
                </p>
              </div>
              <button
                onClick={() => setTicketSelectionne(null)}
                className="text-slate-400 hover:text-white font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Contenu Ticket */}
            <div className="p-5 overflow-y-auto space-y-4 font-mono text-xs bg-slate-50">
              <div className="text-center pb-3 border-b border-dashed border-slate-300">
                <p className="font-black text-sm text-slate-800">4TS SUITE MANAGER</p>
                <p className="text-[11px] text-slate-500">KEITA SHOP - 4TS-TEST</p>
              </div>

              {/* Contenu des articles */}
              <div className="space-y-2">
                <p className="font-bold text-[10px] uppercase text-slate-400">Articles achetés :</p>
                {Array.isArray(ticketSelectionne.details_articles) && ticketSelectionne.details_articles.length > 0 ? (
                  <div className="space-y-1.5 divide-y divide-slate-200">
                    {ticketSelectionne.details_articles.map((item, idx) => (
                      <div key={idx} className="pt-1 flex justify-between items-start text-[11px]">
                        <div>
                          <p className="font-bold text-slate-800">{item.designation || item.nom}</p>
                          <p className="text-[10px] text-slate-500">
                            {item.quantite} x {Number(item.prix_unitaire || item.prix || 0).toLocaleString('fr-FR')} F
                          </p>
                        </div>
                        <span className="font-bold text-slate-900">
                          {Number((item.quantite || 1) * (item.prix_unitaire || item.prix || 0)).toLocaleString('fr-FR')} F
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic">Aucun détail enregistré dans le ticket.</p>
                )}
              </div>

              {/* Totaux & Mode de Paiement */}
              <div className="pt-3 border-t border-dashed border-slate-300 space-y-1">
                <div className="flex justify-between font-black text-sm text-slate-900 pt-1">
                  <span>TOTAL PAYÉ :</span>
                  <span className="text-emerald-700">
                    {Number(ticketSelectionne.total_montant || 0).toLocaleString('fr-FR')} F CFA
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Mode de Règlement :</span>
                  <span className="font-bold">{ticketSelectionne.mode_paiement || 'Espèces'}</span>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-white border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setTicketSelectionne(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-4 py-2 rounded-xl transition"
              >
                Fermer
              </button>
              <button
                onClick={() => window.print()}
                className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded-xl transition shadow"
              >
                🖨️ Imprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}