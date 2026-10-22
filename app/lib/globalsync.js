import { supabase } from './supabase';

// Clés pour le stockage local du navigateur
const QUEUE_KEY = '4ts_offline_mutation_queue';

/**
 * Gestionnaire global, résilient et 100% hors-ligne pour la suite 4TS.
 * Assure la continuité totale pour les livreurs et commerçants sur le terrain avec alertes visuelles.
 */
export const globalSync = {
  /**
   * Récupère des données avec secours automatique sur le cache local en cas de coupure
   */
  async select(tableName, filters = {}) {
    const entrepriseId = typeof window !== 'undefined' ? localStorage.getItem('entrepriseId') || '4TS-TEST' : '4TS-TEST';
    const moduleActif = typeof window !== 'undefined' ? (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase() : 'BOUTIQUE';
    
    const cacheKey = `4ts_cache_${tableName}_${entrepriseId}_${moduleActif}`;

    try {
      let query = supabase.from(tableName).select('*');

      if (tableName !== 'entreprises') {
        query = query.eq('id_entreprise', entrepriseId);
        if (tableName === 'articles_stock') {
          query = query.eq('ID_Entreprise', entrepriseId).eq('module', moduleActif);
        } else {
          query = query.eq('module', moduleActif);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      // Mise à jour du cache local frais
      if (typeof window !== 'undefined' && data) {
        localStorage.setItem(cacheKey, JSON.stringify(data));
      }

      return { data: data || [], error: null, horsLigne: false };
    } catch (err) {
      console.warn(`⚠️ Mode hors-ligne actif pour [${tableName}]. Utilisation des données locales.`);
      
      // Récupération du cache si la connexion échoue
      if (typeof window !== 'undefined') {
        const cachedData = localStorage.getItem(cacheKey);
        if (cachedData) {
          return { data: JSON.parse(cachedData), error: null, horsLigne: true };
        }
      }

      return { data: [], error: err, horsLigne: true };
    }
  },

  /**
   * Insère des données avec notification visuelle en cas de mode hors-ligne
   */
  async insert(tableName, payload) {
    const entrepriseId = typeof window !== 'undefined' ? localStorage.getItem('entrepriseId') || '4TS-TEST' : '4TS-TEST';
    const moduleActif = typeof window !== 'undefined' ? (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase() : 'BOUTIQUE';

    const enrichedPayload = {
      ...payload,
      id_entreprise: entrepriseId,
      module: moduleActif
    };

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (!isOnline) {
      globalSync.sauvegarderFileAttente(tableName, enrichedPayload);
      
      // 📱 Alerte visuelle pour l'utilisateur sur le terrain
      alert('📱 Mode hors-ligne détecté :\nVotre action a été enregistrée en toute sécurité sur votre appareil. Elle sera automatiquement synchronisée dès le retour d’Internet.');

      return { 
        data: null, 
        error: null, 
        success: true, 
        horsLigne: true, 
        message: 'Enregistré en local (Mode hors-ligne).' 
      };
    }

    try {
      const { data, error } = await supabase.from(tableName).insert([enrichedPayload]);
      if (error) throw error;
      return { data, error: null, success: true, horsLigne: false };
    } catch (err) {
      console.warn(`⚠️ Échec réseau lors de l'insertion dans [${tableName}]. Bascule en file d'attente locale.`);
      
      globalSync.sauvegarderFileAttente(tableName, enrichedPayload);

      // 📱 Alerte visuelle en cas de coupure soudaine pendant l'envoi
      alert('⚠️ Connexion instable :\nLa liaison avec le serveur a été interrompue. Vos données ont été mises en sécurité sur votre appareil et seront envoyées dès que possible.');

      return { 
        data: null, 
        error: err, 
        success: true, 
        horsLigne: true, 
        message: 'Donnée mise en sécurité locale.' 
      };
    }
  },

  /**
   * Stocke l'action dans le localStorage en attendant le retour d'Internet
   */
  sauvegarderFileAttente(tableName, payload) {
    if (typeof window === 'undefined') return;
    try {
      const existingQueue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      existingQueue.push({ tableName, payload, timestamp: Date.now() });
      localStorage.setItem(QUEUE_KEY, JSON.stringify(existingQueue));
    } catch (e) {
      console.error("Erreur sauvegarde file d'attente hors-ligne :", e);
    }
  },

  /**
   * Synchronise automatiquement les actions en attente et notifie l'utilisateur
   */
  async synchroniserFileAttente() {
    if (typeof window === 'undefined' || !navigator.onLine) return;

    try {
      const queue = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
      if (queue.length === 0) return;

      console.log(`🔄 Connexion rétablie : Synchronisation de ${queue.length} action(s) en attente...`);

      let resteDansLaQueue = [];

      for (const item of queue) {
        try {
          const { error } = await supabase.from(item.tableName).insert([item.payload]);
          if (error) {
            resteDansLaQueue.push(item);
          }
        } catch (err) {
          resteDansLaQueue.push(item);
        }
      }

      localStorage.setItem(QUEUE_KEY, JSON.stringify(resteDansLaQueue));

      if (resteDansLaQueue.length === 0 && queue.length > 0) {
        // ✨ Notification de succès de synchronisation au retour du réseau
        alert('🌐 Connexion rétablie !\nToutes vos données enregistrées hors-ligne ont été synchronisées avec succès sur le serveur.');
      }
    } catch (e) {
      console.error("Erreur lors de la synchronisation de la file d'attente :", e);
    }
  }
};

// Écouteur global automatique du réseau
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    globalSync.synchroniserFileAttente();
  });
}