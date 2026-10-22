'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const LISTE_PAYS = [
  { code: 'cmr', indicatif: '+237', longueur: 9 },
  { code: 'fra', indicatif: '+33', longueur: 9 },
  { code: 'civ', indicatif: '+225', longueur: 10 },
  { code: 'sen', indicatif: '+221', longueur: 9 },
  { code: 'gab', indicatif: '+241', longueur: 7 },
  { code: 'cog', indicatif: '+242', longueur: 9 },
  { code: 'rdc', indicatif: '+243', longueur: 9 },
  { code: 'mli', indicatif: '+223', longueur: 8 },
  { code: 'bfa', indicatif: '+226', longueur: 8 },
  { code: 'tgo', indicatif: '+228', longueur: 8 },
  { code: 'ben', indicatif: '+229', longueur: 8 },
  { code: 'nga', indicatif: '+234', longueur: 10 },
  { code: 'mar', indicatif: '+212', longueur: 9 },
  { code: 'tun', indicatif: '+216', longueur: 8 },
  { code: 'dza', indicatif: '+213', longueur: 9 },
];

export default function GestionUtilisateurs({ entrepriseId = '4TS-TEST' }) {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [entrepriseInfo, setEntrepriseInfo] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [afficherForm, setAfficherForm] = useState(false);
  const [userEnEdition, setUserEnEdition] = useState(null);
  const [recherche, setRecherche] = useState('');

  const [triCol, setTriCol] = useState('nom_complet');
  const [triOrdre, setTriOrdre] = useState('asc');

  const modulesApp = [
    { id: 'caisse', nom: '🛒 Caisse & Vente' },
    { id: 'articles_stock', nom: '📦 Articles & Stock' },
    { id: 'depots_stock', nom: '🏢 Dépôts & Magasins' },
    { id: 'familles_articles', nom: '🏷️ Familles & Catégories' },
    { id: 'mouvements_stock', nom: '🔄 Mouvements Stock' },
    { id: 'approvisionnements', nom: '📥 Approvisionnements' },
    { id: 'clients', nom: '👥 Fichier Clients' },
    { id: 'categories_clients', nom: '🏷️ Catégories Clients' },
    { id: 'fournisseurs', nom: '🤝 Fournisseurs' },
    { id: 'caisses', nom: '💵 Gestion Caisses' },
    { id: 'ventes_historiques', nom: '📊 Historique Ventes & Rapports' },
  ];

  const initialiserPermissionsDefaut = () => {
    const perms = {};
    modulesApp.forEach((m) => {
      perms[m.id] = { lecture: false, creation: false, modification: false, suppression: false };
    });
    return perms;
  };

  const [nouveauUser, setNouveauUser] = useState({
    nom_complet: '',
    email: '',
    pays: 'cmr',
    telephone: '',
    mot_de_passe: '',
    id_role: '',
    statut: 'ACTIF',
    acces_application: true,
    permissions: initialiserPermissionsDefaut(),
  });

  // Récupération dynamique et robuste du module actif (Boutique, Livraison, Logistique, Tontine, etc.)
  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();

  const chargerDonnees = async () => {
    setChargement(true);
    try {
      const { data: dataEnt } = await supabase
        .from('entreprises')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .single();
      setEntrepriseInfo(dataEnt);

      const { data: dataRoles } = await supabase
        .from('roles')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setRoles(dataRoles || []);

      const { data: dataUsers, error } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUtilisateurs(dataUsers || []);
    } catch (err) {
      console.error('Erreur chargement utilisateurs :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, [entrepriseId, moduleActuel]);

  const togglePermission = (moduleId, action) => {
    setNouveauUser((prev) => {
      const permsModule = prev.permissions[moduleId] || { lecture: false, creation: false, modification: false, suppression: false };
      const nouvelleValeur = !permsModule[action];
      let majModule = { ...permsModule, [action]: nouvelleValeur };
      if ((action === 'creation' || action === 'modification' || action === 'suppression') && nouvelleValeur) {
        majModule.lecture = true;
      }
      return {
        ...prev,
        permissions: { ...prev.permissions, [moduleId]: majModule },
      };
    });
  };

  const accorderToutModule = (moduleId, toutAccorder) => {
    setNouveauUser((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleId]: { lecture: toutAccorder, creation: toutAccorder, modification: toutAccorder, suppression: toutAccorder },
      },
    }));
  };

  const gererSaisieTelephone = (e) => {
    const chiffres = e.target.value.replace(/[^0-9]/g, '');
    setNouveauUser({ ...nouveauUser, telephone: chiffres });
  };

  const getTelephoneComplet = () => {
    const paysObj = LISTE_PAYS.find(p => p.code === nouveauUser.pays) || LISTE_PAYS[0];
    return `${paysObj.indicatif}${nouveauUser.telephone || ''}`;
  };

  const obtenirNumWhatsapp = (tel) => (tel ? tel.replace(/[^0-9]/g, '') : '');

  const enregistrerUtilisateur = async (e) => {
    e.preventDefault();
    const paysObj = LISTE_PAYS.find(p => p.code === nouveauUser.pays) || LISTE_PAYS[0];
    const chiffresPur = (nouveauUser.telephone || '').replace(/[^0-9]/g, '');

    if (chiffresPur.length > 0 && chiffresPur.length !== paysObj.longueur) {
      alert(`⚠️ Numéro invalide pour ${paysObj.code}. Le numéro doit comporter exactement ${paysObj.longueur} chiffres.`);
      return;
    }

    if (nouveauUser.acces_application) {
      const nbActuelsAccesApp = utilisateurs.filter(u => u.acces_application && (!userEnEdition || u.id !== userEnEdition.id)).length;
      const limiteLicence = entrepriseInfo?.limite_utilisateurs || 5;
      if (nbActuelsAccesApp >= limiteLicence) {
        alert(`❌ Limite de licence atteinte (${limiteLicence} utilisateurs avec accès application maximum). Veuillez passer à une formule supérieure ou enregistrer ce collaborateur en tant qu'intervenant terrain sans accès application.`);
        return;
      }
    }

    const numeroComplet = chiffresPur ? `${paysObj.indicatif}${chiffresPur}` : '';

    try {
      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel, // Injection automatique du module actif
        nom_complet: nouveauUser.nom_complet,
        email: nouveauUser.email,
        pays: nouveauUser.pays,
        telephone: numeroComplet,
        mot_de_passe: nouveauUser.acces_application ? nouveauUser.mot_de_passe : null,
        id_role: nouveauUser.id_role || null,
        statut: nouveauUser.statut,
        acces_application: nouveauUser.acces_application,
        permissions: nouveauUser.acces_application ? nouveauUser.permissions : null,
      };

      if (userEnEdition) {
        const { error } = await supabase.from('utilisateurs').update(payload).eq('id', userEnEdition.id);
        if (error) throw error;
        alert(`Utilisateur mis à jour avec succès dans le module ${moduleActuel} !`);
      } else {
        const { error } = await supabase.from('utilisateurs').insert([payload]);
        if (error) throw error;
        alert(`Utilisateur créé avec succès dans le module ${moduleActuel} !`);
      }

      annulerForm();
      chargerDonnees();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const ouvrirEdition = (user) => {
    setUserEnEdition(user);
    let telLocal = user.telephone || '';
    const paysTrouve = LISTE_PAYS.find(p => user.telephone && user.telephone.startsWith(p.indicatif)) || LISTE_PAYS[0];
    if (user.telephone && user.telephone.startsWith(paysTrouve.indicatif)) {
      telLocal = user.telephone.replace(paysTrouve.indicatif, '');
    }

    setNouveauUser({
      nom_complet: user.nom_complet || '',
      email: user.email || '',
      pays: user.pays || paysTrouve.code,
      telephone: telLocal.replace(/[^0-9]/g, ''),
      mot_de_passe: user.mot_de_passe || '',
      id_role: user.id_role || '',
      statut: user.statut || 'ACTIF',
      acces_application: user.acces_application ?? true,
      permissions: { ...initialiserPermissionsDefaut(), ...(user.permissions || {}) },
    });
    setAfficherForm(true);
  };

  const annulerForm = () => {
    setUserEnEdition(null);
    setNouveauUser({
      nom_complet: '',
      email: '',
      pays: 'cmr',
      telephone: '',
      mot_de_passe: '',
      id_role: '',
      statut: 'ACTIF',
      acces_application: true,
      permissions: initialiserPermissionsDefaut(),
    });
    setAfficherForm(false);
  };

  const supprimerUtilisateur = async () => {
    if (!userEnEdition) return;

    try {
      const nomUserStr = String(userEnEdition.nom_complet || '').trim().toUpperCase();
      const idUserStr = String(userEnEdition.id);

      const [resMvts, resVentes, resAppro] = await Promise.all([
        supabase.from('mouvements_stock').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('ventes_historiques').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('approvisionnements').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel)
      ]);

      const mouvements = resMvts.data || [];
      const ventes = resVentes.data || [];
      const approvisionnements = resAppro.data || [];

      const operationsRattachees = [
        ...mouvements.filter(m => {
          const op = String(m.operateur || m.utilisateur || m.id_utilisateur || '').trim().toUpperCase();
          return op === nomUserStr || op === idUserStr;
        }),
        ...ventes.filter(v => {
          const op = String(v.operateur || v.utilisateur || v.id_utilisateur || '').trim().toUpperCase();
          return op === nomUserStr || op === idUserStr;
        }),
        ...approvisionnements.filter(a => {
          const op = String(a.operateur || a.utilisateur || a.id_utilisateur || '').trim().toUpperCase();
          return op === nomUserStr || op === idUserStr;
        })
      ];

      if (operationsRattachees.length > 0) {
        alert(`❌ SUPPRESSION BLOQUÉE : Cet utilisateur ("${userEnEdition.nom_complet}") a déjà effectué au moins une opération ou action enregistrée dans l'application (${operationsRattachees.length} trouvée(s)). Pour des raisons de traçabilité comptable et de stock, il est impossible de le supprimer.`);
        return;
      }

      if (!confirm(`Voulez-vous vraiment supprimer définitivement le collaborateur "${userEnEdition.nom_complet}" ?`)) return;

      const { error } = await supabase.from('utilisateurs').delete().eq('id', userEnEdition.id);
      if (error) throw error;

      alert('Collaborateur supprimé avec succès.');
      annulerForm();
      chargerDonnees();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const gererTri = (colonne) => {
    if (triCol === colonne) {
      setTriOrdre(triOrdre === 'asc' ? 'desc' : 'asc');
    } else {
      setTriCol(colonne);
      setTriOrdre('asc');
    }
  };

  const rendreFlecheTri = (colonne) => {
    if (triCol !== colonne) return <span className="text-slate-400 ml-1">↕</span>;
    return <span className="text-orange-600 ml-1 font-bold">{triOrdre === 'asc' ? '↑' : '↓'}</span>;
  };

  const nbLicencesUtilisees = utilisateurs.filter(u => u.acces_application).length;
  const limiteLicenceMax = entrepriseInfo?.limite_utilisateurs || 5;

  const usersFiltres = utilisateurs
    .filter((u) => {
      const nom = (u.nom_complet || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const query = recherche.toLowerCase();
      return nom.includes(query) || email.includes(query);
    })
    .sort((a, b) => {
      let valA = '';
      let valB = '';
      if (triCol === 'nom_complet') {
        valA = a.nom_complet || '';
        valB = b.nom_complet || '';
      } else if (triCol === 'role') {
        valA = roles.find((r) => String(r.id) === String(a.id_role))?.nom_role || '';
        valB = roles.find((r) => String(r.id) === String(b.id_role))?.nom_role || '';
      }
      if (valA < valB) return triOrdre === 'asc' ? -1 : 1;
      if (valA > valB) return triOrdre === 'asc' ? 1 : -1;
      return 0;
    });

  const paysActuelObj = LISTE_PAYS.find(p => p.code === nouveauUser.pays) || LISTE_PAYS[0];

  return (
    <div className="space-y-2.5 text-[11px] font-sans">
      
      {/* EN-TÊTE EXPLICITE DE LA TABLE */}
      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h3 className="font-extrabold text-slate-900 uppercase text-xs flex items-center gap-1.5">
            <span>👥</span> COMPTES & INTERVENANTS [{moduleActuel}]
          </h3>
          <p className="text-[9.5px] text-slate-600 font-bold mt-0.5">
            Licences app : <strong className={nbLicencesUtilisees > limiteLicenceMax ? 'text-red-600' : 'text-emerald-700'}>{nbLicencesUtilisees}</strong> / {limiteLicenceMax} utilisées
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (afficherForm) {
              annulerForm();
            } else {
              setNouveauUser({ nom_complet: '', email: '', pays: 'cmr', telephone: '', mot_de_passe: '', id_role: '', statut: 'ACTIF', acces_application: true, permissions: initialiserPermissionsDefaut() });
              setUserEnEdition(null);
              setAfficherForm(true);
            }
          }}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-2xs text-xs"
        >
          {afficherForm ? '✖' : 'Nouveau'}
        </button>
      </div>

      {/* BARRE DE NAVIGATION */}
      <div className="flex justify-start items-center gap-1.5">
        <button
          type="button"
          onClick={() => annulerForm()}
          className={`px-3 py-1.5 rounded-lg font-black text-[11px] transition whitespace-nowrap border shadow-2xs ${
            !afficherForm 
              ? 'bg-orange-600 text-white border-orange-600 shadow-xs' 
              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
          }`}
        >
          📋 Liste [{moduleActuel}] ({utilisateurs.length})
        </button>
      </div>

      {afficherForm && (
        <form onSubmit={enregistrerUtilisateur} className="bg-white border-2 border-orange-500/50 p-3 rounded-xl space-y-2.5 shadow-md max-h-[60vh] overflow-y-auto pr-2 pb-24">
          <div className="flex justify-between items-center border-b border-slate-200 pb-1">
            <h4 className="font-black text-orange-600 uppercase text-[11px]">
              {userEnEdition ? `✏️ Fiche du collaborateur (${moduleActuel})` : `➕ Nouveau collaborateur (${moduleActuel})`}
            </h4>
            <button type="button" onClick={annulerForm} className="text-slate-400 hover:text-slate-700 font-bold text-xs p-0.5">✖</button>
          </div>

          <div className="bg-amber-50/80 border border-amber-200 p-2.5 rounded-xl space-y-1 shadow-2xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={nouveauUser.acces_application}
                onChange={(e) => setNouveauUser({ ...nouveauUser, acces_application: e.target.checked })}
                className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
              />
              <span className="font-black text-amber-950 text-[11px]">
                Accès à l'application (Consomme une licence / Connexion active)
              </span>
            </label>
            <p className="text-[10px] text-amber-900 font-bold pl-6">
              {nouveauUser.acces_application 
                ? "✅ Cet utilisateur disposera d'un login/mot de passe et de permissions." 
                : "ℹ️ Mode Intervenant : Il sera uniquement listé pour l'affectation des données (livraisons, ventes), sans accès de connexion ni impact sur la licence."}
            </p>
          </div>

          <div>
            <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Nom Complet *</label>
            <input type="text" required value={nouveauUser.nom_complet} onChange={(e) => setNouveauUser({ ...nouveauUser, nom_complet: e.target.value })} placeholder="Ex: Jean MBOA" className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-slate-900 text-xs shadow-xs" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Rôle / Fonction *</label>
              <select required value={nouveauUser.id_role} onChange={(e) => setNouveauUser({ ...nouveauUser, id_role: e.target.value })} className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-orange-700 text-xs shadow-xs">
                <option value="">-- Rôle --</option>
                {roles.map((r) => (<option key={r.id} value={r.id}>{r.nom_role}</option>))}
              </select>
            </div>
            <div>
              <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Statut</label>
              <select value={nouveauUser.statut} onChange={(e) => setNouveauUser({ ...nouveauUser, statut: e.target.value })} className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-slate-900 text-xs shadow-xs">
                <option value="ACTIF">🟢 Actif</option>
                <option value="INACTIF">🔴 Inactif</option>
              </select>
            </div>
          </div>

          {nouveauUser.acces_application && (
            <div className="space-y-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Mot de Passe de Connexion *</label>
                <input type="password" required={nouveauUser.acces_application} value={nouveauUser.mot_de_passe} onChange={(e) => setNouveauUser({ ...nouveauUser, mot_de_passe: e.target.value })} placeholder="••••••••" className="w-full bg-white border border-slate-300 rounded p-1.5 font-mono font-extrabold text-slate-900 text-xs shadow-xs" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200">
            <div>
              <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Pays</label>
              <select value={nouveauUser.pays} onChange={(e) => setNouveauUser({ ...nouveauUser, pays: e.target.value })} className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-slate-900 text-[11px] shadow-xs">
                {LISTE_PAYS.map((p) => (<option key={p.code} value={p.code}>{p.code.toUpperCase()}</option>))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Téléphone ({paysActuelObj.longueur} chiffres)</label>
              <div className="flex items-center bg-white border border-slate-300 rounded overflow-hidden shadow-xs">
                <span className="bg-slate-100 px-2 py-1.5 text-[11px] font-black text-slate-800 border-r border-slate-300 shrink-0">{paysActuelObj.indicatif}</span>
                <input type="text" maxLength={paysActuelObj.longueur} value={nouveauUser.telephone} onChange={gererSaisieTelephone} placeholder="6XXXXXXXX" className="w-full p-1.5 font-mono text-[11px] font-extrabold text-slate-900 focus:outline-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Email</label>
            <input type="email" value={nouveauUser.email} onChange={(e) => setNouveauUser({ ...nouveauUser, email: e.target.value })} placeholder="collaborateur@keita.cm" className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-[11px] shadow-xs" />
          </div>

          {nouveauUser.acces_application && (
            <div className="pt-2 border-t border-slate-200 space-y-2">
              <h5 className="font-black text-slate-900 text-[10px] uppercase">🔐 Droits & Permissions par Module :</h5>
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 text-[10px] uppercase font-black">
                    <tr>
                      <th className="p-2">Module</th>
                      <th className="p-2 text-center">👁️</th>
                      <th className="p-2 text-center">➕</th>
                      <th className="p-2 text-center">✏️</th>
                      <th className="p-2 text-center">🗑️</th>
                      <th className="p-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[10px]">
                    {modulesApp.map((m) => {
                      const p = nouveauUser.permissions[m.id] || { lecture: false, creation: false, modification: false, suppression: false };
                      const estToutAccorde = p.lecture && p.creation && p.modification && p.suppression;
                      return (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="p-2 font-black text-slate-950">{m.nom}</td>
                          <td className="p-2 text-center"><input type="checkbox" checked={p.lecture} onChange={() => togglePermission(m.id, 'lecture')} className="w-4 h-4 accent-orange-600 rounded cursor-pointer" /></td>
                          <td className="p-2 text-center"><input type="checkbox" checked={p.creation} onChange={() => togglePermission(m.id, 'creation')} className="w-4 h-4 accent-emerald-600 rounded cursor-pointer" /></td>
                          <td className="p-2 text-center"><input type="checkbox" checked={p.modification} onChange={() => togglePermission(m.id, 'modification')} className="w-4 h-4 accent-blue-600 rounded cursor-pointer" /></td>
                          <td className="p-2 text-center"><input type="checkbox" checked={p.suppression} onChange={() => togglePermission(m.id, 'suppression')} className="w-4 h-4 accent-red-600 rounded cursor-pointer" /></td>
                          <td className="p-2 text-center">
                            <button type="button" onClick={() => accorderToutModule(m.id, !estToutAccorde)} className={`px-1.5 py-1 rounded text-[9px] font-black ${estToutAccorde ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                              {estToutAccorde ? 'Aucun' : 'Tous'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-slate-200 flex flex-wrap justify-between items-center gap-1.5">
            <div className="flex items-center gap-1 flex-wrap">
              {nouveauUser.telephone && nouveauUser.telephone.length === paysActuelObj.longueur && (
                <>
                  <a href={`tel:${getTelephoneComplet()}`} className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold px-2.5 py-1 rounded text-[9.5px]">📞 Appel</a>
                  <a href={`https://wa.me/${obtenirNumWhatsapp(getTelephoneComplet())}`} target="_blank" rel="noopener noreferrer" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold px-2.5 py-1 rounded text-[9.5px]">WhatsApp</a>
                </>
              )}
              {nouveauUser.email && (<a href={`mailto:${nouveauUser.email}`} className="bg-slate-100 text-slate-800 font-bold px-2.5 py-1 rounded text-[9.5px]">📧 Email</a>)}
            </div>
            <div className="flex items-center gap-1.5">
              {userEnEdition && (<button type="button" onClick={supprimerUtilisateur} className="bg-red-600 hover:bg-red-700 text-white font-black px-3 py-1.5 rounded text-[10px] shadow-xs">🗑️ Supprimer</button>)}
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-1.5 rounded text-[10px] shadow-xs">{userEnEdition ? 'Mettre à jour' : 'Enregistrer'}</button>
            </div>
          </div>
        </form>
      )}

      {!afficherForm && (
        <>
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            <input type="text" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder={`Rechercher par nom ou email [${moduleActuel}]...`} className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-extrabold text-slate-900 text-xs focus:outline-none shadow-xs" />
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-700 px-1 font-black">
            <span>Total répertorié : <strong>{usersFiltres.length}</strong> personne(s)</span>
          </div>

          {chargement ? (
            <div className="p-4 text-center text-slate-500 font-bold">Chargement...</div>
          ) : usersFiltres.length === 0 ? (
            <div className="p-4 text-center text-slate-500 bg-white border border-slate-200 rounded-xl font-bold">Aucun enregistrement trouvé pour le module {moduleActuel}.</div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 uppercase text-[9px] font-black select-none">
                  <tr>
                    <th onClick={() => gererTri('nom_complet')} className="p-2.5 cursor-pointer hover:bg-slate-200">Nom & Prénom {rendreFlecheTri('nom_complet')}</th>
                    <th onClick={() => gererTri('role')} className="p-2.5 cursor-pointer hover:bg-slate-200">Rôle {rendreFlecheTri('role')}</th>
                    <th className="p-2.5 text-center">Type d'accès</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10.5px]">
                  {usersFiltres.map((u) => {
                    const roleTrouve = roles.find((r) => String(r.id) === String(u.id_role));
                    const aAcces = u.acces_application ?? true;
                    return (
                      <tr key={u.id} onClick={() => ouvrirEdition(u)} className="hover:bg-orange-50/70 cursor-pointer transition select-none">
                        <td className="p-2.5 font-black text-slate-900">{u.nom_complet}</td>
                        <td className="p-2.5">
                          <span className="inline-block bg-orange-100 text-orange-900 border border-orange-200 px-2 py-0.5 rounded font-black text-[9.5px] whitespace-nowrap">
                            🛡️ {roleTrouve ? roleTrouve.nom_role : 'Aucun'}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded font-black text-[9.5px] border whitespace-nowrap ${aAcces ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-700 border-slate-300'}`}>
                            {aAcces ? '🟢 Utilisateur' : '👤 Terrain'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}