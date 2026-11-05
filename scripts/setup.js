// scripts/setup.js
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import readline from 'node:readline';

const DEFAULT_URL = 'https://cloud.mogno.ai';

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('\n======================================================');
  console.log('   CONFIGURAÇÃO DO AMBIENTE VIVO OS (MOGNO AI)        ');
  console.log('======================================================\n');

  let apiKey = process.argv[2] || process.env.MOGNO_API_KEY || process.env.API_KEY_VIVO_OS;

  if (!apiKey && existsSync('.env')) {
    const envContent = readFileSync('.env', 'utf8');
    const match = envContent.match(/MOGNO_API_KEY=([^\r\n]+)/) || envContent.match(/API_KEY_VIVO_OS=([^\r\n]+)/);
    if (match && match[1] && !match[1].includes('SUA_CHAVE_AQUI')) {
      apiKey = match[1].trim();
    }
  }

  if (!apiKey) {
    console.log('Cole sua chave de API do Vivo OS (Mogno AI) gerada em:');
    console.log('https://cloud.mogno.ai/api-keys\n');
    apiKey = await prompt('Chave de API (ex: seiva_...): ');
  }

  if (!apiKey || !apiKey.startsWith('seiva_')) {
    console.error('\n[ERRO] Chave de API inválida. Ela deve começar com "seiva_".\n');
    process.exit(1);
  }

  console.log('\nValidando conexão com a plataforma...');
  try {
    const res = await fetch(`${DEFAULT_URL}/api/v1/mgmt/workspace`, {
      headers: {
        'X-Mogno-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    const json = await res.json();
    if (!res.ok) {
      throw new Error(json.error || `HTTP ${res.status}`);
    }

    const ws = json.data;
    console.log(`\n✓ Conexão bem-sucedida!`);
    console.log(`  Workspace: ${ws.workspace.name} (${ws.workspace.slug})`);
    console.log(`  Usuário:   ${ws.user.name} <${ws.user.email}> [${ws.user.role}]`);

    // 1. Gravar .env
    const envData = `# Vivo OS (Mogno AI) Configuration\nMOGNO_API_KEY=${apiKey}\nMOGNO_URL=${DEFAULT_URL}\nAPI_KEY_VIVO_OS=${apiKey}\nVIVO_OS_URL=${DEFAULT_URL}\nSEIVA_API_KEY=${apiKey}\nSEIVA_URL=${DEFAULT_URL}\n`;
    writeFileSync('.env', envData, 'utf8');
    console.log('✓ Arquivo .env local atualizado.');

    // 2. Gravar ~/.seiva/config.json e state.json
    const seivaDir = join(homedir(), '.seiva');
    mkdirSync(seivaDir, { recursive: true });
    writeFileSync(join(seivaDir, 'config.json'), JSON.stringify({ url: DEFAULT_URL, api_key: apiKey }, null, 2), 'utf8');
    writeFileSync(join(seivaDir, 'state.json'), JSON.stringify({ workspace_id: ws.workspace.id }, null, 2), 'utf8');
    console.log('✓ Credencial persistida em ~/.seiva/config.json para o CLI.');

    // 3. Configurar Antigravity MCP global se existir
    const antigravityMcpPath = join(homedir(), '.gemini', 'config', 'mcp_config.json');
    if (existsSync(antigravityMcpPath)) {
      try {
        const mcpConfig = JSON.parse(readFileSync(antigravityMcpPath, 'utf8'));
        mcpConfig.mcpServers = mcpConfig.mcpServers || {};
        mcpConfig.mcpServers['vivo-os'] = {
          command: 'node',
          args: [join(process.cwd(), 'node_modules', 'mogno-mcp', 'client.js')],
          env: {
            MOGNO_URL: DEFAULT_URL,
            MOGNO_API_KEY: apiKey,
          },
        };
        writeFileSync(antigravityMcpPath, JSON.stringify(mcpConfig, null, 2), 'utf8');
        console.log('✓ Servidor MCP "vivo-os" registrado no Antigravity IDE (~/.gemini/config/mcp_config.json).');
      } catch (err) {
        console.log('Aviso ao registrar MCP global:', err.message);
      }
    }

    console.log('\nConfiguração concluída com sucesso! Você já pode utilizar o Antigravity e o CLI.\n');
  } catch (err) {
    console.error('\n[ERRO] Falha ao autenticar na plataforma:', err.message);
    process.exit(1);
  }
}

main();

