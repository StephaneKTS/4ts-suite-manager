'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/lib/usePermissions';
import { localSync } from '../../lib/localSync';

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

export default function GestionFournisseurs({ entrepriseId = '4TS-TEST' }) {
  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();
  const cleCacheFournisseurs = `fournisseurs_${entrepriseId}_${moduleActuel}`;
  const estModeLivraison = moduleActuel === 'LIVRAISON';
  const libelleEntite = estModeLivraison ? 'PARTENAIRES' : 'FOURNISSEURS';

  const [utilisateurConnecte, setUtilisateurConnecte] = useState('');
  const [emailConnecte, setEmailConnecte] = useState('');
  const nomInputRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userLocal = localStorage.getItem('utilisateurConnecte') || localStorage.getItem('utilisateur_connecte');
      const emailLocal = localStorage.getItem('emailConnecte') || localStorage.getItem('email_connecte');
      if (userLocal) {
        try {
          const parsed = JSON.parse(userLocal);
          setUtilisateurConnecte((parsed.nom_complet || parsed.nom || userLocal).toUpperCase());
          if (parsed.email) setEmailConnecte(parsed.email);
        } catch {
          setUtilisateurConnecte(userLocal.toUpperCase());
        }
      }
      if (emailLocal) setEmailConnecte(emailLocal);
    }
  }, []);

  const emailActuel = emailConnecte || '';
  const estSuperAdmin = emailActuel.toLowerCase().trim() === 'stephs7352@gmail.com';

  const { verifierPermission, verifierCreation, verifierModification, verifierSuppression } = usePermissions(
    entrepriseId,
    utilisateurConnecte,
    emailConnecte,
    moduleActuel
  );

  const permissions = {
    lecture: verifierPermission('fournisseurs', estSuperAdmin),
    creation: verifierCreation('fournisseurs', estSuperAdmin),
    modification: verifierModification('fournisseurs', estSuperAdmin),
    suppression: verifierSuppression('fournisseurs', estSuperAdmin),
  };

  const [partenaires, setPartenaires] = useState(() => {
    if (typeof window !== 'undefined') {
      return localSync.recupererDonneesLocales(cleCacheFournisseurs) || [];
    }
    return [];
  });

  const [taxesDisponibles, setTaxesDisponibles] = useState([]);
  const [approvisionnements, setApprovisionnements] = useState([]);
  const [bonsCommandes, setBonsCommandes] = useState([]);
  const [chargement, setChargement] = useState(false);
  
  const [ongletActif, setOngletActif] = useState('repertoire');
  const [limitePartenaires, setLimitePartenaires] = useState(20);
  const [enTrainDeSauvegarder, setEnTrainDeSauvegarder] = useState(false);

  const [triCol, setTriCol] = useState('nom_fournisseur');
  const [triOrdre, setTriOrdre] = useState('asc');

  const [afficherForm, setAfficherForm] = useState(false);
  const [partenaireEnEdition, setPartenaireEnEdition] = useState(null);
  const [recherche, setRecherche] = useState('');

  const [nouveauPartenaire, setNouveauPartenaire] = useState({
    nom_fournisseur: '',
    statut_stockage: 'AVEC_STOCKAGE',
    pays: 'cmr',
    telephone: '',
    email: '',
    adresse: '',
    taxes_ristournes_associees: [],
  });

  const chargerPermissionsEtDonnees = async (silencieux = false) => {
    if (!silencieux && partenaires.length === 0) setChargement(true);
    try {
      let listPartenaires = [];
      const { data: partenairesRpc, error: rpcError } = await supabase.rpc('recuperer_fournisseurs', {
        p_entreprise_id: entrepriseId,
        p_module: moduleActuel
      });

      if (rpcError) {
        const { data: dataPartenaires, error: errPartenaires } = await supabase
          .from('fournisseurs')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .eq('module', moduleActuel)
          .order('created_at', { ascending: false });

        if (errPartenaires) throw errPartenaires;
        listPartenaires = dataPartenaires || [];
      } else {
        listPartenaires = partenairesRpc || [];
      }

      setPartenaires(listPartenaires);
      localSync.sauvegarderDonneesLocales(cleCacheFournisseurs, listPartenaires);

      // Charger les taxes & ristournes déductibles (uniquement pour le module BOUTIQUE)
      if (moduleActuel === 'BOUTIQUE') {
        const { data: dataTaxes } = await supabase
          .from('types_taxes_ristournes')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .eq('module', 'BOUTIQUE')
          .eq('sens', 'DEDUCTIBLE')
          .eq('actif', true);

        setTaxesDisponibles(dataTaxes || []);
      }

      const { data: dataAppro } = await supabase
        .from('approvisionnements')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setApprovisionnements(dataAppro || []);

      const { data: dataBC } = await supabase
        .from('bons_commande_fournisseurs')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel);
      setBonsCommandes(dataBC || []);

    } catch (err) {
      console.error('Erreur chargement données :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerPermissionsEtDonnees();
    localSync.synchroniserVersCloud(supabase);
  }, [entrepriseId, moduleActuel]);

  const toggleTaxeSelection = (codeTaxe) => {
    const courantes = nouveauPartenaire.taxes_ristournes_associees || [];
    if (courantes.includes(codeTaxe)) {
      setNouveauPartenaire({
        ...nouveauPartenaire,
        taxes_ristournes_associees: courantes.filter(t => t !== codeTaxe)
      });
    } else {
      setNouveauPartenaire({
        ...nouveauPartenaire,
        taxes_ristournes_associees: [...courantes, codeTaxe]
      });
    }
  };

  const enregistrerPartenaire = async (e) => {
    e.preventDefault();
    if (enTrainDeSauvegarder) return;

    if (partenaireEnEdition && !permissions.modification) {
      alert('⛔ Action non autorisée : Modification interdite par votre profil.');
      return;
    }
    if (!partenaireEnEdition && !permissions.creation) {
      alert('⛔ Action non autorisée : Création interdite par votre profil.');
      return;
    }

    const paysObj = LISTE_PAYS.find(p => p.code === nouveauPartenaire.pays) || LISTE_PAYS[0];
    const chiffresPur = (nouveauPartenaire.telephone || '').replace(/[^0-9]/g, '');

    if (chiffresPur.length > 0 && chiffresPur.length !== paysObj.longueur) {
      alert(`⚠️ Numéro invalide pour ${paysObj.code}. Le numéro doit comporter exactement ${paysObj.longueur} chiffres.`);
      return;
    }

    const numeroComplet = chiffresPur ? `${paysObj.indicatif}${chiffresPur}` : '';
    const nomPartenaireClean = (nouveauPartenaire.nom_fournisseur || '').trim().toUpperCase();

    setEnTrainDeSauvegarder(true);
    try {
      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel,
        nom_fournisseur: nomPartenaireClean,
        statut_stockage: 'AVEC_STOCKAGE',
        id_depot: null,
        pays: nouveauPartenaire.pays,
        telephone: numeroComplet,
        email: (nouveauPartenaire.email || '').trim().toLowerCase(),
        adresse: (nouveauPartenaire.adresse || '').trim().toUpperCase(),
        taxes_ristournes_associees: nouveauPartenaire.taxes_ristournes_associees || [],
      };

      if (partenaireEnEdition) {
        payload.id = partenaireEnEdition.id;
        let { error } = await supabase
          .from('fournisseurs')
          .update(payload)
          .eq('id', partenaireEnEdition.id);

        if (error) {
          localSync.ajouterFileAttente('UPDATE', 'fournisseurs', payload);
        }

        const listeMaj = partenaires.map(p => p.id === partenaireEnEdition.id ? { ...p, ...payload } : p);
        setPartenaires(listeMaj);
        localSync.sauvegarderDonneesLocales(cleCacheFournisseurs, listeMaj);

        alert('Mise à jour réussie !');
      } else {
        const idTemp = 'temp_' + Date.now();
        const nouvelObjet = { ...payload, id: idTemp, created_at: new Date().toISOString() };
        
        let { error } = await supabase.from('fournisseurs').insert([payload]);

        if (error) {
          localSync.ajouterFileAttente('INSERT', 'fournisseurs', payload);
        }

        const listeMaj = [nouvelObjet, ...partenaires];
        setPartenaires(listeMaj);
        localSync.sauvegarderDonneesLocales(cleCacheFournisseurs, listeMaj);

        alert('Enregistrement réussi !');
      }

      localStorage.removeItem(cleCacheFournisseurs);
      annulerForm();
      await chargerPermissionsEtDonnees(true);
    } catch (err) {
      alert('Erreur : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const ouvrirEdition = (partenaire) => {
    if (enTrainDeSauvegarder) return;
    if (!permissions.modification) {
      alert('⛔ Action non autorisée : Modification interdite par votre profil.');
      return;
    }
    setPartenaireEnEdition(partenaire);
    
    let telLocal = partenaire.telephone || '';
    const paysTrouve = LISTE_PAYS.find(p => partenaire.telephone && partenaire.telephone.startsWith(p.indicatif)) || LISTE_PAYS[0];
    if (partenaire.telephone && partenaire.telephone.startsWith(paysTrouve.indicatif)) {
      telLocal = partenaire.telephone.replace(paysTrouve.indicatif, '');
    }

    setNouveauPartenaire({
      nom_fournisseur: partenaire.nom_fournisseur || partenaire.nom || '',
      statut_stockage: 'AVEC_STOCKAGE',
      pays: partenaire.pays || paysTrouve.code,
      telephone: telLocal.replace(/[^0-9]/g, ''),
      email: (partenaire.email || '').toLowerCase(),
      adresse: partenaire.adresse || '',
      taxes_ristournes_associees: partenaire.taxes_ristournes_associees || [],
    });
    setAfficherForm(true);

    setTimeout(() => {
      if (nomInputRef.current) {
        nomInputRef.current.focus();
        nomInputRef.current.select();
      }
    }, 50);
  };

  const annulerForm = () => {
    if (enTrainDeSauvegarder) return;
    setPartenaireEnEdition(null);
    setNouveauPartenaire({
      nom_fournisseur: '',
      statut_stockage: 'AVEC_STOCKAGE',
      pays: 'cmr',
      telephone: '',
      email: '',
      adresse: '',
      taxes_ristournes_associees: [],
    });
    setAfficherForm(false);
  };

  const supprimerPartenaire = async () => {
    if (enTrainDeSauvegarder || !partenaireEnEdition) return;
    if (!permissions.suppression) {
      alert('⛔ Action non autorisée : Suppression interdite par votre profil.');
      return;
    }

    setEnTrainDeSauvegarder(true);
    try {
      const partenaireIdStr = String(partenaireEnEdition.id);
      const partenaireNomStr = String(partenaireEnEdition.nom_fournisseur || partenaireEnEdition.nom || '').trim().toUpperCase();

      const [resAppro, resBC] = await Promise.all([
        supabase.from('approvisionnements').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel),
        supabase.from('bons_commande_fournisseurs').select('*').eq('id_entreprise', entrepriseId).eq('module', moduleActuel)
      ]);

      const approDb = resAppro.data || [];
      const bcDb = resBC.data || [];

      const approRattaches = approDb.filter((app) => {
        const idFournApp = String(app.id_fournisseur || '');
        const nomFournApp = String(app.nom_fournisseur || app.fournisseur || '').trim().toUpperCase();
        return idFournApp === partenaireIdStr || (partenaireNomStr !== '' && nomFournApp === partenaireNomStr);
      });

      const bcRattaches = bcDb.filter((bc) => {
        const idFournBc = String(bc.id_fournisseur || '');
        const nomFournBc = String(bc.nom_fournisseur || bc.fournisseur || '').trim().toUpperCase();
        return idFournBc === partenaireIdStr || (partenaireNomStr !== '' && nomFournBc === partenaireNomStr);
      });

      const totalOperations = approRattaches.length + bcRattaches.length;

      if (totalOperations > 0) {
        alert(`❌ SUPPRESSION BLOQUÉE : Cet élément ("${partenaireNomStr}") possède déjà ${totalOperations} opération(s).`);
        setEnTrainDeSauvegarder(false);
        return;
      }

      if (!confirm(`Voulez-vous vraiment supprimer définitivement "${partenaireNomStr}" ?`)) {
        setEnTrainDeSauvegarder(false);
        return;
      }

      const { error } = await supabase.from('fournisseurs').delete().eq('id', partenaireEnEdition.id);
      if (error) {
        localSync.ajouterFileAttente('DELETE', 'fournisseurs', { id: partenaireEnEdition.id });
      }

      const listeMaj = partenaires.filter(p => p.id !== partenaireEnEdition.id);
      setPartenaires(listeMaj);
      localSync.sauvegarderDonneesLocales(cleCacheFournisseurs, listeMaj);

      localStorage.removeItem(cleCacheFournisseurs);
      alert('Suppression effectuée avec succès.');
      annulerForm();
      await chargerPermissionsEtDonnees(true);
    } catch (err) {
      alert('Erreur : ' + err.message);
    } finally {
      setEnTrainDeSauvegarder(false);
    }
  };

  const gererSaisieTelephone = (e) => {
    const chiffres = e.target.value.replace(/[^0-9]/g, '');
    setNouveauPartenaire({ ...nouveauPartenaire, telephone: chiffres });
  };

  const gererTri = (colonne) => {
    if (enTrainDeSauvegarder) return;
    if (triCol === colonne) {
      setTriOrdre(triOrdre === 'asc' ? 'desc' : 'asc');
    } else {
      setTriCol(colonne);
      setTriOrdre('asc');
    }
  };

  const partenairesFiltres = partenaires
    .filter((f) => {
      const nom = (f.nom_fournisseur || f.nom || '').toLowerCase();
      const tel = (f.telephone || '').toLowerCase();
      const query = recherche.toLowerCase();
      return nom.includes(query) || tel.includes(query);
    })
    .sort((a, b) => {
      let valA = '';
      let valB = '';

      if (triCol === 'nom_fournisseur') {
        valA = a.nom_fournisseur || a.nom || '';
        valB = b.nom_fournisseur || b.nom || '';
      }

      if (valA < valB) return triOrdre === 'asc' ? -1 : 1;
      if (valA > valB) return triOrdre === 'asc' ? 1 : -1;
      return 0;
    });

  const partenairesAffiches = partenairesFiltres.slice(0, limitePartenaires);
  const paysActuelObj = LISTE_PAYS.find(p => p.code === nouveauPartenaire.pays) || LISTE_PAYS[0];

  return (
    <div className="space-y-3 text-[11px] font-sans max-w-6xl mx-auto p-1 sm:p-3">
      <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <h3 className="font-extrabold text-slate-900 uppercase text-xs sm:text-sm flex items-center gap-1.5">
            <span>🏢</span> GESTION DES {libelleEntite} ({partenairesAffiches.length} / {partenairesFiltres.length})
          </h3>
          {utilisateurConnecte && (
            <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold border border-slate-200 hidden sm:inline-block">
              Utilisateur : {utilisateurConnecte}
            </span>
          )}
        </div>
        {permissions.creation && (
          <button
            type="button"
            disabled={enTrainDeSauvegarder}
            onClick={() => {
              if (enTrainDeSauvegarder) return;
              if (afficherForm) {
                annulerForm();
              } else {
                setNouveauPartenaire({ nom_fournisseur: '', statut_stockage: 'AVEC_STOCKAGE', pays: 'cmr', telephone: '', email: '', adresse: '', taxes_ristournes_associees: [] });
                setPartenaireEnEdition(null);
                setAfficherForm(true);

                setTimeout(() => {
                  if (nomInputRef.current) {
                    nomInputRef.current.focus();
                    nomInputRef.current.select();
                  }
                }, 50);
              }
            }}
            className="bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-2xs text-xs uppercase"
          >
            {afficherForm ? '✖ Fermer' : '+ Nouveau'}
          </button>
        )}
      </div>

      {ongletActif === 'repertoire' && (
        <>
          {afficherForm && permissions.creation ? (
            <form onSubmit={enregistrerPartenaire} className="bg-white border-2 border-orange-500/50 p-3 sm:p-5 rounded-2xl space-y-4 shadow-md">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                <h4 className="font-extrabold text-orange-600 uppercase text-xs">
                  {partenaireEnEdition ? `✏️ Fiche du fournisseur` : `➕ Nouveau fournisseur`}
                </h4>
                <button type="button" disabled={enTrainDeSauvegarder} onClick={annulerForm} className="text-slate-400 hover:text-slate-700 font-bold text-xs p-1">✖</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-black mb-1 text-[10px] text-slate-700 uppercase">Nom / Raison Sociale *</label>
                  <input
                    ref={nomInputRef}
                    autoFocus
                    type="text"
                    required
                    disabled={enTrainDeSauvegarder}
                    value={nouveauPartenaire.nom_fournisseur}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => setNouveauPartenaire({ ...nouveauPartenaire, nom_fournisseur: e.target.value.toUpperCase() })}
                    placeholder="EX: SARL FESCO"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 font-extrabold uppercase text-slate-900 text-xs shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-black mb-1 text-[10px] text-slate-700 uppercase">Adresse</label>
                  <input
                    type="text"
                    disabled={enTrainDeSauvegarder}
                    value={nouveauPartenaire.adresse}
                    onChange={(e) => setNouveauPartenaire({ ...nouveauPartenaire, adresse: e.target.value.toUpperCase() })}
                    placeholder="EX: YAOUNDÉ"
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 font-extrabold uppercase text-slate-900 text-xs shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-black mb-1 text-[10px] text-slate-700 uppercase">Pays *</label>
                  <select
                    disabled={enTrainDeSauvegarder}
                    value={nouveauPartenaire.pays}
                    onChange={(e) => setNouveauPartenaire({ ...nouveauPartenaire, pays: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 font-extrabold text-slate-900 text-xs shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    {LISTE_PAYS.map((p) => (
                      <option key={p.code} value={p.code}>{p.code.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-black mb-1 text-[10px] text-slate-700 uppercase">Téléphone *</label>
                  <div className="flex items-center bg-white border border-slate-300 rounded-xl overflow-hidden shadow-xs">
                    <span className="bg-slate-100 px-3 py-2 text-xs font-black text-slate-800 border-r border-slate-300 shrink-0">{paysActuelObj.indicatif}</span>
                    <input
                      type="text"
                      required
                      disabled={enTrainDeSauvegarder}
                      maxLength={paysActuelObj.longueur}
                      value={nouveauPartenaire.telephone}
                      onFocus={(e) => e.target.select()}
                      onChange={gererSaisieTelephone}
                      placeholder="6XXXXXXXX"
                      className="w-full p-2 font-mono text-xs font-extrabold text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* GESTION DU RATTACHEMENT DES TAXES & RISTOURNES (DEDUCTIBLE) */}
              {moduleActuel === 'BOUTIQUE' && (
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <label className="block font-black text-[10px] uppercase text-slate-800">
                    Association des Taxes & Ristournes Déductibles (Achats) :
                  </label>
                  {taxesDisponibles.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic">Aucune taxe ou ristourne déductible n'est configurée dans le module Boutique.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {taxesDisponibles.map((taxe) => {
                        const estCoche = (nouveauPartenaire.taxes_ristournes_associees || []).includes(taxe.code_taxe);
                        return (
                          <button
                            key={taxe.id}
                            type="button"
                            onClick={() => toggleTaxeSelection(taxe.code_taxe)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border flex items-center gap-1.5 ${
                              estCoche 
                                ? 'bg-orange-600 text-white border-orange-700 shadow-2xs' 
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <span>{estCoche ? '✅' : '➕'}</span>
                            <span>{taxe.nom_taxe} ({taxe.code_taxe})</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                {partenaireEnEdition && permissions.suppression && (
                  <button type="button" disabled={enTrainDeSauvegarder} onClick={supprimerPartenaire} className="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white font-black px-3 py-2 rounded-xl text-xs transition border border-rose-200">
                    🗑️ Supprimer
                  </button>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button type="button" disabled={enTrainDeSauvegarder} onClick={annulerForm} className="bg-slate-200 text-slate-800 font-black px-4 py-2 rounded-xl text-xs">Annuler</button>
                  {permissions.modification && (
                    <button type="submit" disabled={enTrainDeSauvegarder} className="bg-orange-600 hover:bg-orange-500 text-white font-black px-5 py-2 rounded-xl text-xs shadow-xs uppercase tracking-wide">
                      {enTrainDeSauvegarder ? 'Enregistrement...' : (partenaireEnEdition ? 'Mettre à jour' : 'Enregistrer')}
                    </button>
                  )}
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
                <input
                  type="text"
                  disabled={enTrainDeSauvegarder}
                  value={recherche}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setRecherche(e.target.value.toUpperCase())}
                  placeholder="🔍 RECHERCHER UN FOURNISSEUR..."
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-extrabold uppercase text-slate-900 text-xs shadow-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-800 border-b border-slate-200 uppercase text-[10px] font-black select-none">
                    <tr>
                      <th onClick={() => gererTri('nom_fournisseur')} className="p-3 cursor-pointer hover:bg-slate-200 transition">Nom / Raison Sociale</th>
                      <th className="p-3">Téléphone</th>
                      <th className="p-3">Adresse</th>
                      <th className="p-3">Taxes & Ristournes Associées</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] font-bold text-slate-900">
                    {partenairesAffiches.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="p-6 text-center text-slate-500 font-normal">Aucun fournisseur trouvé.</td>
                      </tr>
                    ) : (
                      partenairesAffiches.map((f) => {
                        const nomP = f.nom_fournisseur || f.nom || '';
                        const telP = f.telephone || '-';
                        const adresseP = f.adresse || '-';
                        const taxesAssociees = f.taxes_ristournes_associees || [];

                        return (
                          <tr key={f.id} onClick={() => permissions.modification && ouvrirEdition(f)} className="hover:bg-orange-50/70 cursor-pointer transition select-none">
                            <td className="p-3 font-black uppercase text-slate-900">{nomP}</td>
                            <td className="p-3 font-mono font-bold text-slate-700">{telP}</td>
                            <td className="p-3 font-bold uppercase text-slate-600">{adresseP}</td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {taxesAssociees.length > 0 ? (
                                  taxesAssociees.map((code, idx) => (
                                    <span key={idx} className="bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-md text-[9px] font-mono font-black">
                                      {code}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-slate-400 font-normal italic text-[10px]">Aucune taxe liée</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}