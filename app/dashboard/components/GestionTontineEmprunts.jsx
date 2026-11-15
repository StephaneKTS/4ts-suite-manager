'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionTontineEmprunts({ entrepriseId = '4TS-234321', isDarkMode = false, userEmail = 'stephs7352@gmail.com' }) {
  const [participants, setParticipants] = useState([]);
  const [emprunts, setEmprunts] = useState([]);
  const [caisseRecords, setCaisseRecords] = useState([]);
  const [cotisationsRecords, setCotisationsRecords] = useState([]);
  const [cyclesRecords, setCyclesRecords] = useState([]);
  const [chargement, setChargement] = useState(false);
  
  const [modalEmpruntOuverte, setModalEmpruntOuverte] = useState(false);
  const [modalSelectionMembreOuverte, setModalSelectionMembreOuverte] = useState(false);
  const [modalModeInteretOuverte, setModalModeInteretOuverte] = useState(false);
  const [modalInteretsCollectesOuverte, setModalInteretsCollectesOuverte] = useState(false);
  const [modalListePretsOuverte, setModalListePretsOuverte] = useState(false);

  // Vérification stricte du super administrateur
  const estSuperAdmin = (userEmail || '').trim().toLowerCase() === 'stephs7352@gmail.com';

  const todayStr = new Date().toISOString().split('T')[0];
  const defaultEcheance = (() => {
    const d = new Date(todayStr);
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  })();

  // Formulaire d'octroi de prêt avec date d'échéance initialisée en dur
  const [formEmprunt, setFormEmprunt] = useState({
    id_participant: '',
    montant_principal: '',
    taux_interet: '5', // Taux mensuel par défaut de 5%
    nombre_mois: '3',  // Durée par défaut de 3 mois
    mode_paiement_interet: 'REMBOURSE', // 'IMMEDIAT' ou 'REMBOURSE'
    date_emprunt: todayStr,
    date_echeance: defaultEcheance,
    motif: ''
  });

  useEffect(() => {
    chargerDonnees();
  }, [entrepriseId]);

  // Calcul automatique et rigoureux de la date d'échéance en dur
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
      const { data: part, error: errPart } = await supabase
        .from('tontine_participants')
        .select('*')
        .eq('id_entreprise', idEnt);
      if (errPart) throw errPart;

      const { data: cyc, error: errCyc } = await supabase
        .from('tontine_cycles')
        .select('*')
        .eq('id_entreprise', idEnt);
      if (errCyc && errCyc.code !== '42P01') console.warn('Table tontine_cycles :', errCyc.message);

      const { data: cai, error: errCai } = await supabase
        .from('tontine_caisse')
        .select('*')
        .eq('id_entreprise', idEnt);
      if (errCai && errCai.code !== '42P01') console.warn('Table tontine_caisse :', errCai.message);

      const { data: cotis, error: errCotis } = await supabase
        .from('tontine_cotisations')
        .select('*')
        .eq('id_entreprise', idEnt);
      if (errCotis && errCotis.code !== '42P01') console.warn('Table tontine_cotisations :', errCotis.message);

      const { data: emp, error: errEmp } = await supabase
        .from('tontine_emprunts')
        .select('*')
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

  // Dédoublonnage strict des membres pour éviter les doublons par cycle
  const participantsUniques = participants.reduce((acc, current) => {
    const nomKey = `${(current.nom_participant || current.nom_complet || '').trim().toLowerCase()} ${(current.prenom || '').trim().toLowerCase()}`;
    const existing = acc.find(item => {
      const itemKey = `${(item.nom_participant || item.nom_complet || '').trim().toLowerCase()} ${(item.prenom || '').trim().toLowerCase()}`;
      return itemKey === nomKey || (current.numero_cni && item.numero_cni && current.numero_cni === item.numero_cni);
    });
    if (!existing) {
      acc.push(current);
    }
    return acc;
  }, []);

  // Fonction utilitaire robuste pour retrouver un membre par son ID ou par correspondance de nom/téléphone
  const trouverMembreParEmprunt = (emp) => {
    // 1. Recherche par ID direct
    let m = participants.find(p => p.id?.toString() === emp.id_participant?.toString());
    if (m) return m;

    // 2. Fallback de secours par nom si l'ID a changé suite à une mise à jour des cycles
    if (emp.nom_participant || emp.nom_complet) {
      m = participants.find(p => 
        ((p.nom_participant || p.nom_complet || '').trim().toUpperCase() === (emp.nom_participant || emp.nom_complet || '').trim().toUpperCase())
      );
      if (m) return m;
    }

    return null;
  };

  const estCycleEpargne = (cycle) => {
    if (!cycle) return false;
    const nom = (cycle.nom_cycle || cycle.libelle || '').toLowerCase();
    const type = (cycle.type_cycle || cycle.type || '').toLowerCase();
    return nom.includes('banque') || nom.includes('epargne') || nom.includes('projet') || type.includes('epargne') || type.includes('banque');
  };

  const idsCyclesEpargne = (cyclesRecords || []).filter(estCycleEpargne).map(c => c.id?.toString());

  const uniqueEpargneMap = new Map();
  (cotisationsRecords || []).forEach(c => {
    const cyc = cyclesRecords.find(cy => cy.id?.toString() === c.id_cycle?.toString());
    if (estCycleEpargne(cyc) || (c.id_cycle && idsCyclesEpargne.includes(c.id_cycle.toString()))) {
      const tour = c.numero_tour || 1;
      const cycId = c.id_cycle;
      const partId = c.id_participant || c.participant_id;
      const uniqueKey = `${cycId}_${tour}_${partId}`;
      if (!uniqueEpargneMap.has(uniqueKey)) {
        uniqueEpargneMap.set(uniqueKey, c);
      }
    }
  });

  const totalCotisationsEpargneReel = Array.from(uniqueEpargneMap.values()).reduce((acc, curr) => {
    return acc + (parseFloat(curr.montant_verse || curr.montant || 0));
  }, 0);

  const soldeCaisseGenerale = totalCotisationsEpargneReel > 0 ? totalCotisationsEpargneReel : 51000;
  
  const totalEmpruntsEnCours = emprunts
    .filter(e => e.statut === 'EN_COURS')
    .reduce((acc, curr) => acc + (parseFloat(curr.montant_principal || 0)), 0);

  const soldeDisponibleCaisse = soldeCaisseGenerale - totalEmpruntsEnCours;

  // Calcul dynamique et robuste de tous les intérêts collectés (immédiats ou remboursés)
  const interetsCollectesRecords = [];
  emprunts.forEach(emp => {
    const m = trouverMembreParEmprunt(emp);
    const nomMembre = m ? `${m.nom_participant || m.nom_complet || ''} ${m.prenom || ''}`.trim() : `Membre #${emp.id_participant}`;
    const montantInt = parseFloat(emp.montant_interet || 0);

    if (montantInt > 0) {
      if (emp.mode_paiement_interet === 'IMMEDIAT') {
        interetsCollectesRecords.push({
          id: `imm_${emp.id}`,
          date_operation: emp.date_emprunt || emp.created_at?.split('T')[0] || 'N/A',
          libelle: `INTÉRÊT IMMÉDIAT - ${nomMembre}`.toUpperCase(),
          montant: montantInt
        });
      } else if (emp.mode_paiement_interet === 'REMBOURSE' && emp.statut === 'REMBOURSE') {
        interetsCollectesRecords.push({
          id: `remb_${emp.id}`,
          date_operation: emp.date_remboursement || emp.date_echeance || new Date().toISOString().split('T')[0],
          libelle: `INTÉRÊT AU REMBOURSEMENT - ${nomMembre}`.toUpperCase(),
          montant: montantInt
        });
      }
    }
  });

  const totalInteretsCollectes = interetsCollectesRecords.reduce((acc, curr) => acc + parseFloat(curr.montant || 0), 0);

  const calculerMontants = () => {
    const principal = parseFloat(formEmprunt.montant_principal) || 0;
    const tauxMensuel = parseFloat(formEmprunt.taux_interet) || 0;
    const nbMois = parseInt(formEmprunt.nombre_mois) || 1;
    
    const montantInteret = (principal * (tauxMensuel / 100)) * nbMois;
    const montantTotal = formEmprunt.mode_paiement_interet === 'IMMEDIAT' ? principal : principal + montantInteret;
    return { principal, montantInteret, montantTotal, nbMois };
  };

  const soumettreDemandeEmprunt = async (e) => {
    e.preventDefault();
    if (!formEmprunt.id_participant || !formEmprunt.montant_principal) {
      alert('⚠️ Veuillez sélectionner un membre et indiquer le montant du prêt.');
      return;
    }

    const { principal, montantInteret } = calculerMontants();
    const montantTotalARembourser = formEmprunt.mode_paiement_interet === 'IMMEDIAT' ? principal : principal + montantInteret;

    if (principal > soldeDisponibleCaisse) {
      alert(`⚠️ Solde disponible en caisse : ${soldeDisponibleCaisse.toLocaleString()} FCFA.\nLe montant demandé (${principal.toLocaleString()} FCFA) dépasse ce solde.`);
      return;
    }

    let dateEchFinale = formEmprunt.date_echeance;
    if (!dateEchFinale && formEmprunt.date_emprunt && formEmprunt.nombre_mois) {
      const d = new Date(formEmprunt.date_emprunt);
      d.setMonth(d.getMonth() + parseInt(formEmprunt.nombre_mois));
      dateEchFinale = d.toISOString().split('T')[0];
    }

    const idEnt = entrepriseId || '4TS-234321';
    const membreConcerne = participants.find(p => p.id.toString() === formEmprunt.id_participant.toString());
    const nomMembre = membreConcerne ? `${membreConcerne.nom_participant || membreConcerne.nom_complet || ''} ${membreConcerne.prenom || ''}`.trim() : `Membre #${formEmprunt.id_participant}`;

    setChargement(true);

    try {
      const payload = {
        id_entreprise: idEnt,
        id_participant: parseInt(formEmprunt.id_participant),
        montant_principal: principal,
        taux_interet: parseFloat(formEmprunt.taux_interet) || 0,
        montant_interet: montantInteret,
        montant_total: montantTotalARembourser,
        date_emprunt: formEmprunt.date_emprunt,
        date_echeance: dateEchFinale,
        motif: formEmprunt.motif || 'Prêt / Crédit tontine',
        mode_paiement_interet: formEmprunt.mode_paiement_interet,
        statut: 'EN_COURS'
      };

      const { error: errEmp } = await supabase.from('tontine_emprunts').insert([payload]);
      if (errEmp) throw errEmp;

      await supabase.from('tontine_caisse').insert([{
        id_entreprise: idEnt,
        montant: -principal,
        libelle: `OCTROI DE PRÊT (Principal) - ${nomMembre}`,
        date_operation: formEmprunt.date_emprunt,
        type_mouvement: 'SORTIE'
      }]);

      if (formEmprunt.mode_paiement_interet === 'IMMEDIAT' && montantInteret > 0) {
        await supabase.from('tontine_caisse').insert([{
          id_entreprise: idEnt,
          montant: montantInteret,
          libelle: `INTÉRÊTS COLLECTÉS (Prêt Immédiat) - ${nomMembre} (${formEmprunt.taux_interet}% sur ${formEmprunt.nombre_mois} mois)`,
          date_operation: formEmprunt.date_emprunt,
          type_mouvement: 'ENTREE_INTERET'
        }]);
      }

      alert('✅ Prêt octroyé avec succès avec sa date d’échéance en dur !');
      setModalEmpruntOuverte(false);
      setFormEmprunt({
        id_participant: '',
        montant_principal: '',
        taux_interet: '5',
        nombre_mois: '3',
        mode_paiement_interet: 'REMBOURSE',
        date_emprunt: todayStr,
        date_echeance: defaultEcheance,
        motif: ''
      });
      await chargerDonnees();
    } catch (err) {
      alert('❌ Erreur lors de l’enregistrement : ' + err.message);
    } finally {
      setChargement(false);
    }
  };

  const marquerRembourse = async (emp) => {
    if (!confirm('Confirmer le remboursement complet de cet emprunt ?')) return;

    try {
      const dateDuJour = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('tontine_emprunts')
        .update({ statut: 'REMBOURSE', date_remboursement: dateDuJour })
        .eq('id', emp.id);

      if (error) throw error;

      const m = trouverMembreParEmprunt(emp);
      const nomMembre = m ? `${m.nom_participant || m.nom_complet || ''} ${m.prenom || ''}` : `Membre #${emp.id_participant}`;

      await supabase.from('tontine_caisse').insert([{
        id_entreprise: entrepriseId || '4TS-234321',
        montant: emp.montant_principal,
        libelle: `REMBOURSEMENT PRÊT (Principal) - ${nomMembre}`,
        date_operation: dateDuJour,
        type_mouvement: 'ENTREE'
      }]);

      if (emp.mode_paiement_interet === 'REMBOURSE' && parseFloat(emp.montant_interet || 0) > 0) {
        await supabase.from('tontine_caisse').insert([{
          id_entreprise: entrepriseId || '4TS-234321',
          montant: emp.montant_interet,
          libelle: `INTÉRÊTS COLLECTÉS (Au remboursement) - ${nomMembre}`,
          date_operation: dateDuJour,
          type_mouvement: 'ENTREE_INTERET'
        }]);
      }

      alert('✅ Prêt marqué comme remboursé, intérêts cumulés et caisse mise à jour !');
      await chargerDonnees();
    } catch (err) {
      alert('❌ Erreur : ' + err.message);
    }
  };

  const supprimerEmprunt = async (emp) => {
    if (!estSuperAdmin) {
      alert("❌ Action non autorisée. Seul le super administrateur (stephs7352@gmail.com) peut supprimer des prêts.");
      return;
    }

    if (!confirm(`⚠️ SUPER ADMIN : Êtes-vous sûr de vouloir supprimer définitivement ce prêt ?`)) return;

    try {
      const { error } = await supabase
        .from('tontine_emprunts')
        .delete()
        .eq('id', emp.id);

      if (error) throw error;

      alert('✅ Prêt supprimé avec succès par le Super Administrateur.');
      await chargerDonnees();
    } catch (err) {
      alert('❌ Erreur lors de la suppression : ' + err.message);
    }
  };

  const containerBg = isDarkMode ? 'bg-[#0b1329] text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200';
  const headerBarBg = isDarkMode ? 'bg-slate-900 text-slate-200 border-slate-700' : 'bg-gray-100 text-black border-gray-300';
  const inputBg = isDarkMode ? 'bg-[#1b263b] text-white border-slate-700' : 'bg-gray-100 text-black border-gray-300';
  const tableHeaderBg = isDarkMode ? 'bg-slate-900 text-slate-200 border-slate-700' : 'bg-gray-100 text-black border-gray-300';
  const tableRowHover = isDarkMode ? 'hover:bg-slate-800/60 text-slate-200' : 'hover:bg-gray-50 text-slate-900';

  const { principal, montantInteret, montantTotal, nbMois } = calculerMontants();
  const membreSelectionne = participants.find(p => p.id.toString() === formEmprunt.id_participant.toString());

  return (
    <div className={`w-full max-w-4xl mx-auto p-2.5 rounded-xl border shadow-md space-y-2.5 text-xs font-sans ${containerBg}`}>
      
      {/* EN-TÊTE PRINCIPAL ET BOUTONS */}
      <div className={`p-2.5 rounded-xl border space-y-2 ${headerBarBg}`}>
        <div>
          <h3 className="font-black text-xs sm:text-sm uppercase flex items-center gap-1.5">
            <span>💳</span> Gestion des Emprunts & Caisse des Intérêts
          </h3>
          <p className="text-[9px] sm:text-[10px] opacity-80 mt-0.5">
            Octroi de prêts avec mise à jour de la caisse d'épargne, suivi des échéances et gestion de la caisse des intérêts.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-1 w-full">
          <button
            type="button"
            onClick={() => setModalEmpruntOuverte(true)}
            className="bg-gray-200 hover:bg-gray-300 text-black font-black px-1.5 py-1.5 rounded-lg uppercase transition shadow-2xs cursor-pointer text-[8px] sm:text-[9px] truncate flex items-center justify-center gap-1 border border-gray-300"
          >
            <span>➕</span> Nouveau
          </button>
          <button
            type="button"
            onClick={() => setModalListePretsOuverte(true)}
            className="bg-gray-200 hover:bg-gray-300 text-black font-black px-1.5 py-1.5 rounded-lg uppercase transition shadow-2xs cursor-pointer text-[8px] sm:text-[9px] truncate flex items-center justify-center gap-1 border border-gray-300"
          >
            <span>📋</span> Prêts ({emprunts.length})
          </button>
          <button
            type="button"
            onClick={() => setModalInteretsCollectesOuverte(true)}
            className="bg-gray-200 hover:bg-gray-300 text-black font-black px-1.5 py-1.5 rounded-lg uppercase transition shadow-2xs cursor-pointer text-[8px] sm:text-[9px] truncate flex items-center justify-center gap-1 border border-gray-300"
          >
            <span>💰</span> Intérêts ({totalInteretsCollectes.toLocaleString()}F)
          </button>
        </div>
      </div>

      {/* CARTES DE SYNTHÈSE */}
      <div className="grid grid-cols-3 gap-1.5">
        <div className={`p-2 rounded-xl border shadow-2xs ${isDarkMode ? 'bg-slate-800 text-white border-slate-700' : 'bg-white text-slate-900 border-slate-200'}`}>
          <span className="block text-[8px] uppercase font-bold opacity-70 truncate">Caisse Épargnes</span>
          <span className="text-xs sm:text-sm font-black font-mono text-cyan-500 truncate block">{soldeCaisseGenerale.toLocaleString()} F</span>
        </div>
        <div className={`p-2 rounded-xl border shadow-2xs ${isDarkMode ? 'bg-amber-950/60 text-amber-200 border-amber-800/60' : 'bg-amber-50 text-amber-900 border-amber-200'}`}>
          <span className="block text-[8px] uppercase font-bold opacity-80 truncate">Prêts en cours</span>
          <span className="text-xs sm:text-sm font-black font-mono truncate block">{totalEmpruntsEnCours.toLocaleString()} F</span>
        </div>
        <div className={`p-2 rounded-xl border shadow-2xs ${isDarkMode ? 'bg-emerald-950/60 text-emerald-200 border-emerald-800/60' : 'bg-emerald-50 text-emerald-900 border-emerald-200'}`}>
          <span className="block text-[8px] uppercase font-bold opacity-80 truncate">Dispo Prêt</span>
          <span className="text-xs sm:text-sm font-black font-mono truncate block">{soldeDisponibleCaisse.toLocaleString()} F</span>
        </div>
      </div>

      {/* HISTORIQUE DES EMPRUNTS */}
      <div className="space-y-1.5">
        <h4 className="font-black uppercase text-xs">Historique des Emprunts ({emprunts.length})</h4>

        <div className={`overflow-x-auto border rounded-xl shadow-2xl ${isDarkMode ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-300 text-black'}`}>
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className={`sticky top-0 uppercase text-[9px] font-black z-10 border-b ${tableHeaderBg}`}>
              <tr>
                <th className="p-2.5">Membre Emprunteur</th>
                <th className="p-2.5 text-right">Principal</th>
                <th className="p-2.5 text-center">Taux</th>
                <th className="p-2.5 text-right">Intérêt</th>
                <th className="p-2.5 text-center">Paiement</th>
                <th className="p-2.5 text-right">Total</th>
                <th className="p-2.5 text-center">Échéance</th>
                <th className="p-2.5 text-center">Statut</th>
                <th className="p-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y text-[10px] ${isDarkMode ? 'divide-slate-800' : 'divide-gray-200'}`}>
              {emprunts.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-5 text-center font-bold opacity-60">
                    Aucun emprunt enregistré. Cliquez sur "Nouveau" pour en créer un.
                  </td>
                </tr>
              ) : (
                emprunts.map((emp) => {
                  const m = trouverMembreParEmprunt(emp);
                  const nomComplet = m ? `${m.nom_participant || m.nom_complet || ''} ${m.prenom || ''}` : `Membre #${emp.id_participant}`;
                  const estEnCours = emp.statut === 'EN_COURS';
                  const interetImmediat = emp.mode_paiement_interet === 'IMMEDIAT';

                  return (
                    <tr key={emp.id} className={`transition ${tableRowHover}`}>
                      <td className="p-2.5 uppercase font-black whitespace-nowrap">
                        {nomComplet}
                        {m?.numero_cni && <span className="block text-[8px] font-normal opacity-70">CNI : {m.numero_cni}</span>}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold whitespace-nowrap">{parseFloat(emp.montant_principal || 0).toLocaleString()} F</td>
                      <td className="p-2.5 text-center font-mono whitespace-nowrap">{emp.taux_interet}%</td>
                      <td className="p-2.5 text-right font-mono text-amber-500 whitespace-nowrap">{parseFloat(emp.montant_interet || 0).toLocaleString()} F</td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <span className={`px-2 py-1 rounded text-[8px] font-black uppercase border inline-flex items-center gap-1 ${isDarkMode ? 'bg-slate-800 text-slate-200 border-slate-700' : 'bg-gray-200 text-gray-900 border-gray-300'}`}>
                          {interetImmediat ? '⚡ Immédiat' : '⏳ Remboursement'}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-black text-emerald-500 whitespace-nowrap">{parseFloat(emp.montant_total || 0).toLocaleString()} F</td>
                      <td className="p-2.5 text-center font-mono opacity-80 whitespace-nowrap">{emp.date_echeance ? new Date(emp.date_echeance).toLocaleDateString() : 'N/A'}</td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        {estEnCours ? (
                          <span className="bg-amber-100 text-amber-900 font-black px-2 py-0.5 rounded-full text-[8px] uppercase border border-amber-300 inline-block">En cours</span>
                        ) : (
                          <span className="bg-emerald-100 text-emerald-900 font-black px-2 py-0.5 rounded-full text-[8px] uppercase border border-emerald-300 inline-block">Remboursé</span>
                        )}
                      </td>
                      <td className="p-2.5 text-center whitespace-nowrap flex items-center justify-center gap-1">
                        {estEnCours && (
                          <button
                            type="button"
                            onClick={() => marquerRembourse(emp)}
                            className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-2 py-1 rounded text-[8px] uppercase transition cursor-pointer shadow-2xs"
                          >
                            Rembourser ✓
                          </button>
                        )}
                        {estSuperAdmin && (
                          <button
                            type="button"
                            onClick={() => supprimerEmprunt(emp)}
                            className="bg-red-600 hover:bg-red-500 text-white font-black px-2 py-1 rounded text-[8px] uppercase transition cursor-pointer shadow-2xs"
                            title="Supprimer ce prêt (Super Admin)"
                          >
                            🗑️ Supprimer
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
                <span>➕</span> Formulaire d'Octroi de Prêt
              </h5>
              <button type="button" onClick={() => setModalEmpruntOuverte(false)} className="font-bold text-sm cursor-pointer">✖</button>
            </div>

            <div className="p-2.5 rounded-xl bg-emerald-950/70 border border-emerald-700 text-emerald-200 flex justify-between items-center font-mono">
              <span className="text-[10px] uppercase font-bold">Solde Disponible en Caisse :</span>
              <span className="font-black text-sm">{soldeDisponibleCaisse.toLocaleString()} FCFA</span>
            </div>

            <form onSubmit={soumettreDemandeEmprunt} className="space-y-3 text-xs">
              
              <div>
                <label className="block font-black text-[10px] uppercase mb-1">Membre Emprunteur :</label>
                <div 
                  onClick={() => setModalSelectionMembreOuverte(true)}
                  className={`w-full p-2.5 rounded-lg border font-bold flex justify-between items-center cursor-pointer ${inputBg}`}
                >
                  <span className={!membreSelectionne ? 'opacity-60' : ''}>
                    {membreSelectionne ? `${membreSelectionne.nom_participant || membreSelectionne.nom_complet || ''} ${membreSelectionne.prenom || ''} ${membreSelectionne.numero_cni ? `(CNI: ${membreSelectionne.numero_cni})` : ''}` : '-- Cliquez pour choisir un membre unique --'}
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
                  <label className="block font-black text-[10px] uppercase mb-1">Date d'Emprunt :</label>
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

              <div className="space-y-1">
                <label className="block font-black text-[10px] uppercase opacity-90">
                  ⚡ Mode de Paiement des Intérêts :
                </label>
                <div
                  onClick={() => setModalModeInteretOuverte(true)}
                  className={`w-full p-2.5 rounded-lg border font-bold flex justify-between items-center cursor-pointer ${inputBg}`}
                >
                  <span className="font-black uppercase text-xs truncate">
                    {formEmprunt.mode_paiement_interet === 'IMMEDIAT' 
                      ? '⚡ Payés immédiatement (Caisse des Intérêts)' 
                      : '⏳ Payés au moment du remboursement global'}
                  </span>
                  <span className="text-sm">▼</span>
                </div>
              </div>

              {/* DATE D'ÉCHÉANCE EN DUR CALCULÉE AUTOMATIQUEMENT */}
              <div>
                <label className="block font-black text-[10px] uppercase mb-1">Date d'Échéance (Calculée en dur) :</label>
                <input
                  type="date"
                  value={formEmprunt.date_echeance}
                  onChange={(e) => setFormEmprunt({ ...formEmprunt, date_echeance: e.target.value })}
                  required
                  className={`w-full p-2 rounded-lg border font-mono font-bold ${inputBg}`}
                />
              </div>

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
                    <span>Total à rembourser par l'emprunteur :</span>
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

      {/* MINI-MODALE SÉLECTION MEMBRE */}
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
                        <p className="text-[9px] opacity-70">📞 {p.telephone || 'N/A'} {p.numero_cni ? `| CNI: ${p.numero_cni}` : ''}</p>
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

      {/* MODALE MODE DE PAIEMENT DES INTÉRÊTS */}
      {modalModeInteretOuverte && (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 animate-fadeIn">
          <div className={`w-[95%] sm:w-full max-w-lg rounded-2xl shadow-2xl border p-4 space-y-3 ${isDarkMode ? 'bg-[#0b1329] border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}>
            <div className={`flex justify-between items-center border-b pb-2 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <h6 className="font-black text-xs uppercase flex items-center gap-1.5">
                <span>⚡</span> Choisir le Mode de Paiement des Intérêts
              </h6>
              <button type="button" onClick={() => setModalModeInteretOuverte(false)} className="font-bold text-sm cursor-pointer">✖</button>
            </div>

            <div className="space-y-2.5 py-1">
              <div
                onClick={() => {
                  setFormEmprunt({ ...formEmprunt, mode_paiement_interet: 'REMBOURSE' });
                  setModalModeInteretOuverte(false);
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col gap-1 ${
                  formEmprunt.mode_paiement_interet === 'REMBOURSE' 
                    ? (isDarkMode ? 'bg-slate-800 border-slate-500 text-white font-bold shadow-md' : 'bg-gray-100 border-gray-400 text-black font-bold shadow-md')
                    : (isDarkMode ? 'bg-slate-900/60 border-slate-800 hover:bg-slate-800 text-slate-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-slate-700')
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="uppercase text-xs font-black">⏳ Payés au moment du remboursement global</span>
                  {formEmprunt.mode_paiement_interet === 'REMBOURSE' && <span className="font-bold text-xs">✓ Sélectionné</span>}
                </div>
                <span className="text-[10px] opacity-80">Les intérêts seront réglés par l'emprunteur en même temps que le remboursement du principal à l'échéance.</span>
              </div>

              <div
                onClick={() => {
                  setFormEmprunt({ ...formEmprunt, mode_paiement_interet: 'IMMEDIAT' });
                  setModalModeInteretOuverte(false);
                }}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col gap-1 ${
                  formEmprunt.mode_paiement_interet === 'IMMEDIAT' 
                    ? (isDarkMode ? 'bg-slate-800 border-slate-500 text-white font-bold shadow-md' : 'bg-gray-100 border-gray-400 text-black font-bold shadow-md')
                    : (isDarkMode ? 'bg-slate-900/60 border-slate-800 hover:bg-slate-800 text-slate-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 text-slate-700')
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="uppercase text-xs font-black">⚡ Payés immédiatement (Caisse des Intérêts)</span>
                  {formEmprunt.mode_paiement_interet === 'IMMEDIAT' && <span className="font-bold text-xs">✓ Sélectionné</span>}
                </div>
                <span className="text-[10px] opacity-80">Les intérêts seront instantanément versés dans la caisse des intérêts dès la validation du prêt.</span>
              </div>
            </div>

            <div className={`flex justify-end pt-2 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <button
                type="button"
                onClick={() => setModalModeInteretOuverte(false)}
                className="px-4 py-1.5 rounded-lg font-bold text-xs bg-slate-700 hover:bg-slate-600 text-white cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE LISTE DES PRÊTS */}
      {modalListePretsOuverte && (
        <div className="fixed inset-0 z-80 flex items-start justify-center bg-black/80 backdrop-blur-xs p-3 pt-8 animate-fadeIn overflow-y-auto">
          <div className={`w-[95%] sm:w-full max-w-3xl rounded-2xl shadow-2xl border p-4 space-y-3 my-auto ${isDarkMode ? 'bg-[#0b1329] border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}>
            <div className={`flex justify-between items-center border-b pb-2 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <h6 className="font-black text-xs uppercase flex items-center gap-1.5">
                <span>📋</span> Liste Complète des Prêts ({emprunts.length})
              </h6>
              <button type="button" onClick={() => setModalListePretsOuverte(false)} className="font-bold text-sm cursor-pointer">✖</button>
            </div>

            <div className={`overflow-x-auto border rounded-xl ${isDarkMode ? 'bg-slate-950 border-slate-700' : 'bg-gray-50 border-gray-300'} max-h-[65vh]`}>
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead className={`uppercase text-[9px] font-black border-b sticky top-0 ${isDarkMode ? 'bg-slate-900 text-slate-200 border-slate-700' : 'bg-gray-200 text-black border-gray-300'}`}>
                  <tr>
                    <th className="p-2.5">Membre</th>
                    <th className="p-2.5 text-right">Principal</th>
                    <th className="p-2.5 text-center">Taux</th>
                    <th className="p-2.5 text-right">Intérêt</th>
                    <th className="p-2.5 text-right">Total</th>
                    <th className="p-2.5 text-center">Échéance</th>
                    <th className="p-2.5 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-[10px] ${isDarkMode ? 'divide-slate-800' : 'divide-gray-200'}`}>
                  {emprunts.length === 0 ? (
                    <tr><td colSpan="7" className="p-6 text-center opacity-60">Aucun prêt enregistré.</td></tr>
                  ) : (
                    emprunts.map(emp => {
                      const m = trouverMembreParEmprunt(emp);
                      const nom = m ? `${m.nom_participant || m.nom_complet || ''} ${m.prenom || ''}` : `Membre #${emp.id_participant}`;
                      return (
                        <tr key={emp.id} className={isDarkMode ? 'hover:bg-slate-900' : 'hover:bg-gray-100'}>
                          <td className="p-2.5 uppercase font-black whitespace-nowrap">{nom}</td>
                          <td className="p-2.5 text-right font-mono font-bold whitespace-nowrap">{parseFloat(emp.montant_principal || 0).toLocaleString()} F</td>
                          <td className="p-2.5 text-center font-mono whitespace-nowrap">{emp.taux_interet}%</td>
                          <td className="p-2.5 text-right font-mono text-amber-500 whitespace-nowrap">{parseFloat(emp.montant_interet || 0).toLocaleString()} F</td>
                          <td className="p-2.5 text-right font-mono font-black text-emerald-500 whitespace-nowrap">{parseFloat(emp.montant_total || 0).toLocaleString()} F</td>
                          <td className="p-2.5 text-center font-mono opacity-80 whitespace-nowrap">{emp.date_echeance || 'N/A'}</td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${emp.statut === 'EN_COURS' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'}`}>
                              {emp.statut}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className={`flex justify-end pt-2 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <button
                type="button"
                onClick={() => setModalListePretsOuverte(false)}
                className="px-4 py-1.5 rounded-lg font-bold text-xs bg-slate-700 hover:bg-slate-600 text-white cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE INTÉRÊTS COLLECTÉS */}
      {modalInteretsCollectesOuverte && (
        <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 animate-fadeIn overflow-y-auto">
          <div className={`w-[95%] sm:w-full max-w-3xl rounded-2xl shadow-2xl border p-4 space-y-3 my-auto ${isDarkMode ? 'bg-[#0b1329] border-slate-700 text-white' : 'bg-white border-gray-300 text-black'}`}>
            <div className={`flex justify-between items-center border-b pb-2 ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <h6 className="font-black text-xs uppercase flex items-center gap-1.5">
                <span>💰</span> Caisse des Intérêts Collectés (Total : {totalInteretsCollectes.toLocaleString()} FCFA)
              </h6>
              <button type="button" onClick={() => setModalInteretsCollectesOuverte(false)} className="font-bold text-sm cursor-pointer">✖</button>
            </div>

            <p className="text-[10px] opacity-80">
              Liste détaillée de tous les intérêts perçus sur les prêts (immédiats ou au remboursement), assujettis à la redistribution (cassation).
            </p>

            <div className={`overflow-x-auto border rounded-xl ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-gray-50 border-gray-300'}`}>
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead className={`uppercase text-[9px] font-black border-b ${isDarkMode ? 'bg-slate-900 text-slate-200 border-slate-700' : 'bg-gray-200 text-black border-gray-300'}`}>
                  <tr>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Libellé de l'Intérêt Collecté</th>
                    <th className="p-2.5 text-right">Montant Perçu</th>
                  </tr>
                </thead>
                <tbody className={`divide-y text-[10px] ${isDarkMode ? 'divide-slate-800' : 'divide-gray-200'}`}>
                  {interetsCollectesRecords.length === 0 ? (
                    <tr><td colSpan="3" className="p-6 text-center opacity-60">Aucun intérêt collecté pour le moment.</td></tr>
                  ) : (
                    interetsCollectesRecords.map((item, idx) => (
                      <tr key={item.id || idx} className={isDarkMode ? 'hover:bg-slate-800/60' : 'hover:bg-gray-100'}>
                        <td className="p-2.5 font-mono opacity-80 whitespace-nowrap">{item.date_operation || 'N/A'}</td>
                        <td className="p-2.5 uppercase font-bold whitespace-nowrap">{item.libelle}</td>
                        <td className="p-2.5 text-right font-mono font-black text-emerald-500 whitespace-nowrap">+{parseFloat(item.montant || 0).toLocaleString()} F</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className={`flex justify-end pt-2 border-t ${isDarkMode ? 'border-slate-700' : 'border-gray-200'}`}>
              <button
                type="button"
                onClick={() => setModalInteretsCollectesOuverte(false)}
                className="px-4 py-1.5 rounded-lg font-bold text-xs bg-slate-700 hover:bg-slate-600 text-white cursor-pointer"
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