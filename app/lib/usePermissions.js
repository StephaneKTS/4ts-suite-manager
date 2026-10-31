'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { localSync } from './localSync';

export function usePermissions(entrepriseId, utilisateurConnecte, emailConnecte, moduleCourant) {
  // Clé de cache simplifiée et robuste (basée sur l'entreprise et le module pour éviter les ratés de nom)
  const cleCachePerms = `permissions_v2_${entrepriseId}_${moduleCourant}`;
  
  const cacheInitial = typeof window !== 'undefined' ? localSync.recupererDonneesLocales(cleCachePerms) : null;

  const [permissionsUser, setPermissionsUser] = useState(cacheInitial);
  const [chargementPermissions, setChargementPermissions] = useState(!cacheInitial);

  useEffect(() => {
    async function fetchRolesAndPermissions() {
      if (!entrepriseId) return;

      try {
        // 1. Récupérer la liste des utilisateurs de l'entreprise
        const { data: usersList, error: errUsers } = await supabase
          .from('utilisateurs')
          .select('*')
          .eq('id_entreprise', entrepriseId);

        if (errUsers) throw errUsers;

        let utilisateurTrouve = null;
        if (usersList && usersList.length > 0) {
          utilisateurTrouve = usersList.find(u => {
            const nomCompletBase = `${u.nom_complet || u.nom || ''} ${u.prenom || ''}`.trim().toLowerCase();
            const nomRecherche = (utilisateurConnecte || '').toLowerCase();
            const matchNom = nomRecherche && (nomCompletBase.includes(nomRecherche) || nomRecherche.includes(nomCompletBase));
            const matchEmail = emailConnecte && u.email && u.email.toLowerCase() === emailConnecte.toLowerCase();
            return matchNom || matchEmail;
          });
        }

        let matrixPermissions = null;

        // 2. RÈGLE STRICTE (SaaS Multi-tenant) : 
        // Si l'utilisateur est rattaché à un rôle, le rôle prime à 100%. On ne se base jamais sur des permissions directes obsolètes.
        if (utilisateurTrouve && utilisateurTrouve.id_role) {
          const { data: roleData, error: errRole } = await supabase
            .from('roles')
            .select('permissions')
            .eq('id', utilisateurTrouve.id_role)
            .maybeSingle();

          if (!errRole && roleData && roleData.permissions) {
            matrixPermissions = roleData.permissions;
          } else {
            // Sécurité par défaut : si le rôle n'a pas de permissions valides, aucun accès accordé par erreur
            matrixPermissions = { _aucun_acces: true };
          }
        } 
        // Si et seulement si AUCUN rôle n'est assigné, on bascule sur d'éventuelles permissions directes individuelles
        else if (utilisateurTrouve && utilisateurTrouve.permissions) {
          matrixPermissions = utilisateurTrouve.permissions;
        }

        // 3. Super Admin par défaut si l'email correspond
        if (!matrixPermissions && emailConnecte && emailConnecte.toLowerCase().trim() === 'stephs7352@gmail.com') {
          matrixPermissions = { _plein_acces: true };
        }

        // Si aucun accès trouvé mais qu'on a déjà un cache initial, on le garde pour éviter le scintillement
        if (!matrixPermissions && !cacheInitial) {
          matrixPermissions = { _aucun_acces: true };
        }

        if (matrixPermissions) {
          setPermissionsUser(matrixPermissions);
          localSync.sauvegarderDonneesLocales(cleCachePerms, matrixPermissions);
        }
      } catch (err) {
        console.error("Erreur lors de la récupération des permissions :", err);
      } finally {
        setChargementPermissions(false);
      }
    }

    fetchRolesAndPermissions();
  }, [entrepriseId, utilisateurConnecte, emailConnecte, moduleCourant]);

  const trouverPermissionModule = (perms, moduleId) => {
    if (!perms) return null;
    if (perms._plein_acces) return { lecture: true, creation: true, modification: true, suppression: true };
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

    const cleNettoyee = (moduleId || '').toLowerCase().trim();
    const cleMappe = equivalents[cleNettoyee] || cleNettoyee;

    if (perms[cleMappe]) return perms[cleMappe];

    const cleNormalisee = cleMappe.replace(/[-_\s]/g, '');
    const cleTrouvee = Object.keys(perms).find(k => k.toLowerCase().replace(/[-_\s]/g, '') === cleNormalisee);
    
    return cleTrouvee ? perms[cleTrouvee] : null;
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