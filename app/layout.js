import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "4TS Suite Manager",
  description: "Suite de gestion d'entreprise, logistique et commerciale",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "4TS Suite Manager",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Script Google Maps Places Autocomplete */}
        <script
          src="https://maps.googleapis.com/maps/api/js?key=VOTRE_CLE_API_GOOGLE&libraries=places"
          async
          defer
        ></script>
      </head>
      {/* Fond global extérieur en gris clair */}
      <body className="min-h-full flex flex-col p-2 sm:p-4 bg-slate-200 m-0">
        {/* Conteneur principal qui remplace le bleu nuit par le fond gris clair/blanc des tableaux */}
        <div className="flex-1 w-full max-w-full flex flex-col bg-slate-50 rounded-2xl shadow-xl border border-slate-300 overflow-hidden">
          <main className="flex-1 w-full flex flex-col p-3 sm:p-5">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}