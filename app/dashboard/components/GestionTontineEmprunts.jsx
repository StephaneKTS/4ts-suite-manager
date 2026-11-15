'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionTontineEmprunts({ entrepriseId = '4TS-234321', isDarkMode = false }) {
  const [participants, setParticipants] = useState([]);
  const [emprunts, setEmprunts] = useState([]);
  const [caisseRecords, setCaisseRecords] = useState([]);
  const [cotisationsRecords, setCotisationsRecords] = useState([]);
  const [cyclesRecords, setCyclesRecords] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [modalEmpruntOuverte, setModalEmpruntOuverte] = useState(false);
  const [modalSelectionMembreOuverte, setModalSelectionMembreOuverte] = useState(false);

  // Formulaire d'octroi de prêt avec nombre de mois
  const [formEmprunt, setFormEmprunt] = useState({
    id_participant: '',
    montant_principal: '',
    taux_interet: '5', // Taux mensuel par défaut de 5%
    nombre_mois: '3',  // Durée par défaut de 3 mois
    date_emprunt: new Date().toISOString().split('T')[0],
    date_echeance: '',
    motif: ''
  });

  useEffect(() => {
    chargerDonnees();
  }, [entrepriseId]);

  // Calcul automatique de la date d'échéance en fonction de la date de début et du nombre de mois
  useEffect(() => {
    if (formEmprunt.date_emprunt && formEmprunt.nombre_mois) {
      const dateDebut = new Date(formEmprunt.date_emprunt);
      const nbMois = parseInt(formEmprunt.nombre_mois) || 1;
      dateDebut.setMonth(dateDebut.getMonth() + nbMois);
      const dateEchStr = dateDebut.toISOString().split('T')[0];
      setFormEmprunt(prev => ({ ...prev, date_echeance: dateEchStr }));
    }
  }, [formEmprunt.date_emprunt, formEmprunt.nombre_mois]);

  const chargerDonnees = async () => {
    setChargement(true);
    const idEnt = entrepriseId || '4TS-234321';
    try {
      // 1. Récupération des participants enregistrés
      const { data: part, error: errPart } = await supabase
        .from('tontine_participants')
        .select('*')
        .eq('id_entreprise', idEnt);
      if (errPart) throw errPart;

      // 2. Récupération des cycles
      const { data: cyc, error: errCyc } = await supabase
        .from('tontine_cycles')
        .select('*')
        .eq('id_entreprise', idEnt);
      if (errCyc && errCyc.code !== '42P01') console.warn('Table tontine_cycles :', errCyc.message);

      // 3. Récupération des entrées de caisse
      const { data: cai, error: errCai } = await supabase
        .from('tontine_caisse')
        .select('*')
        .eq('id_entreprise', idEnt);
      if (errCai && errCai.code !== '42P01') console.warn('Table tontine_caisse :', errCai.message);

      // 4. Récupération des cotisations
      const { data: cotis, error: errCotis } = await supabase
        .from('tontine_cotisations')
        .select('*')
        .eq('id_entreprise', idEnt);
      if (errCotis && errCotis.code !== '42P01') console.warn('Table tontine_cotisations :', errCotis.message);

      // 5. Récupération de la table des emprunts
      const { data: emp, error: errEmp } = await supabase
        .from('tontine_emprunts')
        .select(`
          *,
          tontine_participants (id, nom_participant, nom_complet, prenom, telephone, cni)
        `)
        .eq('id_entreprise', idEnt)
        .order('created_at', { ascending: false });
      
      if (errEmp && errEmp.code !== '42P01') {
        console.warn('Table tontine_emprunts inexistante ou erreur :', errEmp.message);
      }

      if (part) setParticipants(part);
      if (cyc) setCyclesRecords(cyc);
      if (cai) setCaisseRecords(cai);
      if (cotis) setCotisationsRecords(cotis);
      if (emp) setEmprunts(emp);
    } catch (err) {
      console.error('Erreur chargement emprunts :', err.message);
    } finally {
      setChargement(false);
    }
  };

  // Dédoublonnage strict des membres
  const participantsUniques = participants.reduce((acc, current) => {
    const nomKey = `${(current.nom_participant || current.nom_complet || '').trim().toLowerCase()} ${(current.prenom || '').trim().toLowerCase()}`;
    const existing = acc.find(item => {
      const itemKey = `${(item.nom_participant || item.nom_complet || '').trim().toLowerCase()} ${(item.prenom || '').trim().toLowerCase()}`;
      return itemKey === nomKey || (current.cni && item.cni && current.cni === item.cni);
    });
    if (!existing) {
      acc.push(current);
    }
    return acc;
  }, []);

  // FILTRE STRICT : Identifier uniquement les cycles de type Épargne ou Banque (excluant totalement les présences)
  const idsCyclesEpargne = (cyclesRecords || []).filter(c => {
    const texte = `${c.nom_cycle || ''} ${c.type || ''} ${c.type_cycle || ''} ${c.nature || ''} ${c.libelle || ''}`.toLowerCase();
    const estEpargneOuBanque = texte.includes('epargne') || texte.includes('épargne') || texte.includes('banque');
    const estPresence = texte.includes('presence') || texte.includes('présence');
    return estEpargneOuBanque && !estPresence;
  }).map(c => c.id);

  const estCycleEpargneStrict = (item) => {
    const cycleId = item.id_cycle || item.cycle_id;
    const nomCycleItem = `${item.nom_cycle || ''} ${item.caisse_cycle || ''} ${item.cycle_nom || ''} ${item.libelle || ''}`.toLowerCase();
    
    if (nomCycleItem.includes('presence') || nomCycleItem.includes('présence')) {
      return false;
    }

    if (cycleId && idsCyclesEpargne.includes(Number(cycleId))) return true;

    if (nomCycleItem.includes('epargne') || nomCycleItem.includes('épargne') || nomCycleItem.includes('banque')) {
      return true;
    }

    return false;
  };

  // Calcul du solde global de la caisse générale en sommant UNIQUEMENT les vraies épargnes/banques
  const totalCaisseEpargne = (caisseRecords || [])
    .filter(estCycleEpargneStrict)
    .reduce((acc, curr) => acc + (parseFloat(curr.montant_total || curr.montant_verse || curr.montant || 0)), 0);

  const totalCotisationsEpargne = (cotisationsRecords || [])
    .filter(estCycleEpargneStrict)
    .reduce((acc, curr) => acc + (parseFloat(curr.montant_verse || curr.montant || 0)), 0);

  const soldeCaisseGenerale = totalCaisseEpargne > 0 ? totalCaisseEpargne : totalCotisationsEpargne;
  
  // Total des prêts en cours
  const totalEmpruntsEnCours = emprunts
    .filter(e => e.statut === 'EN_COURS')
    .reduce((acc, curr) => acc + (parseFloat(curr.montant_principal || 0)), 0);

  // Solde disponible pour de nouveaux prêts
  const soldeDisponibleCaisse = soldeCaisseGenerale - totalEmpruntsEnCours;

  // Calcul dynamique des intérêts par mois et du montant total à rembourser
  const calculerMontants = () => {
    const principal = parseFloat(formEmprunt.montant_principal) || 0;
    const tauxMensuel = parseFloat(formEmprunt.taux_interet) || 0;
    const nbMois = parseInt(formEmprunt.nombre_mois) || 1;
    
    const montantInteret = (principal * (tauxMensuel / 100)) * nbMois;
    const montantTotal = principal + montantInteret;
    return { principal, montantInteret, montantTotal, nbMois };
  };

  const soumettreDemandeEmprunt = async (e) => {
    e.preventDefault();
    if (!formEmprunt.id_participant || !formEmprunt.montant_principal) {
      alert('⚠️ Veuillez sélectionner un membre et indiquer le montant du prêt.');
      return;
    }

    const { principal, montantInteret, montantTotal } = calculerMontants();

    if (principal > soldeDisponibleCaisse) {
      alert(`⚠️ Solde disponible en caisse (Épargnes & Banques) : ${soldeDisponibleCaisse.toLocaleString()} FCFA.\n\nLe montant demandé (${principal.toLocaleString()} FCFA) dépasse ce solde disponible.`);
      return;
    }

    const idEnt = entrepriseId || '4TS-234321';
    setChargement(true);

    try {
      const payload = {
        id_entreprise: idEnt,
        id_participant: parseInt(formEmprunt.id_participant),
        montant_principal: principal,
        taux_interet: parseFloat(formEmprunt.taux_interet) || 0,
        montant_interet: montantInteret,
        montant_total: montantTotal,
        date_emprunt: formEmprunt.date_emprunt,
        date_echeance: formEmprunt.date_echeance || null,
        motif: formEmprunt.motif || 'Prêt / Crédit tontine',
        statut: 'EN_COURS'
      };

      const { error } = await supabase.from('tontine_emprunts').insert([payload]);
      if (error) throw error;

      alert('✅ Prêt accordé et enregistré avec succès !');
      setModalEmpruntOuverte(false);
      setFormEmprunt({
        id_participant: '',
        montant_principal: '',
        taux_interet: '5',
        nombre_mois: '3',
        date_emprunt: new Date().toISOString().split('T')[0],
        date_echeance: '',
        motif: ''
      });
      await chargerDonnees();
    } catch (err) {
      alert('❌ Erreur lors de l’enregistrement : ' + err.message);
    } finally {
      setChargement(false);
    }
  };

  const marquerRembourse = async (idEmprunt) => {
    if (!confirm('Confirmer le remboursement complet de cet emprunt ?')) return;

    try {
      const { error } = await supabase
        .from('tontine_emprunts')
        .update({ statut: 'REMBOURSE', date_remboursement: new Date().toISOString().split('T')[0] })
        .eq('id', idEmprunt);

      if (error) throw error;
      alert('✅ Prêt marqué comme remboursé avec succès !');
      await chargerDonnees();
    } catch (err) {
      alert('❌ Erreur : ' + err.message);
    }
  };

  const containerBg = isDarkMode ? 'bg-[#0b1329] text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200';
  const headerBarBg = isDarkMode ? 'bg-slate-900 text-slate-200 border-slate-700' : 'bg-gray-100 text-black border-gray-300';
  const inputBg = isDarkMode ? 'bg-[#1b263b] text-white border-slate-700' : 'bg-gray-100 text-black border-gray-300';

  const { principal, montantInteret, montantTotal, nbMois } = calculerMontants();
  const membreSelectionne = participants.find(p => p.id.toString() === formEmprunt.id_participant.toString());

  return (
    <div className={`w-full max-w-4xl mx-auto p-3 rounded-xl border shadow-md space-y-3 text-xs font-sans ${containerBg}`}>
      
      {/* EN-TÊTE ET BOUTON NOUVEAU PRÊT */}
      <div className={`p-3 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-3 ${headerBarBg}`}>
        <div>
          <h3 className="font-black text-sm uppercase flex items-center gap-1.5">
            <span>💳</span> Gestion des Emprunts & Calcul des Intérêts
          </h3>
          <p className="text-[10px] opacity-80 mt-0.5">
            Octroi de prêts sur la caisse générale (Épargnes & Banques) avec suivi des échéances et des remboursements.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalEmpruntOuverte(true)}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-3.5 py-2 rounded-xl uppercase transition shadow cursor-pointer text-xs flex items-center gap-1.5 shrink-0"
        >
          <span>➕</span> Nouveau Prêt
        </button>
      </div>

      {/* CARTES DE SYNTHÈSE DE LA CAISSE GÉNÉRALE */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="p-3 rounded-xl bg-slate-800 text-white border border-slate-700 shadow-2xs">
          <span className="block text-[9px] uppercase font-bold text-slate-400">Solde Caisse (Épargnes)</span>
          <span className="text-base font-black font-mono text-cyan-400">{soldeCaisseGenerale.toLocaleString()} FCFA</span>
        </div>
        <div className="p-3 rounded-xl bg-amber-950/60 text-amber-200 border border-amber-800/60 shadow-2xs">
          <span className="block text-[9px] uppercase font-bold text-amber-400">Prêts en cours (Principal)</span>
          <span className="text-base font-black font-mono">{totalEmpruntsEnCours.toLocaleString()} FCFA</span>
        </div>
        <div className="p-3 rounded-xl bg-emerald-950/60 text-emerald-200 border border-emerald-800/60 shadow-2xs">
          <span className="block text-[9px] uppercase font-bold text-emerald-400">Solde Disponible Prêt</span>
          <span className="text-base font-black font-mono">{soldeDisponibleCaisse.toLocaleString()} FCFA</span>
        </div>
      </div>

      {/* LISTE DES EMPRUNTS */}
      <div className="space-y-2">
        <h4 className="font-black uppercase text-xs">Historique des Emprunts ({emprunts.length})</h4>

        <div className="overflow-x-auto border border-gray-300 rounded-xl bg-white shadow-2xs">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 uppercase text-[9px] font-black bg-gray-100 text-black z-10 border-b border-gray-300">
              <tr>
                <th className="p-2.5">Membre Emprunteur</th>
                <th className="p-2.5 text-right">Principal</th>
                <th className="p-2.5 text-center">Taux / Mois</th>
                <th className="p-2.5 text-right">Intérêt Total</th>
                <th className="p-2.5 text-right">Total à Rembourser</th>
                <th className="p-2.5 text-center">Échéance</th>
                <th className="p-2.5 text-center">Statut</th>
                <th className="p-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-[10px] text-black">
              {emprunts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-6 text-center font-bold text-gray-500">
                    Aucun emprunt enregistré. Cliquez sur "Nouveau Prêt" pour en créer un.
                  </td>
                </tr>
              ) : (
                emprunts.map((emp) => {
                  const m = emp.tontine_participants;
                  const nomComplet = m ? `${m.nom_participant || m.nom_complet || ''} ${m.prenom || ''}` : `Membre #${emp.id_participant}`;
                  const estEnCours = emp.statut === 'EN_COURS';

                  return (
                    <tr key={emp.id} className="hover:bg-gray-50 transition">
                      <td className="p-2.5 uppercase font-black text-slate-900">
                        {nomComplet}
                        {m?.cni && <span className="block text-[9px] font-normal text-gray-500">CNI : {m.cni}</span>}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold">{parseFloat(emp.montant_principal || 0).toLocaleString()} F</td>
                      <td className="p-2.5 text-center font-mono">{emp.taux_interet}%</td>
                      <td className="p-2.5 text-right font-mono text-amber-700">{parseFloat(emp.montant_interet || 0).toLocaleString()} F</td>
                      <td className="p-2.5 text-right font-mono font-black text-emerald-700">{parseFloat(emp.montant_total || 0).toLocaleString()} F</td>
                      <td className="p-2.5 text-center font-mono text-gray-600">{emp.date_echeance ? new Date(emp.date_echeance).toLocaleDateString() : 'Non définie'}</td>
                      <td className="p-2.5 text-center">
                        {estEnCours ? (
                          <span className="bg-amber-100 text-amber-900 font-black px-2 py-0.5 rounded-full text-[9px] uppercase border border-amber-300">En cours</span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-900 font-black px-2 py-0.5 rounded-full text-[9px] uppercase border border-emerald-300">Remboursé</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center">
                        {estEnCours && (
                          <button
                            type="button"
                            onClick={() => marquerRembourse(emp.id)}
                            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-2 py-1 rounded text-[9px] uppercase transition cursor-pointer shadow-2xs"
                          >
                            Rembourser ✓
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALE FORMULAIRE DE PRÊT */}
      {modalEmpruntOuverte && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
          <div className={`w-[95%] sm:w-full max-w-md rounded-2xl shadow-2xl border p-4 space-y-3 max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-[#0b1329] border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}>
            <div className="flex justify-between items-center border-b pb-2 border-slate-700/30">
              <h5 className="font-black text-sm uppercase flex items-center gap-1.5">
                <span>➕</span> Formulaire de Demande / Octroi de Prêt
              </h5>
              <button type="button" onClick={() => setModalEmpruntOuverte(false)} className="font-bold text-sm cursor-pointer">✖</button>
            </div>

            {/* BANNIÈRE AFFICHANT LE SOLDE DISPONIBLE EN CAISSE */}
            <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-700 text-emerald-200 flex justify-between items-center font-mono">
              <span className="text-[10px] uppercase font-bold">Solde Disponible en Caisse :</span>
              <span className="font-black text-sm">{soldeDisponibleCaisse.toLocaleString()} FCFA</span>
            </div>

            <form onSubmit={soumettreDemandeEmprunt} className="space-y-3 text-xs">
              
              {/* SÉLECTION DU MEMBRE VIA MODALE */}
              <div>
                <label className="block font-black text-[10px] uppercase mb-1">Membre Emprunteur :</label>
                <div 
                  onClick={() => setModalSelectionMembreOuverte(true)}
                  className={`w-full p-2.5 rounded-lg border font-bold flex justify-between items-center cursor-pointer ${inputBg}`}
                >
                  <span className={!membreSelectionne ? 'opacity-60' : ''}>
                    {membreSelectionne ? `${membreSelectionne.nom_participant || membreSelectionne.nom_complet || ''} ${membreSelectionne.prenom || ''} ${membreSelectionne.cni ? `(CNI: ${membreSelectionne.cni})` : ''}` : '-- Cliquez pour choisir un membre unique --'}
                  </span>
                  <span className="text-sm">🔍</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-black text-[10px] uppercase mb-1">Montant Principal (F) :</label>
                  <input
                    type="number"
                    value={formEmprunt.montant_principal}
                    onChange={(e) => setFormEmprunt({ ...formEmprunt, montant_principal: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    placeholder="Ex: 50000"
                    required
                    className={`w-full p-2 rounded-lg border font-mono font-bold ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="block font-black text-[10px] uppercase mb-1">Taux d'Intérêt (% / mois) :</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formEmprunt.taux_interet}
                    onChange={(e) => setFormEmprunt({ ...formEmprunt, taux_interet: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    required
                    className={`w-full p-2 rounded-lg border font-mono font-bold ${inputBg}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-black text-[10px] uppercase mb-1">Durée (en mois) :</label>
                  <input
                    type="number"
                    min="1"
                    value={formEmprunt.nombre_mois}
                    onChange={(e) => setFormEmprunt({ ...formEmprunt, nombre_mois: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    required
                    className={`w-full p-2 rounded-lg border font-mono font-bold ${inputBg}`}
                  />
                </div>
                <div>
                  <label className="block font-black text-[10px] uppercase mb-1">Date d'Emprunt (Début) :</label>
                  <input
                    type="date"
                    value={formEmprunt.date_emprunt}
                    onChange={(e) => setFormEmprunt({ ...formEmprunt, date_emprunt: e.target.value })}
                    onFocus={(e) => e.target.select()}
                    required
                    className={`w-full p-2 rounded-lg border font-mono ${inputBg}`}
                  />
                </div>
              </div>

              <div>
                <label className="block font-black text-[10px] uppercase mb-1">Date d'Échéance (Calculée auto) :</label>
                <input
                  type="date"
                  value={formEmprunt.date_echeance}
                  readOnly
                  className={`w-full p-2 rounded-lg border font-mono opacity-80 cursor-not-allowed ${inputBg}`}
                />
              </div>

              {/* SIMULATION AUTOMATIQUE DES INTÉRÊTS */}
              {formEmprunt.montant_principal > 0 && (
                <div className="p-2.5 rounded-xl bg-slate-800/80 text-white border border-slate-700 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span>Principal demandé :</span>
                    <b>{principal.toLocaleString()} FCFA</b>
                  </div>
                  <div className="flex justify-between text-amber-300">
                    <span>Intérêt ({formEmprunt.taux_interet}% × {nbMois} mois) :</span>
                    <b>{montantInteret.toLocaleString()} FCFA</b>
                  </div>
                  <div className="flex justify-between border-t border-slate-600 pt-1 text-emerald-400 font-black">
                    <span>Total à rembourser :</span>
                    <span>{montantTotal.toLocaleString()} FCFA</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-black text-[10px] uppercase mb-1">Motif / Projet du Prêt :</label>
                <input
                  type="text"
                  value={formEmprunt.motif}
                  onChange={(e) => setFormEmprunt({ ...formEmprunt, motif: e.target.value })}
                  onFocus={(e) => e.target.select()}
                  placeholder="Ex: Commerce, urgence familiale..."
                  className={`w-full p-2 rounded-lg border ${inputBg}`}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setModalEmpruntOuverte(false)}
                  className="px-3 py-2 rounded-lg font-bold text-xs bg-slate-700 hover:bg-slate-600 text-white cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={chargement}
                  className="px-4 py-2 rounded-lg font-black text-xs bg-emerald-600 hover:bg-emerald-500 text-white uppercase shadow cursor-pointer disabled:opacity-50"
                >
                  {chargement ? 'Enregistrement...' : 'Valider & Octroyer le Prêt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MINI-MODALE DE SÉLECTION DU MEMBRE UNIQUE */}
      {modalSelectionMembreOuverte && (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 animate-fadeIn">
          <div className={`w-[95%] sm:w-full max-w-md rounded-2xl shadow-2xl border p-4 space-y-3 max-h-[85vh] overflow-y-auto ${isDarkMode ? 'bg-[#0b1329] border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}>
            <div className="flex justify-between items-center border-b pb-2 border-slate-700/30">
              <h6 className="font-black text-xs uppercase flex items-center gap-1.5">
                <span>👥</span> Sélectionner un Membre Unique
              </h6>
              <button type="button" onClick={() => setModalSelectionMembreOuverte(false)} className="font-bold text-sm cursor-pointer">✖</button>
            </div>

            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto pr-1">
              {participantsUniques.length === 0 ? (
                <p className="text-center py-4 font-bold text-gray-500">Aucun participant enregistré.</p>
              ) : (
                participantsUniques.map(p => {
                  const nomAffichage = `${p.nom_participant || p.nom_complet || ''} ${p.prenom || ''}`;
                  return (
                    <div 
                      key={p.id}
                      onClick={() => {
                        setFormEmprunt({ ...formEmprunt, id_participant: p.id.toString() });
                        setModalSelectionMembreOuverte(false);
                      }}
                      className={`p-2.5 rounded-xl border cursor-pointer transition flex justify-between items-center ${isDarkMode ? 'bg-[#152238] border-slate-700 hover:bg-[#1e3050]' : 'bg-gray-50 border-gray-200 hover:bg-blue-50'}`}
                    >
                      <div>
                        <p className="font-black uppercase text-xs">{nomAffichage}</p>
                        <p className="text-[9px] opacity-70">📞 {p.telephone || 'N/A'} {p.cni ? `| CNI: ${p.cni}` : ''}</p>
                      </div>
                      <span className="bg-emerald-600 text-white font-bold px-2 py-1 rounded text-[9px] uppercase">Sélectionner →</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}