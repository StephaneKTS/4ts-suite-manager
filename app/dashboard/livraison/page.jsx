'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ModuleLivraison({ entrepriseId = '4TS-TEST' }) {
  const [onglet, setOnglet] = useState('courses'); // 'courses', 'nouvelle', 'livreurs', 'historique'
  const [courses, setCourses] = useState([]);
  const [livreurs, setLivreurs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  // --- FORMULAIRE NOUVELLE COURSE ---
  const [codeCourse, setCodeCourse] = useState('LIV-01');
  const [clientNom, setClientNom] = useState('');
  const [adresseDestination, setAdresseDestination] = useState('');
  const [montantFrais, setMontantFrais] = useState('');
  const [livreurAssigne, setLivreurAssigne] = useState('');

  // Récupération dynamique et robuste du module actif (Boutique, Livraison, Logistique, Tontine, etc.)
  const obtenirModuleActuel = () => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('module_actif') || 'LIVRAISON').toUpperCase();
    }
    return 'LIVRAISON';
  };

  const moduleActuel = obtenirModuleActuel();

  useEffect(() => {
    chargerDonneesLivraison();
  }, [entrepriseId, moduleActuel]);

  const chargerDonneesLivraison = async () => {
    setLoading(true);
    try {
      await Promise.all([
        chargerCourses(),
        chargerLivreurs()
      ]);
    } catch (err) {
      console.error('Erreur chargement données livraison :', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Chargement des courses (filtrées par entreprise et par module)
  const chargerCourses = async () => {
    const { data, error } = await supabase
      .from('ventes')
      .select('*')
      .eq('id_entreprise', entrepriseId)
      .eq('module', moduleActuel)
      .order('date_vente', { ascending: false });

    if (!error && data) {
      setCourses(data);
    }
  };

  // Chargement des livreurs / personnel (filtrés par entreprise et par module)
  const chargerLivreurs = async () => {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('ID_Entreprise', entrepriseId)
      .eq('module', moduleActuel)
      .order('designation', { ascending: true });

    if (!error && data) {
      setLivreurs(data);
    }
  };

  const enregistrerCourse = async (e) => {
    e.preventDefault();
    if (!clientNom.trim() || !adresseDestination.trim()) {
      setMsg({ type: 'error', text: '⚠️ Veuillez renseigner le client et l\'adresse de destination.' });
      return;
    }

    try {
      const payload = {
        id_entreprise: entrepriseId,
        module: moduleActuel, // Injection automatique du module actif
        reference_facture: codeCourse.trim().toUpperCase(),
        montant_total: parseFloat(montantFrais) || 0,
        mode_paiement: 'Espèces (Livraison)',
        date_vente: new Date().toISOString(),
      };

      const { error } = await supabase.from('ventes').insert([payload]);
      if (error) throw error;

      setMsg({ type: 'success', text: `✅ Course de livraison enregistrée avec succès dans le module ${moduleActuel} !` });
      setClientNom('');
      setAdresseDestination('');
      setMontantFrais('');
      chargerCourses();
    } catch (err) {
      setMsg({ type: 'error', text: 'Erreur enregistrement course : ' + err.message });
    }
  };

  return (
    <div className="space-y-6 p-4 bg-slate-50 min-h-screen font-sans">
      
      {/* BARRE DE NAVIGATION DU MODULE LIVRAISON */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setOnglet('courses')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase transition ${
              onglet === 'courses' ? 'bg-orange-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            📦 Courses en cours [{moduleActuel}] ({courses.length})
          </button>
          <button
            onClick={() => setOnglet('nouvelle')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase transition ${
              onglet === 'nouvelle' ? 'bg-orange-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ➕ Nouvelle Course [{moduleActuel}]
          </button>
          <button
            onClick={() => setOnglet('livreurs')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase transition ${
              onglet === 'livreurs' ? 'bg-orange-600 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🛵 Équipe Livreurs [{moduleActuel}]
          </button>
        </div>

        <div className="bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-xl text-xs">
          <span className="text-orange-900 font-bold">Module Actif : </span>
          <span className="font-extrabold text-orange-600">{moduleActuel} 🚀</span>
        </div>
      </div>

      {msg.text && (
        <div className={`p-4 rounded-xl text-sm font-semibold border ${
          msg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-rose-50 text-rose-800 border-rose-300'
        }`}>
          {msg.text}
        </div>
      )}

      {/* ONGLET : NOUVELLE COURSE */}
      {onglet === 'nouvelle' && (
        <form onSubmit={enregistrerCourse} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-extrabold text-slate-800 text-sm uppercase">🛵 Enregistrer une expédition / course [{moduleActuel}]</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Code / Ref Course</label>
              <input
                type="text"
                value={codeCourse}
                onChange={(e) => setCodeCourse(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono font-bold uppercase"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Nom du Client</label>
              <input
                type="text"
                value={clientNom}
                onChange={(e) => setClientNom(e.target.value)}
                placeholder="Ex: Jean Dupont"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Adresse de destination</label>
              <input
                type="text"
                value={adresseDestination}
                onChange={(e) => setAdresseDestination(e.target.value)}
                placeholder="Ex: Akwa, Douala"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Frais de livraison (XAF)</label>
              <input
                type="number"
                value={montantFrais}
                onChange={(e) => setMontantFrais(e.target.value)}
                placeholder="2000"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold font-mono"
              />
            </div>
          </div>
          <div className="pt-2">
            <button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition">
              Valider et Lancer la Course 🚀
            </button>
          </div>
        </form>
      )}

      {/* ONGLET : COURSES EN COURS */}
      {onglet === 'courses' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-extrabold text-slate-800 text-sm">📦 Liste des courses enregistrées [{moduleActuel}] ({courses.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b font-bold text-slate-500 uppercase">
                <tr>
                  <th className="p-3">Référence</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Montant / Frais</th>
                  <th className="p-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {courses.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-4 text-center text-slate-500 font-bold">Aucune course enregistrée pour le module {moduleActuel}.</td>
                  </tr>
                ) : (
                  courses.map((c) => (
                    <tr key={c.id}>
                      <td className="p-3 font-mono font-bold text-orange-600">{c.reference_facture}</td>
                      <td className="p-3">{new Date(c.date_vente).toLocaleString('fr-FR')}</td>
                      <td className="p-3 font-extrabold text-slate-900">{c.montant_total?.toLocaleString()} XAF</td>
                      <td className="p-3">
                        <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                          EN COURS
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ONGLET : ÉQUIPE LIVREURS */}
      {onglet === 'livreurs' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="font-extrabold text-slate-800 text-sm">🛵 Équipe de Livraison [{moduleActuel}]</h3>
          <p className="text-slate-500 text-xs">Gérez ici vos coursiers et suivez leurs affectations en temps réel pour le module {moduleActuel}.</p>
        </div>
      )}

    </div>
  );
}