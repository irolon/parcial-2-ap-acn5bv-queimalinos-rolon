import { describe, expect, it, vi } from 'vitest'

const loadSite = async () => {
  vi.resetModules()
  return import('@/data/shared/site')
}

describe('site: URLs de la web de la app', () => {
  it('sin .env apuntan a localhost:5173', async () => {
    vi.stubEnv('VITE_APP_SIGNUP_URL', '')
    vi.stubEnv('VITE_APP_LOGIN_URL', '')
    const site = await loadSite()
    expect(site.APP_SIGNUP_URL).toBe('http://localhost:5173/registro')
    expect(site.APP_LOGIN_URL).toBe('http://localhost:5173/login')
  })

  it('se pueden cambiar con VITE_APP_SIGNUP_URL y VITE_APP_LOGIN_URL', async () => {
    vi.stubEnv('VITE_APP_SIGNUP_URL', 'http://192.168.0.10:5173/registro')
    vi.stubEnv('VITE_APP_LOGIN_URL', 'http://192.168.0.10:5173/login')
    const site = await loadSite()
    expect(site.APP_SIGNUP_URL).toBe('http://192.168.0.10:5173/registro')
    expect(site.APP_LOGIN_URL).toBe('http://192.168.0.10:5173/login')
  })
})
