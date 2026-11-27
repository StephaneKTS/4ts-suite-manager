import { NextResponse } from 'next/server';
import * as webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Configuration des clés VAPID pour l'authentification web-push
webpush.setVapidDetails(
  'mailto:contact@4tssuitemanager.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Initialisation de Supabase avec la clé Service Role (contourne le RLS pour l'accès serveur)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    // Le webhook Supabase transmet l'enregistrement inséré dans 'record'
    const record = body.record; 

    if (!record) {
      return NextResponse.json({ success: false, message: 'Aucun enregistrement trouvé' }, { status: 400 });
    }

    // Récupérer les abonnements push enregistrés pour cette entreprise spécifique
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('id_entreprise', record.id_entreprise);

    if (error || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ success: true, message: 'Aucun appareil abonné pour cette entreprise' });
    }

    const numeroAffichage = record.numero_commande ? record.numero_commande.split('-').pop() : 'QR';

    const payload = JSON.stringify({
      title: `🚨 Nouvelle Commande : CMD-${numeroAffichage}`,
      body: `Client : ${record.nom_client || 'Client'} | Table : ${record.numero_table || 'N/A'}`,
      tag: 'commande-urgente',
      url: '/'
    });

    // Envoyer la notification push à tous les appareils connectés de l'entreprise en arrière-plan
    const pushPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (err) {
        // Si l'abonnement du navigateur n'est plus valide ou a expiré (410 / 404), on le supprime
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      }
    });

    await Promise.all(pushPromises);

    return NextResponse.json({ success: true, message: 'Notifications push envoyées avec succès' });
  } catch (err) {
    console.error('Erreur API push :', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}