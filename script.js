// ============================================================
// MI AGENCIA — Dashboard RRSS v3
// script.js — Multi-brand, stats, feed, charts
// ============================================================

// ── STATS FIELDS CONFIG ─────────────────────────────────────
const STATS_FIELDS = {
  instagram: [
    { key:'ig_alcance',         label:'Alcance',                  type:'number' },
    { key:'ig_impresiones',     label:'Impresiones',               type:'number' },
    { key:'ig_visualizaciones', label:'Visualizaciones',           type:'number' },
    { key:'ig_megustas',        label:'Me gusta',                  type:'number' },
    { key:'ig_comentarios',     label:'Comentarios',               type:'number' },
    { key:'ig_guardados',       label:'Guardados',                 type:'number' },
    { key:'ig_compartidos',     label:'Compartidos',               type:'number' },
    { key:'ig_cuentas_alcanzadas', label:'Cuentas alcanzadas',     type:'number' },
    { key:'ig_cuentas_interacciones', label:'Cuentas con interacción', type:'number' },
    { key:'ig_visitas_perfil',  label:'Visitas al perfil',         type:'number' },
    { key:'ig_clicks_enlace',   label:'Clics en enlace',           type:'number' },
    { key:'ig_seguidores_ganados', label:'Seguidores ganados',     type:'number' },
    { key:'ig_tiempo_promedio', label:'Tiempo promedio (seg)',      type:'number' },
    { key:'ig_porcentaje_visto',label:'% del video visto',         type:'number' },
    { key:'ig_stickers',        label:'Interacciones stickers',    type:'number' },
    { key:'ig_respuestas',      label:'Respuestas (historias)',     type:'number' },
    { key:'ig_notas',           label:'Notas / contexto',          type:'text'   },
  ],
  tiktok: [
    { key:'tk_visualizaciones', label:'Visualizaciones',           type:'number' },
    { key:'tk_likes',           label:'Likes',                     type:'number' },
    { key:'tk_comentarios',     label:'Comentarios',               type:'number' },
    { key:'tk_compartidos',     label:'Compartidos',               type:'number' },
    { key:'tk_guardados',       label:'Guardados',                 type:'number' },
    { key:'tk_alcance',         label:'Alcance',                   type:'number' },
    { key:'tk_impresiones',     label:'Impresiones',               type:'number' },
    { key:'tk_tiempo_promedio', label:'Tiempo promedio (seg)',      type:'number' },
    { key:'tk_porcentaje_visto',label:'% del video visto',         type:'number' },
    { key:'tk_nuevos_seguidores',label:'Nuevos seguidores',        type:'number' },
    { key:'tk_clics_perfil',    label:'Clics al perfil',           type:'number' },
    { key:'tk_interacciones',   label:'Interacciones totales',     type:'number' },
    { key:'tk_completado',      label:'% video completado',        type:'number' },
    { key:'tk_trafico_fuente',  label:'Fuente de tráfico principal', type:'text' },
    { key:'tk_pais_top',        label:'País principal',            type:'text'   },
    { key:'tk_genero',          label:'Género principal (%)',       type:'text'   },
    { key:'tk_notas',           label:'Notas / contexto',          type:'text'   },
  ],
  facebook: [
    { key:'fb_alcance',         label:'Alcance',                   type:'number' },
    { key:'fb_impresiones',     label:'Impresiones',               type:'number' },
    { key:'fb_reacciones',      label:'Reacciones',                type:'number' },
    { key:'fb_comentarios',     label:'Comentarios',               type:'number' },
    { key:'fb_compartidos',     label:'Compartidos',               type:'number' },
    { key:'fb_clics',           label:'Clics en publicación',      type:'number' },
  ],
};

// ── ESTADO GLOBAL ───────────────────────────────────────────
let state = {
  currentBrand: 'pal',
  currentMonth: 'Marzo',
  brands: {}
};

let _editingId   = null;
let _statsPlatform = 'instagram';
let _confirmCb   = null;
let _dragSrcIdx  = null;

// ── UTILS ────────────────────────────────────────────────────
const uid = () => 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2,6);

function fmt(d) {
  if (!d) return '—';
  const [y,m,dd] = d.split('-');
  return `${dd}/${m}/${y}`;
}

function trunc(s, n) {
  if (!s) return '—';
  return s.length > n ? s.substring(0,n) + '…' : s;
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = 'toast'; }, 3200);
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function openModal(id) {
  document.getElementById(id).classList.add('open');
}

function estadoBadge(estado) {
  const map = {
    'Publicado':'publicado','No publicado':'no-publicado','Aprobado':'aprobado',
    'En aprobación':'en-aprobacion','En edición':'en-edicion','Grabado':'grabado',
    'Guion':'guion','Idea':'idea'
  };
  return `<span class="estado-badge eb-${map[estado]||'idea'}">${estado}</span>`;
}

function calcEngagement(stats, platform) {
  if (!stats) return null;
  if (platform === 'instagram') {
    const views = +stats.ig_visualizaciones || +stats.ig_alcance || 0;
    const inter = (+stats.ig_megustas||0) + (+stats.ig_comentarios||0) + (+stats.ig_guardados||0) + (+stats.ig_compartidos||0);
    return views ? ((inter/views)*100).toFixed(2) : null;
  }
  if (platform === 'tiktok') {
    const views = +stats.tk_visualizaciones || 0;
    const inter = (+stats.tk_likes||0) + (+stats.tk_comentarios||0) + (+stats.tk_compartidos||0) + (+stats.tk_guardados||0);
    return views ? ((inter/views)*100).toFixed(2) : null;
  }
  if (platform === 'facebook') {
    const reach = +stats.fb_alcance || 0;
    const inter = (+stats.fb_reacciones||0) + (+stats.fb_comentarios||0) + (+stats.fb_compartidos||0);
    return reach ? ((inter/reach)*100).toFixed(2) : null;
  }
  return null;
}

function resizeImage(file, maxW=600, maxH=600, quality=0.82) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxW || h > maxH) {
          const r = Math.min(maxW/w, maxH/h);
          w = Math.round(w*r); h = Math.round(h*r);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img,0,0,w,h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ── LOCAL STORAGE ────────────────────────────────────────────
const STORAGE_KEY = 'pal_agency_v3';

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { state = JSON.parse(raw); }
    catch(e) { seedData(); }
  } else {
    seedData();
  }
}

// ── BRAND HELPERS ────────────────────────────────────────────
function currentBrand() {
  return state.brands[state.currentBrand];
}

function brandData() {
  return currentBrand();
}

function mkBrand(id, nombre, sector, color, ig, tk, fb, plats, minPub, idealPub, histMeta) {
  return {
    id, nombre, sector, color,
    igHandle: ig, tkHandle: tk, fbHandle: fb,
    plataformas: plats,
    minPub, idealPub, histMeta,
    requireMeeting: true, requireReport: true,
    contenidos: [], ideas: [], grabaciones: [],
    contractual: {},
    stats: {},
    feed: { order: [], approved: false, approvedDate: '' }
  };
}

