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

  // --- ÉTATS POUR LE CHATBOT (SONDAGE, DIVERTISSEMENT, SUPPORT & 10 CATÉGORIES D'ASTUCES) ---
  const [modeChat, setModeChat] = useState('ACCUEIL'); 
  const [etapeSondage, setEtapeSondage] = useState(0);
  const [resultatsSondage, setResultatsSondage] = useState({});
  const [etapeDivertissement, setEtapeDivertissement] = useState(0);
  const [resultatsDivertissement, setResultatsDivertissement] = useState({});

  // 10 catégories riches avec 30 astuces et conseils au total
  const categoriesAstuces = {
    voyage: {
      titre: '✈️ Voyage & Aventures',
      liste: [
        { titre: '1. Rouler ses vêtements', texte: 'Roulez vos vêtements au lieu de les plier : cela gagne un espace considérable dans la valise et évite les faux plis.' },
        { titre: '2. Copies de documents', texte: 'Gardez toujours des copies numériques de vos pièces d’identité et passeport dans votre boîte mail ou sur le cloud.' },
        { titre: '3. Trousse de premiers secours', texte: 'Emportez toujours une mini-trousse avec des antalgiques, des pansements et des désinfectants pour parer aux petits bobos.' },
        { titre: '4. Adaptateur universel', texte: 'Investissez dans un adaptateur de prise universel pour ne jamais être bloqué lors de vos déplacements internationaux.' },
        { titre: '5. Hydratation en vol', texte: 'Buvez beaucoup d’eau pendant les long-courriers pour contrer l’air sec de la cabine et éviter la fatigue excessive.' }
      ]
    },
    sante: {
      titre: '🩺 Santé & Bien-être',
      liste: [
        { titre: '1. Sommeil régulier', texte: 'Couchez-vous et levez-vous à des heures fixes pour stabiliser votre horloge biologique et booster votre système immunitaire.' },
        { titre: '2. Hydratation quotidienne', texte: 'Consommez au moins 1,5 à 2 litres d’eau par jour pour purifier votre organisme et maintenir votre énergie.' },
        { titre: '3. Marche active', texte: 'Marchez au moins 30 minutes par jour pour stimuler votre circulation sanguine et réduire le stress.' },
        { titre: '4. Gestion du stress', texte: 'Pratiquez des exercices de respiration profonde (cohérence cardiaque) dès que la pression monte.' },
        { titre: '5. Posture au travail', texte: 'Ajustez la hauteur de votre écran à la hauteur de vos yeux pour éviter les tensions cervicales et dorsales.' }
      ]
    },
    beaute: {
      titre: '💄 Beauté & Soins',
      liste: [
        { titre: '1. Hydratation cutanée', texte: 'Appliquez votre crème hydratante juste après la douche sur une peau légèrement humide pour emprisonner l’humidité.' },
        { titre: '2. Bains d’huile capillaire', texte: 'Nourrissez vos cheveux avec des bains d’huile végétale (ricin, coco ou karité) une fois par semaine pour renforcer la fibre.' },
        { titre: '3. Démaquillage systématique', texte: 'Ne vous couchez jamais sans vous être démaquillé(e) pour laisser la peau respirer et éviter les imperfections.' },
        { titre: '4. Protection solaire', texte: 'Protégez votre peau des UV même par temps couvert pour prévenir le vieillissement prématuré.' },
        { titre: '5. Gommage doux', texte: 'Faites un gommage exfoliant doux une fois par semaine pour éliminer les cellules mortes et raviver l’éclat.' }
      ]
    },
    entretien: {
      titre: '🧹 Entretien & Maison',
      liste: [
        { titre: '1. Vinaigre blanc magique', texte: 'Utilisez du vinaigre blanc chaud pour détartrer robinets, bouilloires et surfaces vitrées de manière écologique.' },
        { titre: '2. Bicarbonate de soude', texte: 'Neutralisez les mauvaises odeurs du réfrigérateur ou des tapis en y saupoudrant un peu de bicarbonate.' },
        { titre: '3. Dépoussiérage méthodique', texte: 'Commencez toujours par nettoyer les surfaces en hauteur (étagères) avant de balayer ou aspirer le sol.' },
        { titre: '4. Entretien des canalisations', texte: 'Versez de l’eau bouillante mélangée à du bicarbonate et du vinaigre dans vos éviers une fois par mois pour éviter les bouchons.' },
        { titre: '5. Aération quotidienne', texte: 'Ouvrez vos fenêtres en grand pendant 10 minutes chaque matin pour renouveler l’air intérieur.' }
      ]
    },
    entrepreneuriat: {
      titre: '💼 Entrepreneuriat & Business',
      liste: [
        { titre: '1. Valider son MVP', texte: 'Testez toujours un prototype miniature ou une offre pilote auprès de vrais clients avant d’investir massivement.' },
        { titre: '2. Séparer les comptes', texte: 'Ne mélangez jamais vos finances personnelles et professionnelles pour garder une visibilité nette sur votre trésorerie.' },
        { titre: '3. Focus sur le client', texte: 'Résolvez un vrai problème douloureux pour vos clients ; c’est la clé numéro un de la pérennité commerciale.' },
        { titre: '4. Discipline et régularité', texte: 'La régularité dans l’effort et le marketing surpasse toujours les coups d’éclat isolés.' },
        { titre: '5. Réseautage actif', texte: 'Entourez-vous d’entrepreneurs inspirants et participez à des événements sectoriels pour élargir vos opportunités.' }
      ]
    },
    cuisine: {
      titre: '🍲 Cuisine & Gastronomie',
      liste: [
        { titre: '1. Mise en place', texte: 'Préparez et découpez tous vos ingrédients avant de commencer la cuisson pour cuisiner sereinement.' },
        { titre: '2. Assaisonnement progressif', texte: 'Salez et poivrez vos plats par petites touches en goûtant régulièrement plutôt qu’en fin de cuisson.' },
        { titre: '3. Conservation des herbes', texte: 'Enveloppez vos herbes fraîches dans un torchon légèrement humide pour les garder vertes plus longtemps.' },
        { titre: '4. Maîtrise des épices', texte: 'Faites revenir vos épices sèches quelques secondes dans l’huile chaude pour libérer tous leurs arômes.' },
        { titre: '5. Utilisation des restes', texte: 'Transformez vos restes de légumes en soupes savoureuses ou gratins gourmands pour éviter le gaspillage.' }
      ]
    },
    finances: {
      titre: '💰 Finances & Épargne',
      liste: [
        { titre: '1. Règle du 50/30/20', texte: 'Allouez 50% de vos revenus aux besoins essentiels, 30% aux envies et 20% à l’épargne ou investissement.' },
        { titre: '2. Épargne de précaution', texte: 'Constituez-vous une réserve équivalente à 3 ou 6 mois de dépenses pour faire face aux imprévus.' },
        { titre: '3. Suivi rigoureux des dépenses', texte: 'Notez chaque centime dépensé pendant un mois pour identifier et éliminer les fuites budgétaires superflues.' },
        { titre: '4. Éviter l’impulsion', texte: 'Attendez 48 heures avant de valider tout achat important non planifié.' },
        { titre: '5. Investir en soi', texte: 'Consacrez une partie de votre budget à l’apprentissage de nouvelles compétences à forte valeur ajoutée.' }
      ]
    },
    technologie: {
      titre: '💻 Technologie & Numérique',
      liste: [
        { titre: '1. Mises à jour régulières', texte: 'Installez toujours les derniers correctifs de sécurité sur vos téléphones et ordinateurs pour contrer les failles.' },
        { titre: '2. Sauvegardes cloud', texte: 'Automatisez la sauvegarde de vos fichiers importants sur le cloud ou un disque dur externe.' },
        { titre: '3. Mots de passe robustes', texte: 'Utilisez des mots de passe uniques combinant majuscules, chiffres et caractères spéciaux pour chaque compte.' },
        { titre: '4. Nettoyage du cache', texte: 'Videz régulièrement le cache de vos appareils pour libérer de l’espace et optimiser la vitesse d’exécution.' },
        { titre: '5. Double authentification (2FA)', texte: 'Activez la double authentification sur vos boîtes mail et réseaux sociaux pour une sécurité maximale.' }
      ]
    },
    sport: {
      titre: '⚽ Sport & Fitness',
      liste: [
        { titre: '1. Échauffement obligatoire', texte: 'Prenez 10 minutes pour mobiliser vos articulations avant chaque séance afin d’éviter les blessures.' },
        { titre: '2. Récupération et étirements', texte: 'Étirez vos muscles en fin de séance pour favoriser l’élimination des toxines et réduire les courbatures.' },
        { titre: '3. Régularité avant l’intensité', texte: 'Mieux vaut 3 séances modérées par semaine qu’un seul entraînement exténuant par mois.' },
        { titre: '4. Écouter son corps', texte: 'Sachez lever le pied en cas de douleur inhabituelle pour laisser le temps aux fibres musculaires de guérir.' },
        { titre: '5. Sommeil et reconstruction', texte: 'Le muscle se construit pendant le repos : veillez à bien dormir après un effort intense.' }
      ]
    },
    productivite: {
      titre: '⚡ Productivité & Organisation',
      liste: [
        { titre: '1. La méthode des 3 priorités', texte: 'Listez chaque matin les 3 tâches capitales à accomplir absolument dans la journée.' },
        { titre: '2. La technique Pomodoro', texte: 'Travaillez concentré pendant 25 minutes, puis accordez-vous 5 minutes de pause pour maintenir un focus maximal.' },
        { titre: '3. Traiter les e-mails par lots', texte: 'Consacrez des créneaux précis dans la journée pour consulter vos messages au lieu de les garder ouverts en continu.' },
        { titre: '4. Éliminer les distractions', texte: 'Mettez votre téléphone en mode silencieux et éloignez les notifications pendant vos sessions de travail intense.' },
        { titre: '5. Bilan du soir', texte: 'Prenez 5 minutes le soir pour planifier la journée du lendemain et vider votre esprit.' }
      ]
    }
  };

  const [messagesChat, setMessagesChat] = useState([
    { expediteur: 'bot', texte: '👋 Bienvenue sur l’assistant interactif 4TS Suite Manager ! Comment puis-je vous guider aujourd’hui ?' }
  ]);
  const [saisieMessage, setSaisieMessage] = useState('');
  const chatFinRef = useRef(null);

  const questionsSondage = [
    { id: 'pays', question: '🌍 1/5. Dans quel pays vous situez-vous ?', type: 'CHOIX', options: ['Cameroun', 'Côte d’Ivoire', 'Sénégal', 'France', 'Autre pays'] },
    { id: 'ville', question: '🏙️ 2/5. Dans quelle ville résidez-vous ?', type: 'LIBRE' },
    { id: 'activite', question: '💼 3/5. Quel est votre type d’activité principale ?', type: 'CHOIX', options: ['Commerce / Boutique', 'Livraison & Logistique', 'Services & Conseil', 'Agriculture / Autre'] },
    { id: 'module_prefere', question: '⭐ 4/5. Quel module préférez-vous ?', type: 'CHOIX', options: ['Module Boutique & Caisse', 'Module Livraison & Flotte', 'Module Tontine (Bientôt)', 'Module Logistique (Bientôt)'] },
    { id: 'amelioration_libre', question: '💡 5/5. Une suggestion ou amélioration ?', type: 'LIBRE' }
  ];

  const questionsDivertissement = [
    { id: 'genre_tranche', question: '👤 1/8. Tranche d’âge ?', type: 'CHOIX', options: ['Moins de 25 ans', '25 - 40 ans', '41 - 60 ans', 'Plus de 60 ans'] },
    { id: 'musique', question: '🎵 2/8. Style de musique favori ?', type: 'LIBRE' },
    { id: 'couleur', question: '🎨 3/8. Couleur préférée ?', type: 'CHOIX', options: ['🔴 Rouge & Noir (Le style 4TS !)', '🔵 Bleu Océan', '🟢 Vert Nature', '🟡 Or / Jaune éclatant'] },
    { id: 'plat', question: '🍲 4/8. Plat favori ?', type: 'LIBRE' }
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
      { expediteur: 'client', texte: '📊 Participer au Sondage & Profil' },
      { expediteur: 'bot', texte: `Formidable ! ${questionsSondage[0].question}`, options: questionsSondage[0].options }
    ]);
  };

  const lancerModeDivertissement = () => {
    setModeChat('DIVERTISSEMENT');
    setEtapeDivertissement(0);
    setResultatsDivertissement({});
    setMessagesChat((prev) => [
      ...prev,
      { expediteur: 'client', texte: '🎮 Quiz Divertissement & Détente' },
      { expediteur: 'bot', texte: `Super ! ${questionsDivertissement[0].question}`, options: questionsDivertissement[0].options }
    ]);
  };

  const lancerModeAstuces = () => {
    setModeChat('ASTUCES');
    const listeNomsCategories = Object.keys(categoriesAstuces).map((cle) => categoriesAstuces[cle].titre);
    setMessagesChat((prev) => [
      ...prev,
      { expediteur: 'client', texte: '💡 Découvrir les Astuces & Conseils' },
      { expediteur: 'bot', texte: '💡 **Bienvenue dans notre espace Astuces & Conseils riches et variés !** Choisissez une catégorie ci-dessous :', options: listeNomsCategories }
    ]);
  };

  const lancerModeSupport = () => {
    setModeChat('SUPPORT');
    setMessagesChat((prev) => [
      ...prev,
      { expediteur: 'client', texte: '❓ Poser une question sur les services' },
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
          setMessagesChat((prev) => [...prev, { expediteur: 'bot', texte: '🎉 **Merci infiniment !** Vos réponses ont été enregistrées avec succès.' }]);
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
          setMessagesChat((prev) => [...prev, { expediteur: 'bot', texte: '🌟 **Génial !** Quiz terminé avec succès.' }]);
        }, 600);
      }
    } else if (modeChat === 'ASTUCES') {
      setMessagesChat((prev) => [...prev, { expediteur: 'client', texte: texteSaisi }]);
      setTimeout(() => {
        setMessagesChat((prev) => [...prev, { expediteur: 'bot', texte: `💡 Astuce enregistrée. Choisissez une catégorie ou retournez au menu principal.` }]);
      }, 500);
    } else {
      setMessagesChat((prev) => [...prev, { expediteur: 'client', texte: texteSaisi }]);
      setTimeout(() => {
        let reponseBot = "Contactez notre service client par WhatsApp ou via le bouton d'appel en bas de page.";
        const texteMin = texteSaisi.toLowerCase();
        if (texteMin.includes('module') || texteMin.includes('service')) {
          reponseBot = "📦 **Nos modules :**\n1. Module Boutique & Caisse (✅)\n2. Module Livraison & Flotte (✅)\n3. Module Tontine & Épargne (En développement 🔒)\n4. Module Logistique Avancée (En développement 🔒)";
        } else if (texteMin.includes('prix') || texteMin.includes('tarif')) {
          reponseBot = "💰 Les options de diffusion publicitaire débutent à 300 XAF/jour avec des réductions de 5% et 10%.";
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
          setMessagesChat((prev) => [...prev, { expediteur: 'bot', texte: `Voici d'excellents conseils sélectionnés pour vous !` }]);
        }
      }, 600);
    }
  };

  // Compte Super Administrateur
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

  // --- FORMULAIRE DE CRÉATION D'ANNONCE ---
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

    if (jours >= 30) {
      reduction = 0.10; 
    } else if (jours >= 7) {
      reduction = 0.05; 
    }

    const totalFinal = Math.round(totalBrut * (1 - reduction));
    return { jours, totalBrut, reductionPercent: reduction * 100, totalFinal };
  };

  const infoTarif = calculerTarifAnnonce();

  const gererChangementVisuel = (e) => {
    const fichier = e.target.files[0];
    if (fichier) {
      const lecteur = new FileReader();
      lecteur.onloadend = () => {
        setVisuelPreview(lecteur.result);
      };
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

        if (!error && data && data.length > 0) {
          setBannières(data);
        }
      } catch (err) {
        console.error("Erreur chargement Supabase", err);
      }
    };
    chargerBannièresSupabase();
  }, []);

  useEffect(() => {
    if (estEnPause || bannières.length <= 1) return;
    const interval = setInterval(() => {
      setBanniereIndex((prev) => (prev + 1) % bannières.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [bannières.length, estEnPause]);

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

      const { error } = await supabase.from('bannieres').insert([nouvelleAnnonceDB]);
      if (error) throw error;

      alert(`✅ Annonce publiée avec succès ! Montant réglé : ${infoTarif.totalFinal} XAF.`);
      setModalAnnonceOuvert(false);
      window.location.reload();
    } catch (err) {
      console.error("Erreur enregistrement annonce", err);
      alert("Erreur lors de l'enregistrement de l'annonce dans Supabase.");
    }
  };

  // --- 4 MODULES COMPLETS DE L'ÉCOSYSTÈME ---
  const modulesFormation = [
    {
      id: 'boutique',
      nom: 'Module Boutique & Caisse',
      icone: '🛍️',
      statut: 'DISPONIBLE',
      description: 'Enregistrez vos ventes, gérez vos tickets de caisse, vos stocks et encaissez vos clients en toute simplicité.',
      tutorielTexte: `1. Accédez au menu Ventes / Boutique.\n2. Sélectionnez vos articles dans le catalogue ou scannez-les.\n3. Validez le mode de règlement et éditez le ticket.`
    },
    {
      id: 'livraison',
      nom: 'Module Livraison & Flotte',
      icone: '🛵',
      statut: 'DISPONIBLE',
      description: 'Gérez vos livreurs, planifiez les tournées, suivez les colis en route et validez les restitutions de fonds.',
      tutorielTexte: `1. Créez vos tournées de livraison et affectez les livreurs.\n2. Suivez les encaissements terrain en temps réel.`
    },
    {
      id: 'tontine',
      nom: 'Module Tontine & Épargne',
      icone: '🤝',
      statut: 'EN_DEVELOPPEMENT',
      description: 'Gestion des cotisations, tours de rôle et suivi de caisses d’épargne communautaires.',
      tutorielTexte: `Ce module fait actuellement l'objet d'un développement approfondi pour garantir une sécurité et une traçabilité irréprochables de vos cycles d'épargne. Bientôt disponible !`
    },
    {
      id: 'logistique',
      nom: 'Module Logistique Avancée',
      icone: '🚛',
      statut: 'EN_DEVELOPPEMENT',
      description: 'Optimisation des entrainements logistiques, transits inter-villes et gestion de flotte lourde.',
      tutorielTexte: `Le module Logistique Avancée intègre des algorithmes de routage et de gestion d'entrepôt complexes. Sortie prévue lors de la prochaine mise à jour majeure.`
    }
  ];

  const banniereActuelle = bannières[banniereIndex] || bannières[0];

  return (
    <div className="space-y-4 font-sans text-xs pb-16">
      
      {/* ================= 1. BANNIÈRE DÉFILANTE PRINCIPALE (EN HAUT) ================= */}
      <div 
        onMouseEnter={() => setEstEnPause(true)}
        onMouseLeave={() => setEstEnPause(false)}
        className="relative overflow-hidden rounded-2xl shadow-xl border border-slate-800 bg-slate-950 text-white p-6 transition-all duration-700 select-none cursor-grab"
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
            <span className="text-[9px] text-slate-300 font-bold italic">💡 Glissez ou touchez pour naviguer.</span>
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

      {/* ================= 2. SECTION CENTRE DE FORMATION - GUIDE DES MODULES ================= */}
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a href={liensReseauxSociaux.facebook} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-blue-50 transition">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black">f</div>
            <div>
              <h4 className="font-black text-slate-900 uppercase text-xs">Facebook</h4>
              <p className="text-[9px] text-slate-500 font-bold">Voir nos publications</p>
            </div>
          </a>
          <a href={liensReseauxSociaux.tiktok} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black">tk</div>
            <div>
              <h4 className="font-black text-slate-900 uppercase text-xs">TikTok</h4>
              <p className="text-[9px] text-slate-500 font-bold">Tutos express</p>
            </div>
          </a>
          <a href={liensReseauxSociaux.youtube} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-red-50 transition">
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-black">▶</div>
            <div>
              <h4 className="font-black text-slate-900 uppercase text-xs">YouTube</h4>
              <p className="text-[9px] text-slate-500 font-bold">Formations complètes</p>
            </div>
          </a>
        </div>
      </div>

      {/* ================= 3. SECTION DÉCOUVREZ NOS MODULES ================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">📚</span>
            <h3 className="font-black text-slate-900 uppercase text-xs">DÉCOUVREZ NOS MODULES</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

      {/* ================= 4. BANNIÈRE "BESOIN D'AIDE ? NOUS CONTACTER" (EN BAS DE PAGE) ================= */}
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-black text-slate-900 placeholder-slate-400 uppercase text-[10px]"
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
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium text-slate-900 placeholder-slate-400 text-[10px]"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Lien WhatsApp</label>
                  <input type="text" value={whatsappAnnonce} onChange={(e) => setWhatsappAnnonce(e.target.value)} placeholder="+237..." className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900 placeholder-slate-400 text-[10px]" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Lien Facebook</label>
                  <input type="url" value={facebookAnnonce} onChange={(e) => setFacebookAnnonce(e.target.value)} placeholder="https://facebook.com/..." className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900 placeholder-slate-400 text-[10px]" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Lien TikTok</label>
                  <input type="url" value={tiktokAnnonce} onChange={(e) => setTiktokAnnonce(e.target.value)} placeholder="https://tiktok.com/@..." className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900 placeholder-slate-400 text-[10px]" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Lien YouTube</label>
                  <input type="url" value={youtubeAnnonce} onChange={(e) => setYoutubeAnnonce(e.target.value)} placeholder="https://youtube.com/..." className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900 placeholder-slate-400 text-[10px]" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Visuel de l'annonce (Photo optionnelle)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={gererChangementVisuel}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-1.5 text-[9px] font-bold text-slate-900 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[9px] file:font-black file:bg-slate-800 file:text-white"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-700">⏱️ Choisir la durée de diffusion & Tarifs :</label>
                <select
                  value={dureeOption}
                  onChange={(e) => setDureeOption(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-[10px]"
                >
                  <option value="24">1 Jour (300 XAF)</option>
                  <option value="72">3 Jours (900 XAF)</option>
                  <option value="168">1 Semaine - 7 Jours (Remise 5% → 1 995 XAF)</option>
                  <option value="720">1 Mois - 30 Jours (Remise 10% → 8 100 XAF)</option>
                </select>

                <div className="flex justify-between items-center text-[10px] font-black pt-1 border-t border-slate-200">
                  <span className="text-slate-600">Montant total calculé :</span>
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

      {/* ================= MODALE CHATBOT (AVEC BOUTONS DE MENU PERSISTANTS ET RETOUR ACCUEIL) ================= */}
      {modalChatbotOuvert && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col h-[580px]">
            
            {/* Header du Chatbot avec bouton Retour Accueil */}
            <div className="bg-slate-900 text-white p-3.5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">🤖</span>
                <div>
                  <h4 className="font-black uppercase text-xs">Assistant Virtuel 4TS</h4>
                  <p className="text-[8.5px] text-slate-400 font-bold">Toujours à votre service</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={retournerAccueilChat}
                  title="Retour au menu principal"
                  className="bg-slate-800 hover:bg-orange-600 text-white font-black text-[9px] px-2.5 py-1 rounded-lg uppercase transition shadow-2xs border border-slate-700"
                >
                  🏠 Menu
                </button>
                <button onClick={() => setModalChatbotOuvert(false)} className="text-slate-400 hover:text-white font-bold p-1">✕</button>
              </div>
            </div>

            {/* Corps de la conversation */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-slate-50 text-[10px]">
              {messagesChat.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.expediteur === 'client' ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3 rounded-2xl whitespace-pre-line max-w-[90%] leading-relaxed ${msg.expediteur === 'client' ? 'bg-slate-900 text-white font-medium shadow-md' : 'bg-white text-slate-800 border border-slate-200 shadow-2xs'}`}>
                    {msg.texte}
                  </div>
                  {msg.options && (
                    <div className="flex flex-col gap-1.5 mt-2.5 w-full pl-2">
                      {msg.options.map((opt, i) => (
                        <button key={i} onClick={() => selectionnerOptionChoix(opt)} className="bg-slate-900 hover:bg-orange-600 text-white p-2.5 rounded-xl text-left font-bold transition shadow-2xs flex items-center gap-2">
                          <span>👉</span> <span>{opt}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatFinRef} />
            </div>

            {/* Barre de menu permanente en bas (Sondage, Quiz, Astuces, Support) */}
            <div className="px-3 py-2 bg-slate-100 border-t border-slate-200 flex gap-1.5 justify-around shrink-0 flex-wrap shadow-inner">
              <button onClick={lancerModeSondage} className="flex-1 bg-slate-900 hover:bg-orange-600 text-white py-2 px-1 rounded-xl text-[8px] uppercase font-black transition shadow-2xs">📊 Sondage</button>
              <button onClick={lancerModeDivertissement} className="flex-1 bg-slate-900 hover:bg-orange-600 text-white py-2 px-1 rounded-xl text-[8px] uppercase font-black transition shadow-2xs">🎮 Quiz</button>
              <button onClick={lancerModeAstuces} className="flex-1 bg-slate-900 hover:bg-orange-600 text-white py-2 px-1 rounded-xl text-[8px] uppercase font-black transition shadow-2xs">💡 Astuces</button>
              <button onClick={lancerModeSupport} className="flex-1 bg-slate-900 hover:bg-orange-600 text-white py-2 px-1 rounded-xl text-[8px] uppercase font-black transition shadow-2xs">❓ Support</button>
            </div>

            {/* Formulaire de saisie de message */}
            <form onSubmit={soumettreReponseChat} className="p-3 bg-white border-t border-slate-200 flex gap-2 shrink-0">
              <input
                type="text"
                value={saisieMessage}
                onChange={(e) => setSaisieMessage(e.target.value)}
                placeholder="Posez votre question ici..."
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-[10px] font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-orange-500"
              />
              <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase shadow-md transition">
                Envoyer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODALE CONFIGURATION DES CONTACTS & RÉSEAUX ================= */}
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
              <div>
                <label className="block font-bold text-slate-700 mb-1">Lien Instagram</label>
                <input type="url" value={instaInput} onChange={(e) => setInstaInput(e.target.value)} placeholder="https://instagram.com/..." className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-[10px]" />
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