import test from 'node:test'
import assert from 'node:assert/strict'
import { renderToStaticMarkup } from 'react-dom/server'
import { NextIntlClientProvider } from 'next-intl'

import { TransactionTable } from './transactionTable'
import { APP_MESSAGES } from '@/i18n/messages'

const tx = {
  id: 'tx-1',
  userId: 'user-1',
  value: 120,
  description: 'Mercado',
  categoryId: 'cat-1',
  date: '2026-03-01T10:00:00.000Z',
  type: 'EXPENSE',
  origin: 'DASHBOARD',
  paymentType: 'PIX',
  category: {
    id: 'cat-1',
    name: 'Casa',
    icon: 'CircleEllipsis',
    color: '#000000',
    type: 'EXPENSE',
  },
} as any

function renderTable(canWrite: boolean) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="pt-BR" messages={APP_MESSAGES['pt-BR']}>
      <TransactionTable
        transactions={[tx]}
        selectedIds={new Set<string>()}
        selectAll={false}
        onToggleSelectAll={() => undefined}
        onToggleSelectRow={() => undefined}
        onEdit={() => undefined}
        onDelete={() => undefined}
        canWrite={canWrite}
        sortField={null}
        sortDirection="asc"
        onSortChange={() => undefined}
      />
    </NextIntlClientProvider>
  )
}

test('READ_ONLY: hides edit and delete actions and shows read-only label', () => {
  const html = renderTable(false)
  assert.equal(html.includes('aria-label=\"Editar transação\"'), false)
  assert.equal(html.includes('aria-label=\"Excluir transação\"'), false)
  assert.equal(html.includes('Somente leitura'), true)
})

test('READ_WRITE: keeps edit and delete actions visible', () => {
  const html = renderTable(true)
  assert.equal(html.includes('aria-label=\"Editar transação\"'), true)
  assert.equal(html.includes('aria-label=\"Excluir transação\"'), true)
})
