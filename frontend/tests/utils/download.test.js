import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadText } from '@/utils/download';

const original = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
let blob;

beforeEach(() => {
  URL.createObjectURL = vi.fn((b) => {
    blob = b;
    return 'blob:x';
  });
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  URL.createObjectURL = original.create;
  URL.revokeObjectURL = original.revoke;
  vi.restoreAllMocks();
});

describe('downloadText', () => {
  it('arma un Blob del tipo dado (con el BOM), hace clic en un <a download> y revoca la URL', async () => {
    const clicked = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() {
      clicked.push({ href: this.getAttribute('href'), download: this.download, inDom: document.body.contains(this) });
    });

    downloadText('﻿a;b\r\n', 'x.csv', 'text/csv');

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/csv');
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(clicked).toEqual([{ href: 'blob:x', download: 'x.csv', inDom: true }]);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:x');
    expect(document.querySelector('a[download]')).toBeNull();
  });

  it('por defecto el tipo es text/plain', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    downloadText('hola', 'x.txt');
    expect(blob.type).toBe('text/plain');
  });
});
