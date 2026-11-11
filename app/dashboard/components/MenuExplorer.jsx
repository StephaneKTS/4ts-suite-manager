'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function MenuExplorer({ entrepriseId = '4TS-290136' }) {
  const [banniereIndex, setBanniereIndex] = useState(0);
  const [moduleSelectionne, setModuleSelectionne] = useState(null);
  const [modalAnnonceOuvert, setModalAnnonceOuvert] = useState(false);
  const [modalCguOuvert, setModalCguOuvert] = useState(false);
  
  // États pour le formulaire de création d'annonce payante
  const [titreAnnonce, setTitreAnnonce] = useState('');
  const [descAnnonce, setDescAnnonce] = useState('');
  const [contactAnnonce, setContactAnnonce] = useState('');
  const [forfaitAnnonce, setForfaitAnnonce] = useState('5000'); // en XAF par exemple

  // Liste des bannières défilantes (Annonces entreprises & Publicités écosystème 4TS)
  const bannières = [
    {
      id: 1,
      type: 'PUBLICITE',
      titre: '🚀 DÉCOUVREZ 4TS SUITE MANAGER',
      description: 'Optimisez la gestion de votre boutique, de vos livraisons et de votre stock en un clin d’œil.',
      couleur: 'from-slate-900 to-red-950',
      badge: 'PROMO OFFICIELLE'
    },
    {
      id: 2,
      type: 'ANNONCE',
      titre: '📦 ISMA LOGISTIQUE : EXPÉDITION EXPRESS',
      description: 'Besoin de livrer vos clients à Yaoundé et Douala en temps record ? Contactez-nous dès aujourd’hui !',
      couleur: 'from-red-900 to-slate-900',
      badge: 'ANNONCE PARTENAIRE'
    },
    {
      id: 3,
      type: 'PUBLICITE',
      titre: '💡 4TS ACADEMY : FORMEZ-VOUS !',
      description: 'Maîtrisez chaque module de l’application grâce à nos tutoriels vidéo exclusifs sur TikTok et YouTube.',
      couleur: 'from-slate-950 to-orange-950',
      badge: 'FORMATION'
    }
  ];

  // Effet pour faire défiler automatiquement les bannières toutes les 5 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      setBanniereIndex((prev) => (prev + 1) % bannières.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [bannières.length]);

  // Données des tutoriels / formation par module
  const modulesFormation = [
    {
      id: 'boutique',
      nom: 'Module Boutique & Caisse',
      icone: '🛍️',
      description: 'Apprenez à enregistrer vos ventes, gérer vos tickets de caisse et encaisser vos clients rapidement.',
      tutorielTexte: `1. Accédez au menu Ventes / Boutique.\n2. Sélectionnez vos articles dans le catalogue ou scannez-les.\n3. Validez le mode de règlement (Espèces, Mobile Money, etc.) et imprimez ou validez le ticket.\n4. Les mouvements de stock se mettent à jour automatiquement en arrière-plan.`,
      videoLien: 'https://www.tiktok.com'
    },
    {
      id: 'livraison',
      nom: 'Module Livraison & Flotte',
      icone: '🛵',
      description: 'Gérez vos livreurs, suivez les colis en route et validez les restitutions de fonds.',
      tutorielTexte: `1. Créez vos tournées de livraison en y attachant les articles et les livreurs correspondants.\n2. Suivez l'état des encaissements sur le terrain en temps réel.\n3. Clôturez la tournée à l'arrivée pour réajuster les stocks de manière sécurisée.`,
      videoLien: 'https://www.facebook.com'
    },
    {
      id: 'stock',
      nom: 'Gestion des Stocks & Mouvements',
      icone: '📦',
      description: 'Maîtrisez les entrées, sorties, transferts inter-dépôts et les inventaires physiques.',
      tutorielTexte: `1. Rendez-vous dans le menu Mouvements de Stock.\n2. Choisissez le type d'opération (Entrée, Sortie, Transfert, Avaries ou Inventaire).\n3. Renseignez obligatoirement le motif et sélectionnez les articles avec leurs quantités.\n4. Validez le document pour impacter instantanément vos rapports de stock.`,
      videoLien: 'https://www.youtube.com'
    }
  ];

  const soumettreAnnoncePayante = (e) => {
    e.preventDefault();
    if (!titreAnnonce || !descAnnonce || !contactAnnonce) {
      alert('Veuillez remplir tous les champs obligatoires de l’annonce.');
      return;
    }
    // Simulation du processus de paiement en ligne / validation
    alert(`🎉 Annonce enregistrée avec succès !\nMontant à régler : ${forfaitAnnonce} XAF.\nVotre annonce sera diffusée dans le bandeau publicitaire après validation du paiement.`);
    setTitreAnnonce('');
    setDescAnnonce('');
    setContactAnnonce('');
    setModalAnnonceOuvert(false);
  };

  return (
    <div className="space-y-4 font-sans text-xs pb-10">
      
      {/* ================= 1. BANNIÈRE DÉFILANTE ANIMÉE (Le cœur visuel) ================= */}
      <div className="relative overflow-hidden rounded-2xl shadow-xl border border-slate-800 bg-slate-950 text-white p-6 transition-all duration-700">
        <div className={`absolute inset-0 bg-gradient-to-r ${bannières[banniereIndex].couleur} opacity-90 transition-all duration-700`}></div>
        
        <div className="relative z-10 flex flex-col justify-between min-h-[140px] space-y-3">
          <div className="flex justify-between items-center">
            <span className="bg-red-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
              {bannières[banniereIndex].badge}
            </span>
            <div className="flex gap-1.5">
              {bannières.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setBanniereIndex(idx)}
                  className={`h-2 rounded-full transition-all duration-300 ${idx === banniereIndex ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-sm sm:text-base font-black uppercase tracking-wide drop-shadow-md">
              {bannières[banniereIndex].titre}
            </h2>
            <p className="text-[11px] text-slate-200 font-medium max-w-2xl leading-relaxed">
              {bannières[banniereIndex].description}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
            <span className="text-[9px] text-slate-300 font-bold italic">💡 Astuce : Publiez votre propre annonce d’entreprise ici !</span>
            <button
              onClick={() => setModalAnnonceOuvert(true)}
              className="bg-white hover:bg-slate-100 text-slate-950 font-black px-4 py-1.5 rounded-xl text-[10px] uppercase shadow-lg transition transform hover:scale-105"
            >
              ✨ Diffuser mon annonce (Payant)
            </button>
          </div>
        </div>
      </div>

      {/* ================= 2. SECTION 4TS ACADEMY (Réseaux Sociaux & Vidéos) ================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎓</span>
            <div>
              <h3 className="font-black text-slate-900 uppercase text-xs">4TS Academy — Vidéos & Réseaux Sociaux</h3>
              <p className="text-[9px] text-slate-500 font-bold">Suivez nos démonstrations, astuces et actualités en direct sur nos plateformes.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Facebook */}
          <a
            href="https://www.facebook.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-600 hover:bg-blue-50/40 transition group shadow-2xs"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-md group-hover:scale-110 transition">
              f
            </div>
            <div>
              <h4 className="font-black text-slate-900 uppercase text-xs group-hover:text-blue-700">Facebook</h4>
              <p className="text-[9px] text-slate-500 font-bold">Rejoignez notre communauté</p>
            </div>
          </a>

          {/* TikTok */}
          <a
            href="https://www.tiktok.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition group shadow-2xs"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-base shadow-md group-hover:scale-110 transition">
              tk
            </div>
            <div>
              <h4 className="font-black text-slate-900 uppercase text-xs">TikTok</h4>
              <p className="text-[9px] text-slate-500 font-bold">Tutos express & business</p>
            </div>
          </a>

          {/* YouTube */}
          <a
            href="https://www.youtube.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-red-600 hover:bg-red-50/40 transition group shadow-2xs"
          >
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-base shadow-md group-hover:scale-110 transition">
              ▶
            </div>
            <div>
              <h4 className="font-black text-slate-900 uppercase text-xs group-hover:text-red-700">YouTube</h4>
              <p className="text-[9px] text-slate-500 font-bold">Formations complètes</p>
            </div>
          </a>
        </div>
      </div>

      {/* ================= 3. CENTRE DE FORMATION & TEXTES PAR MODULE ================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">📚</span>
            <div>
              <h3 className="font-black text-slate-900 uppercase text-xs">Centre de Formation — Guide des Modules</h3>
              <p className="text-[9px] text-slate-500 font-bold">Cliquez sur un module pour consulter son mode d’emploi textuel détaillé.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {modulesFormation.map((mod) => (
            <div
              key={mod.id}
              onClick={() => setModuleSelectionne(mod)}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-orange-500 hover:bg-orange-50/30 transition cursor-pointer flex flex-col justify-between shadow-2xs group"
            >
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-2xl">{mod.icone}</span>
                  <span className="text-[8px] bg-slate-100 text-slate-700 font-extrabold px-2 py-0.5 rounded-full group-hover:bg-orange-600 group-hover:text-white transition">
                    Guide interactif →
                  </span>
                </div>
                <h4 className="font-black text-slate-900 uppercase text-xs">{mod.nom}</h4>
                <p className="text-[9px] text-slate-600 leading-relaxed font-medium">{mod.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= 4. PIED DE PAGE : CONDITIONS D'UTILISATION (CGU) ================= */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🛡️</span>
          <div>
            <h4 className="font-black text-slate-900 uppercase text-xs">Politique & Conditions Générales d’Utilisation</h4>
            <p className="text-[9px] text-slate-500 font-bold">Consultez les règles d’utilisation, de confidentialité et de sécurité de 4TS Suite Manager.</p>
          </div>
        </div>
        <button
          onClick={() => setModalCguOuvert(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase shadow-md transition"
        >
          📖 Lire les CGU
        </button>
      </div>

      {/* ================= MODALE : GUIDE TEXTUEL DU MODULE SÉLECTIONNÉ ================= */}
      {moduleSelectionne && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-4 p-5 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{moduleSelectionne.icone}</span>
                <h4 className="font-black text-slate-900 uppercase text-xs">Guide : {moduleSelectionne.nom}</h4>
              </div>
              <button
                onClick={() => setModuleSelectionne(null)}
                className="text-slate-400 hover:text-slate-700 font-black text-sm px-2 py-1 rounded-lg hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-[10px]">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-700 whitespace-pre-line leading-relaxed">
                  {moduleSelectionne.tutorielTexte}
                </p>
              </div>
              <div className="bg-orange-50 border border-orange-200 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <h5 className="font-black text-orange-900 uppercase text-[9px]">Besoin d'une explication en vidéo ?</h5>
                  <p className="text-[8.5px] text-orange-700 font-medium">Retrouvez la démonstration filmée de ce module sur nos réseaux.</p>
                </div>
                <a
                  href={moduleSelectionne.videoLien}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-black px-3 py-1.5 rounded-lg text-[9px] uppercase shadow-md transition shrink-0"
                >
                  Voir la vidéo ▶
                </a>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setModuleSelectionne(null)}
                className="bg-slate-900 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase shadow-md"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODALE : CRÉATION D'ANNONCE PAYANTE ================= */}
      {modalAnnonceOuvert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden space-y-4 p-5 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                <span>📢</span> DIFFUSER UNE ANNONCE COMMERCIALE
              </h4>
              <button
                onClick={() => setModalAnnonceOuvert(false)}
                className="text-slate-400 hover:text-slate-700 font-black text-sm px-2 py-1 rounded-lg hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={soumettreAnnoncePayante} className="space-y-3 text-[10px]">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Titre de l'annonce *</label>
                <input
                  type="text"
                  value={titreAnnonce}
                  onChange={(e) => setTitreAnnonce(e.target.value.toUpperCase())}
                  placeholder="EX: PROMOTION EXCEPTIONNELLE SUR LE RIZ..."
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-[10px] focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description détaillée *</label>
                <textarea
                  value={descAnnonce}
                  onChange={(e) => setDescAnnonce(e.target.value)}
                  placeholder="Présentez votre offre, vos services ou vos produits en quelques mots..."
                  rows="3"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium text-slate-900 text-[10px] focus:ring-2 focus:ring-orange-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact / WhatsApp *</label>
                  <input
                    type="text"
                    value={contactAnnonce}
                    onChange={(e) => setContactAnnonce(e.target.value)}
                    placeholder="EX: +237 6XXXXXXXX"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-[10px]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Forfait de diffusion</label>
                  <select
                    value={forfaitAnnonce}
                    onChange={(e) => setForfaitAnnonce(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-orange-600 text-[10px]"
                  >
                    <option value="5000">5 000 XAF / Semaine</option>
                    <option value="15000">15 000 XAF / Mois</option>
                  </select>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 p-2.5 rounded-xl text-[9px] text-orange-800 font-bold">
                💳 En cliquant sur valider, vous serez redirigé vers le portègne de paiement sécurisé en ligne pour régler les frais de parution.
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalAnnonceOuvert(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-[10px] uppercase"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase shadow-md"
                >
                  Procéder au paiement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODALE : CONDITIONS GÉNÉRALES D'UTILISATION (CGU) ================= */}
      {modalCguOuvert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden space-y-4 p-5 animate-in fade-in zoom-in duration-200 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                <span>🛡️</span> CONDITIONS GÉNÉRALES D’UTILISATION (CGU)
              </h4>
              <button
                onClick={() => setModalCguOuvert(false)}
                className="text-slate-400 hover:text-slate-700 font-black text-sm px-2 py-1 rounded-lg hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-[10px] text-slate-700 overflow-y-auto pr-2 leading-relaxed font-medium">
              <h5 className="font-black text-slate-900 uppercase">1. Objet de l’écosystème 4TS Suite Manager</h5>
              <p>4TS Suite Manager est une solution logicielle modulaire conçue pour la gestion commerciale, la comptabilité, le suivi des stocks, la caisse boutique et la gestion des flottes de livraison. Son utilisation implique le respect strict des présentes conditions.</p>

              <h5 className="font-black text-slate-900 uppercase">2. Sécurité et Confidentialité des Données</h5>
              <p>Chaque entreprise abonnée est responsable de la confidentialité de ses accès administrateur et opérateurs. Les données saisies (articles, mouvements, clients) sont stockées de manière sécurisée et ne sont en aucun cas revendues à des tiers.</p>

              <h5 className="font-black text-slate-900 uppercase">3. Annonces et Publicités</h5>
              <p>Les annonces diffusées dans le menu Explorer par des entreprises tierces sont soumises à validation préalable et au paiement en ligne des forfaits correspondants. 4TS Suite Manager se réserve le droit de supprimer toute annonce non conforme aux bonnes mœurs ou aux lois en vigueur.</p>

              <h5 className="font-black text-slate-900 uppercase">4. Propriété Intellectuelle</h5>
              <p>L’ensemble des interfaces, codes sources, graphismes et contenus pédagogiques de la 4TS Academy sont protégés par les lois sur la propriété intellectuelle. Toute reproduction non autorisée est strictement interdite.</p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setModalCguOuvert(false)}
                className="bg-slate-900 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase shadow-md"
              >
                J'ai compris et fermé
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}