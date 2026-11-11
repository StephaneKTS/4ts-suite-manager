'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

export default function MenuExplorer({ entrepriseId = '4TS-290136' }) {
  const [banniereIndex, setBanniereIndex] = useState(0);
  const [moduleSelectionne, setModuleSelectionne] = useState(null);
  const [modalAnnonceOuvert, setModalAnnonceOuvert] = useState(false);
  const [modalCguOuvert, setModalCguOuvert] = useState(false);
  const [modalAdminReseauxOuvert, setModalAdminReseauxOuvert] = useState(false);
  const [modalChatbotOuvert, setModalChatbotOuvert] = useState(false);
  const [estEnPause, setEstEnPause] = useState(false);

  // --- ÉTATS POUR LE GLISSER / SWIPE DES ANNONCES ---
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // --- ÉTATS POUR LE CHATBOT ---
  const [modeChat, setModeChat] = useState('ACCUEIL'); 
  const [etapeSondage, setEtapeSondage] = useState(0);
  const [resultatsSondage, setResultatsSondage] = useState({});
  const [etapeDivertissement, setEtapeDivertissement] = useState(0);
  const [resultatsDivertissement, setResultatsDivertissement] = useState({});

  const categoriesAstuces = {
    voyage: {
      titre: '✈️ Voyage & Aventures',
      liste: [
        { titre: '1. Rouler ses vêtements', texte: 'Roulez vos vêtements au lieu de les plier pour gagner de l’espace.' },
        { titre: '2. Copies de documents', texte: 'Gardez toujours des copies numériques de vos pièces sur le cloud.' }
      ]
    },
    sante: {
      titre: '🩺 Santé & Bien-être',
      liste: [
        { titre: '1. Sommeil régulier', texte: 'Couchez-vous et levez-vous à des heures fixes.' },
        { titre: '2. Hydratation', texte: 'Consommez au moins 1,5L d’eau par jour.' }
      ]
    },
    beaute: {
      titre: '💄 Beauté & Soins',
      liste: [
        { titre: '1. Hydratation cutanée', texte: 'Appliquez votre crème hydratante juste après la douche.' },
        { titre: '2. Démaquillage', texte: 'Ne vous couchez jamais sans vous être démaquillé(e).' }
      ]
    },
    entretien: {
      titre: '🧹 Entretien & Maison',
      liste: [
        { titre: '1. Vinaigre blanc', texte: 'Idéal pour détartrer et nettoyer écologiquement.' },
        { titre: '2. Aération', texte: 'Ouvrez vos fenêtres 10 minutes chaque matin.' }
      ]
    },
    entrepreneuriat: {
      titre: '💼 Entrepreneuriat & Business',
      liste: [
        { titre: '1. Valider son MVP', texte: 'Testez une offre pilote avant d’investir massivement.' },
        { titre: '2. Séparer les comptes', texte: 'Ne mélangez jamais finances persos et pros.' }
      ]
    },
    cuisine: {
      titre: '🍲 Cuisine & Gastronomie',
      liste: [
        { titre: '1. Mise en place', texte: 'Préparez tous vos ingrédients avant de cuisiner.' },
        { titre: '2. Assaisonnement', texte: 'Salez par petites touches en goûtant régulièrement.' }
      ]
    },
    finances: {
      titre: '💰 Finances & Épargne',
      liste: [
        { titre: '1. Règle 50/30/20', texte: 'Besoins, envies et épargne.' },
        { titre: '2. Épargne de précaution', texte: 'Gardez 3 mois de dépenses de côté.' }
      ]
    },
    technologie: {
      titre: '💻 Technologie & Numérique',
      liste: [
        { titre: '1. Mises à jour', texte: 'Installez toujours les correctifs de sécurité.' },
        { titre: '2. Mots de passe', texte: 'Utilisez des clés robustes et uniques.' }
      ]
    },
    sport: {
      titre: '⚽ Sport & Fitness',
      liste: [
        { titre: '1. Échauffement', texte: '10 minutes de mobilisation articulaire.' },
        { titre: '2. Régularité', texte: 'Mieux vaut 3 séances modérées par semaine.' }
      ]
    },
    productivite: {
      titre: '⚡ Productivité & Organisation',
      liste: [
        { titre: '1. Les 3 priorités', texte: 'Listez chaque matin vos tâches capitales.' },
        { titre: '2. Pomodoro', texte: '25 min de focus, 5 min de pause.' }
      ]
    }
  };

  const [messagesChat, setMessagesChat] = useState([
    { expediteur: 'bot', texte: '👋 Bienvenue sur l’assistant interactif 4TS Suite Manager ! Comment puis-je vous guider aujourd’hui ?' }
  ]);
  const [saisieMessage, setSaisieMessage] = useState('');
  const chatFinRef = useRef(null);

  const questionsSondage = [
    { id: 'pays', question: '🌍 1/5. Dans quel pays vous situez-vous ?', type: 'CHOIX', options: ['Cameroun', 'Côte d’Ivoire', 'Sénégal', 'France', 'Autre'] },
    { id: 'ville', question: '🏙️ 2/5. Dans quelle ville résidez-vous ?', type: 'LIBRE' },
    { id: 'activite', question: '💼 3/5. Quel est votre type d’activité ?', type: 'CHOIX', options: ['Commerce', 'Livraison & Logistique', 'Services', 'Autre'] },
    { id: 'module_prefere', question: '⭐ 4/5. Quel module préférez-vous ?', type: 'CHOIX', options: ['Boutique & Caisse', 'Livraison & Flotte', 'Tontine', 'Logistique'] },
    { id: 'amelioration_libre', question: '💡 5/5. Une suggestion ?', type: 'LIBRE' }
  ];

  const questionsDivertissement = [
    { id: 'genre_tranche', question: '👤 1/4. Tranche d’âge ?', type: 'CHOIX', options: ['Moins de 25 ans', '25 - 40 ans', '41 - 60 ans', 'Plus de 60 ans'] },
    { id: 'musique', question: '🎵 2/4. Style de musique favori ?', type: 'LIBRE' },
    { id: 'couleur', question: '🎨 3/4. Couleur préférée ?', type: 'CHOIX', options: ['🔴 Rouge & Noir', '🔵 Bleu', '🟢 Vert', '🟡 Jaune'] },
    { id: 'plat', question: '🍲 4/4. Plat favori ?', type: 'LIBRE' }
  ];

  useEffect(() => {
    if (modalChatbotOuvert) {
      chatFinRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messagesChat, modalChatbotOuvert]);

  const retournerAccueilChat = () => {
    setModeChat('ACCUEIL');
    setMessagesChat([
      { expediteur: 'bot', texte: '👋 Bienvenue de retour au menu principal ! Que souhaitez-vous faire ?' }
    ]);
  };

  const lancerModeSondage = () => {
    setModeChat('SONDAGE');
    setEtapeSondage(0);
    setResultatsSondage({});
    setMessagesChat((prev) => [
      ...prev,
      { expediteur: 'client', texte: '📊 Participer au Sondage' },
      { expediteur: 'bot', texte: `Formidable ! ${questionsSondage[0].question}`, options: questionsSondage[0].options }
    ]);
  };

  const lancerModeDivertissement = () => {
    setModeChat('DIVERTISSEMENT');
    setEtapeDivertissement(0);
    setResultatsDivertissement({});
    setMessagesChat((prev) => [
      ...prev,
      { expediteur: 'client', texte: '🎮 Quiz & Détente' },
      { expediteur: 'bot', texte: `Super ! ${questionsDivertissement[0].question}`, options: questionsDivertissement[0].options }
    ]);
  };

  const lancerModeAstuces = () => {
    setModeChat('ASTUCES');
    const listeNomsCategories = Object.keys(categoriesAstuces).map((cle) => categoriesAstuces[cle].titre);
    setMessagesChat((prev) => [
      ...prev,
      { expediteur: 'client', texte: '💡 Découvrir les Astuces' },
      { expediteur: 'bot', texte: '💡 **Choisissez une catégorie d’astuces ci-dessous :**', options: listeNomsCategories }
    ]);
  };

  const lancerModeSupport = () => {
    setModeChat('SUPPORT');
    setMessagesChat((prev) => [
      ...prev,
      { expediteur: 'client', texte: '❓ Poser une question' },
      { expediteur: 'bot', texte: 'Posez votre question sur nos services (Tarifs, Boutique, Livraison). Je vous réponds instantanément !' }
    ]);
  };

  const soumettreReponseChat = (e) => {
    e.preventDefault();
    if (!saisieMessage.trim()) return;
    const texteSaisi = saisieMessage;
    setSaisieMessage('');

    if (modeChat === 'SONDAGE') {
      const qCourante = questionsSondage[etapeSondage];
      setResultatsSondage((prev) => ({ ...prev, [qCourante.id]: texteSaisi }));
      setMessagesChat((prev) => [...prev, { expediteur: 'client', texte: texteSaisi }]);
      const prochaineEtape = etapeSondage + 1;
      if (prochaineEtape < questionsSondage.length) {
        setEtapeSondage(prochaineEtape);
        setTimeout(() => {
          setMessagesChat((prev) => [...prev, { expediteur: 'bot', texte: questionsSondage[prochaineEtape].question, options: questionsSondage[prochaineEtape].options }]);
        }, 600);
      } else {
        setModeChat('ACCUEIL');
        setTimeout(() => {
          setMessagesChat((prev) => [...prev, { expediteur: 'bot', texte: '🎉 **Merci !** Vos réponses ont été enregistrées.' }]);
        }, 600);
      }
    } else if (modeChat === 'DIVERTISSEMENT') {
      const dCourante = questionsDivertissement[etapeDivertissement];
      setResultatsDivertissement((prev) => ({ ...prev, [dCourante.id]: texteSaisi }));
      setMessagesChat((prev) => [...prev, { expediteur: 'client', texte: texteSaisi }]);
      const prochaineEtape = etapeDivertissement + 1;
      if (prochaineEtape < questionsDivertissement.length) {
        setEtapeDivertissement(prochaineEtape);
        setTimeout(() => {
          setMessagesChat((prev) => [...prev, { expediteur: 'bot', texte: questionsDivertissement[prochaineEtape].question, options: questionsDivertissement[prochaineEtape].options }]);
        }, 600);
      } else {
        setModeChat('ACCUEIL');
        setTimeout(() => {
          setMessagesChat((prev) => [...prev, { expediteur: 'bot', texte: '🌟 **Quiz terminé avec succès !**' }]);
        }, 600);
      }
    } else {
      setMessagesChat((prev) => [...prev, { expediteur: 'client', texte: texteSaisi }]);
      setTimeout(() => {
        let reponseBot = "Contactez notre service client par WhatsApp ou via le bouton d'appel en bas de page.";
        const texteMin = texteSaisi.toLowerCase();
        if (texteMin.includes('module') || texteMin.includes('service')) {
          reponseBot = "📦 **Nos modules :**\n1. Module Boutique & Caisse (✅)\n2. Module Livraison & Flotte (✅)\n3. Module Tontine & Épargne (En développement 🔒)\n4. Module Logistique (En développement 🔒)";
        } else if (texteMin.includes('prix') || texteMin.includes('tarif')) {
          reponseBot = "💰 Les options de diffusion publicitaire débutent à 300 XAF/jour.";
        }
        setMessagesChat((prev) => [...prev, { expediteur: 'bot', texte: reponseBot }]);
      }, 800);
    }
  };

  const selectionnerOptionChoix = (option) => {
    if (modeChat === 'SONDAGE') {
      const qCourante = questionsSondage[etapeSondage];
      setResultatsSondage((prev) => ({ ...prev, [qCourante.id]: option }));
      setMessagesChat((prev) => [...prev, { expediteur: 'client', texte: option }]);
      const prochaineEtape = etapeSondage + 1;
      if (prochaineEtape < questionsSondage.length) {
        setEtapeSondage(prochaineEtape);
        setTimeout(() => {
          setMessagesChat((prev) => [...prev, { expediteur: 'bot', texte: questionsSondage[prochaineEtape].question, options: questionsSondage[prochaineEtape].options }]);
        }, 600);
      } else {
        setModeChat('ACCUEIL');
        setTimeout(() => {
          setMessagesChat((prev) => [...prev, { expediteur: 'bot', texte: '🎉 **Merci infiniment !** Sondage enregistré.' }]);
        }, 600);
      }
    } else if (modeChat === 'DIVERTISSEMENT') {
      const dCourante = questionsDivertissement[etapeDivertissement];
      setResultatsDivertissement((prev) => ({ ...prev, [dCourante.id]: option }));
      setMessagesChat((prev) => [...prev, { expediteur: 'client', texte: option }]);
      const prochaineEtape = etapeDivertissement + 1;
      if (prochaineEtape < questionsDivertissement.length) {
        setEtapeDivertissement(prochaineEtape);
        setTimeout(() => {
          setMessagesChat((prev) => [...prev, { expediteur: 'bot', texte: questionsDivertissement[prochaineEtape].question, options: questionsDivertissement[prochaineEtape].options }]);
        }, 600);
      } else {
        setModeChat('ACCUEIL');
        setTimeout(() => {
          setMessagesChat((prev) => [...prev, { expediteur: 'bot', texte: '🌟 **Génial !** Quiz terminé.' }]);
        }, 600);
      }
    } else if (modeChat === 'ASTUCES') {
      setMessagesChat((prev) => [...prev, { expediteur: 'client', texte: option }]);
      const cleTrouvee = Object.keys(categoriesAstuces).find(
        (cle) => categoriesAstuces[cle].titre.toLowerCase() === option.toLowerCase()
      );
      setTimeout(() => {
        if (cleTrouvee) {
          const cat = categoriesAstuces[cleTrouvee];
          let texteAstuces = `✨ **${cat.titre}** :\n\n` + cat.liste.map(a => `📌 **${a.titre}**\n${a.texte}`).join('\n\n');
          setMessagesChat((prev) => [...prev, { expediteur: 'bot', texte: texteAstuces }]);
        } else {
          setMessagesChat((prev) => [...prev, { expediteur: 'bot', texte: `Voici d'excellents conseils !` }]);
        }
      }, 600);
    }
  };

  const [emailConnecte, setEmailConnecte] = useState('stephs7352@gmail.com');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const emailLocal = localStorage.getItem('emailConnecte');
      if (emailLocal) setEmailConnecte(emailLocal);
    }
  }, []);
  const estSuperAdmin = emailConnecte.toLowerCase().trim() === 'stephs7352@gmail.com';

  const [liensReseauxSociaux, setLiensReseauxSociaux] = useState({
    facebook: 'https://www.facebook.com',
    tiktok: 'https://www.tiktok.com',
    youtube: 'https://www.youtube.com',
    instagram: 'https://instagram.com',
    whatsapp: '+237600000000',
    telephone: '+237600000000'
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const liensSauves = localStorage.getItem('4ts_reseaux_sociaux_officiels');
      if (liensSauves) {
        try { setLiensReseauxSociaux(JSON.parse(liensSauves)); } catch (e) {}
      }
    }
  }, []);

  const [fbInput, setFbInput] = useState(liensReseauxSociaux.facebook);
  const [tkInput, setTkInput] = useState(liensReseauxSociaux.tiktok);
  const [ytInput, setYtInput] = useState(liensReseauxSociaux.youtube);
  const [instaInput, setInstaInput] = useState(liensReseauxSociaux.instagram);
  const [waInput, setWaInput] = useState(liensReseauxSociaux.whatsapp);
  const [telInput, setTelInput] = useState(liensReseauxSociaux.telephone || '+237600000000');

  // Synchroniser les inputs à l'ouverture de la modale de configuration
  useEffect(() => {
    if (modalAdminReseauxOuvert) {
      setFbInput(liensReseauxSociaux.facebook);
      setTkInput(liensReseauxSociaux.tiktok);
      setYtInput(liensReseauxSociaux.youtube);
      setInstaInput(liensReseauxSociaux.instagram);
      setWaInput(liensReseauxSociaux.whatsapp);
      setTelInput(liensReseauxSociaux.telephone);
    }
  }, [modalAdminReseauxOuvert, liensReseauxSociaux]);

  const sauvegarderLiensReseaux = (e) => {
    e.preventDefault();
    const nouveauxLiens = { facebook: fbInput, tiktok: tkInput, youtube: ytInput, instagram: instaInput, whatsapp: waInput, telephone: telInput };
    setLiensReseauxSociaux(nouveauxLiens);
    if (typeof window !== 'undefined') {
      localStorage.setItem('4ts_reseaux_sociaux_officiels', JSON.stringify(nouveauxLiens));
    }
    alert("✅ Paramètres et contacts mis à jour avec succès !");
    setModalAdminReseauxOuvert(false);
  };

  const [titreAnnonce, setTitreAnnonce] = useState('');
  const [descAnnonce, setDescAnnonce] = useState('');
  const [whatsappAnnonce, setWhatsappAnnonce] = useState('');
  const [facebookAnnonce, setFacebookAnnonce] = useState('');
  const [tiktokAnnonce, setTiktokAnnonce] = useState('');
  const [youtubeAnnonce, setYoutubeAnnonce] = useState('');
  const [dureeOption, setDureeOption] = useState('24'); 
  const [visuelPreview, setVisuelPreview] = useState(null);

  const calculerTarifAnnonce = () => {
    const heures = parseInt(dureeOption);
    let tarifBaseParJour = 300;
    let jours = heures / 24;
    if (jours < 1) jours = 1;
    let totalBrut = jours * tarifBaseParJour;
    let reduction = 0;
    if (jours >= 30) reduction = 0.10; 
    else if (jours >= 7) reduction = 0.05; 
    const totalFinal = Math.round(totalBrut * (1 - reduction));
    return { jours, totalBrut, reductionPercent: reduction * 100, totalFinal };
  };

  const infoTarif = calculerTarifAnnonce();

  const gererChangementVisuel = (e) => {
    const fichier = e.target.files[0];
    if (fichier) {
      const lecteur = new FileReader();
      lecteur.onloadend = () => setVisuelPreview(lecteur.result);
      lecteur.readAsDataURL(fichier);
    }
  };

  const [bannières, setBannières] = useState([
    {
      id: 1,
      type: 'ECOSYSTEME',
      titre: '🚀 4TS SUITE MANAGER : VOTRE ÉCOSYSTÈME GLOBAL',
      description: 'Pilotez l’ensemble de vos activités grâce à une suite complète : Module Boutique, Module Livraison, Module Logistique et Module Tontine intégrés.',
      couleur: 'from-slate-900 via-red-950 to-slate-950',
      badge: 'PROMO OFFICIELLE'
    }
  ]);

  useEffect(() => {
    const chargerBannièresSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from('bannieres')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: false });
        if (!error && data && data.length > 0) setBannières(data);
      } catch (err) {
        console.error("Erreur chargement Supabase", err);
      }
    };
    chargerBannièresSupabase();
  }, []);

  // Défilement automatique géré par intervalle (en pause seulement si estEnPause est vrai)
  useEffect(() => {
    if (estEnPause || bannières.length <= 1) return;
    const interval = setInterval(() => {
      setBanniereIndex((prev) => (prev + 1) % bannières.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [bannières.length, estEnPause]);

  // Gestion du Swipe tactile / Glissement pour changer d'annonce
  const handleTouchStart = (e) => {
    setEstEnPause(true);
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    setEstEnPause(false);
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        setBanniereIndex((prev) => (prev + 1) % bannières.length);
      } else {
        setBanniereIndex((prev) => (prev - 1 + bannières.length) % bannières.length);
      }
    }
  };

  const soumettreAnnonce = async (e) => {
    e.preventDefault();
    if (!titreAnnonce || !descAnnonce) {
      alert('Veuillez remplir au moins le titre et la description de l’annonce.');
      return;
    }
    const expirationMS = parseInt(dureeOption) * 3600 * 1000;
    const expireAt = Date.now() + expirationMS;
    try {
      const nouvelleAnnonceDB = {
        type: 'ANNONCE_PERSO',
        titre: titreAnnonce,
        description: descAnnonce,
        badge: 'ANNONCE SPONSORISÉE',
        couleur: 'from-amber-950 via-slate-900 to-red-950',
        visuel: visuelPreview || null,
        whatsapp: whatsappAnnonce || null,
        facebook: facebookAnnonce || null,
        tiktok: tiktokAnnonce || null,
        youtube: youtubeAnnonce || null,
        expire_at: expireAt,
        is_active: true
      };

      const { data, error } = await supabase.from('bannieres').insert([nouvelleAnnonceDB]);
      if (error) {
        console.error("Détail erreur Supabase:", error);
        throw error;
      }

      alert(`✅ Annonce publiée avec succès ! Montant réglé : ${infoTarif.totalFinal} XAF.`);
      setModalAnnonceOuvert(false);
      window.location.reload();
    } catch (err) {
      console.error("Erreur enregistrement annonce", err);
      alert(`Erreur Supabase : ${err.message || err.details || JSON.stringify(err, null, 2)}`);
    }
  };

  const modulesFormation = [
    {
      id: 'boutique',
      nom: 'Module Boutique & Caisse',
      icone: '🛍️',
      statut: 'DISPONIBLE',
      description: 'Enregistrez vos ventes, gérez vos tickets de caisse, vos stocks et encaissez vos clients.',
      tutorielTexte: `1. Accédez au menu Ventes / Boutique.\n2. Sélectionnez vos articles dans le catalogue ou scannez-les.\n3. Validez le mode de règlement et éditez le ticket.`
    },
    {
      id: 'livraison',
      nom: 'Module Livraison & Flotte',
      icone: '🛵',
      statut: 'DISPONIBLE',
      description: 'Gérez vos livreurs, planifiez les tournées, suivez les colis en route.',
      tutorielTexte: `1. Créez vos tournées de livraison et affectez les livreurs.\n2. Suivez les encaissements terrain en temps réel.`
    },
    {
      id: 'tontine',
      nom: 'Module Tontine & Épargne',
      icone: '🤝',
      statut: 'EN_DEVELOPPEMENT',
      description: 'Gestion des cotisations, tours de rôle et suivi de caisses d’épargne communautaires.',
      tutorielTexte: `Ce module fait l'objet d'un développement approfondi pour garantir une sécurité irréprochable. Bientôt disponible !`
    },
    {
      id: 'logistique',
      nom: 'Module Logistique Avancée',
      icone: '🚛',
      statut: 'EN_DEVELOPPEMENT',
      description: 'Optimisation des entrainements logistiques, transits inter-villes et gestion de flotte.',
      tutorielTexte: `Le module Logistique Avancée intègre des algorithmes de routage et de gestion d'entrepôt complexes. Sortie prochaine.`
    }
  ];

  const banniereActuelle = bannières[banniereIndex] || bannières[0];

  return (
    <div className="space-y-4 font-sans text-xs pb-16">
      
      {/* ================= 1. BANNIÈRE DÉFILANTE PRINCIPALE (AUTO-SCROLL & SWIPE & PAUSE AU MAINTIEN) ================= */}
      <div 
        onMouseEnter={() => setEstEnPause(true)}
        onMouseLeave={() => setEstEnPause(false)}
        onMouseDown={() => setEstEnPause(true)}
        onMouseUp={() => setEstEnPause(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative overflow-hidden rounded-2xl shadow-xl border border-slate-800 bg-slate-950 text-white p-6 transition-all duration-700 select-none cursor-grab active:cursor-grabbing"
      >
        <div className={`absolute inset-0 bg-gradient-to-r ${banniereActuelle?.couleur || 'from-slate-900 via-red-950 to-slate-950'} opacity-90 transition-all duration-700`}></div>
        
        {banniereActuelle?.visuel && (
          <div className="absolute inset-0 z-0 opacity-30">
            <img src={banniereActuelle.visuel} alt="Visuel Annonce" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="relative z-10 flex flex-col justify-between min-h-[160px] space-y-3">
          <div className="flex justify-between items-center">
            <span className="bg-red-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
              {banniereActuelle?.badge || 'INFO'} {estEnPause && '⏸️'}
            </span>

            <div className="flex gap-1.5">
              {bannières.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setBanniereIndex(idx); }}
                  className={`h-2 rounded-full transition-all duration-300 ${idx === banniereIndex ? 'w-6 bg-white' : 'w-2 bg-white/40'}`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-sm sm:text-base font-black uppercase tracking-wide drop-shadow-md">
              {banniereActuelle?.titre}
            </h2>
            <p className="text-[11px] text-slate-200 font-medium max-w-2xl leading-relaxed">
              {banniereActuelle?.description}
            </p>

            {(banniereActuelle?.whatsapp || banniereActuelle?.facebook || banniereActuelle?.tiktok || banniereActuelle?.youtube) && (
              <div className="pt-2 flex items-center gap-2 flex-wrap">
                {banniereActuelle?.whatsapp && (
                  <a href={`https://wa.me/${banniereActuelle.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="bg-emerald-600 text-white px-2.5 py-1 rounded-xl font-black text-[9.5px]">💬 WhatsApp</a>
                )}
                {banniereActuelle?.facebook && (
                  <a href={banniereActuelle.facebook} target="_blank" rel="noopener noreferrer" className="bg-blue-600 text-white px-2.5 py-1 rounded-xl font-black text-[9.5px]">f Facebook</a>
                )}
                {banniereActuelle?.tiktok && (
                  <a href={banniereActuelle.tiktok} target="_blank" rel="noopener noreferrer" className="bg-slate-900 text-white px-2.5 py-1 rounded-xl font-black text-[9.5px]">tk TikTok</a>
                )}
                {banniereActuelle?.youtube && (
                  <a href={banniereActuelle.youtube} target="_blank" rel="noopener noreferrer" className="bg-red-600 text-white px-2.5 py-1 rounded-xl font-black text-[9.5px]">▶ YouTube</a>
                )}
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
            <span className="text-[9px] text-slate-300 font-bold italic">💡 Glissez vers la gauche/droite ou maintenez pour faire pause.</span>
            {estSuperAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); setModalAnnonceOuvert(true); }}
                className="bg-white hover:bg-slate-100 text-slate-950 font-black px-4 py-1.5 rounded-xl text-[10px] uppercase shadow-lg transition"
              >
                ✨ Diffuser mon annonce
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================= 2. CENTRE DE FORMATION - BOUTONS CÔTE À CÔTE FORCÉS ================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎓</span>
            <div>
              <h3 className="font-black text-slate-900 uppercase text-xs">CENTRE DE FORMATION - GUIDE DES MODULES</h3>
              <p className="text-[9px] text-slate-500 font-bold">Accédez à nos plateformes officielles.</p>
            </div>
          </div>

          {estSuperAdmin && (
            <button
              onClick={() => setModalAdminReseauxOuvert(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-black px-3 py-1.5 rounded-xl text-[9.5px] uppercase shadow-md transition flex items-center gap-1.5"
            >
              <span>⚙️</span> Configurer Liens
            </button>
          )}
        </div>

        {/* Grille 3 colonnes forcée sur la même ligne (flex-row) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <a href={liensReseauxSociaux.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-blue-50 transition overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shrink-0">f</div>
            <div className="min-w-0">
              <h4 className="font-black text-slate-900 uppercase text-[10px] truncate">Facebook</h4>
              <p className="text-[8px] text-slate-500 font-bold truncate">Publications</p>
            </div>
          </a>
          <a href={liensReseauxSociaux.tiktok} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black shrink-0">tk</div>
            <div className="min-w-0">
              <h4 className="font-black text-slate-900 uppercase text-[10px] truncate">TikTok</h4>
              <p className="text-[8px] text-slate-500 font-bold truncate">Tutos express</p>
            </div>
          </a>
          <a href={liensReseauxSociaux.youtube} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 hover:bg-red-50 transition overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center font-black shrink-0">▶</div>
            <div className="min-w-0">
              <h4 className="font-black text-slate-900 uppercase text-[10px] truncate">YouTube</h4>
              <p className="text-[8px] text-slate-500 font-bold truncate">Formations</p>
            </div>
          </a>
        </div>
      </div>

      {/* ================= 3. DÉCOUVREZ NOS MODULES - CÔTE À CÔTE EN 4 COLONNES (SIDE BY SIDE) ================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">📚</span>
            <h3 className="font-black text-slate-900 uppercase text-xs">DÉCOUVREZ NOS MODULES</h3>
          </div>
        </div>

        {/* Grille sur 4 colonnes pour afficher tous les modules côte à côte parfaitement */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {modulesFormation.map((mod) => {
            const estVerrouille = mod.statut === 'EN_DEVELOPPEMENT';
            return (
              <div
                key={mod.id}
                onClick={() => {
                  if (estVerrouille) {
                    alert(`🔒 Le module "${mod.nom}" est actuellement en développement.`);
                  } else {
                    setModuleSelectionne(mod);
                  }
                }}
                className={`p-3.5 rounded-xl border transition flex flex-col justify-between shadow-2xs relative overflow-hidden ${
                  estVerrouille 
                    ? 'bg-slate-100 border-slate-300 opacity-80 cursor-not-allowed' 
                    : 'bg-white border-slate-200 hover:border-orange-500 hover:bg-orange-50/30 cursor-pointer group'
                }`}
              >
                {estVerrouille && (
                  <div className="absolute top-2 right-2 bg-amber-500 text-white text-[7.5px] font-black px-2 py-0.5 rounded-full uppercase shadow-xs">
                    🔒 Bientôt
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl">{mod.icone}</span>
                    {!estVerrouille && (
                      <span className="text-[8px] bg-slate-100 text-slate-700 font-extrabold px-2 py-0.5 rounded-full group-hover:bg-orange-600 group-hover:text-white transition">
                        Guide →
                      </span>
                    )}
                  </div>
                  <h4 className="font-black text-slate-900 uppercase text-xs">{mod.nom}</h4>
                  <p className="text-[9px] text-slate-600 leading-relaxed font-medium">{mod.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= 4. BESOIN D'AIDE ? NOUS CONTACTER ================= */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-950 border border-blue-900/50 rounded-2xl p-4 sm:p-5 shadow-xl text-white flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-11 h-11 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-xl shrink-0 shadow-inner">
            🎧
          </div>
          <div>
            <h4 className="font-black uppercase text-xs sm:text-sm tracking-wide text-cyan-300">Besoin d'aide ? Nous Contacter</h4>
            <p className="text-[10px] text-slate-300 font-medium">Service client disponible pour tous par WhatsApp, appel ou Chatbot.</p>
          </div>
        </div>

        <div className="flex items-center justify-center sm:justify-end gap-2.5 w-full sm:w-auto flex-wrap shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-blue-900/50">
          <a
            href={`https://wa.me/${liensReseauxSociaux.whatsapp.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            title="WhatsApp"
            className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center shadow-lg transition transform hover:scale-110 shrink-0"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01C17.18 3.03 14.69 2 12.04 2zM12.04 20.12c-1.42 0-2.8-.38-4.02-1.11l-.29-.17-3.03.8.81-2.95-.19-.31c-.79-1.25-1.21-2.71-1.21-4.22 0-4.41 3.59-8 8-8s8 3.59 8 8c0 2.14-.83 4.15-2.34 5.66-1.51 1.51-3.52 2.34-5.63 2.34zm4.41-5.96c-.24-.12-1.42-.7-1.64-.78-.22-.08-.38-.12-.54.12-.16.24-.62.78-.76.94-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.19-.71-.63-1.19-1.42-1.33-1.66-.14-.24-.01-.37.1-.49.1-.1.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.31-.74-1.8-.2-.48-.4-.42-.54-.42h-.46c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.31.98 2.47c.12.16 1.69 2.58 4.1 3.62.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1rem.47-.07 1.42-.58 1.62-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z"/>
            </svg>
          </a>

          <a
            href={`tel:${liensReseauxSociaux.telephone || liensReseauxSociaux.whatsapp}`}
            title="Appeler"
            className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center shadow-lg transition transform hover:scale-110 shrink-0"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
            </svg>
          </a>

          <button
            onClick={() => { setModalChatbotOuvert(true); setModeChat('ACCUEIL'); }}
            className="bg-red-600 hover:bg-red-700 text-white font-black px-3.5 py-2.5 rounded-xl text-[10px] uppercase shadow-xl transition transform hover:scale-105 flex items-center gap-1.5 shrink-0 animate-pulse border-2 border-red-400"
          >
            <span className="text-sm">🤖</span>
            <span>Chatbot ✨</span>
          </button>
        </div>
      </div>

      {/* ================= 5. PIED DE PAGE : CGU ================= */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🛡️</span>
          <div>
            <h4 className="font-black text-slate-900 uppercase text-xs">Politique & Conditions Générales d’Utilisation</h4>
            <p className="text-[9px] text-slate-500 font-bold">Consultez les règles d’utilisation de 4TS.</p>
          </div>
        </div>
        <button
          onClick={() => setModalCguOuvert(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase shadow-md transition"
        >
          📖 Lire les CGU
        </button>
      </div>

      {/* ================= MODALE : CRÉATION D'ANNONCE ================= */}
      {modalAnnonceOuvert && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-4 p-5 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                <span>📢</span> CRÉER ET DIFFUSER UNE ANNONCE PUBLICITAIRE
              </h4>
              <button onClick={() => setModalAnnonceOuvert(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={soumettreAnnonce} className="space-y-3 text-[10px] overflow-y-auto pr-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Titre de l'annonce *</label>
                <input
                  type="text"
                  value={titreAnnonce}
                  onChange={(e) => setTitreAnnonce(e.target.value.toUpperCase())}
                  placeholder="EX: PROMO EXCEPTIONNELLE..."
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 uppercase text-[10px]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description détaillée *</label>
                <textarea
                  value={descAnnonce}
                  onChange={(e) => setDescAnnonce(e.target.value)}
                  placeholder="Présentez votre offre..."
                  rows="2"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium text-slate-900 text-[10px]"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Lien WhatsApp</label>
                  <input type="text" value={whatsappAnnonce} onChange={(e) => setWhatsappAnnonce(e.target.value)} placeholder="+237..." className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-[10px]" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Lien Facebook</label>
                  <input type="url" value={facebookAnnonce} onChange={(e) => setFacebookAnnonce(e.target.value)} placeholder="https://facebook.com/..." className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-[10px]" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Lien TikTok</label>
                  <input type="url" value={tiktokAnnonce} onChange={(e) => setTiktokAnnonce(e.target.value)} placeholder="https://tiktok.com/@..." className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-[10px]" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Lien YouTube</label>
                  <input type="url" value={youtubeAnnonce} onChange={(e) => setYoutubeAnnonce(e.target.value)} placeholder="https://youtube.com/..." className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-[10px]" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Visuel de l'annonce (Photo)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={gererChangementVisuel}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-1.5 text-[9px] font-bold text-slate-900 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[9px] file:font-black file:bg-slate-800 file:text-white"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-700">⏱️ Durée de diffusion & Tarifs :</label>
                <select
                  value={dureeOption}
                  onChange={(e) => setDureeOption(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-[10px]"
                >
                  <option value="24">1 Jour (300 XAF)</option>
                  <option value="72">3 Jours (900 XAF)</option>
                  <option value="168">1 Semaine (Remise 5% → 1 995 XAF)</option>
                  <option value="720">1 Mois (Remise 10% → 8 100 XAF)</option>
                </select>

                <div className="flex justify-between items-center text-[10px] font-black pt-1 border-t border-slate-200">
                  <span className="text-slate-600">Montant total :</span>
                  <span className="text-emerald-700 text-xs">{infoTarif.totalFinal} XAF {infoTarif.reductionPercent > 0 && `(-${infoTarif.reductionPercent}%)`}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setModalAnnonceOuvert(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold">Annuler</button>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase shadow-md">
                  🚀 Payer et Diffuser
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODALE CHATBOT (PLEIN ÉCRAN VERTICAL) ================= */}
      {modalChatbotOuvert && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col h-[94vh] sm:h-[90vh]">
            
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-600/30 border border-red-500/40 flex items-center justify-center text-lg shadow-inner">
                  🤖
                </div>
                <div>
                  <h4 className="font-black uppercase text-xs tracking-wide">Assistant Virtuel 4TS</h4>
                  <p className="text-[9px] text-slate-300 font-bold">Toujours à votre service</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={retournerAccueilChat}
                  title="Retour au menu principal"
                  className="bg-slate-800 hover:bg-orange-600 text-white font-black text-[9.5px] px-3 py-1.5 rounded-xl uppercase transition shadow-md border border-slate-700 flex items-center gap-1"
                >
                  <span>🏠</span> Menu
                </button>
                <button onClick={() => setModalChatbotOuvert(false)} className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white font-bold flex items-center justify-center transition">✕</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 text-[11px]">
              {messagesChat.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.expediteur === 'client' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3.5 rounded-2xl whitespace-pre-line max-w-[92%] leading-relaxed ${msg.expediteur === 'client' ? 'bg-slate-900 text-white font-medium shadow-md' : 'bg-white text-slate-800 border border-slate-200 shadow-xs'}`}>
                    {msg.texte}
                  </div>
                  {msg.options && (
                    <div className="flex flex-col gap-2 mt-3 w-full pl-2">
                      {msg.options.map((opt, i) => (
                        <button key={i} onClick={() => selectionnerOptionChoix(opt)} className="bg-slate-900 hover:bg-orange-600 text-white p-3 rounded-xl text-left font-bold transition shadow-sm flex items-center gap-2.5">
                          <span className="text-orange-400 font-black">👉</span> <span>{opt}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatFinRef} />
            </div>

            <div className="px-3 py-2.5 bg-slate-100 border-t border-slate-200 flex gap-2 justify-around shrink-0 flex-wrap shadow-inner">
              <button onClick={lancerModeSondage} className="flex-1 bg-slate-900 hover:bg-orange-600 text-white py-2 px-1 rounded-xl text-[8.5px] uppercase font-black transition shadow-sm">📊 Sondage</button>
              <button onClick={lancerModeDivertissement} className="flex-1 bg-slate-900 hover:bg-orange-600 text-white py-2 px-1 rounded-xl text-[8.5px] uppercase font-black transition shadow-sm">🎮 Quiz</button>
              <button onClick={lancerModeAstuces} className="flex-1 bg-slate-900 hover:bg-orange-600 text-white py-2 px-1 rounded-xl text-[8.5px] uppercase font-black transition shadow-sm">💡 Astuces</button>
              <button onClick={lancerModeSupport} className="flex-1 bg-slate-900 hover:bg-orange-600 text-white py-2 px-1 rounded-xl text-[8.5px] uppercase font-black transition shadow-sm">❓ Support</button>
            </div>

            <form onSubmit={soumettreReponseChat} className="p-3.5 bg-white border-t border-slate-200 flex gap-2 shrink-0">
              <input
                type="text"
                value={saisieMessage}
                onChange={(e) => setSaisieMessage(e.target.value)}
                placeholder="Posez votre question ici..."
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-[11px] font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500"
              />
              <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-black px-5 py-2.5 rounded-xl text-[10px] uppercase shadow-md transition">
                Envoyer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODALE CONFIGURATION DES CONTACTS ================= */}
      {modalAdminReseauxOuvert && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="font-black text-slate-900 uppercase text-xs">⚙️ CONFIGURATION DES CONTACTS & RÉSEAUX</h4>
              <button onClick={() => setModalAdminReseauxOuvert(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={sauvegarderLiensReseaux} className="space-y-3 text-[10px] overflow-y-auto pr-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1">WhatsApp</label>
                <input type="text" value={waInput} onChange={(e) => setWaInput(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-[10px]" required />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Téléphone</label>
                <input type="text" value={telInput} onChange={(e) => setTelInput(e.target.value)} className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-[10px]" required />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Lien Facebook</label>
                <input type="url" value={fbInput} onChange={(e) => setFbInput(e.target.value)} placeholder="https://www.facebook.com/..." className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-[10px]" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Lien TikTok</label>
                <input type="url" value={tkInput} onChange={(e) => setTkInput(e.target.value)} placeholder="https://www.tiktok.com/@..." className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-[10px]" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Lien YouTube</label>
                <input type="url" value={ytInput} onChange={(e) => setYtInput(e.target.value)} placeholder="https://www.youtube.com/..." className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-[10px]" />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setModalAdminReseauxOuvert(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-bold">Annuler</button>
                <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-black px-4 py-2 rounded-xl uppercase shadow-md">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Guide Modules */}
      {moduleSelectionne && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{moduleSelectionne.icone}</span>
                <h4 className="font-black text-slate-900 uppercase text-xs">Guide : {moduleSelectionne.nom}</h4>
              </div>
              <button onClick={() => setModuleSelectionne(null)} className="text-slate-400 font-bold">✕</button>
            </div>
            <div className="space-y-3 text-[10px]">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <p className="font-bold text-slate-700 whitespace-pre-line leading-relaxed">{moduleSelectionne.tutorielTexte}</p>
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button onClick={() => setModuleSelectionne(null)} className="bg-slate-900 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase shadow-md">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale CGU */}
      {modalCguOuvert && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden space-y-4 p-5 max-h-[85vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-black text-slate-900 uppercase text-xs">🛡️ CONDITIONS GÉNÉRALES D’UTILISATION</h4>
              <button onClick={() => setModalCguOuvert(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <div className="space-y-3 text-[10px] text-slate-700 overflow-y-auto pr-2 leading-relaxed font-medium">
              <p>4TS Suite Manager est une solution logicielle modulaire conçue pour la gestion commerciale, la comptabilité, le suivi des stocks, la caisse boutique, la logistique, la tontine et la gestion des flottes de livraison.</p>
            </div>
            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button onClick={() => setModalCguOuvert(false)} className="bg-slate-900 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase shadow-md">Fermer</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}