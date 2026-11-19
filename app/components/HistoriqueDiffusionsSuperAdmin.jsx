'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function HistoriqueDiffusionsSuperAdmin({ isDarkMode = false }) {
  const [historique, setHistorique] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [notificationSelectionnee, setNotificationSelectionnee] = useState(null);
  
  // États de sélection multiple par cases à cocher
  const [idsSelectionnes, setIdsSelectionnes] = useState([]);

  // États d'édition dans la modale
  const [titreEditable, setTitreEditable] = useState('');
  const [messageEditable, setMessageEditable] = useState('');

  // États pour la modale de confirmation, rediffusion, suppression et résultat
  const [notificationARenvoyer, setNotificationARenvoyer] = useState(null);
  const [confirmationSuppressionMultiple, setConfirmationSuppressionMultiple] = useState(false);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [modalMessage, setModalMessage] = useState({ ouverte: false, titre: '', texte: '', type: 'succes' });

  useEffect(() => {
    chargerHistoriqueDiffusions();
  }, []);

  const chargerHistoriqueDiffusions = async () => {
    setChargement(true);
    try {
      const { data, error } = await supabase
        .from('notifications_globales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistorique(data || []);
      setIdsSelectionnes([]);
    } catch (err) {
      console.error("Erreur lors du chargement de l'historique :", err);
    } finally {
      setChargement(false);
    }
  };

  const toggleSelection = (id) => {
    if (idsSelectionnes.includes(id)) {
      setIdsSelectionnes(idsSelectionnes.filter(item => item !== id));
    } else {
      setIdsSelectionnes([...idsSelectionnes, id]);
    }
  };

  const toutCocher = () => {
    if (idsSelectionnes.length === historique.length) {
      setIdsSelectionnes([]);
    } else {
      setIdsSelectionnes(historique.map(n => n.id));
    }
  };

  const ouvrirDetails = (notif) => {
    setNotificationSelectionnee(notif);
    setTitreEditable(notif.titre || '');
    setMessageEditable(notif.message || '');
  };

  const executerRediffusion = async () => {
    const notifCible = notificationARenvoyer || notificationSelectionnee;
    if (!notifCible) return;

    if (!titreEditable.trim() || !messageEditable.trim()) {
      setModalMessage({
        ouverte: true,
        titre: "Champs requis",
        texte: "Le titre et le message ne peuvent pas être vides.",
        type: 'erreur'
      });
      return;
    }

    setEnvoiEnCours(true);

    try {
      const { error } = await supabase
        .from('notifications_globales')
        .insert([{
          titre: titreEditable.trim(),
          message: messageEditable.trim(),
          module_cible: notifCible.module_cible,
          auteur: 'Super Administrateur 4TS (Rediffusion modifiée)',
          created_at: new Date()
        }]);

      if (error) throw error;

      setModalMessage({
        ouverte: true,
        titre: "Rediffusion réussie 🚀",
        texte: `La notification modifiée a été rediffusée avec succès aux modules : [${notifCible.module_cible}] !`,
        type: 'succes'
      });

      setNotificationARenvoyer(null);
      setNotificationSelectionnee(null);
      chargerHistoriqueDiffusions();
    } catch (err) {
      console.error("Erreur rediffusion :", err);
      setModalMessage({
        ouverte: true,
        titre: "Erreur",
        texte: "Impossible de rediffuser la notification : " + err.message,
        type: 'erreur'
      });
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const executerSuppressionMultiple = async () => {
    if (idsSelectionnes.length === 0) return;
    setEnvoiEnCours(true);

    try {
      // Suppression effective via Supabase avec vérification d'erreur stricte
      const { error } = await supabase
        .from('notifications_globales')
        .delete()
        .in('id', idsSelectionnes);

      if (error) throw error;

      setModalMessage({
        ouverte: true,
        titre: "Suppression réussie 🗑️",
        texte: `${idsSelectionnes.length} notification(s) ont été supprimées avec succès de la base de données.`,
        type: 'succes'
      });

      setConfirmationSuppressionMultiple(false);
      setNotificationSelectionnee(null);
      setIdsSelectionnes([]);
      chargerHistoriqueDiffusions();
    } catch (err) {
      console.error("Erreur suppression multiple :", err);
      setModalMessage({
        ouverte: true,
        titre: "Erreur de suppression (RLS)",
        texte: "Supabase a bloqué la suppression : " + err.message + "\n\n💡 Assurez-vous d'avoir exécuté la politique DELETE dans l'éditeur SQL Supabase.",
        type: 'erreur'
      });
    } finally {
      setEnvoiEnCours(false);
    }
  };

  const cardBg = isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-900';
  const titleColor = isDarkMode ? 'text-slate-200' : 'text-[#0d2347]';
  const subTitleColor = isDarkMode ? 'text-slate-400' : 'text-slate-600';
  const secondaryBtnBg = isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700' : 'bg-slate-200 hover:bg-slate-300 text-[#0d2347] font-bold border border-slate-300';
  const itemBg = isDarkMode ? 'bg-slate-950 border-slate-800 hover:border-slate-600' : 'bg-slate-50 border-slate-200 hover:border-[#0d2347]';
  const inputBg = isDarkMode ? 'bg-slate-950 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-300 font-bold';
  const btnBg = isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-[#0d2347] hover:bg-[#133265] text-white';

  return (
    <div className={`p-4 rounded-2xl border shadow-sm space-y-4 font-sans text-xs ${cardBg}`}>
      <div className="border-b pb-2 flex flex-wrap items-center justify-between gap-2 border-slate-300/40">
        <h3 className={`font-extrabold uppercase flex items-center gap-1.5 ${titleColor}`}>
          <span>📜</span> Historique des Diffusions Globales ({historique.length})
        </h3>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setConfirmationSuppressionMultiple(true)}
            disabled={idsSelectionnes.length === 0}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition flex items-center gap-1 shadow-xs ${
              idsSelectionnes.length > 0
                ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer'
                : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-50'
            }`}
          >
            <span>🗑️</span> Supprimer la sélection ({idsSelectionnes.length})
          </button>

          <button
            type="button"
            onClick={chargerHistoriqueDiffusions}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer ${secondaryBtnBg}`}
          >
            🔄 Actualiser
          </button>
        </div>
      </div>

      {historique.length > 0 && (
        <div className="flex items-center justify-between px-2 pt-1">
          <label className="flex items-center space-x-2 cursor-pointer font-bold uppercase text-[10px] text-slate-500">
            <input
              type="checkbox"
              checked={idsSelectionnes.length === historique.length && historique.length > 0}
              onChange={toutCocher}
              className="w-4 h-4 rounded accent-[#0d2347] cursor-pointer"
            />
            <span>Tout cocher ({idsSelectionnes.length}/{historique.length})</span>
          </label>
        </div>
      )}

      {chargement ? (
        <div className={`py-8 text-center font-bold ${subTitleColor}`}>Chargement de l'historique...</div>
      ) : historique.length === 0 ? (
        <div className={`py-8 text-center font-bold ${subTitleColor}`}>Aucune notification diffusée pour le moment.</div>
      ) : (
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {historique.map((notif) => {
            const estCoche = idsSelectionnes.includes(notif.id);
            return (
              <div
                key={notif.id}
                className={`p-3 rounded-xl border transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                  estCoche 
                    ? (isDarkMode ? 'bg-slate-800/80 border-cyan-500' : 'bg-[#0d2347]/5 border-[#0d2347]/50') 
                    : itemBg
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={estCoche}
                    onChange={() => toggleSelection(notif.id)}
                    className="w-4 h-4 rounded accent-[#0d2347] cursor-pointer shrink-0"
                  />
                  <div 
                    onClick={() => ouvrirDetails(notif)}
                    className="space-y-1 flex-1 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[9px] text-slate-400">
                        {new Date(notif.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className={`text-[8.5px] px-2 py-0.5 rounded font-black uppercase ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-[#0d2347]/10 text-[#0d2347]'}`}>
                        Cible : {notif.module_cible}
                      </span>
                    </div>
                    <h4 className={`font-black text-xs uppercase ${titleColor}`}>
                      {notif.titre}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setTitreEditable(notif.titre || '');
                      setMessageEditable(notif.message || '');
                      setNotificationARenvoyer(notif);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-2.5 py-1.5 rounded-lg text-[10px] uppercase transition cursor-pointer shadow-xs flex items-center gap-1"
                    title="Renvoyer cette notification"
                  >
                    <span>🔄</span> Renvoyer
                  </button>
                  <button
                    type="button"
                    onClick={() => ouvrirDetails(notif)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer ${secondaryBtnBg}`}
                  >
                    Détails ➔
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🖥️ MODALE DE DÉTAILS ET MODIFICATION DIRECTE */}
      {notificationSelectionnee && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border p-6 space-y-4 max-h-[90vh] overflow-y-auto ${cardBg}`}>
            <div className="flex justify-between items-center border-b pb-3 border-slate-300/40">
              <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full ${isDarkMode ? 'bg-slate-800 text-cyan-400' : 'bg-[#0d2347]/10 text-[#0d2347]'}`}>
                Modules : {notificationSelectionnee.module_cible}
              </span>
              <button
                type="button"
                onClick={() => setNotificationSelectionnee(null)}
                className={`font-bold px-3 py-1 rounded-lg text-xs cursor-pointer ${secondaryBtnBg}`}
              >
                Fermer ✕
              </button>
            </div>

            <div className="space-y-3">
              <span className="font-mono text-[10px] text-slate-400 block">
                Diffusé initialement le : {new Date(notificationSelectionnee.created_at).toLocaleString('fr-FR')} par {notificationSelectionnee.auteur || 'Super Admin'}
              </span>
              
              <div className="space-y-1">
                <label className={`block font-bold uppercase text-[9px] ${subTitleColor}`}>
                  Titre de l'annonce (Modifiable)
                </label>
                <input
                  type="text"
                  value={titreEditable}
                  onChange={(e) => setTitreEditable(e.target.value)}
                  className={`w-full border rounded-xl p-2.5 text-xs font-black uppercase ${inputBg}`}
                />
              </div>

              <div className="space-y-1">
                <label className={`block font-bold uppercase text-[9px] ${subTitleColor}`}>
                  Message détaillé (Modifiable)
                </label>
                <textarea
                  rows={4}
                  value={messageEditable}
                  onChange={(e) => setMessageEditable(e.target.value)}
                  className={`w-full border rounded-xl p-2.5 text-xs font-medium leading-relaxed ${inputBg}`}
                />
              </div>
            </div>

            <div className="pt-2 flex flex-wrap justify-between gap-2">
              <button
                type="button"
                onClick={() => setNotificationARenvoyer(notificationSelectionnee)}
                disabled={envoiEnCours}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded-xl font-black text-xs uppercase cursor-pointer shadow-md transition flex items-center justify-center gap-1.5"
              >
                <span>🔄</span> Renvoyer modifiée 🚀
              </button>
              <button
                type="button"
                onClick={() => {
                  setIdsSelectionnes([notificationSelectionnee.id]);
                  setConfirmationSuppressionMultiple(true);
                }}
                disabled={envoiEnCours}
                className="bg-rose-600 hover:bg-rose-500 text-white py-3 px-4 rounded-xl font-black text-xs uppercase cursor-pointer shadow-md transition flex items-center justify-center gap-1.5"
              >
                <span>🗑️</span> Supprimer
              </button>
              <button
                type="button"
                onClick={() => setNotificationSelectionnee(null)}
                className={`py-3 px-4 rounded-xl font-black text-xs uppercase cursor-pointer ${secondaryBtnBg}`}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔄 MODALE DE CONFIRMATION DE REDIFFUSION */}
      {notificationARenvoyer && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-sm rounded-2xl p-5 space-y-4 text-center shadow-2xl border ${cardBg}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl font-black ${isDarkMode ? 'bg-slate-800 text-emerald-400' : 'bg-emerald-500/20 text-emerald-600'}`}>
              🔄
            </div>
            <div className="space-y-1.5">
              <h4 className={`font-black text-sm uppercase tracking-wider ${titleColor}`}>
                Confirmer la rediffusion
              </h4>
              <p className={`text-[11px] font-semibold leading-relaxed ${subTitleColor}`}>
                Voulez-vous lancer la diffusion de l'annonce modifiée <strong className="underline">"{titreEditable}"</strong> vers les modules : <strong className={titleColor}>[{notificationARenvoyer.module_cible}]</strong> ?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNotificationARenvoyer(null)}
                disabled={envoiEnCours}
                className={`py-2 px-3 rounded-xl font-black text-xs uppercase cursor-pointer ${secondaryBtnBg}`}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={executerRediffusion}
                disabled={envoiEnCours}
                className="py-2 px-3 rounded-xl font-black text-xs uppercase bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-md cursor-pointer"
              >
                {envoiEnCours ? 'Rediffusion...' : 'Oui, rediffuser 🚀'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🗑️ MODALE DE CONFIRMATION DE SUPPRESSION MULTIPLE */}
      {confirmationSuppressionMultiple && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`w-full max-w-sm rounded-2xl p-5 space-y-4 text-center shadow-2xl border ${cardBg}`}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl font-black bg-rose-500/20 text-rose-600">
              🗑️
            </div>
            <div className="space-y-1.5">
              <h4 className={`font-black text-sm uppercase tracking-wider ${titleColor}`}>
                Confirmer la suppression
              </h4>
              <p className={`text-[11px] font-semibold leading-relaxed ${subTitleColor}`}>
                Voulez-vous vraiment supprimer définitivement <strong className="underline">{idsSelectionnes.length} notification(s)</strong> sélectionnée(s) ? 
                <br /><span className="text-rose-500 font-bold mt-1 block">⚠️ Cela retirera instantanément ces notifications chez tous les utilisateurs.</span>
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmationSuppressionMultiple(false)}
                disabled={envoiEnCours}
                className={`py-2 px-3 rounded-xl font-black text-xs uppercase cursor-pointer ${secondaryBtnBg}`}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={executerSuppressionMultiple}
                disabled={envoiEnCours}
                className="py-2 px-3 rounded-xl font-black text-xs uppercase bg-rose-600 hover:bg-rose-500 text-white transition shadow-md cursor-pointer"
              >
                {envoiEnCours ? 'Suppression...' : 'Oui, supprimer 🗑️'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 MODALE DE RÉSULTAT */}
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