// ── SEED DATA ────────────────────────────────────────────────
function seedData() {
  const pal = mkBrand('pal','Palpitare IPS','Salud cardiovascular','#F45A00',
    '@palpitare_ips','@palpitare_ips','Palpitare IPS',
    ['instagram','tiktok','facebook'], 8, 12, 12);

  const so = mkBrand('so','Sentido Óptico','Salud visual','#2F6B55',
    '@sentidooptico','@sentidooptico','Sentido Óptico',
    ['instagram','facebook'], 6, 10, 8);

  const mk = (mes, idea, tipo, objetivo, estado, pub) => ({
    id: uid(), mes, tipo, idea, objetivo,
    hook:'', cta:'', estado,
    clientAprobo: estado === 'Publicado' ? 'Sí' : '',
    fechaAprobacion: '',
    obs: '',
    ig: { publicado: estado==='Publicado'&&pub ? 'Sí':'No', fecha:'', link:'' },
    tk: { publicado:'No', fecha:'', link:'' },
    fb: { publicado:'No', fecha:'', link:'' },
    feedOrder: 999,
    createdAt: new Date().toISOString()
  });

  pal.contenidos = [
    mk('Marzo','Corazón en mujeres – síntomas distintos','Reel','Educación','Publicado',true),
    mk('Marzo','Presentación humana del equipo','Reel','Humanización','Publicado',true),
    mk('Marzo','Mito: "En mi familia todos son hipertensos, es normal"','Reel','Educación','Publicado',true),
    mk('Marzo','Señales de alerta que no debes normalizar','Reel','Educación','Publicado',true),
    mk('Marzo','Lo que vemos en un ecocardiograma','Reel','Autoridad','Publicado',true),
    mk('Marzo','Antecedentes familiares que no debes ignorar','Reel','Educación','Publicado',true),
    mk('Marzo','No todo dolor en el pecho es ansiedad','Reel','Educación','Publicado',true),
    mk('Marzo','Eco vs Electro explicado fácil','Carrusel','Educación','Publicado',true),
    mk('Marzo','¿Cuándo ir al cardiólogo?','Reel','Conversión','Publicado',true),
    mk('Marzo','Hipertensión silenciosa','Reel','Educación','Publicado',true),
    mk('Marzo','Qué hace un internista','Reel','Educación','No publicado',false),
    mk('Marzo','Chequeo cardiovascular ¿cada cuánto?','Reel','Conversión','No publicado',false),
    mk('Abril','Prevención cardiovascular en jóvenes','Reel','Educación','Publicado',true),
    mk('Abril','Autoridad médica – Dr. Cardiólogo','Reel','Autoridad','Publicado',true),
    mk('Abril','Hábitos cardíacos diarios','Reel','Educación','Publicado',true),
    mk('Abril','Equipo Palpitare – Humanización','Reel','Humanización','Publicado',true),
    mk('Abril','Consulta tu corazón – CTA','Reel','Conversión','Publicado',true),
    mk('Abril','Factores de riesgo cardiovascular','Reel','Educación','Grabado',false),
    mk('Abril','Alimentación y corazón','Reel','Educación','Grabado',false),
    mk('Abril','Ejercicio cardíaco seguro','Reel','Educación','Grabado',false),
    mk('Abril','Estrés y salud cardiovascular','Reel','Educación','Grabado',false),
    mk('Abril','Medicamentos comunes explicados','Reel','Autoridad','Grabado',false),
    mk('Abril','Entrevista Dr. 1 – pendiente edición','Reel','Autoridad','En edición',false),
    mk('Abril','Entrevista Dr. 2 – pendiente edición','Reel','Educación','En edición',false),
  ];

  // Seed some IG stats for Marzo published content
  const igViews = [42000,18500,55000,31000,28000,24000,67000,15000,22000,38000];
  const igLikes  = [1200,560,1800,890,740,620,2100,480,650,1150];
  pal.contenidos.filter(c=>c.mes==='Marzo'&&c.estado==='Publicado').forEach((c,i)=>{
    pal.stats[c.id] = {
      instagram: {
        ig_visualizaciones: igViews[i]||20000,
        ig_megustas: igLikes[i]||500,
        ig_comentarios: Math.floor((igLikes[i]||500)*0.08),
        ig_guardados: Math.floor((igLikes[i]||500)*0.15),
        ig_compartidos: Math.floor((igLikes[i]||500)*0.06),
        ig_alcance: Math.floor((igViews[i]||20000)*0.8),
        ig_impresiones: Math.floor((igViews[i]||20000)*1.2),
        ig_cuentas_alcanzadas: Math.floor((igViews[i]||20000)*0.75),
        ig_cuentas_interacciones: igLikes[i]||500,
        ig_seguidores_ganados: Math.floor(Math.random()*40)+5,
      },
      tiktok: {},
      facebook: {}
    };
    c.ig.publicado = 'Sí';
    c.ig.fecha = `2025-03-${String(i*2+1).padStart(2,'0')}`;
  });

  pal.contractual = {
    Marzo: { reunion: true,  reporte: true,  fueraAlcance: '' },
    Abril: { reunion: false, reporte: false, fueraAlcance: '' }
  };

  state.brands = { pal, so };
  state.currentBrand = 'pal';
  state.currentMonth = 'Marzo';
  save();
}

// ── TAB NAVIGATION ───────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-'+tab));
  const m = state.currentMonth;
  if (tab==='dashboard')    renderDashboard();
  if (tab==='parrilla')     renderParrilla();
  if (tab==='estadisticas') renderEstadisticas();
  if (tab==='feed')         renderFeed();
  if (tab==='contractual')  renderContractual();
  if (tab==='ideas')        renderIdeas();
  if (tab==='grabaciones')  renderGrabaciones();
  if (tab==='informe')      renderInforme();
  if (tab==='configuracion') renderConfiguracion();
}

function onMonthChange() {
  state.currentMonth = document.getElementById('monthSelect').value;
  save();
  // re-render active tab
  const active = document.querySelector('.nav-item.active');
  if (active) switchTab(active.dataset.tab);
}

// ── BRAND SWITCHER ────────────────────────────────────────────
function toggleBrandDropdown() {
  document.getElementById('brandDropdown').classList.toggle('open');
}

document.addEventListener('click', e => {
  if (!e.target.closest('#brandSwitcher')) {
    const dd = document.getElementById('brandDropdown');
    if (dd) dd.classList.remove('open');
  }
});

function switchBrand(id) {
  state.currentBrand = id;
  save();
  updateSidebarBrand();
  document.getElementById('brandDropdown').classList.remove('open');
  const active = document.querySelector('.nav-item.active');
  if (active) switchTab(active.dataset.tab);
}

function updateSidebarBrand() {
  const b = currentBrand();
  if (!b) return;
  const av = document.getElementById('sidebarBrandAvatar');
  const nm = document.getElementById('sidebarBrandName');
  const sc = document.getElementById('sidebarBrandSector');
  av.textContent = b.nombre.charAt(0).toUpperCase();
  av.style.background = b.color || '#F45A00';
  nm.textContent = b.nombre;
  sc.textContent = b.sector || '';
  renderBrandList();
}

function renderBrandList() {
  const bl = document.getElementById('brandList');
  bl.innerHTML = Object.values(state.brands).map(b => `
    <div class="brand-list-item ${b.id===state.currentBrand?'active':''}" onclick="switchBrand('${b.id}')">
      <div class="brand-avatar" style="background:${b.color||'#F45A00'};font-size:12px;width:28px;height:28px;line-height:28px;text-align:center;border-radius:8px;color:#fff;font-weight:700;flex-shrink:0;">${b.nombre.charAt(0)}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${b.nombre}</div>
        <div style="font-size:11px;opacity:.7;">${b.sector||''}</div>
      </div>
    </div>
  `).join('');
}

function openNuevaMarca(id = null) {
  const b = id ? state.brands[id] : null;
  document.getElementById('modalMarcaTitle').textContent = b ? 'Editar marca' : 'Nueva marca';
  document.getElementById('marcaId').value = id || '';
  const g = (eid,val) => { const el=document.getElementById(eid); if(el) el.value=val||''; };
  g('mNombre', b?.nombre); g('mSector', b?.sector);
  document.getElementById('mColor').value = b?.color || '#F45A00';
  g('mIgHandle', b?.igHandle); g('mTkHandle', b?.tkHandle); g('mFbHandle', b?.fbHandle);
  ['ig','tk','fb','yt','li'].forEach(p => {
    const el = document.getElementById('mPlat'+p.charAt(0).toUpperCase()+p.slice(1));
    if (el) el.checked = b?.plataformas?.includes({ig:'instagram',tk:'tiktok',fb:'facebook',yt:'youtube',li:'linkedin'}[p]) || false;
  });
  g('mMinPub', b?.minPub??8); g('mIdealPub', b?.idealPub??12); g('mHistMeta', b?.histMeta??12);
  document.getElementById('mRequireMeeting').value = String(b?.requireMeeting??true);
  document.getElementById('mRequireReport').value  = String(b?.requireReport??true);
  openModal('modal-marca');
}

function saveMarca() {
  const nombre = document.getElementById('mNombre').value.trim();
  if (!nombre) { showToast('El nombre de marca es obligatorio','error'); return; }
  const existingId = document.getElementById('marcaId').value;
  const id = existingId || uid();
  const plats = [];
  if (document.getElementById('mPlatIg')?.checked) plats.push('instagram');
  if (document.getElementById('mPlatTk')?.checked) plats.push('tiktok');
  if (document.getElementById('mPlatFb')?.checked) plats.push('facebook');
  if (document.getElementById('mPlatYt')?.checked) plats.push('youtube');
  if (document.getElementById('mPlatLi')?.checked) plats.push('linkedin');

  const existing = state.brands[existingId] || {};
  state.brands[id] = {
    ...mkBrand(id,nombre,
      document.getElementById('mSector').value.trim(),
      document.getElementById('mColor').value,
      document.getElementById('mIgHandle').value.trim(),
      document.getElementById('mTkHandle').value.trim(),
      document.getElementById('mFbHandle').value.trim(),
      plats,
      +document.getElementById('mMinPub').value||8,
      +document.getElementById('mIdealPub').value||12,
      +document.getElementById('mHistMeta').value||12),
    requireMeeting: document.getElementById('mRequireMeeting').value==='true',
    requireReport:  document.getElementById('mRequireReport').value==='true',
    // preserve data
    contenidos: existing.contenidos||[],
    ideas:      existing.ideas||[],
    grabaciones:existing.grabaciones||[],
    contractual:existing.contractual||{},
    stats:      existing.stats||{},
    feed:       existing.feed||{order:[],approved:false,approvedDate:''}
  };
  if (!state.currentBrand) state.currentBrand = id;
  save();
  updateSidebarBrand();
  closeModal('modal-marca');
  showToast('Marca guardada ✓');
  if (document.getElementById('tab-configuracion').classList.contains('active')) renderConfiguracion();
}

function editMarca(id) { openNuevaMarca(id); }

function deleteMarca(id) {
  if (Object.keys(state.brands).length <= 1) { showToast('Debes tener al menos una marca','error'); return; }
  confirmAction('¿Eliminar esta marca?', 'Se borrarán todos sus datos. Esta acción no se puede deshacer.', () => {
    delete state.brands[id];
    if (state.currentBrand === id) state.currentBrand = Object.keys(state.brands)[0];
    save(); updateSidebarBrand();
    renderConfiguracion();
    showToast('Marca eliminada','error');
  });
}

