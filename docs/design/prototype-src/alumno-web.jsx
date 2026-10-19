// Alumno · versión WEB hi-fi (1200×780) — construida sobre los wireframes
// Mismo sistema visual que la app: tokens FT, tema oscuro, acento configurable.

function AlSidebar({ active = 'hoy' }) {
  const accent = getAccent();
  const items = [
    { id: 'hoy', icon: I.home, l: 'Hoy' },
    { id: 'progreso', icon: I.chart, l: 'Mi progreso' },
    { id: 'rutinas', icon: I.list, l: 'Mis rutinas' },
    { id: 'historial', icon: I.calendar, l: 'Historial' },
    { id: 'chat', icon: I.sparkle, l: 'Asistente IA' },
    { id: 'perfil', icon: I.user, l: 'Mi perfil' },
  ];
  return (
    <div style={{ width: 220, flexShrink: 0, background: FT.ink1, borderRight: `1px solid ${FT.ink3}`,
      display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '18px 18px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon d={I.bolt} size={16} fill={getAccentInk()} stroke={getAccentInk()} sw={2}/>
        </div>
        <div>
          <div style={{ fontFamily: FT.ff.display, fontSize: 15, fontWeight: 700, letterSpacing: -0.3, color: FT.bone0 }}>FitTrainer</div>
          <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, letterSpacing: 0.5 }}>ALUMNO · TOMÁS</div>
        </div>
      </div>
      <div style={{ flex: 1, padding: '0 10px' }}>
        {items.map(it => {
          const on = active === it.id;
          return (
            <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 10px', borderRadius: 8, marginBottom: 2,
              background: on ? FT.ink3 : 'transparent', color: on ? FT.bone0 : FT.ink6 }}>
              <Icon d={it.icon} size={16} sw={1.8}/>
              <span style={{ flex: 1, fontFamily: FT.ff.display, fontSize: 13, fontWeight: on ? 600 : 500 }}>{it.l}</span>
            </div>
          );
        })}
      </div>
      <div style={{ padding: 12 }}>
        <div style={{ background: FT.ink2, border: `1px solid ${FT.ink3}`, padding: 12, borderRadius: 12,
          display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 17, flexShrink: 0, background: accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FT.ff.display, fontWeight: 700, fontSize: 13, color: getAccentInk() }}>LP</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, letterSpacing: 0.5 }}>TU ENTRENADORA</div>
            <div style={{ fontFamily: FT.ff.display, fontSize: 12, fontWeight: 600, color: FT.bone0 }}>Laura Pereyra</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AlTop({ title, sub, actions }) {
  const accent = getAccent();
  return (
    <div style={{ height: 68, padding: '0 28px', borderBottom: `1px solid ${FT.ink2}`,
      display: 'flex', alignItems: 'center', gap: 16, background: FT.ink1, flexShrink: 0 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FT.ff.display, fontSize: 18, fontWeight: 600, letterSpacing: -0.3, color: FT.bone0 }}>{title}</div>
        {sub && <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6, letterSpacing: 0.5, marginTop: 2 }}>{sub}</div>}
      </div>
      {actions}
      <div style={{ width: 36, height: 36, borderRadius: 18, background: accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FT.ff.display, fontWeight: 700, fontSize: 13, color: getAccentInk() }}>TR</div>
    </div>
  );
}

