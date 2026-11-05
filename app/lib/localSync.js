// utilitaire pour la gestion du cache local et du mode hors-ligne (4TS Suite Manager)

const PREFIXE_CACHE = '4ts_local_cache_';

export const localSync = {
  // 1. Lire des données en priorité depuis le stockage local (Ultra-rapide)
  recupererDonneesLocales: (nomTable) => {
    if (typeof window === 'undefined') return [];
    try {
      const donnees = localStorage.getItem(PREFIXE_CACHE + nomTable);
      return donnees ? JSON.parse(donnees) : [];
    } catch (e) {
      console.error('Erreur lecture cache local pour ' + nomTable, e);
      return [];
    }
  },

  // 2. Enregistrer des données en local instantanément
  sauvegarderDonneesLocales: (nomTable, data) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(PREFIXE_CACHE + nomTable, JSON.stringify(data));
    } catch (e) {
      console.error('Erreur écriture cache local pour ' + nomTable, e);
    }
  },

  // 3. Ajouter une file d'attente pour les actions faites hors-ligne (pour les envoyer plus tard à Supabase)
  ajouterFileAttente: (action, table, payload) => {
    if (typeof window === 'undefined') return;
    try {
      const queue = JSON.parse(localStorage.getItem('4ts_offline_queue') || '[]');
      queue.push({ action, table, payload, timestamp: Date.now() });
      localStorage.setItem('4ts_offline_queue', JSON.stringify(queue));
    } catch (e) {
      console.error('Erreur file d\'attente hors-ligne', e);
    }
  },

  // 4. Synchroniser la file d'attente avec Supabase quand Internet revient
  synchroniserVersCloud: async (supabaseClient) => {
    if (typeof window === 'undefined' || !navigator.onLine) return;
    try {
      const queue = JSON.parse(localStorage.getItem('4ts_offline_queue') || '[]');
      if (queue.length === 0) return;

      console.log('🔄 Synchronisation des données hors-ligne vers Supabase...');

      const nouvelleQueue = [];

      for (const item of queue) {
        const { table, action, payload } = item;
        
        let error = null;

        // Fonction de nettoyage approfondi des IDs temporaires (local_ ou temp_)
        const nettoyerPayload = (obj) => {
          if (!obj || typeof obj !== 'object') return obj;
          const propre = { ...obj };
          
          Object.keys(propre).forEach(key => {
            const val = propre[key];
            // Si une valeur commence par local_ ou temp_ (ex: id_commande ou id), on la supprime 
            // pour éviter les erreurs de type UUID invalide dans Supabase
            if (val && (String(val).startsWith('local_') || String(val).startsWith('temp_'))) {
              if (key === 'id') {
                delete propre[key]; // Laisse Supabase générer un nouvel ID distant
              } else {
                // Pour les clés étrangères temporaires (ex: id_commande), on peut mettre null ou supprimer
                delete propre[key];
              }
            }
          });
          return propre;
        };

        if (action === 'DELETE') {
          if (payload.id && (String(payload.id).startsWith('local_') || String(payload.id).startsWith('temp_'))) {
            continue; // Ignore les suppressions d'éléments purement locaux
          }
          const payloadPropre = nettoyerPayload(payload);
          const res = await supabaseClient.from(table).delete().match(payloadPropre);
          error = res.error;
        } else {
          let payloadFinal;
          if (Array.isArray(payload)) {
            payloadFinal = payload.map(itemTab => nettoyerPayload(itemTab));
          } else {
            payloadFinal = nettoyerPayload(payload);
          }

          const res = await supabaseClient.from(table).upsert(payloadFinal);
          error = res.error;
        }

        if (error) {
          console.error(`Erreur sync table ${table}:`, error.message);
          nouvelleQueue.push(item);
        }
      }

      if (nouvelleQueue.length > 0) {
        localStorage.setItem('4ts_offline_queue', JSON.stringify(nouvelleQueue));
      } else {
        localStorage.removeItem('4ts_offline_queue');
        console.log('✅ Synchronisation cloud réussie !');
      }
    } catch (e) {
      console.error('Erreur lors de la synchronisation globale :', e);
    }
  }
};