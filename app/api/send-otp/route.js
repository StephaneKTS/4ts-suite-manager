import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { email, otpCode, nomEntreprise } = await request.json();

    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.SENDER_EMAIL || 'stephs7352@gmail.com';

    if (!apiKey) {
      return NextResponse.json(
        { error: "La clé BREVO_API_KEY n'est pas définie dans .env.local" },
        { status: 500 }
      );
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: { name: "4TS Suite Manager", email: senderEmail },
        to: [{ email: email }],
        subject: "Votre code de vérification OTP - 4TS Suite Manager",
        htmlContent: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 10px;">
            <div style="background-color: #005a5b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">4TS Suite Manager</h1>
              <p style="margin: 5px 0 0; font-size: 14px; color: #a7f3d0;">Validation de votre souscription</p>
            </div>
            <div style="padding: 20px; background-color: #f8fafc;">
              <p>Bonjour,</p>
              <p>Vous avez initié la souscription pour l'entreprise <strong>${nomEntreprise}</strong>.</p>
              <p>Voici votre code de vérification à usage unique (OTP) :</p>
              <div style="text-align: center; margin: 30px 0;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #005a5b; background: #e2e8f0; padding: 10px 20px; border-radius: 8px;">
                  ${otpCode}
                </span>
              </div>
              <p style="font-size: 12px; color: #64748b;">Si vous n'êtes pas à l'origine de cette demande, veuillez ignorer cet e-mail.</p>
            </div>
            <div style="text-align: center; padding: 15px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
              Plateforme sécurisée — 4TS Suite Manager Ecosystem
            </div>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || "Erreur lors de l'envoi via Brevo.");
    }

    return NextResponse.json({ success: true, message: "E-mail OTP envoyé avec succès !" });
  } catch (err) {
    console.error("Erreur API Send OTP :", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}