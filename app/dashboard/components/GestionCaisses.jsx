'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtdqodqhkdxanrelxtrq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GestionCaisses({ entrepriseId = '4TS-TEST' }) {
  const [caisses, setCaisses] = useState([]);
  const [chargement, setChargement] = useState(false);
  
  // Formulaire d'ajout / modification
  const [codeCaisse, setCodeCaisse] = useState('');
  const [nomCaisse, setNomCaisse] = useState('');
  const [typeCaisse, setTypeCaisse] = useState('PRINCIPALE');
  const [caisseEnCoursEdition, setCaisseEnCoursEdition] = useState(null);

  const chargerCaisses = async () => {
    setChargement(true);
    try {
      const { data, error } = await supabase
        .from('caisses')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCaisses(data || []);
    } catch (err) {
      console.error('Erreur chargement caisses :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerCaisses();
  }, [entrepriseId]);

  const sauvegarderCaisse = async (e) => {
    e.preventDefault();
    if (!codeCaisse.trim() || !nomCaisse.trim()) {
      alert('⚠️ Veuillez remplir le code et le nom de la caisse.');
      return;
    }

    try {
      const payload = {
        id_entreprise: entrepriseId,
        code_caisse: codeCaisse.trim().toUpperCase(),
        nom_caisse: nomCaisse.trim(),
        type: typeCaisse
      };

      if (caisseEnCoursEdition) {
        const { error } = await supabase
          .from('caisses')
          .update(payload)
          .eq('id', caisseEnCoursEdition.id);
        if (error) throw error;
        alert('✅ Caisse mise à jour avec succès !');
      } else {
        const { error } = await supabase
          .from('caisses')
          .insert([payload]);
        if (error) throw error;
        alert('✅ Nouvelle caisse déclarée avec succès !');
      }

      setCodeCaisse('');
      setNomCaisse('');
      setTypeCaisse('PRINCIPALE');
      setCaisseEnCoursEdition(null);
      chargerCaisses();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const editerCaisse = (c) => {
    setCaisseEnCoursEdition(c);
    setCodeCaisse(c.code_caisse || '');
    setNomCaisse(c.nom_caisse || '');
    setTypeCaisse(c.type || 'PRINCIPALE');
  };

  const supprimerCaisse = async (id) => {
    if (!confirm('Voulez-vous vraiment supprimer cette caisse ?')) return;
    try {
      const { error } = await supabase.from('caisses').delete().eq('id', id);
      if (error) throw error;
      chargerCaisses();
    } catch (err) {
      alert('Erreur suppression : ' + err.message);
    }
  };

  return (
    <div className="space-y-4 text-xs font-sans">
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
        <h2 className="font-black text-sm text-slate-800 uppercase mb-3">
          {caisseEnCoursEdition ? 'Modifier la Caisse' : 'Déclarer une Nouvelle Caisse'}
        </h2>
        
        <form onSubmit={sauvegarderCaisse} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Code Caisse (ex: C01)</label>
            <input
              type="text"
              value={codeCaisse}
              onChange={(e) => setCodeCaisse(e.target.value)}
              placeholder="C01"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 font-mono font-bold text-xs uppercase"
            />
          </div>

          <div className="sm:col-span-1">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nom de la Caisse</label>
            <input
              type="text"
              value={nomCaisse}
              onChange={(e) => setNomCaisse(e.target.value)}
              placeholder="Caisse Principale Boutique"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 font-medium text-xs"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Type de Caisse</label>
            <select
              value={typeCaisse}
              onChange={(e) => setTypeCaisse(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 font-bold text-xs text-slate-800"
            >
              <option value="PRINCIPALE">PRINCIPALE</option>
              <option value="FACTURATION">FACTURATION</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-1.5 px-3 rounded text-xs transition shadow-2xs"
            >
              {caisseEnCoursEdition ? 'Mettre à jour' : 'Enregistrer'}
            </button>
            {caisseEnCoursEdition && (
              <button
                type="button"
                onClick={() => { setCaisseEnCoursEdition(null); setCodeCaisse(''); setNomCaisse(''); }}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-1.5 px-2.5 rounded text-xs transition"
              >
                Annuler
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Liste des caisses enregistrées */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-3 bg-slate-50 border-b border-slate-200 font-black text-slate-700 uppercase text-[11px]">
          Caisses Déclarées ({caisses.length})
        </div>

        {chargement ? (
          <div className="p-6 text-center text-slate-400">Chargement...</div>
        ) : caisses.length === 0 ? (
          <div className="p-6 text-center text-slate-400">Aucune caisse enregistrée.</div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 uppercase text-[10px] font-black">
              <tr>
                <th className="p-3">Code Caisse</th>
                <th className="p-3">Nom</th>
                <th className="p-3">Type</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {caisses.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition">
                  <td className="p-3 font-mono font-black text-orange-600 text-sm">{c.code_caisse}</td>
                  <td className="p-3 font-bold text-slate-800">{c.nom_caisse}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      c.type === 'PRINCIPALE' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() => editerCaisse(c)}
                      className="text-slate-600 hover:text-orange-600 font-bold px-2 py-1 bg-slate-100 rounded"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => supprimerCaisse(c.id)}
                      className="text-rose-600 hover:text-rose-700 font-bold px-2 py-1 bg-rose-50 rounded"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}