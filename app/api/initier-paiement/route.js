import { NextResponse } from 'next/server';
import dns from 'dns';

// Correction pour forcer l'IPv4 et éviter les erreurs réseau en local
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
        error: "Configuration CinetPay manquante dans les variables d'environnement." 
      }, { status: 400 });
    }

    if (!transaction_id || !amount) {
      return NextResponse.json({ success: false, error: "Paramètres de paiement manquants." }, { status: 400 });
    }

    // Récupération dynamique de l'origine (fonctionne sur Vercel et en local)
    const origin = request.headers.get('origin') || 'https://4ts-suite-manager.vercel.app';

    // Appel officiel et sécurisé vers l'API CinetPay V2
    const response = await fetch('https://api-checkout.cinetpay.com/v2/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apikey: apiKey,
        site_id: siteId,
        transaction_id: transaction_id,
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
      }),
    });

    const result = await response.json();

    if (result.code === '200' && result.data && result.data.payment_url) {
      return NextResponse.json({ success: true, payment_url: result.data.payment_url });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: `Erreur CinetPay [${result.code}] : ${result.message || 'Vérifiez vos identifiants'}` 
      }, { status: 400 });
    }

  } catch (err) {
    return NextResponse.json({ success: false, error: "Erreur réseau / fetch failed : " + err.message }, { status: 500 });
  }
}