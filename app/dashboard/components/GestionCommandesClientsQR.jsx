'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionCommandesClientsQR({ entrepriseId = '4TS-290136' }) {
  const [commandes, setCommandes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [filtreStatut, setFiltreStatut] = useState('TOUT');
  const dernierNombreCommandes = useRef(null);

  // Fonction pour jouer un son de notification (Synthétiseur audio web)
  const jouerSonAlerte = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // Note Ré5
      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.8);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.8);
    } catch (e) {
      console.log("Audio non pris en charge ou bloqué par le navigateur");
    }
  };

  const chargerCommandesQR = async (verifierNouveau = false) => {
    try {
      const { data, error } = await supabase
        .from('commandes_clients_qr')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const nouvellesCommandes = data || [];
      
      if (verifierNouveau && dernierNombreCommandes.current !== null) {
        if (nouvellesCommandes.length > dernierNombreCommandes.current) {
          jouerSonAlerte();
        }
      }
      
      dernierNombreCommandes.current = nouvellesCommandes.length;
      setCommandes(nouvellesCommandes);
    } catch (err) {
      console.error('Erreur chargement commandes :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    if (entrepriseId) {
      chargerCommandesQR(false);

      // Vérification automatique des nouvelles commandes toutes les 6 secondes
      const interval = setInterval(() => {
        chargerCommandesQR(true);
      }, 6000);

      return () => clearInterval(interval);
    }
  }, [entrepriseId]);

  const changerStatutCommande = async (idCommande, nouveauStatut) => {
    try {
      const { error } = await supabase
        .from('commandes_clients_qr')
        .update({ statut: nouveauStatut })
        .eq('id', idCommande);

      if (error) throw error;
      chargerCommandesQR(false);
    } catch (err) {
      alert('Erreur lors de la mise à jour du statut : ' + err.message);
    }
  };

  const commandesFiltrees = commandes.filter(cmd => {
    if (filtreStatut === 'TOUT') return true;
    return cmd.statut === filtreStatut;
  });

  return (
    <div className="space-y-2 font-sans text-xs max-w-4xl mx-auto p-1 pb-16">
      {/* En-tête épuré vert et orange */}
      <div className="bg-white p-2 rounded-xl border border-orange-200 shadow-2xs flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse inline-block"></span>
              Commandes Clients
            </h2>
            <p className="text-[9px] text-slate-500 font-bold">Suivi en direct (Cuisine / Caisse)</p>
          </div>
          <button
            onClick={() => chargerCommandesQR(false)}
            className="bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold px-2 py-1 rounded-lg text-[9px] transition"
          >
            🔄 Actualiser
          </button>
        </div>

        {/* Boutons de filtre compacts */}
        <div className="grid grid-cols-4 gap-1 bg-orange-50/80 p-1 rounded-lg border border-orange-100">
          {['TOUT', 'EN_ATTENTE', 'EN_COURS', 'SERVI'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFiltreStatut(st)}
              className={`py-1 px-1 rounded-md font-black text-[8px] uppercase transition text-center truncate ${
                filtreStatut === st ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-700 hover:bg-orange-100'
              }`}
            >
              {st === 'TOUT' ? 'Toutes' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {chargement ? (
        <div className="bg-white p-6 text-center text-slate-400 font-bold rounded-xl border">Chargement...</div>
      ) : commandesFiltrees.length === 0 ? (
        <div className="bg-white p-6 text-center text-slate-400 font-bold rounded-xl border italic text-[11px]">Aucune commande trouvée.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {commandesFiltrees.map((cmd) => {
            let detailsArticles = [];
            try {
              detailsArticles = JSON.parse(cmd.details_articles || '[]');
            } catch (e) {}

            let badgeColor = 'bg-orange-100 text-orange-800 border-orange-300';
            if (cmd.statut === 'EN_COURS') badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';
            if (cmd.statut === 'SERVI') badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';

            return (
              <div key={cmd.id} className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-2xs space-y-2 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-1">
                    <div>
                      <span className="font-mono font-black text-orange-600 text-[10px] block">{cmd.numero_commande}</span>
                      <span className="text-[8px] text-slate-400 font-bold">
                        {new Date(cmd.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(cmd.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full font-black text-[8px] border uppercase ${badgeColor}`}>
                      {cmd.statut?.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="font-black text-slate-900 uppercase text-[10px]">👤 {cmd.nom_client}</p>
                      <p className="font-bold text-slate-600 text-[9px]">📞 {cmd.telephone_client}</p>
                    </div>
                    <div className="text-right">
                      <span className="bg-orange-100 text-orange-800 font-black px-2 py-1 rounded-md text-[9px]">
                        📍 Table : {cmd.numero_table || 'N/A'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <h4 className="font-black text-slate-800 uppercase text-[8px]">Articles :</h4>
                    <div className="divide-y divide-slate-100 max-h-24 overflow-y-auto pr-1">
                      {detailsArticles.map((art, idx) => (
                        <div key={idx} className="flex justify-between items-center py-0.5 text-[9px]">
                          <span className="font-bold text-slate-700 truncate pr-2">
                            {art.designation} <strong className="text-orange-600">x{art.quantite}</strong>
                          </span>
                          <span className="font-mono font-bold text-slate-900 shrink-0">
                            {(art.prix * art.quantite).toLocaleString()} F
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                  <div className="flex justify-between items-center text-[10px] font-black">
                    <span className="text-slate-900 uppercase">Total :</span>
                    <span className="text-emerald-600 font-mono text-xs">{Number(cmd.montant_total).toLocaleString()} FCFA</span>
                  </div>

                  {/* Boutons de statut compacts et visibles sur mobile */}
                  <div className="flex items-center gap-1 pt-0.5">
                    {cmd.statut !== 'EN_COURS' && (
                      <button
                        type="button"
                        onClick={() => changerStatutCommande(cmd.id, 'EN_COURS')}
                        className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-black py-1.5 rounded-lg text-[9px] uppercase transition shadow-2xs"
                      >
                        En cours 🍳
                      </button>
                    )}
                    {cmd.statut !== 'SERVI' && (
                      <button
                        type="button"
                        onClick={() => changerStatutCommande(cmd.id, 'SERVI')}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-1.5 rounded-lg text-[9px] uppercase transition shadow-2xs"
                      >
                        Servi ✅
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}