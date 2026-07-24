import { useState } from 'react'
import { Loader2, Mail, User } from 'lucide-react'
import { useTranslations } from 'next-intl'
import toast from 'react-hot-toast'
import type { CountryCode } from 'libphonenumber-js'

import { useUsers } from '@/hooks/query/useUsers'
import { useUserSession } from '@/stores/useUserSession'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import PhoneDdiField from '@/components/cadastro/PhoneDdiField'
import { splitPhone, toE164 } from '@/lib/phoneCountries'

const UserInfoCard = () => {
  const t = useTranslations('profile.userInfoCard')
  const { user, setUser } = useUserSession()
  const { updateMutation } = useUsers()

  const initialPhone = splitPhone(user?.userData.user.phone)
  const [formData, setFormData] = useState({
    name: user?.userData.user.name || '',
    email: user?.userData.user.email || '',
    whatsapp: initialPhone.national,
  })
  const [phoneCountry, setPhoneCountry] = useState<CountryCode>(initialPhone.country)
  const [loading, setLoading] = useState(false)

  if (!user) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user?.userData.user.id) {
      toast.error(t('errors.userNotIdentified'))
      return
    }

    try {
      setLoading(true)
      const phoneE164 = toE164(formData.whatsapp, phoneCountry) || formData.whatsapp
      await updateMutation.mutateAsync({
        id: user.userData.user.id,
        data: {
          name: formData.name,
          email: formData.email,
          phone: phoneE164,
        },
      })

      setUser({
        ...user,
        userData: {
          user: {
            ...user.userData.user,
            name: formData.name,
            email: formData.email,
            phone: phoneE164,
          },
          signature: {
            id: user.userData.signature.id,
            status: user.userData.signature.status,
            endDate: user.userData.signature.endDate,
            nextDueDate: user.userData.signature.nextDueDate,
            plan: user.userData.signature.plan,
            active: user.userData.signature.active,
            asaasCustomerId: user.userData.signature.asaasCustomerId,
            asaasSubscriptionId: user.userData.signature.asaasSubscriptionId,
            billingType: user.userData.signature.billingType,
            cycle: user.userData.signature.cycle,
            value: user.userData.signature.value,
            description: user.userData.signature.description,
            externalReference: user.userData.signature.externalReference,
            createdAt: user.userData.signature.createdAt,
            updatedAt: user.userData.signature.updatedAt,
            planId: user.userData.signature.planId,
            startDate: user.userData.signature.startDate,
            userId: user.userData.signature.userId,
            user: user.userData.signature.user,
          },
          hasActiveSignature: user.userData.hasActiveSignature,
        },
      })

      toast.success(t('toasts.updatedTitle'))
    } catch (error) {
      console.error(error)
      toast.error(t('toasts.updateErrorTitle'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm animate-slide-up">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 rounded-full">
          <User className="h-5 w-5 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">{t('title')}</h2>
      </div>

      <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border/15">
        <div>
          <p className="font-medium text-foreground">{formData.name}</p>
          <p className="text-sm text-muted-foreground">{formData.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">{t('fields.fullName')}</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t('placeholders.fullName')}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t('fields.email')}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              className="pl-10"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={t('placeholders.email')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp">{t('fields.whatsapp')}</Label>
          <PhoneDdiField
            country={phoneCountry}
            phone={formData.whatsapp}
            onCountryChange={(iso) => { setPhoneCountry(iso); setFormData({ ...formData, whatsapp: '' }) }}
            onPhoneChange={(value) => setFormData({ ...formData, whatsapp: value })}
            placeholder={t('placeholders.whatsapp')}
          />
        </div>

        <Button type="submit" className="w-full" size="lg" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? t('actions.saving') : t('actions.save')}
        </Button>
      </form>
    </div>
  )
}

export default UserInfoCard
