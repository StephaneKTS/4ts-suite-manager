'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionCommandesClientsQR({ entrepriseId = '4TS-290136' }) {
  const [commandes, setCommandes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [filtreStatut, setFiltreStatut] = useState('TOUT');
  const dernierNombreCommandes = useRef(null);

  // Vibration forte et rythmée
  const declencherVibration = () => {
    if (typeof window !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([500, 200, 500, 200, 800, 200, 800]);
      } catch (e) {
        console.log("Vibration non supportée");
      }
    }
  };

  // Annonce vocale renforcée et débloquée
  const annoncervocalement = (texte) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.resume(); // Débloque l'audio si mis en pause par le navigateur
        window.speechSynthesis.cancel(); // Annule la file d'attente précédente
        
        const utterance = new SpeechSynthesisUtterance(texte);
        utterance.lang = 'fr-FR';
        utterance.rate = 0.95; // Vitesse claire
        utterance.pitch = 1.1;  // Ton un peu plus aigu pour attirer l'attention
        utterance.volume = 1.0; // Volume au maximum
        
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.log("Erreur synthèse vocale :", e);
      }
    }
  };

  // Son d'alarme beaucoup plus fort, long et percutant (Séquence de bips répétés)
  const jouerSonAlerteFort = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const audioCtx = new AudioContext();
      
      // Séquence de 3 bips puissants répétés
      [0, 0.4, 0.8, 1.2].forEach((delay) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'sawtooth'; // Son plus fort et percutant qu'un simple 'sine'
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + delay); // Note aiguë (La5)
        
        gain.gain.setValueAtTime(0.7, audioCtx.currentTime + delay); // Volume élevé (0.7)
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + 0.3);
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(audioCtx.currentTime + delay);
        osc.stop(audioCtx.currentTime + delay + 0.3);
      });
    } catch (e) {
      console.log("Audio non pris en charge ou bloqué :", e);
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
          // Nouvelle commande détectée : Alerte forte, vibrations et voix
          jouerSonAlerteFort();
          declencherVibration();
          
          const derniereCmd = nouvellesCommandes[0];
          if (derniereCmd) {
            const messageVocal = `Attention ! Nouvelle commande reçue. Client ${derniereCmd.nom_client || 'Anonyme'}, table ${derniereCmd.numero_table || 'non spécifiée'}.`;
            annoncervocalement(messageVocal);
          }
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
      
      // Actualisation automatique toutes les 6 secondes
      const interval = setInterval(() => {
        chargerCommandesQR(true);
      }, 6000);

      // Rappel toutes les 5 minutes pour les commandes servies mais non payées
      const intervalRappelPaiement = setInterval(() => {
        setCommandes(prevCommandes => {
          const impayesServis = prevCommandes.some(c => c.statut === 'SERVI' && c.statut_paiement !== 'PAYE');
          if (impayesServis) {
            jouerSonAlerteFort();
            declencherVibration();
            annoncervocalement("Alerte impayé ! Une commande servie n'a pas encore été réglée.");
          }
          return prevCommandes;
        });
      }, 300000); // 5 minutes

      return () => {
        clearInterval(interval);
        clearInterval(intervalRappelPaiement);
      };
    }
  }, [entrepriseId]);

  const changerStatutCommande = async (idCommande, nouveauStatut, statutPaiement) => {
    if (nouveauStatut === 'SERVI' && statutPaiement !== 'PAYE') {
      const confirmer = window.confirm(
        "⚠️ ATTENTION : Cette commande n'a pas encore été payée !\n\nVoulez-vous vraiment la marquer comme SERVIE ?"
      );
      if (!confirmer) return;
    }

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

  const basculerPaiement = async (idCommande, statutActuel) => {
    const nouveauStatutPaiement = statutActuel === 'PAYE' ? 'NON_PAYE' : 'PAYE';
    try {
      const { error } = await supabase
        .from('commandes_clients_qr')
        .update({ statut_paiement: nouveauStatutPaiement })
        .eq('id', idCommande);

      if (error) throw error;
      chargerCommandesQR(false);
    } catch (err) {
      alert('Erreur lors de la mise à jour du paiement : ' + err.message);
    }
  };

  const commandesFiltrees = commandes.filter(cmd => {
    if (filtreStatut === 'TOUT') return true;
    return cmd.statut === filtreStatut;
  });

  return (
    <div className="space-y-2 font-sans text-xs max-w-4xl mx-auto p-1 pb-16">
      <div className="bg-white p-2 rounded-xl border border-orange-200 shadow-2xs flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse inline-block"></span>
              Commandes Clients
            </h2>
            <p className="text-[9px] text-slate-500 font-bold">Suivi en direct & Alertes Fortes</p>
          </div>
          <button
            onClick={() => {
              // Permet aussi de débloquer l'audio d'un simple clic si nécessaire
              jouerSonAlerteFort();
              annoncervocalement("Système audio activé.");
              chargerCommandesQR(false);
            }}
            className="bg-orange-100 hover:bg-orange-200 text-orange-800 font-bold px-2 py-1 rounded-lg text-[9px] transition"
          >
            🔊 Tester / Actualiser
          </button>
        </div>

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

            const estPaye = cmd.statut_paiement === 'PAYE';
            const estServiImpaye = cmd.statut === 'SERVI' && !estPaye;

            return (
              <div 
                key={cmd.id} 
                className={`bg-white rounded-xl border p-2.5 shadow-2xs space-y-2 flex flex-col justify-between transition ${
                  estServiImpaye ? 'border-red-500 ring-2 ring-red-400/50 bg-red-50/20' : 'border-slate-200'
                }`}
              >
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

                  {estServiImpaye && (
                    <div className="bg-red-500 text-white p-1.5 rounded-lg text-center font-black text-[9px] uppercase tracking-wider animate-bounce">
                      🚨 ALERTE : COMMANDE SERVIE MAIS NON PAYÉE !
                    </div>
                  )}

                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="font-black text-slate-900 uppercase text-[10px]">👤 {cmd.nom_client}</p>
                      <p className="font-bold text-slate-600 text-[9px]">📞 {cmd.telephone_client} | 💳 {cmd.mode_paiement || 'ESPECES'}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <span className="bg-orange-100 text-orange-800 font-black px-2 py-0.5 rounded-md text-[9px] block">
                        Table : {cmd.numero_table || 'N/A'}
                      </span>
                      <button
                        type="button"
                        onClick={() => basculerPaiement(cmd.id, cmd.statut_paiement)}
                        className={`px-2 py-0.5 rounded-md font-black text-[8px] uppercase border transition ${
                          estPaye 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200' 
                            : 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200 animate-pulse'
                        }`}
                      >
                        {estPaye ? 'Payé 🟢' : 'Non Payé 🔴'}
                      </button>
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

                  {cmd.statut === 'SERVI' ? (
                    <div className="text-center py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <span className="font-black text-[9px] text-emerald-700 uppercase tracking-wide">
                        🔒 Servie & Verrouillée ✅
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 pt-0.5">
                      {cmd.statut !== 'EN_COURS' && (
                        <button
                          type="button"
                          onClick={() => changerStatutCommande(cmd.id, 'EN_COURS', cmd.statut_paiement)}
                          className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-black py-1.5 rounded-lg text-[9px] uppercase transition shadow-2xs"
                        >
                          En cours 🍳
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => changerStatutCommande(cmd.id, 'SERVI', cmd.statut_paiement)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-1.5 rounded-lg text-[9px] uppercase transition shadow-2xs"
                      >
                        Servi ✅
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}