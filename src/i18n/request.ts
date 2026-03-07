import { getRequestConfig } from 'next-intl/server'
import { APP_MESSAGES, resolveAppLocale } from './messages'

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = resolveAppLocale(await requestLocale)

  return {
    locale,
    messages: APP_MESSAGES[locale],
  }
})
