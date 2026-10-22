'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionJournalCaisse({ entrepriseId = '4TS-TEST', vueInitiale = 'saisie_operations', utilisateurActif = 'THEODORE STEPHANE' }) {
  const [sousMenu, setSousMenu] = useState(vueInitiale);
  const [modeSaisie, setModeSaisie] = useState('nouveau');

  // --- ÉTATS JOURNAL ---
  const [dateDebutJournal, setDateDebutJournal] = useState(new Date().toISOString().split('T')[0]);
  const [dateFinJournal, setDateFinJournal] = useState(new Date().toISOString().split('T')[0]);
  const [caisseSelectionneeJournal, setCaisseSelectionneeJournal] = useState('');

  const [caisses, setCaisses] = useState([]);
  const [comptes, setComptes] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [ventes, setVentes] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [chargement, setChargement] = useState(false);

  // --- ÉTATS SAISIE ---
  const [enteteSaisie, setEnteteSaisie] = useState({
    date: new Date().toISOString().split('T')[0],
    id_caisse: '',
    type_mouvement: 'SORTIE',
  });
  const [ligneUnique, setLigneUnique] = useState({
    id_compte: '',
    libelle: '',
    montant: '',
    piece_physique: ''
  });

  // --- ÉTATS GRAND LIVRE ---
  const [dateDebutLivre, setDateDebutLivre] = useState('');
  const [dateFinLivre, setDateFinLivre] = useState('');
  const [compteLivreId, setCompteLivreId] = useState('');
  const [resultatGrandLivre, setResultatGrandLivre] = useState([]);

  // --- ÉTATS CONTRÔLE DE CAISSE ---
  const [dateDebutControle, setDateDebutControle] = useState(new Date().toISOString().split('T')[0]);
  const [dateFinControle, setDateFinControle] = useState(new Date().toISOString().split('T')[0]);
  const [caisseControleId, setCaisseControleId] = useState('');
  const [caissierFiltre, setCaissierFiltre] = useState('TOUS');
  const [montantPhysiqueReel, setMontantPhysiqueReel] = useState('');
  const [imputerManquant, setImputerManquant] = useState(false);

  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();

  const chargerDonneesGlobales = async () => {
    setChargement(true);
    try {
      const { data: dataCaisses } = await supabase
        .from('caisses')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);

      const caissesFiltrees = (dataCaisses || []).filter(c => {
        const nature = (c.nature || '').toUpperCase();
        return nature === 'PRINCIPALE';
      });
      setCaisses(caissesFiltrees);

      if (caissesFiltrees.length > 0 && !caisseSelectionneeJournal) {
        setCaisseSelectionneeJournal(caissesFiltrees[0].id);
      }

      const { data: dataComptes } = await supabase
        .from('comptes_comptables')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setComptes(dataComptes || []);

      const { data: dataMvts } = await supabase
        .from('mouvements_caisse')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('created_at', { ascending: true });
      setMouvements(dataMvts || []);

      const { data: dataVentes } = await supabase
        .from('ventes_historiques')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setVentes(dataVentes || []);

      const { data: dataUsers } = await supabase
        .from('utilisateurs')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setUtilisateurs(dataUsers || []);

    } catch (err) {
      console.error('Erreur chargement :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonneesGlobales();
  }, [entrepriseId, moduleActuel]);

  const calculerSoldeCaisse = (caisseId) => {
    if (!caisseId) return 0;
    const mvtsCaisse = mouvements.filter(m => String(m.id_caisse) === String(caisseId));
    return mvtsCaisse.reduce((acc, m) => {
      return m.type_mouvement === 'ENTREE' ? acc + Number(m.montant) : acc - Number(m.montant);
    }, 0);
  };

  const enregistrerOperationUnique = async (e) => {
    e.preventDefault();
    if (!enteteSaisie.id_caisse) {
      alert('Veuillez sélectionner une caisse principale.');
      return;
    }

    try {
      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        id_caisse: enteteSaisie.id_caisse,
        type_mouvement: enteteSaisie.type_mouvement,
        montant: Number(ligneUnique.montant),
        libelle: ligneUnique.libelle,
        id_compte: ligneUnique.id_compte || null,
        created_at: new Date(enteteSaisie.date).toISOString(),
      };

      const { error } = await supabase.from('mouvements_caisse').insert([payload]);
      if (error) throw error;

      alert(`Opération enregistrée avec succès par ${utilisateurActif} dans le module ${moduleActuel}.`);
      
      setLigneUnique({ id_compte: '', libelle: '', montant: '', piece_physique: '' });
      chargerDonneesGlobales();
      setModeSaisie('journal');
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  // Calculs pour le journal avec report antérieur
  const mouvementsCaisseSelectionnee = mouvements.filter(m => {
    if (!caisseSelectionneeJournal) return false;
    return String(m.id_caisse) === String(caisseSelectionneeJournal);
  });

  const reportAntérieur = mouvementsCaisseSelectionnee
    .filter(m => {
      const dateMvt = m.created_at ? m.created_at.split('T')[0] : '';
      return dateDebutJournal && dateMvt < dateDebutJournal;
    })
    .reduce((acc, m) => {
      return m.type_mouvement === 'ENTREE' ? acc + Number(m.montant) : acc - Number(m.montant);
    }, 0);

  const mouvementsFiltresJournalPeriode = mouvementsCaisseSelectionnee.filter(m => {
    const dateMvt = m.created_at ? m.created_at.split('T')[0] : '';
    if (dateDebutJournal && dateMvt < dateDebutJournal) return false;
    if (dateFinJournal && dateMvt > dateFinJournal) return false;
    return true;
  });

  const soldeActuelCaisseSelectionnee = calculerSoldeCaisse(caisseSelectionneeJournal);

  const montantAttenduCaisse = caisseControleId
    ? ventes
        .filter(v => {
          if (String(v.id_caisse) !== String(caisseControleId)) return false;
          const dateVente = v.created_at ? v.created_at.split('T')[0] : '';
          if (dateDebutControle && dateVente < dateDebutControle) return false;
          if (dateFinControle && dateVente > dateFinControle) return false;
          if (caissierFiltre !== 'TOUS' && String(v.id_utilisateur || v.vendeur) !== String(caissierFiltre)) return false;
          return true;
        })
        .reduce((sum, v) => sum + (Number(v.total_montant) || 0), 0)
    : 0;

  const ecartCaisse = montantPhysiqueReel !== '' ? Number(montantPhysiqueReel) - montantAttenduCaisse : 0;

  const lancerEditionGrandLivre = () => {
    const filtres = mouvements.filter(m => {
      if (String(m.id_compte) !== String(compteLivreId)) return false;
      const dateMvt = m.created_at ? m.created_at.split('T')[0] : '';
      if (dateDebutLivre && dateMvt < dateDebutLivre) return false;
      if (dateFinLivre && dateMvt > dateFinLivre) return false;
      return true;
    });
    setResultatGrandLivre(filtres);
  };

  const cloturerEtVerserCaissePrincipale = async () => {
    try {
      const caissePrincipale = caisses[0];
      
      if (!caissePrincipale) {
        alert(`Aucune caisse principale trouvée pour le versement dans le module ${moduleActuel}.`);
        return;
      }

      const montantVerser = Number(montantPhysiqueReel) || montantAttenduCaisse;
      const libelleVersement = `Recette caisse du ${dateDebutControle} au ${dateFinControle} (Caissier: ${caissierFiltre}) versé par ${utilisateurActif}`;

      const payloadVersement = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        id_caisse: caissePrincipale.id,
        type_mouvement: 'ENTREE',
        montant: montantVerser,
        libelle: libelleVersement,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('mouvements_caisse').insert([payloadVersement]);
      if (error) throw error;

      alert(`Clôture effectuée avec succès ! Montant de ${montantVerser.toLocaleString('fr-FR')} F versé en caisse principale (${moduleActuel}).`);
      setMontantPhysiqueReel('');
      setCaisseControleId('');
      chargerDonneesGlobales();
    } catch (err) {
      alert('Erreur lors de la clôture : ' + err.message);
    }
  };

  return (
    <div className="space-y-4 text-xs font-sans">
      
      {sousMenu === 'saisie_operations' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="font-extrabold text-slate-900 text-sm uppercase">Saisie des opérations [{moduleActuel}]</h4>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setModeSaisie('nouveau')}
                className={`px-4 py-1.5 rounded-xl font-black text-xs transition shadow-2xs ${
                  modeSaisie === 'nouveau'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                ＋ Nouveau
              </button>
              <button
                type="button"
                onClick={() => setModeSaisie('journal')}
                className={`px-4 py-1.5 rounded-xl font-black text-xs transition shadow-2xs ${
                  modeSaisie === 'journal'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                📋 Journal
              </button>
            </div>
          </div>

          {modeSaisie === 'nouveau' ? (
            <form onSubmit={enregistrerOperationUnique} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <span className="font-bold text-slate-500 uppercase text-[11px]">Formulaire de Saisie</span>
                {enteteSaisie.id_caisse && (
                  <div className="bg-slate-100 text-slate-800 px-4 py-2 rounded-xl text-right border border-slate-300">
                    <span className="block text-[10px] uppercase text-slate-600 font-black">SOLDE CAISSE</span>
                    <span className="text-sm font-black text-slate-950">
                      {calculerSoldeCaisse(enteteSaisie.id_caisse).toLocaleString('fr-FR')} F CFA
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div>
                  <label className="block font-black text-slate-800 mb-1 text-[11px]">Date *</label>
                  <input
                    type="date"
                    required
                    value={enteteSaisie.date}
                    onChange={(e) => setEnteteSaisie({ ...enteteSaisie, date: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-1.5 font-black text-slate-900 text-xs shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block font-black text-slate-800 mb-1 text-[11px]">Caisse Principale *</label>
                  <select
                    required
                    value={enteteSaisie.id_caisse}
                    onChange={(e) => setEnteteSaisie({ ...enteteSaisie, id_caisse: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-1.5 font-black text-slate-900 text-xs truncate shadow-2xs"
                  >
                    <option value="">-- Caisse Principale --</option>
                    {caisses.map((c) => (
                      <option key={c.id} value={c.id}>💵 {c.nom_caisse || c.code_caisse}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-black text-slate-800 mb-1 text-[11px]">Type *</label>
                  <select
                    value={enteteSaisie.type_mouvement}
                    onChange={(e) => setEnteteSaisie({ ...enteteSaisie, type_mouvement: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-1.5 font-black text-slate-900 text-xs shadow-2xs"
                  >
                    <option value="ENTREE">🟢 Entrée</option>
                    <option value="SORTIE">🔴 Sortie</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-700 font-black mb-0.5">Compte Comptable</label>
                    <select
                      required
                      value={ligneUnique.id_compte}
                      onChange={(e) => setLigneUnique({ ...ligneUnique, id_compte: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-black text-slate-900 shadow-2xs"
                    >
                      <option value="">-- Compte --</option>
                      {comptes
                        .filter(c => enteteSaisie.type_mouvement === 'ENTREE' ? c.type_compte === 'PRODUIT' : c.type_compte === 'CHARGE')
                        .map((c) => (
                          <option key={c.id} value={c.id}>[{c.code_compte}] {c.intitule_compte}</option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-700 font-black mb-0.5">Libellé / Motif</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Achat fournitures..."
                      value={ligneUnique.libelle}
                      onChange={(e) => setLigneUnique({ ...ligneUnique, libelle: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                  <div className="sm:col-span-6">
                    <label className="block text-[10px] text-slate-700 font-black mb-0.5">Montant (F CFA)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="0"
                      value={ligneUnique.montant}
                      onChange={(e) => setLigneUnique({ ...ligneUnique, montant: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-black text-orange-600 shadow-2xs"
                    />
                  </div>

                  <div className="sm:col-span-6">
                    <label className="block text-[10px] text-slate-700 font-black mb-0.5">N° Pièce Physique</label>
                    <input
                      type="text"
                      placeholder="Optionnel"
                      value={ligneUnique.piece_physique}
                      onChange={(e) => setLigneUnique({ ...ligneUnique, piece_physique: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-2.5 rounded-xl shadow transition"
                >
                  💾 Valider
                </button>
                <span className="text-[10px] text-slate-600 font-black mt-1 uppercase tracking-wider">
                  {utilisateurActif} [{moduleActuel}]
                </span>
              </div>
            </form>
          ) : (
            /* VUE JOURNAL DES OPÉRATIONS MODIFIÉE */
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 border-b border-slate-100 pb-3">
                <h5 className="font-extrabold text-slate-900 text-xs uppercase">Journal des Opérations</h5>
                
                <div className="flex items-center gap-2">
                  <label className="font-bold text-slate-700 text-[11px]">Caisse :</label>
                  <select
                    value={caisseSelectionneeJournal}
                    onChange={(e) => setCaisseSelectionneeJournal(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl p-1.5 font-black text-slate-900 text-xs shadow-2xs"
                  >
                    {caisses.map((c) => (
                      <option key={c.id} value={c.id}>💵 {c.nom_caisse}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Ligne de sélection des dates Début / Fin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 items-center">
                <div>
                  <label className="block font-black text-slate-800 mb-1 text-[11px]">Date Début :</label>
                  <input
                    type="date"
                    value={dateDebutJournal}
                    onChange={(e) => setDateDebutJournal(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 font-black text-slate-900 text-xs shadow-2xs"
                  />
                </div>
                <div>
                  <label className="block font-black text-slate-800 mb-1 text-[11px]">Date Fin :</label>
                  <input
                    type="date"
                    value={dateFinJournal}
                    onChange={(e) => setDateFinJournal(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 font-black text-slate-900 text-xs shadow-2xs"
                  />
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-900 border-b border-slate-200 font-black uppercase">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3 font-mono">N° Pièce</th>
                      <th className="p-3">Compte</th>
                      <th className="p-3">Libellé</th>
                      <th className="p-3 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-900">
                    {/* Ligne de report antérieur */}
                    {reportAntérieur !== 0 && (
                      <tr className="bg-slate-50 italic">
                        <td className="p-3 font-bold text-slate-600">-</td>
                        <td className="p-3 font-mono font-bold text-slate-600">REPORT</td>
                        <td className="p-3 font-bold text-slate-600">Report Antérieur</td>
                        <td className="p-3 font-bold text-slate-600">Solde antérieur au {dateDebutJournal}</td>
                        <td className={`p-3 font-black text-right ${reportAntérieur >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {reportAntérieur >= 0 ? `+ ${reportAntérieur.toLocaleString('fr-FR')} F` : `${reportAntérieur.toLocaleString('fr-FR')} F`}
                        </td>
                      </tr>
                    )}

                    {mouvementsFiltresJournalPeriode.length === 0 && reportAntérieur === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-6 text-center text-slate-500 font-bold">Aucune opération enregistrée pour cette période.</td>
                      </tr>
                    ) : (
                      mouvementsFiltresJournalPeriode.map((m, index) => {
                        const compteAssocie = comptes.find(c => String(c.id) === String(m.id_compte));
                        const estEntree = m.type_mouvement === 'ENTREE';
                        const numeroPieceSequence = `PC-${String(index + 1).padStart(2, '0')}`;

                        return (
                          <tr key={m.id} className="hover:bg-slate-50">
                            <td className="p-3 font-bold text-slate-800">{new Date(m.created_at).toLocaleDateString('fr-FR')}</td>
                            <td className="p-3 font-mono font-black text-orange-600">{numeroPieceSequence}</td>
                            <td className="p-3 font-bold text-slate-900">
                              {compteAssocie ? compteAssocie.intitule_compte : '-'}
                            </td>
                            <td className="p-3 font-extrabold">{m.libelle}</td>
                            <td className={`p-3 font-black text-right ${estEntree ? 'text-emerald-600' : 'text-red-600'}`}>
                              {estEntree ? `+ ${Number(m.montant).toLocaleString('fr-FR')} F` : `- ${Number(m.montant).toLocaleString('fr-FR')} F`}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Solde en caisse affiché en bas */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex justify-between items-center">
                <span className="font-black text-slate-700 uppercase">Solde Actuel en Caisse :</span>
                <span className="text-sm font-black text-orange-600">
                  {soldeActuelCaisseSelectionnee.toLocaleString('fr-FR')} F CFA
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {sousMenu === 'grand_livre' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm uppercase">📚 Grand Livre des Comptes [{moduleActuel}]</h4>
              <p className="text-slate-700 font-semibold">Édition par compte comptable (Auteur : <strong className="text-orange-600">{utilisateurActif}</strong>)</p>
            </div>
            <button
              onClick={() => window.print()}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl transition shadow"
            >
              🖨️ Imprimer
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 items-end">
            <div>
              <label className="block font-black text-slate-800 mb-1">Du (Date Début) :</label>
              <input
                type="date"
                value={dateDebutLivre}
                onChange={(e) => setDateDebutLivre(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-black text-slate-800 mb-1">Au (Date Fin) :</label>
              <input
                type="date"
                value={dateFinLivre}
                onChange={(e) => setDateFinLivre(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-black text-slate-800 mb-1">Compte Comptable :</label>
              <select
                value={compteLivreId}
                onChange={(e) => setCompteLivreId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-black text-slate-900"
              >
                <option value="">-- Choisir un compte --</option>
                {comptes.map((c) => (
                  <option key={c.id} value={c.id}>[{c.code_compte}] {c.intitule_compte}</option>
                ))}
              </select>
            </div>

            <button
              onClick={lancerEditionGrandLivre}
              className="bg-orange-600 hover:bg-orange-500 text-white font-black px-4 py-2.5 rounded-xl shadow transition"
            >
              🚀 Lancer l'Edition
            </button>
          </div>

          {compteLivreId && (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 font-black">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3 font-mono">N° Pièce</th>
                    <th className="p-3">Libellé</th>
                    <th className="p-3 text-right">Débit (Sortie)</th>
                    <th className="p-3 text-right">Crédit (Entrée)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {resultatGrandLivre.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-slate-500 font-bold">Aucun mouvement trouvé pour ce compte sur cette période.</td>
                    </tr>
                  ) : (
                    resultatGrandLivre.map((m, idx) => {
                      const estEntree = m.type_mouvement === 'ENTREE';
                      return (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="p-3 text-slate-800 font-bold">{new Date(m.created_at).toLocaleDateString('fr-FR')}</td>
                          <td className="p-3 font-mono font-black text-orange-600">PC-{String(idx + 1).padStart(2, '0')}</td>
                          <td className="p-3 font-black text-slate-900">{m.libelle}</td>
                          <td className="p-3 font-black text-red-600 text-right">
                            {!estEntree ? `${Number(m.montant).toLocaleString('fr-FR')} F` : '-'}
                          </td>
                          <td className="p-3 font-black text-emerald-700 text-right">
                            {estEntree ? `${Number(m.montant).toLocaleString('fr-FR')} F` : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {sousMenu === 'controle_cloture' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm uppercase">🔐 Contrôle de Caisse & Clôture [{moduleActuel}]</h4>
              <p className="text-slate-700 font-semibold">Responsable : <strong className="text-orange-600">{utilisateurActif}</strong></p>
            </div>
            <button
              onClick={() => window.print()}
              className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl transition shadow flex items-center gap-1.5"
            >
              🖨️ Imprimer le Rapport
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 items-center">
            <div>
              <label className="block font-black text-slate-800 mb-1">Du (Date Début) :</label>
              <input
                type="date"
                value={dateDebutControle}
                onChange={(e) => setDateDebutControle(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-black text-slate-800 mb-1">Au (Date Fin) :</label>
              <input
                type="date"
                value={dateFinControle}
                onChange={(e) => setDateFinControle(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-black text-slate-800 mb-1">Caisse Principale :</label>
              <select
                value={caisseControleId}
                onChange={(e) => {
                  setCaisseControleId(e.target.value);
                  setMontantPhysiqueReel('');
                  setImputerManquant(false);
                }}
                className="w-full bg-white border border-slate-300 rounded-xl p-2 font-black text-slate-900"
              >
                <option value="">-- Choisir Caisse Principale --</option>
                {caisses.map((c) => (
                  <option key={c.id} value={c.id}>💵 {c.nom_caisse}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-black text-slate-800 mb-1">Caissier :</label>
              <select
                value={caissierFiltre}
                onChange={(e) => setCaissierFiltre(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2 font-black text-slate-900"
              >
                <option value="TOUS">Tous les caissiers</option>
                {utilisateurs.map((u) => (
                  <option key={u.id} value={u.id}>{u.nom_complet || u.email}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-black text-slate-800 mb-1">Montant Attendu :</label>
              <div className="bg-white border border-slate-300 rounded-xl p-2 font-black text-slate-950 text-xs text-center">
                {montantAttenduCaisse.toLocaleString('fr-FR')} F
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 items-center">
            <div>
              <label className="block font-black text-slate-800 mb-1">Montant Physique Réel Compté (F CFA) :</label>
              <input
                type="number"
                placeholder="Ex: 500000"
                value={montantPhysiqueReel}
                onChange={(s) => setMontantPhysiqueReel(s.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-black text-emerald-700 text-sm"
              />
            </div>

            {montantPhysiqueReel !== '' && (
              <div className={`p-3 rounded-xl border flex justify-between items-center ${ecartCaisse === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : ecartCaisse > 0 ? 'bg-blue-50 border-blue-200 text-blue-950' : 'bg-red-50 border-red-200 text-red-950'}`}>
                <div>
                  <span className="font-black block text-[10px] uppercase">Écart constaté :</span>
                  <span className="text-sm font-black">
                    {ecartCaisse === 0 ? 'Aucun écart (Parfait)' : ecartCaisse > 0 ? `+ ${ecartCaisse.toLocaleString('fr-FR')} F (Excédent)` : `${ecartCaisse.toLocaleString('fr-FR')} F (Manquant)`}
                  </span>
                </div>

                {ecartCaisse < 0 && (
                  <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-red-200">
                    <span className="text-[10px] font-black text-red-700">Imputer au compte ?</span>
                    <input
                      type="checkbox"
                      checked={imputerManquant}
                      onChange={(e) => setImputerManquant(e.target.checked)}
                      className="w-4 h-4 accent-red-600"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {montantPhysiqueReel !== '' && (
            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={cloturerEtVerserCaissePrincipale}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-3 rounded-2xl shadow-lg transition text-xs flex items-center gap-2"
              >
                📥 Valider la Clôture & Verser en Caisse Principale ({moduleActuel})
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}