/**
 * PALPITARE DASHBOARD — Google Apps Script Backend
 * ─────────────────────────────────────────────────
 * SETUP (una sola vez):
 * 1. Ve a https://script.google.com → Nuevo proyecto
 * 2. Nómbralo "Palpitare Sync"
 * 3. Pega TODO este código (reemplaza el código de ejemplo)
 * 4. Guarda (Ctrl+S)
 * 5. Implementar → Nueva implementación
 *    Tipo: Aplicación web
 *    Ejecutar como: Yo
 *    Quién tiene acceso: Cualquier persona
 * 6. Autoriza los permisos cuando te lo pida
 * 7. Copia la URL de implementación (termina en /exec)
 * 8. Pégala en el admin → Configuración → URL de Apps Script
 * 9. Haz clic en "☁️ Sincronizar con cliente"
 * ─────────────────────────────────────────────────
 */

const SHEET_NAME = 'ClientData';

// ── LEER datos (client.html los lee aquí) ────────────────────
function doGet(e) {
  try {
    const brandId = (e.parameter.brand || '').trim();
    const sheet   = getOrCreateSheet();
    const rows    = sheet.getDataRange().getValues();

    // Sin ?brand= → devolver índice de todas las marcas
    if (!brandId) {
      const brands = [];
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0]) brands.push({ id: String(rows[i][0]).trim(), nombre: String(rows[i][1]).trim() });
      }
      return jsonOut({ ok: true, brands });
    }

    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === brandId) {
        let data = {};
        try { data = JSON.parse(rows[i][2] || '{}'); } catch(e) {}
        return jsonOut({ ok: true, brandId, data, updatedAt: rows[i][3] });
      }
    }

    return jsonOut({ ok: false, error: 'Sin datos para brand=' + brandId });
  } catch(err) {
    return jsonOut({ ok: false, error: err.toString() });
  }
}

// ── GUARDAR datos (admin los envía aquí) ─────────────────────
function doPost(e) {
  try {
    // Soporta JSON directo (text/plain) y formulario HTML (form POST)
    let body;
    try { body = JSON.parse(e.postData.contents); }
    catch(pe) { body = JSON.parse(e.parameter.payload || '{}'); }
    const { brandId, data } = body;

    if (!brandId || !data) {
      return jsonOut({ ok: false, error: 'Faltan campos requeridos: brandId, data' });
    }

    const sheet     = getOrCreateSheet();
    const rows      = sheet.getDataRange().getValues();
    const timestamp = new Date().toISOString();
    const jsonStr   = JSON.stringify(data);

    // Actualizar fila existente
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === brandId) {
        sheet.getRange(i + 1, 3).setValue(jsonStr);
        sheet.getRange(i + 1, 4).setValue(timestamp);
        return jsonOut({ ok: true, action: 'updated', brandId, updatedAt: timestamp });
      }
    }

    // Crear nueva fila
    sheet.appendRow([brandId, brandId, jsonStr, timestamp]);
    return jsonOut({ ok: true, action: 'created', brandId, updatedAt: timestamp });
  } catch(err) {
    return jsonOut({ ok: false, error: err.toString() });
  }
}

// ── HELPERS ──────────────────────────────────────────────────
function getOrCreateSheet() {
  const props = PropertiesService.getScriptProperties();
  let ssId = props.getProperty('SPREADSHEET_ID');
  let ss;

  if (ssId) {
    try { ss = SpreadsheetApp.openById(ssId); } catch(e) { ssId = null; }
  }
  if (!ssId) {
    ss = SpreadsheetApp.create('Palpitare ClientData');
    props.setProperty('SPREADSHEET_ID', ss.getId());
  }

  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, 4).setValues([['brandId', 'brandName', 'data', 'updatedAt']]);
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 120);
    sheet.setColumnWidth(2, 160);
    sheet.setColumnWidth(3, 400);
    sheet.setColumnWidth(4, 200);
  }
  return sheet;
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
