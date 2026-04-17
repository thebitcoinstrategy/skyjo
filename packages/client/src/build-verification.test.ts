/**
 * Build verification tests.
 *
 * These run against the production build output (packages/client/dist/)
 * to catch deployment-breaking issues like missing CSS, broken asset
 * references, or misconfigured plugins BEFORE pushing to production.
 *
 * Run: npm run test:build -w packages/client
 * (requires a build first: npm run build -w packages/client)
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

const DIST = resolve(__dirname, '../dist');

function readDistFile(relativePath: string): string {
  return readFileSync(join(DIST, relativePath), 'utf-8');
}

function findAsset(pattern: RegExp): string | null {
  const assetsDir = join(DIST, 'assets');
  if (!existsSync(assetsDir)) return null;
  const files = readdirSync(assetsDir);
  const match = files.find((f) => pattern.test(f));
  return match ? readFileSync(join(assetsDir, match), 'utf-8') : null;
}

describe('Build output exists', () => {
  it('dist directory exists', () => {
    expect(existsSync(DIST)).toBe(true);
  });

  it('index.html exists', () => {
    expect(existsSync(join(DIST, 'index.html'))).toBe(true);
  });

  it('assets directory contains JS bundle', () => {
    expect(findAsset(/\.js$/)).not.toBeNull();
  });

  it('assets directory contains CSS bundle', () => {
    expect(findAsset(/\.css$/)).not.toBeNull();
  });
});

describe('index.html integrity', () => {
  let html: string;

  beforeAll(() => {
    html = readDistFile('index.html');
  });

  it('references a CSS file', () => {
    expect(html).toMatch(/href="\/assets\/.*\.css"/);
  });

  it('references a JS file', () => {
    expect(html).toMatch(/src="\/assets\/.*\.js"/);
  });

  it('has the #root mount point', () => {
    expect(html).toContain('id="root"');
  });

  it('all referenced assets exist on disk', () => {
    const assetRefs = [...html.matchAll(/(?:href|src)="(\/assets\/[^"]+)"/g)];
    expect(assetRefs.length).toBeGreaterThan(0);
    for (const [, assetPath] of assetRefs) {
      const fullPath = join(DIST, assetPath);
      expect(existsSync(fullPath), `Missing asset: ${assetPath}`).toBe(true);
    }
  });
});

describe('CSS bundle contains Tailwind utilities', () => {
  let css: string;

  beforeAll(() => {
    css = findAsset(/\.css$/) ?? '';
  });

  it('CSS file is non-empty', () => {
    expect(css.length).toBeGreaterThan(0);
  });

  it('CSS is larger than just the theme/reset (utilities compiled)', () => {
    // The theme + reset alone is ~22KB. With utilities it should be 30KB+.
    expect(css.length).toBeGreaterThan(25000);
  });

  it('does NOT contain unprocessed @tailwind directives', () => {
    expect(css).not.toContain('@tailwind utilities');
    expect(css).not.toContain('@tailwind base');
    expect(css).not.toContain('@tailwind components');
  });

  it('contains common layout utilities (flex, grid)', () => {
    expect(css).toMatch(/flex-col|flex-row/);
    expect(css).toMatch(/items-center/);
  });

  it('contains custom theme colors (felt, gold)', () => {
    expect(css).toMatch(/--color-felt/);
    expect(css).toMatch(/--color-gold/);
  });

  it('contains border-radius utilities (rounded-xl etc.)', () => {
    expect(css).toMatch(/rounded-xl|rounded-lg/);
  });

  it('contains gradient utilities', () => {
    expect(css).toMatch(/bg-gradient|from-|to-/);
  });
});

describe('JS bundle sanity', () => {
  let js: string;

  beforeAll(() => {
    js = findAsset(/\.js$/) ?? '';
  });

  it('JS file is non-empty', () => {
    expect(js.length).toBeGreaterThan(0);
  });

  it('contains React runtime', () => {
    expect(js).toMatch(/createElement|jsx/);
  });

  it('contains Socket.IO client', () => {
    expect(js).toMatch(/socket\.io|engine\.io/i);
  });
});

describe('PWA assets', () => {
  it('manifest.webmanifest exists', () => {
    expect(existsSync(join(DIST, 'manifest.webmanifest'))).toBe(true);
  });

  it('service worker exists', () => {
    expect(existsSync(join(DIST, 'sw.js'))).toBe(true);
  });

  it('favicon exists', () => {
    expect(existsSync(join(DIST, 'favicon.ico'))).toBe(true);
  });

  it('PWA icons exist', () => {
    expect(existsSync(join(DIST, 'icon-192.png'))).toBe(true);
    expect(existsSync(join(DIST, 'icon-512.png'))).toBe(true);
  });

  it('manifest references valid icon paths', () => {
    const manifest = JSON.parse(readDistFile('manifest.webmanifest'));
    expect(manifest.icons).toBeDefined();
    expect(manifest.icons.length).toBeGreaterThan(0);
    for (const icon of manifest.icons) {
      const iconPath = icon.src.startsWith('/') ? icon.src.slice(1) : icon.src;
      expect(existsSync(join(DIST, iconPath)), `Missing icon: ${icon.src}`).toBe(true);
    }
  });
});
