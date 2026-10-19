// PT — Perfil alumno, Crear rutina, QR generator

// ─── Perfil del alumno (PT view) ─────────────────────────────
function PTPerfil() {
  const accent = getAccent();
  return (
    <div style={{ height: '100%', display: 'flex', background: FT.ink0, color: FT.bone0, fontFamily: FT.ff.body }}>
      <Sidebar active="alumnos"/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar title="Tomás Rivera" subtitle="ALUMNOS › PERFIL · ACTIVO HACE 12 MIN"
          actions={<>
            <Btn variant="ghost" size="sm" icon={I.chat}>Mensaje</Btn>
            <Btn variant="primary" size="sm" icon={I.plus}>Asignar rutina</Btn>
          </>}/>
        <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16 }}>
            {/* Left col: avatar + data */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: 18, background: FT.ink1, borderRadius: 14, border: `1px solid ${FT.ink2}`, textAlign: 'center' }}>
                <div style={{
                  width: 84, height: 84, borderRadius: 42, margin: '0 auto 10px',
                  background: `linear-gradient(135deg, ${accent} 0%, ${FT.ink3} 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: FT.ff.display, fontWeight: 700, fontSize: 32, color: getAccentInk(),
                }}>TR</div>
                <div style={{ fontFamily: FT.ff.display, fontSize: 17, fontWeight: 600 }}>Tomás Rivera</div>
                <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6, letterSpacing: 0.5, marginTop: 2 }}>24 AÑOS · M · 4 D/SEM</div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
                  <Pill tone="good" size="sm">ACTIVO</Pill>
                  <Pill tone="neutral" size="sm">MASA</Pill>
                </div>
              </div>
              <div style={{ padding: 16, background: FT.ink1, borderRadius: 14, border: `1px solid ${FT.ink2}` }}>
                <div style={{ fontFamily: FT.ff.mono, fontSize: 9, letterSpacing: 1, color: FT.ink6, marginBottom: 12 }}>
                  ANTROPOMETRÍA · 22 ABR
                </div>
                {[
                  ['Peso', '74.5', 'kg', '+1.2'],
                  ['Talla', '178', 'cm'],
                  ['% Grasa', '14.2', '%', '-0.8'],
                  ['IMC', '23.5', ''],
                  ['Cintura', '78', 'cm'],
                  ['Pecho', '102', 'cm', '+1.5'],
                  ['Brazo', '38.2', 'cm', '+0.5'],
                ].map((r,i,a) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                    padding: '8px 0', borderBottom: i === a.length-1 ? 'none' : `1px solid ${FT.ink2}`,
                  }}>
                    <span style={{ fontFamily: FT.ff.body, fontSize: 12, color: FT.ink6 }}>{r[0]}</span>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      {r[3] && <span style={{ fontFamily: FT.ff.mono, fontSize: 9, color: r[3].startsWith('+') ? FT.good : FT.hot }}>{r[3]}</span>}
                      <span style={{ fontFamily: FT.ff.display, fontWeight: 600, fontSize: 13 }}>{r[1]}<span style={{ fontSize: 10, color: FT.ink5, marginLeft: 2 }}>{r[2]}</span></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right col: stats + charts + last sessions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Mini KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {[
                  { l: 'SESIONES · MES', v: '14', u: '/16', good: true },
                  { l: 'RACHA', v: '12', u: 'días', hot: true },
                  { l: 'RPE PROM.', v: '7.8', u: '/10' },
                  { l: 'PRS · MES', v: '3', u: 'nuevos', accent: true },
                ].map((k,i) => (
                  <div key={i} style={{ padding: 14, background: FT.ink1, borderRadius: 12, border: `1px solid ${FT.ink2}` }}>
                    <div style={{ fontFamily: FT.ff.mono, fontSize: 9, letterSpacing: 0.8, color: FT.ink6, marginBottom: 8 }}>{k.l}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <div style={{ fontFamily: FT.ff.display, fontSize: 28, fontWeight: 700,
                                    color: k.hot ? FT.hot : k.accent ? getAccentText(FT.ink1) : FT.bone0, letterSpacing: -1, lineHeight: 1 }}>{k.v}</div>
                      <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6 }}>{k.u}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chart grande: evolución cargas clave */}
              <div style={{ padding: 20, background: FT.ink1, borderRadius: 14, border: `1px solid ${FT.ink2}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <div style={{ fontFamily: FT.ff.display, fontSize: 14, fontWeight: 600 }}>Evolución · Cargas clave</div>
                    <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, letterSpacing: 0.5, marginTop: 2 }}>ÚLTIMOS 12 SEMANAS</div>
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[
                      { c: accent, l: 'Banca' },
                      { c: FT.cool, l: 'Sentadilla' },
                      { c: FT.hot, l: 'P. Muerto' },
                    ].map((l,i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6 }}>
                        <div style={{ width: 8, height: 2, background: l.c }}/>{l.l}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ position: 'relative', height: 140 }}>
                  <div style={{ position: 'absolute', inset: 0 }}>
                    <Sparkline data={[42,45,48,50,52,55,58,60,62,65,68,70]} width={640} height={140} color={accent} fill={false}/>
                  </div>
                  <div style={{ position: 'absolute', inset: 0 }}>
                    <Sparkline data={[60,65,70,72,78,80,85,88,90,92,94,95]} width={640} height={140} color={FT.cool} fill={false}/>
                  </div>
                  <div style={{ position: 'absolute', inset: 0 }}>
                    <Sparkline data={[80,85,90,95,100,102,108,112,115,118,120,120]} width={640} height={140} color={FT.hot} fill={false}/>
                  </div>
                </div>
              </div>

              {/* Últimas sesiones */}
              <div style={{ padding: 20, background: FT.ink1, borderRadius: 14, border: `1px solid ${FT.ink2}` }}>
                <div style={{ fontFamily: FT.ff.display, fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Últimas sesiones</div>
                {[
                  { d: '22 ABR', r: 'Push · día 3', dur: '54′', rpe: 8, pr: true, note: 'Subió 2.5kg en banca. Buen control.' },
                  { d: '20 ABR', r: 'Pull · día 2', dur: '48′', rpe: 7, note: 'Dominada lastrada, complete sets.' },
                  { d: '18 ABR', r: 'Legs · día 1', dur: '62′', rpe: 9, pr: true, note: 'PR sentadilla. Fatiga alta.' },
                ].map((s,i,a) => (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '64px 1fr 80px 60px', gap: 14,
                    padding: '12px 0', alignItems: 'flex-start',
                    borderBottom: i === a.length-1 ? 'none' : `1px solid ${FT.ink2}`,
                  }}>
                    <div>
                      <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6 }}>{s.d}</div>
                      <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink5 }}>{s.dur}</div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <div style={{ fontFamily: FT.ff.display, fontSize: 13, fontWeight: 500 }}>{s.r}</div>
                        {s.pr && <Pill tone="accent" size="sm">PR</Pill>}
                      </div>
                      <div style={{ fontFamily: FT.ff.body, fontSize: 11, color: FT.ink6, lineHeight: 1.4 }}>{s.note}</div>
                    </div>
                    <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6 }}>
                      RPE <span style={{ fontFamily: FT.ff.display, fontSize: 14, color: s.rpe >= 8 ? FT.hot : FT.bone0, fontWeight: 600 }}>{s.rpe}</span>/10
                    </div>
                    <Btn variant="ghost" size="sm" style={{ height: 28, fontSize: 11 }}>Detalle</Btn>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Crear rutina ────────────────────────────────────────────
