//

type Member = { id: string; name: string; avatar?: string }

interface Props {
  members: Member[]
  size?: 'sm' | 'md' | 'lg'
  maxVisible?: number
}

const sizeMap = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
}

export default function AnimatedAvatarGroup({ members, size = 'md', maxVisible = 5 }: Props) {
  const visible = members.slice(0, maxVisible)
  const remaining = members.length - visible.length

  return (
    <div className="flex items-center group">
      <div className="flex -space-x-3">
        {visible.map((m, idx) => (
          <div
            key={m.id}
            title={m.name}
            className={`relative ${idx === 0 ? '' : ''}`}
          >
            <div
              className={`inline-flex items-center justify-center rounded-full ring-2 ring-white dark:ring-gray-800 bg-gradient-to-br from-indigo-500 to-blue-600 text-white ${sizeMap[size]} transition-all duration-200 ease-out transform hover:z-10 hover:scale-110 hover:-translate-y-0.5`}
              style={{ boxShadow: '0 6px 14px rgba(37,99,235,0.25)' }}
            >
              <span>{(m.avatar || m.name).split(' ').map(p => p[0]).join('').slice(0,2).toUpperCase()}</span>
            </div>
          </div>
        ))}
        {remaining > 0 && (
          <div className="relative">
            <div
              className={`inline-flex items-center justify-center rounded-full ring-2 ring-white dark:ring-gray-800 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 ${sizeMap[size]} transition-all duration-200 ease-out transform hover:z-10 hover:scale-110 hover:-translate-y-0.5`}
            >
              +{remaining}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
