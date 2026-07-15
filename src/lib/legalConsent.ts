import legalDocs from '@/app/api/legal/docs.json'

export type ConsentDocumentType = 'TERMS' | 'PRIVACY' | 'COOKIES'

export type ConsentAcceptance = {
  documentType: ConsentDocumentType
  version: string
}

// Mapeia as chaves do docs.json (fonte da verdade do conteúdo) para os tipos
// que o backend registra. O backend valida a versão enviada.
const DOC_KEY_TO_TYPE: Record<string, ConsentDocumentType> = {
  termos: 'TERMS',
  privacidade: 'PRIVACY',
  cookies: 'COOKIES',
}

function versionOf(key: keyof typeof legalDocs): string {
  return (legalDocs[key] as { version?: string })?.version ?? '1.0.0'
}

/**
 * Consentimentos aceitos no cadastro: termos de uso + política de privacidade,
 * com a versão vigente exibida ao usuário (lida do docs.json).
 */
export function buildSignupConsents(): ConsentAcceptance[] {
  return [
    { documentType: DOC_KEY_TO_TYPE.termos, version: versionOf('termos') },
    { documentType: DOC_KEY_TO_TYPE.privacidade, version: versionOf('privacidade') },
  ]
}
