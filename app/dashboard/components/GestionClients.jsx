'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const LISTE_PAYS = [
  { code: 'cmr', indicatif: '+237', longueur: 9 },
  { code: 'fra', indicatif: '+33', longueur: 9 },
  { code: 'civ', indicatif: '+225', longueur: 10 },
  { code: 'sen', indicatif: '+221', longueur: 9 },
  { code: 'gab', indicatif: '+241', longueur: 7 },
  { code: 'cog', indicatif: '+242', longueur: 9 },
  { code: 'rdc', indicatif: '+243', longueur: 9 },
  { code: 'mli', indicatif: '+223', longueur: 8 },
  { code: 'bfa', indicatif: '+226', longueur: 8 },
  { code: 'tgo', indicatif: '+228', longueur: 8 },
  { code: 'ben', indicatif: '+229', longueur: 8 },
  { code: 'nga', indicatif: '+234', longueur: 10 },
  { code: 'mar', indicatif: '+212', longueur: 9 },
  { code: 'tun', indicatif: '+216', longueur: 8 },
  { code: 'dza', indicatif: '+213', longueur: 9 },
];

export default function GestionClients({ entrepriseId = '4TS-TEST' }) {
  const [clients, setClients] = useState([]);
  const [categories, setCategories] = useState([]);
  const [ventes, setVentes] = useState([]);
  const [articles, setArticles] = useState([]);
  const [chargement, setChargement] = useState(false);
  
  const [ongletActif, setOngletActif] = useState('repertoire');

  // États pour le tri du répertoire
  const [triCol, setTriCol] = useState('nom_client');
  const [triOrdre, setTriOrdre] = useState('asc');

  // États pour le tri de l'historique
  const [triHistCol, setTriHistCol] = useState('date');
  const [triHistOrdre, setTriHistOrdre] = useState('asc');

  const [clientHistoriqueId, setClientHistoriqueId] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [factureSelectionnee, setFactureSelectionnee] = useState(null);
  const [montantReglementSaisi, setMontantReglementSaisi] = useState('');

  const [afficherForm, setAfficherForm] = useState(false);
  const [clientEnEdition, setClientEnEdition] = useState(null);
  const [recherche, setRecherche] = useState('');

  const [nouveauClient, setNouveauClient] = useState({
    nom_client: '',
    pays: 'cmr',
    telephone: '',
    email: '',
    id_categorie: '',
    solde_credit: 0,
  });

  // Récupération dynamique et robuste du module actif (Boutique, Livraison, Logistique, Tontine, etc.)
  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();

  const chargerDonnees = async () => {
    setChargement(true);
    try {
      // Isolation stricte par entreprise ET par module pour une étanchéité à long terme
      const { data: dataCat } = await supabase
        .from('categories_clients')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('nom_categorie', { ascending: true });

      setCategories(dataCat || []);

      const { data: dataCli, error: errCli } = await supabase
        .from('clients')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('created_at', { ascending: false });

      if (errCli) throw errCli;
      const listClients = dataCli || [];
      setClients(listClients);

      if (listClients.length > 0 && !clientHistoriqueId) {
        setClientHistoriqueId(listClients[0].id);
      }

      const { data: dataVentes } = await supabase
        .from('ventes_historiques')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setVentes(dataVentes || []);

      const { data: dataArticles } = await supabase
        .from('articles_stock')
        .select('*')
        .eq('ID_Entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setArticles(dataArticles || []);

    } catch (err) {
      console.error('Erreur chargement clients :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonnees();
  }, [entrepriseId, moduleActuel]);

  const calculerTotauxFactureClient = (vente) => {
    const montantTotal = Number(vente.montant_total || vente.total || 0);
    const montantRegle = Number(vente.montant_regle || vente.montant_paye || 0);
    const resteAPayer = Math.max(0, montantTotal - montantRegle);

    let statut = 'Soldé';
    if (montantRegle <= 0) statut = 'Non soldé';
    else if (montantRegle < montantTotal) statut = 'Avancé';

    return { montantTotal, montantRegle, resteAPayer, statut };
  };

  const calculerSoldeCreditClient = (client) => {
    if (!client) return 0;
    const clientId = client.id;
    const clientNom = (client.nom_client || client.nom || '').trim().toUpperCase();

    let totalCredit = 0;
    ventes.forEach((v) => {
      const matchId = String(v.id_client || v.client_id) === String(clientId);
      const matchNom = String(v.nom_client || v.client || '').trim().toUpperCase() === clientNom;

      if (matchId || matchNom) {
        const totaux = calculerTotauxFactureClient(v);
        totalCredit += totaux.resteAPayer;
      }
    });

    return Math.max(0, totalCredit);
  };

  const enregistrerClient = async (e) => {
    e.preventDefault();
    
    if (!nouveauClient.id_categorie) {
      alert('⚠️ Veuillez sélectionner une catégorie client.');
      return;
    }

    const paysObj = LISTE_PAYS.find(p => p.code === nouveauClient.pays) || LISTE_PAYS[0];
    const chiffresPur = (nouveauClient.telephone || '').replace(/[^0-9]/g, '');

    if (chiffresPur.length > 0 && chiffresPur.length !== paysObj.longueur) {
      alert(`⚠️ Numéro invalide pour ${paysObj.code}. Le numéro doit comporter exactement ${paysObj.longueur} chiffres.`);
      return;
    }

    const numeroComplet = chiffresPur ? `${paysObj.indicatif}${chiffresPur}` : '';

    try {
      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel, // Injection automatique du module actif
        nom_client: nouveauClient.nom_client,
        pays: nouveauClient.pays,
        telephone: numeroComplet,
        email: nouveauClient.email,
        id_categorie: parseInt(nouveauClient.id_categorie),
      };

      if (clientEnEdition) {
        const { error } = await supabase
          .from('clients')
          .update(payload)
          .eq('id', clientEnEdition.id);

        if (error) throw error;
        alert(`Client mis à jour avec succès dans le module ${moduleActuel} !`);
      } else {
        const { error } = await supabase.from('clients').insert([
          {
            ...payload,
            solde_credit: 0,
          },
        ]);

        if (error) throw error;
        alert(`Client enregistré avec succès dans le module ${moduleActuel} !`);
      }

      annulerForm();
      chargerDonnees();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const ouvrirEdition = (client) => {
    setClientEnEdition(client);
    
    let telLocal = client.telephone || '';
    const paysTrouve = LISTE_PAYS.find(p => client.telephone && client.telephone.startsWith(p.indicatif)) || LISTE_PAYS[0];
    if (client.telephone && client.telephone.startsWith(paysTrouve.indicatif)) {
      telLocal = client.telephone.replace(paysTrouve.indicatif, '');
    }

    setNouveauClient({
      nom_client: client.nom_client || '',
      pays: client.pays || paysTrouve.code,
      telephone: telLocal.replace(/[^0-9]/g, ''),
      email: client.email || '',
      id_categorie: client.id_categorie || '',
      solde_credit: client.solde_credit || 0,
    });
    setAfficherForm(true);
  };

  const annulerForm = () => {
    setClientEnEdition(null);
    setNouveauClient({
      nom_client: '',
      pays: 'cmr',
      telephone: '',
      email: '',
      id_categorie: '',
      solde_credit: 0,
    });
    setAfficherForm(false);
  };

  const supprimerClient = async () => {
    if (!clientEnEdition) return;

    try {
      setChargement(true);
      const clientIdStr = String(clientEnEdition.id);
      const clientNomStr = String(clientEnEdition.nom_client || '').trim().toUpperCase();

      // Interrogation DIRECTE et simultanée de ventes_historiques et mouvements_stock
      const [resVentes, resMvts] = await Promise.all([
        supabase.from('ventes_historiques').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('mouvements_stock').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel)
      ]);

      if (resVentes.error) throw resVentes.error;
      if (resMvts.error) throw resMvts.error;

      const ventesDb = resVentes.data || [];
      const mouvementsDb = resMvts.data || [];

      // Vérification rigoureuse dans les ventes
      const ventesRattachees = ventesDb.filter((v) => {
        const idCliVente = String(v.id_client || v.client_id || '');
        const nomCliVente = String(v.nom_client || v.client || '').trim().toUpperCase();
        return idCliVente === clientIdStr || (clientNomStr !== '' && nomCliVente === clientNomStr);
      });

      // Vérification rigoureuse dans les mouvements de stock (présence du nom dans la remarque)
      const mouvementsRattaches = mouvementsDb.filter((m) => {
        const remarque = String(m.motif_remarque || '').trim().toUpperCase();
        return clientNomStr !== '' && remarque.includes(clientNomStr);
      });

      const totalOperations = ventesRattachees.length + mouvementsRattaches.length;

      // BLOCAGE STRICT si des mouvements ou des ventes existent
      if (totalOperations > 0) {
        alert(`❌ SUPPRESSION BLOQUÉE : Ce client ("${clientEnEdition.nom_client}") a déjà ${totalOperations} mouvement(s) ou vente(s) enregistré(s) à son compte. Pour des raisons comptables et de traçabilité, il est strictement impossible de le supprimer.`);
        setChargement(false);
        return;
      }

      if (!confirm(`Voulez-vous vraiment supprimer définitivement le client "${clientEnEdition.nom_client}" ?`)) {
        setChargement(false);
        return;
      }

      const { error } = await supabase.from('clients').delete().eq('id', clientEnEdition.id);
      if (error) throw error;

      alert('Client supprimé avec succès.');
      annulerForm();
      chargerDonnees();
    } catch (err) {
      alert('Erreur : ' + err.message);
    } finally {
      setChargement(false);
    }
  };

  const gererSaisieTelephone = (e) => {
    const chiffres = e.target.value.replace(/[^0-9]/g, '');
    setNouveauClient({ ...nouveauClient, telephone: chiffres });
  };

  const getTelephoneComplet = () => {
    const paysObj = LISTE_PAYS.find(p => p.code === nouveauClient.pays) || LISTE_PAYS[0];
    return `${paysObj.indicatif}${nouveauClient.telephone || ''}`;
  };

  const gererTri = (colonne) => {
    if (triCol === colonne) {
      setTriOrdre(triOrdre === 'asc' ? 'desc' : 'asc');
    } else {
      setTriCol(colonne);
      setTriOrdre('asc');
    }
  };

  const rendreFlecheTri = (colonne) => {
    if (triCol !== colonne) return <span className="text-slate-400 ml-1">↕</span>;
    return <span className="text-orange-600 ml-1 font-bold">{triOrdre === 'asc' ? '↑' : '↓'}</span>;
  };

  const gererTriHistorique = (colonne) => {
    if (triHistCol === colonne) {
      setTriHistOrdre(triHistOrdre === 'asc' ? 'desc' : 'asc');
    } else {
      setTriHistCol(colonne);
      setTriHistOrdre('asc');
    }
  };

  const rendreFlecheTriHistorique = (colonne) => {
    if (triHistCol !== colonne) return <span className="text-slate-400 ml-1">↕</span>;
    return <span className="text-orange-600 ml-1 font-bold">{triHistOrdre === 'asc' ? '↑' : '↓'}</span>;
  };

  const obtenirNumWhatsapp = (tel) => {
    if (!tel) return '';
    return tel.replace(/[^0-9]/g, '');
  };

  const clientsFiltres = clients
    .filter((c) => {
      const nom = (c.nom_client || '').toLowerCase();
      const tel = (c.telephone || '').toLowerCase();
      const query = recherche.toLowerCase();
      return nom.includes(query) || tel.includes(query);
    })
    .sort((a, b) => {
      let valA = '';
      let valB = '';

      if (triCol === 'nom_client') {
        valA = a.nom_client || '';
        valB = b.nom_client || '';
      } else if (triCol === 'categorie') {
        valA = categories.find(cat => String(cat.id) === String(a.id_categorie))?.nom_categorie || '';
        valB = categories.find(cat => String(cat.id) === String(b.id_categorie))?.nom_categorie || '';
      } else if (triCol === 'solde_credit') {
        valA = Number(calculerSoldeCreditClient(a));
        valB = Number(calculerSoldeCreditClient(b));
      }

      if (valA < valB) return triOrdre === 'asc' ? -1 : 1;
      if (valA > valB) return triOrdre === 'asc' ? 1 : -1;
      return 0;
    });

  const obtenirHistoriqueClient = () => {
    if (!clientHistoriqueId) return { lignes: [], soldeGlobal: 0 };
    const clientObj = clients.find(c => String(c.id) === String(clientHistoriqueId));
    if (!clientObj) return { lignes: [], soldeGlobal: 0 };

    const clientId = clientObj.id;
    const clientNom = (clientObj.nom_client || clientObj.nom || '').trim().toUpperCase();

    let operations = [];

    ventes.forEach((v) => {
      const matchId = String(v.id_client || v.client_id) === String(clientId);
      const matchNom = String(v.nom_client || v.client || '').trim().toUpperCase() === clientNom;

      if (matchId || matchNom) {
        const totaux = calculerTotauxFactureClient(v);

        operations.push({
          dataOrigine: v,
          date: v.created_at || v.date_vente || new Date().toISOString(),
          numeroFacture: v.numero_facture || v.reference || v.numero_bon || 'FACTURE',
          montant: totaux.montantTotal,
          montantRegle: totaux.montantRegle,
          reste: totaux.resteAPayer,
          statut: totaux.statut,
        });
      }
    });

    if (dateDebut) operations = operations.filter(op => op.date.split('T')[0] >= dateDebut);
    if (dateFin) operations = operations.filter(op => op.date.split('T')[0] <= dateFin);

    operations.sort((a, b) => {
      let valA = '';
      let valB = '';

      if (triHistCol === 'date') {
        valA = a.date;
        valB = b.date;
      } else if (triHistCol === 'numeroFacture') {
        valA = a.numeroFacture;
        valB = b.numeroFacture;
      } else if (triHistCol === 'montant') {
        valA = a.montant;
        valB = b.montant;
      } else if (triHistCol === 'statut') {
        valA = a.statut;
        valB = b.statut;
      }

      if (valA < valB) return triHistOrdre === 'asc' ? -1 : 1;
      if (valA > valB) return triHistOrdre === 'asc' ? 1 : -1;
      return 0;
    });

    let cumulProgressif = 0;
    const lignesAvecProgressif = operations.map(op => {
      cumulProgressif += op.reste;
      return { ...op, montantProgressif: cumulProgressif };
    });

    return { lignes: lignesAvecProgressif, soldeGlobal: cumulProgressif };
  };

  const clientSelectionneObj = clients.find(c => String(c.id) === String(clientHistoriqueId));
  const resultatHistorique = obtenirHistoriqueClient();

  const obtenirLignesFactureDetail = (factureObj) => {
    if (!factureObj || !factureObj.details_articles) return [];
    let details = [];
    if (typeof factureObj.details_articles === 'string') {
      try { details = JSON.parse(factureObj.details_articles); } catch (e) {}
    } else if (Array.isArray(factureObj.details_articles)) {
      details = factureObj.details_articles;
    }

    return details.map((item) => {
      const artObj = articles.find(a => String(a.id_article || a.id) === String(item.id_article || item.article_id || item.id));
      const designation = item.designation || item.Designation || artObj?.Designation || `Article #${item.id_article || item.article_id}`;
      const qte = Number(item.quantite || item.Quantite || 0);
      const prixUnitaire = Number(item.prix_vente_unitaire || item.prix_unitaire || item.Prix_Vente || 0);
      const sousTotal = qte * prixUnitaire;

      return { designation, qte, prixUnitaire, sousTotal };
    });
  };

  const enregistrerReglementClient = async (e) => {
    e.preventDefault();
    if (!factureSelectionnee || !montantReglementSaisi) return;
    const montantAvance = parseFloat(montantReglementSaisi);
    if (isNaN(montantAvance) || montantAvance <= 0) {
      alert('⚠️ Veuillez entrer un montant valide.');
      return;
    }

    try {
      const montantActuelRegle = Number(factureSelectionnee.montant_regle || factureSelectionnee.montant_paye || 0);
      const nouveauRegle = montantActuelRegle + montantAvance;

      const { error } = await supabase
        .from('ventes_historiques')
        .update({
          montant_regle: nouveauRegle,
        })
        .eq('id', factureSelectionnee.id);

      if (error) throw error;
      alert('Règlement enregistré avec succès !');
      setMontantReglementSaisi('');
      setFactureSelectionnee(null);
      chargerDonnees();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const paysActuelObj = LISTE_PAYS.find(p => p.code === nouveauClient.pays) || LISTE_PAYS[0];

  return (
    <div className="space-y-2.5 text-[11px] font-sans">
      <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setOngletActif('repertoire')}
          className={`py-1.5 px-3 rounded-lg font-bold transition text-center ${
            ongletActif === 'repertoire' ? 'bg-orange-600 text-white shadow-2xs' : 'bg-white text-slate-800 hover:bg-slate-50'
          }`}
        >
          👥 Clients [{moduleActuel}] ({clients.length})
        </button>
        <button
          type="button"
          onClick={() => setOngletActif('historique')}
          className={`py-1.5 px-3 rounded-lg font-bold transition text-center ${
            ongletActif === 'historique' ? 'bg-orange-600 text-white shadow-2xs' : 'bg-white text-slate-800 hover:bg-slate-50'
          }`}
        >
          🔍 Historique [{moduleActuel}]
        </button>
      </div>

      {ongletActif === 'repertoire' && (
        <>
          <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            <h3 className="font-extrabold text-slate-900 uppercase text-xs">👥 GESTION DES CLIENTS [{moduleActuel}]</h3>
            <button
              onClick={() => {
                if (afficherForm) {
                  annulerForm();
                } else {
                  setNouveauClient({ nom_client: '', pays: 'cmr', telephone: '', email: '', id_categorie: '', solde_credit: 0 });
                  setClientEnEdition(null);
                  setAfficherForm(true);
                }
              }}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-2xs"
            >
              {afficherForm ? '✖' : 'Nouveau'}
            </button>
          </div>

          {afficherForm && (
            <form onSubmit={enregistrerClient} className="bg-white border-2 border-orange-500/50 p-3 rounded-xl space-y-2 shadow-2xs">
              <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                <h4 className="font-extrabold text-orange-600 uppercase text-[10px]">
                  {clientEnEdition ? `✏️ Fiche du client (${moduleActuel})` : `➕ Nouveau client (${moduleActuel})`}
                </h4>
                <button
                  type="button"
                  onClick={annulerForm}
                  className="text-slate-400 hover:text-slate-700 font-bold text-xs p-0.5"
                >
                  ✖
                </button>
              </div>

              <div className={`grid grid-cols-1 ${clientEnEdition ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-1.5`}>
                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Nom / Prénom(s) *</label>
                  <input
                    type="text"
                    required
                    value={nouveauClient.nom_client}
                    onChange={(e) => setNouveauClient({ ...nouveauClient, nom_client: e.target.value })}
                    placeholder="Ex: JEAN PIERRE"
                    className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-slate-900 text-xs shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Catégorie *</label>
                  <select
                    required
                    value={nouveauClient.id_categorie}
                    onChange={(e) => setNouveauClient({ ...nouveauClient, id_categorie: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-orange-700 text-xs shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="">-- Choisir catégorie --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nom_categorie} ({cat.taux_remise_defaut}%)
                      </option>
                    ))}
                  </select>
                </div>

                {clientEnEdition && (
                  <div>
                    <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Solde Crédit</label>
                    <input
                      type="text"
                      disabled
                      value={`${Number(calculerSoldeCreditClient(clientEnEdition)).toLocaleString('fr-FR')} F`}
                      className="w-full bg-slate-100 text-blue-700 border border-slate-300 rounded p-1.5 font-black text-xs cursor-not-allowed"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-1.5 pt-1 border-t border-slate-100">
                <div className="sm:col-span-1">
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Pays *</label>
                  <select
                    value={nouveauClient.pays}
                    onChange={(e) => setNouveauClient({ ...nouveauClient, pays: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-slate-900 text-[11px] shadow-xs"
                  >
                    {LISTE_PAYS.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.code.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">
                    Tel ({paysActuelObj.longueur} chiffres) *
                  </label>
                  <div className="flex items-center bg-white border border-slate-300 rounded overflow-hidden shadow-xs">
                    <span className="bg-slate-100 px-2 py-1.5 text-[11px] font-black text-slate-800 border-r border-slate-300 shrink-0">
                      {paysActuelObj.indicatif}
                    </span>
                    <input
                      type="text"
                      maxLength={paysActuelObj.longueur}
                      value={nouveauClient.telephone}
                      onChange={gererSaisieTelephone}
                      placeholder="6XXXXXXXX"
                      className="w-full p-1.5 font-mono text-[11px] font-extrabold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="sm:col-span-1">
                  <label className="block font-black mb-0.5 text-[9px] text-slate-700 uppercase">Email</label>
                  <input
                    type="email"
                    value={nouveauClient.email}
                    onChange={(e) => setNouveauClient({ ...nouveauClient, email: e.target.value })}
                    placeholder="client@email.com"
                    className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-[11px] shadow-xs"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex flex-wrap justify-between items-center gap-1.5">
                <div className="flex items-center gap-1 flex-wrap">
                  {nouveauClient.telephone && nouveauClient.telephone.length === paysActuelObj.longueur && (
                    <>
                      <a
                        href={`tel:${getTelephoneComplet()}`}
                        className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-bold px-2 py-1 rounded text-[9.5px] flex items-center gap-1 transition"
                        title="Appel"
                      >
                        📞 Appel
                      </a>
                      <a
                        href={`https://wa.me/${obtenirNumWhatsapp(getTelephoneComplet())}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold px-2.5 py-1 rounded text-[9.5px] flex items-center gap-1 transition"
                        title="WhatsApp"
                      >
                        <svg className="w-3.5 h-3.5 inline fill-current text-emerald-600" viewBox="0 0 24 24">
                          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                        </svg>
                        WhatsApp
                      </a>
                    </>
                  )}
                  {nouveauClient.email && (
                    <a
                      href={`mailto:${nouveauClient.email}`}
                      className="bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300 font-bold px-2 py-1 rounded text-[9.5px] flex items-center gap-1 transition"
                      title="Email"
                    >
                      📧 Email
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {clientEnEdition && (
                    <button
                      type="button"
                      onClick={supprimerClient}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold px-2.5 py-1.5 rounded text-[10px]"
                    >
                      🗑️ Supprimer
                    </button>
                  )}
                  <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-1.5 rounded text-[10px] shadow-2xs">
                    {clientEnEdition ? 'Mettre à jour' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {!afficherForm && (
            <>
              <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                <input
                  type="text"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                  placeholder={`Rechercher par nom ou téléphone [${moduleActuel}]...`}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-extrabold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-xs"
                />
              </div>

              <div className="flex justify-between items-center text-[10px] text-slate-600 px-1 font-bold">
                <span>Répertoire : <strong>{clientsFiltres.length}</strong> client(s)</span>
              </div>

              {chargement ? (
                <div className="p-4 text-center text-slate-500 font-bold">Chargement...</div>
              ) : clientsFiltres.length === 0 ? (
                <div className="p-4 text-center text-slate-500 bg-white border border-slate-200 rounded-xl font-bold">
                  Aucun client enregistré pour le module {moduleActuel}.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                  <table className="w-full text-left text-xs table-fixed">
                    <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 uppercase text-[9px] font-black select-none">
                      <tr>
                        <th onClick={() => gererTri('nom_client')} className="p-2.5 w-[45%] cursor-pointer hover:bg-slate-200 transition">
                          Nom / Prénom(s) {rendreFlecheTri('nom_client')}
                        </th>
                        <th onClick={() => gererTri('categorie')} className="p-2.5 w-[40%] cursor-pointer hover:bg-slate-200 transition">
                          Catégorie {rendreFlecheTri('categorie')}
                        </th>
                        <th onClick={() => gererTri('solde_credit')} className="p-2.5 w-[15%] text-right cursor-pointer hover:bg-slate-200 transition">
                          Solde Crédit {rendreFlecheTri('solde_credit')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[10.5px]">
                      {clientsFiltres.map((c) => {
                        const catTrouvee = categories.find((cat) => String(cat.id) === String(c.id_categorie));
                        const soldeCreditCalcule = calculerSoldeCreditClient(c);
                        return (
                          <tr 
                            key={c.id} 
                            onClick={() => ouvrirEdition(c)}
                            className="hover:bg-orange-50/70 cursor-pointer transition select-none"
                            title="Cliquer pour modifier"
                          >
                            <td className="p-2.5 font-black text-slate-900 truncate">{c.nom_client}</td>
                            <td className="p-2.5 truncate">
                              <span className="bg-orange-100 text-orange-900 border border-orange-200 px-2 py-0.5 rounded font-black text-[9.5px]">
                                {catTrouvee ? catTrouvee.nom_categorie : 'Standard'}
                              </span>
                            </td>
                            <td className="p-2.5 text-right font-black text-blue-700 truncate">
                              {soldeCreditCalcule.toLocaleString('fr-FR')} F
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}

      {ongletActif === 'historique' && (
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5">
          <h4 className="font-black text-slate-900 text-xs uppercase flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
            <span>🔍</span> HISTORIQUE CLIENT [{moduleActuel}]
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div>
              <label className="block font-black text-slate-700 mb-0.5 text-[9px] uppercase">Client *</label>
              <select
                value={clientHistoriqueId}
                onChange={(e) => setClientHistoriqueId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-slate-900 text-xs shadow-xs"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>👤 {c.nom_client || c.nom}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-black text-slate-700 mb-0.5 text-[9px] uppercase">Date Début :</label>
              <input
                type="date"
                value={dateDebut}
                onChange={(e) => setDateDebut(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-xs shadow-xs"
              />
            </div>

            <div>
              <label className="block font-black text-slate-700 mb-0.5 text-[9px] uppercase">Date Fin :</label>
              <input
                type="date"
                value={dateFin}
                onChange={(e) => setDateFin(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded p-1.5 font-bold text-slate-900 text-xs shadow-xs"
              />
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-200 p-2.5 rounded-xl flex justify-between items-center text-[10px]">
            <span className="font-black text-slate-900 uppercase">
              👤 CLIENT : {clientSelectionneObj ? (clientSelectionneObj.nom_client || clientSelectionneObj.nom) : 'Aucun'}
            </span>
            <span className="font-extrabold text-slate-700">{resultatHistorique.lignes.length} facture(s)</span>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
            <table className="w-full text-left text-xs table-fixed">
              <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 uppercase text-[9px] font-black select-none">
                <tr>
                  <th onClick={() => gererTriHistorique('date')} className="p-2.5 w-[25%] cursor-pointer hover:bg-slate-200 transition">
                    Date {rendreFlecheTriHistorique('date')}
                  </th>
                  <th onClick={() => gererTriHistorique('numeroFacture')} className="p-2.5 w-[30%] cursor-pointer hover:bg-slate-200 transition font-mono">
                    N° Facture {rendreFlecheTriHistorique('numeroFacture')}
                  </th>
                  <th onClick={() => gererTriHistorique('montant')} className="p-2.5 w-[25%] cursor-pointer hover:bg-slate-200 transition">
                    Montant {rendreFlecheTriHistorique('montant')}
                  </th>
                  <th onClick={() => gererTriHistorique('statut')} className="p-2.5 w-[20%] text-center cursor-pointer hover:bg-slate-200 transition">
                    Statut {rendreFlecheTriHistorique('statut')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[10px]">
                {resultatHistorique.lignes.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-4 text-center text-slate-500 font-bold">Aucun historique de vente.</td>
                  </tr>
                ) : (
                  resultatHistorique.lignes.map((ligne, idx) => (
                    <tr 
                      key={idx} 
                      onClick={() => setFactureSelectionnee(ligne.dataOrigine)}
                      className="hover:bg-orange-50/70 cursor-pointer transition select-none"
                      title="Cliquer pour ouvrir la facture"
                    >
                      <td className="p-2.5 text-slate-800 font-mono font-bold">{new Date(ligne.date).toLocaleDateString('fr-FR')}</td>
                      <td className="p-2.5 font-mono font-black text-orange-600 truncate">{ligne.numeroFacture}</td>
                      <td className="p-2.5 font-black text-slate-900">{ligne.montant.toLocaleString('fr-FR')} F</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded font-black text-[9px] ${
                          ligne.statut === 'Soldé' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {ligne.statut}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="bg-emerald-700 text-white p-3 rounded-xl flex justify-between items-center shadow-xs">
            <span className="font-black text-[10px] uppercase tracking-wider">SOLDE GLOBAL DU COMPTE :</span>
            <span className="text-xs font-black text-white font-mono">
              {resultatHistorique.soldeGlobal.toLocaleString('fr-FR')} F CFA
            </span>
          </div>
        </div>
      )}

      {factureSelectionnee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-3 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black text-xs uppercase">📄 FACTURE CLIENT [{moduleActuel}]</h3>
                <p className="text-[10px] text-orange-400 font-mono font-extrabold">
                  N° {factureSelectionnee.numero_facture || factureSelectionnee.reference || factureSelectionnee.numero_bon || 'FACTURE'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFactureSelectionnee(null)}
                className="text-slate-300 hover:text-white font-black text-xs p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-3 overflow-y-auto flex-1 space-y-2 text-[10.5px] bg-slate-50">
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-left text-xs table-fixed">
                  <thead className="bg-slate-100 border-b border-slate-200 text-[9px] uppercase font-black text-slate-800">
                    <tr>
                      <th className="p-2 w-[45%]">Article</th>
                      <th className="p-2 w-[15%] text-center">Qté</th>
                      <th className="p-2 w-[20%] text-right">P.U</th>
                      <th className="p-2 w-[20%] text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[10px]">
                    {obtenirLignesFactureDetail(factureSelectionnee).map((line, i) => (
                      <tr key={i}>
                        <td className="p-2 font-black text-slate-900 truncate">{line.designation}</td>
                        <td className="p-2 text-center font-black text-orange-600">{line.qte}</td>
                        <td className="p-2 text-right font-bold text-slate-800">{line.prixUnitaire.toLocaleString('fr-FR')}</td>
                        <td className="p-2 text-right font-black text-emerald-700">{line.sousTotal.toLocaleString('fr-FR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {(() => {
                const totauxFacture = calculerTotauxFactureClient(factureSelectionnee);

                return (
                  <div className="bg-white border border-slate-200 p-3 rounded-xl space-y-2 shadow-xs">
                    <div className="flex justify-between text-[10px] font-black">
                      <span className="text-slate-700">Total : {totauxFacture.montantTotal.toLocaleString('fr-FR')} F</span>
                      <span className="text-emerald-700">Payé : {totauxFacture.montantRegle.toLocaleString('fr-FR')} F</span>
                      <span className="text-red-700">Reste : {totauxFacture.resteAPayer.toLocaleString('fr-FR')} F</span>
                    </div>

                    {totauxFacture.resteAPayer > 0 && (
                      <form onSubmit={enregistrerReglementClient} className="flex gap-2 pt-1 border-t border-slate-100">
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Montant règlement / avance"
                          value={montantReglementSaisi}
                          onChange={(e) => setMontantReglementSaisi(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded p-1.5 text-[10px] font-extrabold text-slate-900 shadow-xs"
                          required
                        />
                        <button
                          type="submit"
                          className="bg-emerald-600 hover:bg-emerald-750 text-white font-black px-3 py-1.5 rounded text-[10px] shrink-0 shadow-xs"
                        >
                          Valider Règlement
                        </button>
                      </form>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="p-3 bg-white border-t border-slate-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => window.print()}
                className="bg-slate-800 hover:bg-slate-900 text-white font-black px-3 py-1.5 rounded text-[10px] shadow-xs"
              >
                🖨️ Imprimer
              </button>
              <button
                type="button"
                onClick={() => setFactureSelectionnee(null)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded text-[10px]"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}