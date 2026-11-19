'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function WidgetNotificationsUtilisateur({ isDarkMode = false }) {
  const [notifications, setNotifications] = useState([]);
  const [notificationPleinEcran, setNotificationPleinEcran] = useState(null);
  const [modalHistoriqueOuverte, setModalHistoriqueOuverte] = useState(false);

  const moduleActifCourant = (typeof window !== 'undefined' ? (localStorage.getItem('module_actif') || 'BOUTIQUE') : 'BOUTIQUE').toUpperCase();
  const entrepriseIdEffectif = (typeof window !== 'undefined' ? (localStorage.getItem('entrepriseId') || localStorage.getItem('entreprise_id')) : '') || '4TS-TEST';

  useEffect(() => {
    chargerNotificationsSecurisees();
  }, [moduleActifCourant]);

  const chargerNotificationsSecurisees = async () => {
    try {
      // 1. Récupération de l'ensemble des notifications globales depuis Supabase
      const { data, error } = await supabase
        .from('notifications_globales')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // 2. Filtrage intelligent et robuste adapté à tous les formats enregistrés ("TOUS", "BOUTIQUE", "BOUTIQUE, LIVRAISON", etc.)
        const notifsPourCeModule = data.filter(notif => {
          const cible = (notif.module_cible || '').toUpperCase().trim();
          
          // Si la diffusion cible "TOUS" ou contient "TOUS LES MODULES"
          if (cible === 'TOUS' || cible.includes('TOUS')) return true;

          // Découpage des modules cibles séparés par des virgules
          const modulesCiblesList = cible.split(',').map(m => m.replace(/['"]+/g, '').trim());
          
          // Vérification si le module actif actuel fait partie des modules cibles
          return modulesCiblesList.includes(moduleActifCourant) || modulesCiblesList.some(m => m.includes(moduleActifCourant));
        });

        setNotifications(notifsPourCeModule);

        if (typeof window !== 'undefined') {
          localStorage.setItem(`cache_notifications_${entrepriseIdEffectif}`, JSON.stringify(notifsPourCeModule));
        }

        // 3. Gestion de l'affichage pop-up plein écran pour la dernière notification non lue
        if (notifsPourCeModule.length > 0) {
          const derniereNotifId = notifsPourCeModule[0].id;
          const idDejaVue = localStorage.getItem(`derniere_notif_vue_id_${entrepriseIdEffectif}`);

          if (String(idDejaVue) !== String(derniereNotifId)) {
            setNotificationPleinEcran(notifsPourCeModule[0]);
          }
        }
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.warn("⚠️ Mode hors-ligne détecté ou erreur réseau, chargement du cache local :", err);
      if (typeof window !== 'undefined') {
        const cacheLocal = localStorage.getItem(`cache_notifications_${entrepriseIdEffectif}`);
        if (cacheLocal) {
          const parsedCache = JSON.parse(cacheLocal);
          const notifsFiltreesCache = parsedCache.filter(notif => {
            const cible = (notif.module_cible || '').toUpperCase().trim();
            if (cible === 'TOUS' || cible.includes('TOUS')) return true;
            const modulesCiblesList = cible.split(',').map(m => m.replace(/['"]+/g, '').trim());
            return modulesCiblesList.includes(moduleActifCourant);
          });
          setNotifications(notifsFiltreesCache);
        }
      }
    }
  };

  const fermerPleinEcran = () => {
    if (notificationPleinEcran) {
      localStorage.setItem(`derniere_notif_vue_id_${entrepriseIdEffectif}`, notificationPleinEcran.id);
    }
    setNotificationPleinEcran(null);
  };

  // 🎨 Définition des couleurs selon la charte
  const containerBg = isDarkMode ? 'bg-[#0f1c3f] border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900';
  const primaryAccentText = isDarkMode ? 'text-slate-300' : 'text-[#0d2347]';
  const badgeBg = isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-[#0d2347]/10 text-[#0d2347] border-[#0d2347]/20';
  const buttonBg = isDarkMode ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-[#0d2347] hover:bg-[#133265] text-white';
  const bellButtonClass = isDarkMode 
    ? 'relative p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition flex items-center justify-center cursor-pointer border border-slate-700' 
    : 'relative p-2 rounded-xl bg-[#0d2347]/10 hover:bg-[#0d2347]/20 text-[#0d2347] font-bold transition flex items-center justify-center cursor-pointer border border-[#0d2347]/20';

  return (
    <>
      {/* 🔔 BOUTON CLOCHE DANS LE HEADER */}
      <button
        type="button"
        onClick={() => setModalHistoriqueOuverte(true)}
        className={bellButtonClass}
        title="Centre de notifications"
      >
        <span className="text-base">🔔</span>
        {notifications.length > 0 && (
          <span className={`absolute -top-1 -right-1 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs ${isDarkMode ? 'bg-slate-600' : 'bg-[#0d2347]'}`}>
            {notifications.length}
          </span>
        )}
      </button>

      {/* 🖥️ POP-UP PLEIN ÉCRAN AUTOMATIQUE */}
      {notificationPleinEcran && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`${containerBg} w-full max-w-lg rounded-3xl shadow-2xl border p-6 space-y-5 text-center relative overflow-hidden`}>
            
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto text-2xl font-black shadow-inner ${isDarkMode ? 'bg-slate-800 text-slate-300' : 'bg-[#0d2347]/10 text-[#0d2347]'}`}>
              📢
            </div>

            <div className="space-y-2">
              <span className={`font-black text-[9px] px-2.5 py-1 rounded-full uppercase border ${badgeBg}`}>
                Annonce officielle — [{notificationPleinEcran.module_cible}]
              </span>
              <h2 className={`text-lg font-black tracking-tight ${primaryAccentText}`}>
                {notificationPleinEcran.titre}
              </h2>
              <p className={`text-xs font-medium leading-relaxed px-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                {notificationPleinEcran.message}
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={fermerPleinEcran}
                className={`w-full font-black py-3 rounded-xl uppercase tracking-wider text-xs shadow-lg transition cursor-pointer ${buttonBg}`}
              >
                J'ai pris connaissance 👍
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 📜 HISTORIQUE DES NOTIFICATIONS UTILISATEUR */}
      {modalHistoriqueOuverte && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className={`${containerBg} w-full max-w-md rounded-2xl shadow-2xl border p-5 space-y-4 max-h-[85vh] flex flex-col`}>
            
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className={`font-black uppercase text-xs flex items-center gap-1.5 ${primaryAccentText}`}>
                <span>🔔</span> Historique des notifications ({notifications.length})
              </h3>
              <button
                type="button"
                onClick={() => setModalHistoriqueOuverte(false)}
                className="text-xs font-bold px-2.5 py-1 rounded bg-slate-700 text-white hover:bg-slate-600 cursor-pointer"
              >
                Fermer ✕
              </button>
            </div>

            <div className="space-y-3 overflow-y-auto flex-1 pr-1">
              {notifications.length === 0 ? (
                <p className="text-center text-slate-400 py-6 text-xs font-medium">Aucune notification disponible pour le module {moduleActifCourant}.</p>
              ) : (
                notifications.map((notif) => (
                  <div key={notif.id} className={`p-3 rounded-xl border space-y-1 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="flex justify-between items-center">
                      <span className={`font-black text-[10px] uppercase ${primaryAccentText}`}>{notif.titre}</span>
                      <span className="font-mono text-[8px] text-slate-400">
                        {new Date(notif.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={`text-[11px] font-medium leading-snug ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {notif.message}
                    </p>
                    <span className={`inline-block text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${badgeBg}`}>
                      Cible : {notif.module_cible}
                    </span>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}