'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtdqodqhkdxanrelxtrq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; 
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GestionClients({ entrepriseId = '4TS-TEST' }) {
  const [clients, setClients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [afficherForm, setAfficherForm] = useState(false);
  const [clientEnEdition, setClientEnEdition] = useState(null);
  const [recherche, setRecherche] = useState('');

  const [nouveauClient, setNouveauClient] = useState({
    nom_client: '',
    telephone: '',
    email: '',
    id_categorie: '',
    solde_credit: 0,
  });

  const chargerDonnees = async () => {
    setChargement(true);
    try {
      // Charger les catégories de clients
      const { data: dataCat, error: errCat } = await supabase
        .from('categories_clients')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .order('nom_categorie', { ascending: true });

      if (errCat) console.error('Erreur chargement catégories :', errCat.message);
      setCategories(dataCat || []);

      // Charger les clients
      const { data: dataCli, error: errCli } = await supabase
        .from('clients')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .order('created_at', { ascending: false });

      if (errCli) throw errCli;
      setClients(dataCli || []);
    } catch (err) {
      console.error('Erreur chargement clients :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, [entrepriseId]);

  const enregistrerClient = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nom_client: nouveauClient.nom_client,
        telephone: nouveauClient.telephone,
        email: nouveauClient.email,
        id_categorie: nouveauClient.id_categorie ? parseInt(nouveauClient.id_categorie) : null,
      };

      if (clientEnEdition) {
        const targetId = clientEnEdition.id;
        const { error } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', targetId);

        if (error) throw error;
        alert('Client mis à jour avec succès !');
      } else {
        const { error } = await supabase.from('clients').insert([
          {
            ...payload,
            solde_credit: 0, // Initialisé à 0, géré automatiquement par les ventes/règlements
            id_entreprise: entrepriseId,
          },
        ]);

        if (error) throw error;
        alert('Client enregistré avec succès !');
      }

      annulerForm();
      chargerDonnees();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const ouvrirEdition = (client) => {
    setClientEnEdition(client);
    setNouveauClient({
      nom_client: client.nom_client || '',
      telephone: client.telephone || '',
      email: client.email || '',
      id_categorie: client.id_categorie || '',
      solde_credit: client.solde_credit || 0,
    });
    setAfficherForm(true);
  };

  const annulerForm = () => {
    setClientEnEdition(null);
    setNouveauClient({
      nom_client: '',
      telephone: '',
      email: '',
      id_categorie: '',
      solde_credit: 0,
    });
    setAfficherForm(false);
  };

  const supprimerClient = async (id) => {
    if (!confirm('Voulez-vous vraiment supprimer ce client ?')) return;

    try {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      alert('Client supprimé.');
      chargerDonnees();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const clientsFiltres = clients.filter((c) => {
    const nom = (c.nom_client || '').toLowerCase();
    const tel = (c.telephone || '').toLowerCase();
    const query = recherche.toLowerCase();
    return nom.includes(query) || tel.includes(query);
  });

  return (
    <div className="space-y-4 text-xs">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm uppercase">👤 Gestion des Clients</h3>
          <p className="text-slate-500">Répertoire des clients, catégories tarifaires et suivi des soldes / crédits.</p>
        </div>
        <button
          onClick={() => (afficherForm ? annulerForm() : setAfficherForm(true))}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded-xl transition shadow"
        >
          {afficherForm ? '✖ Fermer' : '➕ Nouveau Client'}
        </button>
      </div>

      {afficherForm && (
        <form onSubmit={enregistrerClient} className="bg-slate-50 border-2 border-orange-500/40 p-4 rounded-2xl space-y-3 shadow-sm">
          <h4 className="font-bold text-orange-600 uppercase">
            {clientEnEdition ? `✏️ Modifier le client` : '➕ Enregistrer un nouveau client'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold mb-1">Nom / Prénom(s) *</label>
              <input
                type="text"
                required
                value={nouveauClient.nom_client}
                onChange={(e) => setNouveauClient({ ...nouveauClient, nom_client: e.target.value })}
                placeholder="Ex: JEAN PIERRE"
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Téléphone</label>
              <input
                type="text"
                value={nouveauClient.telephone}
                onChange={(e) => setNouveauClient({ ...nouveauClient, telephone: e.target.value })}
                placeholder="Ex: +237 690000000"
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Email</label>
              <input
                type="email"
                value={nouveauClient.email}
                onChange={(e) => setNouveauClient({ ...nouveauClient, email: e.target.value })}
                placeholder="Ex: client@email.com"
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-medium"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Catégorie Client *</label>
              <select
                value={nouveauClient.id_categorie}
                onChange={(e) => setNouveauClient({ ...nouveauClient, id_categorie: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-orange-700"
              >
                <option value="">-- Client Standard / Détaillant --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    🏷️ {cat.nom_categorie} ({cat.taux_remise_defaut}% remise)
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold mb-1">Solde Crédit Actuel (Automatique)</label>
              <input
                type="text"
                disabled
                value={`${Number(nouveauClient.solde_credit || 0).toLocaleString('fr-FR')} F`}
                className="w-full bg-slate-200 text-slate-600 border border-slate-300 rounded-xl p-2.5 font-bold cursor-not-allowed"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button type="button" onClick={annulerForm} className="bg-slate-300 text-slate-700 font-bold px-4 py-2.5 rounded-xl">Annuler</button>
            <button type="submit" className="bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl shadow">
              {clientEnEdition ? 'Mettre à jour' : 'Enregistrer'}
            </button>
          </div>
        </form>
      )}

      {/* Barre de recherche */}
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
        <input
          type="text"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder="Rechercher par nom ou téléphone..."
          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      <div className="flex justify-between items-center text-[11px] text-slate-500 px-1">
        <span>Répertoire : <strong>{clientsFiltres.length}</strong> client(s) trouvé(s)</span>
      </div>

      {/* Tableau des clients */}
      {chargement ? (
        <div className="p-8 text-center text-slate-400">Chargement des clients...</div>
      ) : clientsFiltres.length === 0 ? (
        <div className="p-8 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl">
          Aucun client enregistré pour le moment.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="p-3">Nom / Prénom(s)</th>
                <th className="p-3">Catégorie</th>
                <th className="p-3">Téléphone</th>
                <th className="p-3">Email</th>
                <th className="p-3">Solde Crédit</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clientsFiltres.map((c) => {
                const catTrouvee = categories.find((cat) => String(cat.id) === String(c.id_categorie));
                return (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="p-3 font-extrabold text-slate-800">{c.nom_client}</td>
                    <td className="p-3">
                      <span className="bg-orange-50 text-orange-800 border border-orange-200 px-2 py-0.5 rounded-lg font-bold text-[10px]">
                        🏷️ {catTrouvee ? catTrouvee.nom_categorie : 'Standard'}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-slate-600">{c.telephone || '-'}</td>
                    <td className="p-3 text-slate-600">{c.email || '-'}</td>
                    <td className="p-3 font-black text-blue-600">
                      {Number(c.solde_credit || 0).toLocaleString('fr-FR')} F
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => ouvrirEdition(c)} className="p-1.5 border border-slate-300 rounded-lg hover:bg-orange-100 transition" title="Modifier">✏️</button>
                        <button onClick={() => supprimerClient(c.id)} className="p-1.5 border border-slate-300 rounded-lg hover:bg-red-100 transition" title="Supprimer">🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}