// ── CONFIRM MODAL ─────────────────────────────────────────────
function confirmAction(title, msg, cb) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').textContent   = msg;
  _confirmCb = cb;
  openModal('modal-confirm');
}

function execConfirm() {
  closeModal('modal-confirm');
  if (_confirmCb) { _confirmCb(); _confirmCb = null; }
}

// ── CANVAS CHARTS ─────────────────────────────────────────────
function clearCanvas(id) {
  const c = document.getElementById(id);
  if (!c) return null;
  const ctx = c.getContext('2d');
  ctx.clearRect(0,0,c.width,c.height);
  return ctx;
}

function drawDonut(id, data, colors, labels) {
  const ctx = clearCanvas(id);
  if (!ctx) return;
  const c = document.getElementById(id);
  const W = c.width, H = c.height;
  const legendH = Math.min(labels.length, 7) * 20 + 12;
  const chartH   = H - legendH;
  const cx = W/2, cy = chartH/2;
  const R = Math.min(cx, cy) - 14;
  const r = R * 0.6;
  const total = data.reduce((a,b)=>a+b,0);

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  if (!total) {
    ctx.fillStyle = '#D7C2A8';
    ctx.font = '13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Sin datos aún', cx, cy);
    return;
  }

  // Draw slices with gaps
  let angle = -Math.PI / 2;
  const gap = 0.025;
  data.forEach((val, i) => {
    if (!val) return;
    const slice = (val / total) * Math.PI * 2 - gap;
    ctx.beginPath();
    ctx.arc(cx, cy, R, angle + gap/2, angle + slice + gap/2);
    ctx.arc(cx, cy, r, angle + slice + gap/2, angle + gap/2, true);
    ctx.closePath();
    ctx.fillStyle = colors[i] || '#ccc';
    ctx.fill();
    angle += slice + gap;
  });

  // Center hole
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();

  // Center text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#4A1D05';
  ctx.font = 'bold 26px Instrument Serif, serif';
  ctx.fillText(total, cx, cy - 8);
  ctx.font = '10px Inter, sans-serif';
  ctx.fillStyle = '#8B8B8B';
  ctx.fillText('total', cx, cy + 12);

  // Legend at bottom (only non-zero)
  const shown = labels.map((l,i)=>({l,i,v:data[i]})).filter(x=>x.v>0).slice(0,7);
  const lx = 6;
  shown.forEach(({l, i, v}, idx) => {
    const y = chartH + 10 + idx * 20;
    // dot
    ctx.beginPath();
    ctx.arc(lx + 5, y + 6, 5, 0, Math.PI*2);
    ctx.fillStyle = colors[i] || '#ccc';
    ctx.fill();
    ctx.fillStyle = '#5C5C5C';
    ctx.font = '10.5px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${l}  ${v}`, lx + 14, y);
  });
}

function drawVerticalBar(id, labels, values, color='#F45A00', maxVal) {
  const ctx = clearCanvas(id);
  if (!ctx) return;
  const c = document.getElementById(id);
  const W = c.width, H = c.height;
  const padL=36, padR=12, padT=24, padB=32;
  const chartW = W-padL-padR, chartH = H-padT-padB;
  const maxV = maxVal || Math.max(...values, 1);
  const n = labels.length;
  const groupW = chartW / Math.max(n, 1);
  const barW = Math.min(groupW * 0.5, 40);

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  // Grid lines (very soft)
  [0, 0.25, 0.5, 0.75, 1].forEach(pct => {
    const y = padT + chartH * (1 - pct);
    ctx.beginPath();
    ctx.moveTo(padL, y); ctx.lineTo(W - padR, y);
    ctx.strokeStyle = pct === 0 ? 'rgba(74,29,5,0.1)' : 'rgba(74,29,5,0.04)';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (pct > 0) {
      ctx.fillStyle = '#B0A89E';
      ctx.font = '9px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(Math.round(maxV * pct), padL - 5, y);
    }
  });

  labels.forEach((lbl, i) => {
    const cx = padL + groupW * i + groupW / 2;
    const x  = cx - barW / 2;
    const rawH = (values[i] / maxV) * chartH;
    const bH = Math.max(3, rawH);
    const y  = padT + chartH - bH;
    const rr = Math.min(6, barW / 2);

    // gradient bar
    const grad = ctx.createLinearGradient(x, y, x, y + bH);
    grad.addColorStop(0, color);
    grad.addColorStop(1, color + 'AA');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.lineTo(x + barW - rr, y);
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + rr);
    ctx.lineTo(x + barW, y + bH);
    ctx.lineTo(x, y + bH);
    ctx.lineTo(x, y + rr);
    ctx.quadraticCurveTo(x, y, x + rr, y);
    ctx.closePath();
    ctx.fill();

    // value above bar
    if (values[i] > 0) {
      ctx.fillStyle = '#4A1D05';
      ctx.font = '600 10.5px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(values[i], cx, y - 4);
    }

    // label below
    ctx.fillStyle = '#8B8B8B';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(trunc(lbl, 7), cx, padT + chartH + 7);
  });
}

function drawHorizontalBar(id, labels, values, color='#F45A00') {
  const ctx = clearCanvas(id);
  if (!ctx) return;
  const c = document.getElementById(id);
  const W = c.width, H = c.height;
  const labelW = 126;
  const padL = 8, padR = 64, padT = 6, padB = 6;
  const chartW = W - padL - labelW - padR;
  const n = Math.max(labels.length, 1);
  const rowH = (H - padT - padB) / n;
  const maxV = Math.max(...values, 1);

  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, H);

  labels.forEach((lbl, i) => {
    const y  = padT + i * rowH;
    const bH = Math.max(Math.round(rowH * 0.38), 8);
    const by = y + (rowH - bH) / 2;
    const bW = Math.max(4, ((values[i] || 0) / maxV) * chartW);
    const bx = padL + labelW;
    const rr = bH / 2;

    // track
    ctx.fillStyle = '#F8F5EF';
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(bx, by, chartW, bH, rr)
      : (ctx.rect(bx, by, chartW, bH));
    ctx.fill();

    // fill
    const grad = ctx.createLinearGradient(bx, 0, bx + bW, 0);
    grad.addColorStop(0, color + 'EE');
    grad.addColorStop(1, color + '99');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(bx, by, bW, bH, rr)
      : (ctx.rect(bx, by, bW, bH));
    ctx.fill();

    // label
    ctx.fillStyle = '#5C5C5C';
    ctx.font = '500 11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(trunc(lbl, 16), padL + labelW - 8, y + rowH / 2);

    // value
    ctx.fillStyle = '#2B2B2B';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText((values[i] || 0).toLocaleString(), bx + bW + 8, y + rowH / 2);
  });
}

