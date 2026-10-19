'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function GestionCaisses({ entrepriseId = '4TS-TEST' }) {
  const [caisses, setCaisses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const [codeCaisse, setCodeCaisse] = useState('');
  const [nomCaisse, setNomCaisse] = useState('');
  const [natureCaisse, setNatureCaisse] = useState('PRINCIPALE');
  const [caisseEnEdition, setCaisseEnEdition] = useState(null);

  useEffect(() => {
    chargerCaisses();
  }, [entrepriseId]);

  const chargerCaisses = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const enregistrerCaisse = async (e) => {
    e.preventDefault();
    if (!codeCaisse.trim() || !nomCaisse.trim()) {
      setMsg({ type: 'error', text: '⚠️ Veuillez remplir le code et le nom de la caisse.' });
      return;
    }

    try {
      const payload = {
        id_entreprise: entrepriseId,
        code_caisse: codeCaisse.trim().toUpperCase(),
        nom_caisse: nomCaisse.trim(),
        nature: natureCaisse
      };

      if (caisseEnEdition) {
        const { error } = await supabase.from('caisses').update(payload).eq('id', caisseEnEdition.id);
        if (error) throw error;
        setMsg({ type: 'success', text: '✅ Caisse mise à jour avec succès !' });
      } else {
        const { error } = await supabase.from('caisses').insert([payload]);
        if (error) throw error;
        setMsg({ type: 'success', text: '✅ Nouvelle caisse déclarée avec succès !' });
      }

      setCodeCaisse('');
      setNomCaisse('');
      setNatureCaisse('PRINCIPALE');
      setCaisseEnEdition(null);
      chargerCaisses();
    } catch (err) {
      setMsg({ type: 'error', text: 'Erreur : ' + err.message });
    }
  };

  const editerCaisse = (c) => {
    setCaisseEnEdition(c);
    setCodeCaisse(c.code_caisse || '');
    setNomCaisse(c.nom_caisse || '');
    setNatureCaisse(c.nature || 'PRINCIPALE');
  };

  const supprimerCaisse = async (id) => {
    if (!confirm('Voulez-vous vraiment supprimer cette caisse ?')) return;
    try {
      const { error } = await supabase.from('caisses').delete().eq('id', id);
      if (error) throw error;
      setMsg({ type: 'success', text: 'Caisse supprimée avec succès.' });
      chargerCaisses();
    } catch (err) {
      setMsg({ type: 'error', text: 'Erreur suppression : ' + err.message });
    }
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      {msg.text && (
        <div className={`p-3 rounded-xl font-semibold border ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'}`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={enregistrerCaisse} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="font-extrabold text-slate-800 text-sm uppercase">
          {caisseEnEdition ? '✏️ Modifier la Caisse' : '🏧 Déclarer une Caisse'}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Code Caisse (ex: C01)</label>
            <input
              type="text"
              value={codeCaisse}
              onChange={(e) => setCodeCaisse(e.target.value)}
              placeholder="C01"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono font-bold uppercase"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Nom de la Caisse</label>
            <input
              type="text"
              value={nomCaisse}
              onChange={(e) => setNomCaisse(e.target.value)}
              placeholder="Caisse Principale"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Nature de la Caisse</label>
            <select
              value={natureCaisse}
              onChange={(e) => setNatureCaisse(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-800"
            >
              <option value="PRINCIPALE">PRINCIPALE</option>
              <option value="FACTURATION">FACTURATION</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" className="bg-[#005a5b] hover:bg-[#004748] text-white font-bold px-4 py-2 rounded-xl text-xs transition">
            {caisseEnEdition ? 'Mettre à jour' : 'Enregistrer la Caisse'}
          </button>
          {caisseEnEdition && (
            <button
              type="button"
              onClick={() => { setCaisseEnEdition(null); setCodeCaisse(''); setNomCaisse(''); setNatureCaisse('PRINCIPALE'); }}
              className="bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs"
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="font-extrabold text-slate-800 text-sm">Caisses Enregistrées ({caisses.length})</h3>
        {loading ? (
          <p className="text-slate-400 text-center py-4">Chargement...</p>
        ) : caisses.length === 0 ? (
          <p className="text-slate-400 text-center py-4">Aucune caisse déclarée pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {caisses.map((c) => (
              <div key={c.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono font-black text-[#005a5b]">{c.code_caisse}</span>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
                      c.nature === 'PRINCIPALE' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {c.nature}
                    </span>
                  </div>
                  <p className="font-bold text-xs text-slate-800">{c.nom_caisse}</p>
                </div>
                <div className="flex justify-end space-x-1 mt-3 pt-2 border-t border-slate-200">
                  <button onClick={() => editerCaisse(c)} className="text-[10px] text-slate-600 hover:text-orange-600 font-bold px-2 py-1 bg-white rounded border">
                    Modifier
                  </button>
                  <button onClick={() => supprimerCaisse(c.id)} className="text-[10px] text-rose-600 font-bold px-2 py-1 bg-rose-50 rounded">
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}