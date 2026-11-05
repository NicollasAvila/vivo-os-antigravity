// src/status.js
import { vivoOS } from './client.js';

async function main() {
  try {
    const ws = await vivoOS.getWorkspace();
    const apps = await vivoOS.listApps();

    console.log('--- CONEXÃO VIVO OS (MOGNO AI) ESTABELECIDA ---');
    console.log(`Workspace: ${ws.workspace.name} (${ws.workspace.slug})`);
    console.log(`Usuário: ${ws.user.name} <${ws.user.email}> [${ws.user.role}]`);
    console.log(`Total de Apps cadastrados: ${apps.length}`);
    console.log('------------------------------------------------');
  } catch (error) {
    console.error('Falha na conexão:', error.message);
    process.exit(1);
  }
}

main();

