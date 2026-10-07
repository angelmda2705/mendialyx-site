/* Mendialyx AI — asistente calificador de leads.
   Flujo guiado sin backend: arma un mensaje de WhatsApp con el contexto del prospecto. */
(() => {
  'use strict';

  const WA_NUMBER = '528334426440';
  const STORAGE_KEY = 'mdx-lead-v1';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------
     Flujo. Para cambiar preguntas, opciones o rangos, edita aquí.
     --------------------------------------------------------------- */
  const STEPS = [
    {
      id: 'servicio',
      label: 'Servicio',
      question: '¿Qué necesitas construir o mejorar?',
      options: [
        'Automatización con IA',
        'Página web',
        'Aplicación a la medida',
        'Un chatbot para mi negocio',
        'Aún no lo tengo claro'
      ]
    },
    {
      id: 'giro',
      label: 'Giro',
      question: 'Perfecto. ¿A qué se dedica tu negocio?',
      options: [
        'Comercio o tienda',
        'Servicios profesionales',
        'Salud',
        'Inmobiliaria o construcción',
        'Industria o logística'
      ],
      other: { chip: 'Otro giro', placeholder: 'Ej. restaurante, escuela…' }
    },
    {
      id: 'urgencia',
      label: 'Tiempos',
      question: '¿Para cuándo lo necesitas?',
      options: [
        'Lo antes posible',
        'En los próximos 1 a 3 meses',
        'Todavía estoy explorando'
      ]
    },
    {
      id: 'presupuesto',
      label: 'Presupuesto',
      question: '¿Tienes un presupuesto aproximado en mente?',
      options: [
        'Menos de $15,000 MXN',
        'Entre $15,000 y $50,000 MXN',
        'Más de $50,000 MXN',
        'Prefiero platicarlo'
      ]
    },
    {
      id: 'nombre',
      label: 'Nombre',
      question: 'Ya casi. ¿Cómo te llamas?',
      input: { placeholder: 'Tu nombre', maxlength: 60, required: true }
    },
    {
      id: 'objetivo',
      label: 'Objetivo',
      question: 'Por último, en una línea: ¿qué te gustaría lograr?',
      input: { placeholder: 'Ej. dejar de capturar pedidos a mano', maxlength: 240 },
      skip: 'Mejor lo explico por WhatsApp'
    }
  ];

  const INTRO = [
    'Hola 👋 Soy el asistente de Mendialyx AI.',
    'Te hago 5 preguntas rápidas para entender tu proyecto y te paso con el equipo por WhatsApp, ya con todo el contexto.'
  ];

  /* --------------------------------------------------------------- */

  const state = { answers: {}, index: 0, open: false, done: false };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && typeof saved === 'object' && saved.answers) {
        state.answers = saved.answers;
        state.index = Math.min(Number(saved.index) || 0, STEPS.length);
      }
    } catch (_) { /* modo privado o storage lleno: seguimos sin persistir */ }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers: state.answers, index: state.index }));
    } catch (_) { /* ignorar */ }
  }

  function clearSaved() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (_) { /* ignorar */ }
  }

  /* --- DOM ------------------------------------------------------- */

  const root = document.createElement('div');
  root.className = 'mdx-chat';
  root.innerHTML = `
    <button class="mdx-launcher" type="button" aria-expanded="false" aria-controls="mdx-panel" aria-label="Abrir el asistente de Mendialyx AI">
      <span class="mdx-launcher-dot" aria-hidden="true"></span>
      <span class="mdx-launcher-text">¿Te ayudo con tu proyecto?</span>
    </button>
    <section class="mdx-panel" id="mdx-panel" role="dialog" aria-label="Asistente de Mendialyx AI" hidden>
      <header class="mdx-head">
        <span class="mdx-avatar" aria-hidden="true"><img src="assets/mendialyx-mark.png" alt=""></span>
        <span class="mdx-head-text">
          <strong>Asistente Mendialyx</strong>
          <small>Responde al instante</small>
        </span>
        <button class="mdx-close" type="button" aria-label="Cerrar asistente">&times;</button>
      </header>
      <div class="mdx-log" role="log" aria-live="polite"></div>
      <div class="mdx-actions"></div>
    </section>`;

  const launcher = root.querySelector('.mdx-launcher');
  const panel = root.querySelector('.mdx-panel');
  const log = root.querySelector('.mdx-log');
  const actions = root.querySelector('.mdx-actions');
  root.querySelector('.mdx-close').addEventListener('click', close);

  /* --- Render ---------------------------------------------------- */

  function scrollDown() {
    log.scrollTop = log.scrollHeight;
  }

  function bubble(text, who) {
    const el = document.createElement('div');
    el.className = `mdx-msg mdx-msg-${who}`;
    el.textContent = text;            // textContent: nunca interpretamos lo que escribe el visitante
    log.appendChild(el);
    scrollDown();
    return el;
  }

  function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, reduceMotion ? 0 : ms));
  }

  async function botSays(text) {
    const typing = document.createElement('div');
    typing.className = 'mdx-typing';
    typing.innerHTML = '<i></i><i></i><i></i>';
    typing.setAttribute('aria-hidden', 'true');
    log.appendChild(typing);
    scrollDown();
    await wait(Math.min(240 + text.length * 9, 820));
    typing.remove();
    bubble(text, 'bot');
  }

  function clearActions() {
    actions.textContent = '';
  }

  function chip(label, onPick, variant) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = variant ? `mdx-chip mdx-chip-${variant}` : 'mdx-chip';
    b.textContent = label;
    b.addEventListener('click', onPick);
    actions.appendChild(b);
    return b;
  }

  /* --- Motor del flujo ------------------------------------------- */

  function answer(step, value) {
    state.answers[step.id] = value;
    state.index += 1;
    save();
    bubble(value, 'me');
    nextStep();
  }

  function renderOptions(step) {
    clearActions();
    step.options.forEach(option => chip(option, () => answer(step, option)));

    if (step.other) {
      chip(step.other.chip, () => renderInput(step, step.other.placeholder), 'soft');
    }
  }

  function renderInput(step, placeholder) {
    clearActions();
    const form = document.createElement('form');
    form.className = 'mdx-form';
    form.noValidate = true;

    const field = document.createElement('input');
    field.type = 'text';
    field.className = 'mdx-input';
    field.placeholder = placeholder || (step.input && step.input.placeholder) || '';
    field.maxLength = (step.input && step.input.maxlength) || 120;
    field.autocomplete = 'off';
    field.setAttribute('aria-label', step.question);

    const send = document.createElement('button');
    send.type = 'submit';
    send.className = 'mdx-send';
    send.textContent = 'Enviar';

    form.append(field, send);

    function submitValue() {
      const value = field.value.trim();
      if (!value) {
        field.focus();
        return;
      }
      answer(step, value);
    }

    form.addEventListener('submit', event => {
      event.preventDefault();
      submitValue();
    });

    // No dependemos del envío implícito del formulario: Enter siempre responde.
    field.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        submitValue();
      }
    });

    actions.appendChild(form);

    if (step.skip) {
      chip(step.skip, () => answer(step, 'Lo explico por WhatsApp'), 'soft');
    }

    field.focus();
  }

  async function nextStep() {
    if (state.index >= STEPS.length) {
      finish();
      return;
    }

    const step = STEPS[state.index];
    clearActions();
    await botSays(step.question);

    if (step.options) renderOptions(step);
    else renderInput(step);
  }

  /* --- Cierre: resumen + WhatsApp -------------------------------- */

  function buildMessage() {
    const a = state.answers;
    const lines = ['Hola Mendialyx AI 👋', ''];

    if (a.nombre) lines.push(`Soy ${a.nombre}.`);
    if (a.servicio) lines.push(`Me interesa: ${a.servicio}`);
    if (a.giro) lines.push(`Giro del negocio: ${a.giro}`);
    if (a.urgencia) lines.push(`Tiempos: ${a.urgencia}`);
    if (a.presupuesto) lines.push(`Presupuesto: ${a.presupuesto}`);
    if (a.objetivo) lines.push(`Objetivo: ${a.objetivo}`);

    lines.push('', 'Enviado desde el asistente de mendialyx.com');
    return lines.join('\n');
  }

  function summaryCard() {
    const card = document.createElement('div');
    card.className = 'mdx-summary';

    const title = document.createElement('strong');
    title.textContent = 'Esto es lo que le voy a compartir al equipo:';
    card.appendChild(title);

    const list = document.createElement('dl');
    STEPS.forEach(step => {
      const value = state.answers[step.id];
      if (!value) return;
      const dt = document.createElement('dt');
      dt.textContent = step.label;
      const dd = document.createElement('dd');
      dd.textContent = value;
      list.append(dt, dd);
    });
    card.appendChild(list);
    log.appendChild(card);
    scrollDown();
  }

  async function finish() {
    state.done = true;
    clearActions();
    const nombre = state.answers.nombre ? `, ${state.answers.nombre}` : '';
    await botSays(`Listo${nombre}. Con esto el equipo ya sabe de qué se trata antes de saludarte.`);
    summaryCard();

    clearActions();

    const wa = document.createElement('a');
    wa.className = 'mdx-chip mdx-chip-wa';
    wa.href = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(buildMessage())}`;
    wa.target = '_blank';
    wa.rel = 'noopener';
    wa.textContent = 'Enviar por WhatsApp ↗';
    actions.appendChild(wa);

    chip('Empezar de nuevo', restart, 'soft');
  }

  function restart() {
    state.answers = {};
    state.index = 0;
    state.done = false;
    clearSaved();
    log.textContent = '';
    clearActions();
    start();
  }

  /* --- Arranque y apertura --------------------------------------- */

  function replaySaved() {
    // Reconstruye lo ya contestado sin animación, para retomar donde se quedó.
    for (let i = 0; i < state.index && i < STEPS.length; i++) {
      const step = STEPS[i];
      const value = state.answers[step.id];
      if (!value) continue;
      bubble(step.question, 'bot');
      bubble(value, 'me');
    }
  }

  async function start() {
    const resuming = state.index > 0 && Object.keys(state.answers).length > 0;

    if (resuming) {
      replaySaved();
      await botSays('Retomamos donde te quedaste 👇');
      nextStep();
      return;
    }

    for (const line of INTRO) await botSays(line);
    nextStep();
  }

  let started = false;

  function open() {
    state.open = true;
    panel.hidden = false;
    root.classList.add('is-open');
    launcher.setAttribute('aria-expanded', 'true');
    launcher.setAttribute('aria-label', 'Cerrar el asistente de Mendialyx AI');
    document.addEventListener('keydown', onKeydown);

    if (!started) {
      started = true;
      start();
    }
  }

  function close() {
    state.open = false;
    root.classList.remove('is-open');
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-label', 'Abrir el asistente de Mendialyx AI');
    document.removeEventListener('keydown', onKeydown);
    launcher.focus();
  }

  function onKeydown(event) {
    if (event.key === 'Escape') close();
  }

  launcher.addEventListener('click', () => (state.open ? close() : open()));

  load();
  document.body.appendChild(root);
})();
