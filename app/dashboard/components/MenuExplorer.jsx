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
  const [modeChat, setModeChat] = useState('ACCUEIL'); // 'ACCUEIL', 'SUPPORT', 'SONDAGE', 'DIVERTISSEMENT', 'ASTUCES', 'LECTURE_ASTUCE'
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
    { expediteur: 'bot', texte: '👋 Bonjour ! Bienvenue sur l’assistant interactif 4TS Suite Manager. Que souhaitez-vous faire aujourd’hui ?' }
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

  // Lancement du mode Astuces
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
        let reponseBot = "Je n'ai pas bien compris. N'hésitez pas à contacter directement notre service client par WhatsApp ou via le bouton 'Appeler'.";
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
  const [visuelFichier, setVisuelFichier] = useState(null);
  const [visuelPreview, setVisuelPreview] = useState(null);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

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

    if (annonceIdEnCoursDeModif) {
      setBannières((prev) =>
        prev.map((item) =>
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
                visuel: visuelPreview
              }
            : item
        )
      );
      alert(`✏️ Annonce modifiée et mise à jour en direct avec succès !`);
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
        modifiable: true
      };

      setBannières((prev) => [nouvelleBanniere, ...prev]);
      setBanniereIndex(0);
      alert(`✅ Annonce créée et diffusée en direct avec succès !`);
    }

    setAnnonceIdEnCoursDeModif(null);
    setTitreAnnonce('');
    setDescAnnonce('');
    setWhatsappAnnonce('');
    setFacebookAnnonce('');
    setTiktokAnnonce('');
    setYoutubeAnnonce('');
    setInstagramAnnonce('');
    setVisuelFichier(null);
    setVisuelPreview(null);
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

  const banniereActuelle = bannières[banniereIndex];

  return (
    <div className="space-y-4 font-sans text-xs pb-10">
      
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
        title="Maintenez ou touchez pour faire une pause, glissez pour changer de bannière"
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

              {banniereActuelle.modifiable && (
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
                  href={liensReseauxSociaux.whatsapp.startsWith('http') ? liensReseauxSociaux.whatsapp : `https://wa.me/${liensReseauxSociaux.whatsapp.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-xl font-black text-[9.5px] shadow-lg transition transform hover:scale-105"
                >
                  <span>💬</span> WhatsApp
                </a>
                <a
                  href={banniereActuelle.facebook || liensReseauxSociaux.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-xl font-black text-[9.5px] shadow-lg transition transform hover:scale-105"
                >
                  <span>f</span> Facebook
                </a>
                <a
                  href={banniereActuelle.tiktok || liensReseauxSociaux.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white px-2.5 py-1 rounded-xl font-black text-[9.5px] shadow-lg border border-slate-700 transition transform hover:scale-105"
                >
                  <span>♪</span> TikTok
                </a>
                <a
                  href={banniereActuelle.youtube || liensReseauxSociaux.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-xl font-black text-[9.5px] shadow-lg transition transform hover:scale-105"
                >
                  <span>▶</span> YouTube
                </a>
                <a
                  href={banniereActuelle.instagram || liensReseauxSociaux.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white px-2.5 py-1 rounded-xl font-black text-[9.5px] shadow-lg transition transform hover:scale-105"
                >
                  <span>📸</span> Instagram
                </a>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
            <span className="text-[9px] text-slate-300 font-bold italic">💡 Glissez ou touchez pour naviguer, relâchez pour reprendre.</span>
            <button
              onClick={(e) => { e.stopPropagation(); ouvrirModalCreation(); }}
              className="bg-white hover:bg-slate-100 text-slate-950 font-black px-4 py-1.5 rounded-xl text-[10px] uppercase shadow-lg transition transform hover:scale-105"
            >
              ✨ Diffuser mon annonce (Instantané)
            </button>
          </div>
        </div>
      </div>

      {/* ================= 2. SECTION 4TS ACADEMY ================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎓</span>
            <div>
              <h3 className="font-black text-slate-900 uppercase text-xs">4TS Academy — Vidéos & Réseaux Sociaux</h3>
              <p className="text-[9px] text-slate-500 font-bold">Cliquez sur un lien pour accéder directement à nos pages officielles et suivre nos vidéos.</p>
            </div>
          </div>

          {estSuperAdmin && (
            <button
              onClick={ouvrirAdminReseaux}
              className="bg-amber-600 hover:bg-amber-700 text-white font-black px-3 py-1.5 rounded-xl text-[9.5px] uppercase shadow-md transition flex items-center gap-1.5"
            >
              <span>⚙️</span> Gérer les Liens Officiels (Super-Admin)
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
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-md group-hover:scale-110 transition animate-bounce">
              f
            </div>
            <div>
              <h4 className="font-black text-slate-900 uppercase text-xs group-hover:text-blue-700">Facebook</h4>
              <p className="text-[9px] text-slate-500 font-bold">Voir nos publications</p>
            </div>
          </a>

          <a
            href={liensReseauxSociaux.tiktok}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition group shadow-2xs"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-base shadow-md group-hover:scale-110 transition animate-bounce">
              tk
            </div>
            <div>
              <h4 className="font-black text-slate-900 uppercase text-xs">TikTok</h4>
              <p className="text-[9px] text-slate-500 font-bold">Tutos express & business</p>
            </div>
          </a>

          <a
            href={liensReseauxSociaux.youtube}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-red-600 hover:bg-red-50/40 transition group shadow-2xs"
          >
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-base shadow-md group-hover:scale-110 transition animate-bounce">
              ▶
            </div>
            <div>
              <h4 className="font-black text-slate-900 uppercase text-xs group-hover:text-red-700">YouTube</h4>
              <p className="text-[9px] text-slate-500 font-bold">Formations complètes</p>
            </div>
          </a>
        </div>
      </div>

      {/* ================= 3. CENTRE DE FORMATION & GUIDE DES MODULES ================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">📚</span>
            <div>
              <h3 className="font-black text-slate-900 uppercase text-xs">Centre de Formation — Guide des Modules</h3>
              <p className="text-[9px] text-slate-500 font-bold">Accédez aux modules terminés ou découvrez nos projets en cours de développement.</p>
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
                    alert(`🔒 Le module "${mod.nom}" est actuellement en plein développement. Il sera bientôt disponible dans l'écosystème 4TS !`);
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
                    🔒 En développement
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl">{mod.icone}</span>
                    {!estVerrouille && (
                      <span className="text-[8px] bg-slate-100 text-slate-700 font-extrabold px-2 py-0.5 rounded-full group-hover:bg-orange-600 group-hover:text-white transition">
                        Guide interactif →
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

      {/* ================= 4. PIED DE PAGE : CGU ================= */}
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

      {/* ================= 5. BANNIÈRE NOUS CONTACTER ================= */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-950 border border-blue-900/50 rounded-2xl p-4 sm:p-5 shadow-xl text-white flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-xl shrink-0 shadow-inner">
            🎧
          </div>
          <div>
            <h4 className="font-black uppercase text-xs sm:text-sm tracking-wide text-cyan-300">Besoin d'aide ? Nous Contacter</h4>
            <p className="text-[10px] text-slate-300 font-medium">Notre service client est à votre écoute par WhatsApp, par appel direct ou via notre Chatbot.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap md:flex-nowrap justify-end shrink-0">
          <a
            href={`https://wa.me/${liensReseauxSociaux.whatsapp.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-3 py-2 rounded-xl text-[9.5px] uppercase shadow-md transition flex items-center gap-1 shrink-0"
          >
            <span>💬</span> WhatsApp
          </a>

          <a
            href={`tel:${liensReseauxSociaux.telephone || liensReseauxSociaux.whatsapp}`}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black px-3 py-2 rounded-xl text-[9.5px] uppercase shadow-md transition flex items-center gap-1 shrink-0"
          >
            <span>📞</span> Appeler
          </a>

          <button
            onClick={() => { setModalChatbotOuvert(true); setModeChat('ACCUEIL'); }}
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-slate-950 font-black px-3 py-2 rounded-xl text-[9.5px] uppercase shadow-md transition flex items-center gap-1 shrink-0 animate-pulse"
          >
            <span>🤖</span> Chatbot Client
          </button>
        </div>
      </div>

      {/* ================= MODALE : CHATBOT CLIENT-ENTREPRISE (AVEC ASTUCES) ================= */}
      {modalChatbotOuvert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col h-[560px] animate-in fade-in zoom-in duration-200">
            {/* Header Chatbot */}
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

            {/* Corps des messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50 text-[10px]">
              {messagesChat.map((msg, idx) => (
                <div key={idx} className={`flex flex-col ${msg.expediteur === 'client' ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl font-medium leading-relaxed ${
                    msg.expediteur === 'client' 
                      ? 'bg-blue-600 text-white rounded-br-none shadow-xs' 
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-xs'
                  }`}>
                    {msg.texte}
                  </div>

                  {/* Boutons d'options interactives pour le sondage ou le divertissement */}
                  {msg.options && (modeChat === 'SONDAGE' || modeChat === 'DIVERTISSEMENT') && (
                    <div className="flex flex-col gap-1.5 mt-2 w-full pl-2">
                      {msg.options.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => selectionnerOptionChoix(opt)}
                          className="bg-orange-50 hover:bg-orange-100 text-orange-900 border border-orange-200 font-bold p-2 rounded-xl text-left transition shadow-2xs"
                        >
                          👉 {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* INTERFACE DE SÉLECTION DES CATÉGORIES ET LECTURE DES ASTUCES */}
              {modeChat === 'ASTUCES' && !categorieSelectionnee && (
                <div className="grid grid-cols-2 gap-2 pt-2 w-full">
                  {Object.entries(categoriesAstuces).map(([key, cat]) => (
                    <button
                      key={key}
                      onClick={() => setCategorieSelectionnee(key)}
                      className="bg-white hover:bg-orange-50 border border-slate-200 hover:border-orange-400 p-2.5 rounded-xl font-black text-slate-900 text-left transition shadow-2xs flex flex-col justify-between"
                    >
                      <span className="text-xs mb-1">{cat.titre.split(' ')[0]}</span>
                      <span className="text-[9.5px] uppercase text-orange-700">{cat.titre.split(' ').slice(1).join(' ')}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* LECTURE DE LA LISTE DES ASTUCES DE LA CATÉGORIE CHOISIE */}
              {modeChat === 'ASTUCES' && categorieSelectionnee && !astuceActive && (
                <div className="space-y-2 pt-2 w-full">
                  <div className="flex justify-between items-center bg-orange-100 p-2 rounded-xl">
                    <span className="font-black text-orange-900 text-[10px]">📂 {categoriesAstuces[categorieSelectionnee].titre}</span>
                    <button
                      onClick={() => setCategorieSelectionnee(null)}
                      className="bg-orange-600 text-white font-black px-2 py-1 rounded-lg text-[8px] uppercase"
                    >
                      ← Retour catégories
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                    {categoriesAstuces[categorieSelectionnee].liste.map((ast, i) => (
                      <button
                        key={i}
                        onClick={() => setAstuceActive(ast)}
                        className="w-full bg-white hover:bg-slate-100 border border-slate-200 p-2 rounded-xl text-left font-bold text-slate-800 text-[9.5px] transition flex items-center justify-between shadow-2xs"
                      >
                        <span>{ast.titre}</span>
                        <span className="text-orange-600 font-black">Lire →</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* LECTURE D'UNE ASTUCE PARTICULIÈRE */}
              {modeChat === 'ASTUCES' && astuceActive && (
                <div className="bg-orange-50 border border-orange-200 p-3 rounded-2xl space-y-2 w-full">
                  <div className="flex justify-between items-center border-b border-orange-200 pb-1.5">
                    <h5 className="font-black text-orange-900 text-[10px] uppercase">📖 {astuceActive.titre}</h5>
                    <button
                      onClick={() => setAstuceActive(null)}
                      className="bg-orange-600 hover:bg-orange-700 text-white font-black px-2 py-1 rounded-lg text-[8px] uppercase shadow-xs"
                    >
                      ✕ Fermer l'astuce
                    </button>
                  </div>
                  <p className="text-[9.5px] text-slate-800 font-medium leading-relaxed">
                    {astuceActive.texte}
                  </p>
                  <div className="pt-1 flex justify-between items-center">
                    <span className="text-[8px] text-orange-700 font-bold italic">💡 Astuce validée par 4TS Suite Manager</span>
                    <button
                      onClick={() => setAstuceActive(null)}
                      className="text-[9px] bg-white border border-orange-300 text-orange-800 font-black px-2.5 py-1 rounded-lg hover:bg-orange-100"
                    >
                      ← Choisir une autre astuce
                    </button>
                  </div>
                </div>
              )}

              <div ref={chatFinRef} />
            </div>

            {/* Boutons de choix rapide à l'accueil du Chatbot */}
            {modeChat === 'ACCUEIL' && (
              <div className="p-2.5 bg-slate-100 border-t border-slate-200 flex gap-1.5 justify-around shrink-0 flex-wrap">
                <button
                  onClick={lancerModeSondage}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-black py-2 px-1 rounded-xl text-[8.5px] uppercase shadow-sm transition"
                >
                  📊 Sondage
                </button>
                <button
                  onClick={lancerModeDivertissement}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-black py-2 px-1 rounded-xl text-[8.5px] uppercase shadow-sm transition"
                >
                  🎮 Quiz
                </button>
                <button
                  onClick={lancerModeAstuces}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2 px-1 rounded-xl text-[8.5px] uppercase shadow-sm transition"
                >
                  💡 Astuces
                </button>
                <button
                  onClick={lancerModeSupport}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-2 px-1 rounded-xl text-[8.5px] uppercase shadow-sm transition"
                >
                  ❓ Support
                </button>
              </div>
            )}

            {/* Formulaire de saisie message */}
            <form onSubmit={soumettreReponseChat} className="p-3 bg-white border-t border-slate-200 flex gap-2 shrink-0">
              <input
                type="text"
                value={saisieMessage}
                onChange={(e) => setSaisieMessage(e.target.value)}
                placeholder={
                  modeChat === 'ASTUCES' ? "Explorez les catégories d'astuces ci-dessus..." :
                  modeChat === 'SONDAGE' ? "Écrivez votre réponse..." :
                  modeChat === 'DIVERTISSEMENT' ? "Écrivez votre réponse..." :
                  "Posez votre question sur nos services..."
                }
                disabled={modeChat === 'ASTUCES'}
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-[10px] font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={modeChat === 'ASTUCES'}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase shadow-md transition disabled:opacity-50"
              >
                Envoyer
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODALE : GÉRER LES LIENS RÉSEAUX & CONTACTS (SUPER ADMIN) ================= */}
      {modalAdminReseauxOuvert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden space-y-4 p-5 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                <span>⚙️</span> CONFIGURATION DES CONTACTS & RÉSEAUX (SUPER-ADMIN)
              </h4>
              <button
                onClick={() => setModalAdminReseauxOuvert(false)}
                className="text-slate-400 hover:text-slate-700 font-black text-sm px-2 py-1 rounded-lg hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={sauvegarderLiensReseaux} className="space-y-3 text-[10px]">
              <div>
                <label className="block font-bold text-slate-700 mb-0.5">Numéro WhatsApp du Service Client *</label>
                <input
                  type="text"
                  value={waInput}
                  onChange={(e) => setWaInput(e.target.value)}
                  placeholder="EX: +237600000000"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-[10px]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">Numéro d'Appel Direct *</label>
                <input
                  type="text"
                  value={telInput}
                  onChange={(e) => setTelInput(e.target.value)}
                  placeholder="EX: +237600000000"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-[10px]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">Lien officiel Facebook</label>
                <input
                  type="url"
                  value={fbInput}
                  onChange={(e) => setFbInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-[10px]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">Lien officiel TikTok</label>
                <input
                  type="url"
                  value={tkInput}
                  onChange={(e) => setTkInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-[10px]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-0.5">Lien officiel YouTube</label>
                <input
                  type="url"
                  value={ytInput}
                  onChange={(e) => setYtInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-slate-900 text-[10px]"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-[9px] text-amber-800 font-bold">
                🔒 Espace sécurisé : Ces numéros et liens mettront à jour instantanément la bannière "Nous Contacter".
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalAdminReseauxOuvert(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-[10px] uppercase"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase shadow-md"
                >
                  💾 Enregistrer les contacts
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Guide */}
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

      {/* ================= MODALE : CRÉATION / MODIFICATION D'ANNONCE ================= */}
      {modalAnnonceOuvert && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden space-y-4 p-5 animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-1.5">
                <span>{annonceIdEnCoursDeModif ? '✏️' : '📢'}</span> 
                {annonceIdEnCoursDeModif ? 'MODIFIER VOTRE ANNONCE' : 'CRÉER ET DIFFUSER UNE ANNONCE'}
              </h4>
              <button
                onClick={() => setModalAnnonceOuvert(false)}
                className="text-slate-400 hover:text-slate-700 font-black text-sm px-2 py-1 rounded-lg hover:bg-slate-100 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={soumettreAnnonce} className="space-y-3 text-[10px] overflow-y-auto pr-1">
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
                  rows="2"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium text-slate-900 text-[10px] focus:ring-2 focus:ring-orange-500 focus:outline-none"
                ></textarea>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <h5 className="font-black text-slate-900 uppercase text-[9px]">🔗 Liens & Contacts cliquables sur l'annonce</h5>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5">Numéro ou Lien WhatsApp</label>
                    <input
                      type="text"
                      value={whatsappAnnonce}
                      onChange={(e) => setWhatsappAnnonce(e.target.value)}
                      placeholder="EX: +237 6XXXXXXXX"
                      className="w-full bg-white border border-slate-300 rounded-xl p-1.5 font-bold text-slate-900 text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5">Lien page Facebook</label>
                    <input
                      type="url"
                      value={facebookAnnonce}
                      onChange={(e) => setFacebookAnnonce(e.target.value)}
                      placeholder="https://facebook.com/votrepage"
                      className="w-full bg-white border border-slate-300 rounded-xl p-1.5 font-bold text-slate-900 text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5">Lien profil / vidéo TikTok</label>
                    <input
                      type="url"
                      value={tiktokAnnonce}
                      onChange={(e) => setTiktokAnnonce(e.target.value)}
                      placeholder="https://tiktok.com/@votrecompte"
                      className="w-full bg-white border border-slate-300 rounded-xl p-1.5 font-bold text-slate-900 text-[10px]"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-0.5">Lien chaîne YouTube</label>
                    <input
                      type="url"
                      value={youtubeAnnonce}
                      onChange={(e) => setYoutubeAnnonce(e.target.value)}
                      placeholder="https://youtube.com/@votrechaine"
                      className="w-full bg-white border border-slate-300 rounded-xl p-1.5 font-bold text-slate-900 text-[10px]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Lien profil Instagram</label>
                  <input
                    type="url"
                    value={instagramAnnonce}
                    onChange={(e) => setInstagramAnnonce(e.target.value)}
                    placeholder="https://instagram.com/votrecompte"
                    className="w-full bg-white border border-slate-300 rounded-xl p-1.5 font-bold text-slate-900 text-[10px]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Visuel de l'annonce (Image)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={gererChangementVisuel}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-1.5 text-[9px] text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[9px] file:font-black file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                />
                <p className="text-[8.5px] text-slate-500 font-bold italic">
                  📐 Taille recommandée : <span className="text-orange-600 font-black">1200 x 400 pixels</span> (Format paysage adapté au défilement de la bannière).
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl text-[9px] text-emerald-800 font-bold">
                🚀 Mise à jour instantanée : Vos modifications s'appliqueront et s'afficheront immédiatement sur la bannière.
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase shadow-md"
                >
                  {annonceIdEnCoursDeModif ? '💾 Enregistrer les modifications' : '🚀 Valider et Diffuser en Direct'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale CGU */}
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
              <p>4TS Suite Manager est une solution logicielle modulaire conçue pour la gestion commerciale, la comptabilité, le suivi des stocks, la caisse boutique, la logistique, la tontine et la gestion des flottes de livraison.</p>

              <h5 className="font-black text-slate-900 uppercase">2. Service Client et Support</h5>
              <p>Pour toute assistance, les utilisateurs peuvent contacter directement le service client via la bannière dédiée (WhatsApp, Appel direct ou Chatbot interactif).</p>
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