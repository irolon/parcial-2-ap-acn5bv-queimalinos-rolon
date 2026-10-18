// PT onboarding QR + Tweaks panel

// ─── Agenda simplificada ─────────────────────────────────────
function PTAgenda() {
  const accent = getAccent();
  const hours = ['08','09','10','11','12','13','14','15','16','17','18','19','20','21'];
  const days = ['LUN 21','MAR 22','MIÉ 23','JUE 24','VIE 25','SÁB 26'];
  const slots = {
    'MAR 22-09': { n: 'Tomás R.', c: accent },
    'MAR 22-10': { n: 'Julián A.', c: FT.cool },
    'MAR 22-18': { n: 'Sofía B.', c: FT.hot },
    'MIÉ 23-08': { n: 'Valentina', c: accent },
    'MIÉ 23-17': { n: 'Diego O.', c: FT.cool },
    'JUE 24-09': { n: 'Tomás R.', c: accent },
    'JUE 24-19': { n: 'Lucía M.', c: FT.hot },
    'VIE 25-18': { n: 'Matías T.', c: accent },
  };
  return (
    <div style={{ height: '100%', display: 'flex', background: FT.ink0, color: FT.bone0, fontFamily: FT.ff.body }}>
      <Sidebar active="agenda"/>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TopBar title="Agenda" subtitle="SEMANA 17 · 21–27 ABRIL"
          actions={<Btn variant="primary" size="sm" icon={I.plus}>Nuevo turno</Btn>}/>
        <div style={{ flex: 1, padding: 20, overflow: 'auto' }}>
          <div style={{ background: FT.ink1, borderRadius: 14, border: `1px solid ${FT.ink2}`, overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: `50px repeat(6, 1fr)`, borderBottom: `1px solid ${FT.ink2}` }}>
              <div/>
              {days.map((d,i) => (
                <div key={i} style={{ padding: '12px 8px', textAlign: 'center',
                                     fontFamily: FT.ff.mono, fontSize: 10, color: i === 1 ? getAccentText() : FT.ink6,
                                     letterSpacing: 1, borderLeft: `1px solid ${FT.ink2}` }}>{d}</div>
              ))}
            </div>
            {hours.map((h,hi) => (
              <div key={h} style={{ display: 'grid', gridTemplateColumns: `50px repeat(6, 1fr)`,
                                   borderBottom: `1px solid ${FT.ink2}` }}>
                <div style={{ padding: '8px 6px', fontFamily: FT.ff.mono, fontSize: 10, color: FT.ink6, textAlign: 'right' }}>{h}:00</div>
                {days.map((d,di) => {
                  const key = `${d}-${h}`;
                  const slot = slots[key];
                  return (
                    <div key={di} style={{
                      minHeight: 36, borderLeft: `1px solid ${FT.ink2}`, padding: 3,
                    }}>
                      {slot && (
                        <div style={{
                          height: '100%', padding: '5px 8px', borderRadius: 5,
                          background: slot.c === accent ? `${slot.c}30` : `${slot.c}22`,
                          borderLeft: `2px solid ${slot.c}`,
                          fontFamily: FT.ff.display, fontSize: 11, fontWeight: 500,
                          color: FT.bone0, lineHeight: 1.1,
                          display: 'flex', alignItems: 'center',
                        }}>{slot.n}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PTAgenda });
