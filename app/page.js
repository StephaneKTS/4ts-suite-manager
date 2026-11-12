import { redirect } from 'next/navigation';

export default function PageRacine({ searchParams }) {
  // Récupération sécurisée des paramètres d'URL (compatible Next.js App Router)
  const entrepriseId = searchParams?.entrepriseId;

  // 1. Si un client arrive avec un QR code de table, redirection immédiate vers l'espace client
  if (entrepriseId) {
    redirect(`/client?entrepriseId=${entrepriseId}`);
  }

  // 2. Sinon, redirection automatique vers le Dashboard centralisé de l'administration
  redirect('/dashboard');
}