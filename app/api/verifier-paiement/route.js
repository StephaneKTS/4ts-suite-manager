import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

export async function POST(request) {
  try {
    const body = await request.json();
    const { transaction_id, entrepriseId, formData, modules, facturation } = body;

    if (!transaction_id || !entrepriseId) {
      return NextResponse.json({ success: false, error: "Paramètres de transaction manquants." }, { status: 400 });
    }

    const apiKey = process.env.CINETPAY_API_KEY || process.env.NEXT_PUBLIC_CINETPAY_API_KEY;
    const siteId = process.env.CINETPAY_SITE_ID || process.env.NEXT_PUBLIC_CINETPAY_SITE_ID;

    if (!apiKey || !siteId) {
      return NextResponse.json({ success: false, error: "Configuration CinetPay manquante sur le serveur." }, { status: 500 });
    }

    // Interrogation officielle et obligatoire de l'API de vérification CinetPay
    const responseCheck = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apikey: apiKey.trim(),
        site_id: siteId.trim(),
        transaction_id: String(transaction_id).trim(),
      }),
    });

    const result = await responseCheck.json();

    const paiementValide =
      result.code === '00' &&
      result.data &&
      result.data.status === 'ACCEPTED';

    if (!paiementValide) {
      return NextResponse.json({
        success: false,
        message: `Paiement non validé par CinetPay (${result.data?.status || result.message || 'Statut en attente ou refusé'}).`
      }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    );

    const espacesList = modules ? Object.keys(modules).filter((m) => modules[m]) : [];
    if (espacesList.length === 0) espacesList.push('BOUTIQUE');
    const moduleActifInitial = espacesList[0].toUpperCase();
    const cleanEmail = formData?.email ? formData.email.trim() : '';
    const cleanPin = formData?.pinCode ? formData.pinCode.trim() : '';
    const nomAdmin = formData?.nomEntreprise ? formData.nomEntreprise.trim() : 'ADMINISTRATEUR';
    const nbMois = facturation?.nbMois || 1;
    const nbUsers = facturation?.nbUsers || 1;

    // Insertion ou mise à jour sécurisée de l'entreprise en base
    const { error: entError } = await supabase.from('entreprises').upsert([
      {
        id_entreprise: entrepriseId,
        nom_entreprise: nomAdmin,
        email: cleanEmail,
        telephone: formData?.telephone || '',
        mot_de_passe: cleanPin,
        code_pin_activation: cleanPin,
        espaces_souscrits: espacesList,
        module_actif: moduleActifInitial,
        duree_abonnement_mois: nbMois,
        limite_utilisateurs: nbUsers,
        statut_licence: 'ACTIF',
      },
    ], { onConflict: 'id_entreprise' });

    if (entError) {
      throw new Error("Erreur insertion entreprise : " + entError.message);
    }

    // Création automatique de l'administrateur et liaison des rôles par module
    for (const mod of espacesList) {
      const moduleNom = mod.toUpperCase();

      let roleAdminId = null;
      const { data: roleData } = await supabase
        .from('roles')
        .select('id')
        .eq('id_entreprise', entrepriseId)
        .eq('module', moduleNom)
        .eq('nom_role', 'ADMINISTRATEUR')
        .maybeSingle();

      if (roleData) {
        roleAdminId = roleData.id;
      } else {
        const { data: newRole } = await supabase
          .from('roles')
          .insert([{
            id_entreprise: entrepriseId,
            module: moduleNom,
            nom_role: 'ADMINISTRATEUR',
            description: 'Rôle système administrateur avec tous les droits par défaut.',
            permissions: { _plein_acces: true }
          }])
          .select()
          .single();

        if (newRole) roleAdminId = newRole.id;
      }

      const { error: userError } = await supabase.from('utilisateurs').upsert([
        {
          id_entreprise: entrepriseId,
          module: moduleNom,
          nom_complet: nomAdmin,
          prenom: '',
          email: cleanEmail,
          telephone: formData?.telephone || '',
          mot_de_passe: cleanPin,
          id_role: roleAdminId,
          nom_role: 'ADMINISTRATEUR',
          statut: 'ACTIF',
          acces_application: true,
          permissions: { _plein_acces: true }
        }
      ], { onConflict: 'id_entreprise,email,module' });

      if (userError) {
        throw new Error(`Erreur création administrateur (${moduleNom}) : ` + userError.message);
      }
    }

    return NextResponse.json({ success: true, message: "Paiement vérifié et compte activé avec succès." });

  } catch (err) {
    return NextResponse.json({ success: false, error: "Erreur vérification paiement : " + err.message }, { status: 500 });
  }
}