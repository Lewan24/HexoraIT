import type { ComponentProps } from 'react'
import { useApp } from '../context/useApp'

type Props = ComponentProps<'button'> & { resource: string; resourceId?: string }

export default function WriteButton({ resource, resourceId, disabled, title, ...props }: Props) {
  const { canWrite } = useApp()
  const allowed = canWrite(resource, resourceId)
  return <button {...props} disabled={disabled || !allowed}
    title={allowed ? title : 'Your organization role does not permit changes to this resource.'} />
}
