// Phone frame — minimal Android-ish bezel, custom for FitTrainer dark UI
// Simpler than the starter; full-bleed because our dark UI owns the chrome.

function Phone({ children, w = 360, h = 720, dark = true, bg }) {
  const fill = bg || (dark ? FT.ink0 : FT.bone0);
  return (
    <div style={{
      width: w, height: h, borderRadius: 36,
      padding: 4, background: '#0a0a0a',
      boxShadow: '0 30px 80px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.06)',
      position: 'relative',
    }}>
      <div style={{
        width: '100%', height: '100%', borderRadius: 32, overflow: 'hidden',
        background: fill, position: 'relative',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Status bar */}
        <div style={{
          height: 28, padding: '0 18px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexShrink: 0, position: 'relative',
          fontFamily: FT.ff.display, fontSize: 12, fontWeight: 600,
          color: dark ? FT.bone0 : FT.ink0,
        }}>
          <span style={{ letterSpacing: -0.2 }}>9:41</span>
          <div style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 8,
            width: 84, height: 18, background: '#000', borderRadius: 10,
          }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 9 }}>
              {[3,5,7,9].map((h,i) => <div key={i} style={{width: 3, height: h, borderRadius: 1, background: dark ? FT.bone0 : FT.ink0}}/>)}
            </div>
            <div style={{width: 18, height: 9, border: `1px solid ${dark?FT.bone0:FT.ink0}`, borderRadius: 2, padding: 1}}>
              <div style={{width: '70%', height: '100%', background: dark?FT.bone0:FT.ink0, borderRadius: 1}}/>
            </div>
          </div>
        </div>
        {/* Content */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          {children}
        </div>
        {/* Home indicator */}
        <div style={{
          height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <div style={{ width: 110, height: 4, borderRadius: 2, background: dark?'rgba(255,255,255,0.4)':'rgba(0,0,0,0.35)' }}/>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Phone });
