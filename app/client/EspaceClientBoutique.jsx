'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import MenuExplorer from '@/components/MenuExplorer'; // Importation du menu Explorer

export default function EspaceClientBoutique() {
  const searchParams = useSearchParams();
  const entrepriseId = searchParams.get('entrepriseId');

  const [articles, setArticles] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [approvisionnements, setApprovisionnements] = useState([]);
  const [nomEntreprise, setNomEntreprise] = useState('');
  const [panier, setPanier] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [valide, setValide] = useState(false);
  const [numeroCommande, setNumeroCommande] = useState('');

  const [vuePanier, setVuePanier] = useState(false);
  const [ongletActif, setOngletActif] = useState('BOUTIQUE'); // 'BOUTIQUE' ou 'EXPLORER'

  const [client, setClient] = useState({
    nom: '',
    telephone: '',
    table: ''
  });

  useEffect(() => {
    async function chargerDonneesBoutiqueUniverselle() {
      if (!entrepriseId) {
        setChargement(false);
        return;
      }
      setChargement(true);
      try {
        const { data: dataEnt } = await supabase
          .from('entreprises')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .maybeSingle();

        if (dataEnt) {
          setNomEntreprise(dataEnt.nom_entreprise || dataEnt.nom || 'RESTAURANT');
        }

        const { data: dataArt, error: errArt } = await supabase
          .from('articles_stock')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .eq('module', 'BOUTIQUE')
          .eq('Disponible_Menu_QR', true);

        if (errArt) throw errArt;
        setArticles(Array.isArray(dataArt) ? dataArt : []);

        const { data: dataMouv } = await supabase
          .from('mouvements_stock')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .eq('module', 'BOUTIQUE');
        setMouvements(dataMouv || []);

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
    const photo = article.Photo || article.photo || '';

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
      setPanier([...panier, { id_article: artId, designation, prix, photo, quantite: 1 }]);
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
  const nombreTotalArticlesPanier = panier.reduce((acc, item) => acc + item.quantite, 0);

  const passerCommande = async (e) => {
    e.preventDefault();
    if (!entrepriseId) {
      alert('Erreur : Identifiant de restaurant introuvable.');
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
        reference: `CLIENT: ${client.nom} (${client.telephone}) - Table/Info: ${client.table || 'Non spécifiée'}`,
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
        <h2 className="text-sm font-black uppercase text-slate-900">Restaurant non identifié</h2>
        <p className="text-xs text-slate-500">Veuillez scanner un QR code valide sur votre table.</p>
      </div>
    );
  }

  if (valide) {
    return (
      <div className="w-full min-h-screen bg-white p-6 text-center space-y-4 font-sans flex flex-col items-center justify-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl shadow-xs">✅</div>
        <h2 className="text-base font-black uppercase text-slate-900">Commande validée avec succès !</h2>
        <p className="text-xs text-slate-600">Votre numéro de commande est : <strong className="text-orange-600 font-mono text-sm">{numeroCommande}</strong></p>
        <p className="text-xs text-slate-500">Merci pour votre commande. Elle est transmise en cuisine pour un service sur place.</p>
        <button
          onClick={() => { setValide(false); setVuePanier(false); setClient({ nom: '', telephone: '', table: '' }); }}
          className="bg-orange-600 hover:bg-orange-500 text-white font-black px-6 py-3 rounded-2xl text-xs mt-4 shadow-md transition w-full max-w-xs"
        >
          Commander à nouveau 🍽️
        </button>
      </div>
    );
  }

  // --- VUE 2 : PAGE PLEIN ÉCRAN DU PANIER ET VALIDATION ---
  if (vuePanier) {
    return (
      <div className="w-full min-h-screen bg-white font-sans text-xs flex flex-col justify-between pb-10">
        <div className="space-y-4">
          <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
            <button
              type="button"
              onClick={() => setVuePanier(false)}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-black px-3 py-2 rounded-xl text-xs transition flex items-center gap-1 shadow-2xs"
            >
              <span>← Continuer mes achats</span>
            </button>
            <h1 className="font-black text-slate-900 uppercase text-xs">mon panier ({nombreTotalArticlesPanier})</h1>
          </div>

          <div className="max-w-md mx-auto w-full p-4 space-y-4">
            {panier.length === 0 ? (
              <div className="bg-white p-10 rounded-2xl text-center space-y-3 border border-slate-200 mt-10">
                <div className="text-3xl">🛒</div>
                <p className="font-bold text-slate-500 text-xs">Votre panier est vide.</p>
                <button
                  onClick={() => setVuePanier(false)}
                  className="bg-orange-600 text-white font-black px-5 py-2.5 rounded-xl text-xs shadow-md"
                >
                  Voir le menu
                </button>
              </div>
            ) : (
              <>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
                  <h2 className="font-black text-slate-900 uppercase text-[11px] border-b pb-2">Articles sélectionnés</h2>
                  
                  <div className="divide-y divide-slate-100 space-y-2.5">
                    {panier.map((item, idx) => {
                      const articleCorrespondant = articles.find(a => String(a.id_article || a.id) === String(item.id_article));
                      const stockReelItem = articleCorrespondant ? calculerStockReel(item.id_article) : 99;

                      return (
                        <div key={idx} className="flex items-center justify-between pt-2.5 gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {item.photo && (
                              <img src={item.photo} alt="" className="w-12 h-12 object-cover rounded-xl border border-slate-200 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <h3 className="font-black text-slate-900 uppercase text-[11px] truncate">{item.designation}</h3>
                              <p className="text-[10px] text-emerald-600 font-bold">{item.prix.toLocaleString()} FCFA</p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className="font-black text-slate-900 text-xs">{item.prix * item.quantite} F</span>
                            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-slate-50">
                              <button type="button" onClick={() => modifierQuantite(idx, -1, stockReelItem)} className="px-2 py-0.5 bg-white font-bold text-slate-700 hover:bg-slate-100">-</button>
                              <span className="px-2 font-black text-slate-900">{item.quantite}</span>
                              <button type="button" onClick={() => modifierQuantite(idx, 1, stockReelItem)} className="px-2 py-0.5 bg-white font-bold text-slate-700 hover:bg-slate-100">+</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="border-t border-slate-200 pt-3 flex justify-between items-center bg-orange-50/50 p-3 rounded-xl mt-2">
                    <span className="font-black text-slate-900 text-xs uppercase">Total à payer :</span>
                    <span className="font-black text-emerald-600 text-sm">{totalPanier.toLocaleString()} FCFA</span>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
                  <h2 className="font-black text-slate-900 uppercase text-[11px] border-b pb-2">Informations de commande</h2>
                  
                  <form onSubmit={passerCommande} className="space-y-3">
                    <div>
                      <label className="block font-bold text-[9px] text-slate-600 uppercase mb-1">Votre Nom complet *</label>
                      <input
                        type="text"
                        required
                        placeholder="EX: JEAN DUPONT"
                        value={client.nom}
                        onChange={(e) => setClient({ ...client, nom: e.target.value.toUpperCase() })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-black uppercase text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[9px] text-slate-600 uppercase mb-1">Numéro de téléphone *</label>
                      <input
                        type="tel"
                        required
                        placeholder="EX: 690000000"
                        value={client.telephone}
                        onChange={(e) => setClient({ ...client, telephone: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-black text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-[9px] text-slate-600 uppercase mb-1">Numéro de Table / Remarque</label>
                      <input
                        type="text"
                        placeholder="EX: TABLE 04 OU TERRASSE"
                        value={client.table}
                        onChange={(e) => setClient({ ...client, table: e.target.value.toUpperCase() })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-black uppercase text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl text-xs uppercase shadow-md transition mt-3 flex items-center justify-center gap-1.5"
                    >
                      <span>Valider la commande ({totalPanier.toLocaleString()} F)</span>
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- VUE PRINCIPALE AVEC SÉLECTION ONGLETS : BOUTIQUE (COMMANDES) OU EXPLORER ---
  return (
    <div className="max-w-md mx-auto p-3 font-sans text-xs space-y-4 bg-slate-50 min-h-screen pb-24">
      
      {/* EN-TÊTE DU RESTAURANT */}
      <div className="bg-white p-3 rounded-2xl border shadow-2xs text-center sticky top-0 z-30 space-y-2">
        <h1 className="font-black text-slate-900 uppercase text-sm">🍽️ {nomEntreprise || 'RESTAURANT'}</h1>
        
        {/* BARRE D'ONGLETS : MENU COMMANDE vs MENU EXPLORER */}
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setOngletActif('BOUTIQUE')}
            className={`py-2 rounded-lg font-black text-[10px] uppercase transition shadow-2xs ${
              ongletActif === 'BOUTIQUE' 
                ? 'bg-orange-600 text-white shadow-xs' 
                : 'bg-transparent text-slate-700 hover:bg-slate-200'
            }`}
          >
            🛍️ Commander (Menu QR)
          </button>
          <button
            type="button"
            onClick={() => setOngletActif('EXPLORER')}
            className={`py-2 rounded-lg font-black text-[10px] uppercase transition shadow-2xs ${
              ongletActif === 'EXPLORER' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'bg-transparent text-slate-700 hover:bg-slate-200'
            }`}
          >
            🧭 Menu Explorer (4TS)
          </button>
        </div>
      </div>

      {/* CONTENU SELON L'ONGLET ACTIF */}
      {ongletActif === 'EXPLORER' ? (
        <MenuExplorer entrepriseId={entrepriseId} />
      ) : (
        <div className="space-y-4">
          {/* BANDEAU FLOTTANT EN HAUT POUR ACCÈS À LA PAGE PANIER */}
          {panier.length > 0 && (
            <div className="sticky top-24 z-40 bg-orange-600 text-white p-3 rounded-2xl shadow-lg flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="bg-white text-orange-600 font-black px-2.5 py-0.5 rounded-full text-xs shadow-xs">
                  {nombreTotalArticlesPanier}
                </span>
                <div>
                  <p className="font-black uppercase text-[11px]">Mon Panier</p>
                  <p className="font-extrabold text-xs text-orange-100">{totalPanier.toLocaleString()} FCFA</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVuePanier(true)}
                className="bg-white text-orange-600 hover:bg-orange-50 font-black px-3.5 py-2 rounded-xl text-xs shadow-md transition flex items-center gap-1"
              >
                <span>Voir le panier 🛒</span>
              </button>
            </div>
          )}

          {/* LISTE DES ARTICLES */}
          <div className="space-y-2">
            <h2 className="font-extrabold text-slate-800 uppercase text-[11px]">Plats & Articles disponibles</h2>
            {chargement ? (
              <p className="text-center text-slate-400 py-6 font-bold">Chargement du menu...</p>
            ) : articles.length === 0 ? (
              <p className="text-center text-slate-400 py-6 italic font-bold">Aucun article disponible pour le moment.</p>
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
        </div>
      )}

    </div>
  );
}