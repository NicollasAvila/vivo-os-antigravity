// src/client.js
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DEFAULT_URL = 'https://cloud.mogno.ai';

function loadSeivaConfig() {
  try {
    return JSON.parse(readFileSync(join(homedir(), '.seiva', 'config.json'), 'utf8'));
  } catch {
    return {};
  }
}

const seivaCfg = loadSeivaConfig();

const API_KEY =
  process.env.MOGNO_API_KEY ||
  process.env.API_KEY_VIVO_OS ||
  process.env.SEIVA_API_KEY ||
  seivaCfg.api_key;

const BASE_URL =
  process.env.MOGNO_URL ||
  process.env.VIVO_OS_URL ||
  process.env.SEIVA_URL ||
  seivaCfg.url ||
  DEFAULT_URL;

if (!API_KEY) {
  throw new Error('Chave de API não configurada. Defina MOGNO_API_KEY no .env ou execute "npm run setup".');
}

export async function request(method, path, body) {
  const url = `${BASE_URL}/api/v1/mgmt${path}`;
  const options = {
    method,
    headers: {
      'X-Mogno-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);
  const raw = await res.text();

  let json = null;
  if (raw.trim() !== '') {
    try {
      json = JSON.parse(raw);
    } catch {
      throw new Error(`HTTP ${res.status}: Resposta não é JSON`);
    }
  }

  if (!res.ok) {
    const message = json?.error || (json?.errors ? JSON.stringify(json.errors) : `HTTP ${res.status}`);
    const err = new Error(message);
    err.status = res.status;
    err.body = json;
    throw err;
  }

  if (
    json !== null &&
    typeof json === 'object' &&
    !Array.isArray(json) &&
    Object.keys(json).length === 1 &&
    Object.prototype.hasOwnProperty.call(json, 'data')
  ) {
    return json.data;
  }

  return json;
}

export const vivoOS = {
  getWorkspace: () => request('GET', '/workspace'),
  listApps: () => request('GET', '/apps'),
  getApp: (appId) => request('GET', `/apps/${appId}`),
  listAgents: () => request('GET', '/agents'),
  getUsage: () => request('GET', '/usage'),
};
