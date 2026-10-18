'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-900 text-white flex flex-col justify-between">
      {/* En-tête */}
      <header className="p-6 border-b border-slate-800 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 text-xl font-bold p-2 rounded-lg">4TS</div>
          <span className="text-xl font-semibold tracking-wider">SUITE MANAGER</span>
        </div>
        <div className="space-x-4">
          <Link 
            href="/dashboard" 
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-medium transition"
          >
            Accéder au Dashboard
          </Link>
        </div>
      </header>

      {/* Section Principale (Hero) */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 max-w-4xl mx-auto">
        <span className="bg-blue-500/10 text-blue-400 text-sm font-semibold px-4 py-1.5 rounded-full mb-6 border border-blue-500/20">
          Écosystème Professionnel & Intégré
        </span>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Pilotez votre entreprise avec <span className="text-blue-500">4TS Suite Manager</span>
        </h1>
        <p className="text-slate-400 text-lg md:text-xl mb-10 max-w-2xl">
          La solution tout-en-un pour la gestion de vos stocks, points de vente, registres de caisse, et opérations logistiques en toute simplicité.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link 
            href="/dashboard" 
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3.5 rounded-xl shadow-lg transition text-center"
          >
            Ouvrir le Tableau de Bord
          </Link>
          <Link 
            href="/souscription" 
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-8 py-3.5 rounded-xl border border-slate-700 transition text-center"
          >
            Gérer l'Abonnement
          </Link>
        </div>
      </section>

      {/* Pied de page */}
      <footer className="py-6 text-center text-slate-500 text-sm border-t border-slate-800">
        © {new Date().getFullYear()} 4TS SUITE MANAGER. Tous droits réservés.
      </footer>
    </main>
  );
}