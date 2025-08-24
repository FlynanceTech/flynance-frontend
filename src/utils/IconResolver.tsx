// components/IconResolver.tsx
import React from 'react'
import { IconMap, IconName } from '@/utils/icon-map'

interface Props {
  name?: string | null
  size?: number
  className?: string
}

export function IconResolver({ name, size = 16, className }: Props) {
  if (!name) {
    return <div className={`w-4 h-4 bg-gray-300 rounded-full ${className ?? ''}`} />
  }

  const Icon = IconMap[name as IconName]
  if (!Icon) {
    return <div className={`w-4 h-4 bg-gray-300 rounded-full ${className ?? ''}`} />
  }

  return <Icon size={size} className={className} />
}
