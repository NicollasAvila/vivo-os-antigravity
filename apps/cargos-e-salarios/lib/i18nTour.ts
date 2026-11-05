// Dicionário do módulo de guias de uso (tour). Duas seções:
//   `tour.ui.*` / `tour.menu.*` — a moldura dos guias. NÃO precisa mexer.
//   `tour.<id>.*` — o CONTEÚDO de cada guia. Ao criar um tour novo em
//   services/tours.ts, adicione as strings dele aqui (título, descrição e
//   um par `sN.t` / `sN.b` por passo), nos três idiomas.

import { makeTranslator } from './i18n';

export const tTour = makeTranslator({
  'pt-BR': {
    // Moldura (overlay + menu)
    'tour.ui.step': 'Passo {{current}} de {{total}}',
    'tour.ui.close': 'Fechar guia',
    'tour.ui.skip': 'Pular',
    'tour.ui.back': 'Voltar',
    'tour.ui.next': 'Avançar',
    'tour.ui.finish': 'Concluir',
    'tour.ui.seen': 'Guia já visto',
    'tour.ui.replay': 'Rever',
    'tour.ui.start': 'Começar',
    'tour.menu.button': 'Guia rápido',
    'tour.menu.title': 'Guias de uso',
    'tour.menu.subtitle': 'Passo a passo de cada tela, no seu ritmo.',
    'tour.menu.current': 'Rever o guia desta tela',
    'tour.menu.auto': 'Dicas automáticas',
    'tour.menu.auto_hint': 'Abre o guia na primeira visita a cada tela.',

    // Guia: boas-vindas
    'tour.welcome.title': 'Conheça o {{app}}',
    'tour.welcome.desc': 'O essencial do app em poucos passos.',
    'tour.welcome.s1.t': 'Boas-vindas! 👋',
    'tour.welcome.s1.b': 'Este é o {{app}}. Este guia mostra o essencial em menos de um minuto — você pode sair a qualquer momento.',
    'tour.welcome.s2.t': 'Navegação',
    'tour.welcome.s2.b': 'Use o menu lateral para trocar de tela. Ele pode ser recolhido para dar mais espaço ao conteúdo.',
    'tour.welcome.s3.t': 'Ajuda sempre à mão',
    'tour.welcome.s3.b': 'Este botão reabre qualquer guia quando você quiser. As dicas automáticas podem ser desligadas ali também.',

    // Guia: configurações
    'tour.settings.title': 'Configurações',
    'tour.settings.desc': 'Idioma e preferências pessoais.',
    'tour.settings.s1.t': 'Seu idioma',
    'tour.settings.s1.b': 'O app fala português, inglês e espanhol. A escolha vale só para você, neste navegador.',
    'tour.settings.s2.t': 'Guias de uso',
    'tour.settings.s2.b': 'Todos os passo a passo ficam listados aqui — reveja quantas vezes precisar.',
  },
  en: {
    'tour.ui.step': 'Step {{current}} of {{total}}',
    'tour.ui.close': 'Close guide',
    'tour.ui.skip': 'Skip',
    'tour.ui.back': 'Back',
    'tour.ui.next': 'Next',
    'tour.ui.finish': 'Finish',
    'tour.ui.seen': 'Guide already seen',
    'tour.ui.replay': 'Replay',
    'tour.ui.start': 'Start',
    'tour.menu.button': 'Quick guide',
    'tour.menu.title': 'Usage guides',
    'tour.menu.subtitle': 'A walkthrough of each screen, at your own pace.',
    'tour.menu.current': 'Replay this screen’s guide',
    'tour.menu.auto': 'Automatic tips',
    'tour.menu.auto_hint': 'Opens the guide on the first visit to each screen.',

    'tour.welcome.title': 'Meet {{app}}',
    'tour.welcome.desc': 'The essentials of the app in a few steps.',
    'tour.welcome.s1.t': 'Welcome! 👋',
    'tour.welcome.s1.b': 'This is {{app}}. This guide shows the essentials in under a minute — you can leave at any time.',
    'tour.welcome.s2.t': 'Navigation',
    'tour.welcome.s2.b': 'Use the side menu to switch screens. It can be collapsed to give the content more room.',
    'tour.welcome.s3.t': 'Help is always at hand',
    'tour.welcome.s3.b': 'This button reopens any guide whenever you want. Automatic tips can be turned off there too.',

    'tour.settings.title': 'Settings',
    'tour.settings.desc': 'Language and personal preferences.',
    'tour.settings.s1.t': 'Your language',
    'tour.settings.s1.b': 'The app speaks Portuguese, English and Spanish. The choice applies only to you, in this browser.',
    'tour.settings.s2.t': 'Usage guides',
    'tour.settings.s2.b': 'Every walkthrough is listed here — replay them as many times as you need.',
  },
  es: {
    'tour.ui.step': 'Paso {{current}} de {{total}}',
    'tour.ui.close': 'Cerrar guía',
    'tour.ui.skip': 'Omitir',
    'tour.ui.back': 'Volver',
    'tour.ui.next': 'Siguiente',
    'tour.ui.finish': 'Finalizar',
    'tour.ui.seen': 'Guía ya vista',
    'tour.ui.replay': 'Repetir',
    'tour.ui.start': 'Empezar',
    'tour.menu.button': 'Guía rápida',
    'tour.menu.title': 'Guías de uso',
    'tour.menu.subtitle': 'Un recorrido por cada pantalla, a tu ritmo.',
    'tour.menu.current': 'Repetir la guía de esta pantalla',
    'tour.menu.auto': 'Consejos automáticos',
    'tour.menu.auto_hint': 'Abre la guía en la primera visita a cada pantalla.',

    'tour.welcome.title': 'Conoce {{app}}',
    'tour.welcome.desc': 'Lo esencial de la app en pocos pasos.',
    'tour.welcome.s1.t': '¡Bienvenido! 👋',
    'tour.welcome.s1.b': 'Esto es {{app}}. Esta guía muestra lo esencial en menos de un minuto — puedes salir cuando quieras.',
    'tour.welcome.s2.t': 'Navegación',
    'tour.welcome.s2.b': 'Usa el menú lateral para cambiar de pantalla. Puede contraerse para dar más espacio al contenido.',
    'tour.welcome.s3.t': 'Ayuda siempre a mano',
    'tour.welcome.s3.b': 'Este botón reabre cualquier guía cuando quieras. Los consejos automáticos también se apagan ahí.',

    'tour.settings.title': 'Ajustes',
    'tour.settings.desc': 'Idioma y preferencias personales.',
    'tour.settings.s1.t': 'Tu idioma',
    'tour.settings.s1.b': 'La app habla portugués, inglés y español. La elección aplica solo para ti, en este navegador.',
    'tour.settings.s2.t': 'Guías de uso',
    'tour.settings.s2.b': 'Todos los recorridos están listados aquí — repítelos cuantas veces necesites.',
  },
});