// ── DASHBOARD ─────────────────────────────────────────────────
function renderDashboard() {
  const b = currentBrand();
  const m = state.currentMonth;
  document.getElementById('dashBrandName').textContent = b.nombre;
  document.getElementById('dashMonth').textContent = m + ' 2025';

  const cs = b.contenidos.filter(c=>c.mes===m);
  const pub    = cs.filter(c=>c.estado==='Publicado').length;
  const total  = cs.length;
  const grab   = cs.filter(c=>c.estado==='Grabado').length;
  const edic   = cs.filter(c=>c.estado==='En edición').length;
  const aprob  = cs.filter(c=>c.estado==='En aprobación').length;
  const hist   = cs.filter(c=>c.tipo==='Historia').length;
  const reels  = cs.filter(c=>c.tipo==='Reel').length;
  const carr   = cs.filter(c=>c.tipo==='Carrusel').length;

  // KPI cards
  const kpis = [
    { label:'Total',        val:total, icon:'◉', color:'#F45A00' },
    { label:'Publicados',   val:pub,   icon:'✓',  color:'#27AE60' },
    { label:'Grabados',     val:grab,  icon:'◑',  color:'#8E44AD' },
    { label:'En edición',   val:edic,  icon:'✏',  color:'#E67E22' },
    { label:'En aprobación',val:aprob, icon:'⏳', color:'#2980B9' },
    { label:'Reels',        val:reels, icon:'▶',  color:'#F45A00' },
    { label:'Carruseles',   val:carr,  icon:'⊞',  color:'#16A085' },
    { label:'Historias',    val:hist,  icon:'○',  color:'#C0392B' },
  ];
  document.getElementById('kpiGrid').innerHTML = kpis.map(k=>`
    <div class="kpi-card" style="--kpi-color:${k.color}">
      <div class="kpi-card-top">
        <span class="kpi-icon-label">${k.icon}</span>
        <div class="kpi-icon-box" style="background:${k.color};opacity:0.15;border-radius:9px;width:34px;height:34px;"></div>
      </div>
      <div class="kpi-value">${k.val}</div>
      <div class="kpi-label">${k.label}</div>
    </div>
  `).join('');

  // Best content
  const statsMap = b.stats || {};
  let best = null, bestViews = 0;
  cs.filter(c=>c.estado==='Publicado').forEach(c => {
    const s = statsMap[c.id];
    const v = s?.instagram ? (+s.instagram.ig_visualizaciones||0) : 0;
    if (v > bestViews) { bestViews = v; best = c; }
  });
  const bcard = document.getElementById('bestContentCard');
  if (best) {
    const eng = calcEngagement(statsMap[best.id]?.instagram,'instagram');
    bcard.innerHTML = `
      <div class="best-content-label">⭐ Mejor contenido del mes</div>
      <div class="best-content-idea">${best.idea}</div>
      <div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:8px;">
        <div>
          <div class="best-content-stat">${bestViews.toLocaleString()}</div>
          <div class="best-content-label">visualizaciones</div>
        </div>
        ${eng?`<div>
          <div class="best-content-stat">${eng}%</div>
          <div class="best-content-label">engagement</div>
        </div>`:''}
      </div>
      <div style="margin-top:14px;display:flex;gap:8px;">
        <span style="background:rgba(255,255,255,0.15);color:#fff;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;">${best.tipo}</span>
        <span style="background:rgba(255,255,255,0.15);color:#fff;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;">${best.mes}</span>
      </div>`;
  } else {
    bcard.innerHTML = `
      <div class="best-content-label">⭐ Mejor contenido del mes</div>
      <p style="color:rgba(255,255,255,0.5);font-size:14px;margin-top:12px;">Sin estadísticas registradas para este mes.</p>`;
  }

  // Charts
  const estados = ['Publicado','Grabado','En edición','En aprobación','Guion','Idea','No publicado'];
  const estadoVals = estados.map(e=>cs.filter(c=>c.estado===e).length);
  const estadoColors = ['#27AE60','#8E44AD','#E67E22','#2980B9','#F39C12','#95A5A6','#E74C3C'];
  drawDonut('chartDonut', estadoVals, estadoColors, estados);

  // platforms bar
  const igPub = cs.filter(c=>c.ig?.publicado==='Sí').length;
  const tkPub = cs.filter(c=>c.tk?.publicado==='Sí').length;
  const fbPub = cs.filter(c=>c.fb?.publicado==='Sí').length;
  drawVerticalBar('chartPlatforms',['Instagram','TikTok','Facebook'],[igPub,tkPub,fbPub],'#F45A00',b.idealPub);

  // Top5 views
  const pubCs = cs.filter(c=>c.estado==='Publicado' && statsMap[c.id]?.instagram?.ig_visualizaciones)
    .sort((a,z)=>(statsMap[z.id]?.instagram?.ig_visualizaciones||0)-(statsMap[a.id]?.instagram?.ig_visualizaciones||0))
    .slice(0,5);
  drawHorizontalBar('chartTop5',
    pubCs.map(c=>trunc(c.idea,20)),
    pubCs.map(c=>+statsMap[c.id]?.instagram?.ig_visualizaciones||0),
    '#FFA15C');

  // Engagement by platform
  const avgEng = (plat) => {
    const vals = cs.map(c=>{
      const s = statsMap[c.id];
      return s ? calcEngagement(s[plat],plat) : null;
    }).filter(v=>v!==null).map(Number);
    return vals.length ? (vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2) : 0;
  };
  drawVerticalBar('chartEngagement',['Instagram','TikTok','Facebook'],
    [+avgEng('instagram'),+avgEng('tiktok'),+avgEng('facebook')],'#F45A00',10);

  // Compliance
  const cc = b.contractual[m] || {};
  const pts = Math.min(100, Math.round((pub/b.idealPub)*60) + (cc.reunion?20:0) + (cc.reporte?20:0));
  const color = pts>=80?'#27AE60':pts>=50?'#E67E22':'#E74C3C';
  document.getElementById('dashCompliance').innerHTML = `
    <div style="background:#fff;border-radius:14px;padding:22px 26px;box-shadow:0 2px 16px rgba(74,29,5,0.08);border:1px solid rgba(215,194,168,0.25);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <span style="font-family:'Instrument Serif',serif;font-size:18px;color:#4A1D05;">Cumplimiento del mes</span>
        <span style="font-family:'Instrument Serif',serif;font-size:36px;font-weight:400;color:${color};">${pts}%</span>
      </div>
      <div style="height:10px;background:#F8F5EF;border-radius:8px;overflow:hidden;margin-bottom:16px;">
        <div style="height:100%;width:${pts}%;background:linear-gradient(90deg,${color},${color}CC);border-radius:8px;transition:width .6s ease;"></div>
      </div>
      <div style="display:flex;gap:0;border-top:1px solid #F8F5EF;padding-top:14px;">
        <div style="flex:1;text-align:center;border-right:1px solid #F8F5EF;">
          <div style="font-family:'Instrument Serif',serif;font-size:28px;color:#4A1D05;">${pub}<span style="font-size:16px;color:#aaa;">/${b.idealPub}</span></div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9B8577;">Publicaciones</div>
        </div>
        <div style="flex:1;text-align:center;border-right:1px solid #F8F5EF;">
          <div style="font-size:26px;">${cc.reunion?'✅':'❌'}</div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9B8577;">Reunión</div>
        </div>
        <div style="flex:1;text-align:center;">
          <div style="font-size:26px;">${cc.reporte?'✅':'❌'}</div>
          <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#9B8577;">Reporte</div>
        </div>
      </div>
    </div>`;
}

