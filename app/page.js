import { redirect } from 'next/navigation';

export default function PageRacine() {
  // Redirection automatique vers le Dashboard centralisé
  redirect('/dashboard');
}