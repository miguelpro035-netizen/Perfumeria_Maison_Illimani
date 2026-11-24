/* =====================================================================
   script.js — Motor de catálogo (Diseño Web II · UPDS La Paz)
   Guías aplicadas: Fetch + res.ok · Lazy Loading · Delegación .off().on() ·
   Hidratación · Tema claro/oscuro · Filtro de 3 capas · Acordeón jQuery ·
   Validación en tiempo real · Temporizador 30 s · Toast · Offline-First ·
   Anti-XSS (textContent + DOMPurify) · CLS (width/height + aspect-ratio).
   Los datos del negocio se editan en data/site.json y data/products.json.
   ===================================================================== */
(function () {
  'use strict';
  if (window.__catalogoIniciado) return;               // inicialización única (Memory Leaks)
  window.__catalogoIniciado = true;
  const $ = window.jQuery;
  const S = { site: null, productos: [], cat: 'Todos', busca: '', orden: 'destacados', f1: '', f2: '', carrito: leer('carrito', []), favs: leer('favoritos', []), timer: null, seg: 30, reserva: null };
  const temporizadores = [];
  const $id = (id) => document.getElementById(id);

  /* ---------- utilidades ---------- */
  function leer(k, def) { try { const r = localStorage.getItem(NS() + k); return r ? JSON.parse(r) : def; } catch (e) { return def; } }
  function guardar(k, v) { try { localStorage.setItem(NS() + k, JSON.stringify(v)); } catch (e) { /* almacenamiento bloqueado */ } }
  function NS() { return (document.documentElement.dataset.negocio || 'cat') + ':'; }
  const dinero = (n) => `${S.site ? S.site.moneda : 'Bs'} ${Number(n).toFixed(2).replace(/\.00$/, '')}`;
  function el(tag, cls, txt) { const n = document.createElement(tag); if (cls) n.className = cls; if (txt !== undefined) n.textContent = String(txt); return n; }
  /** Guía unificada C3-A2: todo HTML dinámico (JSON/BD) pasa por DOMPurify antes de inyectarse. */
  const limpiar = (html) => (window.DOMPurify ? window.DOMPurify.sanitize(String(html ?? '')) : String(html ?? '').replace(/[<>]/g, ''));
  function aviso(titulo, texto) {
    const t = el('div', 'aviso'); t.append(el('strong', 'aviso__titulo', titulo), el('span', 'aviso__texto', texto));
    $id('avisos').prepend(t); $(t).hide().slideDown(220); setTimeout(() => $(t).fadeOut(300, () => t.remove()), 3000);
  }
  const prod = (id) => S.productos.find((p) => p.id === Number(id));
  const precioDe = (p, v) => { const x = (p.variantes || []).find((y) => y.nombre === v); return x ? x.precio : p.precio; };
  const waLink = (texto) => `https://wa.me/${String(S.site.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(texto)}`;
  function enviar(texto, tipo, registro) {              // Offline-First: cola local + WhatsApp si el negocio configuró su número
    const cola = leer('cola', []); registro.estado = navigator.onLine ? 'Pendiente de coordinación' : 'Guardado localmente - Pendiente de envío';
    registro.tipo = tipo; registro.id = `${tipo.slice(0, 3).toUpperCase()}-${Date.now()}`; registro.fecha = new Date().toISOString(); cola.push(registro); guardar('cola', cola);
    if (S.site.whatsapp) { window.open(waLink(texto), '_blank', 'noopener'); aviso('WhatsApp', 'Se abrió el chat para enviar tu mensaje.'); }
    else aviso('Registro guardado', `Código ${registro.id}. Configura el WhatsApp del negocio en data/site.json para recibirlo.`);
    return registro;
  }

  /* ---------- tema claro/oscuro (Guía DOM · Ej.1) ---------- */
  function pintarTema(t) {
    document.documentElement.dataset.tema = t; $id('botonTema').textContent = t === 'oscuro' ? '☀' : '☾'; $id('botonTema').setAttribute('aria-pressed', String(t === 'oscuro'));
    const m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', getComputedStyle(document.documentElement).getPropertyValue('--fondo').trim() || '#000');
  }
  function iniciarTema() {
    const g = leer('tema', null); const def = document.documentElement.dataset.temaDefecto || 'oscuro';
    pintarTema(g || (window.matchMedia('(prefers-color-scheme: light)').matches && !g ? def : def));
    $('#botonTema').off('click.cat').on('click.cat', () => { const t = document.documentElement.dataset.tema === 'oscuro' ? 'claro' : 'oscuro'; guardar('tema', t); pintarTema(t); });
  }

  /* ---------- datos (Fetch + res.ok) ---------- */
  async function cargar() {
    try {
      const [a, b] = await Promise.all([fetch('data/site.json'), fetch('data/products.json')]);
      if (!a.ok || !b.ok) throw new Error(`HTTP ${a.status}/${b.status}`);
      S.site = await a.json(); S.productos = await b.json();
      pintarSitio(); pintarPestanas(); pintarCapas(); pintarGrilla(); pintarDestacados(); pintarCarrito(); iniciarCarrusel(); preparar();
    } catch (err) { $id('estadoCatalogo').textContent = 'No se pudo cargar el catálogo. Usa un servidor local o GitHub Pages.'; console.error('Catálogo:', err); }
  }
  function pintarSitio() {
    document.querySelectorAll('[data-site]').forEach((n) => { n.textContent = S.site[n.dataset.site] || ''; });
    const h = $id('listaHorario'); if (h) h.replaceChildren(...S.site.horario.map(([d, hr]) => { const li = el('li', 'horario__fila'); li.append(el('span', 'horario__dia', d), el('b', 'horario__hora', hr)); return li; }));
    const r = $id('listaRedes'); if (r) r.replaceChildren(...Object.keys(S.site.redes).map((k) => { const a = el('a', 'pie__enlace', k.charAt(0).toUpperCase() + k.slice(1)); a.href = S.site.redes[k] || '#'; a.dataset.red = k; if (S.site.redes[k]) { a.target = '_blank'; a.rel = 'noopener'; } return a; }));
    const e = $id('entregaCarrito'); if (e) e.replaceChildren(...S.site.entregas.map((x) => { const o = el('option', '', `${x.nombre} · ${dinero(x.costo)}`); o.value = x.id; return o; }));
    const wa = $id('enlaceWhatsapp'); if (wa) { wa.href = S.site.whatsapp ? waLink('Hola, quisiera información.') : '#contacto'; wa.dataset.sinNumero = S.site.whatsapp ? '' : '1'; }
    const eq = $id('listaEquipo'); if (eq && S.site.equipo) eq.replaceChildren(...S.site.equipo.map((m) => { const c = el('article', 'persona'); const i = el('img', 'persona__foto'); i.src = m.imagen; i.alt = m.nombre; i.width = 400; i.height = 500; i.loading = 'lazy'; c.append(i, el('h3', 'persona__nombre', m.nombre), el('p', 'persona__rol', m.rol)); return c; }));
    const rs = $id('reservaBarbero'); if (rs && S.site.equipo) rs.replaceChildren(...S.site.equipo.map((m) => { const o = el('option', '', m.nombre); o.value = m.nombre; return o; }));
    const rv = $id('reservaServicio'); if (rv) rv.replaceChildren(...S.productos.filter((p) => p.reservable).map((p) => { const o = el('option', '', `${p.nombre} · ${dinero(p.precio)} · ${p.duracion} min`); o.value = p.id; return o; }));
  }

  /* ---------- catálogo ---------- */
  function filtrados() {
    const q = S.busca; const L = S.productos.filter((p) => (S.cat === 'Todos' || p.categoria === S.cat) && (!q || `${p.nombre} ${p.categoria} ${p.marca || ''} ${(p.etiquetas || []).join(' ')}`.toLowerCase().includes(q))
      && (!S.f1 || p[S.site.filtros.capa1.campo] === S.f1) && (!S.f2 || p[S.site.filtros.capa2.campo] === S.f2));
    if (S.orden === 'menor') L.sort((a, b) => a.precio - b.precio); if (S.orden === 'mayor') L.sort((a, b) => b.precio - a.precio); if (S.orden === 'nombre') L.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return L;
  }
  function tarjeta(p) {
    const c = el('article', `tarjeta${p.stock <= 0 ? ' tarjeta--agotada' : ''}`); c.dataset.id = p.id;
    const f = el('div', 'tarjeta__marco'); const i = el('img', 'tarjeta__imagen'); i.src = p.imagen; i.alt = p.nombre; i.width = 400; i.height = 500; i.loading = 'lazy'; i.decoding = 'async';
    const fav = el('button', `tarjeta__favorito${S.favs.includes(p.id) ? ' tarjeta__favorito--activo' : ''}`, S.favs.includes(p.id) ? '♥' : '♡'); fav.type = 'button'; fav.dataset.accion = 'favorito'; fav.setAttribute('aria-label', 'Guardar en favoritos');
    f.append(i, el('span', `tarjeta__insignia${p.destacado ? ' tarjeta__insignia--destacado' : ''}`, p.destacado ? '★ TOP' : p.insignia || ''), fav);
    const cu = el('div', 'tarjeta__cuerpo'); const pr = el('p', 'tarjeta__precio', p.variantes ? `Desde ${dinero(Math.min(...p.variantes.map((v) => v.precio)))}` : dinero(p.precio));
    if (p.precioAnterior) pr.append(el('s', 'tarjeta__precio-anterior', dinero(p.precioAnterior)));
    const acc = el('div', 'tarjeta__acciones');
    const b1 = el('button', 'boton boton--primario boton--chico', p.reservable ? 'RESERVAR' : p.variantes ? 'ELEGIR' : 'AÑADIR +'); b1.type = 'button'; b1.dataset.accion = p.reservable ? 'reservar' : p.variantes ? 'detalle' : 'agregar'; b1.disabled = p.stock <= 0 && !p.reservable;
    const b2 = el('button', 'boton boton--contorno boton--chico', 'DETALLE'); b2.type = 'button'; b2.dataset.accion = 'detalle'; acc.append(b1, b2);
    cu.append(el('span', 'tarjeta__categoria', p.categoria), el('h3', 'tarjeta__titulo', p.nombre), el('p', 'tarjeta__texto', p.resumen || ''), pr, acc); c.append(f, cu); return c;
  }
  function pintarGrilla() {
    const L = filtrados(); $id('grilla').replaceChildren(...L.map(tarjeta)); $id('conteo').textContent = `${L.length} ${L.length === 1 ? 'resultado' : 'resultados'}`;
    $id('estadoCatalogo').textContent = ''; $id('vacio').hidden = L.length !== 0; $id('grilla').hidden = L.length === 0;
  }
  function pintarPestanas() {
    const cats = ['Todos', ...new Set(S.productos.map((p) => p.categoria))];
    $id('pestanas').replaceChildren(...cats.map((c) => { const b = el('button', `pestana${c === S.cat ? ' pestana--activa' : ''}`, c); b.type = 'button'; b.dataset.cat = c; return b; }));
  }
  function pintarDestacados() {
    const host = $id('destacados'); if (!host) return;
    host.replaceChildren(...S.productos.filter((p) => p.destacado).slice(0, 8).map((p) => { const c = el('article', 'mini'); c.dataset.id = p.id; const i = el('img', 'mini__imagen'); i.src = p.imagen; i.alt = p.nombre; i.width = 400; i.height = 500; i.loading = 'lazy';
      const b = el('button', 'mini__boton', 'Ver'); b.type = 'button'; b.dataset.accion = 'detalle'; c.append(i, el('h3', 'mini__titulo', p.nombre), el('p', 'mini__precio', p.variantes ? `Desde ${dinero(Math.min(...p.variantes.map((v) => v.precio)))}` : dinero(p.precio)), b); return c; }));
  }
  /* Guía Técnica PWA §4: filtro dinámico de 3 capas en cascada (capa1 → capa2 → capa3) */
  function pintarCapas() {
    const F = S.site.filtros; $id('capa1Titulo').textContent = F.capa1.titulo; $id('capa2Titulo').textContent = F.capa2.titulo;
    const o1 = [...new Set(S.productos.map((p) => p[F.capa1.campo]).filter(Boolean))];
    $id('capa1').replaceChildren(new Option(`-- Elija ${F.capa1.titulo.toLowerCase()} --`, ''), ...o1.map((v) => new Option(v, v)));
    $('#capa1').off('change.cat').on('change.cat', function () {
      const v = $(this).val(); const $c2 = $('#capa2'); $c2.empty().append(new Option(`-- Elija ${F.capa2.titulo.toLowerCase()} --`, '')).prop('disabled', !v);
      if (v) [...new Set(S.productos.filter((p) => p[F.capa1.campo] === v).map((p) => p[F.capa2.campo]).filter(Boolean))].forEach((x) => $c2.append(new Option(x, x)));
      $('#resultadoCapas').text('Seleccione las capas anteriores...');
    });
    $('#capa2').off('change.cat').on('change.cat', function () {
      const a = $('#capa1').val(), b = $(this).val(); if (!b) return;
      const r = S.productos.filter((p) => p[F.capa1.campo] === a && p[F.capa2.campo] === b);
      $('#resultadoCapas').empty().append($('<span>').text(`Capa 3: ${b} · ${a} — ${r.length} opción(es): ${r.map((p) => p.nombre).join(', ')}`), $('<button type="button" class="boton boton--contorno boton--chico capas__ir">').text('VER EN EL CATÁLOGO ↗').data({ a, b }));
    });
    $('#resultadoCapas').off('click.cat', '.capas__ir').on('click.cat', '.capas__ir', function () { S.f1 = $(this).data('a'); S.f2 = $(this).data('b'); S.cat = 'Todos'; pintarPestanas(); pintarGrilla(); $id('catalogo').scrollIntoView({ behavior: 'smooth' }); aviso('Filtro aplicado', `${S.f1} · ${S.f2}`); });
  }

  /* ---------- modales (fadeIn / fadeOut jQuery) ---------- */
  function abrir(id) { $('#fondoModal').stop(true, true).prop('hidden', false).hide().fadeIn(200); const $m = $('#' + id); $m.stop(true, true).prop('hidden', false).hide().fadeIn(220, () => { const f = $m.find('input:visible,select:visible,button:visible').not('.modal__cerrar')[0]; if (f) f.focus(); }); document.body.classList.add('pagina--bloqueada'); }
  function cerrar() { detener(); $('.modal:visible').not('#modalEdad').stop(true, true).fadeOut(200, function () { this.hidden = true; }); if (!$('#modalEdad').is(':visible')) $('#fondoModal').stop(true, true).fadeOut(200, function () { this.hidden = true; }); document.body.classList.remove('pagina--bloqueada'); $('#carrito').removeClass('carrito--abierto'); }
  function detalle(id) {
    const p = prod(id); if (!p) return; let v = p.variantes ? p.variantes[0].nombre : null;
    const c = $id('contenidoProducto'); const i = el('img', 'detalle__imagen'); i.src = p.imagen; i.alt = p.nombre; i.width = 400; i.height = 500;
    const info = el('div', 'detalle__info'); const precio = el('p', 'detalle__precio', dinero(precioDe(p, v)));
    const d = el('div', 'detalle__texto'); d.innerHTML = limpiar(p.descripcion);
    info.append(el('span', 'tarjeta__categoria', p.categoria), el('h2', 'detalle__titulo', p.nombre), precio, d);
    if (p.atributos) { const dl = el('dl', 'detalle__atributos'); Object.entries(p.atributos).forEach(([k, val]) => { const r = el('div', 'detalle__fila'); r.append(el('dt', '', k), el('dd', '', val)); dl.append(r); }); info.append(dl); }
    if (p.variantes) { const g = el('div', 'variantes'); p.variantes.forEach((x) => { const b = el('button', `variantes__opcion${x.nombre === v ? ' variantes__opcion--activa' : ''}`, `${x.nombre} · ${dinero(x.precio)}`); b.type = 'button'; b.dataset.variante = x.nombre; g.append(b); }); info.append(el('p', 'detalle__leyenda', 'Presentación'), g); }
    const btn = el('button', 'boton boton--primario boton--lleno', p.reservable ? 'RESERVAR TURNO' : 'AÑADIR AL CARRITO'); btn.type = 'button'; btn.dataset.accion = p.reservable ? 'reservar' : 'agregar-detalle'; btn.dataset.id = p.id; btn.disabled = p.stock <= 0 && !p.reservable; info.append(btn);
    c.replaceChildren(i, info); c.dataset.id = p.id; c.dataset.variante = v || ''; abrir('modalProducto');
    $(c).off('click.cat', '.variantes__opcion').on('click.cat', '.variantes__opcion', function () { c.dataset.variante = this.dataset.variante; $('.variantes__opcion').removeClass('variantes__opcion--activa'); $(this).addClass('variantes__opcion--activa'); precio.textContent = dinero(precioDe(p, this.dataset.variante)); });
  }

  /* ---------- carrito ---------- */
  const cant = () => S.carrito.reduce((s, x) => s + x.cant, 0);
  const sub = () => S.carrito.reduce((s, x) => { const p = prod(x.id); return s + (p ? precioDe(p, x.variante) * x.cant : 0); }, 0);
  const entrega = () => { const e = S.site.entregas.find((x) => x.id === $id('entregaCarrito').value); return e || S.site.entregas[0]; };
  const total = () => sub() + (S.carrito.length ? entrega().costo : 0);
  function agregar(id, variante) {
    const p = prod(id); if (!p || p.stock <= 0) return; variante = variante || (p.variantes ? p.variantes[0].nombre : '');
    const f = S.carrito.find((x) => x.id === p.id && x.variante === variante); if (f) f.cant = Math.min(f.cant + 1, p.stock); else S.carrito.push({ id: p.id, variante, cant: 1 });
    guardar('carrito', S.carrito); pintarCarrito(); aviso('Añadido', `${p.nombre}${variante ? ' · ' + variante : ''}`); $('#barraTotal').stop(true).animate({ opacity: .4 }, 90).animate({ opacity: 1 }, 180);
  }
  function pintarCarrito() {
    $id('contadorCarrito').textContent = cant(); $id('barraCantidad').textContent = cant(); $id('carritoConteo').textContent = `(${cant()})`;
    const t = total(); $id('subtotal').textContent = dinero(sub()); $id('costoEntrega').textContent = dinero(S.carrito.length ? entrega().costo : 0); $id('total').textContent = dinero(t); $id('barraTotal').textContent = dinero(t); $id('btnPedido').disabled = !S.carrito.length;
    const h = $id('listaCarrito'); if (!S.carrito.length) { const v = el('div', 'carrito__vacio'); v.append(el('span', 'carrito__vacio-icono', '🛒'), el('p', '', 'Tu carrito está vacío'), el('small', '', 'Agrega productos para continuar con tu pedido')); h.replaceChildren(v); return; }
    h.replaceChildren(...S.carrito.map((x) => { const p = prod(x.id); if (!p) return document.createComment(''); const r = el('article', 'linea'); r.dataset.id = p.id; r.dataset.variante = x.variante;
      const i = el('img', 'linea__imagen'); i.src = p.imagen; i.alt = p.nombre; i.width = 64; i.height = 80;
      const m = (t, a, l) => { const b = el('button', 'linea__boton', t); b.type = 'button'; b.dataset.accion = a; b.setAttribute('aria-label', l); return b; };
      const ct = el('div', 'linea__control'); ct.append(m('−', 'menos', 'Quitar una unidad'), el('span', 'linea__cant', x.cant), m('+', 'mas', 'Añadir una unidad'));
      const inf = el('div', 'linea__info'); inf.append(el('h3', 'linea__titulo', p.nombre), el('p', 'linea__precio', `${dinero(precioDe(p, x.variante))}${x.variante ? ' · ' + x.variante : ''}`), ct);
      r.append(i, inf, m('×', 'quitar', 'Quitar producto')); return r; }));
  }
  const textoPedido = (n, tel, dir, nota) => `Hola, soy ${n}. Mi pedido en ${S.site.nombre}:\n` + S.carrito.map((x) => { const p = prod(x.id); return `• ${x.cant} x ${p.nombre}${x.variante ? ' (' + x.variante + ')' : ''} — ${dinero(precioDe(p, x.variante) * x.cant)}`; }).join('\n') + `\nSubtotal: ${dinero(sub())}\nEntrega: ${entrega().nombre} (${dinero(entrega().costo)})\nTOTAL: ${dinero(total())}` + (dir ? `\nDirección: ${dir}` : '') + (nota ? `\nNota: ${nota}` : '') + `\nTeléfono: ${tel}`;

  /* ---------- reserva de turnos (barbería): grilla verde/roja + temporizador 30 s ---------- */
  function ocupado(fecha, barbero, hora) { const k = `${fecha}|${barbero}|${hora}`; const propios = leer('reservas', []).some((r) => `${r.fecha}|${r.barbero}|${r.hora}` === k); let h = 0; for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return propios || h % 5 === 0; }
  function pintarHoras() {
    const g = $id('reservaHoras'); if (!g) return; const f = $id('reservaFecha').value, b = $id('reservaBarbero').value;
    g.replaceChildren(...S.site.reserva.horas.map((h) => { const o = f ? ocupado(f, b, h) : false; const x = el('button', `hora hora--${o ? 'ocupada' : 'libre'}`, h); x.type = 'button'; x.dataset.hora = h; x.disabled = o || !f; x.title = o ? 'Ocupado' : 'Disponible'; return x; }));
    S.reserva.hora = ''; resumenReserva();
  }
  function resumenReserva() { const p = prod($id('reservaServicio').value); if (!p) return; $id('reservaTotal').textContent = dinero(p.precio); $id('reservaResumen').textContent = `${p.nombre} · ${p.duracion} min · ${$id('reservaBarbero').value}${S.reserva.hora ? ' · ' + S.reserva.hora : ''}`; }
  function abrirReserva(id) {
    const hoy = new Date(); const max = new Date(Date.now() + 14 * 864e5); const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
    S.reserva = { hora: '' }; const f = $id('reservaFecha'); f.min = iso(hoy); f.max = iso(max); f.value = iso(hoy); if (id) $id('reservaServicio').value = String(id);
    $id('reservaPaso1').hidden = false; $id('reservaPaso2').hidden = true; pintarHoras(); abrir('modalReserva');
  }
  function iniciarCuenta() { detener(); S.seg = 30; $id('reservaCuenta').textContent = '00:30'; S.timer = setInterval(() => { S.seg -= 1; $id('reservaCuenta').textContent = `00:${String(Math.max(0, S.seg)).padStart(2, '0')}`;
    if (S.seg <= 0) { detener(); $('#modalReserva').fadeOut(300, function () { this.hidden = true; }); $('#fondoModal').fadeOut(300, function () { this.hidden = true; }); document.body.classList.remove('pagina--bloqueada'); aviso('Tiempo de reserva expirado', 'El turno se liberó. Vuelve a elegirlo para continuar.'); } }, 1000); }
  function detener() { if (S.timer) { clearInterval(S.timer); S.timer = null; } }

  /* ---------- carrusel (hero de perfumería) ---------- */
  function iniciarCarrusel() {
    const c = document.querySelector('[data-carrusel]'); if (!c) return; const sl = [...c.querySelectorAll('.carrusel__diapositiva')]; if (!sl.length) return; let i = 0;
    const dots = $id('carruselPuntos'); dots.replaceChildren(...sl.map((_, n) => { const b = el('button', 'carrusel__punto'); b.type = 'button'; b.dataset.n = n; b.setAttribute('aria-label', `Diapositiva ${n + 1}`); return b; }));
    const ir = (n) => { i = (n + sl.length) % sl.length; sl.forEach((s, k) => s.classList.toggle('carrusel__diapositiva--activa', k === i)); [...dots.children].forEach((d, k) => d.classList.toggle('carrusel__punto--activo', k === i)); };
    ir(0); $(c).off('click.cat', '[data-dir]').on('click.cat', '[data-dir]', function () { ir(i + Number(this.dataset.dir)); }); $(dots).off('click.cat', '.carrusel__punto').on('click.cat', '.carrusel__punto', function () { ir(Number(this.dataset.n)); });
    temporizadores.push(setInterval(() => { if (!document.hidden) ir(i + 1); }, 5500));
  }

  /* ---------- contacto: validación en tiempo real (Guía Técnica PWA §4) ---------- */
  function validarContacto(todo) {
    const n = $('#cNombre').val().trim(), c = $('#cCorreo').val().trim(), m = $('#cMensaje').val().trim(); let ok = true;
    [['#errNombre', n.length >= 2, '#cNombre'], ['#errCorreo', /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c), '#cCorreo'], ['#errMensaje', m.length >= 8, '#cMensaje']].forEach(([e, v, f]) => { if (!v) ok = false; if (!v && (todo || $(f).data('tocado'))) $(e).stop(true, true).fadeIn(); else $(e).stop(true, true).fadeOut(); });
    return ok;
  }
  function estadoRed() {
    const on = navigator.onLine; $('#estadoRed').text(on ? '🟢 En línea' : '🟠 Modo offline (datos locales)').toggleClass('estado-red--offline', !on);
    if (on) { const cola = leer('cola', []); let n = 0; cola.forEach((o) => { if (String(o.estado).startsWith('Guardado localmente')) { o.estado = 'Verificado al reconectar'; n++; } }); if (n) { guardar('cola', cola); aviso('Sincronización', `${n} registro(s) verificados.`); } }
  }

  /* ---------- eventos (delegación global con .off().on()) ---------- */
  function preparar() {
    $(document).off('click.cat', '[data-accion]').on('click.cat', '[data-accion]', function () {
      const a = this.dataset.accion; const id = this.dataset.id || $(this).closest('[data-id]').attr('data-id');
      if (a === 'agregar') agregar(id); else if (a === 'detalle') detalle(id);
      else if (a === 'agregar-detalle') { agregar(id, $id('contenidoProducto').dataset.variante); cerrar(); $('#carrito').addClass('carrito--abierto'); $id('fondoModal').hidden = false; $('#fondoModal').show(); document.body.classList.add('pagina--bloqueada'); }
      else if (a === 'reservar') { cerrar(); setTimeout(() => abrirReserva(id), 250); }
      else if (a === 'favorito') { const n = Number(id); S.favs = S.favs.includes(n) ? S.favs.filter((x) => x !== n) : [...S.favs, n]; guardar('favoritos', S.favs); const on = S.favs.includes(n); $(this).toggleClass('tarjeta__favorito--activo', on).text(on ? '♥' : '♡'); }
      else if (a === 'mas' || a === 'menos') { const l = $(this).closest('.linea'); const it = S.carrito.find((x) => x.id === Number(l.data('id')) && x.variante === String(l.data('variante') ?? '')); if (!it) return; it.cant += a === 'mas' ? 1 : -1; if (it.cant <= 0) S.carrito = S.carrito.filter((x) => x !== it); guardar('carrito', S.carrito); pintarCarrito(); }
      else if (a === 'quitar') { const l = $(this).closest('.linea'); S.carrito = S.carrito.filter((x) => !(x.id === Number(l.data('id')) && x.variante === String(l.data('variante') ?? ''))); guardar('carrito', S.carrito); pintarCarrito(); }
    });
    $(document).off('click.cat', '.acordeon__boton').on('click.cat', '.acordeon__boton', function () { const b = $(this), o = b.attr('aria-expanded') === 'true'; b.attr('aria-expanded', String(!o)).find('span').text(o ? '+' : '−'); b.next('.acordeon__panel').stop(true, true).slideToggle('fast'); });   // Guía Jueves
    $(document).off('click.cat', '[data-ir-cat]').on('click.cat', '[data-ir-cat]', function () { S.cat = this.dataset.irCat; S.f1 = ''; S.f2 = ''; pintarPestanas(); pintarGrilla(); $id('catalogo').scrollIntoView({ behavior: 'smooth' }); });
    $(document).off('click.cat', '[data-cerrar]').on('click.cat', '[data-cerrar]', cerrar);
    $('#fondoModal').off('click.cat').on('click.cat', cerrar);
    $(document).off('keydown.cat').on('keydown.cat', (e) => { if (e.key === 'Escape') cerrar(); });
    $(document).off('click.cat', '[data-abrir]').on('click.cat', '[data-abrir]', function (e) { e.preventDefault(); if (this.dataset.abrir === 'modalReserva') abrirReserva(); else abrir(this.dataset.abrir); });
    $(document).off('click.cat', '#enlaceWhatsapp').on('click.cat', '#enlaceWhatsapp', function (e) { if (this.dataset.sinNumero) { e.preventDefault(); aviso('WhatsApp', 'Aún no hay número configurado: edita data/site.json.'); $id('contacto').scrollIntoView({ behavior: 'smooth' }); } });
    $(document).off('click.cat', '[data-red]').on('click.cat', '[data-red]', function (e) { if (!S.site.redes[this.dataset.red]) { e.preventDefault(); aviso(this.dataset.red, 'Enlace pendiente: agrégalo en data/site.json.'); } });
    $(document).off('click.cat', '.abrir-carrito').on('click.cat', '.abrir-carrito', () => { $('#carrito').addClass('carrito--abierto'); $('#fondoModal').prop('hidden', false).show(); document.body.classList.add('pagina--bloqueada'); });
    $('#pestanas').off('click.cat', '.pestana').on('click.cat', '.pestana', function () { S.cat = this.dataset.cat; $('.pestana').removeClass('pestana--activa'); $(this).addClass('pestana--activa'); pintarGrilla(); });
    $('#buscador').off('keyup.cat input.cat').on('keyup.cat input.cat', function () { const q = $(this).val().trim().toLowerCase(); if (q === S.busca) return; S.busca = q; pintarGrilla(); });
    $('#orden').off('change.cat').on('change.cat', function () { S.orden = this.value; pintarGrilla(); });
    $('#limpiar').off('click.cat').on('click.cat', () => { S.busca = ''; S.f1 = ''; S.f2 = ''; S.cat = 'Todos'; $('#buscador').val(''); pintarPestanas(); pintarGrilla(); });
    $('#entregaCarrito').off('change.cat').on('change.cat', pintarCarrito);
    $('#btnPedido').off('click.cat').on('click.cat', () => { if (!S.carrito.length) return; cerrar(); setTimeout(() => { $id('pedidoResumen').textContent = `${cant()} producto(s) · ${entrega().nombre}`; $id('pedidoTotal').textContent = dinero(total()); $id('pedidoDireccionCaja').hidden = entrega().costo === 0 && /recojo/i.test(entrega().nombre); abrir('modalPedido'); }, 250); });
    $('#formPedido').off('submit.cat').on('submit.cat', function (e) { e.preventDefault(); if (!this.reportValidity()) return; const n = $('#pedidoNombre').val().trim(), t = $('#pedidoTelefono').val().trim(), d = $('#pedidoDireccion').val().trim(), nota = $('#pedidoNota').val().trim();
      const txt = textoPedido(n, t, d, nota); const r = enviar(txt, 'pedido', { nombre: n, telefono: t, total: total(), items: S.carrito.map((x) => ({ ...x })) }); S.carrito = []; guardar('carrito', S.carrito); pintarCarrito(); cerrar(); this.reset(); aviso('Pedido registrado', `Código ${r.id}`); });
    /* reserva */
    $('#reservaFecha, #reservaBarbero').off('change.cat').on('change.cat', pintarHoras); $('#reservaServicio').off('change.cat').on('change.cat', resumenReserva);
    $('#reservaHoras').off('click.cat', '.hora--libre').on('click.cat', '.hora--libre', function () { S.reserva.hora = this.dataset.hora; $('.hora').removeClass('hora--elegida'); $(this).addClass('hora--elegida'); resumenReserva(); });
    $('#formReserva').off('submit.cat').on('submit.cat', function (e) { e.preventDefault(); if (!S.reserva.hora) { aviso('Elige un horario', 'Selecciona una hora disponible (verde).'); return; } if (!this.reportValidity()) return;
      const p = prod($id('reservaServicio').value); $id('confServicio').textContent = p.nombre; $id('confCuando').textContent = `${$id('reservaFecha').value} · ${S.reserva.hora} · ${$id('reservaBarbero').value}`; $id('confMonto').textContent = dinero(p.precio); $id('reservaPaso1').hidden = true; $id('reservaPaso2').hidden = false; iniciarCuenta(); });
    $('#reservaVolver').off('click.cat').on('click.cat', () => { detener(); $id('reservaPaso1').hidden = false; $id('reservaPaso2').hidden = true; });
    $('#reservaConfirmar').off('click.cat').on('click.cat', () => { detener(); const p = prod($id('reservaServicio').value); const r = { servicio: p.nombre, fecha: $id('reservaFecha').value, hora: S.reserva.hora, barbero: $id('reservaBarbero').value, nombre: $('#reservaNombre').val().trim(), telefono: $('#reservaTelefono').val().trim(), total: p.precio };
      const reg = enviar(`Hola, soy ${r.nombre}. Quiero reservar: ${r.servicio} con ${r.barbero} el ${r.fecha} a las ${r.hora}. Monto: ${dinero(r.total)}. Tel: ${r.telefono}`, 'reserva', r); const lista = leer('reservas', []); lista.push(r); guardar('reservas', lista); cerrar(); aviso('Reserva registrada', `Código ${reg.id}`); });
    /* contacto */
    $('#cNombre, #cCorreo, #cMensaje').off('input.cat blur.cat').on('input.cat blur.cat', function () { $(this).data('tocado', true); validarContacto(false); });
    $('#formContacto').off('submit.cat').on('submit.cat', function (e) { e.preventDefault(); if (!validarContacto(true)) return; const r = { nombre: $('#cNombre').val().trim(), correo: $('#cCorreo').val().trim(), mensaje: $('#cMensaje').val().trim() };
      enviar(`Hola, soy ${r.nombre} (${r.correo}). ${r.mensaje}`, 'consulta', r); $('#alertaOk').stop(true, true).slideDown().delay(3000).slideUp(); this.reset(); $('#cNombre, #cCorreo, #cMensaje').removeData('tocado'); });
    /* menú hamburguesa hidratado + volver arriba */
    $('#btnMenu').off('click.cat').on('click.cat', function () { const n = $('#menu'); n.stop(true, true).slideToggle(300, () => $('#btnMenu').attr('aria-expanded', String(n.is(':visible')))); });
    $('#menu a').off('click.cat').on('click.cat', () => { if ($('#btnMenu').is(':visible')) $('#menu').slideUp(200); });
    $('#subir').off('click.cat').on('click.cat', () => window.scrollTo({ top: 0, behavior: 'smooth' })); $(window).off('scroll.cat').on('scroll.cat', () => $('#subir').toggleClass('subir--visible', window.scrollY > 600));
    window.addEventListener('online', estadoRed); window.addEventListener('offline', estadoRed); window.addEventListener('pagehide', () => { temporizadores.forEach(clearInterval); detener(); });
  }

  /* ---------- puerta de edad (licorería) ---------- */
  function puertaEdad() {
    if (document.documentElement.dataset.edad !== 'si') return;
    const ok = leer('edad', 0); if (ok && Date.now() - ok < 864e5) return;
    $('#fondoModal').prop('hidden', false).show(); $('#modalEdad').prop('hidden', false).show(); document.body.classList.add('pagina--bloqueada');
    $('#edadSi').off('click.cat').on('click.cat', () => { guardar('edad', Date.now()); $('#modalEdad').fadeOut(200, function () { this.hidden = true; }); $('#fondoModal').fadeOut(200, function () { this.hidden = true; }); document.body.classList.remove('pagina--bloqueada'); });
    $('#edadNo').off('click.cat').on('click.cat', () => { document.body.replaceChildren(el('p', 'bloqueo', 'Este sitio es solo para mayores de 18 años. Beber en exceso es dañino para la salud.')); });
  }

  /* ---------- hidratación + PWA + inicio ---------- */
  function hidratar() { const c = $('#contenedorMenu'); if (c.attr('data-hidratado') === 'true') return; $('#btnMenu').removeClass('boton-icono--estatico').attr('aria-label', 'Menú interactivo (hidratado)'); c.attr('data-hidratado', 'true'); document.body.dataset.hidratado = 'true'; }
  function pwa() { if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').then((r) => console.log('Service Worker PWA Registrado con Éxito:', r.scope)).catch((e) => console.error('Fallo en Registro de SW:', e))); }
  function iniciar() { iniciarTema(); puertaEdad(); cargar(); estadoRed(); $id('anio').textContent = new Date().getFullYear(); setTimeout(hidratar, 500); pwa();
    console.log(window.innerWidth <= 768 || /Android|iPhone|iPad/i.test(navigator.userAgent) ? 'Dispositivo Móvil o Tablet Detectado: Cargando Modo PWA' : 'Escritorio detectado'); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true }); else iniciar();
})();
