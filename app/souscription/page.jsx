'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const generateUniqueId = () => {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return '4TS-' + randomNum;
};

const TARIFS_MODULES = {
  Boutique: { installation: 25000, mensuelPerUser: 5000 },
  Logistique: { installation: 20000, mensuelPerUser: 4000 },
  Livraison: { installation: 25000, mensuelPerUser: 5000 },
  Tontine: { installation: 25000, mensuelPerUser: 2500 },
};

export default function SouscriptionWizard() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [typeOffre, setTypeOffre] = useState('entreprise'); // 'personnel' ou 'entreprise'

  const [formData, setFormData] = useState({
    entrepriseId: '',
    nomEntreprise: '',
    email: '',
    telephone: '',
    pinCode: '',
    duree: 1,
    utilisateurs: 1,
  });

  const [showPin, setShowPin] = useState(false);

  const [modules, setModules] = useState({
    Boutique: true,
    Logistique: false,
    Livraison: false,
    Tontine: false,
  });

  const [otpInput, setOtpInput] = useState('');
  const [serverOtp, setServerOtp] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  useEffect(() => {
    setFormData((prev) => ({ ...prev, entrepriseId: generateUniqueId() }));
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleModuleChange = (modName) => {
    setModules({ ...modules, [modName]: !modules[modName] });
  };

  const calculerFacturation = () => {
    let sousTotalInstallation = 0;
    let sousTotalMensuelPerUser = 0;

    if (typeOffre === 'personnel') {
      sousTotalInstallation = 10000; // Frais fixes uniques pour l'offre perso
      sousTotalMensuelPerUser = 3000; // Forfait mensuel allégé
    } else {
      Object.keys(modules).forEach((mod) => {
        if (modules[mod]) {
          sousTotalInstallation += TARIFS_MODULES[mod].installation;
          sousTotalMensuelPerUser += TARIFS_MODULES[mod].mensuelPerUser;
        }
      });
    }

    const nbUsers = typeOffre === 'personnel' ? 1 : Math.max(1, parseInt(formData.utilisateurs) || 1);
    const nbMois = Math.max(1, parseInt(formData.duree) || 1);

    const totalAbonnementBrut = sousTotalMensuelPerUser * nbUsers * nbMois;

    let remiseDureePct = 0;
    if (nbMois >= 12) remiseDureePct = 0.15;
    else if (nbMois >= 6) remiseDureePct = 0.10;
    else if (nbMois >= 3) remiseDureePct = 0.05;

    let remiseUsersPct = typeOffre === 'personnel' ? 0 : 0;
    if (typeOffre === 'entreprise') {
      if (nbUsers >= 50) remiseUsersPct = 0.15;
      else if (nbUsers >= 20) remiseUsersPct = 0.10;
      else if (nbUsers >= 10) remiseUsersPct = 0.05;
    }

    const remiseTotalPct = remiseDureePct + remiseUsersPct;
    const montantRemise = totalAbonnementBrut * remiseTotalPct;
    const totalAbonnementNette = totalAbonnementBrut - montantRemise;

    const totalGeneral = sousTotalInstallation + totalAbonnementNette;

    return {
      fraisInstallation: sousTotalInstallation,
      abonnementBrut: totalAbonnementBrut,
      remisePct: Math.round(remiseTotalPct * 100),
      montantRemise,
      totalGeneral,
      nbUsers,
      nbMois
    };
  };

  const facturation = calculerFacturation();

  // Fonction utilitaire pour initialiser Supabase de manière sécurisée et isolée à chaque appel
  const getSupabaseClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const cleanEmail = formData.email ? formData.email.trim() : '';
      const supabase = getSupabaseClient();
      
      const { data, error: fetchErr } = await supabase
        .from('entreprises')
        .select('email')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (fetchErr) {
        console.warn("Avertissement lecture email:", fetchErr);
      }

      if (data) {
        throw new Error("Cet e-mail est déjà associé à une entreprise enregistrée.");
      }

      const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
      setServerOtp(generatedOtp);

      setStep(2);
    } catch (err) {
      setErrorMsg(err.message || "Erreur lors de la vérification.");
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (otpInput !== serverOtp) {
      setErrorMsg("Code OTP incorrect. Veuillez vérifier le code.");
      return;
    }

    setStep(3);
  };

  const handleStep3Submit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    const pin = formData.pinCode ? formData.pinCode.trim() : '';
    const regexComplexite = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

    if (!regexComplexite.test(pin)) {
      setErrorMsg("Le code PIN doit contenir au moins 8 caractères, incluant au moins une majuscule, une minuscule, un chiffre et un caractère spécial.");
      return;
    }

    if (Object.values(modules).filter(Boolean).length === 0) {
      setErrorMsg("Veuillez sélectionner au moins un module.");
      return;
    }

    setStep(4);
  };

  const handleFinalPayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const espacesList = Object.keys(modules).filter((m) => modules[m]);
      const supabase = getSupabaseClient();
      const cleanEmail = formData.email ? formData.email.trim() : '';
      const cleanPin = formData.pinCode ? formData.pinCode.trim() : '';

      const { error } = await supabase.from('entreprises').insert([
        {
          id_entreprise: formData.entrepriseId,
          nom_entreprise: formData.nomEntreprise,
          email: cleanEmail,
          telephone: formData.telephone,
          mot_de_passe: cleanPin,
          code_pin_activation: cleanPin,
          espaces_souscrits: espacesList,
          duree_abonnement_mois: facturation.nbMois,
          limite_utilisateurs: facturation.nbUsers,
          statut_licence: 'ACTIF',
        },
      ]);

      if (error) {
        throw new Error(error.message);
      }

      setStep(5);
    } catch (err) {
      console.error("Erreur enregistrement Supabase mobile:", err);
      setErrorMsg("Erreur de connexion au serveur (Failed to fetch). Vérifiez votre signal mobile et réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-3 sm:p-6 font-sans">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden">
        
        <div className="bg-[#005a5b] text-white text-center px-6 py-8 flex flex-col items-center justify-center relative">
          <div className="bg-white text-[#005a5b] font-black text-xl px-4 py-2 rounded-2xl shadow-md mb-3 tracking-wider">
            4TS
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Suite Manager
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm mt-1 font-medium">
            {step === 5 ? 'Souscription Validée' : 'Étape ' + step + ' sur 4'}
          </p>
        </div>

        <div className="p-5 sm:p-8">
          
          {errorMsg && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-sm font-semibold text-center shadow-sm">
              {errorMsg}
            </div>
          )}

          {step === 5 ? (
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl font-bold shadow-sm">
                ✓
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Félicitations pour votre souscription !</h2>
                <p className="text-slate-600 text-sm mt-1">
                  Votre espace <strong>{formData.nomEntreprise}</strong> est enregistré sur le système <strong>4TS Suite Manager</strong>.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-sm space-y-2">
                <p><strong>ID Unique :</strong> <span className="text-[#005a5b] font-mono font-bold">{formData.entrepriseId}</span></p>
                <p><strong>Administrateur :</strong> {formData.email}</p>
                <p><strong>Modules :</strong> {Object.keys(modules).filter(m => modules[m]).join(', ')}</p>
              </div>

              <div className="space-y-3 pt-2">
                <a
                  href={`/dashboard?entreprise=${formData.entrepriseId}`}
                  className="block w-full bg-[#005a5b] hover:bg-[#004243] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition text-center"
                >
                  Accéder à mon espace Web ({formData.entrepriseId})
                </a>
              </div>
            </div>
          ) : (
            <>
              {step === 1 && (
                <form onSubmit={handleStep1Submit} className="space-y-5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      ID Unique (Généré par le système)
                    </label>
                    <input
                      type="text"
                      disabled
                      value={formData.entrepriseId}
                      className="w-full bg-slate-100 border border-slate-300 rounded-xl px-3.5 py-3 text-sm text-[#005a5b] font-mono font-bold cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-orange-600 mb-1.5">
                      Nom de votre Entreprise / Activité <span className="text-orange-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="nomEntreprise"
                      required
                      value={formData.nomEntreprise}
                      onChange={handleChange}
                      placeholder="Ex: ISMA Logistique ou Mon Activité"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005a5b]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Adresse E-mail Admin <span className="text-orange-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="contact@entreprise.cm"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005a5b]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Téléphone / WhatsApp <span className="text-orange-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="telephone"
                        required
                        value={formData.telephone}
                        onChange={handleChange}
                        placeholder="Ex: 690000000"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005a5b]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#007a78] hover:bg-[#005a5b] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition duration-200 mt-2"
                  >
                    {loading ? 'Vérification...' : 'Obtenir mon code OTP'}
                  </button>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleStep2Submit} className="space-y-5 text-center">
                  <p className="text-sm text-slate-600">
                    Code de vérification généré pour <strong>{formData.email}</strong>. 
                    <br />*(Code de simulation actif : <strong className="text-orange-600 font-mono text-base">{serverOtp}</strong>)*
                  </p>

                  <div className="max-w-xs mx-auto">
                    <input
                      type="text"
                      maxLength={4}
                      required
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      placeholder="• • • •"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-4 text-center text-2xl tracking-widest font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005a5b]"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="w-1/2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3 rounded-xl transition"
                    >
                      Retour
                    </button>
                    <button
                      type="submit"
                      className="w-1/2 bg-[#007a78] hover:bg-[#005a5b] text-white font-bold py-3 rounded-xl transition shadow-lg"
                    >
                      Valider l'OTP
                    </button>
                  </div>
                </form>
              )}

              {step === 3 && (
                <form onSubmit={handleStep3Submit} className="space-y-5">
                  
                  {/* SÉLECTEUR DE TYPE D'OFFRE (Personnel vs Entreprise) */}
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-orange-600 mb-2">
                      Type d'utilisation <span className="text-orange-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div
                        onClick={() => { setTypeOffre('personnel'); setFormData({...formData, utilisateurs: 1}); }}
                        className={`p-3 rounded-xl border text-center cursor-pointer transition select-none ${
                          typeOffre === 'personnel' ? 'border-[#005a5b] bg-[#005a5b]/10 font-bold text-[#005a5b] shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        <div className="text-sm">👤 Personnel (Solo)</div>
                        <div className="text-[10px] text-slate-500 font-normal">1 Utilisateur unique</div>
                      </div>

                      <div
                        onClick={() => setTypeOffre('entreprise')}
                        className={`p-3 rounded-xl border text-center cursor-pointer transition select-none ${
                          typeOffre === 'entreprise' ? 'border-[#005a5b] bg-[#005a5b]/10 font-bold text-[#005a5b] shadow-sm' : 'border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        <div className="text-sm">🏢 Entreprise</div>
                        <div className="text-[10px] text-slate-500 font-normal">Multi-utilisateurs</div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                      Code PIN d'Activation <span className="text-orange-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPin ? "text" : "password"}
                        name="pinCode"
                        required
                        value={formData.pinCode}
                        onChange={handleChange}
                        placeholder="Ex: 4Ts@2026!"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-24 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005a5b]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 text-xs font-bold"
                      >
                        {showPin ? '👁️ Masquer' : '👁️ Afficher'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-orange-600 mb-2">
                      Espaces Souhaités
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.keys(modules).map((mod) => (
                        <div
                          key={mod}
                          onClick={() => handleModuleChange(mod)}
                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition select-none ${
                            modules[mod]
                              ? 'border-[#005a5b] bg-[#005a5b]/5 text-[#005a5b] font-bold shadow-sm'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              checked={modules[mod]}
                              onChange={() => {}}
                              className="w-4 h-4 text-[#005a5b] accent-[#005a5b] rounded border-slate-300 mr-2.5"
                            />
                            <span className="text-sm">{mod}</span>
                          </div>
                          {typeOffre === 'entreprise' && (
                            <span className="text-[10px] text-slate-400 font-normal">
                              +{TARIFS_MODULES[mod].installation.toLocaleString()} F
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Durée (Mois)
                      </label>
                      <input
                        type="number"
                        name="duree"
                        min="1"
                        value={formData.duree}
                        onChange={handleChange}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#005a5b]"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                        Utilisateurs
                      </label>
                      <input
                        type="number"
                        name="utilisateurs"
                        min="1"
                        disabled={typeOffre === 'personnel'}
                        value={typeOffre === 'personnel' ? 1 : formData.utilisateurs}
                        onChange={handleChange}
                        className={`w-full border rounded-xl px-3.5 py-3 text-sm ${
                          typeOffre === 'personnel' ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-300 font-bold' : 'bg-slate-50 text-slate-800 border-slate-200 focus:bg-white focus:ring-2 focus:ring-[#005a5b]'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2 text-xs text-slate-600">
                    <div className="flex justify-between">
                      <span>Frais d'installation :</span>
                      <span className="font-semibold">{facturation.fraisInstallation.toLocaleString()} XAF</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Abonnement :</span>
                      <span className="font-semibold">{facturation.abonnementBrut.toLocaleString()} XAF</span>
                    </div>
                    {facturation.remisePct > 0 && (
                      <div className="flex justify-between text-emerald-600 font-bold">
                        <span>Remise ({facturation.remisePct}%) :</span>
                        <span>-{facturation.montantRemise.toLocaleString()} XAF</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between items-center text-slate-900 font-extrabold text-sm">
                      <span>MONTANT TOTAL :</span>
                      <span className="text-orange-600 text-lg">{facturation.totalGeneral.toLocaleString()} XAF</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition duration-200 mt-2"
                  >
                    Procéder au Paiement
                  </button>
                </form>
              )}

              {step === 4 && (
                <form onSubmit={handleFinalPayment} className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-1.5 text-xs text-slate-700">
                    <p className="text-[11px] text-slate-400 uppercase font-bold mb-2">Récapitulatif de la commande</p>
                    <p><strong>Profil :</strong> {typeOffre === 'personnel' ? 'Personnel (Solo)' : 'Entreprise'}</p>
                    <p><strong>Nom :</strong> {formData.nomEntreprise} (<span className="font-mono text-[#005a5b] font-bold">{formData.entrepriseId}</span>)</p>
                    <p><strong>Espaces souscrits :</strong> {Object.keys(modules).filter(m => modules[m]).join(', ')}</p>
                    <p><strong>Période & Volume :</strong> {facturation.nbMois} Mois — {facturation.nbUsers} Utilisateur(s)</p>
                    <p className="text-sm pt-1"><strong>Montant Net à Payer :</strong> <span className="text-orange-600 font-extrabold text-base">{facturation.totalGeneral.toLocaleString()} XAF</span></p>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-bold uppercase text-slate-700 text-center">
                      Mode de simulation de paiement :
                    </label>

                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      <div
                        onClick={() => setPaymentMethod('om')}
                        className={`p-3 rounded-xl border text-center cursor-pointer transition flex flex-col items-center justify-center ${
                          paymentMethod === 'om' ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500 font-bold' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-black text-xs mb-1">OM</div>
                        <span className="text-[11px] text-slate-800 font-semibold">Orange Money</span>
                      </div>

                      <div
                        onClick={() => setPaymentMethod('momo')}
                        className={`p-3 rounded-xl border text-center cursor-pointer transition flex flex-col items-center justify-center ${
                          paymentMethod === 'momo' ? 'border-yellow-500 bg-yellow-50/60 ring-2 ring-yellow-500 font-bold' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-yellow-400 text-slate-900 flex items-center justify-center font-black text-xs mb-1">MoMo</div>
                        <span className="text-[11px] text-slate-800 font-semibold">MTN MoMo</span>
                      </div>

                      <div
                        onClick={() => setPaymentMethod('visa')}
                        className={`p-3 rounded-xl border text-center cursor-pointer transition flex flex-col items-center justify-center ${
                          paymentMethod === 'visa' ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-600 font-bold' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs mb-1">VISA</div>
                        <span className="text-[11px] text-slate-800 font-semibold">Carte Bancaire</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="w-1/3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-3.5 rounded-xl transition text-sm"
                    >
                      Retour
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-2/3 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg text-sm"
                    >
                      {loading ? 'Validation...' : 'Valider le paiement'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          <p className="text-center text-[11px] text-slate-400 mt-6 font-medium">
            Plateforme sécurisée — 4TS Suite Manager Ecosystem
          </p>

        </div>
      </div>
    </div>
  );
}