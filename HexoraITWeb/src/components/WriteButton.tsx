import { tr, useLocale } from '../i18n'
import type { ComponentProps } from 'react'
import { useApp } from '../context/useApp'

type Props = ComponentProps<'button'> & { resource: string; resourceId?: string }

export default function WriteButton({ resource, resourceId, disabled, title, ...props }: Props) {
  useLocale()
  const { canWrite } = useApp()
  const allowed = canWrite(resource, resourceId)
  return <button {...props} disabled={disabled || !allowed}
    title={allowed ? title : tr("Your organization role does not permit changes to this resource.")} />
}
