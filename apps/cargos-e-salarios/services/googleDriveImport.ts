// ============================================================================
// googleDriveImport — Lê planilhas do Google Drive via tools habilitadas
//
// Planilha fixa:    17MdQs2plUl8TM5H_lji8ENNrt2veTzOqgSUJoMMQ0Nw
// Tool principal:   get_dados_drive → { spreadsheet_id, sheet_name } → { result.sheets[] }
// Tool de download: mcp_google_drive_drive_download_content → { file_id } → texto/CSV
// ============================================================================

import { tool } from '../lib/seiva';

const SPREADSHEET_ID = '17MdQs2plUl8TM5H_lji8ENNrt2veTzOqgSUJoMMQ0Nw';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
}

// ── Lista as abas da planilha fixa (usa get_dados_drive com spreadsheet_id fixo) ──
export async function searchDriveSheets(_query?: string): Promise<DriveFile[]> {
  try {
    console.log('[GoogleDrive] Listando abas da planilha fixa:', SPREADSHEET_ID);
    const result = await tool.run('get_dados_drive', { spreadsheet_id: SPREADSHEET_ID });
    console.log('[GoogleDrive] Resposta raw:', JSON.stringify(result)?.slice(0, 500));

    // A tool retorna { result: { sheets, success, spreadsheet_id } }
    const raw = result?.result ?? result;
    const sheets: any[] = raw?.sheets ?? [];

    // Converte abas em DriveFile com id = nome da aba
    return sheets.map((s: any) => ({
      id: s.sheet ?? s.name ?? '',
      name: s.sheet ?? s.name ?? '',
      mimeType: 'application/vnd.google-apps.spreadsheet',
      modifiedTime: '',
      webViewLink: `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}`,
    })).filter(f => f.id);
  } catch (e: any) {
    console.error('[GoogleDrive] Erro ao listar abas:', e);
    throw new Error('Não foi possível ler a planilha: ' + (e?.message ?? String(e)));
  }
}

// ── Lê o conteúdo de um arquivo como texto ───────────────────────────────
// Usa mcp_google_drive_drive_download_content (Google Drive MCP habilitado)
export async function readSheetContent(fileId: string): Promise<string> {
  console.log('[GoogleDrive] Lendo conteúdo do arquivo:', fileId);

  // Tenta download via Google Drive MCP (mimeType vazio = texto para Sheets)
  try {
    const result = await tool.run('mcp_google_drive_drive_download_content', {
      file_id: fileId,
      export_mime_type: 'text/csv',
    });
    console.log('[GoogleDrive] drive_download_content resposta keys:', Object.keys(result ?? {}));

    // Extrai texto da resposta (pode vir em vários campos)
    const text =
      result?.content ??
      result?.text ??
      result?.data ??
      (typeof result === 'string' ? result : null);

    if (text && typeof text === 'string' && text.trim().length > 10) {
      return text;
    }

    // Base64
    if (result?.base64Content) {
      try { return atob(result.base64Content); } catch { return result.base64Content; }
    }
  } catch (e: any) {
    console.warn('[GoogleDrive] drive_download_content falhou:', e?.message);
  }

  // Fallback: read_file_content via MCP GOOGLE DRIVE (maiúsculo)
  try {
    const result2 = await tool.run('mcp_google_drive_read_file_content', {
      fileId,
      includeComments: false,
    });
    const text2 =
      result2?.content ??
      result2?.text ??
      (typeof result2 === 'string' ? result2 : null);

    if (text2 && typeof text2 === 'string' && text2.trim().length > 10) {
      return text2;
    }
  } catch (e2: any) {
    console.warn('[GoogleDrive] read_file_content falhou:', e2?.message);
  }

  throw new Error('Não foi possível ler o conteúdo do arquivo. Verifique as permissões no Drive.');
}

// ── Metadados de um arquivo pelo ID ──────────────────────────────────────
export async function getFileMetadata(fileId: string): Promise<DriveFile | null> {
  try {
    const result = await tool.run('mcp_google_drive_drive_get_file', {
      file_id: fileId,
    });
    const f = result?.file ?? result;
    if (!f?.id) return null;
    return {
      id: f.id,
      name: f.name ?? f.title ?? '',
      mimeType: f.mimeType ?? '',
      modifiedTime: f.modifiedTime ?? '',
      webViewLink: f.webViewLink ?? '',
    };
  } catch {
    return null;
  }
}
