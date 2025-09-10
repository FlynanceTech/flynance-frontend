export const formatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format

export function getLocalISOString(date = new Date()) {
  console.log('chegou aqui')
  const offset = date.getTimezoneOffset()
  console.log('offset', offset)
  const localDate = new Date(date.getTime() - offset * 60 * 1000)
  return localDate.toISOString().slice(0, 16)
  }
  