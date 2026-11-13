'use client';

import { useState, useEffect, useRef } from 'react';
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
];

export default function GestionTontineParticipants({ entrepriseId = '4TS-290136', isDarkMode = false }) {
  const [participants, setParticipants] = useState([]);
  const [rolesDisponibles, setRolesDisponibles] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [vueActuelle, setVueActuelle] = useState('liste'); // 'liste' | 'roue'
  const [afficherModal, setAfficherModal] = useState(false); // 🌟 Gestion de la modale
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [participantEnEdition, setParticipantEnEdition] = useState(null);

  // États pour la roue de tirage
  const [classementTirage, setClassementTirage] = useState([]);
  const [rotationRoue, setRotationRoue] = useState(0);
  const [enTrainDeTourner, setEnTrainDeTourner] = useState(false);
  const [dernierGagnant, setDernierGagnant] = useState(null);

  const fileInputRef = useRef(null);

  const [nouveauParticipant, setNouveauParticipant] = useState({
    nom_participant: '',
    prenom: '',
    pays: 'cmr',
    telephone: '',
    lieu_residence: '',
    numero_cni: '',
    libelle_role: '',
    date_adhesion: new Date().toISOString().split('T')[0],
    photo: '',
  });

  const chargerDonnees = async () => {
    setChargement(true);
    try {
      const { data: dataPart, error: errPart } = await supabase
        .from('tontine_participants')
        .select('*')
        .order('created_at', { ascending: false });

      if (errPart) throw errPart;
      setParticipants(dataPart || []);

      // Récupération des rôles de la tontine créés dans la table roles ou tontine_roles
      const { data: dataRoles, error: errRoles } = await supabase
        .from('roles')
        .select('nom_role')
        .eq('id_entreprise', entrepriseId)
        .eq('module', 'TONTINE');

      if (!errRoles && dataRoles && dataRoles.length > 0) {
        const rolesPerso = dataRoles.map(r => r.nom_role);
        setRolesDisponibles(rolesPerso);
        if (!nouveauParticipant.libelle_role) {
          setNouveauParticipant(prev => ({ ...prev, libelle_role: rolesPerso[0] }));
        }
      } else {
        // Fallback sur la table tontine_roles si besoin
        const { data: dataTRoles } = await supabase
          .from('tontine_roles')
          .select('nom_role')
          .eq('id_entreprise', entrepriseId);
        
        if (dataTRoles && dataTRoles.length > 0) {
          const rolesT = dataTRoles.map(r => r.nom_role);
          setRolesDisponibles(rolesT);
          if (!nouveauParticipant.libelle_role) {
            setNouveauParticipant(prev => ({ ...prev, libelle_role: rolesT[0] }));
          }
        } else {
          setRolesDisponibles(['MEMBRE', 'PRESIDENT', 'TRESORIER', 'SECRETAIRE']);
        }
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

  const gererSelectionImage = (e) => {
    const fichier = e.target.files[0];
    if (fichier) {
      const lecteur = new FileReader();
      lecteur.onloadend = () => {
        setNouveauParticipant(prev => ({ ...prev, photo: lecteur.result }));
      };
      lecteur.readAsDataURL(fichier);
    }
  };

  const gererSaisieTelephone = (e) => {
    const chiffres = e.target.value.replace(/[^0-9]/g, '');
    setNouveauParticipant(prev => ({ ...prev, telephone: chiffres }));
  };

  const enregistrerParticipant = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;

    if (!nouveauParticipant.nom_participant.trim()) {
      alert('⚠️ Veuillez renseigner le nom du participant.');
      return;
    }

    const paysObj = LISTE_PAYS.find(p => p.code === nouveauParticipant.pays) || LISTE_PAYS[0];
    const chiffresPur = (nouveauParticipant.telephone || '').replace(/[^0-9]/g, '');

    if (chiffresPur.length > 0 && chiffresPur.length !== paysObj.longueur) {
      alert(`⚠️ Numéro invalide pour ${paysObj.code}. Le numéro doit comporter exactement ${paysObj.longueur} chiffres.`);
      return;
    }

    const telephoneComplet = chiffresPur ? `${paysObj.indicatif}${chiffresPur}` : null;

    setEnTrainDeSauvegarder(true);
    try {
      const payload = {
        id_entreprise: entrepriseId || '4TS-290136',
        nom_participant: nouveauParticipant.nom_participant.trim().toUpperCase(),
        nom_complet: nouveauParticipant.nom_participant.trim().toUpperCase(),
        prenom: (nouveauParticipant.prenom || '').trim().toUpperCase(),
        telephone: telephoneComplet,
        lieu_residence: (nouveauParticipant.lieu_residence || '').trim().toUpperCase(),
        numero_cni: (nouveauParticipant.numero_cni || '').trim().toUpperCase(),
        libelle_role: nouveauParticipant.libelle_role || (rolesDisponibles[0] || 'MEMBRE'),
        date_adhesion: nouveauParticipant.date_adhesion || new Date().toISOString().split('T')[0],
        photo: nouveauParticipant.photo || null,
      };

      if (participantEnEdition) {
        const { error } = await supabase
          .from('tontine_participants')
          .update(payload)
          .eq('id', participantEnEdition.id);
        if (error) throw error;
        alert('✅ Participant mis à jour avec succès !');
      } else {
        const { error } = await supabase
          .from('tontine_participants')
          .insert([payload]);
        if (error) throw error;
        alert('✅ Participant enregistré avec succès !');
      }

      fermerModal();
      await chargerDonnees();
    } catch (err) {
      alert('❌ Erreur lors de l\'enregistrement : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const supprimerParticipant = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) return;
    try {
      const { error } = await supabase
        .from('tontine_participants')
        .delete()
        .eq('id', id);
      if (error) throw error;
      alert('🗑️ Membre supprimé avec succès !');
      fermerModal();
      await chargerDonnees();
    } catch (err) {
      alert('❌ Erreur lors de la suppression : ' + err.message);
    }
  };

  const ouvrirEdition = (p) => {
    setParticipantEnEdition(p);
    const paysTrouve = LISTE_PAYS.find(item => p.telephone && p.telephone.startsWith(item.indicatif)) || LISTE_PAYS[0];
    let telLocal = p.telephone || '';
    if (p.telephone && p.telephone.startsWith(paysTrouve.indicatif)) {
      telLocal = p.telephone.replace(paysTrouve.indicatif, '');
    }

    setNouveauParticipant({
      nom_participant: p.nom_participant || p.nom_complet || '',
      prenom: p.prenom || '',
      pays: p.pays || paysTrouve.code,
      telephone: telLocal.replace(/[^0-9]/g, ''),
      lieu_residence: p.lieu_residence || '',
      numero_cni: p.numero_cni || '',
      libelle_role: p.libelle_role || rolesDisponibles[0] || 'MEMBRE',
      date_adhesion: p.date_adhesion ? p.date_adhesion.split('T')[0] : new Date().toISOString().split('T')[0],
      photo: p.photo || '',
    });
    setAfficherModal(true); // Ouvre la modale en mode édition
  };

  const fermerModal = () => {
    setAfficherModal(false);
    setParticipantEnEdition(null);
    setNouveauParticipant({
      nom_participant: '', prenom: '', pays: 'cmr', telephone: '', lieu_residence: '', numero_cni: '',
      libelle_role: rolesDisponibles[0] || 'MEMBRE', date_adhesion: new Date().toISOString().split('T')[0], photo: ''
    });
  };

  const lancerRoueAleatoire = () => {
    if (participants.length === 0) {
      alert('⚠️ Aucun participant enregistré pour effectuer le tirage.');
      return;
    }
    if (enTrainDeTourner) return;

    setEnTrainDeTourner(true);
    const tourssupplementaires = 5 * 360; 
    const angleAleatoire = Math.floor(Math.random() * 360);
    const nouvelleRotation = rotationRoue + tourssupplementaires + angleAleatoire;
    
    setRotationRoue(nouvelleRotation);

    setTimeout(() => {
      const participantsCopies = [...participants];
      for (let i = participantsCopies.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [participantsCopies[i], participantsCopies[j]] = [participantsCopies[j], participantsCopies[i]];
      }
      setClassementTirage(participantsCopies);
      setDernierGagnant(participantsCopies[0]);
      setEnTrainDeTourner(false);
    }, 4000);
  };

  const participantsFiltres = participants.filter(p => {
    const nomP = p.nom_participant || p.nom_complet || '';
    const texte = `${nomP} ${p.prenom || ''} ${p.telephone || ''} ${p.libelle_role || ''}`.toLowerCase();
    return texte.includes(recherche.toLowerCase());
  });

  const paysActuelObj = LISTE_PAYS.find(p => p.code === nouveauParticipant.pays) || LISTE_PAYS[0];
  const inputBg = isDarkMode ? 'bg-[#1b263b] text-white border-slate-700' : 'bg-white text-slate-900 border-slate-300';
  const labelColor = isDarkMode ? 'text-slate-200' : 'text-slate-800';

  return (
    <div className="w-full h-full space-y-3 font-sans text-xs relative">
      
      {/* BARRE D'EN-TÊTE */}
      <div className="flex justify-between items-center bg-white/5 px-2.5 py-2 rounded-xl border border-slate-700/30 gap-1.5 overflow-x-auto">
        <button
          type="button"
          onClick={chargerDonnees}
          className="bg-slate-700 hover:bg-slate-600 text-white px-2 py-1.5 rounded text-[10px] font-bold transition flex items-center gap-1 shrink-0"
          title="Rafraîchir"
        >
          🔄 Actualiser
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              setParticipantEnEdition(null);
              setNouveauParticipant({
                nom_participant: '', prenom: '', pays: 'cmr', telephone: '', lieu_residence: '', numero_cni: '',
                libelle_role: rolesDisponibles[0] || 'MEMBRE', date_adhesion: new Date().toISOString().split('T')[0], photo: ''
              });
              setAfficherModal(true); // Ouvre la modale en mode création
            }}
            className="bg-orange-600 hover:bg-orange-500 text-white font-black px-2.5 py-1.5 rounded-lg transition shadow text-[10px] uppercase"
          >
            ➕ Créer
          </button>

          <button
            type="button"
            onClick={() => setVueActuelle(vueActuelle === 'roue' ? 'liste' : 'roue')}
            className={`font-black px-2.5 py-1.5 rounded-lg transition shadow text-[10px] uppercase ${
              vueActuelle === 'roue' ? 'bg-slate-700 text-white' : 'bg-purple-700 hover:bg-purple-600 text-white'
            }`}
          >
            {vueActuelle === 'roue' ? '📋 Liste' : '🎡 Roue'}
          </button>
        </div>
      </div>

      {/* 🌟 FENÊTRE MODALE DE CRÉATION / MODIFICATION */}
      {afficherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 animate-fadeIn">
          <div className={`w-full max-w-lg rounded-2xl shadow-2xl border p-4 space-y-3 max-h-[90vh] overflow-y-auto ${isDarkMode ? 'bg-[#0b1329] border-cyan-900 text-white' : 'bg-white border-slate-300 text-slate-900'}`}>
            
            <div className="flex justify-between items-center border-b pb-2 border-slate-700/40">
              <h4 className="font-black text-orange-500 uppercase text-xs">
                {participantEnEdition ? '✏️ Modifier le membre' : '➕ Enregistrer un nouveau membre'}
              </h4>
              <button type="button" onClick={fermerModal} className="text-slate-400 hover:text-white font-bold text-sm">✖</button>
            </div>

            <form onSubmit={enregistrerParticipant} className="space-y-2.5 w-full">
              
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={gererSelectionImage} 
                accept="image/*" 
                className="hidden" 
              />
              
              {/* Photo & Nom */}
              <div className="flex flex-row items-center gap-2 w-full">
                <div 
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  className="w-10 h-10 rounded-full bg-slate-800 border border-orange-500 flex items-center justify-center overflow-hidden cursor-pointer relative group shadow-sm shrink-0"
                  title="Choisir une photo"
                >
                  {nouveauParticipant.photo ? (
                    <img src={nouveauParticipant.photo} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-slate-300 text-sm">📷</span>
                  )}
                </div>
                <div className="flex-1">
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Nom *</label>
                  <input
                    type="text"
                    required
                    value={nouveauParticipant.nom_participant}
                    onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, nom_participant: e.target.value.toUpperCase() })}
                    className={`w-full p-1.5 rounded-lg border text-xs font-bold uppercase ${inputBg}`}
                  />
                </div>
              </div>

              {/* Prénom & Rôle dynamique */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Prénom</label>
                  <input
                    type="text"
                    value={nouveauParticipant.prenom}
                    onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, prenom: e.target.value.toUpperCase() })}
                    className={`w-full p-1.5 rounded-lg border text-xs font-bold uppercase ${inputBg}`}
                  />
                </div>
                <div>
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Rôle / Poste</label>
                  <select
                    value={nouveauParticipant.libelle_role}
                    onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, libelle_role: e.target.value })}
                    className={`w-full p-1.5 rounded-lg border text-xs font-bold ${inputBg}`}
                  >
                    {rolesDisponibles.length === 0 ? (
                      <option value="MEMBRE">MEMBRE</option>
                    ) : (
                      rolesDisponibles.map((role, idx) => (
                        <option key={idx} value={role}>{role}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              {/* Pays & Téléphone */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Pays</label>
                  <select
                    value={nouveauParticipant.pays}
                    onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, pays: e.target.value })}
                    className={`w-full p-1.5 rounded-lg border text-xs font-bold ${inputBg}`}
                  >
                    {LISTE_PAYS.map(p => <option key={p.code} value={p.code}>{p.code.toUpperCase()} ({p.indicatif})</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Téléphone ({paysActuelObj.longueur} chiffres)</label>
                  <div className="flex items-center border rounded-lg overflow-hidden bg-white">
                    <span className="bg-slate-200 px-2 py-1.5 text-[10px] font-black text-slate-900 border-r">{paysActuelObj.indicatif}</span>
                    <input
                      type="text"
                      maxLength={paysActuelObj.longueur}
                      value={nouveauParticipant.telephone}
                      onChange={gererSaisieTelephone}
                      className="w-full p-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Date d'adhésion & Résidence */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Date d'adhésion</label>
                  <input
                    type="date"
                    value={nouveauParticipant.date_adhesion}
                    onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, date_adhesion: e.target.value })}
                    className={`w-full p-1.5 rounded-lg border text-xs font-bold ${inputBg}`}
                  />
                </div>
                <div>
                  <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Lieu de résidence</label>
                  <input
                    type="text"
                    value={nouveauParticipant.lieu_residence}
                    onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, lieu_residence: e.target.value.toUpperCase() })}
                    className={`w-full p-1.5 rounded-lg border text-xs font-bold uppercase ${inputBg}`}
                  />
                </div>
              </div>

              {/* Numéro CNI */}
              <div>
                <label className={`block font-black mb-0.5 text-[9px] uppercase ${labelColor}`}>Numéro CNI</label>
                <input
                  type="text"
                  value={nouveauParticipant.numero_cni}
                  onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, numero_cni: e.target.value.toUpperCase() })}
                  className={`w-full p-1.5 rounded-lg border text-xs font-bold uppercase ${inputBg}`}
                />
              </div>

              {/* Boutons d'action de la modale */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-700/40">
                <div>
                  {participantEnEdition && (
                    <button
                      type="button"
                      onClick={() => supprimerParticipant(participantEnEdition.id)}
                      className="bg-red-600 hover:bg-red-500 text-white font-black px-2.5 py-1 rounded text-[10px] shadow transition"
                    >
                      🗑️ Supprimer
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={fermerModal} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-3 py-1 rounded text-[10px]">
                    Annuler
                  </button>
                  <button type="submit" disabled={enTrainDeSauvegarder} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-4 py-1 rounded text-[10px] shadow">
                    {enTrainDeSauvegarder ? 'Enregistrement...' : (participantEnEdition ? 'Mettre à jour' : 'Enregistrer')}
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* VUE ROUE DE TIRAGE */}
      {vueActuelle === 'roue' && (
        <div className="bg-black/30 p-4 rounded-xl border border-purple-500/30 space-y-4 text-center">
          <div className="flex justify-between items-center border-b pb-2 border-slate-700">
            <h4 className="font-black text-purple-400 uppercase text-xs">🎡 Roue de Tirage au Sort ({participants.length} Membres)</h4>
            <button type="button" onClick={() => setVueActuelle('liste')} className="text-slate-400 hover:text-white font-bold text-sm">✖</button>
          </div>

          {participants.length === 0 ? (
            <p className="text-slate-400 py-6">Aucun membre disponible pour le tirage.</p>
          ) : (
            <div className="space-y-4">
              <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                <div 
                  className="w-full h-full rounded-full border-4 border-orange-500 shadow-2xl relative overflow-hidden transition-transform ease-out duration-4000 flex items-center justify-center bg-slate-900"
                  style={{ transform: `rotate(${rotationRoue}deg)` }}
                >
                  {participants.map((p, index) => {
                    const angle = (index / participants.length) * 360;
                    return (
                      <div
                        key={p.id}
                        className="absolute w-full h-full text-center font-black text-[9px] text-white pt-2"
                        style={{ transform: `rotate(${angle}deg)`, transformOrigin: 'center' }}
                      >
                        <span className="bg-black/40 px-1 rounded">{index + 1}. {p.nom_participant || p.nom_complet}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="absolute -top-3 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-[16px] border-t-orange-500 z-10"></div>
                <div className="absolute w-6 h-6 rounded-full bg-white border-2 border-orange-600 shadow z-20"></div>
              </div>

              <button
                type="button"
                onClick={lancerRoueAleatoire}
                disabled={enTrainDeTourner}
                className="bg-gradient-to-r from-orange-600 to-purple-600 hover:from-orange-500 hover:to-purple-500 text-white font-black px-6 py-2.5 rounded-xl text-xs shadow-lg uppercase transition"
              >
                {enTrainDeTourner ? '🌀 Ça tourne...' : '🎰 Tourner la Roue'}
              </button>

              {dernierGagnant && !enTrainDeTourner && (
                <div className="bg-orange-500/20 border border-orange-500/40 p-2.5 rounded-lg">
                  <p className="text-[10px] text-orange-300 font-bold">🎉 Gagnant tiré :</p>
                  <p className="text-sm font-black text-white uppercase">{dernierGagnant.nom_participant || dernierGagnant.nom_complet} {dernierGagnant.prenom || ''}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* VUE DE LA LISTE DES PARTICIPANTS */}
      {vueActuelle === 'liste' && (
        <div className="space-y-2 w-full">
          <div className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="🔍 Rechercher un participant par nom, rôle ou téléphone..."
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-900 text-xs focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto border border-slate-700/40 rounded-xl bg-white shadow-2xs w-full">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-800 border-b uppercase text-[9px] font-black select-none">
                <tr>
                  <th className="p-2 w-10 text-center">Avatar</th>
                  <th className="p-2">Nom & Prénom</th>
                  <th className="p-2">Rôle / Poste</th>
                  <th className="p-2">Téléphone</th>
                  <th className="p-2">Résidence</th>
                  <th className="p-2">CNI</th>
                  <th className="p-2">Adhésion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[10px]">
                {chargement ? (
                  <tr><td colSpan="7" className="p-4 text-center animate-pulse text-slate-500">Chargement...</td></tr>
                ) : participantsFiltres.length === 0 ? (
                  <tr><td colSpan="7" className="p-4 text-center text-slate-500 font-bold">Aucun participant trouvé.</td></tr>
                ) : (
                  participantsFiltres.map((p) => {
                    const nomAffiche = p.nom_participant || p.nom_complet || 'Membre';
                    return (
                      <tr 
                        key={p.id} 
                        onClick={() => ouvrirEdition(p)} 
                        className="hover:bg-orange-50/70 cursor-pointer transition select-none text-slate-900"
                        title="Cliquez pour modifier"
                      >
                        <td className="p-2 text-center">
                          <div className="w-6 h-6 rounded-full bg-slate-200 border mx-auto overflow-hidden flex items-center justify-center">
                            {p.photo ? (
                              <img src={p.photo} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[8px] font-bold text-slate-500">👤</span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 font-black uppercase">{nomAffiche} {p.prenom || ''}</td>
                        <td className="p-2">
                          <span className="bg-orange-100 text-orange-800 font-black px-1.5 py-0.5 rounded text-[8px] uppercase border border-orange-200">
                            {p.libelle_role || 'MEMBRE'}
                          </span>
                        </td>
                        <td className="p-2 font-mono text-orange-600 font-bold">{p.telephone || 'N/A'}</td>
                        <td className="p-2 uppercase font-semibold text-slate-700">{p.lieu_residence || 'N/A'}</td>
                        <td className="p-2 font-mono text-slate-600">{p.numero_cni || 'N/A'}</td>
                        <td className="p-2 text-slate-500">{p.date_adhesion ? new Date(p.date_adhesion).toLocaleDateString() : 'N/A'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}