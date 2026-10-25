'use client';
import { useState } from 'react';

export default function SubmitButton({ children, onClick, className, disabled, ...props }) {
  const [enCours, setEnCours] = useState(false);

  const handleClick = async (e) => {
    if (enCours) return; // Empêche le double clic

    if (onClick) {
      try {
        setEnCours(true);
        await onClick(e);
      } catch (err) {
        console.error("Erreur lors de la soumission :", err);
      } finally {
        setEnCours(false);
      }
    }
  };

  return (
    <button
      type="submit"
      disabled={disabled || enCours}
      onClick={handleClick}
      className={`${className} transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed`}
      {...props}
    >
      {enCours ? (
        <span className="flex items-center justify-center gap-1.5">
          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Traitement...
        </span>
      ) : (
        children
      )}
    </button>
  );
}