'use client';

export default function ClientLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased w-full max-w-md mx-auto shadow-xl">
      {/* Ce layout isole totalement l'espace client des menus administratifs et garantit un rendu mobile parfait */}
      {children}
    </div>
  );
}