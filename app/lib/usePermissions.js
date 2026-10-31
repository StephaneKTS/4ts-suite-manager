'use client';

export function usePermissions(entrepriseId, utilisateurConnecte, emailConnecte, moduleCourant) {
  // Récupération instantanée des permissions stockées dans la session lors de la connexion
  const obtenirPermissionsSession = () => {
    if (typeof window === 'undefined') return { _aucun_acces: true };
    try {
      const sessionPerms = localStorage.getItem('permissions_utilisateur');
      if (sessionPerms) {
        return JSON.parse(sessionPerms);
      }
    } catch (e) {
      console.error("Erreur lecture session permissions", e);
    }
    
    // Par défaut si non connecté ou session vide : aucun accès (ou plein accès si Super Admin)
    const email = String(emailConnecte || '').trim().toLowerCase();
    if (email === 'stephs7352@gmail.com') {
      return { _plein_acces: true };
    }
    return { _aucun_acces: true };
  };

  const permissionsUser = obtenirPermissionsSession();
  const chargementPermissions = false; // Plus aucun chargement bloquant en attente

  const trouverPermissionModule = (perms, moduleId) => {
    if (!perms) return { lecture: false, creation: false, modification: false, suppression: false };
    if (perms._plein_acces) return { lecture: true, creation: true, modification: true, suppression: true };
    if (perms._aucun_acces) return { lecture: false, creation: false, modification: false, suppression: false };
    if (perms[moduleId]) return perms[moduleId];

    const equivalents = {
      'articles': 'articles_stock', 'stock': 'articles_stock', 'articles_stock': 'articles_stock',
      'depots': 'depots_stock', 'depots_stock': 'depots_stock',
      'emplacements': 'emplacements_stock', 'emplacements_stock': 'emplacements_stock',
      'familles': 'familles_articles', 'familles_articles': 'familles_articles',
      'mouvements': 'mouvements_stock', 'mouvements_stock': 'mouvements_stock',
      'caisse': 'caisse', 'caisses': 'caisses', 'ventes': 'caisse', 'ventes_historiques': 'caisse',
      'clients': 'clients', 'categories_clients': 'categories_clients', 'fournisseurs': 'fournisseurs',
      'approvisionnements': 'approvisionnements', 'commandes_livraison': 'commandes_livraison',
      'commandes_livraison_en_tete': 'commandes_livraison', 'grille_tarifaire': 'grille_tarifaire',
      'grille_tarifaire_livraison': 'grille_tarifaire', 'challenges_commerciaux': 'challenges_commerciaux',
      'plan_comptable': 'plan_comptable', 'journal': 'plan_comptable',
      'roles': 'roles_utilisateurs', 'utilisateurs': 'roles_utilisateurs', 'roles_utilisateurs': 'roles_utilisateurs'
    };

    const cleNettoyee = String(moduleId || '').toLowerCase().trim();
    const cleMappe = equivalents[cleNettoyee] || cleNettoyee;

    if (perms[cleMappe]) return perms[cleMappe];

    const cleNormalisee = cleMappe.replace(/[-_\s]/g, '');
    const cleTrouvee = Object.keys(perms).find(k => k.toLowerCase().replace(/[-_\s]/g, '') === cleNormalisee);
    
    return cleTrouvee ? perms[cleTrouvee] : { lecture: false, creation: false, modification: false, suppression: false };
  };

  const verifierPermission = (moduleId, estSuperAdmin = false) => {
    if (estSuperAdmin) return true;
    if (!permissionsUser) return false; 
    const permModule = trouverPermissionModule(permissionsUser, moduleId);
    return permModule ? permModule.lecture === true : false;
  };

  const verifierCreation = (moduleId, estSuperAdmin = false) => {
    if (estSuperAdmin) return true;
    if (!permissionsUser) return false;
    const permModule = trouverPermissionModule(permissionsUser, moduleId);
    return permModule ? permModule.creation === true : false;
  };

  const verifierModification = (moduleId, estSuperAdmin = false) => {
    if (estSuperAdmin) return true;
    if (!permissionsUser) return false;
    const permModule = trouverPermissionModule(permissionsUser, moduleId);
    return permModule ? permModule.modification === true : false;
  };

  const verifierSuppression = (moduleId, estSuperAdmin = false) => {
    if (estSuperAdmin) return true;
    if (!permissionsUser) return false;
    const permModule = trouverPermissionModule(permissionsUser, moduleId);
    return permModule ? permModule.suppression === true : false;
  };

  return { 
    permissionsUser, 
    chargementPermissions, 
    verifierPermission, 
    verifierCreation, 
    verifierModification, 
    verifierSuppression
  };
}