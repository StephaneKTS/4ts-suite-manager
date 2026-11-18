import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request) {
  try {
    const body = await request.json();
    const { transaction_id, amount, description, customer_name, customer_email, customer_phone_number } = body;

    const apiKey = process.env.CINETPAY_API_KEY || process.env.NEXT_PUBLIC_CINETPAY_API_KEY;
    const apiPassword = process.env.CINETPAY_API_PASSWORD;

    if (!apiKey || !apiPassword) {
      return NextResponse.json({ 
        success: false, 
        error: "Configuration CinetPay manquante dans les variables Vercel (API_KEY ou API_PASSWORD)." 
      }, { status: 400 });
    }

    if (!transaction_id || !amount) {
      return NextResponse.json({ success: false, error: "Paramètres de paiement manquants." }, { status: 400 });
    }

    // Étape 1 : Obtenir le Jeton d'accès (OAuth) auprès de la nouvelle API Aurore
    const authResponse = await fetch('https://api.cinetpay.net/v1/oauth/login', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey.trim(),
        api_password: apiPassword.trim(),
      }),
    });

    const authResult = await authResponse.json();

    if (authResult.code !== 200 || !authResult.access_token) {
      return NextResponse.json({ 
        success: false, 
        error: `Erreur Authentification CinetPay [${authResult.code || 'Inconnu'}] : ${authResult.message || 'Identifiants invalides'}` 
      }, { status: 400 });
    }

    const accessToken = authResult.access_token;
    const origin = request.headers.get('origin') || 'https://4ts-suite-manager.vercel.app';

    // Étape 2 : Initialiser la transaction de paiement web avec le token Bearer
    const payload = {
      currency: 'XAF',
      merchant_transaction_id: String(transaction_id),
      amount: Number(amount),
      lang: 'fr',
      designation: description || 'Souscription 4TS Suite Manager',
      client_email: customer_email || 'client@4ts.cm',
      client_first_name: customer_name || 'Client',
      client_last_name: 'Admin',
      client_phone_number: customer_phone_number || '600000000',
      success_url: `${origin}/souscription?transaction_id=${transaction_id}`,
      failed_url: `${origin}/souscription`,
    };

    const paymentResponse = await fetch('https://api.cinetpay.net/v1/payment', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const paymentResult = await paymentResponse.json();

    if (paymentResult.code === 200 && paymentResult.data && paymentResult.data.payment_url) {
      return NextResponse.json({ success: true, payment_url: paymentResult.data.payment_url });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: `Erreur CinetPay [${paymentResult.code}] : ${paymentResult.message || 'Échec d\'initialisation'}` 
      }, { status: 400 });
    }

  } catch (err) {
    return NextResponse.json({ success: false, error: "Erreur passerelle : " + err.message }, { status: 500 });
  }
}