// ── PARRILLA ──────────────────────────────────────────────────
function renderParrilla() {
  const b = currentBrand();
  const m = state.currentMonth;
  document.getElementById('parrillaBrandMonth').textContent = `${b.nombre} — ${m}`;
  const fMes   = document.getElementById('filterMes').value;
  const fEst   = document.getElementById('filterEstado').value;
  const fTipo  = document.getElementById('filterTipo').value;
  const fPlat  = document.getElementById('filterPlataforma').value;

  let data = [...b.contenidos];
  if (fMes)  data = data.filter(c=>c.mes===fMes);
  if (fEst)  data = data.filter(c=>c.estado===fEst);
  if (fTipo) data = data.filter(c=>c.tipo===fTipo);
  if (fPlat) data = data.filter(c=>c[fPlat]?.publicado==='Sí'|| (fPlat&&c[fPlat]));

  const tbody = document.getElementById('parrillaBody');
  if (!data.length) {
    tbody.innerHTML = `<tr><td colspan="14" style="text-align:center;padding:40px;color:#aaa;">Sin contenidos con esos filtros.</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map((c,i) => `
    <tr>
      <td>${i+1}</td>
      <td>${c.mes}</td>
      <td>${c.tipo}</td>
      <td title="${c.idea}">${trunc(c.idea,35)}</td>
      <td>${c.objetivo||'—'}</td>
      <td>${estadoBadge(c.estado)}</td>
      <td>${platCell(c,'ig')}</td>
      <td>${platCell(c,'tk')}</td>
      <td>${platCell(c,'fb')}</td>
      <td title="${c.hook}">${trunc(c.hook,25)}</td>
      <td title="${c.cta}">${trunc(c.cta,20)}</td>
      <td title="${c.obs}">${trunc(c.obs,20)}</td>
      <td>${fmt(c.fechaAprobacion)}</td>
      <td>
        <div class="actions-cell">
          <button class="btn-action btn-view"  onclick="viewContenido('${c.id}')"  title="Ver">👁</button>
          <button class="btn-action btn-edit"  onclick="openEditContenido('${c.id}')" title="Editar">✏</button>
          <button class="btn-action btn-stats" onclick="openStatsModal('${c.id}')" title="Estadísticas">📊</button>
          <button class="btn-action btn-del"   onclick="deleteContenido('${c.id}')" title="Eliminar">🗑</button>
        </div>
      </td>
    </tr>`).join('');
}

function platCell(c, plat) {
  const p = c[plat];
  if (!p) return '—';
  const icon = plat==='ig'?'📸':plat==='tk'?'🎵':'👥';
  if (p.publicado==='Sí') return `<span style="color:#27AE60;font-weight:600;">${icon} ✓</span>`;
  return `<span style="color:#aaa;">${icon} —</span>`;
}

function viewContenido(id) {
  const c = currentBrand().contenidos.find(x=>x.id===id);
  if (!c) return;
  openEditContenido(id);
}

function openNuevoContenido() { openEditContenido(null); }

function openEditContenido(id) {
  _editingId = id;
  const c = id ? currentBrand().contenidos.find(x=>x.id===id) : null;
  document.getElementById('modalContenidoTitle').textContent = c ? 'Editar contenido' : 'Nuevo contenido';
  document.getElementById('contenidoId').value = id || '';
  const g=(eid,val)=>{const el=document.getElementById(eid);if(el)el.value=val||'';};
  g('cMes', c?.mes||state.currentMonth);
  g('cTipo', c?.tipo||'Reel');
  g('cObjetivo', c?.objetivo||'Educación');
  g('cIdea', c?.idea);
  g('cHook', c?.hook);
  g('cCta',  c?.cta);
  g('cEstado', c?.estado||'Idea');
  g('cClientAprobo', c?.clientAprobo||'');
  g('cFechaAprobacion', c?.fechaAprobacion);
  g('cObs', c?.obs);
  buildPlatformAccordions(c);
  openModal('modal-contenido');
}

function buildPlatformAccordions(c) {
  const b = currentBrand();
  const plats = [
    { key:'ig', label:'Instagram', icon:'📸' },
    { key:'tk', label:'TikTok',    icon:'🎵' },
    { key:'fb', label:'Facebook',  icon:'👥' },
  ].filter(p => b.plataformas.includes({ig:'instagram',tk:'tiktok',fb:'facebook'}[p.key]));

  document.getElementById('platformAccordions').innerHTML = plats.map(p => `
    <div class="platform-accordion">
      <div class="platform-accordion-header">${p.icon} ${p.label}</div>
      <div class="platform-accordion-body">
        <div class="form-grid-3">
          <div class="form-group">
            <label>Estado publicación</label>
            <select id="c_${p.key}_pub">
              <option value="No">No publicado</option>
              <option value="Sí">Publicado</option>
              <option value="Pendiente">Pendiente</option>
            </select>
          </div>
          <div class="form-group">
            <label>Fecha publicación</label>
            <input type="date" id="c_${p.key}_fecha" />
          </div>
          <div class="form-group">
            <label>Link / URL</label>
            <input type="url" id="c_${p.key}_link" placeholder="https://..." />
          </div>
        </div>
      </div>
    </div>`).join('');

  plats.forEach(p => {
    const pd = c?.[p.key] || {};
    const g=(eid,val)=>{const el=document.getElementById(eid);if(el)el.value=val||'';};
    g(`c_${p.key}_pub`,  pd.publicado||'No');
    g(`c_${p.key}_fecha`, pd.fecha);
    g(`c_${p.key}_link`,  pd.link);
  });
}

function saveContenido() {
  const idea = document.getElementById('cIdea').value.trim();
  if (!idea) { showToast('El tema/idea es obligatorio','error'); return; }
  const b = currentBrand();
  const plats = [
    { key:'ig', name:'instagram' },
    { key:'tk', name:'tiktok' },
    { key:'fb', name:'facebook' },
  ].filter(p=>b.plataformas.includes(p.name));

  const platData = {};
  plats.forEach(p => {
    const pub  = document.getElementById(`c_${p.key}_pub`)?.value || 'No';
    const fecha= document.getElementById(`c_${p.key}_fecha`)?.value || '';
    const link = document.getElementById(`c_${p.key}_link`)?.value.trim() || '';
    platData[p.key] = { publicado: pub, fecha, link };
  });

  const data = {
    mes:   document.getElementById('cMes').value,
    tipo:  document.getElementById('cTipo').value,
    objetivo: document.getElementById('cObjetivo').value,
    idea,
    hook:  document.getElementById('cHook').value.trim(),
    cta:   document.getElementById('cCta').value.trim(),
    estado: document.getElementById('cEstado').value,
    clientAprobo: document.getElementById('cClientAprobo').value,
    fechaAprobacion: document.getElementById('cFechaAprobacion').value,
    obs:   document.getElementById('cObs').value.trim(),
    ...platData
  };

  if (_editingId) {
    const idx = b.contenidos.findIndex(x=>x.id===_editingId);
    if (idx!==-1) b.contenidos[idx] = { ...b.contenidos[idx], ...data };
    showToast('Contenido actualizado ✓');
  } else {
    b.contenidos.push({ id:uid(), ...data, createdAt:new Date().toISOString() });
    showToast('Contenido agregado ✓');
  }
  _editingId = null;
  save();
  closeModal('modal-contenido');
  renderParrilla();
  renderDashboard();
}

function deleteContenido(id) {
  confirmAction('¿Eliminar contenido?','Esta acción no se puede deshacer.',()=>{
    const b = currentBrand();
    b.contenidos = b.contenidos.filter(c=>c.id!==id);
    delete b.stats[id];
    b.feed.order = b.feed.order.filter(x=>x!==id);
    save(); renderParrilla(); renderDashboard();
    showToast('Contenido eliminado','error');
  });
}

// ── ESTADÍSTICAS ──────────────────────────────────────────────
function renderEstadisticas() {
  const b = currentBrand();
  const m = state.currentMonth;
  document.getElementById('statsBrandMonth').textContent = `${b.nombre} — ${m}`;
  const cs = b.contenidos.filter(c=>c.mes===m&&c.estado==='Publicado');
  const sm = b.stats||{};

  // summary cards
  const avgEng = (plat) => {
    const vals = cs.map(c=>{const s=sm[c.id];return s?calcEngagement(s[plat],plat):null;}).filter(v=>v!==null).map(Number);
    return vals.length?((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)):0;
  };
  const totalViews = cs.reduce((a,c)=>a+(+(sm[c.id]?.instagram?.ig_visualizaciones||0)),0);
  document.getElementById('statsSummary').innerHTML = `
    <div class="kpi-card"><div class="kpi-val">${cs.length}</div><div class="kpi-label">Publicados</div></div>
    <div class="kpi-card"><div class="kpi-val">${totalViews.toLocaleString()}</div><div class="kpi-label">Views IG total</div></div>
    <div class="kpi-card"><div class="kpi-val">${avgEng('instagram')}%</div><div class="kpi-label">Eng. prom. IG</div></div>
    <div class="kpi-card"><div class="kpi-val">${avgEng('tiktok')}%</div><div class="kpi-label">Eng. prom. TK</div></div>
    <div class="kpi-card"><div class="kpi-val">${avgEng('facebook')}%</div><div class="kpi-label">Eng. prom. FB</div></div>`;

  // table
  const tbody = document.getElementById('statsBody');
  if (!cs.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:40px;color:#aaa;">Sin contenidos publicados este mes.</td></tr>`;
  } else {
    tbody.innerHTML = cs.map((c,i)=>{
      const s = sm[c.id]||{};
      const igV  = s.instagram?.ig_visualizaciones||'—';
      const igE  = calcEngagement(s.instagram,'instagram');
      const tkV  = s.tiktok?.tk_visualizaciones||'—';
      const tkE  = calcEngagement(s.tiktok,'tiktok');
      const fbV  = s.facebook?.fb_alcance||'—';
      return `<tr>
        <td>${i+1}</td>
        <td title="${c.idea}">${trunc(c.idea,30)}</td>
        <td>${c.tipo}</td>
        <td>${typeof igV==='number'?igV.toLocaleString():igV}</td>
        <td>${igE?igE+'%':'—'}</td>
        <td>${typeof tkV==='number'?tkV.toLocaleString():tkV}</td>
        <td>${tkE?tkE+'%':'—'}</td>
        <td>${typeof fbV==='number'?fbV.toLocaleString():fbV}</td>
        <td><button class="btn-action btn-stats" onclick="openStatsModal('${c.id}')">✏ Stats</button></td>
      </tr>`;
    }).join('');
  }

  // stats charts
  const top5 = cs.filter(c=>sm[c.id]?.instagram?.ig_visualizaciones)
    .sort((a,z)=>(+(sm[z.id]?.instagram?.ig_visualizaciones||0))-(+(sm[a.id]?.instagram?.ig_visualizaciones||0))).slice(0,5);
  drawHorizontalBar('chartStatsTop',
    top5.map(c=>trunc(c.idea,18)),
    top5.map(c=>+(sm[c.id]?.instagram?.ig_visualizaciones||0)),'#F45A00');
  drawVerticalBar('chartStatsEng',['IG','TK','FB'],
    [+avgEng('instagram'),+avgEng('tiktok'),+avgEng('facebook')],'#FFA15C',15);
}

function openStatsModal(contenidoId) {
  const b = currentBrand();
  const c = b.contenidos.find(x=>x.id===contenidoId);
  if (!c) return;
  document.getElementById('statsContenidoId').value = contenidoId;
  document.getElementById('statsContenidoName').textContent = c.idea;
  _statsPlatform = 'instagram';
  document.querySelectorAll('.platform-tab').forEach(t=>t.classList.toggle('active',t.dataset.plat==='instagram'));
  buildStatsForm(contenidoId, 'instagram');
  openModal('modal-stats');
}

function switchStatsPlatform(plat) {
  _statsPlatform = plat;
  document.querySelectorAll('.platform-tab').forEach(t=>t.classList.toggle('active',t.dataset.plat===plat));
  const id = document.getElementById('statsContenidoId').value;
  buildStatsForm(id, plat);
}

function buildStatsForm(contenidoId, plat) {
  const b = currentBrand();
  const saved = (b.stats[contenidoId]||{})[plat]||{};
  const fields = STATS_FIELDS[plat]||[];
  document.getElementById('statsFormArea').innerHTML = `
    <div class="form-grid-3 stats-form-grid">
      ${fields.map(f=>`
        <div class="form-group">
          <label>${f.label}</label>
          <input type="${f.type}" id="sf_${f.key}" value="${saved[f.key]||''}" placeholder="${f.type==='number'?'0':''}" oninput="updateEngagementPreview()" />
        </div>`).join('')}
    </div>`;
  updateEngagementPreview();
}

function updateEngagementPreview() {
  const id  = document.getElementById('statsContenidoId').value;
  const plat = _statsPlatform;
  const fields = STATS_FIELDS[plat]||[];
  const current = {};
  fields.forEach(f=>{const el=document.getElementById('sf_'+f.key);if(el)current[f.key]=el.value;});
  const eng = calcEngagement(current, plat);
  const box = document.getElementById('statsEngagementBox');
  if (eng!==null) {
    box.innerHTML = `<strong>Engagement calculado (${plat}):</strong> <span style="color:var(--naranja);font-size:18px;font-weight:700;">${eng}%</span>`;
    box.style.display='block';
  } else {
    box.style.display='none';
  }
}

