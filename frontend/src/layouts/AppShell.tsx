import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  History,
  FolderTree,
  FileSpreadsheet,
  Settings,
  Menu,
  X,
  Plus,
} from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { UserRole } from '../types/index.js';

export const AppShell: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const role = (localStorage.getItem('brajmart_role') as UserRole) || 'ADMIN';

  const navItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Inventory', to: '/inventory', icon: Boxes },
    { label: 'Transactions', to: '/transactions', icon: History },
    { label: 'Categories', to: '/categories', icon: FolderTree },
    { label: 'Reports', to: '/reports', icon: FileSpreadsheet },
    { label: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-neutral-200">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-700 flex items-center justify-center text-white font-bold text-base shadow-sm">
            BM
          </div>
          <div>
            <h1 className="text-sm font-bold text-neutral-900 tracking-tight">
              BrajMart
            </h1>
            <p className="text-[10px] text-neutral-500 font-medium">Inventory & Valuation</p>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-100"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop Sidebar & Mobile Drawer */}
      <aside
        className={`fixed md:sticky top-0 inset-x-0 bottom-0 z-40 w-64 bg-white border-r border-neutral-200/80 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } h-screen`}
      >
        <div>
          {/* Logo Section */}
          <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-brand-700 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                BM
              </div>
              <div>
                <h1 className="text-base font-bold text-neutral-900 leading-tight tracking-tight">
                  BrajMart
                </h1>
                <span className="text-[11px] text-neutral-500 font-medium">
                  Inventory & Valuation
                </span>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick add action */}
          {['ADMIN', 'MANAGER'].includes(role) && (
            <div className="px-4 pt-4 pb-2">
              <NavLink to="/inventory/new" onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant="primary"
                  className="w-full justify-start text-xs py-2 shadow-sm font-semibold"
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add Product
                </Button>
              </NavLink>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.to === '/inventory'
                  ? location.pathname.startsWith('/inventory')
                  : location.pathname === item.to;

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-brand-50 text-brand-800 font-semibold shadow-xs'
                      : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100/70'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-brand-700' : 'text-neutral-400'
                    }`}
                  />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-neutral-100 text-[11px] text-neutral-400">
          Data is loaded from MongoDB.
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen">
        <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
