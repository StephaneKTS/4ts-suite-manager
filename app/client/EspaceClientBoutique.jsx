'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import MenuExplorer from '../dashboard/components/MenuExplorer';

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
  const [ongletActif, setOngletActif] = useState('BOUTIQUE'); // 'BOUTIQUE', 'SUIVI', ou 'EXPLORER'

  // Gestion du suivi des commandes client par téléphone
  const [telephoneRecherche, setTelephoneRecherche] = useState('');
  const [mesCommandesClient, setMesCommandesClient] = useState([]);
  const [commandeEnCoursModification, setCommandeEnCoursModification] = useState(null);

  const [client, setClient] = useState({
    nom: '',
    telephone: '',
    table: '',
    modePaiement: 'ESPECES'
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

  // Actualisation automatique des commandes du client en arrière-plan (toutes les 5 secondes si le numéro est renseigné)
  useEffect(() => {
    if (ongletActif === 'SUIVI' && telephoneRecherche.trim()) {
      const interval = setInterval(async () => {
        try {
          const { data } = await supabase
            .from('commandes_clients_qr')
            .select('*')
            .eq('id_entreprise', entrepriseId)
            .eq('telephone_client', telephoneRecherche.trim())
            .order('created_at', { ascending: false });

          if (data) setMesCommandesClient(data);
        } catch (e) {}
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [ongletActif, telephoneRecherche, entrepriseId]);

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

    try {
      if (commandeEnCoursModification) {
        const montantTotalModif = panier.reduce((acc, item) => acc + (item.prix * item.quantite), 0);
        const { error } = await supabase
          .from('commandes_clients_qr')
          .update({
            details_articles: JSON.stringify(panier),
            montant_total: montantTotalModif,
            numero_table: client.table || 'N/A',
            mode_paiement: client.modePaiement
          })
          .eq('id', commandeEnCoursModification.id)
          .eq('statut', 'EN_ATTENTE');

        if (error) throw error;

        alert('Commande modifiée avec succès !');
        setNumeroCommande(commandeEnCoursModification.numero_commande);
        setCommandeEnCoursModification(null);
        setPanier([]);
        setValide(true);
      } else {
        const maintenant = new Date();
        const annee = maintenant.getFullYear();
        const mois = String(maintenant.getMonth() + 1).padStart(2, '0');
        const jour = String(maintenant.getDate()).padStart(2, '0');
        const heure = String(maintenant.getHours()).padStart(2, '0');
        const minute = String(maintenant.getMinutes()).padStart(2, '0');
        const seconde = String(maintenant.getSeconds()).padStart(2, '0');
        const codeUnique = Math.floor(100 + Math.random() * 900);

        const nomClientClean = client.nom.trim().replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
        const numCmd = `${annee}${mois}${jour}-${heure}${minute}${seconde}-${nomClientClean}-${codeUnique}`;
        
        const payloadCommande = {
          id_entreprise: entrepriseId,
          numero_commande: numCmd,
          nom_client: client.nom.toUpperCase(),
          telephone_client: client.telephone,
          numero_table: client.table || 'N/A',
          details_articles: JSON.stringify(panier),
          montant_total: totalPanier,
          statut: 'EN_ATTENTE',
          statut_paiement: 'NON_PAYE',
          mode_paiement: client.modePaiement,
          created_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('commandes_clients_qr')
          .insert([payloadCommande]);

        if (error) throw error;

        setNumeroCommande(numCmd);
        setValide(true);
        setPanier([]);
      }
    } catch (err) {
      alert('Erreur lors de la validation de la commande : ' + err.message);
    }
  };

  const rechercherMesCommandes = async (e) => {
    if (e) e.preventDefault();
    if (!telephoneRecherche.trim()) {
      alert('Veuillez entrer votre numéro de téléphone.');
      return;
    }
    setChargement(true);
    try {
      const { data, error } = await supabase
        .from('commandes_clients_qr')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('telephone_client', telephoneRecherche.trim())
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMesCommandesClient(data || []);
    } catch (err) {
      console.error('Erreur recherche commandes :', err.message);
    } finally {
      setChargement(false);
    }
  };

  const preparerModification = (cmd) => {
    if (cmd.statut !== 'EN_ATTENTE') {
      alert('Cette commande est déjà prise en charge et ne peut plus être modifiée.');
      return;
    }
    try {
      const articlesCmd = JSON.parse(cmd.details_articles || '[]');
      setPanier(articlesCmd);
      setClient({
        nom: cmd.nom_client || '',
        telephone: cmd.telephone_client || '',
        table: cmd.numero_table || '',
        modePaiement: cmd.mode_paiement || 'ESPECES'
      });
      setCommandeEnCoursModification(cmd);
      setOngletActif('BOUTIQUE');
      setVuePanier(true);
    } catch (e) {
      alert('Erreur lors du chargement des articles de la commande.');
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
        <p className="text-[11px] text-slate-600">Votre numéro de commande est : <strong className="text-orange-600 font-mono text-xs block mt-1">{numeroCommande}</strong></p>
        <p className="text-xs text-slate-500">Merci pour votre commande. Elle est transmise pour un service sur place.</p>
        <div className="flex gap-2 w-full max-w-xs mt-4">
          <button
            onClick={() => { setValide(false); setVuePanier(false); setCommandeEnCoursModification(null); setClient({ nom: '', telephone: '', table: '', modePaiement: 'ESPECES' }); }}
            className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-black px-4 py-3 rounded-2xl text-xs shadow-md transition"
          >
            Commander 🍽️
          </button>
          <button
            onClick={() => { setValide(false); setVuePanier(false); setOngletActif('SUIVI'); }}
            className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-black px-4 py-3 rounded-2xl text-xs shadow-md transition"
          >
            Suivre l'état 👁️
          </button>
        </div>
      </div>
    );
  }

  if (vuePanier) {
    return (
      <div className="w-full min-h-screen bg-white font-sans text-xs flex flex-col justify-between pb-10">
        <div className="space-y-4">
          <div className="bg-white px-4 py-3 border-b border-slate-100 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
            <button
              type="button"
              onClick={() => { setVuePanier(false); setCommandeEnCoursModification(null); }}
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-black px-3 py-2 rounded-xl text-xs transition flex items-center gap-1 shadow-2xs"
            >
              <span>← Continuer mes achats</span>
            </button>
            <h1 className="font-black text-slate-900 uppercase text-xs">
              {commandeEnCoursModification ? 'Modifier ma commande' : `mon panier (${nombreTotalArticlesPanier})`}
            </h1>
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
                        value={client.nom}
                        onChange={(e) => setClient({ ...client, nom: e.target.value.toUpperCase() })}
                        onFocus={(e) => e.target.select()}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-black uppercase text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-[9px] text-slate-600 uppercase mb-1">Numéro de téléphone *</label>
                        <input
                          type="tel"
                          required
                          value={client.telephone}
                          onChange={(e) => setClient({ ...client, telephone: e.target.value })}
                          onFocus={(e) => e.target.select()}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-black text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block font-bold text-[9px] text-slate-600 uppercase mb-1">Numéro de Table / Remarque</label>
                        <input
                          type="text"
                          value={client.table}
                          onChange={(e) => setClient({ ...client, table: e.target.value.toUpperCase() })}
                          onFocus={(e) => e.target.select()}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-black uppercase text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-[9px] text-slate-600 uppercase mb-1">Mode de paiement *</label>
                      <select
                        value={client.modePaiement}
                        onChange={(e) => setClient({ ...client, modePaiement: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-black text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                      >
                        <option value="ESPECES">Espèces (À la caisse / Table)</option>
                        <option value="MOBILE_MONEY">Mobile Money (Orange / MTN)</option>
                        <option value="CARTE">Carte bancaire</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl text-xs uppercase shadow-md transition mt-3 flex items-center justify-center gap-1.5"
                    >
                      <span>{commandeEnCoursModification ? 'Enregistrer les modifications' : `Valider la commande (${totalPanier.toLocaleString()} F)`}</span>
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

  return (
    <div className="max-w-md mx-auto p-3 font-sans text-xs space-y-4 bg-slate-50 min-h-screen pb-24">
      
      <div className="bg-white p-3 rounded-2xl border shadow-2xs text-center sticky top-0 z-30 space-y-2">
        <h1 className="font-black text-slate-900 uppercase text-sm">🍽️ {nomEntreprise || 'RESTAURANT'}</h1>
        
        <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setOngletActif('BOUTIQUE')}
            className={`py-2 rounded-lg font-black text-[9px] uppercase transition shadow-2xs ${
              ongletActif === 'BOUTIQUE' 
                ? 'bg-orange-600 text-white shadow-xs' 
                : 'bg-transparent text-slate-700 hover:bg-slate-200'
            }`}
          >
            🛍️ COMMANDER
          </button>
          <button
            type="button"
            onClick={() => setOngletActif('SUIVI')}
            className={`py-2 rounded-lg font-black text-[9px] uppercase transition shadow-2xs ${
              ongletActif === 'SUIVI' 
                ? 'bg-orange-600 text-white shadow-xs' 
                : 'bg-transparent text-slate-700 hover:bg-slate-200'
            }`}
          >
            📋 MES COMMANDES
          </button>
          <button
            type="button"
            onClick={() => setOngletActif('EXPLORER')}
            className={`py-2 rounded-lg font-black text-[9px] uppercase transition shadow-2xs ${
              ongletActif === 'EXPLORER' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'bg-transparent text-slate-700 hover:bg-slate-200'
            }`}
          >
            🧭 EXPLORER
          </button>
        </div>
      </div>

      {ongletActif === 'EXPLORER' ? (
        <MenuExplorer entrepriseId={entrepriseId} />
      ) : ongletActif === 'SUIVI' ? (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <h2 className="font-black text-slate-900 uppercase text-xs">Suivre mes commandes en temps réel</h2>
            <form onSubmit={rechercherMesCommandes} className="space-y-2">
              <div>
                <label className="block font-bold text-[9px] text-slate-600 uppercase mb-1">Votre numéro de téléphone</label>
                <input
                  type="tel"
                  required
                  placeholder="Ex: 655597099"
                  value={telephoneRecherche}
                  onChange={(e) => setTelephoneRecherche(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-black text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-2.5 rounded-xl text-xs uppercase shadow-md transition"
              >
                Rechercher mes commandes 🔍
              </button>
            </form>
          </div>

          <div className="space-y-3">
            {chargement ? (
              <p className="text-center text-slate-400 py-6 font-bold">Chargement...</p>
            ) : mesCommandesClient.length === 0 ? (
              <p className="text-center text-slate-400 py-6 italic font-bold">Aucune commande trouvée pour ce numéro.</p>
            ) : (
              mesCommandesClient.map((cmd) => {
                let detailsArticles = [];
                try {
                  detailsArticles = JSON.parse(cmd.details_articles || '[]');
                } catch (e) {}

                let badgeColor = 'bg-orange-100 text-orange-800 border-orange-300';
                if (cmd.statut === 'EN_COURS') badgeColor = 'bg-blue-100 text-blue-800 border-blue-300';
                if (cmd.statut === 'SERVI') badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';

                const estPaye = cmd.statut_paiement === 'PAYE';

                return (
                  <div key={cmd.id} className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-3">
                    <div className="flex justify-between items-start border-b pb-2">
                      <div>
                        <span className="font-mono font-black text-orange-600 text-[11px] block">{cmd.numero_commande}</span>
                        <span className="text-[9px] text-slate-400 font-bold">
                          {new Date(cmd.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(cmd.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full font-black text-[9px] border uppercase ${badgeColor}`}>
                        {cmd.statut === 'EN_ATTENTE' ? 'En attente' : cmd.statut === 'EN_COURS' ? 'Encours' : 'Servi ✅'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-xl border flex justify-between items-center text-[10px]">
                      <div>
                        <p className="font-bold text-slate-700">📍 Table : <strong className="text-slate-900">{cmd.numero_table}</strong></p>
                        <p className="font-bold text-slate-500">💳 Paiement : {cmd.mode_paiement || 'ESPECES'}</p>
                      </div>
                      <div>
                        <span className={`px-2 py-1 rounded-md font-black text-[9px] uppercase border ${estPaye ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-red-100 text-red-800 border-red-300'}`}>
                          {estPaye ? 'Payé 🟢' : 'Non payé 🔴'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="divide-y divide-slate-100 max-h-24 overflow-y-auto">
                        {detailsArticles.map((art, idx) => (
                          <div key={idx} className="flex justify-between items-center py-1 text-[10px]">
                            <span className="font-bold text-slate-700">{art.designation} x{art.quantite}</span>
                            <span className="font-mono font-bold text-slate-900">{(art.prix * art.quantite).toLocaleString()} F</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t flex justify-between items-center">
                      <span className="font-black text-slate-900 text-xs">Total : <strong className="text-emerald-600">{Number(cmd.montant_total).toLocaleString()} FCFA</strong></span>
                      
                      {cmd.statut === 'EN_ATTENTE' ? (
                        <button
                          type="button"
                          onClick={() => preparerModification(cmd)}
                          className="bg-orange-600 hover:bg-orange-500 text-white font-black px-3 py-1.5 rounded-lg text-[9px] uppercase transition shadow-2xs"
                        >
                          Modifier ✏️
                        </button>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-400 italic">🔒 Verrouillé</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
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