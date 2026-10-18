'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ModuleBoutique({ entrepriseId = '4TS-KEITA' }) {
  const [onglet, setOnglet] = useState('caisse');
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const [panier, setPanier] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [modePaiement, setModePaiement] = useState('Espèces');

  const [nouveauProduit, setNouveauProduit] = useState({
    code_barre: '',
    designation: '',
    categorie: 'Général',
    prix_achat: 0,
    prix_vente: 0,
    quantite_stock: 0,
    seuil_alerte: 5,
  });

  const [ventes, setVentes] = useState([]);

  useEffect(() => {
    chargerArticles();
    chargerHistoriqueVentes();
  }, []);

  const chargerArticles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('designation', { ascending: true });

      if (error) throw error;
      setArticles(data || []);
    } catch (err) {
      console.error('Erreur chargement articles:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const chargerHistoriqueVentes = async () => {
    try {
      const { data, error } = await supabase
        .from('ventes')
        .select('*')
        .order('date_vente', { ascending: false })
        .limit(20);

      if (error) throw error;
      setVentes(data || []);
    } catch (err) {
      console.error('Erreur chargement ventes:', err.message);
    }
  };

  const ajouterAuPanier = (article) => {
    if (article.quantite_stock <= 0) {
      setMsg({ type: 'error', text: `Stock épuisé pour ${article.designation}` });
      return;
    }

    const existant = panier.find((item) => item.id === article.id);
    if (existant) {
      if (existant.quantite + 1 > article.quantite_stock) {
        setMsg({ type: 'error', text: 'Stock insuffisant pour cette quantité supplémentaire !' });
        return;
      }
      setPanier(
        panier.map((item) =>
          item.id === article.id ? { ...item, quantite: item.quantite + 1 } : item
        )
      );
    } else {
      setPanier([...panier, { ...article, quantite: 1 }]);
    }
    setMsg({ type: '', text: '' });
  };

  const modifierQuantitePanier = (id, delta) => {
    setPanier((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const nvQte = item.quantite + delta;
            return nvQte > 0 ? { ...item, quantite: nvQte } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const calculerTotalPanier = () => {
    return panier.reduce((acc, item) => acc + item.prix_vente * item.quantite, 0);
  };

  const validerVente = async () => {
    if (panier.length === 0) return;
    setLoading(true);
    setMsg({ type: '', text: '' });

    try {
      const total = calculerTotalPanier();
      const refFacture = 'FAC-' + Date.now().toString().slice(-6);

      const { data: venteInseree, error: errVente } = await supabase
        .from('ventes')
        .insert([
          {
            id_entreprise: entrepriseId,
            reference_facture: refFacture,
            montant_total: total,
            mode_paiement: modePaiement,
            date_vente: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (errVente) throw errVente;

      for (const item of panier) {
        await supabase
          .from('articles')
          .update({ quantite_stock: item.quantite_stock - item.quantite })
          .eq('id', item.id);
      }

      setMsg({ type: 'success', text: `Vente ${refFacture} enregistrée avec succès (${total.toLocaleString()} XAF) !` });
      setPanier([]);
      chargerArticles();
      chargerHistoriqueVentes();
    } catch (err) {
      setMsg({ type: 'error', text: "Erreur lors de la validation : " + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAjoutProduit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('articles').insert([
        {
          ...nouveauProduit,
          id_entreprise: entrepriseId,
        },
      ]);

      if (error) throw error;

      setMsg({ type: 'success', text: 'Produit ajouté au catalogue avec succès !' });
      setNouveauProduit({
        code_barre: '',
        designation: '',
        categorie: 'Général',
        prix_achat: 0,
        prix_vente: 0,
        quantite_stock: 0,
        seuil_alerte: 5,
      });
      chargerArticles();
    } catch (err) {
      setMsg({ type: 'error', text: 'Erreur lors de l\'ajout du produit : ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const articlesFiltres = articles.filter(
    (a) =>
      a.designation.toLowerCase().includes(recherche.toLowerCase()) ||
      (a.code_barre && a.code_barre.includes(recherche))
  );

  return (
    <div className="space-y-6">
      
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex gap-2">
          <button
            onClick={() => setOnglet('caisse')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
              onglet === 'caisse' ? 'bg-[#005a5b] text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🛒 Caisse & Vente
          </button>
          <button
            onClick={() => setOnglet('stock')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
              onglet === 'stock' ? 'bg-[#005a5b] text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            📦 Gestion Stock ({articles.length})
          </button>
          <button
            onClick={() => setOnglet('historique')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition ${
              onglet === 'historique' ? 'bg-[#005a5b] text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            📜 Historique Ventes
          </button>
        </div>

        <button onClick={chargerArticles} className="text-xs text-[#005a5b] font-bold hover:underline">
          🔄 Actualiser
        </button>
      </div>

      {msg.text && (
        <div className={`p-4 rounded-xl text-sm font-semibold border ${
          msg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'
        }`}>
          {msg.text}
        </div>
      )}

      {onglet === 'caisse' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <input
              type="text"
              placeholder="🔍 Rechercher un produit..."
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005a5b]"
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
              {articlesFiltres.length === 0 ? (
                <p className="col-span-full text-center text-slate-400 text-sm py-8">
                  Aucun article. Ajoutez-en dans l'onglet Stock.
                </p>
              ) : (
                articlesFiltres.map((art) => (
                  <div
                    key={art.id}
                    onClick={() => ajouterAuPanier(art)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between hover:border-[#005a5b] ${
                      art.quantite_stock <= 0 ? 'bg-slate-100 opacity-60 cursor-not-allowed' : 'bg-slate-50 hover:bg-emerald-50/40'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-slate-800 text-sm line-clamp-1">{art.designation}</p>
                      <p className="text-[10px] text-slate-400">{art.categorie || 'Général'}</p>
                    </div>
                    <div className="mt-3 flex justify-between items-end">
                      <span className="text-xs font-mono font-extrabold text-[#005a5b]">{art.prix_vente?.toLocaleString()} F</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        art.quantite_stock <= art.seuil_alerte ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        Stk: {art.quantite_stock}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base mb-3 border-b pb-2 flex justify-between items-center">
                <span>📋 Ticket de Caisse</span>
                <span className="text-xs font-normal text-slate-400">{panier.length} article(s)</span>
              </h3>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {panier.length === 0 ? (
                  <p className="text-center text-slate-400 text-xs py-10">Panier vide.</p>
                ) : (
                  panier.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div className="flex-1 pr-2">
                        <p className="font-bold text-slate-800">{item.designation}</p>
                        <p className="text-[10px] text-slate-500">
                          {item.prix_vente?.toLocaleString()} F x {item.quantite} = <span className="font-bold text-[#005a5b]">{(item.prix_vente * item.quantite).toLocaleString()} F</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => modifierQuantitePanier(item.id, -1)} className="w-6 h-6 bg-slate-200 rounded-lg font-bold">-</button>
                        <span className="font-bold px-1">{item.quantite}</span>
                        <button onClick={() => modifierQuantitePanier(item.id, 1)} className="w-6 h-6 bg-slate-200 rounded-lg font-bold">+</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between items-center text-slate-900 font-black text-lg">
                <span>TOTAL :</span>
                <span className="text-orange-600">{calculerTotalPanier().toLocaleString()} XAF</span>
              </div>
              <select
                value={modePaiement}
                onChange={(e) => setModePaiement(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800"
              >
                <option value="Espèces">💵 Espèces</option>
                <option value="Orange Money">🍊 Orange Money</option>
                <option value="MTN MoMo">💛 MTN MoMo</option>
                <option value="Carte Bancaire">💳 Carte Bancaire</option>
              </select>
              <button
                onClick={validerVente}
                disabled={panier.length === 0 || loading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-extrabold py-3.5 rounded-xl shadow-lg transition text-sm disabled:opacity-50"
              >
                {loading ? 'Validation...' : '🛒 Valider et Encaisser'}
              </button>
            </div>
          </div>
        </div>
      )}

      {onglet === 'stock' && (
        <div className="space-y-6">
          <form onSubmit={handleAjoutProduit} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-sm">➕ Ajouter un article</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <input type="text" placeholder="Code Barre" value={nouveauProduit.code_barre} onChange={(e) => setNouveauProduit({ ...nouveauProduit, code_barre: e.target.value })} className="bg-slate-50 border rounded-xl p-2.5" />
              <input type="text" required placeholder="Désignation *" value={nouveauProduit.designation} onChange={(e) => setNouveauProduit({ ...nouveauProduit, designation: e.target.value })} className="sm:col-span-2 bg-slate-50 border rounded-xl p-2.5" />
              <input type="number" placeholder="Prix Achat" value={nouveauProduit.prix_achat} onChange={(e) => setNouveauProduit({ ...nouveauProduit, prix_achat: parseFloat(e.target.value) || 0 })} className="bg-slate-50 border rounded-xl p-2.5" />
              <input type="number" required placeholder="Prix Vente *" value={nouveauProduit.prix_vente} onChange={(e) => setNouveauProduit({ ...nouveauProduit, prix_vente: parseFloat(e.target.value) || 0 })} className="bg-slate-50 border rounded-xl p-2.5" />
              <input type="number" placeholder="Stock" value={nouveauProduit.quantite_stock} onChange={(e) => setNouveauProduit({ ...nouveauProduit, quantite_stock: parseFloat(e.target.value) || 0 })} className="bg-slate-50 border rounded-xl p-2.5" />
            </div>
            <button type="submit" disabled={loading} className="bg-[#005a5b] text-white font-bold px-5 py-2.5 rounded-xl text-xs">Enregistrer</button>
          </form>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b uppercase font-bold text-slate-500">
                <tr>
                  <th className="p-3.5">Code</th>
                  <th className="p-3.5">Désignation</th>
                  <th className="p-3.5">Prix Achat</th>
                  <th className="p-3.5">Prix Vente</th>
                  <th className="p-3.5">Stock</th>
                  <th className="p-3.5">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {articles.map((art) => (
                  <tr key={art.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono">{art.code_barre || '-'}</td>
                    <td className="p-3.5 font-bold">{art.designation}</td>
                    <td className="p-3.5">{art.prix_achat?.toLocaleString()} F</td>
                    <td className="p-3.5 font-bold text-[#005a5b]">{art.prix_vente?.toLocaleString()} F</td>
                    <td className="p-3.5 font-extrabold">{art.quantite_stock}</td>
                    <td className="p-3.5">
                      {art.quantite_stock <= 0 ? <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">Rupture</span> : <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Normal</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {onglet === 'historique' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-slate-800 text-sm">📜 Historique des ventes</h3>
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 border-b uppercase font-bold text-slate-500">
              <tr>
                <th className="p-3.5">Référence</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Total</th>
                <th className="p-3.5">Paiement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ventes.map((v) => (
                <tr key={v.id}>
                  <td className="p-3.5 font-mono font-bold text-[#005a5b]">{v.reference_facture}</td>
                  <td className="p-3.5">{new Date(v.date_vente).toLocaleString('fr-FR')}</td>
                  <td className="p-3.5 font-extrabold text-orange-600">{v.montant_total?.toLocaleString()} XAF</td>
                  <td className="p-3.5">{v.mode_paiement}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}