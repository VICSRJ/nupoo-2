'use client'

import { createElement } from 'react'

type Props = {
  icon: string
  size?: number
  className?: string
  title?: string
}

export default function IconifyIcon({ icon, size = 16, className, title }: Props) {
  return createElement('iconify-icon', {
    icon,
    width: size,
    height: size,
    class: className,
    'aria-hidden': title ? undefined : true,
    title,
  })
}
