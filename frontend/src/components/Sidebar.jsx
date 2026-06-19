import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  ClipboardList,
  Users,
  Bell,
  Compass
} from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/courses', label: 'Manage Courses', icon: BookOpen },
    { to: '/admin/courses/new', label: 'Create Course', icon: PlusCircle },
    { to: '/admin/assignments', label: 'Assignments', icon: ClipboardList },
    { to: '/admin/users', label: 'User Management', icon: Users },
    { to: '/admin/notifications', label: 'Notifications', icon: Bell }
  ];

  const associateLinks = [
    { to: '/my/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/my/catalog', label: 'Free Catalog', icon: Compass },
    { to: '/my/notifications', label: 'Notifications', icon: Bell }
  ];

  const links = isAdmin ? adminLinks : associateLinks;

  return (
    <aside id="app-sidebar" className="fixed top-16 left-0 w-64 h-[calc(100vh-64px)] bg-dark-950/40 backdrop-blur-xl border-r border-dark-800/60 p-4 z-30 transition-all duration-300 hidden md:block">
      <div className="flex flex-col gap-1.5 h-full">
        <div className="px-3 mb-4 mt-2">
          <span className="text-[10px] font-bold tracking-widest text-dark-500 uppercase">
            Navigation Menu
          </span>
        </div>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 group ${
                  isActive
                    ? 'text-primary-400 bg-primary-500/10 border-r-2 border-primary-500 font-semibold'
                    : 'text-dark-400 hover:text-dark-100 hover:bg-dark-900/60'
                }`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-105" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </div>
    </aside>
  );
}
