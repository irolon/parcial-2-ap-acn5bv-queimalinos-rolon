// Entrenador MOBILE — versión hi-fi (tema oscuro), app de bolsillo del PT
// Mismo sistema visual que la app del alumno: FT tokens, Phone, Pill, charts.

// ─── Tab bar del PT (hi-fi) ───────────────────────────────────
function PTTabBar({ active = 0 }) {
  const accent = getAccent();
  const items = [
    { icon: I.home, label: 'Inicio' },
    { icon: I.user, label: 'Alumnos' },
    { icon: I.chat, label: 'Mensajes', badge: true },
    { icon: I.more, label: 'Más' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      padding: '10px 8px 14px',
      background: 'rgba(11,13,12,0.92)', backdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', justifyContent: 'space-around',
    }}>
      {items.map((it, i) => (
        <div key={i} style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          padding: '4px 12px', borderRadius: 10, position: 'relative',
          color: i === active ? getAccentText() : FT.ink5,
        }}>
          <div style={{ position: 'relative' }}>
            <Icon d={it.icon} size={20} sw={i === active ? 2 : 1.6}/>
            {it.badge && <div style={{ position: 'absolute', top: -2, right: -3, width: 7, height: 7,
              borderRadius: 4, background: FT.hot, border: `1.5px solid ${FT.ink0}` }}/>}
          </div>
          <span style={{ fontFamily: FT.ff.mono, fontSize: 9, letterSpacing: 0.5,
                         textTransform: 'uppercase', fontWeight: i === active ? 600 : 500 }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}

// Avatar con inicial + opcional dot de estado
function Av({ name, size = 40, tone, online }) {
  const accent = getAccent();
  const bg = tone === 'hot' ? 'rgba(255,92,58,0.2)' : FT.ink3;
  const col = tone === 'hot' ? FT.hot : FT.bone0;
  const inits = name.split(' ').map(x => x[0]).join('').slice(0, 2);
  return (
    <div style={{ position: 'relative', width: size, height: size, borderRadius: size/2, background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      fontFamily: FT.ff.display, fontWeight: 700, fontSize: size*0.34, color: col }}>
      {inits}
      {online && <div style={{ position: 'absolute', bottom: -1, right: -1, width: size*0.26, height: size*0.26,
        borderRadius: '50%', background: FT.good, border: `2px solid ${FT.ink0}` }}/>}
    </div>
  );
}

// ─── 01 · INICIO / DASHBOARD ──────────────────────────────────
function EM_Inicio() {
  const accent = getAccent();
  const kpis = [
    { l: 'ALUMNOS ACTIVOS', v: '23', d: '+2', tone: 'good', accent: true },
    { l: 'SESIONES HOY', v: '8', d: 'de 11', tone: 'mute' },
    { l: 'ADHERENCIA', v: '87', u: '%', d: '+4%', tone: 'good' },
    { l: 'EN RIESGO', v: '3', d: '>7 días', tone: 'hot', danger: true },
  ];
  const alerts = [
    { n: 'Diego Ocampo', d: '9 días sin entrenar', tag: 'riesgo', tone: 'hot' },
    { n: 'Lucía Méndez', d: 'Feedback pendiente', tag: 'aviso', tone: 'ghost' },
    { n: 'Matías Toro', d: '11 días sin abrir', tag: 'riesgo', tone: 'hot' },
  ];
  const recent = [
    { n: 'Tomás Rivera', r: 'Push día 3 · RPE 8', t: '12 min', now: true },
    { n: 'Sofía Blanco', r: 'Full body · RPE 6', t: '1 h' },
  ];
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: FT.ink0, color: FT.bone0 }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 18px 86px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6, letterSpacing: 1 }}>MARTES · 22 ABR</div>
            <div style={{ fontFamily: FT.ff.display, fontSize: 22, fontWeight: 600, letterSpacing: -0.5 }}>Hola, Laura</div>
          </div>
          <div style={{ position: 'relative', width: 40, height: 40, borderRadius: 20, background: FT.ink3 }}>
            <div style={{ position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: 5,
              background: FT.hot, border: `2px solid ${FT.ink0}` }}/>
          </div>
        </div>

        {/* KPIs 2x2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {kpis.map((k, i) => (
            <div key={i} style={{ padding: '12px 14px', borderRadius: 14,
              background: k.danger ? 'rgba(255,92,58,0.07)' : FT.ink2,
              border: `1px solid ${k.danger ? 'rgba(255,92,58,0.25)' : 'transparent'}` }}>
              <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, letterSpacing: 0.8, marginBottom: 8 }}>{k.l}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                <span style={{ fontFamily: FT.ff.display, fontSize: 30, fontWeight: 700, letterSpacing: -1.5, lineHeight: 1,
                  color: k.accent ? getAccentText(FT.ink2) : k.danger ? FT.hot : FT.bone0 }}>{k.v}{k.u && <span style={{ fontSize: 15, color: FT.ink5 }}>{k.u}</span>}</span>
                <span style={{ fontFamily: FT.ff.mono, fontSize: 11,
                  color: k.tone === 'good' ? FT.good : k.tone === 'hot' ? FT.hot : FT.ink6 }}>{k.d}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Alertas */}
        <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6, letterSpacing: 1, marginBottom: 10 }}>REQUIEREN ATENCIÓN</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 11, borderRadius: 12,
              background: FT.ink1, border: `1px solid ${a.tone === 'hot' ? 'rgba(255,92,58,0.18)' : FT.ink2}` }}>
              <Av name={a.n} size={36} tone={a.tone === 'hot' ? 'hot' : null}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FT.ff.display, fontSize: 13, fontWeight: 600 }}>{a.n}</div>
                <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6 }}>{a.d}</div>
              </div>
              <Pill tone={a.tone} size="sm">{a.tag}</Pill>
            </div>
          ))}
        </div>

        {/* Actividad reciente */}
        <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6, letterSpacing: 1, marginBottom: 10 }}>ACTIVIDAD RECIENTE</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {recent.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 11px', borderRadius: 12,
              background: FT.ink1, border: `1px solid ${FT.ink2}` }}>
              <Av name={a.n} size={34} online={a.now}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FT.ff.display, fontSize: 13, fontWeight: 500 }}>{a.n}</div>
                <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6 }}>{a.r}</div>
              </div>
              <span style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink5 }}>{a.t}</span>
            </div>
          ))}
        </div>
      </div>
      <PTTabBar active={0}/>
    </div>
  );
}

