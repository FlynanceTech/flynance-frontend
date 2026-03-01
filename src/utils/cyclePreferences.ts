import { z } from 'zod'

export const CYCLE_MODES = ['fixed_payday', 'autonomous'] as const
export type CycleMode = (typeof CYCLE_MODES)[number]

export const AUTONOMOUS_CYCLE_KINDS = ['calendar_month', 'cutoff_day'] as const
export type AutonomousCycleKind = (typeof AUTONOMOUS_CYCLE_KINDS)[number]

export type UserCyclePreferences = {
  cycleMode: CycleMode
  paydayDay: number | null
  autonomousCycleKind: AutonomousCycleKind | null
  cutoffDay: number | null
  timezone: string
  updatedAt: string
}

const timezoneSchema = z.string().trim().min(1)
const daySchema = z.number().int().min(1).max(31)

const inputSchema = z
  .object({
    cycleMode: z.enum(CYCLE_MODES),
    paydayDay: daySchema.optional(),
    autonomousCycleKind: z.enum(AUTONOMOUS_CYCLE_KINDS).optional(),
    cutoffDay: daySchema.optional(),
    timezone: timezoneSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.cycleMode === 'fixed_payday' && value.paydayDay == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['paydayDay'],
        message: 'paydayDay e obrigatorio quando cycleMode=fixed_payday.',
      })
    }

    const autonomousKind = value.autonomousCycleKind ?? 'calendar_month'
    if (value.cycleMode === 'autonomous' && autonomousKind === 'cutoff_day' && value.cutoffDay == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cutoffDay'],
        message: 'cutoffDay e obrigatorio quando autonomousCycleKind=cutoff_day.',
      })
    }
  })

const storedSchema = z.object({
  cycleMode: z.enum(CYCLE_MODES),
  paydayDay: daySchema.nullable(),
  autonomousCycleKind: z.enum(AUTONOMOUS_CYCLE_KINDS).nullable(),
  cutoffDay: daySchema.nullable(),
  timezone: timezoneSchema,
  updatedAt: z.string(),
})

function nowISO() {
  return new Date().toISOString()
}

export function defaultUserCyclePreferences(): UserCyclePreferences {
  return {
    cycleMode: 'autonomous',
    paydayDay: null,
    autonomousCycleKind: 'calendar_month',
    cutoffDay: null,
    timezone: 'America/Sao_Paulo',
    updatedAt: nowISO(),
  }
}

export type UpdateUserCyclePreferencesInput = z.infer<typeof inputSchema>

export function buildUserCyclePreferences(
  input: UpdateUserCyclePreferencesInput
): UserCyclePreferences {
  const parsed = inputSchema.parse(input)
  const timezone = parsed.timezone?.trim() || 'America/Sao_Paulo'

  if (parsed.cycleMode === 'fixed_payday') {
    return {
      cycleMode: 'fixed_payday',
      paydayDay: parsed.paydayDay ?? null,
      autonomousCycleKind: null,
      cutoffDay: null,
      timezone,
      updatedAt: nowISO(),
    }
  }

  const autonomousKind = parsed.autonomousCycleKind ?? 'calendar_month'
  return {
    cycleMode: 'autonomous',
    paydayDay: null,
    autonomousCycleKind: autonomousKind,
    cutoffDay: autonomousKind === 'cutoff_day' ? (parsed.cutoffDay ?? null) : null,
    timezone,
    updatedAt: nowISO(),
  }
}

export function parseStoredUserCyclePreferences(raw?: string | null): UserCyclePreferences {
  if (!raw) return defaultUserCyclePreferences()

  try {
    const parsedJson = JSON.parse(raw)
    const parsed = storedSchema.safeParse(parsedJson)
    if (!parsed.success) return defaultUserCyclePreferences()

    return {
      ...parsed.data,
      timezone: parsed.data.timezone.trim() || 'America/Sao_Paulo',
      updatedAt: parsed.data.updatedAt || nowISO(),
    }
  } catch {
    return defaultUserCyclePreferences()
  }
}
