import { countLines, findOversized, MAX_LINES } from '../../../../scripts/lib/file-length.js';

describe('file-length — countLines', () => {
  it('cuenta líneas físicas, blancos y comentarios incluidos', () => {
    expect(countLines('a\n\n// c\nb\n')).toBe(4);
  });
  it('cuenta la última línea aunque no termine en salto', () => {
    expect(countLines('a\nb')).toBe(2);
  });
  it('un archivo vacío tiene 0 líneas', () => {
    expect(countLines('')).toBe(0);
  });
  it('acepta fin de línea CRLF', () => {
    expect(countLines('a\r\nb\r\n')).toBe(2);
  });
});

describe('file-length — findOversized', () => {
  const lines = (n) => 'x\n'.repeat(n);
  it('el límite es 200', () => expect(MAX_LINES).toBe(200));
  it('200 líneas pasa, 201 no', () => {
    const result = findOversized([
      { path: 'ok.js', text: lines(200) },
      { path: 'largo.sql', text: lines(201) },
    ]);
    expect(result).toEqual([{ path: 'largo.sql', lines: 201 }]);
  });
  it('ordena de más largo a más corto', () => {
    const result = findOversized([
      { path: 'a.js', text: lines(250) },
      { path: 'b.js', text: lines(300) },
    ]);
    expect(result.map((r) => r.path)).toEqual(['b.js', 'a.js']);
  });
});
