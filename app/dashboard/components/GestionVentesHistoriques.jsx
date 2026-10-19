'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtdqodqhkdxanrelxtrq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GestionVentesHistoriques({ entrepriseId = '4TS-TEST' }) {
  const [ventes, setVentes] = useState([]);
  const [articlesStock, setArticlesStock] = useState([]);
  const [clientsList, setClientsList] = useState([]);
  const [caissesList, setCaissesList] = useState([]);
  const [chargement, setChargement] = useState(false);
  
  const [recherche, setRecherche] = useState('');
  const [filtreModePaiement, setFiltreModePaiement] = useState('TOUS');
  const [ticketSelectionne, setTicketSelectionne] = useState(null);

  const [modeSaisie, setModeSaisie] = useState(true);

  // En-tête du ticket et sélection de la caisse
  const [caisseId, setCaisseId] = useState('');
  const [codeCaisseActif, setCodeCaisseActif] = useState('C01');
  const [numeroTicket, setNumeroTicket] = useState('');
  const [dateJour, setDateJour] = useState('');
  const [modePaiementTicket, setModePaiementTicket] = useState('ESPECES');
  const [clientId, setClientId] = useState('');
  const [clientNomSelectionne, setClientNomSelectionne] = useState('Clients Divers');
  const [nomClientLibre, setNomClientLibre] = useState('');

  const [afficherModalClient, setAfficherModalClient] = useState(false);
  const [rechercheClientInput, setRechercheClientInput] = useState('');
  
  const [afficherModalArticle, setAfficherModalArticle] = useState(false);
  const [rechercheArticleInput, setRechercheArticleInput] = useState('');

  const [panier, setPanier] = useState([]);
  const [remisePct, setRemisePct] = useState(0);
  const [tvaPct, setTvaPct] = useState(0);

  const [colonneTri, setColonneTri] = useState('created_at');
  const [ordreAsc, setOrdreAsc] = useState(false);

  const genererNumeroTicket = (code, totalVentes) => {
    return `${code || 'C01'}-${String(totalVentes + 1).padStart(6, '0')}`;
  };

  const chargerDonnees = async () => {
    setChargement(true);
    try {
      const [resVentes, resArticles, resClients, resCaisses] = await Promise.all([
        supabase.from('ventes_historiques').select('*').eq('id_entreprise', entrepriseId).order('created_at', { ascending: false }),
        supabase.from('articles_stock').select('*').eq('ID_Entreprise', entrepriseId),
        supabase.from('clients').select('*').eq('id_entreprise', entrepriseId),
        supabase.from('caisses').select('*').eq('id_entreprise', entrepriseId)
      ]);

      if (resVentes.error) throw resVentes.error;
      if (resArticles.error) throw resArticles.error;
      if (resClients.error) throw resClients.error;
      if (resCaisses.error) throw resCaisses.error;

      const ventesData = resVentes.data || [];
      const clientsData = resClients.data || [];
      const caissesData = resCaisses.data || [];
      
      setVentes(ventesData);
      setArticlesStock(resArticles.data || []);
      setClientsList(clientsData);
      setCaissesList(caissesData);

      setDateJour(new Date().toISOString().split('T')[0]);

      if (caissesData.length > 0) {
        setCaisseId(caissesData[0].id);
        const code = caissesData[0].code_caisse || 'C01';
        setCodeCaisseActif(code);
        setNumeroTicket(genererNumeroTicket(code, ventesData.length));
      }

      const clientDivers = clientsData.find(c => (c.nom_client || '').toLowerCase().includes('divers'));
      if (clientDivers) {
        setClientId(clientDivers.id);
        setClientNomSelectionne(clientDivers.nom_client);
      } else if (clientsData.length > 0) {
        setClientId(clientsData[0].id);
        setClientNomSelectionne(clientsData[0].nom_client || 'Client');
      }

    } catch (err) {
      console.error('Erreur chargement :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, [entrepriseId]);

  const changerCaisseSelectionnee = (idCaisseSel) => {
    setCaisseId(idCaisseSel);
    const trouve = caissesList.find(c => c.id === idCaisseSel);
    if (trouve) {
      const code = trouve.code_caisse || 'C01';
      setCodeCaisseActif(code);
      setNumeroTicket(genererNumeroTicket(code, ventes.length));
    }
  };

  const selectionnerClient = (client) => {
    setClientId(client.id);
    setClientNomSelectionne(client.nom_client || 'Client');
    setAfficherModalClient(false);
    setTimeout(() => {
      setAfficherModalArticle(true);
    }, 100);
  };

  const ajouterAuPanier = (article) => {
    const articleId = article.id_article || article.id;
    const designation = article.Designation || article.designation || article.nom;
    const prixU = Number(article.Prix_Vente || article.prix_vente || article.prix || 0);

    const existant = panier.find((item) => item.id === articleId);
    if (existant) {
      setPanier(panier.map((item) => (item.id === articleId ? { ...item, quantite: item.quantite + 1 } : item)));
    } else {
      setPanier([...panier, { id: articleId, designation, prix_unitaire: prixU, quantite: 1 }]);
    }
    setAfficherModalArticle(false);
  };

  const modifierQuantite = (id, qte) => {
    if (qte <= 0) {
      setPanier(panier.filter((item) => item.id !== id));
    } else {
      setPanier(panier.map((item) => (item.id === id ? { ...item, quantite: qte } : item)));
    }
  };

  const handleKeyDownQuantite = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      setAfficherModalArticle(true);
    }
  };

  const sousTotalPanier = panier.reduce((acc, item) => acc + item.quantite * Number(item.prix_unitaire || 0), 0);
  const montantRemise = (sousTotalPanier * Number(remisePct)) / 100;
  const baseImposable = sousTotalPanier - montantRemise;
  const montantTva = (baseImposable * Number(tvaPct)) / 100;
  const totalFinal = baseImposable + montantTva;

  const validerEtEnregistrerVente = async () => {
    if (panier.length === 0) {
      alert('⚠️ Le panier est vide.');
      return;
    }

    let nomClientFacture = nomClientLibre.trim() || clientNomSelectionne || 'Clients Divers';

    try {
      const payload = {
        id_entreprise: entrepriseId,
        numero_ticket: numeroTicket,
        mode_paiement: modePaiementTicket,
        total_montant: totalFinal,
        montant_regle: totalFinal,
        details_articles: panier,
        id_caisse: caisseId || null
      };

      const { error } = await supabase.from('ventes_historiques').insert([payload]);
      if (error) throw error;

      alert(`✅ Ticket ${numeroTicket} (${nomClientFacture}) enregistré avec succès !`);
      setPanier([]);
      setNomClientLibre('');
      setRemisePct(0);
      setTvaPct(0);
      chargerDonnees();
      setModeSaisie(false);
    } catch (err) {
      alert('Erreur enregistrement : ' + err.message);
    }
  };

  const supprimerTicket = async (id) => {
    if (!confirm('Voulez-vous vraiment supprimer ce ticket ?')) return;
    try {
      const { error } = await supabase.from('ventes_historiques').delete().eq('id', id);
      if (error) throw error;
      setTicketSelectionne(null);
      chargerDonnees();
    } catch (err) {
      alert('Erreur suppression : ' + err.message);
    }
  };

  const ventesFiltrees = ventes.filter((v) => {
    const numTicket = (v.numero_ticket || '').toLowerCase();
    const matchQuery = numTicket.includes(recherche.toLowerCase());
    const matchPaiement = filtreModePaiement === 'TOUS' || (v.mode_paiement || '').toUpperCase() === filtreModePaiement.toUpperCase();
    return matchQuery && matchPaiement;
  });

  const clientsFiltres = clientsList.filter(c => (c.nom_client || '').toLowerCase().includes(rechercheClientInput.toLowerCase()));
  const articlesFiltres = articlesStock.filter(a => (a.Designation || a.nom || '').toLowerCase().includes(rechercheArticleInput.toLowerCase()));

  return (
    <div className="space-y-2 text-[10px] font-sans">
      
      {/* BARRE DE NAVIGATION INTERNE */}
      <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
        <button
          onClick={() => setModeSaisie(true)}
          className={`flex-1 py-1 text-center font-bold rounded-md transition text-[10px] ${
            modeSaisie ? 'bg-orange-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          🛒 Caisse & Vente Directe
        </button>
        <button
          onClick={() => setModeSaisie(false)}
          className={`flex-1 py-1 text-center font-bold rounded-md transition text-[10px] ${
            !modeSaisie ? 'bg-orange-600 text-white shadow-2xs' : 'text-slate-600 hover:bg-slate-200'
          }`}
        >
          📋 Historique des Tickets ({ventes.length})
        </button>
      </div>

      {/* MODE 1 : SAISIE DE CAISSE */}
      {modeSaisie ? (
        <div className="space-y-2">
          
          {/* EN-TÊTE ULTRA-COMPACT (CAISSE, DATE, N° TICKET, CLIENT, CLT LIBRE) */}
          <div className="bg-white border border-slate-200 rounded-lg p-2 grid grid-cols-5 gap-1.5 items-center">
            <div>
              <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter">CAISSE</label>
              <select
                value={caisseId}
                onChange={(e) => changerCaisseSelectionnee(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 font-bold text-[10px] text-slate-800"
              >
                {caissesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code_caisse || 'C01'} - {c.nom_caisse}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter">DATE</label>
              <input
                type="date"
                value={dateJour}
                onChange={(e) => setDateJour(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 font-mono font-bold text-[10px]"
              />
            </div>

            <div>
              <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter">N° TICKET</label>
              <input
                type="text"
                readOnly
                value={numeroTicket}
                className="w-full bg-slate-100 border border-slate-200 rounded px-1 py-0.5 font-mono font-black text-orange-600 text-[10px]"
              />
            </div>

            <div>
              <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter">CLIENT</label>
              <div
                onClick={() => setAfficherModalClient(true)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-[10px] text-slate-800 cursor-pointer flex justify-between items-center h-[24px]"
              >
                <span className="truncate">{clientNomSelectionne}</span>
                <span className="text-[9px] text-slate-400">🔍</span>
              </div>
            </div>

            <div>
              <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-tighter">CLT LIBRE</label>
              <input
                type="text"
                value={nomClientLibre}
                onChange={(e) => setNomClientLibre(e.target.value)}
                placeholder="Nom libre..."
                className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-[10px] font-medium"
              />
            </div>
          </div>

          {/* ZONE PRINCIPALE : PANIER ET ARTICLES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            
            {/* COLONNE GAUCHE : RECHERCHE ARTICLE */}
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col h-[350px]">
              <div className="flex justify-between items-center mb-2">
                <span className="font-extrabold text-slate-700 text-[10px] uppercase">Articles en stock</span>
                <button
                  onClick={() => setAfficherModalArticle(true)}
                  className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-2 py-1 rounded text-[10px] shadow-2xs"
                >
                  🔍 Rechercher Article
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {panier.length === 0 ? (
                  <p className="text-center text-slate-400 py-16 text-[10px]">Cliquez sur &laquo; Rechercher Article &raquo; pour ajouter.</p>
                ) : (
                  articlesStock.map((art) => {
                    const artId = art.id_article || art.id;
                    const artDes = art.Designation || art.nom;
                    const artPrix = Number(art.Prix_Vente || art.prix_vente || 0);
                    const artStock = art.Quantite_Stock ?? art.stock_actuel ?? 0;
                    return (
                      <div
                        key={artId}
                        onClick={() => ajouterAuPanier(art)}
                        className="p-1.5 bg-slate-50 hover:bg-orange-50 border border-slate-200 rounded flex justify-between items-center cursor-pointer transition"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{artDes}</p>
                          <p className="text-[9px] text-slate-500 font-mono">Stock : {artStock}</p>
                        </div>
                        <span className="font-black text-emerald-700 font-mono text-xs">
                          {artPrix.toLocaleString('fr-FR')} F
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* COLONNE DROITE : PANIER & FINANCES */}
            <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col justify-between h-[350px]">
              <div className="space-y-2">
                <div className="flex justify-between items-center border-b border-slate-100 pb-1">
                  <span className="font-extrabold text-slate-800 uppercase text-[10px]">Panier & Règlements</span>
                  <select
                    value={modePaiementTicket}
                    onChange={(e) => setModePaiementTicket(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] font-bold text-slate-700"
                  >
                    <option value="ESPECES">Espèces</option>
                    <option value="MOBILE_MONEY">Mobile Money</option>
                    <option value="CARTE">Carte Bancaire</option>
                    <option value="CREDIT">Crédit</option>
                  </select>
                </div>

                <div className="overflow-y-auto h-[170px] space-y-1 divide-y divide-slate-100">
                  {panier.length === 0 ? (
                    <p className="text-center text-slate-400 py-12 text-[10px]">Le panier est vide.</p>
                  ) : (
                    panier.map((item) => (
                      <div key={item.id} className="pt-1 flex justify-between items-center text-[10px]">
                        <div>
                          <p className="font-bold text-slate-800">{item.designation}</p>
                          <p className="text-[9px] text-slate-500 font-mono">
                            {Number(item.prix_unitaire).toLocaleString('fr-FR')} F x {item.quantite}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => modifierQuantite(item.id, item.quantite - 1)} className="w-4 h-4 bg-slate-100 rounded font-bold">-</button>
                          <input
                            type="number"
                            value={item.quantite}
                            onChange={(e) => modifierQuantite(item.id, Number(e.target.value))}
                            onKeyDown={handleKeyDownQuantite}
                            className="w-10 bg-slate-50 border border-slate-200 rounded text-center font-bold font-mono text-[10px]"
                          />
                          <button onClick={() => modifierQuantite(item.id, item.quantite + 1)} className="w-4 h-4 bg-slate-100 rounded font-bold">+</button>
                          <span className="font-black text-emerald-700 font-mono ml-1 w-14 text-right">
                            {Number(item.quantite * item.prix_unitaire).toLocaleString('fr-FR')} F
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* PIED DE PAGE : REMISE, TVA ET VALIDATION */}
              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                <div className="flex gap-2 items-center">
                  <div className="flex-1 flex items-center gap-1">
                    <span className="text-[9px] font-bold text-slate-500">Remise % :</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={remisePct}
                      onChange={(e) => setRemisePct(e.target.value)}
                      className="w-14 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center text-[10px] font-mono font-bold"
                    />
                  </div>
                  <div className="flex-1 flex items-center gap-1">
                    <span className="text-[9px] font-bold text-slate-500">TVA % :</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={tvaPct}
                      onChange={(e) => setTvaPct(e.target.value)}
                      className="w-14 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center text-[10px] font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-slate-100">
                  <div>
                    <span className="text-[8px] uppercase text-slate-400 font-bold block">Total net à payer :</span>
                    <span className="font-black text-emerald-700 font-mono text-xs">
                      {totalFinal.toLocaleString('fr-FR')} F CFA
                    </span>
                  </div>
                  <button
                    onClick={validerEtEnregistrerVente}
                    disabled={panier.length === 0}
                    className={`font-bold px-3 py-1.5 rounded text-[10px] transition shadow-2xs ${
                      panier.length > 0 ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Valider & Encaisser
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* MODE 2 : HISTORIQUE DES TICKETS */
        <div className="space-y-2">
          <div className="bg-white p-2 rounded-lg border border-slate-200 flex items-center justify-between gap-2 shadow-2xs">
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher ticket..."
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] w-full focus:outline-none font-medium"
            />
            <select
              value={filtreModePaiement}
              onChange={(e) => setFiltreModePaiement(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-bold text-slate-700"
            >
              <option value="TOUS">Tous modes</option>
              <option value="ESPECES">Espèces</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
              <option value="CARTE">Carte</option>
            </select>
          </div>

          {chargement ? (
            <div className="p-4 text-center text-slate-400 text-[10px]">Chargement...</div>
          ) : ventesFiltrees.length === 0 ? (
            <div className="p-4 text-center text-slate-400 bg-white border border-slate-200 rounded-lg text-[10px]">
              Aucun ticket enregistré.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg bg-white shadow-2xs">
              <table className="w-full text-left text-[10px]">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase text-[8px] font-black select-none">
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">N° Ticket</th>
                    <th className="p-2">Mode</th>
                    <th className="p-2">Articles</th>
                    <th className="p-2 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10px]">
                  {ventesFiltrees.map((v) => {
                    const detailsArr = Array.isArray(v.details_articles) ? v.details_articles : [];
                    return (
                      <tr
                        key={v.id}
                        onClick={() => setTicketSelectionne(v)}
                        className="hover:bg-slate-50/80 cursor-pointer transition"
                      >
                        <td className="p-2 text-slate-500 font-mono text-[9px]">
                          {v.created_at ? new Date(v.created_at).toLocaleDateString('fr-FR') : '-'}
                        </td>
                        <td className="p-2 font-mono font-bold text-orange-600">{v.numero_ticket || '-'}</td>
                        <td className="p-2 font-bold text-slate-700">{v.mode_paiement || 'Espèces'}</td>
                        <td className="p-2 text-slate-600">{detailsArr.length} article(s)</td>
                        <td className="p-2 text-right font-black text-emerald-700 font-mono">
                          {Number(v.montant_regle || v.total_montant || 0).toLocaleString('fr-FR')} F
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL RECHERCHE CLIENT */}
      {afficherModalClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-2.5 bg-slate-900 text-white flex justify-between items-center text-[11px] font-bold">
              <span>SÉLECTIONNER UN CLIENT</span>
              <button onClick={() => setAfficherModalClient(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-3 space-y-2 overflow-y-auto">
              <input
                type="text"
                autoFocus
                value={rechercheClientInput}
                onChange={(e) => setRechercheClientInput(e.target.value)}
                placeholder="Rechercher un client..."
                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] focus:outline-none font-medium"
              />
              <div className="space-y-1 pt-1">
                {clientsFiltres.length === 0 ? (
                  <p className="text-center text-slate-400 py-6 text-[10px]">Aucun client trouvé.</p>
                ) : (
                  clientsFiltres.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => selectionnerClient(c)}
                      className="p-2 bg-slate-50 hover:bg-orange-50 border border-slate-200 rounded flex justify-between items-center cursor-pointer transition"
                    >
                      <div>
                        <p className="font-bold text-slate-800 text-[10px]">{c.nom_client}</p>
                        <p className="text-[9px] text-slate-500 font-mono">{c.telephone || 'Sans téléphone'}</p>
                      </div>
                      <span className="font-bold text-orange-600 text-[10px]">Sélectionner</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL RECHERCHE ARTICLE */}
      {afficherModalArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-2.5 bg-slate-900 text-white flex justify-between items-center text-[11px] font-bold">
              <span>SÉLECTIONNER UN ARTICLE</span>
              <button onClick={() => setAfficherModalArticle(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-3 space-y-2 overflow-y-auto">
              <input
                type="text"
                autoFocus
                value={rechercheArticleInput}
                onChange={(e) => setRechercheArticleInput(e.target.value)}
                placeholder="Rechercher un article..."
                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] focus:outline-none font-medium"
              />
              <div className="space-y-1 pt-1">
                {articlesFiltres.length === 0 ? (
                  <p className="text-center text-slate-400 py-6 text-[10px]">Aucun article trouvé.</p>
                ) : (
                  articlesFiltres.map((art) => {
                    const artId = art.id_article || art.id;
                    const artDes = art.Designation || art.nom;
                    const artPrix = Number(art.Prix_Vente || art.prix_vente || 0);
                    const artStock = art.Quantite_Stock ?? art.stock_actuel ?? 0;
                    return (
                      <div
                        key={artId}
                        onClick={() => ajouterAuPanier(art)}
                        className="p-2 bg-slate-50 hover:bg-orange-50 border border-slate-200 rounded flex justify-between items-center cursor-pointer transition"
                      >
                        <div>
                          <p className="font-bold text-slate-800 text-[10px]">{artDes}</p>
                          <p className="text-[9px] text-slate-500 font-mono">Stock : {artStock}</p>
                        </div>
                        <span className="font-black text-orange-600 font-mono text-[10px]">
                          {artPrix.toLocaleString('fr-FR')} F
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FICHE TICKET EXISTANT */}
      {ticketSelectionne && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-2.5 bg-slate-900 text-white flex justify-between items-center text-[11px]">
              <span className="font-bold font-mono">Ticket #{ticketSelectionne.numero_ticket}</span>
              <button onClick={() => setTicketSelectionne(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="p-3 overflow-y-auto space-y-2 font-mono text-[10px] bg-slate-50">
              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 uppercase font-bold">Détails des articles :</span>
                {Array.isArray(ticketSelectionne.details_articles) && ticketSelectionne.details_articles.length > 0 ? (
                  <div className="space-y-1 divide-y divide-slate-200">
                    {ticketSelectionne.details_articles.map((item, idx) => (
                      <div key={idx} className="pt-1 flex justify-between text-[10px]">
                        <span>{item.quantite}x {item.designation}</span>
                        <span className="font-bold">
                          {Number((item.quantite || 1) * (item.prix_unitaire || 0)).toLocaleString('fr-FR')} F
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-[10px]">Aucun détail d'article.</p>
                )}
              </div>

              <div className="pt-2 border-t border-dashed border-slate-300 flex justify-between font-black text-[11px] text-slate-900">
                <span>TOTAL :</span>
                <span className="text-emerald-700">
                  {Number(ticketSelectionne.total_montant || 0).toLocaleString('fr-FR')} F CFA
                </span>
              </div>
            </div>

            <div className="p-2 bg-white border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => supprimerTicket(ticketSelectionne.id)}
                className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-2 py-1 rounded text-[10px] transition"
              >
                🗑️ Supprimer
              </button>
              <div className="flex gap-1">
                <button
                  onClick={() => window.print()}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-1 rounded text-[10px] transition"
                >
                  🖨️ Imprimer
                </button>
                <button
                  onClick={() => setTicketSelectionne(null)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-2 py-1 rounded text-[10px] transition"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}