// ─── 02 · ALUMNOS (lista) ─────────────────────────────────────
function EM_Alumnos() {
  const accent = getAccent();
  const als = [
    { n: 'Tomás Rivera', o: 'Masa · 4d', last: 'Hoy', st: 'activo', adh: 94, online: true },
    { n: 'Sofía Blanco', o: 'Bajar peso · 3d', last: 'Hoy', st: 'activo', adh: 78 },
    { n: 'Julián Arce', o: 'Performance · 5d', last: 'Ayer', st: 'activo', adh: 88 },
    { n: 'Valentina Ruiz', o: 'Tonificar · 3d', last: 'Ayer', st: 'activo', adh: 82 },
    { n: 'Diego Ocampo', o: 'Tonificar · 2d', last: '9 días', st: 'riesgo', adh: 41 },
    { n: 'Lucía Méndez', o: 'Recomp · 3d', last: '7 días', st: 'aviso', adh: 55 },
    { n: 'Matías Toro', o: 'Masa · 4d', last: '11 días', st: 'riesgo', adh: 33 },
  ];
  const tone = { activo: 'good', aviso: 'ghost', riesgo: 'hot' };
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: FT.ink0, color: FT.bone0 }}>
      <div style={{ padding: '18px 18px 12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6, letterSpacing: 1 }}>23 ACTIVOS · 3 EN RIESGO</div>
            <div style={{ fontFamily: FT.ff.display, fontSize: 22, fontWeight: 600, letterSpacing: -0.5 }}>Alumnos</div>
          </div>
          <button style={{ width: 40, height: 40, borderRadius: 12, background: accent, border: 'none',
            color: getAccentInk(), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon d={I.plus} size={20} sw={2.5}/>
          </button>
        </div>
        {/* Search */}
        <div style={{ height: 40, padding: '0 14px', borderRadius: 12, background: FT.ink2, border: `1px solid ${FT.ink3}`,
          display: 'flex', alignItems: 'center', gap: 8, fontFamily: FT.ff.body, fontSize: 13, color: FT.ink5, marginBottom: 10 }}>
          <Icon d={I.search} size={15}/>Buscar alumno…
        </div>
        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 6 }}>
          {['Todos', 'Activos', 'En riesgo', 'Trial'].map((f, i) => (
            <div key={i} style={{ padding: '6px 12px', borderRadius: 99,
              background: i === 0 ? accent : FT.ink2,
              color: i === 0 ? getAccentInk() : FT.ink6,
              border: `1px solid ${i === 0 ? 'transparent' : FT.ink3}`,
              fontFamily: FT.ff.mono, fontSize: 10, fontWeight: 600, letterSpacing: 0.3 }}>{f}</div>
          ))}
        </div>
      </div>
      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 18px 86px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {als.map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 11, borderRadius: 14,
              background: FT.ink1, border: `1px solid ${a.st === 'riesgo' ? 'rgba(255,92,58,0.18)' : FT.ink2}` }}>
              <Av name={a.n} size={42} tone={a.st === 'riesgo' ? 'hot' : null} online={a.online}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FT.ff.display, fontSize: 14, fontWeight: 600 }}>{a.n}</div>
                <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6, marginBottom: 5 }}>{a.o}</div>
                {/* adherence bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: FT.ink3, overflow: 'hidden', maxWidth: 90 }}>
                    <div style={{ width: `${a.adh}%`, height: '100%',
                      background: a.adh >= 70 ? FT.good : a.adh >= 50 ? accent : FT.hot }}/>
                  </div>
                  <span style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink5 }}>{a.adh}%</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <Pill tone={tone[a.st]} size="sm">{a.st}</Pill>
                <span style={{ fontFamily: FT.ff.mono, fontSize: 9, color: a.st === 'riesgo' ? FT.hot : FT.ink5 }}>{a.last}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <PTTabBar active={1}/>
    </div>
  );
}

// ─── 03 · PERFIL DEL ALUMNO ───────────────────────────────────
function EM_PerfilAlumno() {
  const accent = getAccent();
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: FT.ink0, color: FT.bone0 }}>
      {/* Header */}
      <div style={{ padding: '12px 16px 16px', flexShrink: 0, borderBottom: `1px solid ${FT.ink2}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <Icon d={I.back} size={22} stroke={FT.bone0}/>
          <span style={{ flex: 1, fontFamily: FT.ff.display, fontSize: 15, fontWeight: 600 }}>Perfil del alumno</span>
          <Icon d={I.more} size={20} stroke={FT.ink5}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{ width: 56, height: 56, borderRadius: 28, flexShrink: 0,
            background: `linear-gradient(135deg, ${accent} 0%, ${FT.ink3} 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FT.ff.display, fontWeight: 700, fontSize: 20, color: getAccentInk() }}>TR</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: FT.ff.display, fontSize: 18, fontWeight: 600, letterSpacing: -0.3 }}>Tomás Rivera</div>
            <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6, letterSpacing: 0.3 }}>24 AÑOS · MASA · 4 D/SEM</div>
          </div>
          <Pill tone="good" size="md">ACTIVO</Pill>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <Btn variant="ghost" size="sm" icon={I.chat} style={{ flex: 1 }}>Mensaje</Btn>
          <Btn variant="primary" size="sm" icon={I.plus} style={{ flex: 1 }}>Asignar rutina</Btn>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px' }}>
        {/* Mini stats */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[
            { v: '14', u: '/16', l: 'SESIONES' },
            { v: '12', l: 'RACHA', hot: true },
            { v: '3', l: 'PRS', accent: true },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, padding: '12px 8px', borderRadius: 12, background: FT.ink2, textAlign: 'center' }}>
              <div style={{ fontFamily: FT.ff.display, fontSize: 22, fontWeight: 700, letterSpacing: -1, lineHeight: 1,
                color: s.hot ? FT.hot : s.accent ? getAccentText(FT.ink2) : FT.bone0 }}>{s.v}<span style={{ fontSize: 11, color: FT.ink5 }}>{s.u}</span></div>
              <div style={{ fontFamily: FT.ff.mono, fontSize: 8, color: FT.ink6, letterSpacing: 0.5, marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Asistencia del mes */}
        <div style={{ padding: 16, borderRadius: 14, background: FT.ink1, border: `1px solid ${FT.ink2}`, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ fontFamily: FT.ff.display, fontSize: 14, fontWeight: 600 }}>Asistencia · abril</div>
            <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6 }}>
              <span style={{ fontFamily: FT.ff.display, fontSize: 14, fontWeight: 700, color: getAccentText(FT.ink1) }}>14</span> DE 16
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
            {['L','M','X','J','V','S','D'].map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontFamily: FT.ff.mono, fontSize: 8,
                color: FT.ink5, letterSpacing: 0.5 }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {(() => {
              // abril arranca martes → 1 celda vacía; entrenó L/M/J/V
              const trained = [1,3,4,5,8,10,11,12,15,17,18,19,22];
              const missed = [2,9,16];
              const today = 22;
              const cells = [null];
              for (let d = 1; d <= 30; d++) cells.push(d);
              return cells.map((d, i) => {
                if (d === null) return <div key={i}/>;
                const on = trained.includes(d), miss = missed.includes(d), future = d > today;
                return (
                  <div key={i} style={{
                    aspectRatio: '1', borderRadius: 5,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: FT.ff.mono, fontSize: 9, fontWeight: on ? 600 : 400,
                    background: on ? getAccent() : miss ? 'rgba(255,92,58,0.12)' : FT.ink2,
                    color: on ? getAccentInk() : miss ? FT.hot : future ? FT.ink4 : FT.ink5,
                    border: d === today ? `1px solid ${getAccentText(FT.ink1)}` : '1px solid transparent',
                    opacity: future ? 0.45 : 1,
                  }}>{d}</div>
                );
              });
            })()}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 12 }}>
            {[
              { c: getAccent(), l: 'Entrenó' },
              { c: 'rgba(255,92,58,0.35)', l: 'Faltó' },
              { c: FT.ink2, l: 'Sin plan' },
            ].map((l, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 9, height: 9, borderRadius: 3, background: l.c }}/>
                <span style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6 }}>{l.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Últimas sesiones */}
        <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6, letterSpacing: 1, marginBottom: 10 }}>ÚLTIMAS SESIONES</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { d: '22 ABR', r: 'Push día 3', rpe: 8, pr: true },
            { d: '20 ABR', r: 'Pull día 2', rpe: 7 },
            { d: '18 ABR', r: 'Legs día 1', rpe: 9, pr: true },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px', borderRadius: 12,
              background: FT.ink1, border: `1px solid ${FT.ink2}` }}>
              <span style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6, minWidth: 46 }}>{s.d}</span>
              <span style={{ flex: 1, fontFamily: FT.ff.display, fontSize: 13, fontWeight: 500 }}>{s.r}</span>
              {s.pr && <Pill tone="accent" size="sm">PR</Pill>}
              <span style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6 }}>RPE <span style={{ fontFamily: FT.ff.display, fontSize: 14, fontWeight: 600, color: s.rpe >= 8 ? FT.hot : FT.bone0 }}>{s.rpe}</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 04 · MENSAJES (chat 1-a-1) ───────────────────────────────
