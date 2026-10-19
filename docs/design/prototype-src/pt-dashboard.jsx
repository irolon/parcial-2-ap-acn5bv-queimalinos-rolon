// PT (Web) — Dashboard, Perfil de alumno, Crear rutina, QR generator
// Layout SaaS oscuro con sidebar + main content. 1200x780.

function Sidebar({ active = 'dashboard' }) {
  const accent = getAccent();
  const items = [
    { id: 'dashboard', icon: I.home, l: 'Dashboard' },
    { id: 'alumnos', icon: I.user, l: 'Alumnos', badge: '23' },
    { id: 'rutinas', icon: I.list, l: 'Rutinas' },
    { id: 'biblioteca', icon: I.dumbbell, l: 'Biblioteca' },
    { id: 'agenda', icon: I.calendar, l: 'Agenda' },
    { id: 'mensajes', icon: I.chat, l: 'Mensajes', badge: '4' },
  ];
  return (
    <div style={{
      width: 220, background: FT.ink1, borderRight: `1px solid ${FT.ink3}`,
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{ padding: '18px 18px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: accent,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon d={I.bolt} size={16} fill={getAccentInk()} stroke={getAccentInk()} sw={2}/>
        </div>
        <div>
          <div style={{ fontFamily: FT.ff.display, fontSize: 15, fontWeight: 700, letterSpacing: -0.3, color: FT.bone0 }}>
            FitTrainer
          </div>
          <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, letterSpacing: 0.5 }}>PRO · LAURA</div>
        </div>
      </div>
      <div style={{ flex: 1, padding: '0 10px' }}>
        {items.map(it => (
          <div key={it.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 10px', borderRadius: 8, marginBottom: 2,
            background: active === it.id ? FT.ink3 : 'transparent',
            color: active === it.id ? FT.bone0 : FT.ink6,
          }}>
            <Icon d={it.icon} size={16} sw={1.8}/>
            <span style={{ flex: 1, fontFamily: FT.ff.display, fontSize: 13,
                           fontWeight: active === it.id ? 600 : 500 }}>{it.l}</span>
            {it.badge && (
              <span style={{
                minWidth: 18, height: 18, padding: '0 6px', borderRadius: 9,
                background: active === it.id ? accent : FT.ink3,
                color: active === it.id ? getAccentInk() : FT.ink6,
                fontFamily: FT.ff.mono, fontSize: 10, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{it.badge}</span>
            )}
          </div>
        ))}
      </div>
      {/* QR generator CTA */}
      <div style={{ padding: 12 }}>
        <div style={{
          background: FT.ink2, border: `1px solid ${FT.ink3}`, padding: 12, borderRadius: 12,
        }}>
          <div style={{ fontFamily: FT.ff.mono, fontSize: 9, letterSpacing: 1, color: FT.ink6, marginBottom: 4 }}>INVITAR</div>
          <div style={{ fontFamily: FT.ff.display, fontSize: 12, fontWeight: 500, color: FT.bone0, marginBottom: 8, lineHeight: 1.3 }}>
            Nuevo alumno en 15 segundos
          </div>
          <Btn variant="primary" size="sm" icon={I.qr} full>Generar QR</Btn>
        </div>
      </div>
    </div>
  );
}

function TopBar({ title, subtitle, actions }) {
  return (
    <div style={{
      height: 68, padding: '0 28px', borderBottom: `1px solid ${FT.ink2}`,
      display: 'flex', alignItems: 'center', gap: 16, background: FT.ink1,
      flexShrink: 0,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FT.ff.display, fontSize: 18, fontWeight: 600, letterSpacing: -0.3, color: FT.bone0 }}>
          {title}
        </div>
        {subtitle && <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6, letterSpacing: 0.5, marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 220, height: 36, padding: '0 12px', borderRadius: 10,
          background: FT.ink2, border: `1px solid ${FT.ink3}`,
          display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: FT.ff.body, fontSize: 12, color: FT.ink6,
        }}>
          <Icon d={I.search} size={14}/>Buscar…
          <span style={{ marginLeft: 'auto', fontFamily: FT.ff.mono, fontSize: 9, padding: '2px 5px',
                         border: `1px solid ${FT.ink3}`, borderRadius: 4 }}>⌘K</span>
        </div>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: FT.ink2,
                      border: `1px solid ${FT.ink3}`, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', color: FT.ink6, position: 'relative' }}>
          <Icon d={I.bell} size={16}/>
          <div style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: 3, background: FT.hot }}/>
        </div>
        {actions}
      </div>
    </div>
  );
}