function saveStats() {
  const id   = document.getElementById('statsContenidoId').value;
  const plat = _statsPlatform;
  const b    = currentBrand();
  const fields = STATS_FIELDS[plat]||[];
  if (!b.stats[id]) b.stats[id]={};
  if (!b.stats[id][plat]) b.stats[id][plat]={};
  fields.forEach(f=>{
    const el=document.getElementById('sf_'+f.key);
    if(el) b.stats[id][plat][f.key]=f.type==='number'?+el.value||0:el.value;
  });
  save();
  closeModal('modal-stats');
  showToast('Estadísticas guardadas ✓');
  const active = document.querySelector('.nav-item.active');
  if (active?.dataset.tab==='estadisticas') renderEstadisticas();
  if (active?.dataset.tab==='dashboard') renderDashboard();
}

// ── FEED IG ───────────────────────────────────────────────────
function renderFeed() {
  const b = currentBrand();
  document.getElementById('feedBrandMonth').textContent = `${b.nombre} — Feed Instagram`;
  document.getElementById('igHandle').textContent = b.igHandle||'@cuenta';

  const igPub = b.contenidos.filter(c=>c.ig?.publicado==='Sí'||c.ig?.publicado==='Pendiente');
  if (!b.feed.order.length || b.feed.order.some(id=>!igPub.find(c=>c.id===id))) {
    b.feed.order = igPub.map(c=>c.id);
  }
  const ordered = b.feed.order.map(id=>igPub.find(c=>c.id===id)).filter(Boolean);

  const ap = b.feed;
  const apBar = document.getElementById('feedApprovalBar');
  if (ap.approved) {
    apBar.innerHTML = `<span style="color:#27AE60;font-weight:600;">✅ Feed aprobado por cliente el ${fmt(ap.approvedDate)}</span>`;
    apBar.style.display='block';
  } else {
    apBar.style.display='none';
  }

  // Grid view
  const feedGrid = document.getElementById('feedGrid');
  feedGrid.innerHTML = ordered.length ? ordered.map((c,i)=>`
    <div class="feed-cell" draggable="true" data-id="${c.id}" data-idx="${i}"
      ondragstart="onFeedDragStart(event,${i})"
      ondragover="onFeedDragOver(event)"
      ondrop="onFeedDrop(event,${i})"
      ondragend="onFeedDragEnd()">
      ${c._feedImg?`<img src="${c._feedImg}" alt="${c.idea}" />`:`
        <div class="feed-cell-placeholder">
          <span>${c.tipo}</span>
          <small>${trunc(c.idea,30)}</small>
          <label class="feed-upload-btn">📷 Imagen
            <input type="file" accept="image/*" onchange="uploadFeedImage(event,'${c.id}')" />
          </label>
        </div>`}
      <div class="feed-cell-num">${i+1}</div>
    </div>`).join('')
    : `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#aaa;">No hay contenidos publicados en Instagram para este mes.</div>`;

  // Phone view
  document.getElementById('feedGridPhone').innerHTML = ordered.map(c=>
    c._feedImg?`<img src="${c._feedImg}" style="width:100%;aspect-ratio:1;object-fit:cover;display:block;" />`
    :`<div style="background:#f0e8df;aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:9px;color:#aaa;text-align:center;padding:4px;">${trunc(c.idea,18)}</div>`
  ).join('');
}

function setFeedView(view) {
  document.getElementById('feedGridView').style.display  = view==='grid'?'':'none';
  document.getElementById('feedPhoneView').style.display = view==='phone'?'':'none';
  document.getElementById('btnGridView').classList.toggle('active',  view==='grid');
  document.getElementById('btnPhoneView').classList.toggle('active', view==='phone');
}

function markFeedApproved() {
  const b = currentBrand();
  b.feed.approved = true;
  b.feed.approvedDate = new Date().toISOString().split('T')[0];
  save(); renderFeed();
  showToast('Feed marcado como aprobado ✓');
}

function onFeedDragStart(e, idx) {
  _dragSrcIdx = idx;
  e.dataTransfer.effectAllowed='move';
}
function onFeedDragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect='move'; }
function onFeedDrop(e, toIdx) {
  e.preventDefault();
  if (_dragSrcIdx===null || _dragSrcIdx===toIdx) return;
  const b = currentBrand();
  const arr = [...b.feed.order];
  const [moved] = arr.splice(_dragSrcIdx,1);
  arr.splice(toIdx,0,moved);
  b.feed.order = arr;
  _dragSrcIdx = null;
  save(); renderFeed();
}
function onFeedDragEnd() { _dragSrcIdx = null; }

async function uploadFeedImage(e, contenidoId) {
  const file = e.target.files[0];
  if (!file) return;
  const b = currentBrand();
  const dataUrl = await resizeImage(file, 800, 800, 0.85);
  const c = b.contenidos.find(x=>x.id===contenidoId);
  if (c) { c._feedImg = dataUrl; save(); renderFeed(); }
}

// ── CONTRACTUAL ───────────────────────────────────────────────
function renderContractual() {
  const b = currentBrand();
  const m = state.currentMonth;
  document.getElementById('contractBrandMonth').textContent = `${b.nombre} — ${m}`;
  const cs  = b.contenidos.filter(c=>c.mes===m);
  const pub = cs.filter(c=>c.estado==='Publicado').length;
  const hist= cs.filter(c=>c.tipo==='Historia').length;
  const cc  = b.contractual[m] || {};

  const pct = Math.min(100, Math.round((pub/b.idealPub)*100));
  const pctH= Math.min(100, Math.round((hist/b.histMeta)*100));
  const color= pub>=b.idealPub?'#27AE60':pub>=b.minPub?'#E67E22':'#E74C3C';
  const colorH= hist>=b.histMeta?'#27AE60':hist>0?'#E67E22':'#E74C3C';

  const alertas = [];
  if (pub < b.minPub)    alertas.push({t:'error',   m:`Solo ${pub} publicaciones. Mínimo contractual: ${b.minPub}.`});
  else if (pub < b.idealPub) alertas.push({t:'warning', m:`${pub} publicaciones. Meta ideal: ${b.idealPub}.`});
  else                   alertas.push({t:'success', m:`${pub} publicaciones. ¡Meta ideal alcanzada!`});
  if (!cc.reporte)       alertas.push({t:'warning', m:`Reporte mensual de ${m} pendiente de envío.`});
  else                   alertas.push({t:'success', m:`Reporte mensual de ${m} enviado.`});
  if (!cc.reunion)       alertas.push({t:'warning', m:`Reunión mensual de ${m} pendiente.`});
  else                   alertas.push({t:'success', m:`Reunión mensual de ${m} realizada.`});

  document.getElementById('contractualContent').innerHTML = `
    <div class="contract-grid">
      <div class="card">
        <h3 class="card-title">Publicaciones</h3>
        <div style="font-size:36px;font-weight:700;color:${color};">${pub}/${b.idealPub}</div>
        <div style="height:8px;background:#eee;border-radius:4px;margin:12px 0;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:4px;"></div>
        </div>
        <div style="font-size:13px;color:#888;">Mínimo: ${b.minPub} | Ideal: ${b.idealPub}</div>
      </div>
      <div class="card">
        <h3 class="card-title">Historias</h3>
        <div style="font-size:36px;font-weight:700;color:${colorH};">${hist}/${b.histMeta}</div>
        <div style="height:8px;background:#eee;border-radius:4px;margin:12px 0;overflow:hidden;">
          <div style="height:100%;width:${pctH}%;background:${colorH};border-radius:4px;"></div>
        </div>
        <div style="font-size:13px;color:#888;">Meta mensual: ${b.histMeta}</div>
      </div>
      <div class="card">
        <h3 class="card-title">Compromisos</h3>
        <div style="display:flex;flex-direction:column;gap:12px;margin-top:8px;">
          <label class="checkbox-label" style="font-size:15px;">
            <input type="checkbox" id="ccReunion" ${cc.reunion?'checked':''} onchange="toggleCC('reunion',this.checked)" />
            Reunión mensual realizada
          </label>
          <label class="checkbox-label" style="font-size:15px;">
            <input type="checkbox" id="ccReporte" ${cc.reporte?'checked':''} onchange="toggleCC('reporte',this.checked)" />
            Reporte mensual enviado
          </label>
        </div>
      </div>
      <div class="card">
        <h3 class="card-title">Fuera de alcance</h3>
        <textarea id="ccFueraAlcance" rows="4" style="width:100%;resize:vertical;" placeholder="Tareas extra, peticiones especiales...">${cc.fueraAlcance||''}</textarea>
        <button class="btn-secondary" style="margin-top:8px;" onclick="saveCC()">Guardar</button>
      </div>
    </div>
    <div style="margin-top:24px;">
      <h3 style="font-family:'Instrument Serif',serif;font-size:18px;margin-bottom:12px;">Alertas</h3>
      ${alertas.map(a=>`<div class="alerta ${a.t}"><span>${a.t==='success'?'✅':a.t==='warning'?'⚠️':'🚨'}</span> ${a.m}</div>`).join('')}
    </div>`;
}