function Card({ title, extra, children, style, p = 20 }) {
  return (
    <div style={{ background: FT.ink1, borderRadius: 14, border: `1px solid ${FT.ink2}`, padding: p, ...style }}>
      {(title || extra) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          {title && <div style={{ fontFamily: FT.ff.display, fontSize: 15, fontWeight: 600, color: FT.bone0 }}>{title}</div>}
          {extra}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── A1 · HOY / RUTINA DEL DÍA ────────────────────────────────
function AW_Hoy() {
  const accent = getAccent();
  const exs = [
    ['Press banca barra', 4, '8-10', '70 kg', 'Pecho'],
    ['Press inclinado mancuernas', 3, '10-12', '22.5 kg', 'Pecho sup.'],
    ['Aperturas en polea', 3, '12-15', '15 kg', 'Pecho'],
    ['Press militar barra', 4, '8', '40 kg', 'Hombro'],
    ['Elevaciones laterales', 3, '12', '10 kg', 'Deltoides'],
    ['Fondos en paralelas', 3, 'AMRAP', '—', 'Tríceps'],
  ];
  return (
    <div style={{ height: '100%', display: 'flex', background: FT.ink0, color: FT.bone0, fontFamily: FT.ff.body }}>
      <AlSidebar active="hoy"/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AlTop title="Hola, Tomás" sub="MARTES · 22 ABRIL · DÍA 3 DE 12"
          actions={<Pill tone="hot" size="md">🔥 RACHA 12 DÍAS</Pill>}/>
        <div style={{ flex: 1, padding: 24, display: 'flex', gap: 16, overflow: 'hidden' }}>
          <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
            {/* Hero */}
            <div style={{ borderRadius: 18, padding: 24, position: 'relative', overflow: 'hidden',
              background: `linear-gradient(135deg, ${FT.ink2} 0%, ${FT.ink1} 100%)`, border: `1px solid ${FT.ink3}`,
              display: 'flex', alignItems: 'center', gap: 24 }}>
              <div style={{ position: 'absolute', right: -60, top: -60, width: 220, height: 220, borderRadius: '50%',
                background: accent, opacity: 0.12, filter: 'blur(30px)' }}/>
              <div style={{ flex: 1, position: 'relative' }}>
                <Pill tone="accent" size="sm">DÍA 3 · PUSH</Pill>
                <div style={{ fontFamily: FT.ff.display, fontSize: 40, fontWeight: 700, letterSpacing: -1.6,
                  lineHeight: 1, margin: '12px 0 6px' }}>Pecho & Hombro</div>
                <div style={{ fontFamily: FT.ff.mono, fontSize: 11, color: FT.ink6, marginBottom: 18 }}>
                  6 EJERCICIOS · 18 SERIES · ~55 MIN
                </div>
                <Btn variant="primary" size="lg" icon={I.play}>Empezar entrenamiento</Btn>
              </div>
              <div style={{ width: 150, height: 110, borderRadius: 12, flexShrink: 0, position: 'relative',
                background: FT.ink3, backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 8px, transparent 8px 16px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: FT.ink6 }}>
                <Icon d={I.dumbbell} size={34}/>
              </div>
            </div>
            {/* Tabla */}
            <Card title="Plan de hoy" extra={<span style={{ fontFamily: FT.ff.mono, fontSize: 11, color: FT.ink6 }}>0 / 6 COMPLETADOS</span>} style={{ flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '28px 1.8fr 70px 80px 90px 30px', gap: 12,
                padding: '0 4px 10px', borderBottom: `1px solid ${FT.ink2}`,
                fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, letterSpacing: 1 }}>
                <div>#</div><div>EJERCICIO</div><div>SERIES</div><div>REPS</div><div>SUGERIDO</div><div/>
              </div>
              {exs.map((e, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1.8fr 70px 80px 90px 30px', gap: 12,
                  padding: '11px 4px', alignItems: 'center',
                  borderBottom: i < exs.length - 1 ? `1px solid ${FT.ink2}` : 'none' }}>
                  <div style={{ fontFamily: FT.ff.mono, fontSize: 11, color: FT.ink6 }}>{String(i + 1).padStart(2, '0')}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 7, flexShrink: 0, background: FT.ink3,
                      backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 4px, transparent 4px 8px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: FT.ink6 }}>
                      <Icon d={I.dumbbell} size={15}/>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: FT.ff.display, fontSize: 13, fontWeight: 500 }}>{e[0]}</div>
                      <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6 }}>{e[4].toUpperCase()}</div>
                    </div>
                  </div>
                  <div style={{ fontFamily: FT.ff.display, fontSize: 13, fontWeight: 600 }}>{e[1]}</div>
                  <div style={{ fontFamily: FT.ff.display, fontSize: 13, fontWeight: 600 }}>{e[2]}</div>
                  <div style={{ fontFamily: FT.ff.display, fontSize: 13, fontWeight: 600, color: getAccentText(FT.ink1) }}>{e[3]}</div>
                  <Icon d={I.chev_r} size={15} stroke={FT.ink5}/>
                </div>
              ))}
            </Card>
          </div>
          {/* Rail */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 230 }}>
            <Card title="Esta semana">
              <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {['L','M','X','J','V','S','D'].map((d, i) => (
                  <div key={i} style={{ flex: 1, height: 36, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: FT.ff.mono, fontSize: 11, fontWeight: 600,
                    background: i < 2 ? accent : i === 2 ? FT.ink3 : FT.ink2,
                    color: i < 2 ? getAccentInk() : i === 2 ? FT.bone0 : FT.ink5,
                    border: i === 2 ? `1px dashed ${getAccentText(FT.ink1)}` : 'none' }}>{d}</div>
                ))}
              </div>
              <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6, letterSpacing: 0.5 }}>2 DE 4 ENTRENOS HECHOS</div>
            </Card>
            <Card title="Nota de Laura">
              <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: 16, flexShrink: 0, background: accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: FT.ff.display, fontWeight: 700, fontSize: 12, color: getAccentInk() }}>LP</div>
                <div style={{ fontFamily: FT.ff.body, fontSize: 13, lineHeight: 1.45, color: FT.bone0 }}>
                  Hoy subí 2.5 kg en press banca si las 8 reps salen limpias. Buen ritmo.
                </div>
              </div>
            </Card>
            <Card title="Próximo turno" style={{ flex: 1 }}>
              <div style={{ fontFamily: FT.ff.display, fontSize: 19, fontWeight: 600, letterSpacing: -0.4 }}>Jueves 24 · 09:00</div>
              <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6, marginTop: 4, letterSpacing: 0.5 }}>VIDEOLLAMADA CON LAURA</div>
              <div style={{ marginTop: 14 }}><Btn variant="ghost" size="sm" full icon={I.calendar}>Ver agenda</Btn></div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── A2 · SESIÓN ACTIVA ───────────────────────────────────────
