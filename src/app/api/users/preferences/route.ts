import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import {
  buildUserCyclePreferences,
  parseStoredUserCyclePreferences,
  type UpdateUserCyclePreferencesInput,
} from '@/utils/cyclePreferences'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const COOKIE_NAME = 'flynance_user_cycle_preferences'
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

export async function GET(req: NextRequest) {
  const raw = req.cookies.get(COOKIE_NAME)?.value
  const preferences = parseStoredUserCyclePreferences(raw)

  return NextResponse.json(
    { ok: true, preferences },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  )
}

export async function PUT(req: NextRequest) {
  try {
    const payload = (await req.json()) as UpdateUserCyclePreferencesInput
    const preferences = buildUserCyclePreferences(payload)

    const response = NextResponse.json(
      { ok: true, preferences },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    )

    response.cookies.set({
      name: COOKIE_NAME,
      value: JSON.stringify(preferences),
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: COOKIE_MAX_AGE_SECONDS,
    })

    return response
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          ok: false,
          message: 'Payload invalido para preferencias de ciclo.',
          issues: error.issues,
        },
        { status: 400 }
      )
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { ok: false, message: 'JSON invalido.' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { ok: false, message: 'Nao foi possivel salvar preferencias.' },
      { status: 500 }
    )
  }
}
