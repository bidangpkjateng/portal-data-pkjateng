/**
 * Raw Google Sheets proxy for the Bidang PK portal.
 * Deploy as Web app: Execute as Me, Who has access: Anyone.
 * It reads getDataRange(), so a Basic Filter/Filter View in the sheet does
 * not remove rows from the data returned to the website.
 */
function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    const id = String(p.id || '').trim();
    const sheetName = String(p.sheet || '').trim();
    if (!id || !sheetName) return json_({ok:false,error:'Missing id or sheet'});

    const ss = SpreadsheetApp.openById(id);
    const sh = ss.getSheetByName(sheetName);
    if (!sh) return json_({ok:false,error:'Sheet not found: '+sheetName});

    // getDataRange/getDisplayValues reads the actual grid, not the currently
    // visible rows. This is intentional: the website must ignore sheet filters.
    const rows = sh.getDataRange().getDisplayValues();
    const headers = rows.length ? rows[0] : [];
    return json_({ok:true, spreadsheetId:id, sheet:sheetName, headers:headers, rows:rows});
  } catch (err) {
    return json_({ok:false,error:String(err && err.message || err)});
  }
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
