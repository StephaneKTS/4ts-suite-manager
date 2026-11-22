'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionCommandesClientsQR({ entrepriseId = '4TS-290136' }) {
  const [commandes, setCommandes] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [filtreStatut, setFiltreStatut] = useState('TOUT');
  const [filtreDate, setFiltreDate] = useState('AUJOURDHUI');
  
  const [audioActive, setAudioActive] = useState(true);
  const [pushActif, setPushActif] = useState(false);

  // État pour la modale de confirmation d'une commande servie non payée
  const [modalConfirmation, setModalConfirmation] = useState({
    visible: false,
    idCommande: null,
    statutPaiement: null
  });

  // État pour la modale de confirmation du basculement de paiement
  const [modalPaiement, setModalPaiement] = useState({
    visible: false,
    idCommande: null,
    statutActuel: null,
    montantTotal: 0,
    numeroCmd: null
  });

  // Nouveaux états pour les modales de confirmation Audio et Push (remplacement des alertes natives)
  const [modalAudio, setModalAudio] = useState({ visible: false, actionVoulue: false });
  const [modalPush, setModalPush] = useState({ visible: false, actionVoulue: false });
  const [modalMessageInfo, setModalMessageInfo] = useState({ visible: false, titre: '', texte: '', type: 'info' });

  // File d'attente audio et vocale strictement séquentielle
  const fileDAbsolueAudio = useRef([]);
  const enTrainDeJouerAudio = useRef(false);
  const idsCommandesConnues = useRef(new Set());

  const formaterNumeroElegant = (numeroBrut) => {
    if (!numeroBrut) return 'CMD-000';
    const parts = numeroBrut.split('-');
    if (parts.length > 1) {
      const suffixe = parts[parts.length - 1];
      const prefixeRef = parts[parts.length - 2] || '';
      if (suffixe.length <= 4 && !isNaN(suffixe)) {
        return `CMD-${suffixe}`;
      }
      return `${prefixeRef}-${suffixe}`.toUpperCase();
    }
    return numeroBrut;
  };

  useEffect(() => {
    const preferenceAudio = localStorage.getItem('4ts_audio_active');
    if (preferenceAudio !== null) {
      setAudioActive(preferenceAudio === 'true');
    }

    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(async (registration) => {
        try {
          const sub = await registration.pushManager.getSubscription();
          if (sub && Notification.permission === 'granted') {
            setPushActif(true);
          } else {
            setPushActif(false);
          }
        } catch (e) {
          setPushActif(false);
        }
      }).catch(() => {});
    }
  }, []);

  const urlBase64ToUint8Array = (base64String) => {
    try {
      const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      return outputArray;
    } catch (e) {
      console.error("Erreur conversion VAPID key :", e);
      return null;
    }
  };

  // Intercepte le clic sur le bouton Push pour ouvrir la modale de confirmation
  const demanderBasculementPush = () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setModalMessageInfo({
        visible: true,
        titre: 'Non supporté',
        texte: "Les notifications Push ne sont pas supportées par ce navigateur.",
        type: 'erreur'
      });
      return;
    }
    setModalPush({ visible: true, actionVoulue: !pushActif });
  };

  const executerBasculementPush = async () => {
    const activer = modalPush.actionVoulue;
    setModalPush({ visible: false, actionVoulue: false });

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription().catch(() => null);

      if (!activer && subscription) {
        await subscription.unsubscribe();
        setPushActif(false);
        setModalMessageInfo({
          visible: true,
          titre: 'Notifications Désactivées',
          texte: "🔕 Les notifications push ont été désactivées avec succès.",
          type: 'succes'
        });
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushActif(false);
        setModalMessageInfo({
          visible: true,
          titre: 'Permission Refusée',
          texte: "Permission de notification refusée. Veuillez l'autoriser dans les paramètres du téléphone.",
          type: 'erreur'
        });
        return;
      }

      const publicVapidKey = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'; 
      const convertedKey = urlBase64ToUint8Array(publicVapidKey);

      if (!convertedKey) {
        setModalMessageInfo({ visible: true, titre: 'Erreur', texte: "Erreur : La clé VAPID est invalide.", type: 'erreur' });
        return;
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });

      const subJson = subscription.toJSON();

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          id_entreprise: entrepriseId,
          endpoint: subJson.endpoint,
          p256dh: subJson.keys?.p256dh || '',
          auth: subJson.keys?.auth || ''
        }, { onConflict: 'endpoint' });

      if (error) throw error;
      setPushActif(true);
      setModalMessageInfo({
        visible: true,
        titre: 'Notifications Activées',
        texte: "🔔 Notifications push activées ! Votre téléphone est configuré pour sonner même en veille.",
        type: 'succes'
      });
    } catch (err) {
      console.error("Erreur détaillée push :", err);
      setPushActif(false);
      setModalMessageInfo({ visible: true, titre: 'Erreur Push', texte: err.message || "Erreur inconnue", type: 'erreur' });
    }
  };

  const traiterFileDAbsolue = async () => {
    if (enTrainDeJouerAudio.current || fileDAbsolueAudio.current.length === 0 || !audioActive) {
      return;
    }

    enTrainDeJouerAudio.current = true;
    const tacheCourante = fileDAbsolueAudio.current.shift();

    try {
      if (tacheCourante.type === 'ALERTE_SONORE') {
        await executerSonFort();
      } else if (tacheCourante.type === 'ANNONCE_VOCALE') {
        await executerVoix(tacheCourante.texte);
      }
    } catch (e) {
      console.log("Erreur lecture audio :", e);
    } finally {
      setTimeout(() => {
        enTrainDeJouerAudio.current = false;
        if (fileDAbsolueAudio.current.length > 0) {
          traiterFileDAbsolue();
        }
      }, 4500);
    }
  };

  const ajouterFichierAudioUnique = (type, texte = '') => {
    if (!audioActive) return;
    fileDAbsolueAudio.current.push({ type, texte });
    traiterFileDAbsolue();
  };

  const executerSonFort = () => {
    return new Promise(async (resolve) => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const audioCtx = new AudioContext();
        
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }
        
        const dureeTotaleMs = 1500;
        [0, 0.4, 0.8].forEach((delay) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(880, audioCtx.currentTime + delay);
          
          gain.gain.setValueAtTime(0.8, audioCtx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + delay + 0.25);
          
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          
          osc.start(audioCtx.currentTime + delay);
          osc.stop(audioCtx.currentTime + delay + 0.25);
        });

        setTimeout(resolve, dureeTotaleMs);
      } catch (e) {
        resolve();
      }
    });
  };

  const executerVoix = (texte) => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.resume();
          
          const utterance = new SpeechSynthesisUtterance(texte);
          utterance.lang = 'fr-FR';
          utterance.rate = 0.90;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;
          
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();

          window.speechSynthesis.speak(utterance);
        } catch (e) {
          resolve();
        }
      } else {
        resolve();
      }
    });
  };

  // Intercepte le clic sur le bouton Son pour ouvrir la modale de confirmation
  const demanderBasculementAudio = () => {
    setModalAudio({ visible: true, actionVoulue: !audioActive });
  };

  const executerBasculementAudio = async () => {
    const nouvelEtat = modalAudio.actionVoulue;
    setModalAudio({ visible: false, actionVoulue: false });

    setAudioActive(nouvelEtat);
    localStorage.setItem('4ts_audio_active', nouvelEtat);

    if (nouvelEtat) {
      fileDAbsolueAudio.current = [];
      await executerSonFort();
      executerVoix("Système audio activé.");
    } else {
      fileDAbsolueAudio.current = [];
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    }
  };

  const declencherVibration = () => {
    if (!audioActive) return;
    if (typeof window !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([500, 200, 500, 200, 800]);
      } catch (e) {}
    }
  };

  const afficherNotificationNATIVE = (titre, corps) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        navigator.serviceWorker.ready.then(registration => {
          registration.showNotification(titre, {
            body: corps,
            icon: '/icon.png',
            badge: '/icon.png',
            vibrate: [500, 200, 500],
            tag: 'nouvelle-commande-qr',
            renotify: true,
            requireInteraction: true
          });
        });
      } catch (e) {
        new Notification(titre, { body: corps });
      }
    }
  };

  const notifierNouvelleCommande = (cmd) => {
    const nomClientPropre = (cmd.nom_client || 'Client').replace(/[^a-zA-ZÀ-ÿ0-9 ]/g, ' ');
    const numeroElegant = formaterNumeroElegant(cmd.numero_commande);
    const messageVocal = `Attention ! Nouvelle commande, ${numeroElegant}. Pour le client, ${nomClientPropre}. Table, ${cmd.numero_table || 'non spécifiée'}.`;
    
    afficherNotificationNATIVE(`🚨 Nouvelle Commande : ${numeroElegant}`, `Client : ${cmd.nom_client} | Table : ${cmd.numero_table}`);

    if (audioActive) {
      declencherVibration();
      ajouterFichierAudioUnique('ALERTE_SONORE');
      ajouterFichierAudioUnique('ANNONCE_VOCALE', messageVocal);
    }
  };

  const chargerCommandesQR = async () => {
    try {
      const { data, error } = await supabase
        .from('commandes_clients_qr')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const liste = data || [];
      
      if (idsCommandesConnues.current.size === 0) {
        liste.forEach(c => idsCommandesConnues.current.add(c.id));
      }

      setCommandes(liste);
    } catch (err) {
      console.error('Erreur chargement commandes :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    if (!entrepriseId) return;

    chargerCommandesQR();

    const nomCanal = `commandes-realtime-${entrepriseId}`;

    supabase.getChannels().forEach((c) => {
      if (c.topic.includes(nomCanal)) {
        supabase.removeChannel(c);
      }
    });

    const canalRealtime = supabase
      .channel(nomCanal)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commandes_clients_qr',
          filter: `id_entreprise=eq.${entrepriseId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const nouvelleCmd = payload.new;
            if (!idsCommandesConnues.current.has(nouvelleCmd.id)) {
              idsCommandesConnues.current.add(nouvelleCmd.id);
              setCommandes((prev) => [nouvelleCmd, ...prev]);
              notifierNouvelleCommande(nouvelleCmd);
            }
          } else if (payload.eventType === 'UPDATE' || payload.eventType === 'DELETE') {
            chargerCommandesQR();
          }
        }
      )
      .subscribe();

    const intervalSecours = setInterval(async () => {
      try {
        const { data } = await supabase
          .from('commandes_clients_qr')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .order('created_at', { ascending: false });

        if (data) {
          data.forEach(cmd => {
            if (!idsCommandesConnues.current.has(cmd.id)) {
              const diffMs = new Date() - new Date(cmd.created_at);
              if (diffMs < 120000) {
                idsCommandesConnues.current.add(cmd.id);
                setCommandes((prev) => [cmd, ...prev]);
                notifierNouvelleCommande(cmd);
              } else {
                idsCommandesConnues.current.add(cmd.id);
              }
            }
          });
        }
      } catch (e) {}
    }, 4000);

    return () => {
      supabase.removeChannel(canalRealtime);
      clearInterval(intervalSecours);
    };
  }, [entrepriseId, audioActive]);

  const executerChangementStatutServi = async (idCommande) => {
    try {
      const { data, error } = await supabase.rpc('valider_et_destockage_commande_qr', {
        p_id_commande: idCommande,
        p_id_entreprise: entrepriseId
      });

      if (error) throw error;
      if (data && !data.success) {
        setModalMessageInfo({ visible: true, titre: 'Erreur', texte: "Erreur de déstockage : " + data.message, type: 'erreur' });
        return;
      }

      chargerCommandesQR();
    } catch (err) {
      setModalMessageInfo({ visible: true, titre: 'Erreur', texte: 'Erreur lors de la mise à jour du statut : ' + err.message, type: 'erreur' });
    }
  };

  const changerStatutCommande = async (idCommande, nouveauStatut, statutPaiement) => {
    if (nouveauStatut === 'SERVI' && statutPaiement !== 'PAYE') {
      setModalConfirmation({
        visible: true,
        idCommande: idCommande,
        statutPaiement: statutPaiement
      });
      return;
    }

    try {
      if (nouveauStatut === 'SERVI') {
        await executerChangementStatutServi(idCommande);
      } else {
        const { error } = await supabase
          .from('commandes_clients_qr')
          .update({ statut: nouveauStatut })
          .eq('id', idCommande)
          .eq('id_entreprise', entrepriseId);

        if (error) throw error;
      }

      chargerCommandesQR();
    } catch (err) {
      setModalMessageInfo({ visible: true, titre: 'Erreur', texte: 'Erreur lors de la mise à jour du statut : ' + err.message, type: 'erreur' });
    }
  };

  const confirmerActionImpaye = async () => {
    const idCmd = modalConfirmation.idCommande;
    setModalConfirmation({ visible: false, idCommande: null, statutPaiement: null });
    if (idCmd) {
      await executerChangementStatutServi(idCmd);
    }
  };

  const fermerModalConfirmation = () => {
    setModalConfirmation({ visible: false, idCommande: null, statutPaiement: null });
  };

  const demanderBasculementPaiement = (idCommande, statutActuel, montantTotalCommande, numeroCmd) => {
    setModalPaiement({
      visible: true,
      idCommande,
      statutActuel,
      montantTotal: montantTotalCommande,
      numeroCmd
    });
  };

  const fermerModalPaiement = () => {
    setModalPaiement({
      visible: false,
      idCommande: null,
      statutActuel: null,
      montantTotal: 0,
      numeroCmd: null
    });
  };

  const confirmerBasculementPaiement = async () => {
    const { idCommande, statutActuel, montantTotal, numeroCmd } = modalPaiement;
    fermerModalPaiement();

    const nouveauStatutPaiement = statutActuel === 'PAYE' ? 'NON_PAYE' : 'PAYE';
    try {
      const { error } = await supabase
        .from('commandes_clients_qr')
        .update({ statut_paiement: nouveauStatutPaiement })
        .eq('id', idCommande);

      if (error) throw error;

      const nouveauMontantRegle = nouveauStatutPaiement === 'PAYE' ? Number(montantTotal || 0) : 0;
      const nouveauMontantCredit = nouveauStatutPaiement === 'PAYE' ? 0 : Number(montantTotal || 0);
      const nouveauTypeReglement = nouveauStatutPaiement === 'PAYE' ? 'COMPTANT' : 'CREDIT';

      await supabase
        .from('ventes_historiques')
        .update({
          montant_regle: nouveauMontantRegle,
          montant_credit: nouveauMontantCredit,
          type_reglement: nouveauTypeReglement
        })
        .eq('id_entreprise', entrepriseId)
        .eq('numero_ticket', numeroCmd);

      chargerCommandesQR();
    } catch (err) {
      setModalMessageInfo({ visible: true, titre: 'Erreur', texte: 'Erreur lors de la mise à jour du paiement : ' + err.message, type: 'erreur' });
    }
  };

  const commandesFiltrees = Array.from(
    new Map(
      commandes
        .filter(cmd => {
          if (filtreStatut !== 'TOUT' && cmd.statut !== filtreStatut) {
            return false;
          }

          if (filtreDate !== 'TOUTES' && cmd.created_at) {
            const dateCmd = new Date(cmd.created_at).toDateString();
            const aujourdhui = new Date().toDateString();
            
            const hierDate = new Date();
            hierDate.setDate(hierDate.getDate() - 1);
            const hier = hierDate.toDateString();

            if (filtreDate === 'AUJOURDHUI' && dateCmd !== aujourdhui) return false;
            if (filtreDate === 'HIER' && dateCmd !== hier) return false;
          }

          return true;
        })
        .map(cmd => [cmd.id, cmd])
    ).values()
  );

  return (
    <div className="space-y-2 font-sans text-xs max-w-4xl mx-auto p-1 pb-16 relative">
      <div className="bg-white p-2 rounded-xl border border-orange-200 shadow-2xs flex flex-col gap-2">
        <div className="flex justify-between items-center gap-1">
          <div>
            <h2 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${audioActive ? 'bg-emerald-600 animate-pulse' : 'bg-red-500'} inline-block`}></span>
              Commandes Clients
            </h2>
            <p className="text-[9px] text-slate-500 font-bold">Temps Réel Instantané & Déstockage auto</p>
          </div>
          
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={demanderBasculementPush}
              title={pushActif ? "Push Veille : Actif (Cliquer pour désactiver)" : "Push Veille : Inactif (Cliquer pour activer)"}
              className={`p-1.5 rounded-lg text-xs font-black transition shadow-xs flex items-center justify-center relative cursor-pointer ${
                pushActif 
                  ? 'bg-slate-900 text-amber-400 ring-2 ring-amber-400/60' 
                  : 'bg-slate-800 text-white hover:bg-slate-700'
              }`}
            >
              🔔
              <span className={`absolute -bottom-0.5 -right-0.5 text-[7px] px-1 rounded font-extrabold ${pushActif ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'}`}>
                {pushActif ? 'ON' : 'OFF'}
              </span>
            </button>

            <button
              type="button"
              onClick={demanderBasculementAudio}
              title={audioActive ? "Audio : Actif (Cliquer pour couper)" : "Audio : Coupé (Cliquer pour activer)"}
              className={`p-1.5 rounded-lg text-xs font-black transition shadow-xs flex items-center justify-center relative cursor-pointer ${
                audioActive 
                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-400/60' 
                  : 'bg-slate-300 text-slate-700 hover:bg-slate-400'
              }`}
            >
              {audioActive ? '🔊' : '🔇'}
              <span className={`absolute -bottom-0.5 -right-0.5 text-[7px] px-1 rounded font-extrabold ${audioActive ? 'bg-white text-emerald-700' : 'bg-red-600 text-white'}`}>
                {audioActive ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1 bg-orange-50/80 p-1 rounded-lg border border-orange-100">
          {['TOUT', 'EN_ATTENTE', 'EN_COURS', 'SERVI', 'ANNULE'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFiltreStatut(st)}
              className={`py-1 px-1 rounded-md font-black text-[8px] uppercase transition text-center truncate ${
                filtreStatut === st ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-700 hover:bg-orange-100'
              }`}
            >
              {st === 'TOUT' ? 'Toutes' : st === 'ANNULE' ? 'Annulées ❌' : st.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          {[
            { id: 'AUJOURDHUI', label: '📅 Aujourd\'hui' },
            { id: 'HIER', label: '🗓️ Hier' },
            { id: 'TOUTES', label: '📂 Toutes' }
          ].map((dt) => (
            <button
              key={dt.id}
              type="button"
              onClick={() => setFiltreDate(dt.id)}
              className={`py-1 px-1 rounded-md font-black text-[8px] uppercase transition text-center truncate ${
                filtreDate === dt.id ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-700 hover:bg-slate-200'
              }`}
            >
              {dt.label}
            </button>
          ))}
        </div>
      </div>

      {chargement ? (
        <div className="bg-white p-6 text-center text-slate-400 font-bold rounded-xl border">Chargement...</div>
      ) : commandesFiltrees.length === 0 ? (
        <div className="bg-white p-6 text-center text-slate-400 font-bold rounded-xl border italic text-[11px]">Aucune commande trouvée pour cette période.</div>
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
            if (cmd.statut === 'ANNULE') badgeColor = 'bg-red-100 text-red-800 border-red-300';

            const estPaye = cmd.statut_paiement === 'PAYE';
            const estAnnule = cmd.statut === 'ANNULE';
            const estServiImpaye = cmd.statut === 'SERVI' && !estPaye;

            const numeroAffichage = formaterNumeroElegant(cmd.numero_commande);

            return (
              <div 
                key={cmd.id} 
                className={`bg-white rounded-xl border p-2.5 shadow-2xs space-y-2 flex flex-col justify-between transition ${
                  estAnnule ? 'border-red-300 bg-red-50/10 opacity-75' : estServiImpaye ? 'border-red-500 ring-2 ring-red-400/50 bg-red-50/20' : 'border-slate-200'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-1">
                    <div>
                      <span 
                        title={`Référence technique : ${cmd.numero_commande}`} 
                        className="font-mono font-black text-orange-600 text-xs block cursor-help tracking-wide bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100 inline-block"
                      >
                        🏷️ {numeroAffichage}
                      </span>
                      <span className="text-[8px] text-slate-400 font-bold block mt-0.5">
                        {new Date(cmd.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(cmd.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full font-black text-[8px] border uppercase ${badgeColor}`}>
                      {cmd.statut === 'ANNULE' ? 'ANNULÉ ❌' : cmd.statut?.replace('_', ' ')}
                    </span>
                  </div>

                  {estAnnule && (
                    <div className="bg-red-600 text-white p-1 rounded-lg text-center font-black text-[9px] uppercase tracking-wider">
                      ⚠️ CETTE COMMANDE A ÉTÉ ANNULÉE PAR LE CLIENT
                    </div>
                  )}

                  {estServiImpaye && !estAnnule && (
                    <div className="bg-red-500 text-white p-1.5 rounded-lg text-center font-black text-[9px] uppercase tracking-wider animate-bounce">
                      🚨 ALERTE : COMMANDE SERVIE MAIS NON PAYÉE !
                    </div>
                  )}

                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="font-black text-slate-900 uppercase text-[10px]">👤 {cmd.nom_client}</p>
                      <p className="font-bold text-slate-600 text-[9px]">
                        📞{' '}
                        {cmd.telephone_client ? (
                          <a 
                            href={`tel:${cmd.telephone_client.replace(/[^0-9+]/g, '')}`} 
                            className="text-blue-600 hover:underline font-mono"
                          >
                            {cmd.telephone_client}
                          </a>
                        ) : (
                          'N/A'
                        )}{' '}
                        | 💳 {cmd.mode_paiement || 'ESPECES'}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <span className="bg-orange-100 text-orange-800 font-black px-2 py-0.5 rounded-md text-[9px] block">
                        Table : {cmd.numero_table || 'N/A'}
                      </span>
                      <button
                        type="button"
                        disabled={estAnnule}
                        onClick={() => demanderBasculementPaiement(cmd.id, cmd.statut_paiement, cmd.montant_total, cmd.numero_commande)}
                        className={`px-2 py-0.5 rounded-md font-black text-[8px] uppercase border transition cursor-pointer ${
                          estPaye 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200' 
                            : 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
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

                  {estAnnule ? (
                    <div className="text-center py-1 bg-red-50 border border-red-200 rounded-lg">
                      <span className="font-black text-[8px] text-red-700 uppercase tracking-wide">
                        🔒 Commande Annulée & Verrouillée ❌
                      </span>
                    </div>
                  ) : cmd.statut === 'SERVI' ? (
                    <div className="text-center py-1 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <span className="font-black text-[8px] text-emerald-700 uppercase tracking-wide">
                        🔒 Servie & Verrouillée ✅
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 pt-0.5">
                      {cmd.statut !== 'EN_COURS' && (
                        <button
                          type="button"
                          onClick={() => changerStatutCommande(cmd.id, 'EN_COURS', cmd.statut_paiement)}
                          className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-black py-1 rounded text-[8px] uppercase transition shadow-2xs"
                        >
                          En cours 🍳
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => changerStatutCommande(cmd.id, 'SERVI', cmd.statut_paiement)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-1 rounded text-[8px] uppercase transition shadow-2xs"
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

      {/* MODALE DE CONFIRMATION POUR LE SON (AUDIO) */}
      {modalAudio.visible && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-orange-200 max-w-sm w-full p-4 space-y-3 transform transition-all scale-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 font-black shadow-inner ${
                modalAudio.actionVoulue ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {modalAudio.actionVoulue ? '🔊' : '🔇'}
              </div>
              <div>
                <h3 className="font-black text-slate-900 uppercase text-xs">Gestion du Son & Voix</h3>
                <p className="text-[10px] text-slate-500 font-bold">Alertes sonores et vocales</p>
              </div>
            </div>

            <div className={`border rounded-xl p-3 space-y-1 ${
              modalAudio.actionVoulue ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
            }`}>
              <p className={`font-black text-xs ${modalAudio.actionVoulue ? 'text-emerald-800' : 'text-red-800'}`}>
                {modalAudio.actionVoulue ? "Voulez-vous vraiment réactiver le son ?" : "Voulez-vous vraiment couper le son ?"}
              </p>
              <p className="text-slate-700 text-[11px] font-medium leading-relaxed">
                {modalAudio.actionVoulue 
                  ? "Les alertes sonores et annonces vocales des nouvelles commandes seront de nouveau émises."
                  : "Vous ne recevrez plus d'annonces vocales ni de bips sonores lors de l'arrivée de nouvelles commandes."}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModalAudio({ visible: false, actionVoulue: false })}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-2.5 rounded-xl uppercase text-[10px] transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={executerBasculementAudio}
                className={`flex-1 font-black py-2.5 rounded-xl uppercase text-[10px] shadow-lg transition cursor-pointer text-white ${
                  modalAudio.actionVoulue 
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30' 
                    : 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
                }`}
              >
                {modalAudio.actionVoulue ? 'Oui, activer 🔊' : 'Oui, couper 🔇'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE CONFIRMATION POUR LES NOTIFICATIONS PUSH */}
      {modalPush.visible && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-orange-200 max-w-sm w-full p-4 space-y-3 transform transition-all scale-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 font-black shadow-inner ${
                modalPush.actionVoulue ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'
              }`}>
                🔔
              </div>
              <div>
                <h3 className="font-black text-slate-900 uppercase text-xs">Notifications Push en Veille</h3>
                <p className="text-[10px] text-slate-500 font-bold">Service Worker & Background</p>
              </div>
            </div>

            <div className={`border rounded-xl p-3 space-y-1 ${
              modalPush.actionVoulue ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'
            }`}>
              <p className={`font-black text-xs ${modalPush.actionVoulue ? 'text-amber-800' : 'text-slate-800'}`}>
                {modalPush.actionVoulue ? "Voulez-vous vraiment activer les notifications push ?" : "Voulez-vous vraiment désactiver les notifications push ?"}
              </p>
              <p className="text-slate-700 text-[11px] font-medium leading-relaxed">
                {modalPush.actionVoulue 
                  ? "Votre appareil pourra recevoir des alertes même lorsque l'application est en arrière-plan ou en veille."
                  : "Vous ne recevrez plus de notifications push en arrière-plan."}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setModalPush({ visible: false, actionVoulue: false })}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-2.5 rounded-xl uppercase text-[10px] transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={executerBasculementPush}
                className="flex-1 font-black py-2.5 rounded-xl uppercase text-[10px] shadow-lg transition cursor-pointer text-white bg-slate-900 hover:bg-slate-800 shadow-slate-900/30"
              >
                {modalPush.actionVoulue ? 'Oui, activer 🔔' : 'Oui, désactiver 🔕'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE MESSAGE D'INFORMATION / ERREUR / SUCCÈS GÉNÉRALE */}
      {modalMessageInfo.visible && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-orange-200 max-w-sm w-full p-4 space-y-3 transform transition-all scale-100 text-center">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto text-2xl font-black shadow-sm ${
              modalMessageInfo.type === 'succes' ? 'bg-emerald-100 text-emerald-600' : modalMessageInfo.type === 'erreur' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
            }`}>
              {modalMessageInfo.type === 'succes' ? '✅' : modalMessageInfo.type === 'erreur' ? '❌' : 'ℹ️'}
            </div>
            
            <div className="space-y-1">
              <h3 className="font-black text-slate-900 uppercase text-xs">{modalMessageInfo.titre}</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">{modalMessageInfo.texte}</p>
            </div>

            <button
              type="button"
              onClick={() => setModalMessageInfo({ visible: false, titre: '', texte: '', type: 'info' })}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-2.5 rounded-xl uppercase text-[10px] shadow-md transition cursor-pointer"
            >
              Compris 👍
            </button>
          </div>
        </div>
      )}

      {/* MODALE DE CONFIRMATION POUR COMMANDE SERVIE NON PAYÉE */}
      {modalConfirmation.visible && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-orange-200 max-w-sm w-full p-4 space-y-3 transform transition-all scale-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-xl shrink-0 font-black shadow-inner">
                ⚠️
              </div>
              <div>
                <h3 className="font-black text-slate-900 uppercase text-xs">Alerte Paiement</h3>
                <p className="text-[10px] text-slate-500 font-bold">Vérification de sécurité caisse</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
              <p className="text-red-800 font-black text-xs">
                Cette commande n'a pas encore été payée !
              </p>
              <p className="text-slate-700 text-[11px] font-medium leading-relaxed">
                Voulez-vous vraiment la marquer comme <strong className="text-emerald-700 uppercase">SERVIE</strong> et l'enregistrer dans l'historique des ventes ?
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={fermerModalConfirmation}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-2.5 rounded-xl uppercase text-[10px] transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmerActionImpaye}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-2.5 rounded-xl uppercase text-[10px] shadow-lg shadow-red-600/30 transition cursor-pointer"
              >
                Confirmer & Servir ✅
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE CONFIRMATION POUR LE BASCULEMENT DU STATUT DE PAIEMENT */}
      {modalPaiement.visible && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-orange-200 max-w-sm w-full p-4 space-y-3 transform transition-all scale-100">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 font-black shadow-inner ${
                modalPaiement.statutActuel === 'PAYE' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {modalPaiement.statutActuel === 'PAYE' ? '🔄' : '💳'}
              </div>
              <div>
                <h3 className="font-black text-slate-900 uppercase text-xs">Confirmation Paiement</h3>
                <p className="text-[10px] text-slate-500 font-bold">Modification du statut financier</p>
              </div>
            </div>

            <div className={`border rounded-xl p-3 space-y-1 ${
              modalPaiement.statutActuel === 'PAYE' ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'
            }`}>
              <p className={`font-black text-xs ${modalPaiement.statutActuel === 'PAYE' ? 'text-amber-800' : 'text-emerald-800'}`}>
                {modalPaiement.statutActuel === 'PAYE' 
                  ? "Passer cette commande de PAYÉ à NON PAYÉ ?" 
                  : "Valider le paiement effectif de cette commande ?"}
              </p>
              <p className="text-slate-700 text-[11px] font-medium leading-relaxed">
                {modalPaiement.statutActuel === 'PAYE' 
                  ? "Cette action va retirer le montant des règlements comptant et le basculer en crédit/impayé dans l'historique."
                  : "Le client a-t-il réellement payé ? Cette action va valider le règlement complet dans le journal des ventes."}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={fermerModalPaiement}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-2.5 rounded-xl uppercase text-[10px] transition cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmerBasculementPaiement}
                className={`flex-1 font-black py-2.5 rounded-xl uppercase text-[10px] shadow-lg transition cursor-pointer text-white ${
                  modalPaiement.statutActuel === 'PAYE' 
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30' 
                    : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                }`}
              >
                {modalPaiement.statutActuel === 'PAYE' ? 'Mettre en Non Payé 🔴' : 'Confirmer Payé 🟢'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}