// ─── PT Dashboard ────────────────────────────────────────────
function PTDashboard() {
  const accent = getAccent();
  return (
    <div style={{ height: '100%', display: 'flex', background: FT.ink0, color: FT.bone0,
                  fontFamily: FT.ff.body }}>
      <Sidebar active="dashboard"/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar title="Dashboard" subtitle="MARTES · 22 ABRIL · 09:41"
          actions={<Btn variant="primary" size="sm" icon={I.plus}>Nuevo alumno</Btn>}/>
        <div style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { l: 'ALUMNOS ACTIVOS', v: '23', d: '+2 este mes', good: true, big: true },
              { l: 'SESIONES / SEMANA', v: '84', d: '+12% vs sem. ant.', good: true },
              { l: 'ADHERENCIA', v: '87', u: '%', d: '+4% vs mes ant.', good: true },
              { l: 'INACTIVOS > 7D', v: '3', d: 'requieren atención', good: false },
            ].map((k,i) => (
              <div key={i} style={{
                padding: 18, background: FT.ink1, borderRadius: 14,
                border: `1px solid ${FT.ink2}`,
              }}>
                <div style={{ fontFamily: FT.ff.mono, fontSize: 9, letterSpacing: 1, color: FT.ink6, marginBottom: 10 }}>{k.l}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <div style={{ fontFamily: FT.ff.display, fontSize: k.big ? 44 : 36, fontWeight: 700,
                                color: k.big ? getAccentText(FT.ink1) : FT.bone0, letterSpacing: -2, lineHeight: 1 }}>{k.v}</div>
                  {k.u && <div style={{ fontFamily: FT.ff.mono, fontSize: 12, color: FT.ink5 }}>{k.u}</div>}
                </div>
                <div style={{ fontFamily: FT.ff.mono, fontSize: 10,
                              color: k.good ? FT.good : FT.hot, marginTop: 8 }}>{k.d}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 16 }}>
            {/* Actividad por día */}
            <div style={{ padding: 20, background: FT.ink1, borderRadius: 14, border: `1px solid ${FT.ink2}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: FT.ff.display, fontSize: 15, fontWeight: 600 }}>Actividad · 14 días</div>
                  <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6 }}>SESIONES COMPLETADAS</div>
                </div>
                <div style={{ display: 'flex', gap: 4, padding: 3, background: FT.ink2, borderRadius: 8 }}>
                  {['7D','14D','30D'].map((t,i) => (
                    <div key={i} style={{
                      padding: '4px 10px', borderRadius: 5, fontFamily: FT.ff.mono, fontSize: 10,
                      background: i === 1 ? FT.ink3 : 'transparent',
                      color: i === 1 ? FT.bone0 : FT.ink6,
                    }}>{t}</div>
                  ))}
                </div>
              </div>
              <BarChart data={[8,12,6,10,14,4,2,10,9,11,13,8,12,15]} width={460} height={140} color={accent}
                        labels={['L','M','X','J','V','S','D','L','M','X','J','V','S','D']} highlight={13}/>
            </div>

            {/* Alertas */}
            <div style={{ padding: 20, background: FT.ink1, borderRadius: 14, border: `1px solid ${FT.ink2}` }}>
              <div style={{ fontFamily: FT.ff.display, fontSize: 15, fontWeight: 600, marginBottom: 2 }}>Atención</div>
              <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6, marginBottom: 16 }}>ALERTAS DE INACTIVIDAD</div>
              {[
                { n: 'Diego Ocampo', d: '9 días sin entrenar', tag: 'riesgo', tone: 'hot' },
                { n: 'Lucía Méndez', d: '7 días, feedback pendiente', tag: 'aviso', tone: 'cool' },
                { n: 'Matías Toro', d: 'no abrió app en 11 días', tag: 'riesgo', tone: 'hot' },
              ].map((a,i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10,
                                     padding: '10px 0', borderBottom: i === 2 ? 'none' : `1px solid ${FT.ink2}` }}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, background: FT.ink3,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: FT.ff.display, fontWeight: 600, fontSize: 12, color: FT.bone0 }}>
                    {a.n[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: FT.ff.display, fontSize: 13, fontWeight: 500 }}>{a.n}</div>
                    <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6 }}>{a.d}</div>
                  </div>
                  <Pill tone={a.tone} size="sm">{a.tag}</Pill>
                </div>
              ))}
              <Btn variant="ghost" size="sm" full style={{ marginTop: 12 }}>Ver 5 más</Btn>
            </div>

            {/* Alumnos recientes (grid) */}
            <div style={{ gridColumn: '1 / -1', padding: 20, background: FT.ink1, borderRadius: 14, border: `1px solid ${FT.ink2}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <div style={{ fontFamily: FT.ff.display, fontSize: 15, fontWeight: 600 }}>Actividad reciente</div>
                  <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6 }}>ÚLTIMAS SESIONES REGISTRADAS</div>
                </div>
                <div style={{ fontFamily: FT.ff.mono, fontSize: 11, color: getAccentText(FT.ink1) }}>VER TODO →</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '40px 1.6fr 1fr 0.8fr 1fr 0.4fr', gap: 14,
                            padding: '0 8px 10px', fontFamily: FT.ff.mono, fontSize: 9,
                            color: FT.ink6, letterSpacing: 1, borderBottom: `1px solid ${FT.ink2}` }}>
                <div></div><div>ALUMNO</div><div>OBJETIVO</div><div>RPE</div><div>RUTINA</div><div></div>
              </div>
              {[
                { n: 'Tomás Rivera', o: 'Masa', rpe: 8, r: 'Push · día 3', ago: 'HACE 12 MIN', now: true },
                { n: 'Sofía Blanco', o: 'Bajar peso', rpe: 6, r: 'Full body · día 2', ago: 'HACE 1 H' },
                { n: 'Julián Arce', o: 'Performance', rpe: 9, r: 'Lower · día 4', ago: 'HACE 2 H' },
                { n: 'Valentina R.', o: 'Tonificar', rpe: 5, r: 'Glúteo · día 1', ago: 'AYER' },
              ].map((a,i) => (
                <div key={i} style={{ display: 'grid',
                                     gridTemplateColumns: '40px 1.6fr 1fr 0.8fr 1fr 0.4fr', gap: 14,
                                     padding: '12px 8px', alignItems: 'center',
                                     borderBottom: i === 3 ? 'none' : `1px solid ${FT.ink2}` }}>
                  <div style={{ width: 32, height: 32, borderRadius: 16, background: FT.ink3,
                                position: 'relative',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontFamily: FT.ff.display, fontWeight: 600, fontSize: 12, color: FT.bone0 }}>
                    {a.n[0]}
                    {a.now && <div style={{ position: 'absolute', bottom: -1, right: -1, width: 8, height: 8,
                                           borderRadius: 4, background: FT.good, border: `2px solid ${FT.ink1}` }}/>}
                  </div>
                  <div>
                    <div style={{ fontFamily: FT.ff.display, fontSize: 13, fontWeight: 500 }}>{a.n}</div>
                    <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6 }}>{a.ago}</div>
                  </div>
                  <div style={{ fontFamily: FT.ff.body, fontSize: 12, color: FT.ink6 }}>{a.o}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ fontFamily: FT.ff.display, fontWeight: 600, fontSize: 14,
                                  color: a.rpe >= 8 ? FT.hot : a.rpe >= 7 ? getAccentText(FT.ink1) : FT.ink6 }}>{a.rpe}</div>
                    <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6 }}>/10</div>
                  </div>
                  <div style={{ fontFamily: FT.ff.body, fontSize: 12, color: FT.bone0 }}>{a.r}</div>
                  <Icon d={I.chev_r} size={16} stroke={FT.ink5}/>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PTDashboard, Sidebar, TopBar });
