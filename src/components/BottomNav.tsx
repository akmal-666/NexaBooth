import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Camera, Plus, MapPin, User } from 'lucide-react'
import { cn } from '../lib/utils'

const links = [
  { to: '/',       icon: Home,   label: 'Home'    },
  { to: '/gallery',icon: Camera, label: 'Gallery' },
  { to: '/frames', icon: MapPin, label: 'Frames'  },
  { to: '/admin',  icon: User,   label: 'Admin'   },
]

export default function BottomNav() {
  const navigate = useNavigate()

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 shadow-nav max-w-md mx-auto lg:max-w-none">
      <div className="relative flex items-center justify-around bg-white px-2 pt-3 pb-safe pb-4">
        {links.slice(0, 2).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors',
                isActive ? 'text-primary-900' : 'text-primary-400'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Centre + FAB */}
        <button
          onClick={() => navigate('/frames')}
          aria-label="Book a session"
          className="relative -top-5 flex h-14 w-14 items-center justify-center rounded-full
                     bg-primary-900 text-white shadow-lg transition active:scale-90 hover:bg-primary-700"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>

        {links.slice(2).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors',
                isActive ? 'text-primary-900' : 'text-primary-400'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[10px] font-medium">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
