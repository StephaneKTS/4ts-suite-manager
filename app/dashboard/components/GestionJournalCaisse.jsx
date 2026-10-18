'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vtdqodqhkdxanrelxtrq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function GestionJournalCaisse({ entrepriseId = '4TS-TEST', vueInitiale = 'saisie_operations', utilisateurActif = 'THEODORE STEPHANE' }) {
  const [sousMenu, setSousMenu] = useState(vueInitiale);

  const [caisses, setCaisses] = useState([]);
  const [comptes, setComptes] = useState([]);
  const [mouvements, setMouvements] = useState([]);
  const [ventes, setVentes] = useState([]);
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [chargement, setChargement] = useState(false);

  // --- ÉTATS SAISIE (ICÔNE 01) ---
  const [enteteSaisie, setEnteteSaisie] = useState({
    date: new Date().toISOString().split('T')[0],
    id_caisse: '',
    type_mouvement: 'SORTIE',
  });
  const [lignesSaisie, setLignesSaisie] = useState([
    { id_compte: '', libelle: '', montant: '', piece_physique: '' }
  ]);

  // --- ÉTATS GRAND LIVRE (ICÔNE 02) ---
  const [dateDebutLivre, setDateDebutLivre] = useState('');
  const [dateFinLivre, setDateFinLivre] = useState('');
  const [compteLivreId, setCompteLivreId] = useState('');
  const [resultatGrandLivre, setResultatGrandLivre] = useState([]);

  // --- ÉTATS CONTRÔLE DE CAISSE (ICÔNE 03) avec Caissier ---
  const [dateDebutControle, setDateDebutControle] = useState(new Date().toISOString().split('T')[0]);
  const [dateFinControle, setDateFinControle] = useState(new Date().toISOString().split('T')[0]);
  const [caisseControleId, setCaisseControleId] = useState('');
  const [caissierFiltre, setCaissierFiltre] = useState('TOUS');
  const [montantPhysiqueReel, setMontantPhysiqueReel] = useState('');
  const [imputerManquant, setImputerManquant] = useState(false);

  const chargerDonneesGlobales = async () => {
    setChargement(true);
    try {
      const { data: cData } = await supabase.from('caisses').select('*').eq('id_entreprise', entrepriseId);
      setCaisses(cData || []);

      const { data: cpData } = await supabase.from('comptes_comptables').select('*').eq('id_entreprise', entrepriseId);
      setComptes(cpData || []);

      const { data: mData } = await supabase.from('mouvements_caisse').select('*').eq('id_entreprise', entrepriseId).order('created_at', { ascending: false });
      setMouvements(mData || []);

      const { data: vData } = await supabase.from('ventes_historiques').select('*').eq('id_entreprise', entrepriseId);
      setVentes(vData || []);

      const { data: uData } = await supabase.from('utilisateurs').select('*').eq('id_entreprise', entrepriseId);
      setUtilisateurs(uData || []);
    } catch (err) {
      console.error('Erreur chargement :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerDonneesGlobales();
  }, [entrepriseId]);

  const calculerSoldeCaisse = (caisseId) => {
    if (!caisseId) return 0;
    const mvtsCaisse = mouvements.filter(m => String(m.id_caisse) === String(caisseId));
    return mvtsCaisse.reduce((acc, m) => {
      return m.type_mouvement === 'ENTREE' ? acc + Number(m.montant) : acc - Number(m.montant);
    }, 0);
  };

  const ajouterLigneSaisie = () => {
    setLignesSaisie([...lignesSaisie, { id_compte: '', libelle: '', montant: '', piece_physique: '' }]);
  };

  const supprimerLigneSaisie = (index) => {
    if (lignesSaisie.length === 1) return;
    setLignesSaisie(lignesSaisie.filter((_, i) => i !== index));
  };

  const modifierLigne = (index, champ, valeur) => {
    const nouvellesLignes = [...lignesSaisie];
    nouvellesLignes[index][champ] = valeur;
    setLignesSaisie(nouvellesLignes);
  };

  const enregistrerOperationsBatch = async (e) => {
    e.preventDefault();
    if (!enteteSaisie.id_caisse) {
      alert('Veuillez sélectionner une caisse.');
      return;
    }

    try {
      const numeroPieceAuto = 'PC-' + Date.now().toString().slice(-6);

      const payload = lignesSaisie.map(l => ({
        id_entreprise: entrepriseId,
        id_caisse: enteteSaisie.id_caisse,
        type_mouvement: enteteSaisie.type_mouvement,
        montant: Number(l.montant),
        libelle: l.libelle,
        id_compte: l.id_compte || null,
        numero_piece_systeme: numeroPieceAuto,
        numero_piece_physique: l.piece_physique || null,
        created_at: new Date(enteteSaisie.date).toISOString(),
      }));

      const { error } = await supabase.from('mouvements_caisse').insert(payload);
      if (error) throw error;

      alert(`Opérations enregistrées par ${utilisateurActif}. Pièce : ${numeroPieceAuto}`);
      setLignesSaisie([{ id_compte: '', libelle: '', montant: '', piece_physique: '' }]);
      chargerDonneesGlobales();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  // Calcul du montant attendu filtré par caisse, caissier et plage de dates
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
      const caissePrincipale = caisses.find(c => (c.nom_caisse || '').toLowerCase().includes('principale') || (c.nom_caisse || '').toLowerCase().includes('centrale')) || caisses[0];
      
      if (!caissePrincipale) {
        alert('Aucune caisse principale trouvée pour le versement.');
        return;
      }

      const montantVerser = Number(montantPhysiqueReel) || montantAttenduCaisse;
      const libelleVersement = `Recette caisse du ${dateDebutControle} au ${dateFinControle} (Caissier: ${caissierFiltre}) versée par ${utilisateurActif}`;

      const { error } = await supabase.from('mouvements_caisse').insert([
        {
          id_entreprise: entrepriseId,
          id_caisse: caissePrincipale.id,
          type_mouvement: 'ENTREE',
          montant: montantVerser,
          libelle: libelleVersement,
          numero_piece_systeme: 'CLOT-' + Date.now().toString().slice(-6),
          created_at: new Date().toISOString()
        }
      ]);

      if (error) throw error;

      alert(`Clôture effectuée avec succès ! Montant de ${montantVerser.toLocaleString('fr-FR')} F versé en caisse principale.`);
      setMontantPhysiqueReel('');
      setCaisseControleId('');
      chargerDonneesGlobales();
    } catch (err) {
      alert('Erreur lors de la clôture : ' + err.message);
    }
  };

  return (
    <div className="space-y-4 text-xs">
      
      {/* ========================================================= */}
      {/* ICÔNE 01 : SAISIE DES OPÉRATIONS */}
      {/* ========================================================= */}
      {sousMenu === 'saisie_operations' && (
        <form onSubmit={enregistrerOperationsBatch} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm uppercase">📝 Saisie des Opérations & Recettes de Caisse</h4>
              <p className="text-slate-500">Opérateur actif : <strong className="text-orange-600">{utilisateurActif}</strong></p>
            </div>
            {enteteSaisie.id_caisse && (
              <div className="bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-right border border-slate-300">
                <span className="block text-[10px] uppercase text-slate-500 font-bold">Solde Actuel Caisse (Grisé)</span>
                <span className="text-sm font-black text-slate-900">
                  {calculerSoldeCaisse(enteteSaisie.id_caisse).toLocaleString('fr-FR')} F CFA
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Date de l'opération *</label>
              <input
                type="date"
                required
                value={enteteSaisie.date}
                onChange={(e) => setEnteteSaisie({ ...enteteSaisie, date: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl p-2 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Caisse Concernée *</label>
              <select
                required
                value={enteteSaisie.id_caisse}
                onChange={(e) => setEnteteSaisie({ ...enteteSaisie, id_caisse: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-800"
              >
                <option value="">-- Choisir une Caisse --</option>
                {caisses.map((c) => (
                  <option key={c.id} value={c.id}>💵 {c.nom_caisse || c.code_caisse}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Type d'Opération *</label>
              <select
                value={enteteSaisie.type_mouvement}
                onChange={(e) => setEnteteSaisie({ ...enteteSaisie, type_mouvement: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-800"
              >
                <option value="ENTREE">🟢 Entrée / Recette</option>
                <option value="SORTIE">🔴 Sortie / Dépense</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-extrabold uppercase text-slate-600 text-[11px]">Lignes d'opérations (Auteur : {utilisateurActif}) :</span>
              <button
                type="button"
                onClick={ajouterLigneSaisie}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl transition"
              >
                ➕ Ajouter une ligne
              </button>
            </div>

            <div className="space-y-2">
              {lignesSaisie.map((ligne, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200 items-center">
                  <div className="sm:col-span-3">
                    <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Compte Comptable</label>
                    <select
                      required
                      value={ligne.id_compte}
                      onChange={(e) => modifierLigne(index, 'id_compte', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold"
                    >
                      <option value="">-- Compte --</option>
                      {comptes
                        .filter(c => enteteSaisie.type_mouvement === 'ENTREE' ? c.type_compte === 'PRODUIT' : c.type_compte === 'CHARGE')
                        .map((c) => (
                          <option key={c.id} value={c.id}>[{c.code_compte}] {c.intitule_compte}</option>
                        ))}
                    </select>
                  </div>

                  <div className="sm:col-span-4">
                    <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Libellé / Motif</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Achat fournitures..."
                      value={ligne.libelle}
                      onChange={(e) => modifierLigne(index, 'libelle', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-medium"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-slate-500 font-bold mb-0.5">Montant (F CFA)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="0"
                      value={ligne.montant}
                      onChange={(e) => modifierLigne(index, 'montant', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-bold text-orange-600"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] text-slate-500 font-bold mb-0.5">N° Pièce Physique</label>
                    <input
                      type="text"
                      placeholder="Optionnel"
                      value={ligne.piece_physique}
                      onChange={(e) => modifierLigne(index, 'piece_physique', e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2 text-xs font-mono"
                    />
                  </div>

                  <div className="sm:col-span-1 text-center pt-4">
                    <button
                      type="button"
                      onClick={() => supprimerLigneSaisie(index)}
                      className="text-red-500 hover:text-red-700 font-bold p-2"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 rounded-xl shadow transition"
            >
              💾 Enregistrer les Opérations ({utilisateurActif})
            </button>
          </div>
        </form>
      )}

      {/* ========================================================= */}
      {/* ICÔNE 02 : GRAND LIVRE */}
      {/* ========================================================= */}
      {sousMenu === 'grand_livre' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm uppercase">📚 Grand Livre des Comptes</h4>
              <p className="text-slate-500">Édition par compte comptable (Auteur : <strong className="text-orange-600">{utilisateurActif}</strong>)</p>
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
              <label className="block font-bold text-slate-700 mb-1">Du (Date Début) :</label>
              <input
                type="date"
                value={dateDebutLivre}
                onChange={(e) => setDateDebutLivre(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Au (Date Fin) :</label>
              <input
                type="date"
                value={dateFinLivre}
                onChange={(e) => setDateFinLivre(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Compte Comptable :</label>
              <select
                value={compteLivreId}
                onChange={(e) => setCompteLivreId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-slate-800"
              >
                <option value="">-- Choisir un compte --</option>
                {comptes.map((c) => (
                  <option key={c.id} value={c.id}>[{c.code_compte}] {c.intitule_compte}</option>
                ))}
              </select>
            </div>

            <button
              onClick={lancerEditionGrandLivre}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2.5 rounded-xl shadow transition"
            >
              🚀 Lancer l'Édition
            </button>
          </div>

          {compteLivreId && (
            <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-3">Date</th>
                    <th className="p-3 font-mono">N° Pièce</th>
                    <th className="p-3">Libellé</th>
                    <th className="p-3 text-right">Débit (Sortie)</th>
                    <th className="p-3 text-right">Crédit (Entrée)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resultatGrandLivre.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-slate-400">Aucun mouvement trouvé pour ce compte sur cette période.</td>
                    </tr>
                  ) : (
                    resultatGrandLivre.map((m) => {
                      const estEntree = m.type_mouvement === 'ENTREE';
                      return (
                        <tr key={m.id} className="hover:bg-slate-50">
                          <td className="p-3 text-slate-500">{new Date(m.created_at).toLocaleDateString('fr-FR')}</td>
                          <td className="p-3 font-mono font-bold text-orange-600">{m.numero_piece_systeme || '-'}</td>
                          <td className="p-3 font-bold text-slate-800">{m.libelle}</td>
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

      {/* ========================================================= */}
      {/* ICÔNE 03 : CONTRÔLE DE CAISSE & CLÔTURE (AVEC IMPRESSION & CAISSIER) */}
      {/* ========================================================= */}
      {sousMenu === 'controle_cloture' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-extrabold text-slate-800 text-sm uppercase">🔐 Contrôle de Caisse & Clôture Journalière</h4>
              <p className="text-slate-500">Responsable : <strong className="text-orange-600">{utilisateurActif}</strong></p>
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
              <label className="block font-bold text-slate-700 mb-1">Du (Date Début) :</label>
              <input
                type="date"
                value={dateDebutControle}
                onChange={(e) => setDateDebutControle(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Au (Date Fin) :</label>
              <input
                type="date"
                value={dateFinControle}
                onChange={(e) => setDateFinControle(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2 font-medium"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Caisse :</label>
              <select
                value={caisseControleId}
                onChange={(e) => {
                  setCaisseControleId(e.target.value);
                  setMontantPhysiqueReel('');
                  setImputerManquant(false);
                }}
                className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold"
              >
                <option value="">-- Choisir Caisse --</option>
                {caisses.map((c) => (
                  <option key={c.id} value={c.id}>💵 {c.nom_caisse}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Caissier :</label>
              <select
                value={caissierFiltre}
                onChange={(e) => setCaissierFiltre(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold"
              >
                <option value="TOUS">Tous les caissiers</option>
                {utilisateurs.map((u) => (
                  <option key={u.id} value={u.id}>{u.nom || u.email}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Montant Attendu :</label>
              <div className="bg-white border border-slate-300 rounded-xl p-2 font-black text-slate-800 text-xs text-center">
                {montantAttenduCaisse.toLocaleString('fr-FR')} F
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 items-center">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Montant Physique Réel Compté (F CFA) :</label>
              <input
                type="number"
                placeholder="Ex: 500000"
                value={montantPhysiqueReel}
                onChange={(e) => setMontantPhysiqueReel(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-emerald-600 text-sm"
              />
            </div>

            {montantPhysiqueReel !== '' && (
              <div className={`p-3 rounded-xl border flex justify-between items-center ${ecartCaisse === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : ecartCaisse > 0 ? 'bg-blue-50 border-blue-200 text-blue-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                <div>
                  <span className="font-extrabold block text-[10px] uppercase">Écart constaté :</span>
                  <span className="text-sm font-black">
                    {ecartCaisse === 0 ? 'Aucun écart (Parfait)' : ecartCaisse > 0 ? `+ ${ecartCaisse.toLocaleString('fr-FR')} F (Excédent)` : `${ecartCaisse.toLocaleString('fr-FR')} F (Manquant)`}
                  </span>
                </div>

                {ecartCaisse < 0 && (
                  <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-red-200">
                    <span className="text-[10px] font-bold text-red-700">Imputer au compte ?</span>
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
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-2xl shadow-lg transition text-xs flex items-center gap-2"
              >
                📥 Valider la Clôture & Verser en Caisse Principale
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}