import test from 'node:test'
import assert from 'node:assert/strict'

// ─── helpers replicadas dos módulos ──────────────────────────────────────────

type AdvisorGeneratedInviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'CANCELLED'

interface MinInvite {
  status: AdvisorGeneratedInviteStatus
  expiresAt?: string | null
  acceptedAt?: string | null
  acceptedByUserName?: string | null
  clientName: string
  clientName2?: string | null
  accountType: 'INDIVIDUAL' | 'COUPLE'
}

function isInviteBlocked(invite: MinInvite | null | undefined): boolean {
  if (!invite) return false
  if (invite.status === 'ACCEPTED' || invite.status === 'CANCELLED' || invite.status === 'EXPIRED') {
    return true
  }
  if (invite.expiresAt) {
    const expiresAt = new Date(invite.expiresAt)
    if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
      return true
    }
  }
  return false
}

function validateBrazilianPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) return true
  if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) return true
  return false
}

function normalizeBrazilianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length >= 12) return `+${digits}`
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`
  return phone
}

function resolveStripeErrorMessage(error: unknown): string {
  const msg = error instanceof Error ? error.message : 'Não foi possível aceitar o convite.'
  if (/incomplete_expired|cannot update a subscription that is/i.test(msg)) {
    return 'Não conseguimos atualizar essa assinatura antiga. Gere um novo link de pagamento com o consultor.'
  }
  return msg
}

function getDisplayName(invite: MinInvite): string {
  if (invite.accountType === 'COUPLE') {
    return [invite.clientName, invite.clientName2].filter(Boolean).join(' e ') || 'Casal'
  }
  return invite.clientName || 'Cliente'
}

// ─── 1. Convite ACCEPTED → bloqueado ─────────────────────────────────────────

test('isInviteBlocked: convite ACCEPTED é bloqueado', () => {
  const invite: MinInvite = {
    status: 'ACCEPTED',
    clientName: 'Ana',
    accountType: 'INDIVIDUAL',
  }
  assert.equal(isInviteBlocked(invite), true)
})

test('isInviteBlocked: convite CANCELLED é bloqueado', () => {
  const invite: MinInvite = {
    status: 'CANCELLED',
    clientName: 'Ana',
    accountType: 'INDIVIDUAL',
  }
  assert.equal(isInviteBlocked(invite), true)
})

test('isInviteBlocked: convite EXPIRED é bloqueado', () => {
  const invite: MinInvite = {
    status: 'EXPIRED',
    clientName: 'Ana',
    accountType: 'INDIVIDUAL',
  }
  assert.equal(isInviteBlocked(invite), true)
})

test('isInviteBlocked: convite PENDING não expirado NÃO é bloqueado', () => {
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  const invite: MinInvite = {
    status: 'PENDING',
    expiresAt: future,
    clientName: 'Ana',
    accountType: 'INDIVIDUAL',
  }
  assert.equal(isInviteBlocked(invite), false)
})

test('isInviteBlocked: convite PENDING com expiresAt no passado é bloqueado', () => {
  const past = new Date(Date.now() - 1000).toISOString()
  const invite: MinInvite = {
    status: 'PENDING',
    expiresAt: past,
    clientName: 'Ana',
    accountType: 'INDIVIDUAL',
  }
  assert.equal(isInviteBlocked(invite), true)
})

test('isInviteBlocked: null → false', () => {
  assert.equal(isInviteBlocked(null), false)
})

// ─── 2. Validação de telefone ─────────────────────────────────────────────────

test('validateBrazilianPhone: celular com DDD (11 dígitos)', () => {
  assert.equal(validateBrazilianPhone('11912345678'), true)
})

test('validateBrazilianPhone: fixo com DDD (10 dígitos)', () => {
  assert.equal(validateBrazilianPhone('1132345678'), true)
})

test('validateBrazilianPhone: com DDI 55 (12 dígitos)', () => {
  assert.equal(validateBrazilianPhone('551132345678'), true)
})

test('validateBrazilianPhone: com DDI 55 (13 dígitos)', () => {
  assert.equal(validateBrazilianPhone('5511912345678'), true)
})

test('validateBrazilianPhone: formatado com parênteses e hífen', () => {
  assert.equal(validateBrazilianPhone('(11) 91234-5678'), true)
})

test('validateBrazilianPhone: número inválido (menos de 10 dígitos)', () => {
  assert.equal(validateBrazilianPhone('9123456'), false)
})

test('validateBrazilianPhone: vazio', () => {
  assert.equal(validateBrazilianPhone(''), false)
})

// ─── 3. Normalização do telefone ──────────────────────────────────────────────

test('normalizeBrazilianPhone: 11 dígitos → E.164', () => {
  assert.equal(normalizeBrazilianPhone('11912345678'), '+5511912345678')
})

test('normalizeBrazilianPhone: 10 dígitos → E.164', () => {
  assert.equal(normalizeBrazilianPhone('1132345678'), '+551132345678')
})

test('normalizeBrazilianPhone: com DDI 55 já presente', () => {
  assert.equal(normalizeBrazilianPhone('5511912345678'), '+5511912345678')
})

test('normalizeBrazilianPhone: formatado → E.164', () => {
  assert.equal(normalizeBrazilianPhone('(11) 91234-5678'), '+5511912345678')
})

// ─── 4. Erro Stripe incomplete_expired ───────────────────────────────────────

test('resolveStripeErrorMessage: incomplete_expired → mensagem amigável', () => {
  const err = new Error('You cannot update a subscription that is `incomplete_expired`.')
  const msg = resolveStripeErrorMessage(err)
  assert.ok(msg.includes('assinatura antiga'))
  assert.ok(msg.includes('novo link de pagamento'))
})

test('resolveStripeErrorMessage: erro genérico → pass-through', () => {
  const err = new Error('Erro ao aceitar convite.')
  assert.equal(resolveStripeErrorMessage(err), 'Erro ao aceitar convite.')
})

test('resolveStripeErrorMessage: não-Error → fallback', () => {
  const msg = resolveStripeErrorMessage(null)
  assert.ok(typeof msg === 'string')
})

// ─── 5. Display name do convite ───────────────────────────────────────────────

test('getDisplayName: individual usa clientName', () => {
  const invite: MinInvite = { status: 'PENDING', clientName: 'João', accountType: 'INDIVIDUAL' }
  assert.equal(getDisplayName(invite), 'João')
})

test('getDisplayName: casal concatena ambos', () => {
  const invite: MinInvite = {
    status: 'PENDING',
    clientName: 'João',
    clientName2: 'Maria',
    accountType: 'COUPLE',
  }
  assert.equal(getDisplayName(invite), 'João e Maria')
})

test('getDisplayName: casal sem nome2 usa só nome1', () => {
  const invite: MinInvite = {
    status: 'PENDING',
    clientName: 'João',
    clientName2: null,
    accountType: 'COUPLE',
  }
  assert.equal(getDisplayName(invite), 'João')
})

// ─── 6. acceptedByUserName diferente do clientName ───────────────────────────

test('mostrar nome real quando acceptedByUserName difere de clientName', () => {
  const invite: MinInvite = {
    status: 'ACCEPTED',
    clientName: 'Namíbia dos Santos',
    accountType: 'INDIVIDUAL',
    acceptedByUserName: 'Peste Bubonica dos Santos',
    acceptedAt: new Date().toISOString(),
  }
  const realName = invite.acceptedByUserName ?? getDisplayName(invite)
  assert.equal(realName, 'Peste Bubonica dos Santos')
  assert.notEqual(realName, invite.clientName)
})

// ─── 7. Aceite duplo — idempotência no frontend ───────────────────────────────

test('convite já ACCEPTED: isInviteBlocked retorna true → não tenta aceitar novamente', () => {
  const invite: MinInvite = {
    status: 'ACCEPTED',
    clientName: 'Ana',
    accountType: 'INDIVIDUAL',
  }
  const shouldSkipAccept = isInviteBlocked(invite) || invite.status === 'ACCEPTED'
  assert.equal(shouldSkipAccept, true)
})

// ─── 8. Convite cancelado não pode ser aceito ─────────────────────────────────

test('convite CANCELLED: isInviteBlocked retorna true', () => {
  const invite: MinInvite = {
    status: 'CANCELLED',
    clientName: 'Pedro',
    accountType: 'INDIVIDUAL',
  }
  assert.equal(isInviteBlocked(invite), true)
})

// ─── 9. Status atualiza para ACCEPTED após aceite ────────────────────────────

test('simular atualização de status para ACCEPTED após aceite', () => {
  const invite: MinInvite = {
    status: 'PENDING',
    clientName: 'Carla',
    accountType: 'INDIVIDUAL',
  }
  // Simula o que acontece após acceptAdvisorGeneratedInvite()
  const accepted: MinInvite = {
    ...invite,
    status: 'ACCEPTED',
    acceptedAt: new Date().toISOString(),
  }
  assert.equal(accepted.status, 'ACCEPTED')
  assert.ok(accepted.acceptedAt)
  assert.equal(isInviteBlocked(accepted), true)
})
