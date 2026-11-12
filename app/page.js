import { redirect } from 'next/navigation';

export default function PageRacine({ searchParams }) {
  // Récupération sécurisée des paramètres d'URL (compatible Next.js App Router)
  const entrepriseId = searchParams?.entrepriseId;

  // 1. Si un client arrive avec un QR code de table, redirection immédiate vers l'espace client
  if (entrepriseId) {
    redirect(`/client?entrepriseId=${entrepriseId}`);
  }

  // 2. SÉCURITÉ CRITIQUE PWA : Si l'application s'ouvre depuis l'écran d'accueil sans QR code,
  // on redirige vers la page de connexion au lieu d'envoyer directement sur le dashboard admin.
  redirect('/connexion');
}