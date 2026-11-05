// Dicionário do indicador de pessoas online (PresencePanel).

import { makeTranslator } from './i18n';

export const tPresence = makeTranslator({
  'pt-BR': {
    'presence.online_now': 'Online agora',
    'presence.you': 'você',
    'presence.only_you': 'Só você por aqui no momento.',
    'presence.more': '+{{count}}',
  },
  en: {
    'presence.online_now': 'Online now',
    'presence.you': 'you',
    'presence.only_you': 'Only you here right now.',
    'presence.more': '+{{count}}',
  },
  es: {
    'presence.online_now': 'En línea ahora',
    'presence.you': 'tú',
    'presence.only_you': 'Solo tú por aquí en este momento.',
    'presence.more': '+{{count}}',
  },
});