function AW_Sesion() {
  const accent = getAccent();
  const sets = [
    { n: 1, w: 60, r: 10, st: 'ok' },
    { n: 2, w: 65, r: 10, st: 'ok' },
    { n: 3, w: 70, r: 8, st: 'now' },
    { n: 4, w: null, r: null, st: '' },
  ];
  return (
    <div style={{ height: '100%', display: 'flex', background: FT.ink0, color: FT.bone0, fontFamily: FT.ff.body }}>
      <AlSidebar active="hoy"/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AlTop title="Entrenando · Push día 3" sub="EJERCICIO 3 DE 6 · 22:14 TRANSCURRIDO"
          actions={<><Btn variant="ghost" size="sm" icon={I.sparkle}>Asistente</Btn><Btn variant="dark" size="sm" icon={I.close}>Terminar</Btn></>}/>
        {/* progreso */}
        <div style={{ padding: '10px 28px', background: FT.ink1, borderBottom: `1px solid ${FT.ink2}`,
          display: 'flex', gap: 5, flexShrink: 0 }}>
          {[0,1,2,3,4,5].map(i => (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2,
              background: i < 2 ? accent : i === 2 ? getAccentText(FT.ink1) : FT.ink3 }}/>
          ))}
        </div>
        <div style={{ flex: 1, padding: 24, display: 'flex', gap: 16, overflow: 'hidden' }}>
          {/* ejercicio actual */}
          <div style={{ flex: 1.55, minWidth: 0 }}>
            <Card style={{ height: '100%', display: 'flex', flexDirection: 'column' }} p={24}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18 }}>
                <div style={{ width: 72, height: 72, borderRadius: 12, flexShrink: 0, background: FT.ink3,
                  backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 6px, transparent 6px 12px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: FT.ink6 }}>
                  <Icon d={I.dumbbell} size={30}/>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FT.ff.display, fontSize: 26, fontWeight: 700, letterSpacing: -1 }}>Press banca barra</div>
                  <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6, letterSpacing: 0.5, marginTop: 3 }}>
                    PECHO · OBJETIVO 4 × 8-10 @ 70KG · DESCANSO 90″
                  </div>
                </div>
                <Btn variant="ghost" size="sm" icon={I.video}>Técnica</Btn>
              </div>

              <div style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 7,
                padding: '7px 13px', borderRadius: 99, marginBottom: 20,
                background: accentWash(0.14), border: `1px solid ${accentWash(0.4)}` }}>
                <Icon d={I.sparkle} size={13} stroke={getAccentText(FT.ink1)}/>
                <span style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.bone0, letterSpacing: 0.5 }}>SERIE 3 · SUGERIDO 70 KG × 8</span>
              </div>

              <div style={{ display: 'flex', gap: 16, marginBottom: 22 }}>
                {[['PESO','70','KG',['-2.5','-1','+1','+2.5','+5']], ['REPETICIONES','8','×',['-1','+1','+2','AMRAP']]].map(([l, v, u, btns], i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', padding: '20px 12px', borderRadius: 14,
                    background: FT.ink2, border: `1px solid ${i === 0 ? getAccentText(FT.ink2) : FT.ink3}` }}>
                    <div style={{ fontFamily: FT.ff.mono, fontSize: 10, letterSpacing: 1.5, color: FT.ink6, marginBottom: 6 }}>{l}</div>
                    <div style={{ fontFamily: FT.ff.display, fontSize: 64, fontWeight: 700, letterSpacing: -3, lineHeight: 1 }}>
                      {v}<span style={{ fontFamily: FT.ff.mono, fontSize: 16, color: FT.ink5, marginLeft: 5, letterSpacing: 0 }}>{u}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16 }}>
                      {btns.map((b, j) => (
                        <div key={j} style={{ minWidth: 44, height: 38, padding: '0 10px', borderRadius: 10,
                          background: FT.ink3, color: FT.bone0, fontFamily: FT.ff.mono, fontWeight: 600, fontSize: 12,
                          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{b}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', gap: 10 }}>
                <Btn variant="primary" size="lg" icon={I.check} style={{ flex: 1 }}>Registrar serie y descansar</Btn>
                <Btn variant="dark" size="lg" icon={I.swap}>Reemplazar</Btn>
              </div>
            </Card>
          </div>
          {/* series + timer */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 250 }}>
            <Card title="Series" style={{ flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr 1fr 34px', gap: 10,
                padding: '0 2px 9px', borderBottom: `1px solid ${FT.ink2}`,
                fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, letterSpacing: 1 }}>
                <div>#</div><div>PESO</div><div>REPS</div><div/>
              </div>
              {sets.map(s => (
                <div key={s.n} style={{ display: 'grid', gridTemplateColumns: '26px 1fr 1fr 34px', gap: 10,
                  alignItems: 'center', padding: '12px 8px', margin: s.st === 'now' ? '4px -8px' : 0,
                  borderRadius: s.st === 'now' ? 10 : 0,
                  background: s.st === 'now' ? FT.ink2 : 'transparent',
                  border: s.st === 'now' ? `1px solid ${getAccentText(FT.ink1)}` : 'none',
                  borderBottom: s.st !== 'now' ? `1px solid ${FT.ink2}` : undefined,
                  opacity: s.w === null ? 0.45 : 1 }}>
                  <div style={{ fontFamily: FT.ff.display, fontWeight: 700, fontSize: s.st === 'now' ? 16 : 13,
                    color: s.st === 'now' ? getAccentText(FT.ink2) : FT.ink6 }}>{s.n}</div>
                  <div style={{ fontFamily: FT.ff.display, fontWeight: 600, fontSize: 16 }}>{s.w ?? '—'}</div>
                  <div style={{ fontFamily: FT.ff.display, fontWeight: 600, fontSize: 16 }}>{s.r ?? '—'}</div>
                  <div style={{ textAlign: 'right', color: s.st === 'ok' ? FT.good : FT.ink5 }}>
                    {s.st === 'ok' ? <Icon d={I.check} size={17} sw={2.5}/> : s.st === 'now' ? '●' : ''}
                  </div>
                </div>
              ))}
            </Card>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: FT.ff.mono, fontSize: 10, letterSpacing: 2, color: getAccentText(FT.ink1) }}>DESCANSO</div>
                <div style={{ fontFamily: FT.ff.display, fontSize: 46, fontWeight: 700, letterSpacing: -2, lineHeight: 1.1 }}>0:34</div>
                <div style={{ height: 5, borderRadius: 3, background: FT.ink3, overflow: 'hidden', margin: '10px 0 12px' }}>
                  <div style={{ width: '62%', height: '100%', background: accent }}/>
                </div>
                <div style={{ display: 'flex', gap: 7, justifyContent: 'center' }}>
                  {['+15″','−15″','Saltar'].map((v, i) => (
                    <div key={i} style={{ padding: '8px 14px', borderRadius: 99, background: FT.ink3,
                      fontFamily: FT.ff.mono, fontSize: 11, color: FT.bone0 }}>{v}</div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AlSidebar, AlTop, Card, AW_Hoy, AW_Sesion });
