'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';

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
    permissions: initialiserPermissionsDefaut(),
  });

  const chargerDonnees = async () => {
    setChargement(true);
    try {
      const { data: dataRoles } = await supabase
        .from('roles')
        .select('*')
        .eq('id_entreprise', entrepriseId);
      setRoles(dataRoles || []);

      const { data: dataUsers, error } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('id_entreprise', entrepriseId)
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
  }, [entrepriseId]);

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

    const numeroComplet = chiffresPur ? `${paysObj.indicatif}${chiffresPur}` : '';

    try {
      const payload = {
        nom_complet: nouveauUser.nom_complet,
        email: nouveauUser.email,
        pays: nouveauUser.pays,
        telephone: numeroComplet,
        mot_de_passe: nouveauUser.mot_de_passe,
        id_role: nouveauUser.id_role || null,
        statut: nouveauUser.statut,
        permissions: nouveauUser.permissions,
      };

      if (userEnEdition) {
        const { error } = await supabase.from('utilisateurs').update(payload).eq('id', userEnEdition.id);
        if (error) throw error;
        alert('Utilisateur mis à jour avec succès !');
      } else {
        const { error } = await supabase.from('utilisateurs').insert([{ ...payload, id_entreprise: entrepriseId }]);
        if (error) throw error;
        alert('Utilisateur créé avec succès !');
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
      permissions: initialiserPermissionsDefaut(),
    });
    setAfficherForm(false);
  };

  const supprimerUtilisateur = async (id) => {
    if (!confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) return;
    try {
      const { error } = await supabase.from('utilisateurs').delete().eq('id', id);
      if (error) throw error;
      alert('Utilisateur supprimé.');
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
    if (triCol !== colonne) return <span className="text-slate-300 ml-1">↕</span>;
    return <span className="text-orange-600 ml-1">{triOrdre === 'asc' ? '↑' : '↓'}</span>;
  };

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
      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="font-extrabold text-slate-800 uppercase text-xs">👥 COMPTES UTILISATEURS</h3>
        <button
          onClick={() => {
            if (afficherForm) annulerForm();
            else {
              setNouveauUser({ nom_complet: '', email: '', pays: 'cmr', telephone: '', mot_de_passe: '', id_role: '', statut: 'ACTIF', permissions: initialiserPermissionsDefaut() });
              setUserEnEdition(null);
              setAfficherForm(true);
            }
          }}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-2xs"
        >
          {afficherForm ? '✖' : 'Nouveau'}
        </button>
      </div>

      {afficherForm && (
        <form onSubmit={enregistrerUtilisateur} className="bg-slate-50 border border-orange-500/40 p-2.5 rounded-xl space-y-2 shadow-2xs">
          <div className="flex justify-between items-center border-b border-slate-200 pb-1">
            <h4 className="font-bold text-orange-600 uppercase text-[10px]">
              {userEnEdition ? '✏️ Fiche utilisateur' : '➕ Nouvel utilisateur'}
            </h4>
            <button type="button" onClick={annulerForm} className="text-slate-400 hover:text-slate-600 font-bold text-xs p-0.5">✖</button>
          </div>

          <div>
            <label className="block font-semibold mb-0.5 text-[9px] text-slate-500">Nom Complet *</label>
            <input type="text" required value={nouveauUser.nom_complet} onChange={(e) => setNouveauUser({ ...nouveauUser, nom_complet: e.target.value })} placeholder="Ex: Paul BIYA" className="w-full bg-white border border-slate-200 rounded p-1 font-bold text-xs" />
          </div>

          {/* RÔLE ET STATUT SUR LA MÊME LIGNE */}
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="block font-semibold mb-0.5 text-[9px] text-slate-500">Rôle *</label>
              <select required value={nouveauUser.id_role} onChange={(e) => setNouveauUser({ ...nouveauUser, id_role: e.target.value })} className="w-full bg-white border border-slate-200 rounded p-1 font-bold text-orange-700 text-xs">
                <option value="">-- Rôle --</option>
                {roles.map((r) => (<option key={r.id} value={r.id}>{r.nom_role}</option>))}
              </select>
            </div>
            <div>
              <label className="block font-semibold mb-0.5 text-[9px] text-slate-500">Statut</label>
              <select value={nouveauUser.statut} onChange={(e) => setNouveauUser({ ...nouveauUser, statut: e.target.value })} className="w-full bg-white border border-slate-200 rounded p-1 font-bold text-slate-700 text-xs">
                <option value="ACTIF">🟢 Actif</option>
                <option value="INACTIF">🔴 Inactif</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-0.5 text-[9px] text-slate-500">Mot de Passe *</label>
            <input type="password" required value={nouveauUser.mot_de_passe} onChange={(e) => setNouveauUser({ ...nouveauUser, mot_de_passe: e.target.value })} placeholder="••••••••" className="w-full bg-white border border-slate-200 rounded p-1 font-mono text-xs" />
          </div>

          {/* PAYS ET TEL SUR LA MÊME LIGNE */}
          <div className="grid grid-cols-3 gap-1.5 pt-1 border-t border-slate-100">
            <div>
              <label className="block font-semibold mb-0.5 text-[9px] text-slate-500">Pays *</label>
              <select value={nouveauUser.pays} onChange={(e) => setNouveauUser({ ...nouveauUser, pays: e.target.value })} className="w-full bg-white border border-slate-200 rounded p-1 font-bold text-slate-800 text-[11px]">
                {LISTE_PAYS.map((p) => (<option key={p.code} value={p.code}>{p.code}</option>))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block font-semibold mb-0.5 text-[9px] text-slate-500">Tel({paysActuelObj.longueur})</label>
              <div className="flex items-center bg-white border border-slate-200 rounded overflow-hidden">
                <span className="bg-slate-100 px-1.5 py-1 text-[11px] font-bold border-r border-slate-200 shrink-0">{paysActuelObj.indicatif}</span>
                <input type="text" maxLength={paysActuelObj.longueur} value={nouveauUser.telephone} onChange={gererSaisieTelephone} placeholder="6XXXXXXXX" className="w-full p-1 font-mono text-[11px] font-bold focus:outline-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold mb-0.5 text-[9px] text-slate-500">Email *</label>
            <input type="email" required value={nouveauUser.email} onChange={(e) => setNouveauUser({ ...nouveauUser, email: e.target.value })} placeholder="paul@keita.cm" className="w-full bg-white border border-slate-200 rounded p-1 font-medium text-[11px]" />
          </div>

          <div className="pt-1.5 border-t border-slate-200 space-y-1.5">
            <h5 className="font-extrabold text-slate-800 text-[10px] uppercase">🔐 Droits & Permissions par Module :</h5>
            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
              <table className="w-full text-left text-xs table-fixed">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] uppercase font-extrabold">
                  <tr>
                    <th className="p-1.5 w-[40%]">Module</th>
                    <th className="p-1.5 w-[12%] text-center">👁️</th>
                    <th className="p-1.5 w-[12%] text-center">➕</th>
                    <th className="p-1.5 w-[12%] text-center">✏️</th>
                    <th className="p-1.5 w-[12%] text-center">🗑️</th>
                    <th className="p-1.5 w-[12%] text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10px]">
                  {modulesApp.map((m) => {
                    const p = nouveauUser.permissions[m.id] || { lecture: false, creation: false, modification: false, suppression: false };
                    const estToutAccorde = p.lecture && p.creation && p.modification && p.suppression;
                    return (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="p-1.5 font-bold text-slate-800 truncate">{m.nom}</td>
                        <td className="p-1.5 text-center"><input type="checkbox" checked={p.lecture} onChange={() => togglePermission(m.id, 'lecture')} className="w-3.5 h-3.5 accent-orange-600 rounded cursor-pointer" /></td>
                        <td className="p-1.5 text-center"><input type="checkbox" checked={p.creation} onChange={() => togglePermission(m.id, 'creation')} className="w-3.5 h-3.5 accent-emerald-600 rounded cursor-pointer" /></td>
                        <td className="p-1.5 text-center"><input type="checkbox" checked={p.modification} onChange={() => togglePermission(m.id, 'modification')} className="w-3.5 h-3.5 accent-blue-600 rounded cursor-pointer" /></td>
                        <td className="p-1.5 text-center"><input type="checkbox" checked={p.suppression} onChange={() => togglePermission(m.id, 'suppression')} className="w-3.5 h-3.5 accent-red-600 rounded cursor-pointer" /></td>
                        <td className="p-1.5 text-center">
                          <button type="button" onClick={() => accorderToutModule(m.id, !estToutAccorde)} className={`px-1 py-0.5 rounded text-[8.5px] font-bold ${estToutAccorde ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
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

          <div className="pt-2 border-t border-slate-200 flex flex-wrap justify-between items-center gap-1.5">
            <div className="flex items-center gap-1 flex-wrap">
              {nouveauUser.telephone && nouveauUser.telephone.length === paysActuelObj.longueur && (
                <>
                  <a href={`tel:${getTelephoneComplet()}`} className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold px-2 py-1 rounded text-[9.5px]">📞 Appel</a>
                  <a href={`https://wa.me/${obtenirNumWhatsapp(getTelephoneComplet())}`} target="_blank" rel="noopener noreferrer" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold px-2.5 py-1 rounded text-[9.5px]">WhatsApp</a>
                </>
              )}
              {nouveauUser.email && (<a href={`mailto:${nouveauUser.email}`} className="bg-slate-100 text-slate-700 font-bold px-2 py-1 rounded text-[9.5px]">📧 Email</a>)}
            </div>
            <div className="flex items-center gap-1">
              {userEnEdition && (<button type="button" onClick={() => supprimerUtilisateur(userEnEdition.id)} className="bg-red-600 text-white font-bold px-2.5 py-1 rounded text-[10px]">🗑️ Supprimer</button>)}
              <button type="submit" className="bg-emerald-600 text-white font-bold px-3 py-1 rounded text-[10px] shadow-2xs">{userEnEdition ? 'Mettre à jour' : 'Enregistrer'}</button>
            </div>
          </div>
        </form>
      )}

      {!afficherForm && (
        <>
          <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <input type="text" value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher par nom ou email..." className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 text-xs focus:outline-none" />
          </div>

          <div className="flex justify-between items-center text-[10px] text-slate-500 px-1">
            <span>Comptes enregistrés : <strong>{usersFiltres.length}</strong> utilisateur(s)</span>
          </div>

          {chargement ? (
            <div className="p-4 text-center text-slate-400">Chargement...</div>
          ) : usersFiltres.length === 0 ? (
            <div className="p-4 text-center text-slate-400 bg-white border border-slate-200 rounded-xl">Aucun utilisateur enregistré.</div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
              <table className="w-full text-left text-xs table-fixed">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[9px] font-extrabold select-none">
                  <tr>
                    <th onClick={() => gererTri('nom_complet')} className="p-2 w-[55%] cursor-pointer">Nom & Prénom {rendreFlecheTri('nom_complet')}</th>
                    <th onClick={() => gererTri('role')} className="p-2 w-[45%] cursor-pointer">Rôle {rendreFlecheTri('role')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10.5px]">
                  {usersFiltres.map((u) => {
                    const roleTrouve = roles.find((r) => String(r.id) === String(u.id_role));
                    return (
                      <tr key={u.id} onClick={() => ouvrirEdition(u)} className="hover:bg-orange-50/70 cursor-pointer transition">
                        <td className="p-2 font-extrabold text-slate-800 truncate">{u.nom_complet}</td>
                        <td className="p-2 truncate">
                          <span className="bg-orange-50 text-orange-800 border border-orange-200 px-1.5 py-0.5 rounded font-bold text-[9px]">
                            🛡️ {roleTrouve ? roleTrouve.nom_role : 'Aucun'}
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