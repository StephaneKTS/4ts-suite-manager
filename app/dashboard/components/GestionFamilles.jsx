'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionFamilles({ entrepriseId = '4TS-TEST' }) {
  const [familles, setFamilles] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [modeAffichage, setModeAffichage] = useState('LISTE'); // 'LISTE' ou 'SAISIE'
  const [familleSelectionnee, setFamilleSelectionnee] = useState(null);
  
  const [nouveauFamille, setNouveauFamille] = useState({
    nom_famille: '',
  });

  // Récupération dynamique et robuste du module actif (Boutique, Livraison, Logistique, Tontine, etc.)
  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'BOUTIQUE').toUpperCase();
    }
    return 'BOUTIQUE';
  };

  const moduleActuel = obtenirModuleActuel();

  const chargerFamilles = async () => {
    setChargement(true);
    try {
      // Tentative de récupération avec le filtre strict par module
      let { data, error } = await supabase
        .from('familles_articles')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleActuel)
        .order('created_at', { ascending: false });

      // Sécuro-fallback : si la colonne module met du temps à se synchroniser sur Supabase
      if (error && error.message.includes('column')) {
        console.warn('⚠️ Colonne module non détectée, bascule en mode global temporaire...');
        const resSecours = await supabase
          .from('familles_articles')
          .select('*')
          .eq('id_entreprise', entrepriseId)
          .order('created_at', { ascending: false });
        
        if (resSecours.error) throw resSecours.error;
        data = resSecours.data;
      } else if (error) {
        throw error;
      }

      setFamilles(data || []);
    } catch (err) {
      console.error('Erreur :', err.message);
    } finally {
      setChargement(false);
    }
  };

  useEffect(() => {
    chargerFamilles();
  }, [entrepriseId, moduleActuel]);

  const enregistrerFamille = async (e) => {
    if (e) e.preventDefault();
    if (!nouveauFamille.nom_famille.trim()) {
      alert('⚠️ Veuillez renseigner le nom de la famille.');
      return;
    }

    try {
      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel, // Injection automatique du module actif
        nom_famille: nouveauFamille.nom_famille.trim(),
      };

      if (familleSelectionnee) {
        const { error } = await supabase
          .from('familles_articles')
          .update(payload)
          .eq('id', familleSelectionnee.id);

        if (error) throw error;
        alert(`Famille mise à jour avec succès dans le module ${moduleActuel} !`);
      } else {
        const { error } = await supabase.from('familles_articles').insert([payload]);

        if (error) throw error;
        alert(`Famille créée avec succès dans le module ${moduleActuel} !`);
      }
      reinitialiser();
      chargerFamilles();
      setModeAffichage('LISTE');
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  const reinitialiser = () => {
    setFamilleSelectionnee(null);
    setNouveauFamille({ nom_famille: '' });
  };

  const ouvrirFicheDetail = (famille) => {
    setFamilleSelectionnee(famille);
    setNouveauFamille({
      nom_famille: famille.nom_famille || '',
    });
  };

  const supprimerFamille = async () => {
    if (!familleSelectionnee) return;

    try {
      const { data: tousLesArticles, error: errArticles } = await supabase
        .from('articles_stock')
        .select('*')
        .eq('ID_Entreprise', entrepriseId)
        .eq('module', moduleActuel);

      if (errArticles) throw errArticles;

      const idFamilleStr = String(familleSelectionnee.id);
      const nomFamilleStr = String(familleSelectionnee.nom_famille || '').trim().toUpperCase();

      const articlesRattaches = (tousLesArticles || []).filter((art) => {
        const valIdFamille = String(art.id_famille || art.famille_id || art.Famille || art.famille || '');
        const valNomFamille = String(art.nom_famille || art.libelle_famille || '').trim().toUpperCase();

        return valIdFamille === idFamilleStr || valIdFamille.toUpperCase() === nomFamilleStr || valNomFamille === nomFamilleStr;
      });

      if (articlesRattaches.length > 0) {
        const exempleArticle = articlesRattaches[0].Designation || articlesRattaches[0].designation || 'Article';
        alert(`❌ SUPPRESSION BLOQUÉE : Cette famille ("${familleSelectionnee.nom_famille}") contient encore ${articlesRattaches.length} article(s) rattaché(s) (ex: "${exempleArticle}"). Vous devez d'abord réaffecter ou supprimer ces articles avant de pouvoir supprimer cette famille.`);
        return;
      }

      if (!confirm(`Voulez-vous vraiment supprimer définitivement la famille "${familleSelectionnee.nom_famille}" ?`)) return;

      const { error } = await supabase.from('familles_articles').delete().eq('id', familleSelectionnee.id);
      if (error) throw error;

      alert('Famille supprimée avec succès.');
      reinitialiser();
      chargerFamilles();
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  };

  return (
    <div className="space-y-2.5 font-sans text-xs">
      
      {/* EN-TÊTE EXPLICITE DE LA TABLE (HARMONISÉ) */}
      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-200 shadow-2xs">
        <h3 className="font-extrabold text-slate-900 uppercase text-xs flex items-center gap-1.5">
          <span>🏷️</span> GESTION DES FAMILLES D'ARTICLES [{moduleActuel}]
        </h3>
        <button
          type="button"
          onClick={() => {
            if (modeAffichage === 'SAISIE') {
              reinitialiser();
              setModeAffichage('LISTE');
            } else {
              reinitialiser();
              setModeAffichage('SAISIE');
            }
          }}
          className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-3 py-1.5 rounded-lg transition shadow-2xs text-xs"
        >
          {modeAffichage === 'SAISIE' ? '✖' : 'Nouveau'}
        </button>
      </div>

      {/* BARRE DE NAVIGATION (BOUTONS DE VUE LISTE) */}
      <div className="flex justify-start items-center gap-1.5">
        <button
          type="button"
          onClick={() => {
            reinitialiser();
            setModeAffichage('LISTE');
          }}
          className={`px-3 py-1.5 rounded-lg font-black text-[11px] transition whitespace-nowrap border shadow-2xs ${
            modeAffichage === 'LISTE' 
              ? 'bg-orange-600 text-white border-orange-600 shadow-xs' 
              : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
          }`}
        >
          📋 Liste des Familles [{moduleActuel}] ({familles.length})
        </button>
      </div>

      {/* MODE 1 : SAISIE / AJOUT DE FAMILLE */}
      {modeAffichage === 'SAISIE' && (
        <form onSubmit={enregistrerFamille} className="bg-white border-2 border-orange-500/50 p-3 rounded-xl shadow-md space-y-2.5">
          <div className="flex justify-between items-center pb-1 border-b border-slate-100">
            <span className="font-extrabold text-[11px] text-orange-600 uppercase">
              Nouvelle famille d'articles ({moduleActuel})
            </span>
            <button type="button" onClick={() => { reinitialiser(); setModeAffichage('LISTE'); }} className="text-slate-400 hover:text-slate-700 font-bold text-xs p-1">✕</button>
          </div>

          <div className="space-y-2 text-[11px]">
            <div>
              <label className="block font-black text-[9px] uppercase text-slate-700 mb-0.5">
                Nom de la famille *
              </label>
              <input
                type="text"
                required
                value={nouveauFamille.nom_famille}
                onChange={(e) => setNouveauFamille({ ...nouveauFamille, nom_famille: e.target.value })}
                placeholder="Ex: BOISSONS, LAIT BEBE..."
                className="w-full bg-white border border-slate-300 rounded p-1.5 font-extrabold text-slate-900 text-xs shadow-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-1.5 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                reinitialiser();
                setModeAffichage('LISTE');
              }}
              className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-black px-3 py-1.5 rounded text-[10px]"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-1.5 rounded text-[10px] shadow-xs"
            >
              ✅ Enregistrer
            </button>
          </div>
        </form>
      )}

      {/* MODE 2 : LISTE DES FAMILLES */}
      {modeAffichage === 'LISTE' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs table-fixed">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 uppercase text-[9px] font-black tracking-wider">
                  <th className="p-2.5 w-full">Famille [{moduleActuel}]</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[10.5px]">
                {chargement ? (
                  <tr>
                    <td className="p-4 text-center text-slate-500 font-bold">Chargement...</td>
                  </tr>
                ) : familles.length === 0 ? (
                  <tr>
                    <td className="p-4 text-center text-slate-500 font-bold">Aucune famille d'articles enregistrée pour le module {moduleActuel}.</td>
                  </tr>
                ) : (
                  familles.map((fam) => (
                    <tr
                      key={fam.id}
                      onClick={() => ouvrirFicheDetail(fam)}
                      className="hover:bg-orange-50/70 cursor-pointer transition select-none"
                    >
                      <td className="p-2.5 font-black text-slate-900 truncate">
                        🏷️ {fam.nom_famille}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL FICHE DETAIL (MODIFICATION & SUPPRESSION) */}
      {familleSelectionnee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-3 bg-slate-900 text-white flex justify-between items-center text-xs font-black">
              <span>🏷️ MODIFIER LA FAMILLE [{moduleActuel}]</span>
              <button onClick={reinitialiser} className="text-slate-300 hover:text-white font-black text-xs">✕</button>
            </div>

            <div className="p-3 space-y-2.5 text-[11px] bg-slate-50">
              <div>
                <label className="block font-black text-[9px] uppercase text-slate-700 mb-0.5">
                  Nom de la famille *
                </label>
                <input
                  type="text"
                  value={nouveauFamille.nom_famille}
                  onChange={(e) => setNouveauFamille({ ...nouveauFamille, nom_famille: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded p-1.5 font-black text-slate-900 text-xs shadow-xs"
                />
              </div>
            </div>

            <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={supprimerFamille}
                className="bg-red-600 hover:bg-red-700 text-white font-black px-3 py-1.5 rounded text-[10px] shadow-xs"
              >
                🗑️ Supprimer
              </button>
              
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={reinitialiser}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold px-3 py-1.5 rounded text-[10px]"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={enregistrerFamille}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3.5 py-1.5 rounded text-[10px] shadow-xs"
                >
                  ✅ Mettre à jour
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}