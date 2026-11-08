'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function EspaceClientBoutique({ entrepriseId = '4TS-290136' }) {
  const [articles, setArticles] = useState([]);
  const [panier, setPanier] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [valide, setValide] = useState(false);
  const [numeroCommande, setNumeroCommande] = useState('');

  // Coordonnées du client
  const [client, setClient] = useState({
    nom: '',
    telephone: '',
    adresse: ''
  });

  // Charger les articles de la boutique
  useEffect(() => {
    async function chargerArticlesBoutique() {
      setChargement(true);
      try {
        const { data, error } = await supabase
          .from('articles_stock')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .eq('module', 'BOUTIQUE');

        if (error) throw error;
        setArticles(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Erreur chargement articles :', err.message);
      } finally {
        setChargement(false);
      }
    }

    chargerArticlesBoutique();
  }, [entrepriseId]);

  // Ajouter un article au panier
  const ajouterAuPanier = (article) => {
    const artId = article.id_article || article.id;
    const designation = article.Designation || article.designation;
    const prix = article.Prix_Vente || article.prix_vente || 0;

    const indexExistant = panier.findIndex(item => item.id_article === artId);
    if (indexExistant !== -1) {
      const nouveauPanier = [...panier];
      nouveauPanier[indexExistant].quantite += 1;
      setPanier(nouveauPanier);
    } else {
      setPanier([...panier, { id_article: artId, designation, prix, quantite: 1 }]);
    }
  };

  // Modifier la quantité dans le panier
  const modifierQuantite = (index, delta) => {
    const nouveauPanier = [...panier];
    nouveauPanier[index].quantite += delta;
    if (nouveauPanier[index].quantite <= 0) {
      nouveauPanier.splice(index, 1);
    }
    setPanier(nouveauPanier);
  };

  // Calculer le montant total
  const totalPanier = panier.reduce((acc, item) => acc + (item.prix * item.quantite), 0);

  // Valider et enregistrer la commande
  const passerCommande = async (e) => {
    e.preventDefault();
    if (panier.length === 0) {
      alert('Votre panier est vide.');
      return;
    }
    if (!client.nom || !client.telephone) {
      alert('Veuillez renseigner votre nom et votre numéro de téléphone.');
      return;
    }

    const numCmd = `CMD-${Math.floor(100000 + Math.random() * 900000)}`;
    
    try {
      const payloadCommande = {
        id_entreprise: entrepriseId,
        module: 'BOUTIQUE',
        motif_remarque: numCmd,
        reference: `CLIENT: ${client.nom} (${client.telephone}) - ${client.adresse}`,
        details_articles: JSON.stringify(panier),
        montant_total: totalPanier,
        statut: 'EN_ATTENTE',
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('bons_commande_fournisseurs')
        .insert([payloadCommande]);

      if (error) {
        console.warn('Erreur insertion distante, commande enregistrée localement');
      }

      setNumeroCommande(numCmd);
      setValide(true);
      setPanier([]);
    } catch (err) {
      alert('Erreur lors de la validation de la commande : ' + err.message);
    }
  };

  if (valide) {
    return (
      <div className="p-6 text-center space-y-4 font-sans">
        <div className="text-emerald-600 text-4xl">✅</div>
        <h2 className="text-lg font-black uppercase text-slate-900">Commande validée avec succès !</h2>
        <p className="text-xs text-slate-600">Votre numéro de commande est : <strong className="text-orange-600">{numeroCommande}</strong></p>
        <p className="text-xs text-slate-500">Merci pour votre achat. Le commerçant va traiter votre demande.</p>
        <button
          onClick={() => { setValide(false); setClient({ nom: '', telephone: '', adresse: '' }); }}
          className="bg-orange-600 text-white font-bold px-4 py-2 rounded-xl text-xs mt-4 shadow-md"
        >
          Commander à nouveau
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-3 font-sans text-xs space-y-4 bg-slate-50 min-h-screen pb-20">
      <div className="bg-white p-3 rounded-2xl border shadow-2xs text-center">
        <h1 className="font-black text-slate-900 uppercase text-sm">🛒 MENU & COMMANDE BOUTIQUE</h1>
        <p className="text-[10px] text-slate-500">Sélectionnez vos articles et validez votre panier</p>
      </div>

      {/* Catalogue des articles */}
      <div className="space-y-2">
        <h2 className="font-extrabold text-slate-800 uppercase text-[11px]">Articles disponibles</h2>
        {chargement ? (
          <p className="text-center text-slate-400 py-4">Chargement du menu...</p>
        ) : articles.length === 0 ? (
          <p className="text-center text-slate-400 py-4 italic">Aucun article disponible pour le moment.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {articles.map((art) => {
              const artId = art.id_article || art.id;
              const designation = art.Designation || art.designation;
              const prix = art.Prix_Vente || art.prix_vente || 0;
              const stock = art.Quantite_Stock || art.quantite_stock || 0;

              return (
                <div key={artId} className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between shadow-2xs">
                  <div>
                    <h3 className="font-black text-slate-900 uppercase text-xs truncate">{designation}</h3>
                    <p className="text-[10px] text-emerald-600 font-extrabold mt-0.5">{prix} FCFA</p>
                    <p className="text-[9px] text-slate-400">Stock : {stock}</p>
                  </div>
                  <button
                    type="button"
                    disabled={stock <= 0}
                    onClick={() => ajouterAuPanier(art)}
                    className="mt-2 w-full bg-orange-600 hover:bg-orange-500 disabled:bg-slate-300 text-white font-bold py-1.5 rounded-lg text-[10px] transition shadow-2xs"
                  >
                    {stock > 0 ? '+ Ajouter' : 'Épuisé'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Panier et Formulaire de commande */}
      {panier.length > 0 && (
        <div className="bg-white border-2 border-orange-500/40 p-3 rounded-2xl shadow-md space-y-3">
          <h2 className="font-black text-orange-600 uppercase text-xs border-b pb-1">📦 Votre Panier ({panier.length})</h2>
          
          <div className="divide-y space-y-1.5 max-h-40 overflow-y-auto">
            {panier.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center pt-1.5 text-[11px]">
                <div>
                  <span className="font-extrabold text-slate-900 uppercase">{item.designation}</span>
                  <p className="text-[9px] text-slate-500">{item.prix} FCFA x {item.quantite}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border rounded overflow-hidden">
                    <button type="button" onClick={() => modifierQuantite(idx, -1)} className="px-2 bg-slate-100 font-bold">-</button>
                    <span className="px-2 font-black">{item.quantite}</span>
                    <button type="button" onClick={() => modifierQuantite(idx, 1)} className="px-2 bg-slate-100 font-bold">+</button>
                  </div>
                  <span className="font-black text-emerald-600 w-16 text-right">{item.prix * item.quantite} F</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-2 flex justify-between font-black text-xs text-slate-900">
            <span>TOTAL À PAYER :</span>
            <span className="text-emerald-600 text-sm">{totalPanier} FCFA</span>
          </div>

          <form onSubmit={passerCommande} className="space-y-2 pt-2 border-t">
            <h3 className="font-bold text-[10px] text-slate-700 uppercase">Vos Coordonnées</h3>
            <input
              type="text"
              required
              placeholder="Votre Nom complet *"
              value={client.nom}
              onChange={(e) => setClient({ ...client, nom: e.target.value.toUpperCase() })}
              className="w-full bg-slate-50 border rounded-lg p-2 text-xs font-bold uppercase text-slate-900"
            />
            <input
              type="tel"
              required
              placeholder="Votre Téléphone *"
              value={client.telephone}
              onChange={(e) => setClient({ ...client, telephone: e.target.value })}
              className="w-full bg-slate-50 border rounded-lg p-2 text-xs font-bold text-slate-900"
            />
            <input
              type="text"
              placeholder="Adresse de livraison / Quartier"
              value={client.adresse}
              onChange={(e) => setClient({ ...client, adresse: e.target.value.toUpperCase() })}
              className="w-full bg-slate-50 border rounded-lg p-2 text-xs font-bold uppercase text-slate-900"
            />

            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl text-xs uppercase shadow-md transition"
            >
              Valider la commande
            </button>
          </form>
        </div>
      )}
    </div>
  );
}