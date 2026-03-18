import { useState } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  HomeIcon,
  UsersIcon,
  BuildingOfficeIcon,
  CreditCardIcon,
  BanknotesIcon,
  BellIcon,
  ClipboardDocumentListIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  CalendarIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

const navLinks = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon, exact: true },
  { name: 'Users', href: '/admin/users', icon: UsersIcon },
  { name: 'Businesses', href: '/admin/businesses', icon: BuildingOfficeIcon },
  { name: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCardIcon },
  { name: 'Payments', href: '/admin/payments', icon: BanknotesIcon },
  { name: 'Notifications', href: '/admin/notifications', icon: BellIcon },
  { name: 'Audit Log', href: '/admin/audit-log', icon: ClipboardDocumentListIcon },
];

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (link) => {
    if (link.exact) return location.pathname === link.href;
    return location.pathname.startsWith(link.href);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center h-16 px-6 border-b border-gray-700">
        <CalendarIcon className="h-8 w-8 text-indigo-400" />
        <span className="ml-2 text-lg font-bold text-white">RemiDesk</span>
        <span className="ml-2 text-xs font-semibold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
          ADMIN
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navLinks.map((link) => {
          const active = isActive(link);
          return (
            <Link
              key={link.name}
              to={link.href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <link.icon className="h-5 w-5 mr-3 flex-shrink-0" />
              {link.name}
            </Link>
          );
        })}
      </nav>

      {/* User info + logout */}
      <div className="px-4 py-4 border-t border-gray-700">
        <div className="flex items-center mb-3">
          <ShieldCheckIcon className="h-8 w-8 text-indigo-400 flex-shrink-0" />
          <div className="ml-3 overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{user?.full_name}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="w-64 bg-gray-800 flex flex-col">
          <SidebarContent />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-black bg-opacity-60"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-64 bg-gray-800 z-50 flex flex-col">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white shadow-sm z-10">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <div className="flex items-center">
              {/* Mobile hamburger */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>
              <h1 className="ml-2 lg:ml-0 text-xl font-semibold text-gray-900">
                Superadmin Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                <ShieldCheckIcon className="h-3.5 w-3.5 mr-1" />
                Superadmin
              </span>
              <span className="text-sm text-gray-600 hidden sm:block">{user?.full_name}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
