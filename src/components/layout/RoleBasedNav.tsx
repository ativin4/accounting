'use client';

import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { Role } from '../../types';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles?: Role[];
}

export default function RoleBasedNav() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userRole = session?.user?.role as Role | undefined;

  const navigation: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: '📊',
      roles: ['owner', 'invoice_manager', 'inventory_manager', 'sales_rep', 'viewer']
    },
    {
      label: 'Create Invoice',
      href: '/invoice',
      icon: '📄',
      roles: ['owner', 'invoice_manager', 'sales_rep']
    },
    {
      label: 'Invoices',
      href: '/invoices',
      icon: '📋',
      roles: ['owner', 'invoice_manager', 'sales_rep', 'viewer']
    },
    {
      label: 'Customers',
      href: '/customers',
      icon: '👥',
      roles: ['owner', 'invoice_manager', 'sales_rep', 'viewer']
    },
    {
      label: 'Products',
      href: '/inventory',
      icon: '📦',
      roles: ['owner', 'inventory_manager']
    },
    {
      label: 'Ledger',
      href: '/ledger',
      icon: '📖',
      roles: ['owner', 'invoice_manager', 'viewer']
    },
    {
      label: 'Team',
      href: '/team',
      icon: '👔',
      roles: ['owner']
    },
    {
      label: 'Audit Logs',
      href: '/audit-logs',
      icon: '🔍',
      roles: ['owner', 'invoice_manager', 'viewer']
    }
  ];

  const filteredNavigation = navigation.filter(item =>
    !item.roles || (userRole && item.roles.includes(userRole))
  );

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  const getRoleLabel = (role?: Role) => {
    if (!role) return '';
    const roleLabels = {
      owner: 'Owner',
      invoice_manager: 'Invoice Manager',
      inventory_manager: 'Inventory Manager',
      sales_rep: 'Sales Representative',
      viewer: 'Viewer'
    };
    return roleLabels[role];
  };

  const getRoleColor = (role?: Role) => {
    if (!role) return 'bg-gray-100 text-gray-800';
    const roleColors = {
      owner: 'bg-purple-100 text-purple-800',
      invoice_manager: 'bg-blue-100 text-blue-800',
      inventory_manager: 'bg-green-100 text-green-800',
      sales_rep: 'bg-orange-100 text-orange-800',
      viewer: 'bg-gray-100 text-gray-800'
    };
    return roleColors[role];
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/dashboard" className="text-xl font-bold text-gray-900">
                InvoicePro
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              {filteredNavigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive(item.href)
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } transition-colors duration-200`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* User Menu */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
                <p className="text-xs text-gray-500">{session?.user?.organizationName}</p>
              </div>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(userRole)}`}>
                {getRoleLabel(userRole)}
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
            >
              Sign Out
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            >
              <span className="sr-only">Open main menu</span>
              <svg
                className={`${mobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <svg
                className={`${mobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`${mobileMenuOpen ? 'block' : 'hidden'} sm:hidden`}>
        <div className="pt-2 pb-3 space-y-1">
          {filteredNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium ${
                isActive(item.href)
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-transparent text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800'
              }`}
            >
              <span className="mr-3">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
        <div className="pt-4 pb-3 border-t border-gray-200">
          <div className="px-4 py-2">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">
                  {session?.user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
                <p className="text-xs text-gray-500">{session?.user?.organizationName}</p>
                <div className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(userRole)}`}>
                  {getRoleLabel(userRole)}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-3 px-2">
            <button
              onClick={() => signOut()}
              className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}