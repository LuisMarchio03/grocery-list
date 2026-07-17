import { test as setup, expect } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'fs'

const AUTH_DIR = 'e2e/.auth'

setup('autentica e cria dados de teste', async ({ request }) => {
  const login = await request.post('/api/auth/login', {
    data: { username: 'LuisMarchio03', password: 'LuisMarchio03' },
  })
  expect(login.ok(), 'login do seed deve funcionar').toBeTruthy()

  const list = await request.post('/api/lists', {
    data: { name: 'Compras da semana no supermercado' },
  })
  expect(list.ok(), 'criação de lista deve funcionar').toBeTruthy()
  const { id } = await list.json()

  // Nomes longos de propósito: é isso que estoura o layout no XG.
  const items = [
    { name: 'Arroz parboilizado tipo 1 pacote 5kg', quantity: '2un' },
    { name: 'Detergente líquido neutro concentrado', quantity: '3' },
    { name: 'Café torrado e moído extraforte 500g', quantity: '1' },
  ]
  for (const item of items) {
    const res = await request.post(`/api/lists/${id}/items`, { data: item })
    expect(res.ok(), `criação do item "${item.name}" deve funcionar`).toBeTruthy()
  }

  mkdirSync(AUTH_DIR, { recursive: true })
  writeFileSync(`${AUTH_DIR}/list-id.txt`, id)
  await request.storageState({ path: `${AUTH_DIR}/state.json` })
})
