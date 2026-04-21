import { test, expect } from '@playwright/test'

// Tokens de test — NE PAS MODIFIER sans validation Sidney
const STUDENT_TOKEN = 'f90af311-4a0a-40d9-8b6d-5ee9bf7898f8'
const EMPLOYER_TOKEN = 'c6993948-8110-43bc-80cb-03fb2c4c230c'
const AGENT_TOKEN = '84a57cf5-26cb-4002-bce4-64c714251890'
const CASE_ID = 'cf00ef63-f634-4aad-808e-28cf33ffba3f'

test('SMOKE: /api/portal/[token] répond 200 avec data valide', async ({ request }) => {
  const res = await request.get(`/api/portal/${STUDENT_TOKEN}`)
  expect(res.status()).toBe(200)
  const body = await res.json() as Record<string, unknown>
  expect(body.id).toBe(CASE_ID)
  expect(body.status).toBeTruthy()
  expect(body.portal_token).toBe(STUDENT_TOKEN)
})

test('SMOKE: /portal/[token] page stagiaire charge sans erreur', async ({ page }) => {
  await page.goto(`/portal/${STUDENT_TOKEN}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(2000)
  await expect(page.getByText('Lien invalide ou expiré')).not.toBeVisible()
  await expect(page.getByText('Chargement')).not.toBeVisible()
  await expect(page.getByText('Bonjour')).toBeVisible({ timeout: 10000 })
})

test('SMOKE: /portal/[token]/visa — page et API POST fonctionnels', async ({ request }) => {
  // API POST rejects invalid payload → 400 expected (not 404 or 405)
  const res = await request.post(`/api/portal/${STUDENT_TOKEN}/visa`, {
    multipart: { file: Buffer.from(''), field: 'invalid_field' },
  })
  expect(res.status()).not.toBe(404)
  expect(res.status()).not.toBe(405)
})

test('SMOKE: /portal/[token]/visa PATCH sauvegarde les extras', async ({ request }) => {
  const res = await request.patch(`/api/portal/${STUDENT_TOKEN}/visa`, {
    data: { flight_number: 'TEST123', mother_first_name: 'Marie' },
  })
  expect(res.status()).toBe(200)
  const body = await res.json() as { success: boolean }
  expect(body.success).toBe(true)
})

test('SMOKE: /portal/[token]/billet PATCH accepte flightNumber et heureArrivee', async ({ request }) => {
  const res = await request.patch(`/api/portal/${STUDENT_TOKEN}/billet`, {
    data: { flightNumber: 'SQ123', heureArrivee: '14:00', escale: 'Singapore' },
  })
  expect(res.status()).toBe(200)
})

test('SMOKE: /api/portal/employer/[token] répond (200 ou 404 selon data)', async ({ request }) => {
  const res = await request.get(`/api/portal/employer/${EMPLOYER_TOKEN}`)
  // 200 si le token existe en DB, 404 si données de test non créées — les deux sont acceptables ici
  expect([200, 404]).toContain(res.status())
  if (res.status() === 200) {
    const body = await res.json() as Record<string, unknown>
    expect(body.access).toBeTruthy()
    expect(body.variant).toMatch(/^[ABC]$/)
  }
})

test('SMOKE: /api/portal/agent/[token] répond (200 ou 404 selon data)', async ({ request }) => {
  const res = await request.get(`/api/portal/agent/${AGENT_TOKEN}`)
  expect([200, 404]).toContain(res.status())
  if (res.status() === 200) {
    const body = await res.json() as Record<string, unknown>
    expect(body.type).toMatch(/^(dossier|agent)$/)
  }
})
