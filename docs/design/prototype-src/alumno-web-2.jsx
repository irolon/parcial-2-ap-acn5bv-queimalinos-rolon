// Alumno · versión WEB hi-fi (parte 2): progreso, asistente IA, perfil
// + Panel de alumnos del entrenador en web

// ─── A3 · MI PROGRESO ─────────────────────────────────────────
function AW_Progreso() {
  const accent = getAccent();
  return (
    <div style={{ height: '100%', display: 'flex', background: FT.ink0, color: FT.bone0, fontFamily: FT.ff.body }}>
      <AlSidebar active="progreso"/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AlTop title="Mi progreso" sub="EVOLUCIÓN · ÚLTIMOS 3 MESES"
          actions={<><Btn variant="ghost" size="sm">Últimos 3 meses ▾</Btn><Btn variant="dark" size="sm">Exportar</Btn></>}/>
        <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 14, overflow: 'hidden' }}>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
            {[
              { l: 'SESIONES DEL MES', v: '14', u: '/16', d: 'a 2 de tu objetivo', accent: true },
              { l: 'RACHA ACTUAL', v: '12', u: 'días', d: 'tu mejor racha', hot: true },
              { l: 'RÉCORDS DEL MES', v: '3', u: 'nuevos', d: 'banca, sentadilla, peso muerto' },
              { l: 'VOLUMEN TOTAL', v: '48', u: 't', d: '+9% vs mes anterior', good: true },
            ].map((k, i) => (
              <Card key={i} p={16}>
                <div style={{ fontFamily: FT.ff.mono, fontSize: 9, letterSpacing: 1, color: FT.ink6, marginBottom: 9 }}>{k.l}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <span style={{ fontFamily: FT.ff.display, fontSize: 34, fontWeight: 700, letterSpacing: -1.6, lineHeight: 1,
                    color: k.accent ? getAccentText(FT.ink1) : k.hot ? FT.hot : FT.bone0 }}>{k.v}</span>
                  <span style={{ fontFamily: FT.ff.mono, fontSize: 11, color: FT.ink6 }}>{k.u}</span>
                </div>
                <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: k.good ? FT.good : FT.ink6, marginTop: 8, letterSpacing: 0.3 }}>
                  {k.d.toUpperCase()}
                </div>
              </Card>
            ))}
          </div>
          {/* charts */}
          <div style={{ flex: 1, display: 'flex', gap: 14, overflow: 'hidden' }}>
            <Card title="Progresión de cargas" style={{ flex: 1.6 }}
              extra={<div style={{ display: 'flex', gap: 12 }}>
                {[[accent,'Banca'],[FT.cool,'Sentadilla'],[FT.hot,'Peso muerto']].map(([c, n], i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 5,
                    fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6 }}>
                    <span style={{ width: 10, height: 2, background: c }}/>{n}</span>
                ))}
              </div>}>
              <div style={{ position: 'relative', height: 188 }}>
                {[[[42,45,48,50,52,55,58,60,62,65,68,70], accent],
                  [[60,65,70,72,78,80,85,88,90,92,94,95], FT.cool],
                  [[80,85,90,95,100,102,108,112,115,118,120,120], FT.hot]].map(([d, c], i) => (
                  <div key={i} style={{ position: 'absolute', inset: 0 }}>
                    <Sparkline data={d} width={560} height={188} color={c} fill={i === 0}/>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8,
                fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, letterSpacing: 0.5 }}>
                <span>ENE</span><span>FEB</span><span>MAR</span><span>ABR</span>
              </div>
            </Card>
            <Card title="Por ejercicio" style={{ flex: 1 }}>
              {[
                ['Press banca', '70 kg', '+12%', [42,48,52,58,62,68,70]],
                ['Sentadilla', '95 kg', '+8%', [70,78,80,85,90,94,95]],
                ['Peso muerto', '120 kg', '+15%', [90,95,102,108,115,120,120]],
                ['Press militar', '45 kg', '+5%', [37,38,40,42,43,45,45]],
                ['Remo con barra', '75 kg', '+10%', [60,64,68,70,72,74,75]],
              ].map((e, i, a) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0',
                  borderBottom: i < a.length - 1 ? `1px solid ${FT.ink2}` : 'none' }}>
                  <span style={{ flex: 1, fontFamily: FT.ff.display, fontSize: 13, fontWeight: 500 }}>{e[0]}</span>
                  <Sparkline data={e[3]} width={64} height={26} fill={false}/>
                  <span style={{ fontFamily: FT.ff.display, fontSize: 15, fontWeight: 700, minWidth: 56, textAlign: 'right' }}>{e[1]}</span>
                  <span style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.good, minWidth: 38, textAlign: 'right' }}>{e[2]}</span>
                </div>
              ))}
            </Card>
          </div>
          {/* medidas + logros */}
          <div style={{ display: 'flex', gap: 14, flexShrink: 0 }}>
            <Card title="Peso corporal y medidas" style={{ flex: 1.6 }} p={16}>
              <div style={{ display: 'flex', gap: 18, alignItems: 'center' }}>
                <div style={{ flex: 1 }}><Sparkline data={[71.5,72,72.4,72.9,73.2,73.8,74.1,74.5]} width={220} height={54}/></div>
                {[['Peso','74.5 kg','+1.2'],['% Grasa','14.2 %','-0.8'],['Cintura','78 cm','-1.0'],['Brazo','38.2 cm','+0.5']].map((m, i) => (
                  <div key={i} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, letterSpacing: 0.5 }}>{m[0].toUpperCase()}</div>
                    <div style={{ fontFamily: FT.ff.display, fontSize: 17, fontWeight: 700, letterSpacing: -0.5, marginTop: 2 }}>{m[1]}</div>
                    <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: m[2].startsWith('+') ? FT.good : FT.hot, marginTop: 2 }}>{m[2]}</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Logros" style={{ flex: 1 }} p={16}>
              <div style={{ display: 'flex', gap: 9 }}>
                {[[I.flame, FT.hot, 'RACHA 12'],[I.trophy, accent, 'PR BANCA'],[I.bolt, FT.cool, '4 D/SEM']].map((b, i) => (
                  <div key={i} style={{ flex: 1, padding: '12px 6px', borderRadius: 10, background: FT.ink2, textAlign: 'center' }}>
                    <div style={{ color: b[1], display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                      <Icon d={b[0]} size={20} stroke={b[1]} fill={b[1] === accent ? b[1] : 'none'}/>
                    </div>
                    <div style={{ fontFamily: FT.ff.mono, fontSize: 9, fontWeight: 600, letterSpacing: 0.4 }}>{b[2]}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── A4 · ASISTENTE IA ────────────────────────────────────────
function AW_Chat() {
  const accent = getAccent();
  return (
    <div style={{ height: '100%', display: 'flex', background: FT.ink0, color: FT.bone0, fontFamily: FT.ff.body }}>
      <AlSidebar active="chat"/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AlTop title="Asistente IA" sub="DUDAS DE TÉCNICA, REEMPLAZOS Y PROGRESIÓN"/>
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* historial */}
          <div style={{ width: 250, flexShrink: 0, borderRight: `1px solid ${FT.ink2}`, background: FT.ink1, padding: 16 }}>
            <Btn variant="primary" size="sm" full icon={I.plus}>Nueva consulta</Btn>
            <div style={{ fontFamily: FT.ff.mono, fontSize: 9, letterSpacing: 1, color: FT.ink6,
              margin: '18px 0 9px', padding: '0 2px' }}>CONSULTAS GUARDADAS</div>
            {[
              ['Reemplazo de press banca', 'hoy'],
              ['¿Cómo mejorar dominadas?', 'ayer'],
              ['Calentamiento de hombro', '3 d'],
              ['Snack antes de entrenar', '1 sem'],
              ['Técnica de peso muerto', '2 sem'],
            ].map((c, i) => (
              <div key={i} style={{ padding: '10px 11px', borderRadius: 9, marginBottom: 3,
                background: i === 0 ? FT.ink3 : 'transparent',
                borderLeft: `2px solid ${i === 0 ? getAccentText(FT.ink1) : 'transparent'}` }}>
                <div style={{ fontFamily: FT.ff.display, fontSize: 12, fontWeight: i === 0 ? 600 : 500,
                  color: i === 0 ? FT.bone0 : FT.ink6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c[0]}</div>
                <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink5, marginTop: 2 }}>{c[1].toUpperCase()}</div>
              </div>
            ))}
          </div>
          {/* conversación */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flex: 1, padding: '22px 32px', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
              <div style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 7,
                padding: '6px 13px', borderRadius: 99, background: FT.ink2, border: `1px solid ${FT.ink3}` }}>
                <Icon d={I.target} size={12} stroke={FT.ink6}/>
                <span style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, letterSpacing: 0.5 }}>CONTEXTO · PUSH DÍA 3 · PRESS BANCA · SERIE 3</span>
              </div>
              <div style={{ alignSelf: 'flex-end', maxWidth: '62%' }}>
                <div style={{ padding: '12px 16px', borderRadius: 16, borderBottomRightRadius: 4,
                  background: accent, color: getAccentInk(), fontFamily: FT.ff.body, fontSize: 14, lineHeight: 1.45 }}>
                  ¿Con qué reemplazo el press banca si está ocupado el banco?
                </div>
              </div>
              <div style={{ alignSelf: 'flex-start', maxWidth: '74%' }}>
                <div style={{ padding: '14px 16px', borderRadius: 16, borderBottomLeftRadius: 4,
                  background: FT.ink2, border: `1px solid ${FT.ink3}`, fontFamily: FT.ff.body, fontSize: 14, lineHeight: 1.5 }}>
                  Tres opciones que trabajan el mismo patrón de empuje horizontal:
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      ['Press inclinado con mancuernas', 'muy similar · carga sugerida 22.5 kg × 10'],
                      ['Press en máquina', 'si querés fijar el recorrido'],
                      ['Fondos lastrados', 'peso corporal, sin equipamiento'],
                    ].map((o, i) => (
                      <div key={i} style={{ padding: 11, borderRadius: 10, background: FT.ink3,
                        display: 'flex', alignItems: 'center', gap: 11 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: FT.ink1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: getAccentText(FT.ink3) }}>
                          <Icon d={I.swap} size={14}/>
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: FT.ff.display, fontSize: 12.5, fontWeight: 600 }}>{o[0]}</div>
                          <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, marginTop: 1 }}>{o[1]}</div>
                        </div>
                        <Btn variant="ghost" size="sm" style={{ height: 28, fontSize: 11 }}>Usar</Btn>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, marginTop: 5, paddingLeft: 4 }}>09:42 · ASISTENTE</div>
              </div>
            </div>
            {/* input */}
            <div style={{ padding: '14px 32px 18px', borderTop: `1px solid ${FT.ink2}`, background: FT.ink1 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                {['¿Cuánto debería subir?','Técnica correcta','Calentamiento','Estiramiento post'].map((t, i) => (
                  <div key={i} style={{ padding: '6px 11px', borderRadius: 99, background: FT.ink2,
                    border: `1px solid ${FT.ink3}`, fontFamily: FT.ff.mono, fontSize: 10, color: FT.bone0 }}>{t}</div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <div style={{ flex: 1, height: 44, borderRadius: 12, padding: '0 14px', background: FT.ink2,
                  border: `1px solid ${FT.ink3}`, display: 'flex', alignItems: 'center', gap: 9,
                  fontFamily: FT.ff.body, fontSize: 13, color: FT.ink5 }}>
                  <Icon d={I.sparkle} size={15} stroke={FT.ink6}/>Escribí tu consulta…
                </div>
                <Btn variant="primary" size="md" icon={I.send}>Enviar</Btn>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── A5 · MI PERFIL ───────────────────────────────────────────
function AW_Perfil() {
  const accent = getAccent();
  const field = (l, v, focus) => (
    <div>
      <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, letterSpacing: 1, marginBottom: 6 }}>{l}</div>
      <div style={{ height: 44, padding: '0 14px', borderRadius: 12, background: FT.ink2,
        border: `1px solid ${focus ? getAccentText(FT.ink2) : FT.ink3}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontFamily: FT.ff.body, fontSize: 13.5, color: FT.bone0 }}>
        {v}{String(v).includes('▾') ? null : null}
      </div>
    </div>
  );
  return (
    <div style={{ height: '100%', display: 'flex', background: FT.ink0, color: FT.bone0, fontFamily: FT.ff.body }}>
      <AlSidebar active="perfil"/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AlTop title="Mi perfil" sub="DATOS, MEDIDAS Y CONFIGURACIÓN"
          actions={<><Btn variant="ghost" size="sm">Cancelar</Btn><Btn variant="primary" size="sm" icon={I.check}>Guardar cambios</Btn></>}/>
        <div style={{ flex: 1, padding: 24, display: 'flex', gap: 16, overflow: 'hidden' }}>
          {/* columna izquierda */}
          <div style={{ width: 270, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Card>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 84, height: 84, borderRadius: 42, margin: '0 auto 12px',
                  background: `linear-gradient(135deg, ${accent} 0%, ${FT.ink3} 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: FT.ff.display, fontWeight: 700, fontSize: 30, color: getAccentInk() }}>TR</div>
                <div style={{ fontFamily: FT.ff.display, fontSize: 18, fontWeight: 600, letterSpacing: -0.4 }}>Tomás Rivera</div>
                <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6, letterSpacing: 0.5, marginTop: 3 }}>24 AÑOS · 4 D/SEM</div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
                  <Pill tone="good" size="sm">ACTIVO</Pill><Pill tone="neutral" size="sm">MASA</Pill>
                </div>
                <div style={{ marginTop: 14 }}><Btn variant="ghost" size="sm" full>Cambiar foto</Btn></div>
              </div>
            </Card>
            <Card title="Mi entrenadora">
              <div style={{ display: 'flex', gap: 11, alignItems: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: 20, flexShrink: 0, background: accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: FT.ff.display, fontWeight: 700, fontSize: 14, color: getAccentInk() }}>LP</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FT.ff.display, fontSize: 13, fontWeight: 600 }}>Laura Pereyra</div>
                  <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6 }}>LIC. EN ED. FÍSICA</div>
                </div>
              </div>
              <div style={{ marginTop: 12 }}><Btn variant="ghost" size="sm" full icon={I.chat}>Enviar mensaje</Btn></div>
            </Card>
            <Card title="Plan" style={{ flex: 1 }}>
              <div style={{ fontFamily: FT.ff.display, fontSize: 15, fontWeight: 600 }}>Plan Mensual</div>
              <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6, marginTop: 3 }}>RENUEVA EL 22 MAY</div>
            </Card>
          </div>
          {/* columna derecha */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
            <Card title="Datos personales">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {field('NOMBRE Y APELLIDO', 'Tomás Rivera', true)}
                  {field('EMAIL', 'tomas.r@gmail.com')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  {field('OBJETIVO', 'Ganar masa muscular ▾')}
                  {field('FRECUENCIA', '4 días / semana ▾')}
                  {field('EDAD', '24')}
                </div>
              </div>
            </Card>
            <Card title="Medidas actuales" extra={<Btn variant="ghost" size="sm" icon={I.plus}>Registrar medición</Btn>}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10 }}>
                {[['Peso','74.5','kg','+1.2'],['Talla','178','cm',''],['% Grasa','14.2','%','-0.8'],
                  ['IMC','23.5','',''],['Cintura','78','cm','-1.0'],['Brazo','38.2','cm','+0.5']].map((m, i) => (
                  <div key={i} style={{ padding: '12px 8px', borderRadius: 10, background: FT.ink2, textAlign: 'center' }}>
                    <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, marginBottom: 5 }}>{m[0].toUpperCase()}</div>
                    <div style={{ fontFamily: FT.ff.display, fontSize: 19, fontWeight: 700, letterSpacing: -0.7 }}>
                      {m[1]}<span style={{ fontSize: 10, color: FT.ink5, marginLeft: 2 }}>{m[2]}</span>
                    </div>
                    {m[3] && <div style={{ fontFamily: FT.ff.mono, fontSize: 9, marginTop: 3,
                      color: m[3].startsWith('+') ? FT.good : FT.hot }}>{m[3]}</div>}
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Cuenta" style={{ flex: 1 }}>
              {[['Contraseña','Modificada hace 2 meses','Cambiar'],
                ['Notificaciones','Recordatorio de entreno y mensajes','Editar'],
                ['Modo sin conexión','Rutina del día descargada','Activado'],
                ['Exportar mis datos','Historial completo en formato CSV','Descargar']].map((r, i, a) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 0', borderBottom: i < a.length - 1 ? `1px solid ${FT.ink2}` : 'none' }}>
                  <div>
                    <div style={{ fontFamily: FT.ff.display, fontSize: 13, fontWeight: 500 }}>{r[0]}</div>
                    <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6, marginTop: 2 }}>{r[1]}</div>
                  </div>
                  <Btn variant="ghost" size="sm">{r[2]}</Btn>
                </div>
              ))}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── E2 · PANEL DE ALUMNOS (entrenador, web) ──────────────────
