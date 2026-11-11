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

  // --- ÉTATS POUR LE CHATBOT (SONDAGE, DIVERTISSEMENT, SUPPORT & ASTUCES) ---
  const [modeChat, setModeChat] = useState('ACCUEIL'); 
  const [etapeSondage, setEtapeSondage] = useState(0);
  const [resultatsSondage, setResultatsSondage] = useState({});
  
  const [etapeDivertissement, setEtapeDivertissement] = useState(0);
  const [resultatsDivertissement, setResultatsDivertissement] = useState({});

  // Base complète des astuces structurées par catégorie
  const categoriesAstuces = {
    santé: {
      titre: '🩺 Astuces Santé & Bien-être',
      liste: [
        { titre: '1. Entretien des cheveux au naturel', texte: 'Lavez vos cheveux avec de l’eau tiède (pas trop chaude), faites des bains d’huile végétale (coco, ricin ou karité) une fois par semaine et évitez les coiffures trop serrées qui cassent la fibre capillaire.' },
        { titre: '2. Hygiène dentaire irréprochable', texte: 'Brossez vos dents pendant au moins 2 minutes après chaque repas, utilisez du fil dentaire chaque soir pour éliminer la plaque entre les dents et renouvelez votre brosse à dents tous les 3 mois.' },
        { titre: '3. Activités sportives quotidiennes', texte: 'Pratiquez au moins 30 minutes de marche rapide par jour, faites du cardio 2 fois par semaine (course, corde à sauter) et intégrez des exercices de gainage pour renforcer votre dos.' },
        { titre: '4. Prévention des maladies cardiovasculaires', texte: 'Réduisez votre consommation de sel et de graisses saturées, mangez des poissons riches en oméga-3 (maquereau, sardine) et évitez le tabac ainsi que la sédentarité prolongée.' },
        { titre: '5. Apaiser les règles douloureuses', texte: 'Appliquez une bouillote chaude sur le bas-ventre, buvez des infusions de gingembre ou de camomille aux propriétés anti-inflammatoires, et pratiquez des respirations profondes.' },
        { titre: '6. Éviter les odeurs vaginales et intimes', texte: 'Privilégiez des sous-vêtements en coton respirant, évitez les douches vaginales agressives qui détruisent la flore intime, et lavez la zone externe uniquement avec un savon doux adapté.' },
        { titre: '7. Nettoyage et soin des aisselles', texte: 'Lavez vos aisselles avec un savon antibactérien, séchez bien la zone après la douche, et utilisez de préférence des déodorants naturels à base de pierre d’alun pour laisser la peau respirer.' },
        { titre: '8. Techniques d’épilation douce', texte: 'Exfoliez votre peau 48h avant l’épilation pour éviter les poils incarnés, hydratez abondamment la zone épilée avec du gel d’aloe vera pur pour apaiser les rougeurs.' },
        { titre: '9. Prévention efficace du diabète', texte: 'Limitez drastiquement les boissons sucrées et les aliments ultra-transformés, consommez des fibres en abondance (légumes verts, céréales complètes) et maintenez un poids stable.' },
        { titre: '10. Prévention et protection contre le paludisme', texte: 'Dormez toujours sous une moustiquaire imprégnée d’insecticide, éliminez les eaux stagnantes autour de votre habitation et utilisez des répulsifs cutanés aux heures de crépuscule.' }
      ]
    },
    entrepreneuriat: {
      titre: '💼 Astuces Entrepreneuriat & Business',
      liste: [
        { titre: '1. Valider son idée de projet avant de lancer', texte: 'Parlez de votre idée à de futurs clients potentiels, analysez la concurrence et testez un prototype miniature (MVP) pour valider qu’il y a un vrai besoin solvable sur le marché.' },
        { titre: '2. Gérer sa trésorerie d’une main de fer', texte: 'Séparez toujours vos comptes personnels et professionnels. Ne confondez jamais le chiffre d’affaires encaissé avec le bénéfice net disponible.' },
        { titre: '3. Digitaliser sa prospection commerciale', texte: 'Utilisez les réseaux sociaux (Facebook, TikTok, LinkedIn) pour créer du contenu de valeur, montrer vos coulisses et attirer des clients qualifiés de façon organique.' },
        { titre: '4. Soigner la relation client', texte: 'Un client satisfait en parle à deux personnes ; un client mécontent en parle à dix. Répondez rapidement aux requêtes et offrez toujours un service après-vente irréprochable.' },
        { titre: '5. La discipline sur la motivation', texte: 'La motivation va et vient, seule la discipline quotidienne vous permettra d’atteindre vos objectifs fixés, même les jours où l’énergie est basse.' },
        { titre: '6. S’entourer des bonnes personnes', texte: 'Intégrez des réseaux d’entrepreneurs, trouvez des mentors expérimentés et déléguez les tâches subalternes pour vous concentrer sur la stratégie à forte valeur ajoutée.' },
        { titre: '7. Fixer des objectifs mesurables (SMART)', texte: 'Définissez des objectifs Spécifiques, Mesurables, Atteignables, Réalistes et Temporellement définis pour chaque trimestre d’activité.' },
        { titre: '8. Innover et s’adapter en permanence', texte: 'Restez à l’écoute des évolutions technologiques et des nouvelles attentes de vos consommateurs pour ajuster rapidement vos offres de services.' },
        { titre: '9. Créer des sources de revenus récurrents', texte: 'Privilégiez les modèles d’abonnements ou de fidélisation mensuelle qui sécurisent la trésorerie prévisionnelle de votre entreprise.' },
        { titre: '10. Investir dans sa propre formation', texte: 'Consacrez chaque mois du temps pour lire des livres de gestion, suivre des masterclasses et perfectionner vos compétences en leadership et négociation.' }
      ]
    },
    beauté: {
      titre: '💄 Astuces Beauté & Soins',
      liste: [
        { titre: '1. Hydratation quotidienne du visage', texte: 'Buvez au moins 1,5 à 2 litres d’eau par jour et appliquez une crème hydratante adaptée à votre type de peau matin et soir sur une peau propre.' },
        { titre: '2. Gommage corporel naturel', texte: 'Réalisé à base de marc de café et d’huile de coco, il élimine en douceur les cellules mortes et redonne éclat et douceur à votre peau.' },
        { titre: '3. Protection solaire indispensable', texte: 'Même sous les climats tropicaux ou nuageux, les UV traversent les nuages. Appliquez une protection solaire pour prévenir le vieillissement prématuré de la peau.' },
        { titre: '4. Soin des lèvres gercées', texte: 'Faites un léger gommage avec du miel et du sucre fin, puis nourrissez vos lèvres avec du beurre de cacao ou du beurre de karité pur avant de dormir.' },
        { titre: '5. Réduire les cernes et poches', texte: 'Appliquez des rondelles de concombre frais ou des sachets de thé vert infusés et refroidis sur vos yeux pendant 10 minutes pour décongestionner le regard.' },
        { titre: '6. Entretien des ongles forts', texte: 'Trempez vos ongles dans un bol d’huile d’olive tiède additionnée de quelques gouttes de jus de citron pendant 5 minutes deux fois par semaine.' },
        { titre: '7. Démaquillage obligatoire le soir', texte: 'Ne vous couchez jamais maquillée : les pores obstrués favorisent l’apparition des boutons et accélèrent le vieillissement cutané.' },
        { titre: '8. Masque purifiant à l’argile', texte: 'Appliquez un masque à l’argile verte (pour peaux grasses) ou blanche (pour peaux sensibles) une fois par semaine pour purifier en profondeur.' },
        { titre: '9. Sublimer son regard naturellement', texte: 'Appliquez une touche d’huile de ricin sur vos cils et sourcils le soir avant de dormir pour stimuler leur pousse et leur épaisseur.' },
        { titre: '10. Sommeil réparateur et éclat du teint', texte: 'Le sommeil est le meilleur cosmétique naturel. Dormez 7 à 8 heures par nuit pour permettre à vos cellules cutanées de se régénérer efficacement.' }
      ]
    },
    éducation: {
      titre: '📚 Astuces Éducation & Apprentissage',
      liste: [
        { titre: '1. La technique de mémorisation active', texte: 'Pour retenir un cours ou une information, lisez-le, puis fermez le support et essayez de le réexpliquer à voix haute avec vos propres mots.' },
        { titre: '2. Planifier ses sessions d’étude (Pomodoro)', texte: 'Travaillez ou étudiez de manière ultra-concentrée pendant 25 minutes, puis accordez-vous 5 minutes de pause pour maintenir votre cerveau performant.' },
        { titre: '3. La lecture rapide et efficace', texte: 'Avant de lire un livre en entier, lisez la table des matières, l’introduction et la conclusion pour avoir une vision globale de la structure.' },
        { titre: '4. Apprendre une nouvelle langue', texte: 'Immergez-vous au quotidien : écoutez des podcasts, changez la langue de votre téléphone et apprenez 5 nouveaux mots de vocabulaire par jour.' },
        { titre: '5. Créer des fiches de synthèse', texte: 'Condensez vos leçons sur des cartes mémo (flashcards). C’est redoutable pour stimuler la mémoire visuelle et les révisions express.' },
        { titre: '6. Éliminer les distractions numériques', texte: 'Éloignez votre téléphone et coupez les notifications des réseaux sociaux lorsque vous apprenez ou lisez un livre important.' },
        { titre: '7. Pratiquer la répétition espacée', texte: 'Révisez une nouvelle notion après 1 jour, puis 3 jours, puis 1 semaine et 1 mois pour ancrer l’information durablement dans votre mémoire à long terme.' },
        { titre: '8. Stimuler sa curiosité intellectuelle', texte: 'Lisez des documentaires, écoutez des conférences inspirantes et posez-vous des questions sur le "pourquoi" et le "comment" des choses.' },
        { titre: '9. Cultiver la pensée critique', texte: 'Ne prenez jamais une information pour argent comptant : croisez toujours vos sources avant de vous faire un avis définitif.' },
        { titre: '10. Transmettre ce qu’on apprend', texte: 'La meilleure façon de maîtriser un sujet est de l’enseigner ou de l’expliquer à un débutant. Cela met en lumière vos lacunes éventuelles.' }
      ]
    },
    voyage: {
      titre: '✈️ Astuces Voyage & Déplacement',
      liste: [
        { titre: '1. Organiser ses bagages en mode "Rolling"', texte: 'Roulez vos vêtements au lieu de les plier : cela gagne un espace considérable dans la valise et évite les faux plis.' },
        { titre: '2. Sauvegarder ses documents importants', texte: 'Scannez votre passeport, vos billets et vos réservations et envoyez-les dans votre boîte mail ou sur le cloud pour y accéder même sans téléphone.' },
        { titre: '3. Préparer une trousse de premiers secours', texte: 'Emportez toujours des antalgiques, des pansements, du désinfectant et vos médicaments personnels de première nécessité.' },
        { titre: '4. Économiser sur les frais de change', texte: 'Renseignez-vous sur les taux de change à l’avance et évitez de changer de grosses sommes d’argent directement dans les aéroports.' },
        { titre: '5. Rester hydraté pendant les longs trajets', texte: 'Emportez une gourde vide que vous remplirez après les contrôles de sécurité. L’air climatisé des avions et bus déshydrate rapidement.' },
        { titre: '6. Voyager léger (Light Travel)', texte: 'N’emportez que le strict nécessaire. Prévoyez des vêtements modulables et faciles à laver sur place.' },
        { titre: '7. Protéger ses appareils électroniques', texte: 'Gardez toujours vos objets de valeur (ordinateur, passeport, chargeurs, argent) dans votre sac à dos cabine.' },
        { titre: '8. S’informer sur les coutumes locales', texte: 'Renseignez-vous sur les us et coutumes, les règles de politesse et les lois du pays visité pour éviter tout impaire culturel.' },
        { titre: '9. Télécharger des cartes hors-ligne', texte: 'Téléchargez les cartes de votre destination sur Google Maps ou Maps.me pour vous orienter même sans connexion internet.' },
        { titre: '10. Garder des contacts d’urgence sur soi', texte: 'Notez sur un papier dans votre portefeuille les numéros d’urgence locaux et les coordonnées de votre ambassade.' }
      ]
    },
    alimentaires: {
      titre: '🥗 Astuces Alimentaires & Nutrition',
      liste: [
        { titre: '1. Manger des produits de saison', texte: 'Les fruits et légumes de saison sont plus riches en nutriments, ont meilleur goût et coûtent généralement beaucoup moins cher.' },
        { titre: '2. Bien associer ses aliments', texte: 'Associez des aliments riches en vitamine C (citron, persil) avec des sources de fer végétal pour multiplier par trois son absorption par l’organisme.' },
        { titre: '3. Pratiquer une hydratation intelligente', texte: 'Buvez un grand verre d’eau tiède dès le réveil pour stimuler votre métabolisme et relancer le système digestif.' },
        { titre: '4. Réduire les sucres cachés', texte: 'Lisez attentivement les étiquettes nutritionnelles des produits industriels : le sucre se cache sous de multiples noms (sirop de glucose, fructose, maltose).' },
        { titre: '5. Mâcher lentement ses aliments', texte: 'Prenez le temps de mâcher chaque bouchée au moins 15 à 20 fois. Cela facilite grandement la digestion et procure une sensation de satiété rapide.' },
        { titre: '6. Consommer des épices aux vertus santé', texte: 'Intégrez du curcuma, du gingembre, de l’ail et de la cannelle dans vos plats : ce sont de puissants anti-inflammatoires naturels.' },
        { titre: '7. Éviter le gaspillage alimentaire', texte: 'Planifiez vos menus de la semaine avant d’aller faire vos courses pour n’acheter que ce dont vous avez réellement besoin.' },
        { titre: '8. Privilégier les cuissons douces', texte: 'Préférez la cuisson à la vapeur ou à l’étouffée plutôt que la friture excessive pour préserver toutes les vitamines des aliments.' },
        { titre: '9. Faire le plein d’antioxydants', texte: 'Consommez régulièrement des baies, du thé vert, des légumes colorés pour lutter contre le vieillissement cellulaire prématuré.' },
        { titre: '10. Équilibre de l’assiette type', texte: 'Composez votre assiette avec 50% de légumes, 25% de protéines de qualité et 25% de glucides complexes (igname, riz complet, patate douce).' }
      ]
    }
  };

  const [categorieSelectionnee, setCategorieSelectionnee] = useState(null);
  const [astuceActive, setAstuceActive] = useState(null);

  const [messagesChat, setMessagesChat] = useState([
    { expediteur: 'bot', texte: '👋 Bienvenue sur l’assistant interactif 4TS Suite Manager ! Comment puis-je vous guider aujourd’hui ?' }
  ]);
  const [saisieMessage, setSaisieMessage] = useState('');
  const chatFinRef = useRef(null);

  const questionsSondage = [
    {
      id: 'pays',
      question: '🌍 1/5. Pour commencer, dans quel pays vous situez-vous ?',
      type: 'CHOIX',
      options: ['Cameroun', 'Côte d’Ivoire', 'Sénégal', 'France', 'Autre pays']
    },
    {
      id: 'ville',
      question: '🏙️ 2/5. Dans quelle ville résidez-vous ? (Écrivez votre ville)',
      type: 'LIBRE'
    },
    {
      id: 'activite',
      question: '💼 3/5. Quel est votre type d’activité principale ?',
      type: 'CHOIX',
      options: ['Commerce / Boutique', 'Livraison & Logistique', 'Services & Conseil', 'Agriculture / Autre']
    },
    {
      id: 'module_prefere',
      question: '⭐ 4/5. Quel module de 4TS Suite Manager préférez-vous ?',
      type: 'CHOIX',
      options: ['Module Boutique & Caisse', 'Module Livraison & Flotte', 'Module Tontine (Bientôt)', 'Module Logistique (Bientôt)']
    },
    {
      id: 'amelioration_libre',
      question: '💡 5/5. Avez-vous une suggestion précise ou une amélioration à nous suggérer ? (Écrivez votre avis)',
      type: 'LIBRE'
    }
  ];

  const questionsDivertissement = [
    {
      id: 'genre_tranche',
      question: '👤 1/8. Pouvez-vous nous indiquer votre tranche d’âge et profil ?',
      type: 'CHOIX',
      options: ['Moins de 25 ans', '25 - 40 ans', '41 - 60 ans', 'Plus de 60 ans']
    },
    {
      id: 'musique',
      question: '🎵 2/8. Quel est votre style de musique ou artiste favori ?',
      type: 'LIBRE'
    },
    {
      id: 'couleur',
      question: '🎨 3/8. Quelle est votre couleur préférée ?',
      type: 'CHOIX',
      options: ['🔴 Rouge & Noir (Le style 4TS !)', '🔵 Bleu Océan', '🟢 Vert Nature', '🟡 Or / Jaune éclatant']
    },
    {
      id: 'plat',
      question: '🍲 4/8. Quel est votre plat ou repas favori ? (Ex: Couscous sauce Gombo, Poulet DG...)',
      type: 'LIBRE'
    },
    {
      id: 'hobbies',
      question: '🎯 5/8. Quels sont vos hobbies et temps de loisirs favoris ?',
      type: 'CHOIX',
      options: ['Lecture & Apprentissage', 'Sport & Fitness', 'Musique & Cinéma', 'Entrepreneuriat & Tech']
    },
    {
      id: 'profession',
      question: '👔 6/8. Quelle est votre profession exacte ?',
      type: 'LIBRE'
    },
    {
      id: 'cinema',
      question: '🎬 7/8. Êtes-vous amateur de cinéma ou de séries ?',
      type: 'CHOIX',
      options: ['Oh oui, grand fan !', 'De temps en temps', 'Plutôt documentaires & business', 'Pas du tout']
    },
    {
      id: 'citation',
      question: '✨ 8/8. Un petit mot ou une citation qui vous motive au quotidien ?',
      type: 'LIBRE'
    }
  ];

  useEffect(() => {
    if (modalChatbotOuvert) {
      chatFinRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messagesChat, modalChatbotOuvert]);

  const lancerModeSondage = () => {
    setModeChat('SONDAGE');
    setEtapeSondage(0);
    setResultatsSondage({});
    setMessagesChat((prev) => [
      ...prev,
      { expediteur: 'client', texte: '📊 Participer au Sondage & Profil' },
      { expediteur: 'bot', texte: `Formidable ! Ce sondage rapide nous aide à mieux vous connaître et à adapter 4TS Suite Manager.\n\n${questionsSondage[0].question}`, options: questionsSondage[0].options }
    ]);
  };

  const lancerModeDivertissement = () => {
    setModeChat('DIVERTISSEMENT');
    setEtapeDivertissement(0);
    setResultatsDivertissement({});
    setMessagesChat((prev) => [
      ...prev,
      { expediteur: 'client', texte: '🎮 Quiz Divertissement & Détente' },
      { expediteur: 'bot', texte: `Super ! Détendons-nous un instant avec quelques questions fun sur vos goûts et passions 🚀\n\n${questionsDivertissement[0].question}`, options: questionsDivertissement[0].options }
    ]);
  };

  const lancerModeAstuces = () => {
    setModeChat('ASTUCES');
    setCategorieSelectionnee(null);
    setAstuceActive(null);
    setMessagesChat((prev) => [
      ...prev,
      { expediteur: 'client', texte: '💡 Découvrir les Astuces & Conseils' },
      { expediteur: 'bot', texte: '💡 **Bienvenue dans notre espace Astuces & Conseils !** Choisissez une catégorie ci-dessous pour explorer nos recommandations pratiques et utiles :' }
    ]);
  };

  const lancerModeSupport = () => {
    setModeChat('SUPPORT');
    setMessagesChat((prev) => [
      ...prev,
      { expediteur: 'client', texte: '❓ Poser une question sur les services' },
      { expediteur: 'bot', texte: 'Posez votre question sur nos services (ex: "Quels sont vos modules ?", "Tarifs", "Boutique", "Livraison"). Je vous réponds instantanément !' }
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
          setMessagesChat((prev) => [
            ...prev,
            { expediteur: 'bot', texte: questionsSondage[prochaineEtape].question, options: questionsSondage[prochaineEtape].options }
          ]);
        }, 600);
      } else {
        setModeChat('ACCUEIL');
        setTimeout(() => {
          setMessagesChat((prev) => [
            ...prev,
            { expediteur: 'bot', texte: '🎉 **Merci infiniment !** Vos réponses au sondage ont été enregistrées avec succès.\n\nQue souhaitez-vous faire d’autre ?' }
          ]);
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
          setMessagesChat((prev) => [
            ...prev,
            { expediteur: 'bot', texte: questionsDivertissement[prochaineEtape].question, options: questionsDivertissement[prochaineEtape].options }
          ]);
        }, 600);
      } else {
        setModeChat('ACCUEIL');
        setTimeout(() => {
          setMessagesChat((prev) => [
            ...prev,
            { expediteur: 'bot', texte: '🌟 **Génial !** Quiz terminé avec succès. Merci pour ce moment de partage !\n\nQue souhaitez-vous faire maintenant ?' }
          ]);
        }, 600);
      }
    } else {
      setMessagesChat((prev) => [...prev, { expediteur: 'client', texte: texteSaisi }]);

      setTimeout(() => {
        let reponseBot = "Je n'ai pas bien compris. N'hésitez pas à contacter directement notre service client par WhatsApp ou via le bouton d'appel.";
        const texteMin = texteSaisi.toLowerCase();

        if (texteMin.includes('module') || texteMin.includes('service') || texteMin.includes('offrez')) {
          reponseBot = "📦 **Nos modules 4TS Suite Manager :**\n1. **Module Boutique & Caisse** (Disponible ✅)\n2. **Module Livraison & Flotte** (Disponible ✅)\n3. **Module Tontine & Épargne** (En développement 🔒)\n4. **Module Logistique Avancée** (En développement 🔒)";
        } else if (texteMin.includes('prix') || texteMin.includes('tarif') || texteMin.includes('abonnement')) {
          reponseBot = "💰 Nos options de diffusion publicitaire débutent à 300 XAF/jour avec des réductions de 5% et 10%. Contactez notre équipe commerciale pour les licences logicielles.";
        } else if (texteMin.includes('boutique')) {
          reponseBot = "🛍️ Le module Boutique permet d'encaisser, d'éditer les tickets de caisse et de suivre vos stocks en temps réel.";
        } else if (texteMin.includes('livraison')) {
          reponseBot = "🛵 Le module Livraison permet d'affecter vos livreurs et de suivre les tournées de colis.";
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
          setMessagesChat((prev) => [
            ...prev,
            { expediteur: 'bot', texte: questionsSondage[prochaineEtape].question, options: questionsSondage[prochaineEtape].options }
          ]);
        }, 600);
      } else {
        setModeChat('ACCUEIL');
        setTimeout(() => {
          setMessagesChat((prev) => [
            ...prev,
            { expediteur: 'bot', texte: '🎉 **Merci infiniment !** Vos réponses au sondage ont été enregistrées avec succès.\n\nPuis-je vous renseigner sur autre chose ?' }
          ]);
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
          setMessagesChat((prev) => [
            ...prev,
            { expediteur: 'bot', texte: questionsDivertissement[prochaineEtape].question, options: questionsDivertissement[prochaineEtape].options }
          ]);
        }, 600);
      } else {
        setModeChat('ACCUEIL');
        setTimeout(() => {
          setMessagesChat((prev) => [
            ...prev,
            { expediteur: 'bot', texte: '🌟 **Génial !** Quiz terminé avec succès. Merci pour ce moment de partage !\n\nQue souhaitez-vous faire maintenant ?' }
          ]);
        }, 600);
      }
    }
  };
  
  // Vérification du compte Super Administrateur
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
        try {
          setLiensReseauxSociaux(JSON.parse(liensSauves));
        } catch (e) {
          console.error("Erreur lecture liens réseaux", e);
        }
      }
    }
  }, []);

  const [fbInput, setFbInput] = useState(liensReseauxSociaux.facebook);
  const [tkInput, setTkInput] = useState(liensReseauxSociaux.tiktok);
  const [ytInput, setYtInput] = useState(liensReseauxSociaux.youtube);
  const [instaInput, setInstaInput] = useState(liensReseauxSociaux.instagram);
  const [waInput, setWaInput] = useState(liensReseauxSociaux.whatsapp);
  const [telInput, setTelInput] = useState(liensReseauxSociaux.telephone || '+237600000000');

  const ouvrirAdminReseaux = () => {
    setFbInput(liensReseauxSociaux.facebook);
    setTkInput(liensReseauxSociaux.tiktok);
    setYtInput(liensReseauxSociaux.youtube);
    setInstaInput(liensReseauxSociaux.instagram);
    setWaInput(liensReseauxSociaux.whatsapp);
    setTelInput(liensReseauxSociaux.telephone || '+237600000000');
    setModalAdminReseauxOuvert(true);
  };

  const sauvegarderLiensReseaux = (e) => {
    e.preventDefault();
    const nouveauxLiens = {
      ...liensReseauxSociaux,
      facebook: fbInput,
      tiktok: tkInput,
      youtube: ytInput,
      instagram: instaInput,
      whatsapp: waInput,
      telephone: telInput
    };
    setLiensReseauxSociaux(nouveauxLiens);
    if (typeof window !== 'undefined') {
      localStorage.setItem('4ts_reseaux_sociaux_officiels', JSON.stringify(nouveauxLiens));
    }
    alert("✅ Paramètres et contacts du service client mis à jour avec succès !");
    setModalAdminReseauxOuvert(false);
  };

  const [annonceIdEnCoursDeModif, setAnnonceIdEnCoursDeModif] = useState(null);
  const [titreAnnonce, setTitreAnnonce] = useState('');
  const [descAnnonce, setDescAnnonce] = useState('');
  const [whatsappAnnonce, setWhatsappAnnonce] = useState('');
  const [facebookAnnonce, setFacebookAnnonce] = useState('');
  const [tiktokAnnonce, setTiktokAnnonce] = useState('');
  const [youtubeAnnonce, setYoutubeAnnonce] = useState('');
  const [instagramAnnonce, setInstagramAnnonce] = useState('');
  const [dureeHeures, setDureeHeures] = useState('24');
  const [visuelFichier, setVisuelFichier] = useState(null);
  const [visuelPreview, setVisuelPreview] = useState(null);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // --- GESTION PERSISTANTE DES ANNONCES (LOCALSTORAGE) ---
  const [bannières, setBannières] = useState([
    {
      id: 1,
      type: 'ECOSYSTEME',
      titre: '🚀 4TS SUITE MANAGER : VOTRE ÉCOSYSTÈME GLOBAL',
      description: 'Pilotez l’ensemble de vos activités grâce à une suite complète : Module Boutique, Module Livraison, Module Logistique et Module Tontine intégrés.',
      couleur: 'from-slate-900 via-red-950 to-slate-950',
      badge: 'PROMO OFFICIELLE',
      modifiable: false
    },
    {
      id: 2,
      type: 'ACADEMY',
      titre: '🎓 4TS ACADEMY : REJOIGNEZ NOS RÉSEAUX',
      description: 'Suivez nos démonstrations en direct, astuces business et formations vidéo sur nos différentes plateformes officielles.',
      couleur: 'from-blue-950 via-slate-900 to-indigo-950',
      badge: 'RÉSEAUX SOCIAUX',
      contientReseaux: true,
      modifiable: false
    },
    {
      id: 3,
      type: 'ANNONCE',
      titre: '📦 ISMA LOGISTIQUE & SERVICES',
      description: 'Besoin d’expédier vos colis et de gérer vos tournées en toute sérénité à Yaoundé et Douala ? Contactez-nous !',
      couleur: 'from-red-900 to-slate-950',
      badge: 'ANNONCE PARTENAIRE',
      whatsapp: '+237600000000',
      facebook: 'https://www.facebook.com',
      modifiable: false
    }
  ]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const annoncesSauvegardées = localStorage.getItem('4ts_bannieres_annonces_persistantes');
      if (annoncesSauvegardées) {
        try {
          const parsed = JSON.parse(annoncesSauvegardées);
          const maintenant = Date.now();
          const valides = parsed.filter(item => !item.expireAt || item.expireAt > maintenant);
          setBannières(valides);
        } catch (e) {
          console.error("Erreur chargement annonces", e);
        }
      }
    }
  }, []);

  const sauvegarderBannièresStorage = (nouvellesBannières) => {
    setBannières(nouvellesBannières);
    if (typeof window !== 'undefined') {
      localStorage.setItem('4ts_bannieres_annonces_persistantes', JSON.stringify(nouvellesBannières));
    }
  };

  useEffect(() => {
    if (estEnPause) return;
    const interval = setInterval(() => {
      setBanniereIndex((prev) => (prev + 1) % bannières.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [bannières.length, estEnPause]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches ? e.touches[0].clientX : e.clientX;
    setEstEnPause(true);
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches ? e.touches[0].clientX : e.clientX;
  };

  const handleTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current;
    const seuilSwipe = 50;

    if (distance > seuilSwipe) {
      setBanniereIndex((prev) => (prev + 1) % bannières.length);
    } else if (distance < -seuilSwipe) {
      setBanniereIndex((prev) => (prev - 1 + bannières.length) % bannières.length);
    }
    setEstEnPause(false);
  };

  const gererChangementVisuel = (e) => {
    const fichier = e.target.files[0];
    if (fichier) {
      setVisuelFichier(fichier);
      setVisuelPreview(URL.createObjectURL(fichier));
    }
  };

  const ouvrirModalCreation = () => {
    setAnnonceIdEnCoursDeModif(null);
    setTitreAnnonce('');
    setDescAnnonce('');
    setWhatsappAnnonce('');
    setFacebookAnnonce('');
    setTiktokAnnonce('');
    setYoutubeAnnonce('');
    setInstagramAnnonce('');
    setDureeHeures('24');
    setVisuelFichier(null);
    setVisuelPreview(null);
    setModalAnnonceOuvert(true);
  };

  const ouvrirModalModification = (banniere) => {
    setAnnonceIdEnCoursDeModif(banniere.id);
    setTitreAnnonce(banniere.titre || '');
    setDescAnnonce(banniere.description || '');
    setWhatsappAnnonce(banniere.whatsapp || '');
    setFacebookAnnonce(banniere.facebook || '');
    setTiktokAnnonce(banniere.tiktok || '');
    setYoutubeAnnonce(banniere.youtube || '');
    setInstagramAnnonce(banniere.instagram || '');
    setVisuelPreview(banniere.visuel || null);
    setModalAnnonceOuvert(true);
  };

  const soumettreAnnonce = (e) => {
    e.preventDefault();
    if (!titreAnnonce || !descAnnonce) {
      alert('Veuillez remplir au moins le titre et la description de l’annonce.');
      return;
    }

    const expirationMS = parseInt(dureeHeures) * 3600 * 1000;
    const expireAt = Date.now() + expirationMS;

    if (annonceIdEnCoursDeModif) {
      const misesAJour = bannières.map((item) =>
        item.id === annonceIdEnCoursDeModif
          ? {
              ...item,
              titre: titreAnnonce,
              description: descAnnonce,
              whatsapp: whatsappAnnonce,
              facebook: facebookAnnonce,
              tiktok: tiktokAnnonce,
              youtube: youtubeAnnonce,
              instagram: instagramAnnonce,
              visuel: visuelPreview,
              expireAt
            }
          : item
      );
      sauvegarderBannièresStorage(misesAJour);
      alert(`✏️ Annonce modifiée et enregistrée avec succès !`);
    } else {
      const nouvelleBanniere = {
        id: Date.now(),
        type: 'ANNONCE_PERSO',
        titre: titreAnnonce,
        description: descAnnonce,
        whatsapp: whatsappAnnonce,
        facebook: facebookAnnonce,
        tiktok: tiktokAnnonce,
        youtube: youtubeAnnonce,
        instagram: instagramAnnonce,
        couleur: 'from-amber-950 via-slate-900 to-red-950',
        badge: 'ANNONCE PERSONNELLE',
        visuel: visuelPreview,
        modifiable: true,
        expireAt
      };

      sauvegarderBannièresStorage([nouvelleBanniere, ...bannières]);
      setBanniereIndex(0);
      alert(`✅ Annonce créée et diffusée pour une durée de ${dureeHeures}h !`);
    }

    setModalAnnonceOuvert(false);
  };

  const modulesFormation = [
    {
      id: 'boutique',
      nom: 'Module Boutique & Caisse',
      icone: '🛍️',
      statut: 'DISPONIBLE',
      description: 'Enregistrez vos ventes, gérez vos tickets de caisse, vos stocks et encaissez vos clients en toute simplicité.',
      tutorielTexte: `1. Accédez au menu Ventes / Boutique.\n2. Sélectionnez vos articles dans le catalogue ou scannez-les.\n3. Validez le mode de règlement (Espèces, Mobile Money) et éditez le ticket.\n4. Les mouvements de stock s'ajustent automatiquement.`,
      videoLien: liensReseauxSociaux.tiktok
    },
    {
      id: 'livraison',
      nom: 'Module Livraison & Flotte',
      icone: '🛵',
      statut: 'DISPONIBLE',
      description: 'Gérez vos livreurs, planifiez les tournées, suivez les colis en route et validez les restitutions de fonds.',
      tutorielTexte: `1. Créez vos tournées de livraison et affectez les livreurs.\n2. Suivez les encaissements terrain en temps réel.\n3. Clôturez la tournée pour réajuster les stocks de manière sécurisée.`,
      videoLien: liensReseauxSociaux.facebook
    },
    {
      id: 'tontine',
      nom: 'Module Tontine & Épargne',
      icone: '🤝',
      statut: 'EN_DEVELOPPEMENT',
      description: 'Gestion des cotisations, tours de rôle et suivi de caisses d’épargne communautaires.',
      tutorielTexte: `Ce module fait actuellement l'objet d'un développement approfondi pour garantir une sécurité et une traçabilité irréprochables de vos cycles d'épargne. Bientôt disponible !`,
      videoLien: liensReseauxSociaux.youtube
    },
    {
      id: 'logistique',
      nom: 'Module Logistique Avancée',
      icone: '🚛',
      statut: 'EN_DEVELOPPEMENT',
      description: 'Optimisation des entrainements logistiques, transits inter-villes et gestion de flotte lourde.',
      tutorielTexte: `Le module Logistique Avancée intègre des algorithmes de routage et de gestion d'entrepôt complexes. Sortie prévue lors de la prochaine mise à jour majeure.`,
      videoLien: liensReseauxSociaux.youtube
    }
  ];

  const banniereActuelle = bannières[banniereIndex] || bannières[0];

  return (
    <div className="space-y-4 font-sans text-xs pb-16">
      
      {/* ================= 1. BANNIÈRE DÉFILANTE PRINCIPALE ================= */}
      <div 
        onMouseEnter={() => setEstEnPause(true)}
        onMouseLeave={() => setEstEnPause(false)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        className="relative overflow-hidden rounded-2xl shadow-xl border border-slate-800 bg-slate-950 text-white p-6 transition-all duration-700 select-none cursor-grab active:cursor-grabbing"
      >
        <div className={`absolute inset-0 bg-gradient-to-r ${banniereActuelle.couleur} opacity-90 transition-all duration-700`}></div>
        
        {banniereActuelle.visuel && (
          <div className="absolute inset-0 z-0 opacity-30">
            <img src={banniereActuelle.visuel} alt="Visuel Annonce" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="relative z-10 flex flex-col justify-between min-h-[160px] space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="bg-red-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                {banniereActuelle.badge} {estEnPause && '⏸️ (Pause)'}
              </span>

              {estSuperAdmin && banniereActuelle.modifiable && (
                <button
                  onClick={(e) => { e.stopPropagation(); ouvrirModalModification(banniereActuelle); }}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-2.5 py-1 rounded-full text-[9px] uppercase shadow-md transition flex items-center gap-1"
                >
                  <span>✏️</span> Modifier
                </button>
              )}
            </div>

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
              {banniereActuelle.titre}
            </h2>
            <p className="text-[11px] text-slate-200 font-medium max-w-2xl leading-relaxed">
              {banniereActuelle.description}
            </p>

            {(banniereActuelle.whatsapp || banniereActuelle.facebook || banniereActuelle.tiktok || banniereActuelle.youtube || banniereActuelle.instagram || banniereActuelle.contientReseaux) && (
              <div className="pt-2 flex items-center gap-2 flex-wrap">
                <a
                  href={`https://wa.me/${liensReseauxSociaux.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-xl font-black text-[9.5px] shadow-lg transition"
                >
                  <span>💬</span> WhatsApp
                </a>
                <a
                  href={liensReseauxSociaux.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-xl font-black text-[9.5px] shadow-lg transition"
                >
                  <span>f</span> Facebook
                </a>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
            <span className="text-[9px] text-slate-300 font-bold italic">💡 Glissez ou touchez pour naviguer, relâchez pour reprendre.</span>
            {estSuperAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); ouvrirModalCreation(); }}
                className="bg-white hover:bg-slate-100 text-slate-950 font-black px-4 py-1.5 rounded-xl text-[10px] uppercase shadow-lg transition"
              >
                ✨ Diffuser mon annonce
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================= 2. BANNIÈRE "BESOIN D'AIDE ? NOUS CONTACTER" (100% VISIBLE POUR TOUS, OPTIMISÉE MOBILE) ================= */}
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

      {/* ================= 3. SECTION 4TS ACADEMY ================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎓</span>
            <div>
              <h3 className="font-black text-slate-900 uppercase text-xs">4TS Academy — Vidéos & Réseaux Sociaux</h3>
              <p className="text-[9px] text-slate-500 font-bold">Cliquez sur un lien pour accéder directement à nos pages officielles.</p>
            </div>
          </div>

          {estSuperAdmin && (
            <button
              onClick={ouvrirAdminReseaux}
              className="bg-amber-600 hover:bg-amber-700 text-white font-black px-3 py-1.5 rounded-xl text-[9.5px] uppercase shadow-md transition flex items-center gap-1.5"
            >
              <span>⚙️</span> Configurer Liens
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href={liensReseauxSociaux.facebook}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-blue-600 hover:bg-blue-50/40 transition group shadow-2xs"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-md group-hover:scale-110 transition">
              f
            </div>
            <div>
              <h4 className="font-black text-slate-900 uppercase text-xs">Facebook</h4>
              <p className="text-[9px] text-slate-500 font-bold">Voir nos publications</p>
            </div>
          </a>

          <a
            href={liensReseauxSociaux.tiktok}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition group shadow-2xs"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-base shadow-md group-hover:scale-110 transition">
              tk
            </div>
            <div>
              <h4 className="font-black text-slate-900 uppercase text-xs">TikTok</h4>
              <p className="text-[9px] text-slate-500 font-bold">Tutos express</p>
            </div>
          </a>

          <a
            href={liensReseauxSociaux.youtube}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-red-600 hover:bg-red-50/40 transition group shadow-2xs"
          >
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-base shadow-md group-hover:scale-110 transition">
              ▶
            </div>
            <div>
              <h4 className="font-black text-slate-900 uppercase text-xs">YouTube</h4>
              <p className="text-[9px] text-slate-500 font-bold">Formations complètes</p>
            </div>
          </a>
        </div>
      </div>

      {/* ================= 4. CENTRE DE FORMATION & GUIDE DES MODULES ================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">📚</span>
            <div>
              <h3 className="font-black text-slate-900 uppercase text-xs">Centre de Formation — Guide des Modules</h3>
              <p className="text-[9px] text-slate-500 font-bold">Accédez aux modules terminés ou découvrez nos projets en développement.</p>
            </div>
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

      {/* ================= 5. PIED DE PAGE : CGU ================= */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-base">🛡️</span>
          <div>
            <h4 className="font-black text-slate-900 uppercase text-xs">Politique & Conditions Générales d’Utilisation</h4>
            <p className="text-[9px] text-slate-500 font-bold">Consultez les règles d’utilisation et de confidentialité de 4TS.</p>
          </div>
        </div>
        <button
          onClick={() => setModalCguOuvert(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase shadow-md transition"
        >
          📖 Lire les CGU
        </button>
      </div>

      {/* ================= MODALE : CHATBOT CLIENT-ENTREPRISE ================= */}
      {modalChatbotOuvert && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col h-[560px] animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-900 text-white p-3.5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xl">🤖</span>
                <div>
                  <h4 className="font-black uppercase text-xs">Assistant Virtuel 4TS</h4>
                  <p className="text-[8.5px] text-emerald-400 font-bold">● En ligne - Sondage, Quiz & Astuces</p>
                </div>
              </div>
              <button
                onClick={() => setModalChatbotOuvert(false)}
                className="text-slate-400 hover:text-white font-black text-sm px-2 py-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50 text-[10px]">
              {messagesChat.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.expediteur === 'client' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl font-medium leading-relaxed ${
                    msg.expediteur === 'client' 
                      ? 'bg-slate-900 text-white rounded-br-none shadow-xs' 
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-xs'
                  }`}>
                    {msg.texte}
                  </div>

                  {msg.options && (modeChat === 'SONDAGE' || modeChat === 'DIVERTISSEMENT') && (
                    <div className="flex flex-col gap-1.5 mt-2 w-full pl-2">
                      {msg.options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => selectionnerOptionChoix(opt)}
                          className="bg-slate-800 hover:bg-slate-900 text-white border border-slate-700 font-bold p-2.5 rounded-xl text-left transition shadow-2xs"
                        >
                          👉 {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {modeChat === 'ASTUCES' && !categorieSelectionnee && (
                <div className="grid grid-cols-2 gap-2 pt-2 w-full">
                  {Object.entries(categoriesAstuces).map(([key, cat]) => (
                    <button
                      key={key}
                      onClick={() => setCategorieSelectionnee(key)}
                      className="bg-slate-800 hover:bg-slate-900 text-white border border-slate-700 p-2.5 rounded-xl font-black text-left transition shadow-2xs flex flex-col justify-between"
                    >
                      <span className="text-xs mb-1">{cat.titre.split(' ')[0]}</span>
                      <span className="text-[9.5px] uppercase text-slate-300">{cat.titre.split(' ').slice(1).join(' ')}</span>
                    </button>
                  ))}
                </div>
              )}

              {modeChat === 'ASTUCES' && categorieSelectionnee && !astuceActive && (
                <div className="space-y-2 pt-2 w-full">
                  <div className="flex justify-between items-center bg-slate-800 text-white p-2.5 rounded-xl">
                    <span className="font-black text-[10px]">📂 {categoriesAstuces[categorieSelectionnee].titre}</span>
                    <button
                      onClick={() => setCategorieSelectionnee(null)}
                      className="bg-slate-700 hover:bg-slate-600 text-white font-black px-2 py-1 rounded-lg text-[8px] uppercase"
                    >
                      ← Retour
                    </button>
                  </div>
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {categoriesAstuces[categorieSelectionnee].liste.map((ast, i) => (
                      <button
                        key={i}
                        onClick={() => setAstuceActive(ast)}
                        className="w-full bg-white hover:bg-slate-100 border border-slate-200 p-2 rounded-xl text-left font-bold text-slate-800 text-[9.5px] transition flex items-center justify-between"
                      >
                        <span>{ast.titre}</span>
                        <span className="text-slate-900 font-black">Lire →</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {modeChat === 'ASTUCES' && astuceActive && (
                <div className="bg-slate-900 text-white p-3.5 rounded-2xl space-y-2 w-full shadow-lg">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-1.5">
                    <h5 className="font-black text-xs uppercase text-slate-100">📖 {astuceActive.titre}</h5>
                    <button
                      onClick={() => setAstuceActive(null)}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-black px-2 py-1 rounded-lg text-[8px] uppercase"
                    >
                      ✕ Fermer
                    </button>
                  </div>
                  <p className="text-[9.5px] text-slate-300 font-medium leading-relaxed">
                    {astuceActive.texte}
                  </p>
                  <div className="pt-1 flex justify-between items-center">
                    <span className="text-[8px] text-slate-400 font-bold italic">💡 4TS Suite Manager</span>
                    <button
                      onClick={() => setAstuceActive(null)}
                      className="text-[9px] bg-slate-800 border border-slate-700 text-white font-black px-2.5 py-1 rounded-lg"
                    >
                      ← Retour astuces
                    </button>
                  </div>
                </div>
              )}

              <div ref={chatFinRef} />
            </div>

            {modeChat === 'ACCUEIL' && (
              <div className="p-2.5 bg-slate-100 border-t border-slate-200 flex gap-1.5 justify-around shrink-0 flex-wrap">
                <button onClick={lancerModeSondage} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-black py-2 px-1 rounded-xl text-[8.5px] uppercase shadow-sm">📊 Sondage</button>
                <button onClick={lancerModeDivertissement} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-black py-2 px-1 rounded-xl text-[8.5px] uppercase shadow-sm">🎮 Quiz</button>
                <button onClick={lancerModeAstuces} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-black py-2 px-1 rounded-xl text-[8.5px] uppercase shadow-sm">💡 Astuces</button>
                <button onClick={lancerModeSupport} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-black py-2 px-1 rounded-xl text-[8.5px] uppercase shadow-sm">❓ Support</button>
              </div>
            )}

            <form onSubmit={soumettreReponseChat} className="p-3 bg-white border-t border-slate-200 flex gap-2 shrink-0">
              <input
                type="text"
                value={saisieMessage}
                onChange={(e) => setSaisieMessage(e.target.value)}
                placeholder="Posez votre question..."
                disabled={modeChat === 'ASTUCES'}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-[10px] font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={modeChat === 'ASTUCES'}
                className="bg-slate-800 hover:bg-slate-900 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase shadow-md transition disabled:opacity-50"
              >
                Envoyer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODALE : CONFIGURATION DES LIENS RÉSEAUX (SUPER ADMIN) ================= */}
      {modalAdminReseauxOuvert && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden space-y-4 p-5 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                <span>⚙️</span> CONFIGURATION DES CONTACTS & RÉSEAUX
              </h4>
              <button onClick={() => setModalAdminReseauxOuvert(false)} className="text-slate-400 hover:text-slate-700 font-black text-sm">✕</button>
            </div>

            <form onSubmit={sauvegarderLiensReseaux} className="space-y-3 text-[10px]">
              <div>
                <label className="block font-bold text-slate-700 mb-0.5">Numéro WhatsApp *</label>
                <input type="text" value={waInput} onChange={(e) => setWaInput(e.target.value)} required className="w-full bg-slate-50 border rounded-xl p-2 font-bold text-slate-900 text-[10px]" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-0.5">Numéro d'Appel Direct *</label>
                <input type="text" value={telInput} onChange={(e) => setTelInput(e.target.value)} required className="w-full bg-slate-50 border rounded-xl p-2 font-bold text-slate-900 text-[10px]" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-0.5">Lien Facebook</label>
                <input type="url" value={fbInput} onChange={(e) => setFbInput(e.target.value)} className="w-full bg-slate-50 border rounded-xl p-2 font-bold text-slate-900 text-[10px]" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-0.5">Lien TikTok</label>
                <input type="url" value={tkInput} onChange={(e) => setTkInput(e.target.value)} className="w-full bg-slate-50 border rounded-xl p-2 font-bold text-slate-900 text-[10px]" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-0.5">Lien YouTube</label>
                <input type="url" value={ytInput} onChange={(e) => setYtInput(e.target.value)} className="w-full bg-slate-50 border rounded-xl p-2 font-bold text-slate-900 text-[10px]" />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setModalAdminReseauxOuvert(false)} className="bg-slate-100 px-3 py-2 rounded-xl font-bold">Annuler</button>
                <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase shadow-md">💾 Enregistrer</button>
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

      {/* ================= MODALE : CRÉATION / MODIFICATION D'ANNONCE PERSISTANTE ================= */}
      {modalAnnonceOuvert && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-4 p-5 animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                <span>{annonceIdEnCoursDeModif ? '✏️' : '📢'}</span> 
                {annonceIdEnCoursDeModif ? 'MODIFIER VOTRE ANNONCE' : 'CRÉER ET DIFFUSER UNE ANNONCE'}
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
                  placeholder="EX: PROMOTION SPÉCIALE..."
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

              <div>
                <label className="block font-bold text-slate-700 mb-1">⏱️ Durée de validité de l'annonce :</label>
                <select
                  value={dureeHeures}
                  onChange={(e) => setDureeHeures(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-[10px]"
                >
                  <option value="24">24 Heures (1 Jour)</option>
                  <option value="72">72 Heures (3 Jours)</option>
                  <option value="168">1 Semaine (7 Jours)</option>
                  <option value="720">1 Mois (30 Jours)</option>
                  <option value="8760">Permanent (1 An)</option>
                </select>
                <p className="text-[8px] text-slate-500 font-bold mt-1">L'annonce restera affichée en continu jusqu'à l'expiration de ce délai, même après vos mises à jour.</p>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Visuel de l'annonce (Image optionnelle)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={gererChangementVisuel}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-1.5 text-[9px] text-slate-600"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setModalAnnonceOuvert(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-[10px] uppercase">Annuler</button>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase shadow-md">
                  {annonceIdEnCoursDeModif ? '💾 Enregistrer' : '🚀 Valider et Diffuser'}
                </button>
              </div>
            </form>
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