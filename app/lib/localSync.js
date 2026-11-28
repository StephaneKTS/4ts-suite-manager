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

  // 3. Ajouter une file d'attente pour les actions faites hors-ligne (avec suivi des tentatives)
  ajouterFileAttente: (action, table, payload) => {
    if (typeof window === 'undefined') return;
    try {
      const queue = JSON.parse(localStorage.getItem('4ts_offline_queue') || '[]');
      queue.push({ action, table, payload, timestamp: Date.now(), retries: 0 });
      localStorage.setItem('4ts_offline_queue', JSON.stringify(queue));
    } catch (e) {
      console.error('Erreur file d\'attente hors-ligne', e);
    }
  },

  // 4. Synchroniser la file d'attente avec Supabase avec protection contre les boucles de timeout
  synchroniserVersCloud: async (supabaseClient) => {
    if (typeof window === 'undefined' || !navigator.onLine) return;
    try {
      const queue = JSON.parse(localStorage.getItem('4ts_offline_queue') || '[]');
      if (queue.length === 0) return;

      console.log('🔄 Synchronisation des données hors-ligne vers Supabase...');

      const nouvelleQueue = [];

      for (const item of queue) {
        const { table, action, payload } = item;
        const currentRetries = (item.retries || 0) + 1;
        
        let error = null;

        // Fonction de nettoyage approfondi des IDs temporaires (local_ ou temp_) et des champs obsolètes
        const nettoyerPayload = (obj) => {
          if (!obj || typeof obj !== 'object') return obj;
          const propre = { ...obj };
          
          // Supprime l'ancien champ prix_unitaire si présent sur mouvements_stock pour éviter l'erreur de cache
          if (table === 'mouvements_stock' && 'prix_unitaire' in propre) {
            delete propre.prix_unitaire;
          }

          Object.keys(propre).forEach(key => {
            const val = propre[key];
            if (val && (String(val).startsWith('local_') || String(val).startsWith('temp_'))) {
              if (key === 'id') {
                delete propre[key]; // Laisse Supabase générer un nouvel ID distant
              } else {
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
          const errMessage = error.message || '';

          // Vérification si l'erreur provient du verrouillage de date de la base de données
          const estErreurVerrouillage = errMessage.includes('VERROUILLAGE ACTIF') || 
            errMessage.includes('Modification interdite') || 
            errMessage.includes('Action interdite');

          // Vérification si l'erreur est liée à une colonne absente du cache de schéma (ex: schema cache)
          const estErreurSchema = errMessage.includes('schema cache') || 
            error.code === 'PGRST204';

          // Détection des erreurs de type Timeout ou Internal Server Error (500)
          const estErreurTimeout = errMessage.includes('timeout') || 
            errMessage.includes('canceling statement') || 
            error.code === '57014' || 
            error.code === '500';

          if (estErreurVerrouillage) {
            console.warn(`⚠️ Synchronisation rejetée (journée clôturée et verrouillée) sur la table ${table} :`, errMessage);
          } else if (estErreurSchema) {
            console.warn(`⚠️ Élément de synchronisation ignoré (colonne obsolète absente du schéma) sur ${table} :`, errMessage);
          } else if (estErreurTimeout && currentRetries >= 3) {
            console.error(`❌ Abandon de l'élément en échec (timeout persistant) sur ${table} après ${currentRetries} tentatives :`, errMessage);
            // On l'abandonne volontairement pour débloquer la file d'attente et stopper la boucle de charge
          } else {
            console.error(`Erreur sync table ${table} (tentative ${currentRetries}):`, errMessage);
            // On le remet en file d'attente uniquement si le quota de tentatives de timeout n'est pas atteint
            if (!estErreurTimeout || currentRetries < 3) {
              nouvelleQueue.push({ ...item, retries: currentRetries });
            }
          }
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