function toggleCC(key, val) {
  const b = currentBrand(); const m = state.currentMonth;
  if (!b.contractual[m]) b.contractual[m]={};
  b.contractual[m][key] = val;
  save(); renderDashboard();
}

function saveCC() {
  const b = currentBrand(); const m = state.currentMonth;
  if (!b.contractual[m]) b.contractual[m]={};
  b.contractual[m].fueraAlcance = document.getElementById('ccFueraAlcance').value;
  save(); showToast('Guardado ✓');
}

// ── IDEAS ─────────────────────────────────────────────────────
function renderIdeas() {
  const b = currentBrand();
  document.getElementById('ideasBrandMonth').textContent = b.nombre;
  const tbody = document.getElementById('ideasBody');
  if (!b.ideas.length) {
    tbody.innerHTML=`<tr><td colspan="12" style="text-align:center;padding:40px;color:#aaa;">Sin ideas registradas.</td></tr>`;
    return;
  }
  tbody.innerHTML = b.ideas.map((idea,i)=>`<tr>
    <td>${i+1}</td>
    <td title="${idea.idea}">${trunc(idea.idea,35)}</td>
    <td title="${idea.hook}">${trunc(idea.hook,25)}</td>
    <td>${idea.categoria||'—'}</td>
    <td>${idea.prioridad||'—'}</td>
    <td>${idea.plataforma||'—'}</td>
    <td title="${idea.referencia}">${trunc(idea.referencia,20)}</td>
    <td>${idea.estado||'—'}</td>
    <td>${fmt(idea.fechaUsada)}</td>
    <td>${idea.funciono||'—'}</td>
    <td title="${idea.metricas}">${trunc(idea.metricas,20)}</td>
    <td><div class="actions-cell">
      <button class="btn-action btn-edit" onclick="openEditIdea('${idea.id}')">✏</button>
      <button class="btn-action btn-del"  onclick="deleteIdea('${idea.id}')">🗑</button>
    </div></td>
  </tr>`).join('');
}

function openNuevaIdea() { openEditIdea(null); }

function openEditIdea(id) {
  _editingId = id;
  const b = currentBrand();
  const idea = id ? b.ideas.find(x=>x.id===id) : null;
  document.getElementById('modalIdeaTitle').textContent = idea?'Editar idea':'Nueva idea';
  document.getElementById('ideaId').value = id||'';
  const g=(eid,val)=>{const el=document.getElementById(eid);if(el)el.value=val||'';};
  g('iIdea', idea?.idea); g('iHook', idea?.hook);
  g('iCategoria', idea?.categoria||'Educación');
  g('iPrioridad', idea?.prioridad||'Alta');
  g('iPlataforma', idea?.plataforma||'Instagram');
  g('iEstado', idea?.estado||'Pendiente');
  g('iReferencia', idea?.referencia);
  g('iFechaUsada', idea?.fechaUsada);
  g('iFunciono', idea?.funciono||'');
  g('iMetricas', idea?.metricas);
  openModal('modal-idea');
}

function saveIdea() {
  const ideaText = document.getElementById('iIdea').value.trim();
  if (!ideaText) { showToast('El texto de la idea es obligatorio','error'); return; }
  const b = currentBrand();
  const data = {
    idea: ideaText,
    hook: document.getElementById('iHook').value.trim(),
    categoria: document.getElementById('iCategoria').value,
    prioridad:  document.getElementById('iPrioridad').value,
    plataforma: document.getElementById('iPlataforma').value,
    estado:     document.getElementById('iEstado').value,
    referencia: document.getElementById('iReferencia').value.trim(),
    fechaUsada: document.getElementById('iFechaUsada').value,
    funciono:   document.getElementById('iFunciono').value,
    metricas:   document.getElementById('iMetricas').value.trim(),
  };
  if (_editingId) {
    const idx = b.ideas.findIndex(x=>x.id===_editingId);
    if(idx!==-1) b.ideas[idx]={...b.ideas[idx],...data};
    showToast('Idea actualizada ✓');
  } else {
    b.ideas.push({id:uid(),...data});
    showToast('Idea guardada ✓');
  }
  _editingId=null;
  save(); closeModal('modal-idea'); renderIdeas();
}

function deleteIdea(id) {
  confirmAction('¿Eliminar idea?','',()=>{
    const b=currentBrand(); b.ideas=b.ideas.filter(x=>x.id!==id);
    save(); renderIdeas(); showToast('Eliminada','error');
  });
}

// ── GRABACIONES ───────────────────────────────────────────────
function renderGrabaciones() {
  const b = currentBrand();
  document.getElementById('grabBrandMonth').textContent = b.nombre;
  const tbody = document.getElementById('grabBody');
  if (!b.grabaciones.length) {
    tbody.innerHTML=`<tr><td colspan="13" style="text-align:center;padding:40px;color:#aaa;">Sin grabaciones registradas.</td></tr>`;
    return;
  }
  tbody.innerHTML = b.grabaciones.map((g,i)=>`<tr>
    <td>${i+1}</td>
    <td>${fmt(g.fecha)}</td>
    <td>${g.lugar||'—'}</td>
    <td>${g.persona||'—'}</td>
    <td>${g.videos||0}</td>
    <td>${g.tomas||0}</td>
    <td>${g.pendientes||0}</td>
    <td title="${g.vestuario}">${trunc(g.vestuario,18)}</td>
    <td title="${g.props}">${trunc(g.props,18)}</td>
    <td>${estadoBadge(g.estadoEdicion||'Idea')}</td>
    <td>${fmt(g.fechaEntrega)}</td>
    <td title="${g.obs}">${trunc(g.obs,20)}</td>
    <td><div class="actions-cell">
      <button class="btn-action btn-edit" onclick="openEditGrabacion('${g.id}')">✏</button>
      <button class="btn-action btn-del"  onclick="deleteGrabacion('${g.id}')">🗑</button>
    </div></td>
  </tr>`).join('');
}

function openNuevaGrabacion() { openEditGrabacion(null); }

function openEditGrabacion(id) {
  _editingId = id;
  const b = currentBrand();
  const g = id ? b.grabaciones.find(x=>x.id===id) : null;
  document.getElementById('modalGrabTitle').textContent = g?'Editar grabación':'Nueva sesión de grabación';
  document.getElementById('grabId').value = id||'';
  const s=(eid,val)=>{const el=document.getElementById(eid);if(el)el.value=val||'';};
  s('gFecha',g?.fecha); s('gLugar',g?.lugar); s('gPersona',g?.persona);
  s('gVideos',g?.videos??''); s('gTomas',g?.tomas??''); s('gPendientes',g?.pendientes??'');
  s('gVestuario',g?.vestuario); s('gProps',g?.props);
  s('gEstadoEdicion',g?.estadoEdicion||'Sin editar');
  s('gFechaEntrega',g?.fechaEntrega); s('gObs',g?.obs);
  openModal('modal-grabacion');
}

function saveGrabacion() {
  const b = currentBrand();
  const data = {
    fecha:         document.getElementById('gFecha').value,
    lugar:         document.getElementById('gLugar').value.trim(),
    persona:       document.getElementById('gPersona').value.trim(),
    videos:        +document.getElementById('gVideos').value||0,
    tomas:         +document.getElementById('gTomas').value||0,
    pendientes:    +document.getElementById('gPendientes').value||0,
    vestuario:     document.getElementById('gVestuario').value.trim(),
    props:         document.getElementById('gProps').value.trim(),
    estadoEdicion: document.getElementById('gEstadoEdicion').value,
    fechaEntrega:  document.getElementById('gFechaEntrega').value,
    obs:           document.getElementById('gObs').value.trim(),
  };
  if (_editingId) {
    const idx=b.grabaciones.findIndex(x=>x.id===_editingId);
    if(idx!==-1) b.grabaciones[idx]={...b.grabaciones[idx],...data};
    showToast('Grabación actualizada ✓');
  } else {
    b.grabaciones.push({id:uid(),...data});
    showToast('Grabación registrada ✓');
  }
  _editingId=null;
  save(); closeModal('modal-grabacion'); renderGrabaciones();
}

function deleteGrabacion(id) {
  confirmAction('¿Eliminar grabación?','',()=>{
    const b=currentBrand(); b.grabaciones=b.grabaciones.filter(x=>x.id!==id);
    save(); renderGrabaciones(); showToast('Eliminada','error');
  });
}

