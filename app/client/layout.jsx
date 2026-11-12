'use client';

export default function ClientLayout({ children }) {
  return (
    <div className="client-portal-wrapper">
      {/* Ce layout isole totalement l'espace client des menus administratifs */}
      {children}
    </div>
  );
}