function EM_Mensajes() {
  const accent = getAccent();
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: FT.ink0, color: FT.bone0 }}>
      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: `1px solid ${FT.ink2}`, display: 'flex', alignItems: 'center', gap: 11, flexShrink: 0 }}>
        <Icon d={I.back} size={22} stroke={FT.bone0}/>
        <Av name="Tomás Rivera" size={36} online/>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: FT.ff.display, fontSize: 14, fontWeight: 600 }}>Tomás Rivera</div>
          <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.good, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: 3, background: FT.good }}/>EN LÍNEA
          </div>
        </div>
        <Icon d={I.more} size={20} stroke={FT.ink5}/>
      </div>

      {/* Conversation */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ alignSelf: 'center', fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, letterSpacing: 1 }}>HOY</div>
        {/* alumno */}
        <div style={{ alignSelf: 'flex-start', maxWidth: '82%' }}>
          <div style={{ padding: '10px 14px', borderRadius: 18, borderBottomLeftRadius: 4,
            background: FT.ink2, border: `1px solid ${FT.ink3}`,
            fontFamily: FT.ff.body, fontSize: 14, lineHeight: 1.4 }}>
            ¡Hola Laura! Terminé el push, subí a 70kg en banca 💪
          </div>
          <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, marginTop: 4, paddingLeft: 4 }}>09:32</div>
        </div>
        {/* PT */}
        <div style={{ alignSelf: 'flex-end', maxWidth: '82%' }}>
          <div style={{ padding: '10px 14px', borderRadius: 18, borderBottomRightRadius: 4,
            background: accent, color: getAccentInk(),
            fontFamily: FT.ff.body, fontSize: 14, lineHeight: 1.4 }}>
            ¡Excelente! Para la próxima mantené 70 y enfocate en el excéntrico, 3 segundos bajando.
          </div>
          <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, marginTop: 4, textAlign: 'right', paddingRight: 4 }}>09:34 · ✓✓</div>
        </div>
        {/* broadcast hint */}
        <div style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 99,
          background: 'rgba(54,198,255,0.1)', border: `1px solid rgba(54,198,255,0.25)` }}>
          <Icon d={I.broadcast} size={12} stroke={FT.cool}/>
          <span style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.cool, letterSpacing: 0.3 }}>BROADCAST DISPONIBLE · ENVIAR A TODOS</span>
        </div>
      </div>

      {/* Input */}
      <div style={{ padding: '10px 12px 14px', borderTop: `1px solid ${FT.ink2}`, display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        <button style={{ width: 40, height: 40, borderRadius: 20, background: FT.ink3, border: 'none', color: FT.bone0,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon d={I.plus} size={18}/></button>
        <div style={{ flex: 1, height: 40, borderRadius: 20, padding: '0 14px', background: FT.ink2, border: `1px solid ${FT.ink3}`,
          display: 'flex', alignItems: 'center', fontFamily: FT.ff.body, fontSize: 13, color: FT.ink5 }}>Mensaje…</div>
        <button style={{ width: 40, height: 40, borderRadius: 20, background: accent, border: 'none', color: getAccentInk(),
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon d={I.send} size={18}/></button>
      </div>
    </div>
  );
}

// ─── 05 · GENERAR QR ──────────────────────────────────────────
function EM_QR() {
  const accent = getAccent();
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: FT.ink0, color: FT.bone0, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 10%, ${accent}18, transparent 55%)` }}/>
      {/* Header */}
      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 2, flexShrink: 0 }}>
        <Icon d={I.back} size={22} stroke={FT.bone0}/>
        <span style={{ flex: 1, fontFamily: FT.ff.display, fontSize: 16, fontWeight: 600 }}>Invitar alumno</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 18px 24px', position: 'relative', zIndex: 2 }}>
        {/* form mini */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {[
            { l: 'NOMBRE Y APELLIDO', v: 'Tomás Rivera', focus: true },
            { l: 'EMAIL', v: 'tomas.r@gmail.com' },
          ].map((f, i) => (
            <div key={i}>
              <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, letterSpacing: 1, marginBottom: 5 }}>{f.l}</div>
              <div style={{ height: 46, padding: '0 14px', borderRadius: 12, background: FT.ink2,
                border: `1px solid ${f.focus ? getAccentText() : FT.ink3}`, display: 'flex', alignItems: 'center',
                fontFamily: FT.ff.body, fontSize: 14, color: FT.bone0 }}>{f.v}</div>
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[{ l: 'OBJETIVO', v: 'Masa ▾' }, { l: 'FRECUENCIA', v: '4 d/sem ▾' }].map((f, i) => (
              <div key={i}>
                <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, letterSpacing: 1, marginBottom: 5 }}>{f.l}</div>
                <div style={{ height: 46, padding: '0 14px', borderRadius: 12, background: FT.ink2, border: `1px solid ${FT.ink3}`,
                  display: 'flex', alignItems: 'center', fontFamily: FT.ff.body, fontSize: 13, color: FT.bone0 }}>{f.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* QR card */}
        <div style={{ padding: 20, borderRadius: 18, background: FT.ink1, border: `1px solid ${FT.ink3}`, textAlign: 'center' }}>
          <div style={{ margin: '0 auto 12px', width: 168, padding: 16, borderRadius: 14, background: FT.bone0, position: 'relative' }}>
            <QRCode size={136} color={FT.ink0} bg={FT.bone0}/>
            <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
              width: 36, height: 36, borderRadius: 9, background: accent, border: `4px solid ${FT.bone0}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon d={I.bolt} size={17} fill={getAccentInk()} stroke={getAccentInk()} sw={2}/>
            </div>
          </div>
          <div style={{ fontFamily: FT.ff.display, fontSize: 14, fontWeight: 600 }}>Tomás escanea y entra</div>
          <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6, letterSpacing: 0.5, marginTop: 4 }}>VÁLIDO 48H · ft.app/i/7A2K9X</div>
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ padding: '12px 18px 16px', display: 'flex', gap: 8, position: 'relative', zIndex: 2, flexShrink: 0,
        borderTop: `1px solid ${FT.ink2}`, background: FT.ink0 }}>
        <Btn variant="primary" size="md" icon={I.send} style={{ flex: 1 }}>Enviar por WhatsApp</Btn>
        <Btn variant="dark" size="md" icon={I.qr}>Bajar</Btn>
      </div>
    </div>
  );
}

Object.assign(window, {
  PTTabBar, EM_Inicio, EM_Alumnos, EM_PerfilAlumno, EM_Mensajes, EM_QR,
});
