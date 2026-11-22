'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function usePermissions(entrepriseId, utilisateurConnecte, emailConnecte, moduleCourant) {
  const [permissionsUser, setPermissionsUser] = useState(() => {
    if (typeof window === 'undefined') return { _aucun_acces: true };
    try {
      const sessionPerms = localStorage.getItem('permissions_utilisateur');
      if (sessionPerms) return JSON.parse(sessionPerms);
    } catch (e) {}
    const email = String(emailConnecte || '').trim().toLowerCase();
    if (email === 'stephs7352@gmail.com') return { _plein_acces: true };
    return { _aucun_acces: true };
  });

  // Synchronisation temps réel des permissions pour éviter les caches obsolètes
  useEffect(() => {
    if (!emailConnecte && !utilisateurConnecte) return;

    async function rafraichirPermissionsLive() {
      try {
        const { data: userRecord } = await supabase
          .from('utilisateurs')
          .select('permissions, id_role')
          .eq('id_entreprise', entrepriseId)
          .or(`email.eq.${emailConnecte},nom_complet.eq.${utilisateurConnecte}`)
          .maybeSingle();

        if (userRecord) {
          let permsFinales = userRecord.permissions;
          
          // Si les permissions directes sont vides, on va chercher le rôle associé en direct
          if ((!permsFinales || Object.keys(permsFinales).length === 0) && userRecord.id_role) {
            const { data: roleData } = await supabase
              .from('roles')
              .select('permissions, nom_role')
              .eq('id', userRecord.id_role)
              .maybeSingle();

            if (roleData) {
              const nomRoleUpper = (roleData.nom_role || '').trim().toUpperCase();
              permsFinales = nomRoleUpper === 'ADMINISTRATEUR' ? { _plein_acces: true } : (roleData.permissions || { _aucun_acces: true });
            }
          }

          if (permsFinales) {
            setPermissionsUser(permsFinales);
            localStorage.setItem('permissions_utilisateur', JSON.stringify(permsFinales));
          }
        }
      } catch (err) {
        console.error("Erreur rafraîchissement permissions live:", err);
      }
    }

    rafraichirPermissionsLive();
  }, [entrepriseId, utilisateurConnecte, emailConnecte]);

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
      'roles': 'roles_utilisateurs', 'utilisateurs': 'roles_utilisateurs', 'roles_utilisateurs': 'roles_utilisateurs',
      'gestion_tables': 'gestion_tables'
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
    chargementPermissions: false, 
    verifierPermission, 
    verifierCreation, 
    verifierModification, 
    verifierSuppression
  };
}