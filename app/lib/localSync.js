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
      console.error('Erreur file dote hors-ligne', e);
    }
  },

  // 4. Synchroniser la file d'attente avec Supabase quand Internet revient
  synchroniserVersCloud: async (supabaseClient) => {
    if (typeof window === 'undefined' || !navigator.onLine) return;
    try {
      const queue = JSON.parse(localStorage.getItem('4ts_offline_queue') || '[]');
      if (queue.length === 0) return;

      console.log('🔄 Synchronisation des données hors-ligne vers Supabase...');

      for (const item of queue) {
        const { table, payload } = item;
        // On pousse les données vers Supabase en arrière-plan
        const { error } = await supabaseClient.from(table).upsert(payload);
        if (error) {
          console.error(`Erreur sync table ${table}:`, error.message);
          return; // On arrête et on réessaiera plus tard
        }
      }

      // Si tout est réussi, on vide la file d'attente
      localStorage.removeItem('4ts_offline_queue');
      console.log('✅ Synchronisation cloud réussie !');
    } catch (e) {
      console.error('Erreur lors de la synchronisation globale :', e);
    }
  }
};