function PTPanelAlumnos() {
  const accent = getAccent();
  const als = [
    { n: 'Tomás Rivera', o: 'Masa muscular', last: 'Hoy 09:30', adh: 94, st: 'activo', freq: '4 d/sem', online: true },
    { n: 'Sofía Blanco', o: 'Bajar de peso', last: 'Hoy 08:10', adh: 78, st: 'activo', freq: '3 d/sem' },
    { n: 'Julián Arce', o: 'Rendimiento', last: 'Ayer', adh: 88, st: 'activo', freq: '5 d/sem' },
    { n: 'Valentina Ruiz', o: 'Tonificar', last: 'Ayer', adh: 82, st: 'activo', freq: '3 d/sem' },
    { n: 'Carla Núñez', o: 'Bajar de peso', last: 'Hoy 07:00', adh: 90, st: 'activo', freq: '4 d/sem' },
    { n: 'Nicolás Paz', o: 'Masa muscular', last: 'Hace 2 días', adh: 71, st: 'activo', freq: '4 d/sem' },
    { n: 'Lucía Méndez', o: 'Recomposición', last: 'Hace 7 días', adh: 55, st: 'aviso', freq: '3 d/sem' },
    { n: 'Diego Ocampo', o: 'Tonificar', last: 'Hace 9 días', adh: 41, st: 'riesgo', freq: '2 d/sem' },
    { n: 'Matías Toro', o: 'Masa muscular', last: 'Hace 11 días', adh: 33, st: 'riesgo', freq: '4 d/sem' },
  ];
  const tone = { activo: 'good', aviso: 'ghost', riesgo: 'hot' };
  return (
    <div style={{ height: '100%', display: 'flex', background: FT.ink0, color: FT.bone0, fontFamily: FT.ff.body }}>
      <Sidebar active="alumnos"/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar title="Alumnos" sub="23 ACTIVOS · 2 EN PRUEBA · 3 EN RIESGO"
          actions={<><Btn variant="ghost" size="sm" icon={I.qr}>Generar QR</Btn><Btn variant="primary" size="sm" icon={I.plus}>Nuevo alumno</Btn></>}/>
        {/* filtros */}
        <div style={{ padding: '12px 24px', background: FT.ink1, borderBottom: `1px solid ${FT.ink2}`,
          display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{ width: 240, height: 36, padding: '0 12px', borderRadius: 10, background: FT.ink2,
            border: `1px solid ${FT.ink3}`, display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: FT.ff.body, fontSize: 12.5, color: FT.ink5 }}>
            <Icon d={I.search} size={14}/>Buscar alumno…
          </div>
          {['Objetivo ▾','Estado ▾','Ordenar: última sesión ▾'].map((f, i) => (
            <div key={i} style={{ height: 36, padding: '0 13px', borderRadius: 10, background: 'transparent',
              border: `1px solid ${FT.ink3}`, display: 'flex', alignItems: 'center',
              fontFamily: FT.ff.display, fontSize: 12.5, color: FT.ink6 }}>{f}</div>
          ))}
          <div style={{ flex: 1 }}/>
          <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: `1px solid ${FT.ink3}` }}>
            <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: accent, color: getAccentInk() }}><Icon d={I.home} size={15}/></div>
            <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', color: FT.ink6, borderLeft: `1px solid ${FT.ink3}` }}><Icon d={I.list} size={15}/></div>
          </div>
        </div>
        {/* grilla */}
        <div style={{ flex: 1, padding: 20, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {als.map((a, i) => (
              <div key={i} style={{ padding: 15, borderRadius: 14, background: FT.ink1,
                border: `1px solid ${a.st === 'riesgo' ? 'rgba(255,92,58,0.22)' : FT.ink2}`,
                display: 'flex', flexDirection: 'column', gap: 11 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
                  <Av name={a.n} size={40} tone={a.st === 'riesgo' ? 'hot' : null} online={a.online}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FT.ff.display, fontSize: 14, fontWeight: 600,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.n}</div>
                    <div style={{ fontFamily: FT.ff.mono, fontSize: 9.5, color: FT.ink6, marginTop: 2 }}>
                      {a.o.toUpperCase()} · {a.freq.toUpperCase()}
                    </div>
                  </div>
                  <Icon d={I.more} size={16} stroke={FT.ink5}/>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, letterSpacing: 0.5 }}>ADHERENCIA</span>
                    <span style={{ fontFamily: FT.ff.display, fontSize: 12, fontWeight: 700,
                      color: a.adh >= 70 ? FT.good : a.adh >= 50 ? getAccentText(FT.ink1) : FT.hot }}>{a.adh}%</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: FT.ink3, overflow: 'hidden' }}>
                    <div style={{ width: `${a.adh}%`, height: '100%',
                      background: a.adh >= 70 ? FT.good : a.adh >= 50 ? accent : FT.hot }}/>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  paddingTop: 10, borderTop: `1px solid ${FT.ink2}` }}>
                  <div>
                    <div style={{ fontFamily: FT.ff.mono, fontSize: 8.5, color: FT.ink6, letterSpacing: 0.5 }}>ÚLTIMA SESIÓN</div>
                    <div style={{ fontFamily: FT.ff.display, fontSize: 12, fontWeight: 500,
                      color: a.st === 'riesgo' ? FT.hot : FT.bone0, marginTop: 1 }}>{a.last}</div>
                  </div>
                  <Pill tone={tone[a.st]} size="sm">{a.st}</Pill>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AW_Progreso, AW_Chat, AW_Perfil, PTPanelAlumnos });
