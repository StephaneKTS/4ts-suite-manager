import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const { transaction_id, entrepriseId, formData, modules, facturation } = await request.json();

    if (!transaction_id || !entrepriseId) {
      return NextResponse.json({ success: false, error: "Paramètres manquants." }, { status: 400 });
    }

    // 1. Interroger l'API CinetPay pour vérifier le statut réel de la transaction
    const responseCheck = await fetch('https://api-checkout.cinetpay.com/v2/payment/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apikey: process.env.CINETPAY_API_KEY || process.env.NEXT_PUBLIC_CINETPAY_API_KEY,
        site_id: process.env.CINETPAY_SITE_ID || process.env.NEXT_PUBLIC_CINETPAY_SITE_ID,
        transaction_id: transaction_id
      })
    });

    const result = await responseCheck.json();

    // 2. Vérification stricte du code de succès CinetPay ('00' = payé et accepté)
    if (result.code === '00' && result.data && result.data.status === 'ACCEPTED') {
      
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { auth: { persistSession: false } }
      );

      const espacesList = Object.keys(modules).filter((m) => modules[m]);
      if (espacesList.length === 0) espacesList.push('BOUTIQUE');
      const moduleActifInitial = espacesList[0].toUpperCase();
      const cleanEmail = formData.email ? formData.email.trim() : '';
      const cleanPin = formData.pinCode ? formData.pinCode.trim() : 'Keita@shop50';
      const nomAdmin = formData.nomEntreprise ? formData.nomEntreprise.trim() : 'ADMINISTRATEUR';

      // 3. Insertion de l'entreprise en base
      const { error: entError } = await supabase.from('entreprises').insert([
        {
          id_entreprise: entrepriseId,
          nom_entreprise: formData.nomEntreprise,
          email: cleanEmail,
          telephone: formData.telephone,
          mot_de_passe: cleanPin,
          code_pin_activation: cleanPin,
          espaces_souscrits: espacesList,
          module_actif: moduleActifInitial,
          duree_abonnement_mois: facturation.nbMois,
          limite_utilisateurs: facturation.nbUsers,
          statut_licence: 'ACTIF',
        },
      ]);

      if (entError) {
        throw new Error("Erreur insertion entreprise : " + entError.message);
      }

      // 4. Création automatique de l'administrateur et liaison des rôles
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

        // Insertion dans la table utilisateurs
        await supabase.from('utilisateurs').insert([
          {
            id_entreprise: entrepriseId,
            module: moduleNom,
            nom_complet: nomAdmin,
            prenom: '',
            email: cleanEmail,
            telephone: formData.telephone,
            mot_de_passe: cleanPin,
            id_role: roleAdminId,
            nom_role: 'ADMINISTRATEUR',
            statut: 'ACTIF',
            acces_application: true,
            permissions: { _plein_acces: true }
          }
        ]);
      }

      return NextResponse.json({ success: true, message: "Paiement validé et compte créé avec succès." });
    } else {
      return NextResponse.json({ success: false, message: "Le paiement n'a pas été validé par l'agrégateur." }, { status: 400 });
    }

  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}