import { NextResponse } from 'next/server';
import dns from 'dns';

try {
  dns.setDefaultResultOrder('ipv4first');
} catch (e) {
  // Ignorer si non supporté
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { transaction_id, amount, description, customer_name, customer_email, customer_phone_number } = body;

    const apiKey = process.env.CINETPAY_API_KEY || process.env.NEXT_PUBLIC_CINETPAY_API_KEY;
    const siteId = process.env.CINETPAY_SITE_ID || process.env.NEXT_PUBLIC_CINETPAY_SITE_ID;

    if (!apiKey || !siteId) {
      return NextResponse.json({ 
        success: false, 
        error: "Configuration CinetPay manquante dans les variables Vercel." 
      }, { status: 400 });
    }

    if (!transaction_id || !amount) {
      return NextResponse.json({ success: false, error: "Paramètres de paiement manquants." }, { status: 400 });
    }

    const origin = request.headers.get('origin') || 'https://4ts-suite-manager.vercel.app';

    const payload = {
      apikey: apiKey.trim(),
      site_id: siteId.trim(),
      transaction_id: String(transaction_id),
      amount: Number(amount),
      currency: 'XAF',
      description: description || 'Souscription 4TS Suite Manager',
      return_url: `${origin}/souscription?transaction_id=${transaction_id}`,
      cancel_url: `${origin}/souscription`,
      notify_url: 'https://vtdqodqhkdxanrelxtrq.supabase.co/rest/v1/rpc/webhook_paiement',
      customer_name: customer_name || 'Client',
      customer_surname: 'Admin',
      customer_email: customer_email || 'client@4ts.cm',
      customer_phone_number: customer_phone_number || '600000000',
      customer_country: 'CM',
      channels: 'ALL',
      lang: 'fr',
    };

    // Appel serveur à serveur vers CinetPay (sécurisé, sans restriction CORS de navigateur)
    const response = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (result.code === '200' && result.data && result.data.payment_url) {
      return NextResponse.json({ success: true, payment_url: result.data.payment_url });
    } else {
      console.error("Erreur CinetPay API :", result);
      return NextResponse.json({ 
        success: false, 
        error: `Erreur CinetPay [${result.code}] : ${result.message || 'Identifiants invalides'}` 
      }, { status: 400 });
    }

  } catch (err) {
    console.error("Erreur critique fetch CinetPay:", err);
    return NextResponse.json({ success: false, error: "Erreur réseau / fetch failed : " + err.message }, { status: 500 });
  }
}