// ── INFORME ───────────────────────────────────────────────────
function renderInforme() {
  const b = currentBrand();
  const m = state.currentMonth;
  document.getElementById('informeBrandMonth').textContent = `${b.nombre} — ${m}`;
  document.getElementById('informeContent').innerHTML = `
    <div class="card" style="margin-bottom:24px;">
      <h3 class="card-title">Notas editoriales para el informe</h3>
      <div class="form-group" style="margin-top:12px;">
        <label>Insights del mes</label>
        <textarea id="infInsights" rows="3" placeholder="¿Qué contenidos destacaron? ¿Qué tendencias se observaron?">${b.contractual?.[m]?._insights||''}</textarea>
      </div>
      <div class="form-group">
        <label>Recomendaciones</label>
        <textarea id="infReco" rows="3" placeholder="Sugerencias para el cliente...">${b.contractual?.[m]?._reco||''}</textarea>
      </div>
      <div class="form-group">
        <label>Próximos pasos</label>
        <textarea id="infProx" rows="3" placeholder="Plan de acción...">${b.contractual?.[m]?._prox||''}</textarea>
      </div>
      <button class="btn-secondary" onclick="saveInformeNotes()">Guardar notas</button>
    </div>
    <div class="card" id="informeOutput" style="display:none;"></div>`;
}

function saveInformeNotes() {
  const b=currentBrand(); const m=state.currentMonth;
  if(!b.contractual[m]) b.contractual[m]={};
  b.contractual[m]._insights = document.getElementById('infInsights').value;
  b.contractual[m]._reco     = document.getElementById('infReco').value;
  b.contractual[m]._prox     = document.getElementById('infProx').value;
  save(); showToast('Notas guardadas ✓');
}

function generateInforme() {
  const b=currentBrand(); const m=state.currentMonth;
  const cs   = b.contenidos.filter(c=>c.mes===m);
  const pub  = cs.filter(c=>c.estado==='Publicado');
  const grab = cs.filter(c=>c.estado==='Grabado');
  const pend = cs.filter(c=>!['Publicado','Grabado'].includes(c.estado));
  const cc   = b.contractual[m]||{};
  const sm   = b.stats||{};
  const totalViews = pub.reduce((a,c)=>a+(+(sm[c.id]?.instagram?.ig_visualizaciones||0)),0);
  const avgEng = () => {
    const vals=pub.map(c=>calcEngagement((sm[c.id]||{}).instagram,'instagram')).filter(v=>v!==null).map(Number);
    return vals.length?((vals.reduce((a,b)=>a+b,0)/vals.length).toFixed(2)):0;
  };

  const el = document.getElementById('informeOutput');
  if (!el) return;
  el.style.display='block';
  el.innerHTML = `
    <div class="informe-doc">
      <h1 style="font-family:'Instrument Serif',serif;font-size:28px;margin-bottom:4px;">Informe Mensual de Redes Sociales</h1>
      <p style="color:#888;margin-bottom:24px;">${b.nombre} &nbsp;|&nbsp; ${m} 2025 &nbsp;|&nbsp; Generado: ${new Date().toLocaleDateString('es-CO')}</p>
      <h2 style="font-family:'Instrument Serif',serif;font-size:20px;margin:20px 0 8px;">📌 Resumen ejecutivo</h2>
      <p>Se gestionaron <strong>${cs.length} contenidos</strong> para ${b.nombre} en ${m}. Se publicaron <strong>${pub.length} piezas</strong> (meta ideal: ${b.idealPub}). Reunión: ${cc.reunion?'✅ Realizada':'❌ Pendiente'}. Reporte: ${cc.reporte?'✅ Enviado':'❌ Pendiente'}.</p>
      <h2 style="font-family:'Instrument Serif',serif;font-size:20px;margin:20px 0 8px;">📊 Métricas destacadas (Instagram)</h2>
      <p>Visualizaciones totales: <strong>${totalViews.toLocaleString()}</strong> | Engagement promedio: <strong>${avgEng()}%</strong></p>
      <h2 style="font-family:'Instrument Serif',serif;font-size:20px;margin:20px 0 8px;">✅ Contenidos publicados (${pub.length})</h2>
      <ul>${pub.map(c=>`<li>${c.idea} <em>(${c.tipo})</em></li>`).join('')||'<li>Ninguno</li>'}</ul>
      <h2 style="font-family:'Instrument Serif',serif;font-size:20px;margin:20px 0 8px;">🎬 Grabados (${grab.length})</h2>
      <ul>${grab.map(c=>`<li>${c.idea}</li>`).join('')||'<li>Ninguno</li>'}</ul>
      <h2 style="font-family:'Instrument Serif',serif;font-size:20px;margin:20px 0 8px;">⏳ Pendientes (${pend.length})</h2>
      <ul>${pend.map(c=>`<li>${c.idea} — ${c.estado}</li>`).join('')||'<li>Ninguno</li>'}</ul>
      <h2 style="font-family:'Instrument Serif',serif;font-size:20px;margin:20px 0 8px;">💡 Insights</h2>
      <p>${cc._insights||'<em>Sin insights registrados.</em>'}</p>
      <h2 style="font-family:'Instrument Serif',serif;font-size:20px;margin:20px 0 8px;">🚀 Recomendaciones</h2>
      <p>${cc._reco||'<em>Sin recomendaciones.</em>'}</p>
      <h2 style="font-family:'Instrument Serif',serif;font-size:20px;margin:20px 0 8px;">📅 Próximos pasos</h2>
      <p>${cc._prox||'<em>Sin próximos pasos definidos.</em>'}</p>
    </div>`;
  showToast('Informe generado ✓');
}

function copyInforme() {
  const el=document.getElementById('informeOutput');
  if(!el||el.style.display==='none'){showToast('Primero genera el informe','error');return;}
  navigator.clipboard.writeText(el.innerText).then(()=>showToast('Copiado ✓')).catch(()=>showToast('No se pudo copiar','error'));
}

function downloadInforme() {
  const el=document.getElementById('informeOutput');
  if(!el||el.style.display==='none'){showToast('Primero genera el informe','error');return;}
  const blob=new Blob([el.innerText],{type:'text/plain;charset=utf-8'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=`informe_${currentBrand().nombre.replace(/\s/g,'_')}_${state.currentMonth}.txt`;
  a.click();
}

// ── CONFIGURACIÓN ─────────────────────────────────────────────
function renderConfiguracion() {
  const b = currentBrand();
  document.getElementById('configBrandName').textContent = b.nombre;
  document.getElementById('configuracionContent').innerHTML = `
    <div class="card" style="margin-bottom:24px;">
      <h3 class="card-title">Marcas registradas</h3>
      <div style="display:flex;flex-direction:column;gap:12px;margin-top:16px;">
        ${Object.values(state.brands).map(br=>`
          <div style="display:flex;align-items:center;gap:16px;padding:12px;background:var(--marfil);border-radius:10px;">
            <div style="width:40px;height:40px;border-radius:10px;background:${br.color||'#F45A00'};color:#fff;font-weight:700;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">${br.nombre.charAt(0)}</div>
            <div style="flex:1;">
              <div style="font-weight:600;">${br.nombre}</div>
              <div style="font-size:13px;color:#888;">${br.sector} | ${br.plataformas?.join(', ')||'Sin plataformas'}</div>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn-action btn-edit"  onclick="editMarca('${br.id}')">✏ Editar</button>
              <button class="btn-action btn-del"   onclick="deleteMarca('${br.id}')">🗑</button>
            </div>
          </div>`).join('')}
      </div>
      <button class="btn-primary" style="margin-top:16px;" onclick="openNuevaMarca()">+ Nueva marca</button>
    </div>
    <div class="card">
      <h3 class="card-title">Configuración de ${b.nombre}</h3>
      <div class="form-grid-3" style="margin-top:16px;">
        <div class="form-group"><label>Mínimo pub/mes</label><input type="number" id="cfgMin" value="${b.minPub||8}" min="1" /></div>
        <div class="form-group"><label>Ideal pub/mes</label><input type="number" id="cfgIdeal" value="${b.idealPub||12}" min="1" /></div>
        <div class="form-group"><label>Meta historias</label><input type="number" id="cfgHist" value="${b.histMeta||12}" min="1" /></div>
      </div>
      <div class="form-grid-2" style="margin-top:8px;">
        <div class="form-group"><label>Reunión mensual</label>
          <select id="cfgMeeting"><option value="true" ${b.requireMeeting?'selected':''}>Requerida</option><option value="false" ${!b.requireMeeting?'selected':''}>No requerida</option></select>
        </div>
        <div class="form-group"><label>Reporte mensual</label>
          <select id="cfgReport"><option value="true" ${b.requireReport?'selected':''}>Requerido</option><option value="false" ${!b.requireReport?'selected':''}>No requerido</option></select>
        </div>
      </div>
      <button class="btn-primary" style="margin-top:12px;" onclick="saveConfig()">Guardar configuración</button>
    </div>`;
}

function saveConfig() {
  const b = currentBrand();
  b.minPub  = +document.getElementById('cfgMin').value||8;
  b.idealPub= +document.getElementById('cfgIdeal').value||12;
  b.histMeta= +document.getElementById('cfgHist').value||12;
  b.requireMeeting = document.getElementById('cfgMeeting').value==='true';
  b.requireReport  = document.getElementById('cfgReport').value==='true';
  save(); showToast('Configuración guardada ✓');
}

// ── MODAL OVERLAY CLOSE ───────────────────────────────────────
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});

// ── BOOT ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  load();

  // month selector
  const ms = document.getElementById('monthSelect');
  if (ms) ms.value = state.currentMonth;

  // confirm button
  const cb = document.getElementById('confirmBtn');
  if (cb) cb.addEventListener('click', execConfirm);

  updateSidebarBrand();
  switchTab('dashboard');
});
