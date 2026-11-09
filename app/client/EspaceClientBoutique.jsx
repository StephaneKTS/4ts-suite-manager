'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function EspaceClientBoutique() {
  const searchParams = useSearchParams();
  // Récupération universelle de l'ID de l'entreprise depuis l'URL scannée
  const entrepriseId = searchParams.get('entrepriseId');

  const [articles, setArticles] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [approvisionnements, setApprovisionnements] = useState([]);
  const [nomEntreprise, setNomEntreprise] = useState('');
  const [panier, setPanier] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [valide, setValide] = useState(false);
  const [numeroCommande, setNumeroCommande] = useState('');

  const [client, setClient] = useState({
    nom: '',
    telephone: '',
    adresse: ''
  });

  useEffect(() => {
    async function chargerDonneesBoutiqueUniverselle() {
      if (!entrepriseId) {
        setChargement(false);
        return;
      }
      setChargement(true);
      try {
        // 1. Récupérer le nom de l'entreprise
        const { data: dataEnt } = await supabase
          .from('entreprises')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .maybeSingle();

        if (dataEnt) {
          setNomEntreprise(dataEnt.nom_entreprise || dataEnt.nom || 'BOUTIQUE');
        }

        // 2. Charger les articles visibles au scan QR pour cette entreprise spécifique
        const { data: dataArt, error: errArt } = await supabase
          .from('articles_stock')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .eq('module', 'BOUTIQUE')
          .eq('Disponible_Menu_QR', true);

        if (errArt) throw errArt;
        setArticles(Array.isArray(dataArt) ? dataArt : []);

        // 3. Charger les mouvements pour calculer les stocks réels
        const { data: dataMouv } = await supabase
          .from('mouvements_stock')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .eq('module', 'BOUTIQUE');
        setMouvements(dataMouv || []);

        // 4. Charger les approvisionnements
        const { data: dataAppro } = await supabase
          .from('approvisionnements')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .eq('module', 'BOUTIQUE');
        setApprovisionnements(dataAppro || []);

      } catch (err) {
        console.error('Erreur chargement catalogue :', err.message);
      } finally {
        setChargement(false);
      }
    }

    chargerDonneesBoutiqueUniverselle();
  }, [entrepriseId]);

  const calculerStockReel = (articleId) => {
    let stockInitial = 0;
    let entrees = 0;
    let sorties = 0;

    mouvements.forEach(m => {
      if (String(m.id_article) !== String(articleId)) return;
      const qte = parseInt(m.quantite || 0);
      const typeMvt = (m.type_mouvement || '').toUpperCase();

      if (typeMvt === 'INVENTAIRE') {
        stockInitial = qte;
      } else if (typeMvt === 'SORTIE' || typeMvt === 'AVARIES') {
        sorties += qte;
      } else if (typeMvt === 'ENTREE' || typeMvt === 'APPROVISIONNEMENT') {
        entrees += qte;
      }
    });

    approvisionnements.forEach(app => {
      let listArt = [];
      if (typeof app.details_articles === 'string') {
        try { listArt = JSON.parse(app.details_articles); } catch (e) {}
      } else if (Array.isArray(app.details_articles)) {
        listArt = app.details_articles;
      }

      listArt.forEach(item => {
        if (String(item.id_article || item.article_id) === String(articleId)) {
          entrees += parseInt(item.quantite || 0);
        }
      });
    });

    return Math.max(0, (stockInitial + entrees) - sorties);
  };

  const ajouterAuPanier = (article, stockReel) => {
    const artId = article.id_article || article.id;
    const designation = article.Designation || article.designation;
    const prix = article.Prix_Vente || article.prix_vente || 0;

    const indexExistant = panier.findIndex(item => item.id_article === artId);
    if (indexExistant !== -1) {
      if (panier[indexExistant].quantite >= stockReel) {
        alert('Stock insuffisant pour ajouter davantage de cet article.');
        return;
      }
      const nouveauPanier = [...panier];
      nouveauPanier[indexExistant].quantite += 1;
      setPanier(nouveauPanier);
    } else {
      setPanier([...panier, { id_article: artId, designation, prix, quantite: 1 }]);
    }
  };

  const modifierQuantite = (index, delta, stockReel) => {
    const nouveauPanier = [...panier];
    const nouvelleQte = nouveauPanier[index].quantite + delta;
    
    if (delta > 0 && nouvelleQte > stockReel) {
      alert('Stock maximal atteint.');
      return;
    }

    nouveauPanier[index].quantite = nouvelleQte;
    if (nouveauPanier[index].quantite <= 0) {
      nouveauPanier.splice(index, 1);
    }
    setPanier(nouveauPanier);
  };

  const totalPanier = panier.reduce((acc, item) => acc + (item.prix * item.quantite), 0);

  const passerCommande = async (e) => {
    e.preventDefault();
    if (!entrepriseId) {
      alert('Erreur : Identifiant de boutique introuvable.');
      return;
    }
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

      if (error) throw error;

      setNumeroCommande(numCmd);
      setValide(true);
      setPanier([]);
    } catch (err) {
      alert('Erreur lors de la validation de la commande : ' + err.message);
    }
  };

  if (!entrepriseId) {
    return (
      <div className="p-8 text-center space-y-3 font-sans">
        <div className="text-red-500 text-3xl">⚠️</div>
        <h2 className="text-sm font-black uppercase text-slate-900">Boutique non identifiée</h2>
        <p className="text-xs text-slate-500">Veuillez scanner un QR code valide fourni par votre commerçant.</p>
      </div>
    );
  }

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
        <h1 className="font-black text-slate-900 uppercase text-sm">🛒 {nomEntreprise || 'BOUTIQUE'}</h1>
        <p className="text-[10px] text-slate-500">Sélectionnez vos articles et validez votre panier</p>
      </div>

      <div className="space-y-2">
        <h2 className="font-extrabold text-slate-800 uppercase text-[11px]">Articles disponibles</h2>
        {chargement ? (
          <p className="text-center text-slate-400 py-4">Chargement du menu...</p>
        ) : articles.length === 0 ? (
          <p className="text-center text-slate-400 py-4 italic">Aucun article disponible pour le moment.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {articles.map((art) => {
              const artId = art.id_article || art.id;
              const designation = art.Designation || art.designation;
              const prix = art.Prix_Vente || art.prix_vente || 0;
              const photoUrl = art.Photo || art.photo || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500';
              const stockReel = calculerStockReel(artId);

              return (
                <div 
                  key={artId} 
                  className="bg-white rounded-2xl shadow-xs border border-slate-100 overflow-hidden flex flex-col justify-between transition hover:shadow-md"
                >
                  {/* 1. Image du produit en haut */}
                  <div className="relative w-full h-32 bg-slate-100 overflow-hidden">
                    <img 
                      src={photoUrl} 
                      alt={designation} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500';
                      }}
                    />
                    {stockReel <= 0 && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-slate-900/80 text-white font-black text-[10px] px-2.5 py-1 rounded-full uppercase tracking-wider">
                          Épuisé
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 2. Informations du produit (Prix en premier, puis désignation) */}
                  <div className="p-2.5 flex flex-col flex-1 justify-between space-y-2">
                    <div>
                      <div className="font-black text-slate-900 text-xs tracking-tight text-emerald-600">
                        {prix.toLocaleString()} FCFA
                      </div>
                      <div className="font-extrabold text-slate-700 text-[11px] uppercase line-clamp-2 mt-0.5">
                        {designation}
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold mt-0.5">
                        Stock : {stockReel}
                      </div>
                    </div>

                    {/* 3. Bouton d'action / Ajout au panier */}
                    <button
                      type="button"
                      disabled={stockReel <= 0}
                      onClick={() => ajouterAuPanier(art, stockReel)}
                      className={`w-full py-1.5 rounded-xl font-black text-[10px] transition shadow-xs flex items-center justify-center gap-1 ${
                        stockReel > 0 
                          ? 'bg-orange-600 hover:bg-orange-500 text-white active:scale-95' 
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {stockReel > 0 ? '+ Ajouter' : 'Épuisé'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {panier.length > 0 && (
        <div className="bg-white border-2 border-orange-500/40 p-3 rounded-2xl shadow-md space-y-3">
          <h2 className="font-black text-orange-600 uppercase text-xs border-b pb-1">📦 Votre Panier ({panier.length})</h2>
          
          <div className="divide-y space-y-1.5 max-h-40 overflow-y-auto">
            {panier.map((item, idx) => {
              const articleCorrespondant = articles.find(a => String(a.id_article || a.id) === String(item.id_article));
              const stockReelItem = articleCorrespondant ? calculerStockReel(item.id_article) : 99;

              return (
                <div key={idx} className="flex justify-between items-center pt-1.5 text-[11px]">
                  <div>
                    <span className="font-extrabold text-slate-900 uppercase">{item.designation}</span>
                    <p className="text-[9px] text-slate-500">{item.prix} FCFA x {item.quantite}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center border rounded overflow-hidden">
                      <button type="button" onClick={() => modifierQuantite(idx, -1, stockReelItem)} className="px-2 bg-slate-100 font-bold">-</button>
                      <span className="px-2 font-black">{item.quantite}</span>
                      <button type="button" onClick={() => modifierQuantite(idx, 1, stockReelItem)} className="px-2 bg-slate-100 font-bold">+</button>
                    </div>
                    <span className="font-black text-emerald-600 w-16 text-right">{item.prix * item.quantite} F</span>
                  </div>
                </div>
              );
            })}
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