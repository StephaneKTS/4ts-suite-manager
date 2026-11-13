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
  const [nouveauRoleInput, setNouveauRoleInput] = useState('');
  const [chargement, setChargement] = useState(false);
  const [vueActuelle, setVueActuelle] = useState('liste'); 
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);
  const [recherche, setRecherche] = useState('');
  const [participantEnEdition, setParticipantEnEdition] = useState(null);

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
      // 1. Charger les participants
      const { data: dataPart, error: errPart } = await supabase
        .from('tontine_participants')
        .select('*')
        .order('created_at', { ascending: false });

      if (errPart) throw errPart;
      setParticipants(dataPart || []);

      // 2. Charger les rôles personnalisés créés pour l'entreprise
      const { data: dataRoles, error: errRoles } = await supabase
        .from('tontine_roles')
        .select('nom_role')
        .eq('id_entreprise', entrepriseId);

      if (!errRoles && dataRoles) {
        const rolesPerso = dataRoles.map(r => r.nom_role);
        setRolesDisponibles(rolesPerso);
        if (rolesPerso.length > 0 && !nouveauParticipant.libelle_role) {
          setNouveauParticipant(prev => ({ ...prev, libelle_role: rolesPerso[0] }));
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

  const ajouterRolePersonnalise = async () => {
    if (!nouveauRoleInput.trim()) return;
    const roleMaj = nouveauRoleInput.trim().toUpperCase();
    if (rolesDisponibles.includes(roleMaj)) {
      setNouveauParticipant(prev => ({ ...prev, libelle_role: roleMaj }));
      setNouveauRoleInput('');
      return;
    }

    try {
      const { error } = await supabase.from('tontine_roles').insert([{
        id_entreprise: entrepriseId,
        nom_role: roleMaj
      }]);

      if (error) throw error;

      setRolesDisponibles(prev => [...prev, roleMaj]);
      setNouveauParticipant(prev => ({ ...prev, libelle_role: roleMaj }));
      setNouveauRoleInput('');
      alert(`✅ Rôle "${roleMaj}" créé avec succès !`);
    } catch (err) {
      alert('❌ Erreur création rôle : ' + err.message);
    }
  };

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

      setParticipantEnEdition(null);
      setNouveauParticipant({
        nom_participant: '', prenom: '', pays: 'cmr', telephone: '', lieu_residence: '', numero_cni: '',
        libelle_role: rolesDisponibles[0] || '', date_adhesion: new Date().toISOString().split('T')[0], photo: ''
      });
      
      await chargerDonnees();
      setVueActuelle('liste');
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
      setParticipantEnEdition(null);
      setVueActuelle('liste');
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
      libelle_role: p.libelle_role || rolesDisponibles[0] || '',
      date_adhesion: p.date_adhesion ? p.date_adhesion.split('T')[0] : new Date().toISOString().split('T')[0],
      photo: p.photo || '',
    });
    setVueActuelle('creation');
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
    <div className="w-full h-full space-y-4 font-sans text-xs">
      
      {/* Barre des boutons et rafraîchissement */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white/5 px-3 py-2.5 rounded-xl border border-slate-700/30 gap-2">
        <div className="flex items-center gap-3">
          <p className="text-[11px] text-slate-300 font-bold">
            Total membres : <strong className="text-orange-500">{participants.length}</strong>
          </p>
          <button
            type="button"
            onClick={chargerDonnees}
            className="bg-slate-700 hover:bg-slate-600 text-white px-2.5 py-1 rounded text-[10px] font-bold transition"
            title="Rafraîchir la liste"
          >
            🔄 Actualiser
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setParticipantEnEdition(null);
              setNouveauParticipant({
                nom_participant: '', prenom: '', pays: 'cmr', telephone: '', lieu_residence: '', numero_cni: '',
                libelle_role: rolesDisponibles[0] || '', date_adhesion: new Date().toISOString().split('T')[0], photo: ''
              });
              setVueActuelle('creation');
            }}
            className={`font-black px-4 py-2 rounded-lg transition shadow text-xs uppercase ${
              vueActuelle === 'creation' && !participantEnEdition
                ? 'bg-orange-600 text-white ring-2 ring-orange-400' 
                : 'bg-orange-600/80 hover:bg-orange-600 text-white'
            }`}
          >
            ➕ Nouveau Membre
          </button>

          <button
            type="button"
            onClick={() => setVueActuelle('liste')}
            className={`font-black px-4 py-2 rounded-lg transition shadow text-xs uppercase ${
              vueActuelle === 'liste' 
                ? 'bg-slate-800 text-white ring-2 ring-slate-500 border border-slate-600' 
                : 'bg-slate-700 hover:bg-slate-600 text-white'
            }`}
          >
            📋 Liste des participants
          </button>
        </div>
      </div>

      {/* VUE DE CRÉATION / MODIFICATION */}
      {vueActuelle === 'creation' && (
        <div className="space-y-4 w-full">
          <div className="flex justify-between items-center border-b pb-2 border-slate-700/40">
            <h4 className="font-black text-orange-500 uppercase text-xs">
              {participantEnEdition ? '✏️ Modifier ou supprimer le membre' : '➕ Enregistrer un nouveau membre'}
            </h4>
            <button type="button" onClick={() => setVueActuelle('liste')} className="text-slate-400 hover:text-white font-bold text-sm">✖</button>
          </div>

          <form onSubmit={enregistrerParticipant} className="space-y-4 w-full">
            
            <input type="file" ref={fileInputRef} onChange={gererSelectionImage} accept="image/*" className="hidden" />
            <div className="flex items-center gap-4 p-3 rounded-xl border border-slate-700/40 bg-black/10 w-full">
              <div 
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className="w-14 h-14 rounded-full bg-slate-800 border-2 border-orange-500 flex items-center justify-center overflow-hidden cursor-pointer relative group shadow-sm shrink-0"
              >
                {nouveauParticipant.photo ? (
                  <img src={nouveauParticipant.photo} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-slate-400 font-bold text-base">📷</span>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[9px] font-bold">
                  Photo
                </div>
              </div>
              <div>
                <p className="font-black uppercase text-xs">Photo du membre</p>
                <p className="text-[10px] text-slate-400">Cliquez pour ajouter une photo depuis l'appareil.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={`block font-black mb-1 text-[11px] uppercase ${labelColor}`}>Nom *</label>
                <input
                  type="text"
                  required
                  value={nouveauParticipant.nom_participant}
                  onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, nom_participant: e.target.value.toUpperCase() })}
                  className={`w-full p-3 rounded-lg border text-xs font-bold uppercase ${inputBg}`}
                />
              </div>
              <div>
                <label className={`block font-black mb-1 text-[11px] uppercase ${labelColor}`}>Prénom</label>
                <input
                  type="text"
                  value={nouveauParticipant.prenom}
                  onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, prenom: e.target.value.toUpperCase() })}
                  className={`w-full p-3 rounded-lg border text-xs font-bold uppercase ${inputBg}`}
                />
              </div>
            </div>

            {/* GESTION DYNAMIQUE DES RÔLES DE LA TONTINE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-orange-500/5 p-3 rounded-xl border border-orange-500/30">
              <div>
                <label className={`block font-black mb-1 text-[11px] uppercase ${labelColor}`}>Rôle / Poste dans la Tontine</label>
                <select
                  value={nouveauParticipant.libelle_role}
                  onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, libelle_role: e.target.value })}
                  className={`w-full p-3 rounded-lg border text-xs font-bold ${inputBg}`}
                >
                  {rolesDisponibles.length === 0 ? (
                    <option value="">Aucun rôle créé. Créez-en un ci-contre ➔</option>
                  ) : (
                    rolesDisponibles.map((role, idx) => (
                      <option key={idx} value={role}>{role}</option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className={`block font-black mb-1 text-[11px] uppercase ${labelColor}`}>Créer un nouveau rôle</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={nouveauRoleInput}
                    onChange={(e) => setNouveauRoleInput(e.target.value.toUpperCase())}
                    placeholder="EX: TRÉSORIER, PRÉSIDENT..."
                    className={`w-full p-2.5 rounded-lg border text-xs font-bold uppercase ${inputBg}`}
                  />
                  <button
                    type="button"
                    onClick={ajouterRolePersonnalise}
                    className="bg-orange-600 hover:bg-orange-500 text-white font-black px-3 py-2.5 rounded-lg text-xs shadow shrink-0"
                  >
                    ➕ Créer
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={`block font-black mb-1 text-[11px] uppercase ${labelColor}`}>Pays</label>
                <select
                  value={nouveauParticipant.pays}
                  onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, pays: e.target.value })}
                  className={`w-full p-3 rounded-lg border text-xs font-bold ${inputBg}`}
                >
                  {LISTE_PAYS.map(p => <option key={p.code} value={p.code}>{p.code.toUpperCase()} ({p.indicatif})</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className={`block font-black mb-1 text-[11px] uppercase ${labelColor}`}>Téléphone ({paysActuelObj.longueur} chiffres)</label>
                <div className="flex items-center border rounded-lg overflow-hidden bg-white">
                  <span className="bg-slate-200 px-3.5 py-3 text-xs font-black text-slate-900 border-r">{paysActuelObj.indicatif}</span>
                  <input
                    type="text"
                    maxLength={paysActuelObj.longueur}
                    value={nouveauParticipant.telephone}
                    onChange={gererSaisieTelephone}
                    className="w-full p-3 text-xs font-mono font-bold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={`block font-black mb-1 text-[11px] uppercase ${labelColor}`}>Date d'adhésion</label>
                <input
                  type="date"
                  value={nouveauParticipant.date_adhesion}
                  onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, date_adhesion: e.target.value })}
                  className={`w-full p-3 rounded-lg border text-xs font-bold ${inputBg}`}
                />
              </div>
              <div>
                <label className={`block font-black mb-1 text-[11px] uppercase ${labelColor}`}>Lieu de résidence</label>
                <input
                  type="text"
                  value={nouveauParticipant.lieu_residence}
                  onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, lieu_residence: e.target.value.toUpperCase() })}
                  className={`w-full p-3 rounded-lg border text-xs font-bold uppercase ${inputBg}`}
                />
              </div>
              <div>
                <label className={`block font-black mb-1 text-[11px] uppercase ${labelColor}`}>Numéro CNI</label>
                <input
                  type="text"
                  value={nouveauParticipant.numero_cni}
                  onChange={(e) => setNouveauParticipant({ ...nouveauParticipant, numero_cni: e.target.value.toUpperCase() })}
                  className={`w-full p-3 rounded-lg border text-xs font-bold uppercase ${inputBg}`}
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-700/40">
              <div>
                {participantEnEdition && (
                  <button
                    type="button"
                    onClick={() => supprimerParticipant(participantEnEdition.id)}
                    className="bg-red-600 hover:bg-red-500 text-white font-black px-4 py-2.5 rounded-lg text-xs shadow transition"
                  >
                    🗑️ Supprimer ce membre
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setVueActuelle('liste')} className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-5 py-2.5 rounded-lg text-xs">
                  Annuler
                </button>
                <button type="submit" disabled={enTrainDeSauvegarder} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-2.5 rounded-lg text-xs shadow">
                  {enTrainDeSauvegarder ? 'Enregistrement...' : (participantEnEdition ? 'Mettre à jour' : 'Enregistrer le membre')}
                </button>
              </div>
            </div>

          </form>
        </div>
      )}

      {/* VUE DE LA LISTE DES PARTICIPANTS */}
      {vueActuelle === 'liste' && (
        <div className="space-y-3 w-full">
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
            <input
              type="text"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="🔍 Rechercher un participant par nom, rôle ou téléphone..."
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold text-slate-900 text-xs focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto border border-slate-700/40 rounded-xl bg-white shadow-2xs w-full">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-800 border-b uppercase text-[9px] font-black select-none">
                <tr>
                  <th className="p-3 w-12 text-center">Avatar</th>
                  <th className="p-3">Nom & Prénom</th>
                  <th className="p-3">Rôle / Poste</th>
                  <th className="p-3">Téléphone</th>
                  <th className="p-3">Résidence</th>
                  <th className="p-3">CNI</th>
                  <th className="p-3">Adhésion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[10.5px]">
                {chargement ? (
                  <tr><td colSpan="7" className="p-6 text-center animate-pulse text-slate-500">Chargement des membres...</td></tr>
                ) : participantsFiltres.length === 0 ? (
                  <tr><td colSpan="7" className="p-6 text-center text-slate-500 font-bold">Aucun participant trouvé. Cliquez sur "Actualiser" ou créez-en un.</td></tr>
                ) : (
                  participantsFiltres.map((p) => {
                    const nomAffiche = p.nom_participant || p.nom_complet || 'Membre';
                    return (
                      <tr 
                        key={p.id} 
                        onClick={() => ouvrirEdition(p)} 
                        className="hover:bg-orange-50/70 cursor-pointer transition select-none text-slate-900"
                        title="Cliquez pour modifier ou supprimer ce membre"
                      >
                        <td className="p-2.5 text-center">
                          <div className="w-7 h-7 rounded-full bg-slate-200 border mx-auto overflow-hidden flex items-center justify-center">
                            {p.photo ? (
                              <img src={p.photo} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[9px] font-bold text-slate-500">👤</span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 font-black uppercase">{nomAffiche} {p.prenom || ''}</td>
                        <td className="p-2.5">
                          <span className="bg-orange-100 text-orange-800 font-black px-2 py-0.5 rounded text-[9px] uppercase border border-orange-200">
                            {p.libelle_role || 'MEMBRE'}
                          </span>
                        </td>
                        <td className="p-2.5 font-mono text-orange-600 font-bold">{p.telephone || 'N/A'}</td>
                        <td className="p-2.5 uppercase font-semibold text-slate-700">{p.lieu_residence || 'N/A'}</td>
                        <td className="p-2.5 font-mono text-slate-600">{p.numero_cni || 'N/A'}</td>
                        <td className="p-2.5 text-slate-500">{p.date_adhesion ? new Date(p.date_adhesion).toLocaleDateString() : 'N/A'}</td>
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