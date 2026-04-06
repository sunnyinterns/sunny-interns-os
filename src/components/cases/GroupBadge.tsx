'use client'

interface GroupBadgeProps {
  groupId?: string
  groupName?: string
  color?: string
}

export function GroupBadge({ groupName, color }: GroupBadgeProps) {
  if (!groupName) return null

  const bg = color ?? '#c8a96e'

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: bg }}
    >
      {groupName}
    </span>
  )
}
