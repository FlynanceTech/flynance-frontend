import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'

test('contas-fixas page usa range de competencia para a query de contas fixas', () => {
  const pagePath = path.resolve(process.cwd(), 'src/app/dashboard/contas-fixas/page.tsx')
  const source = fs.readFileSync(pagePath, 'utf8')

  assert.match(source, /resolveCompetenceRange\(selectedMonthKey,\s*preferencesQuery\.data\)/)
  assert.match(source, /periodStart:\s*competenceRange\.periodStart/)
  assert.match(source, /periodEnd:\s*competenceRange\.periodEnd/)
  assert.match(source, /useFixedAccounts\(competenceQueryParams\)/)
})

test('contas-fixas page usa dueDate do ciclo atual no mark-paid e fallback pela competencia', () => {
  const pagePath = path.resolve(process.cwd(), 'src/app/dashboard/contas-fixas/page.tsx')
  const source = fs.readFileSync(pagePath, 'utf8')

  assert.match(
    source,
    /resolveMarkPaidDueDate\(\s*payTarget,\s*selectedMonthKey,\s*competenceRange\.periodStart,\s*competenceRange\.periodEnd\s*\)/
  )
  assert.match(source, /bill\.payment\?\.periodKey\s*\|\|/)
  assert.match(source, /getDueDateForCompetenceRange\(periodStart,\s*periodEnd,\s*bill\.dueDay\)/)
})
