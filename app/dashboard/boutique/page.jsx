'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function ModuleBoutique({ entrepriseId = '4TS-TEST' }) {
  const [onglet, setOnglet] = useState('caisses'); // 'caisses', 'caisse', 'stock', 'historique'
  const [caisses, setCaisses] = useState([]);
  const [caisseActive, setCaisseActive] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // --- FORMULAIRE DÉCLARATION CAISSE ---
  const [codeCaisse, setCodeCaisse] = useState('C01');
  const [nomCaisse, setNomCaisse] = useState('Caisse Principale');
  const [natureCaisse, setNatureCaisse] = useState('PRINCIPALE');
  const [caisseEnEdition, setCaisseEnEdition] = useState(null);

  // --- ÉTATS VENTES & ARTICLES ---
  const [articles, setArticles] = useState([]);
  const [panier, setPanier] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [modePaiement, setModePaiement] = useState('Espèces');
  const [ventes, setVentes] = useState([]);

  useEffect(() => {
    chargerDonnees();
  }, [entrepriseId]);

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      await Promise.all([
        chargerCaisses(),
        chargerArticles(),
        chargerHistoriqueVentes()
      ]);
    } catch (err) {
      console.error('Erreur chargement :', err.message);
    } finally {
      setLoading(false);
    }
  };

  // 1. CHARGER LA TABLE CAISSES
  const chargerCaisses = async () => {
    const { data, error } = await supabase
      .from('caisses')
      .select('*')
      .eq('id_entreprise', entrepriseId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCaisses(data);
      if (data.length > 0 && !caisseActive) {
        setCaisseActive(data[0]);
      }
    }
  };

  const chargerArticles = async () => {
    const { data } = await supabase.from('articles').select('*').order('designation', { ascending: true });
    setArticles(data || []);
  };

  const chargerHistoriqueVentes = async () => {
    const { data } = await supabase.from('ventes').select('*').order('date_vente', { ascending: false }).limit(20);
    setVentes(data || []);
  };

  // 2. DÉCLARER OU MODIFIER UNE CAISSE (AVEC 'nature')
  const enregistrerCaisse = async (e) => {
    e.preventDefault();
    if (!codeCaisse.trim() || !nomCaisse.trim()) {
      setMsg({ type: 'error', text: '⚠️ Veuillez renseigner le code et le nom de la caisse.' });
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
        const { error } = await supabase
          .from('caisses')
          .update(payload)
          .eq('id', caisseEnEdition.id);
        if (error) throw error;
        setMsg({ type: 'success', text: '✅ Caisse mise à jour avec succès !' });
      } else {
        const { data, error } = await supabase
          .from('caisses')
          .insert([payload])
          .select()
          .single();

        if (error) throw error;
        setMsg({ type: 'success', text: '✅ Nouvelle caisse déclarée avec succès !' });
        if (data) setCaisseActive(data);
      }

      setCodeCaisse('');
      setNomCaisse('');
      setNatureCaisse('PRINCIPALE');
      setCaisseEnEdition(null);
      chargerCaisses();
    } catch (err) {
      setMsg({ type: 'error', text: 'Erreur déclaration caisse : ' + err.message });
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
      setMsg({ type: 'success', text: 'Caisse supprimée.' });
      chargerCaisses();
    } catch (err) {
      setMsg({ type: 'error', text: 'Erreur suppression : ' + err.message });
    }
  };

  // 3. LOGIQUE CAISSE & VENTE (TICKETS)
  const ajouterAuPanier = (article) => {
    if (article.quantite_stock <= 0) {
      setMsg({ type: 'error', text: `Stock épuisé pour ${article.designation}` });
      return;
    }
    const existant = panier.find((item) => item.id === article.id);
    if (existant) {
      setPanier(panier.map((item) => item.id === article.id ? { ...item, quantite: item.quantite + 1 } : item));
    } else {
      setPanier([...panier, { ...article, quantite: 1 }]);
    }
    setMsg({ type: '', text: '' });
  };

  const modifierQuantitePanier = (id, delta) => {
    setPanier((prev) => prev.map((item) => {
      if (item.id === id) {
        const nvQte = item.quantite + delta;
        return nvQte > 0 ? { ...item, quantite: nvQte } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const calculerTotalPanier = () => {
    return panier.reduce((acc, item) => acc + item.prix_vente * item.quantite, 0);
  };

  const validerVente = async () => {
    if (panier.length === 0) return;
    if (!caisseActive) {
      setMsg({ type: 'error', text: '⚠️ Veuillez sélectionner ou déclarer une caisse d\'abord.' });
      setOnglet('caisses');
      return;
    }

    setLoading(true);
    try {
      const total = calculerTotalPanier();
      const codePrefix = caisseActive.code_caisse || 'C01';
      const refFacture = `${codePrefix}-${Date.now().toString().slice(-6)}`;

      const { error: errVente } = await supabase.from('ventes').insert([{
        id_entreprise: entrepriseId,
        reference_facture: refFacture,
        montant_total: total,
        mode_paiement: modePaiement,
        date_vente: new Date().toISOString(),
      }]);

      if (errVente) throw errVente;

      for (const item of panier) {
        await supabase.from('articles').update({ quantite_stock: item.quantite_stock - item.quantite }).eq('id', item.id);
      }

      setMsg({ type: 'success', text: `Ticket ${refFacture} validé sur la caisse ${caisseActive.nom_caisse} (${caisseActive.nature}) !` });
      setPanier([]);
      chargerArticles();
      chargerHistoriqueVentes();
    } catch (err) {
      setMsg({ type: 'error', text: 'Erreur validation : ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const articlesFiltres = articles.filter((a) => a.designation.toLowerCase().includes(recherche.toLowerCase()));

  return (
    <div className="space-y-6 p-4 bg-slate-50 min-h-screen font-sans">
      
      {/* BARRE DE NAVIGATION & SELECTION CAISSE ACTIVE */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setOnglet('caisses')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase transition ${
              onglet === 'caisses' ? 'bg-[#005a5b] text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🏧 Déclarer Caisses ({caisses.length})
          </button>
          <button
            onClick={() => setOnglet('caisse')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase transition ${
              onglet === 'caisse' ? 'bg-[#005a5b] text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🛒 Caisse & Ventes
          </button>
          <button
            onClick={() => setOnglet('stock')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase transition ${
              onglet === 'stock' ? 'bg-[#005a5b] text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            📦 Stock ({articles.length})
          </button>
          <button
            onClick={() => setOnglet('historique')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase transition ${
              onglet === 'historique' ? 'bg-[#005a5b] text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            📜 Historique Ventes
          </button>
        </div>

        <div className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs">
          <span className="text-slate-500 font-bold">Caisse Sélectionnée : </span>
          <span className="font-extrabold text-[#005a5b]">
            {caisseActive ? `${caisseActive.code_caisse} - ${caisseActive.nom_caisse} (${caisseActive.nature})` : '⚠️ Aucune'}
          </span>
        </div>
      </div>

      {msg.text && (
        <div className={`p-4 rounded-xl text-sm font-semibold border ${
          msg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'
        }`}>
          {msg.text}
        </div>
      )}

      {/* ONGLET 1 : DÉCLARATION & GESTION DE LA TABLE 'CAISSES' */}
      {onglet === 'caisses' && (
        <div className="space-y-6">
          <form onSubmit={enregistrerCaisse} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-extrabold text-slate-800 text-sm uppercase">
              {caisseEnEdition ? '✏️ Modifier la Caisse' : '🏧 Déclarer une Nouvelle Caisse'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
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
                  placeholder="Caisse Principale Boutique"
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

          {/* LISTE DES CAISSES EXISTANTES DANS SUPABASE */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-extrabold text-slate-800 text-sm">Caisses Enregistrées ({caisses.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {caisses.map((c) => (
                <div
                  key={c.id}
                  className={`p-3 rounded-xl border flex flex-col justify-between transition ${
                    caisseActive?.id === c.id ? 'border-[#005a5b] bg-emerald-50/50 shadow-xs' : 'border-slate-200 bg-slate-50'
                  }`}
                >
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

                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-200/60">
                    <button
                      onClick={() => setCaisseActive(c)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                        caisseActive?.id === c.id ? 'bg-[#005a5b] text-white' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {caisseActive?.id === c.id ? '✓ Active' : 'Sélectionner'}
                    </button>
                    <div className="space-x-1">
                      <button onClick={() => editerCaisse(c)} className="text-[10px] text-slate-600 hover:text-orange-600 font-bold px-2 py-1 bg-white rounded border">
                        Modifier
                      </button>
                      <button onClick={() => supprimerCaisse(c.id)} className="text-[10px] text-rose-600 font-bold px-2 py-1 bg-rose-50 rounded">
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ONGLET 2 : CAISSE & VENTES ENREGISTREUSE */}
      {onglet === 'caisse' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <input
              type="text"
              placeholder="🔍 Rechercher un produit..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#005a5b]"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[450px] overflow-y-auto">
              {articlesFiltres.map((art) => (
                <div
                  key={art.id}
                  onClick={() => ajouterAuPanier(art)}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 cursor-pointer flex flex-col justify-between transition"
                >
                  <p className="font-bold text-slate-800 text-xs line-clamp-1">{art.designation}</p>
                  <div className="mt-3 flex justify-between items-end">
                    <span className="text-xs font-mono font-bold text-[#005a5b]">{art.prix_vente?.toLocaleString()} F</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700">Stk: {art.quantite_stock}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm mb-3 border-b pb-2">📋 Ticket en cours ({caisseActive?.nom_caisse || 'Aucune caisse'})</h3>
              <div className="space-y-2 max-h-[250px] overflow-y-auto">
                {panier.length === 0 ? (
                  <p className="text-center text-slate-400 text-xs py-8">Panier vide</p>
                ) : (
                  panier.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs">
                      <div>
                        <p className="font-bold">{item.designation}</p>
                        <p className="text-[10px] text-slate-500">{item.prix_vente} F x {item.quantite}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => modifierQuantitePanier(item.id, -1)} className="w-5 h-5 bg-slate-200 rounded font-bold">-</button>
                        <span className="px-1 font-bold">{item.quantite}</span>
                        <button onClick={() => modifierQuantitePanier(item.id, 1)} className="w-5 h-5 bg-slate-200 rounded font-bold">+</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t pt-3 space-y-3">
              <div className="flex justify-between items-center text-base font-black">
                <span>TOTAL :</span>
                <span className="text-orange-600">{calculerTotalPanier().toLocaleString()} XAF</span>
              </div>
              <select value={modePaiement} onChange={(e) => setModePaiement(e.target.value)} className="w-full bg-slate-50 border rounded-xl p-2 text-xs font-bold">
                <option value="Espèces">💵 Espèces</option>
                <option value="Mobile Money">📱 Mobile Money</option>
                <option value="Carte">💳 Carte</option>
              </select>
              <button onClick={validerVente} disabled={panier.length === 0 || loading} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl text-xs">
                Valider & Encaisser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ONGLET 3 : HISTORIQUE */}
      {onglet === 'historique' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-bold text-slate-800 text-sm">📜 Historique des ventes</h3>
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b font-bold text-slate-500 uppercase">
              <tr>
                <th className="p-3">Référence Facture</th>
                <th className="p-3">Date</th>
                <th className="p-3">Montant Total</th>
                <th className="p-3">Paiement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ventes.map((v) => (
                <tr key={v.id}>
                  <td className="p-3 font-mono font-bold text-[#005a5b]">{v.reference_facture}</td>
                  <td className="p-3">{new Date(v.date_vente).toLocaleString('fr-FR')}</td>
                  <td className="p-3 font-extrabold text-orange-600">{v.montant_total?.toLocaleString()} XAF</td>
                  <td className="p-3">{v.mode_paiement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}