function PTCrearRutina() {
  const accent = getAccent();
  return (
    <div style={{ height: '100%', display: 'flex', background: FT.ink0, color: FT.bone0, fontFamily: FT.ff.body }}>
      <Sidebar active="rutinas"/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar title="Nueva rutina — Push / día 3" subtitle="RUTINAS › CREAR · AUTO-GUARDADO · HACE 4S"
          actions={<>
            <Btn variant="ghost" size="sm">Guardar borrador</Btn>
            <Btn variant="primary" size="sm" icon={I.check}>Asignar a alumno</Btn>
          </>}/>
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Main editor */}
          <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
            {/* Meta */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
              {[
                { l: 'PLANTILLA', v: 'Push A · Hipertrofia' },
                { l: 'DÍAS', v: 'L / J' },
                { l: 'DURACIÓN EST.', v: '55 min' },
                { l: 'NIVEL', v: 'Intermedio' },
              ].map((m,i) => (
                <div key={i} style={{ flex: 1, padding: '10px 12px', background: FT.ink1, borderRadius: 10, border: `1px solid ${FT.ink2}` }}>
                  <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, letterSpacing: 0.8 }}>{m.l}</div>
                  <div style={{ fontFamily: FT.ff.display, fontSize: 13, fontWeight: 500, marginTop: 3 }}>{m.v}</div>
                </div>
              ))}
            </div>

            {/* Header de tabla */}
            <div style={{ display: 'grid',
                          gridTemplateColumns: '28px 1.8fr 70px 80px 70px 70px 1fr 40px', gap: 10,
                          padding: '0 8px 10px', fontFamily: FT.ff.mono, fontSize: 9,
                          color: FT.ink6, letterSpacing: 1 }}>
              <div>#</div><div>EJERCICIO</div><div>SERIES</div><div>REPS</div>
              <div>DESC.</div><div>RIR/RPE</div><div>NOTA</div><div></div>
            </div>

            {/* Filas editables */}
            {[
              { n: 'Press banca barra', s: 4, r: '8-10', rest: '90″', rpe: 'RPE 8', note: 'Control excéntrico 3s' },
              { n: 'Press inclinado mancuernas', s: 3, r: '10-12', rest: '75″', rpe: 'RIR 2', note: 'Inclinación 30°' },
              { n: 'Aperturas en polea', s: 3, r: '12-15', rest: '60″', rpe: 'RIR 1', note: 'Squeeze al final' },
              { n: 'Press militar barra', s: 4, r: '8', rest: '90″', rpe: 'RPE 8', note: '' },
              { n: 'Elevaciones laterales', s: 3, r: '12', rest: '60″', rpe: 'RIR 1', note: 'Drop set última' },
              { n: 'Fondos en paralelas', s: 3, r: 'AMRAP', rest: '75″', rpe: 'RPE 9', note: 'Tempo libre' },
            ].map((e,i) => (
              <div key={i} style={{ display: 'grid',
                                   gridTemplateColumns: '28px 1.8fr 70px 80px 70px 70px 1fr 40px', gap: 10,
                                   padding: '8px', marginBottom: 4,
                                   borderRadius: 8, background: i === 0 ? FT.ink2 : 'transparent',
                                   alignItems: 'center',
                                   border: `1px solid ${i === 0 ? FT.ink3 : 'transparent'}` }}
                onMouseEnter={()=>{}}
              >
                <div style={{ fontFamily: FT.ff.mono, fontSize: 11, color: FT.ink6 }}>{String(i+1).padStart(2,'0')}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 6, flexShrink: 0,
                    background: FT.ink3,
                    backgroundImage: `repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 4px, transparent 4px 8px)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: FT.ink6,
                  }}><Icon d={I.dumbbell} size={16}/></div>
                  <div>
                    <div style={{ fontFamily: FT.ff.display, fontSize: 12, fontWeight: 500 }}>{e.n}</div>
                    <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6 }}>PECHO · COMPUESTO</div>
                  </div>
                </div>
                {[e.s, e.r, e.rest, e.rpe].map((v,j) => (
                  <div key={j} style={{ padding: '6px 8px', background: FT.ink2, borderRadius: 6, border: `1px solid ${FT.ink3}`,
                                       fontFamily: FT.ff.mono, fontSize: 11, textAlign: 'center' }}>{v}</div>
                ))}
                <div style={{ fontFamily: FT.ff.body, fontSize: 11, color: e.note ? FT.ink6 : FT.ink5, fontStyle: e.note ? 'normal' : 'italic' }}>{e.note || 'agregar nota…'}</div>
                <Icon d={I.more} size={16} stroke={FT.ink5}/>
              </div>
            ))}

            <button style={{
              marginTop: 10, width: '100%', padding: 12, borderRadius: 10,
              background: 'transparent', color: FT.ink6, border: `1px dashed ${FT.ink3}`,
              fontFamily: FT.ff.mono, fontSize: 11, letterSpacing: 0.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}><Icon d={I.plus} size={14}/>AGREGAR EJERCICIO</button>
          </div>

          {/* Biblioteca sidebar */}
          <div style={{ width: 280, borderLeft: `1px solid ${FT.ink2}`, background: FT.ink1,
                        display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
            <div style={{ padding: '16px 16px 12px' }}>
              <div style={{ fontFamily: FT.ff.mono, fontSize: 9, letterSpacing: 1, color: FT.ink6, marginBottom: 8 }}>BIBLIOTECA · 142 EJ.</div>
              <div style={{
                height: 34, padding: '0 10px', borderRadius: 8, background: FT.ink2,
                border: `1px solid ${FT.ink3}`, display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: FT.ff.body, fontSize: 12, color: FT.ink6,
              }}>
                <Icon d={I.search} size={13}/>Buscar ejercicio…
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
                {['Pecho','Hombro','Espalda','Pierna','Core','Brazo'].map((t,i) => (
                  <div key={i} style={{
                    padding: '4px 8px', borderRadius: 100,
                    background: i === 0 ? accent : FT.ink2,
                    color: i === 0 ? getAccentInk() : FT.ink6,
                    fontFamily: FT.ff.mono, fontSize: 10, fontWeight: 500,
                  }}>{t}</div>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 10px 10px' }}>
              {[
                'Press banca barra','Press banca mancuernas','Press inclinado barra',
                'Press declinado barra','Aperturas banco plano','Aperturas polea cruzada',
                'Pull over mancuerna','Fondos paralelas','Push up lastrado',
              ].map((n,i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: 8, borderRadius: 8, marginBottom: 2,
                }}>
                  <div style={{ width: 36, height: 36, borderRadius: 6, background: FT.ink3, flexShrink: 0,
                                backgroundImage: `repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 4px, transparent 4px 8px)`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: FT.ink6 }}>
                    <Icon d={I.video} size={14}/>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FT.ff.display, fontSize: 12, fontWeight: 500,
                                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n}</div>
                    <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6 }}>PECHO</div>
                  </div>
                  <Icon d={I.plus} size={14} stroke={FT.ink5}/>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── QR Generator (PT) ───────────────────────────────────────
function PTGenerarQR() {
  const accent = getAccent();
  return (
    <div style={{ height: '100%', display: 'flex', background: FT.ink0, color: FT.bone0, fontFamily: FT.ff.body }}>
      <Sidebar active="alumnos"/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar title="Invitar alumno" subtitle="ALUMNOS › NUEVO · GENERÁ QR Y COMPARTILO POR WHATSAPP"/>
        <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, maxWidth: 960, margin: '0 auto' }}>
            {/* Form */}
            <div>
              <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6, letterSpacing: 1, marginBottom: 10 }}>
                DATOS DEL ALUMNO · PASO 1 DE 2
              </div>
              <div style={{ fontFamily: FT.ff.display, fontSize: 24, fontWeight: 600, letterSpacing: -0.6, marginBottom: 18 }}>
                Precargá lo que ya sabés
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { l: 'NOMBRE Y APELLIDO', v: 'Tomás Rivera', f: true },
                  { l: 'EMAIL', v: 'tomas.r@gmail.com', f: true },
                ].map((f,i) => (
                  <div key={i}>
                    <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, letterSpacing: 1, marginBottom: 6 }}>{f.l}</div>
                    <div style={{
                      height: 46, padding: '0 14px', borderRadius: 10,
                      background: FT.ink1, border: `1px solid ${f.f ? getAccentText() : FT.ink3}`,
                      display: 'flex', alignItems: 'center',
                      fontFamily: FT.ff.body, fontSize: 14, color: FT.bone0,
                    }}>{f.v}</div>
                  </div>
                ))}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { l: 'OBJETIVO', v: 'Ganar masa muscular ▾' },
                    { l: 'FRECUENCIA', v: '4 días / semana ▾' },
                  ].map((f,i) => (
                    <div key={i}>
                      <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, letterSpacing: 1, marginBottom: 6 }}>{f.l}</div>
                      <div style={{
                        height: 46, padding: '0 14px', borderRadius: 10,
                        background: FT.ink1, border: `1px solid ${FT.ink3}`,
                        display: 'flex', alignItems: 'center',
                        fontFamily: FT.ff.body, fontSize: 14, color: FT.bone0,
                      }}>{f.v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {[
                    { l: 'ALTURA', v: '178', u: 'cm' },
                    { l: 'PESO', v: '74.5', u: 'kg' },
                    { l: 'EDAD', v: '24', u: 'años' },
                  ].map((f,i) => (
                    <div key={i}>
                      <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, letterSpacing: 1, marginBottom: 6 }}>{f.l}</div>
                      <div style={{
                        height: 46, padding: '0 14px', borderRadius: 10,
                        background: FT.ink1, border: `1px solid ${FT.ink3}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        fontFamily: FT.ff.display, fontSize: 15, fontWeight: 500, color: FT.bone0,
                      }}>
                        <span>{f.v}</span>
                        <span style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6 }}>{f.u}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, letterSpacing: 1, marginBottom: 6 }}>PLANTILLA INICIAL (OPCIONAL)</div>
                  <div style={{
                    padding: 12, borderRadius: 10, background: FT.ink1, border: `1px solid ${FT.ink3}`,
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: accent, color: getAccentInk(),
                                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon d={I.list} size={16} sw={2}/>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: FT.ff.display, fontSize: 13, fontWeight: 500 }}>Push/Pull/Legs · Hipertrofia</div>
                      <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6 }}>4 DÍAS · INTERMEDIO · 12 SEMANAS</div>
                    </div>
                    <Btn variant="ghost" size="sm">Cambiar</Btn>
                  </div>
                </div>
              </div>
            </div>

            {/* QR preview */}
            <div>
              <div style={{ fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6, letterSpacing: 1, marginBottom: 10 }}>
                PASO 2 · COMPARTIR QR
              </div>
              <div style={{
                padding: 28, borderRadius: 20, background: FT.ink1, border: `1px solid ${FT.ink3}`,
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', inset: -40, top: -60,
                  background: `radial-gradient(circle at 50% 0%, ${accent}22, transparent 60%)`,
                }}/>
                <div style={{
                  margin: '0 auto', width: 240, padding: 22, borderRadius: 16,
                  background: FT.bone0, position: 'relative', textAlign: 'center',
                }}>
                  <QRCode size={196} color={FT.ink0} bg={FT.bone0}/>
                  <div style={{
                    position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
                    width: 44, height: 44, borderRadius: 10, background: accent,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: `4px solid ${FT.bone0}`,
                  }}>
                    <Icon d={I.bolt} size={20} fill={getAccentInk()} stroke={getAccentInk()} sw={2}/>
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: 16, fontFamily: FT.ff.display, fontSize: 16, fontWeight: 600 }}>
                  Tomás, abrí con la cámara
                </div>
                <div style={{ textAlign: 'center', fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6, letterSpacing: 0.5, marginTop: 4 }}>
                  VÁLIDO 48H · ft.app/i/7A2K9X
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 20, position: 'relative' }}>
                  <Btn variant="primary" size="md" icon={I.send} style={{ flex: 1 }}>WhatsApp</Btn>
                  <Btn variant="ghost" size="md" icon={I.qr}>Descargar</Btn>
                </div>
              </div>
              <div style={{ marginTop: 14, padding: 14, background: FT.ink1, borderRadius: 12, border: `1px solid ${FT.ink2}` }}>
                <div style={{ fontFamily: FT.ff.mono, fontSize: 9, color: FT.ink6, letterSpacing: 1, marginBottom: 6 }}>QUÉ VE EL ALUMNO</div>
                <ol style={{ margin: 0, padding: '0 0 0 18px', fontFamily: FT.ff.body, fontSize: 12, color: FT.bone0, lineHeight: 1.7 }}>
                  <li>Escanea el QR con su celular</li>
                  <li>Se abre la app con sus datos precargados</li>
                  <li>Confirma y elige contraseña</li>
                  <li>Entra a su primera rutina</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PTPerfil, PTCrearRutina, PTGenerarQR });
