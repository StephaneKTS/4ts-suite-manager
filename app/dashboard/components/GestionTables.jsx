'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionTables({ entrepriseId }) {
  const [tables, setTables] = useState([]);
  const [numeroTable, setNumeroTable] = useState('');
  const [espace, setEspace] = useState('SALLE PRINCIPALE');
  const [nouveauEspaceCustom, setNouveauEspaceCustom] = useState('');
  const [nombrePlaces, setNombrePlaces] = useState(4);
  const [chargement, setChargement] = useState(false);

  // Liste des espaces suggérés par défaut
  const espacesPredefinis = [
    'SALLE PRINCIPALE',
    ' TERRASSE',
    ' VIP',
    ' SOUS-SOL',
    ' JARDIN'
  ];

  // Charger la liste des tables de l'entreprise
  const chargerTables = async () => {
    if (!entrepriseId) return;
    try {
      const { data, error } = await supabase
        .from('tables_restaurant')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .order('espace', { ascending: true })
        .order('numero_table', { ascending: true });

      if (error) throw error;
      setTables(data || []);
    } catch (err) {
      console.error('Erreur chargement tables :', err.message);
    }
  };

  useEffect(() => {
    chargerTables();
  }, [entrepriseId]);

  // Ajouter une nouvelle table
  const ajouterTable = async (e) => {
    e.preventDefault();
    if (!numeroTable.trim()) {
      alert('Veuillez entrer un numéro ou un nom de table.');
      return;
    }

    const espaceFinal = (espace === 'AUTRE' ? nouveauEspaceCustom : espace).trim().toUpperCase();
    if (!espaceFinal) {
      alert('Veuillez définir ou sélectionner un espace.');
      return;
    }

    setChargement(true);
    try {
      const { error } = await supabase
        .from('tables_restaurant')
        .insert([{
          id_entreprise: entrepriseId,
          numero_table: numeroTable.trim().toUpperCase(),
          espace: espaceFinal,
          nombre_places: parseInt(nombrePlaces) || 4,
          disponible: true
        }]);

      if (error) throw error;

      alert('Table créée avec succès !');
      setNumeroTable('');
      setNouveauEspaceCustom('');
      setNombrePlaces(4);
      chargerTables();
    } catch (err) {
      alert('Erreur lors de la création : ' + err.message);
    } finally {
      setChargement(false);
    }
  };

  // Supprimer une table
  const supprimerTable = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette table ?')) return;

    try {
      const { error } = await supabase
        .from('tables_restaurant')
        .delete()
        .eq('id', id);

      if (error) throw error;
      chargerTables();
    } catch (err) {
      alert('Erreur lors de la suppression : ' + err.message);
    }
  };

  // Regroupement automatique des tables par espace
  const tablesParEspace = tables.reduce((acc, t) => {
    const esp = t.espace || 'GÉNÉRAL';
    if (!acc[esp]) acc[esp] = [];
    acc[esp].push(t);
    return acc;
  }, {});

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6 font-sans text-xs">
      {/* Formulaire d'ajout */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="font-black text-slate-900 uppercase text-sm">🪑 Gestion & Espaces des Tables</h2>
        <p className="text-slate-500 text-[11px]">
          Organisez vos tables par espace (Terrasse, VIP, Salle...) et définissez leur capacité. Un lien QR code unique sera généré pour chaque table.
        </p>

        <form onSubmit={ajouterTable} className="space-y-3 pt-2 border-t border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-[9px] text-slate-600 uppercase mb-1">Numéro / Nom de la table *</label>
              <input
                type="text"
                required
                placeholder="Ex: T-01 ou Table 1"
                value={numeroTable}
                onChange={(e) => setNumeroTable(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-black uppercase text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-[9px] text-slate-600 uppercase mb-1">Espace du restaurant *</label>
              <select
                value={espace}
                onChange={(e) => setEspace(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-black uppercase text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                {espacesPredefinis.map((esp, idx) => (
                  <option key={idx} value={esp}>{esp}</option>
                ))}
                <option value="AUTRE">➕ Autre espace personnalisé...</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-[9px] text-slate-600 uppercase mb-1">Nombre de places *</label>
              <input
                type="number"
                min="1"
                max="50"
                required
                value={nombrePlaces}
                onChange={(e) => setNombrePlaces(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-black text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {espace === 'AUTRE' && (
            <div>
              <label className="block font-bold text-[9px] text-slate-600 uppercase mb-1">Nom du nouvel espace *</label>
              <input
                type="text"
                required
                placeholder="Ex: BORD DE PISCINE, MEZZANINE..."
                value={nouveauEspaceCustom}
                onChange={(e) => setNouveauEspaceCustom(e.target.value)}
                className="w-full bg-orange-50 border border-orange-300 rounded-xl p-3 font-black uppercase text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={chargement}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-3 rounded-xl uppercase shadow-md transition cursor-pointer"
          >
            {chargement ? 'Création en cours...' : '➕ Enregistrer la table'}
          </button>
        </form>
      </div>

      {/* Liste des tables regroupées par espace */}
      <div className="space-y-4">
        <h3 className="font-black text-slate-900 uppercase text-xs px-1">
          Aperçu par Espace ({tables.length} tables au total)
        </h3>

        {tables.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 italic font-bold">
            Aucune table enregistrée pour le moment.
          </div>
        ) : (
          Object.entries(tablesParEspace).map(([nomEspace, tablesDeEspace]) => (
            <div key={nomEspace} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <h4 className="font-black text-orange-600 uppercase text-xs flex items-center gap-1.5">
                  📍 {nomEspace} <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full text-[9px]">({tablesDeEspace.length} tables)</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {tablesDeEspace.map((t) => {
                  const lienQrTable = `${window.location.origin}/client?entrepriseId=${entrepriseId}&table=${encodeURIComponent(t.numero_table)}`;

                  return (
                    <div key={t.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex justify-between items-center shadow-2xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 uppercase text-xs">{t.numero_table}</span>
                          <span className="bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded text-[8px]">
                            👥 {t.nombre_places} places
                          </span>
                        </div>
                        <p className="text-[9px] font-mono text-slate-400 truncate max-w-[180px]">
                          {lienQrTable}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(lienQrTable);
                            alert(`Lien de la ${t.numero_table} (${nomEspace}) copié !`);
                          }}
                          className="bg-slate-900 hover:bg-slate-800 text-white font-black px-2.5 py-1.5 rounded-lg text-[8px] uppercase transition cursor-pointer"
                          title="Copier le lien QR"
                        >
                          Lien 🔗
                        </button>
                        <button
                          type="button"
                          onClick={() => supprimerTable(t.id)}
                          className="bg-red-600 hover:bg-red-500 text-white font-black px-2.5 py-1.5 rounded-lg text-[8px] uppercase transition cursor-pointer"
                          title="Supprimer"
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}