'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function GestionTables({ entrepriseId }) {
  const [tables, setTables] = useState([]);
  const [numeroTable, setNumeroTable] = useState('');
  const [espace, setEspace] = useState('SALLE PRINCIPALE');
  const [nombrePlaces, setNombrePlaces] = useState(4);
  const [chargement, setChargement] = useState(false);

  const [listeEspaces, setListeEspaces] = useState([
    'SALLE PRINCIPALE',
    'TERRASSE',
    'VIP',
    'SOUS-SOL',
    'JARDIN'
  ]);

  const [afficherModalChoixEspace, setAfficherModalChoixEspace] = useState(false);
  const [afficherModalAjoutEspace, setAfficherModalAjoutEspace] = useState(false);
  const [nouvelEspaceInput, setNouvelEspaceInput] = useState('');

  const [tableSelectionneeQr, setTableSelectionneeQr] = useState(null);

  const [modalMessage, setModalMessage] = useState({
    visible: false,
    titre: '',
    texte: '',
    type: 'succes'
  });

  const chargerTables = async () => {
    if (!entrepriseId) return;
    try {
      const { data, error } = await supabase
        .from('tables_restaurant')
        .select('*')
        .eq('id_entreprise', entrepriseId)
        .order('espace', { ascending: true })
        .order('numero_table', { ascending: true });

      if (error) throw error;
      setTables(data || []);

      if (data && data.length > 0) {
        const espacesUniques = Array.from(new Set(data.map(t => (t.espace || '').toUpperCase())));
        setListeEspaces(prev => {
          const fusion = Array.from(new Set([...prev, ...espacesUniques]));
          return fusion;
        });
      }
    } catch (err) {
      console.error('Erreur chargement tables :', err.message);
    }
  };

  useEffect(() => {
    chargerTables();
  }, [entrepriseId]);

  const validerAjoutEspace = (e) => {
    e.preventDefault();
    const espaceClean = nouvelEspaceInput.trim().toUpperCase();
    if (!espaceClean) return;

    if (!listeEspaces.includes(espaceClean)) {
      setListeEspaces(prev => [...prev, espaceClean]);
    }
    setEspace(espaceClean);
    setNouvelEspaceInput('');
    setAfficherModalAjoutEspace(false);
    setAfficherModalChoixEspace(false);
  };

  const ajouterTable = async (e) => {
    e.preventDefault();
    if (!numeroTable.trim()) {
      setModalMessage({
        visible: true,
        titre: 'Champ requis',
        texte: 'Veuillez entrer un numéro ou un nom de table.',
        type: 'erreur'
      });
      return;
    }

    const espaceFinal = (espace || '').trim().toUpperCase();
    if (!espaceFinal) {
      setModalMessage({
        visible: true,
        titre: 'Champ requis',
        texte: 'Veuillez sélectionner un espace.',
        type: 'erreur'
      });
      return;
    }

    setChargement(true);
    try {
      const { error } = await supabase
        .from('tables_restaurant')
        .insert([{
          id_entreprise: entrepriseId,
          numero_table: numeroTable.trim().toUpperCase(),
          espace: espaceFinal,
          nombre_places: parseInt(nombrePlaces) || 4,
          disponible: true
        }]);

      if (error) throw error;

      setModalMessage({
        visible: true,
        titre: 'Succès 🎉',
        texte: `La table "${numeroTable.trim().toUpperCase()}" a été créée avec succès.`,
        type: 'succes'
      });

      setNumeroTable('');
      setNombrePlaces(4);
      chargerTables();
    } catch (err) {
      setModalMessage({
        visible: true,
        titre: 'Erreur',
        texte: 'Erreur lors de la création : ' + err.message,
        type: 'erreur'
      });
    } finally {
      setChargement(false);
    }
  };

  const supprimerTable = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette table ?')) return;

    try {
      const { error } = await supabase
        .from('tables_restaurant')
        .delete()
        .eq('id', id);

      if (error) throw error;
      chargerTables();
    } catch (err) {
      setModalMessage({
        visible: true,
        titre: 'Erreur',
        texte: 'Erreur lors de la suppression : ' + err.message,
        type: 'erreur'
      });
    }
  };

  // 🖨️ IMPRESSION D'UN SEUL QR CODE
  const imprimerChevaletTable = (tableObj) => {
    if (!tableObj) return;
    const urlClient = `${window.location.origin}/client?entrepriseId=${entrepriseId}&table=${encodeURIComponent(tableObj.numero_table)}`;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(urlClient)}`;

    const fenetreImpression = window.open('', '_blank', 'width=600,height=750');
    if (!fenetreImpression) {
      alert("Veuillez autoriser les fenêtres surgissantes pour exporter le QR code.");
      return;
    }

    fenetreImpression.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>QR Code - ${tableObj.numero_table}</title>
        <style>
          @page { size: A6 portrait; margin: 0; }
          body {
            margin: 0; padding: 20px;
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            display: flex; justify-content: center; align-items: center;
            min-height: 100vh; background: #ffffff; color: #0f172a; box-sizing: border-box;
          }
          .carte-table {
            width: 100%; max-width: 340px;
            border: 3px solid #0f172a; border-radius: 24px;
            padding: 28px 20px; text-align: center; background: #ffffff; box-sizing: border-box;
          }
          .marque { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #64748b; margin-bottom: 6px; }
          .espace { display: inline-block; background: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; font-size: 12px; font-weight: 900; text-transform: uppercase; padding: 4px 12px; border-radius: 999px; margin-bottom: 18px; }
          .cadre-qr { background: #ffffff; border: 2px solid #e2e8f0; border-radius: 20px; padding: 14px; display: inline-block; margin-bottom: 18px; }
          .cadre-qr img { width: 210px; height: 210px; display: block; }
          .nom-table { font-size: 28px; font-weight: 900; text-transform: uppercase; margin: 0 0 6px 0; color: #0f172a; letter-spacing: -0.5px; }
          .instruction { font-size: 13px; font-weight: 800; text-transform: uppercase; color: #ea580c; margin: 0 0 6px 0; }
          .places { font-size: 11px; font-weight: 700; color: #64748b; margin: 0; }
        </style>
      </head>
      <body>
        <div class="carte-table">
          <div class="marque">4TS Suite Manager</div>
          <div class="espace">📍 ${tableObj.espace}</div>
          <div class="cadre-qr">
            <img id="qr-img" src="${qrApiUrl}" alt="QR Code" />
          </div>
          <h1 class="nom-table">${tableObj.numero_table}</h1>
          <p class="instruction">📱 Scannez pour commander</p>
          <p class="places">Capacité : ${tableObj.nombre_places} places</p>
        </div>
        <script>
          const img = document.getElementById('qr-img');
          function lancer() { setTimeout(() => { window.focus(); window.print(); window.close(); }, 300); }
          if (img.complete) { lancer(); } else { img.onload = lancer; img.onerror = lancer; }
        </script>
      </body>
      </html>
    `);
    fenetreImpression.document.close();
  };

  // 🖨️ IMPRESSION DE TOUS LES QR CODES SUR UNE SEULE GRILLE A4
  const imprimerTousLesQrCodes = () => {
    if (tables.length === 0) {
      alert("Aucune table enregistrée à imprimer.");
      return;
    }

    const fenetreImpression = window.open('', '_blank', 'width=900,height=900');
    if (!fenetreImpression) {
      alert("Veuillez autoriser les fenêtres surgissantes pour exporter tous les QR codes.");
      return;
    }

    const cartesHtml = tables.map(t => {
      const urlClient = `${window.location.origin}/client?entrepriseId=${entrepriseId}&table=${encodeURIComponent(t.numero_table)}`;
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(urlClient)}`;
      return `
        <div class="carte-table">
          <div class="marque">4TS Suite Manager</div>
          <div class="espace">📍 ${t.espace}</div>
          <div class="cadre-qr">
            <img src="${qrApiUrl}" alt="QR Code ${t.numero_table}" />
          </div>
          <div class="nom-table">${t.numero_table}</div>
          <div class="instruction">📱 Scannez pour commander</div>
          <div class="places">Capacité : ${t.nombre_places} places</div>
        </div>
      `;
    }).join('');

    fenetreImpression.document.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <title>Impression Groupée - QR Codes Tables</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body {
            margin: 0; padding: 10px;
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff; color: #0f172a;
          }
          .titre-section {
            text-align: center; font-size: 16px; font-weight: 900; text-transform: uppercase;
            margin-bottom: 20px; color: #0f172a; border-bottom: 2px solid #0f172a; padding-bottom: 8px;
          }
          .grille {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            justify-items: center;
          }
          .carte-table {
            width: 100%; max-width: 260px;
            border: 2px solid #0f172a; border-radius: 18px;
            padding: 16px 12px; text-align: center; background: #ffffff;
            box-sizing: border-box; page-break-inside: avoid;
          }
          .marque { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 4px; }
          .espace { display: inline-block; background: #fff7ed; color: #ea580c; border: 1px solid #fed7aa; font-size: 10px; font-weight: 900; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; margin-bottom: 10px; }
          .cadre-qr { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 8px; display: inline-block; margin-bottom: 10px; }
          .cadre-qr img { width: 130px; height: 130px; display: block; }
          .nom-table { font-size: 20px; font-weight: 900; text-transform: uppercase; margin: 0 0 4px 0; color: #0f172a; }
          .instruction { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #ea580c; margin: 0 0 3px 0; }
          .places { font-size: 9px; font-weight: 700; color: #64748b; margin: 0; }
        </style>
      </head>
      <body>
        <div class="titre-section">QR Codes de toutes les tables (${tables.length} tables)</div>
        <div class="grille">
          ${cartesHtml}
        </div>
        <script>
          window.onload = function() {
            setTimeout(() => {
              window.focus();
              window.print();
              window.close();
            }, 500);
          };
        </script>
      </body>
      </html>
    `);
    fenetreImpression.document.close();
  };

  const tablesParEspace = tables.reduce((acc, t) => {
    const esp = t.espace || 'GÉNÉRAL';
    if (!acc[esp]) acc[esp] = [];
    acc[esp].push(t);
    return acc;
  }, {});

  return (
    <div className="w-full max-w-3xl mx-auto p-2 sm:p-4 space-y-4 font-sans text-xs box-border overflow-hidden">
      
      {/* Formulaire d'ajout */}
      <div className="bg-white p-3 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h2 className="font-black text-slate-900 uppercase text-sm truncate">🪑 Gestion & Espaces des Tables</h2>
        <p className="text-slate-500 text-[10px] sm:text-[11px] leading-relaxed">
          Organisez vos tables par espace et générez instantanément leurs QR codes prêts pour l'impression.
        </p>

        <form onSubmit={ajouterTable} className="space-y-3 pt-2 border-t border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="w-full min-w-0">
              <label className="block font-bold text-[9px] text-slate-600 uppercase mb-1 truncate">Numéro / Nom de la table *</label>
              <input
                type="text"
                required
                placeholder="Ex: T-01"
                value={numeroTable}
                onChange={(e) => setNumeroTable(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-black uppercase text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>

            <div className="w-full min-w-0">
              <label className="block font-bold text-[9px] text-slate-600 uppercase mb-1 truncate">Espace *</label>
              <button
                type="button"
                onClick={() => setAfficherModalChoixEspace(true)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-black uppercase text-slate-900 hover:bg-slate-100 transition flex items-center justify-between cursor-pointer truncate"
              >
                <span className="truncate">📍 {espace}</span>
                <span className="text-orange-600 font-bold ml-1 shrink-0">▼</span>
              </button>
            </div>

            <div className="w-full min-w-0">
              <label className="block font-bold text-[9px] text-slate-600 uppercase mb-1 truncate">Nombre de places *</label>
              <input
                type="number"
                min="1"
                max="50"
                required
                value={nombrePlaces}
                onChange={(e) => setNombrePlaces(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-black text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={chargement}
            className="w-full bg-orange-600 hover:bg-orange-500 text-white font-black py-3 rounded-xl uppercase shadow-md transition cursor-pointer"
          >
            {chargement ? 'Création en cours...' : '➕ Enregistrer la table'}
          </button>
        </form>
      </div>

      {/* En-tête de la liste avec le bouton d'impression groupée */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-1">
        <h3 className="font-black text-slate-900 uppercase text-xs truncate">
          Aperçu par Espace ({tables.length} tables au total)
        </h3>
        {tables.length > 0 && (
          <button
            type="button"
            onClick={imprimerTousLesQrCodes}
            className="bg-slate-900 hover:bg-slate-800 text-white font-black px-3 py-2 rounded-xl text-[10px] uppercase shadow-md transition flex items-center gap-1.5 cursor-pointer w-full sm:w-auto justify-center"
          >
            <span>🖨️ Imprimer tous les QR Codes (A4)</span>
          </button>
        )}
      </div>

      {/* Liste des tables */}
      <div className="space-y-3">
        {tables.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-slate-400 italic font-bold">
            Aucune table enregistrée pour le moment.
          </div>
        ) : (
          Object.entries(tablesParEspace).map(([nomEspace, tablesDeEspace]) => (
            <div key={nomEspace} className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2.5 w-full">
              <div className="flex justify-between items-center border-b pb-2">
                <h4 className="font-black text-orange-600 uppercase text-xs flex items-center gap-1.5 truncate">
                  📍 <span className="truncate">{nomEspace}</span> 
                  <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full text-[9px] shrink-0">({tablesDeEspace.length})</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tablesDeEspace.map((t) => {
                  const lienQrTable = `${window.location.origin}/client?entrepriseId=${entrepriseId}&table=${encodeURIComponent(t.numero_table)}`;

                  return (
                    <div key={t.id} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex justify-between items-center gap-2 shadow-2xs w-full min-w-0">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-black text-slate-900 uppercase text-xs truncate">{t.numero_table}</span>
                          <span className="bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded text-[8px] shrink-0">
                            👥 {t.nombre_places} pl.
                          </span>
                        </div>
                        <p className="text-[9px] font-mono text-slate-400 truncate w-full">
                          {lienQrTable}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setTableSelectionneeQr(t)}
                          className="bg-orange-600 hover:bg-orange-500 text-white font-black px-2 py-1.5 rounded-lg text-[8px] uppercase transition cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Générer et Imprimer le QR Code"
                        >
                          <span>🖨️ QR Code</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => supprimerTable(t.id)}
                          className="bg-red-600 hover:bg-red-500 text-white font-black px-2 py-1.5 rounded-lg text-[8px] uppercase transition cursor-pointer"
                          title="Supprimer"
                        >
                          ❌
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODALE DE VISUALISATION D'UN QR CODE UNIQUE */}
      {tableSelectionneeQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-100 p-6 space-y-4 text-center">
            
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-black text-slate-900 uppercase text-xs">QR Code — {tableSelectionneeQr.numero_table}</h3>
              <button
                type="button"
                onClick={() => setTableSelectionneeQr(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-5 rounded-3xl flex flex-col items-center space-y-3 mx-auto w-full">
              <p className="text-xs font-black uppercase text-orange-600">📍 {tableSelectionneeQr.espace}</p>
              
              <div className="bg-white p-3.5 rounded-2xl border-2 border-slate-200 shadow-sm inline-block">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`${window.location.origin}/client?entrepriseId=${entrepriseId}&table=${tableSelectionneeQr.numero_table}`)}`} 
                  alt="QR Code Table" 
                  className="w-40 h-40 object-contain mx-auto"
                />
              </div>

              <div className="space-y-0.5">
                <h2 className="font-black text-slate-900 text-lg uppercase">{tableSelectionneeQr.numero_table}</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Scannez pour commander sur place</p>
                <p className="text-[9px] text-slate-400 font-bold">Capacité : {tableSelectionneeQr.nombre_places} places</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTableSelectionneeQr(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-2.5 rounded-xl text-xs uppercase transition cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => imprimerChevaletTable(tableSelectionneeQr)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-2.5 rounded-xl text-xs uppercase shadow-md transition cursor-pointer flex items-center justify-center gap-1"
              >
                <span>🖨️ Imprimer / PDF</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODALES DE SÉLECTION / AJOUT D'ESPACE & MESSAGES */}
      {afficherModalChoixEspace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-100 p-5 space-y-4 max-h-[85vh]">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-black text-slate-900 uppercase text-sm">Choisir un espace</h3>
              <button type="button" onClick={() => setAfficherModalChoixEspace(false)} className="text-slate-400 hover:text-slate-600 font-bold text-base cursor-pointer">✕</button>
            </div>
            <div className="space-y-1.5 overflow-y-auto max-h-60 pr-1">
              {listeEspaces.map((esp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => { setEspace(esp); setAfficherModalChoixEspace(false); }}
                  className={`w-full text-left p-3 rounded-xl font-black text-xs uppercase transition flex items-center justify-between cursor-pointer ${
                    espace === esp ? 'bg-orange-600 text-white shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200'
                  }`}
                >
                  <span>📍 {esp}</span>
                  {espace === esp && <span>✓</span>}
                </button>
              ))}
            </div>
            <div className="pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setAfficherModalAjoutEspace(true)} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-3 rounded-xl text-xs uppercase shadow-md transition cursor-pointer">
                <span>➕ Ajouter un espace</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {afficherModalAjoutEspace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-100 p-5 space-y-4 text-center">
            <h3 className="font-black text-slate-900 uppercase text-sm">Nouvel espace</h3>
            <form onSubmit={validerAjoutEspace} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Nom du nouvel espace..."
                value={nouvelEspaceInput}
                onChange={(e) => setNouvelEspaceInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs font-black uppercase text-slate-900 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                autoFocus
              />
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button type="button" onClick={() => setAfficherModalAjoutEspace(false)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black py-3 rounded-xl text-xs uppercase transition cursor-pointer">Retour</button>
                <button type="submit" className="bg-orange-600 hover:bg-orange-500 text-white font-black py-3 rounded-xl text-xs uppercase shadow-md transition cursor-pointer">Créer ✅</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalMessage.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-100 p-6 space-y-4 text-center">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto text-2xl shadow-xs ${modalMessage.type === 'succes' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              {modalMessage.type === 'succes' ? '✅' : '⚠️'}
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-slate-900 uppercase text-sm">{modalMessage.titre}</h3>
              <p className="text-xs text-slate-600 leading-relaxed">{modalMessage.texte}</p>
            </div>
            <button type="button" onClick={() => setModalMessage({ ...modalMessage, visible: false })} className="w-full font-black py-3 rounded-xl text-xs uppercase shadow-md transition cursor-pointer text-white bg-slate-900 hover:bg-slate-800">
              Compris 👍
            </button>
          </div>
        </div>
      )}

    </div>
  );
}