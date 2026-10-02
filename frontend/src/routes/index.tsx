import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../layouts/AppShell.js';
import { DashboardPage } from '../pages/DashboardPage.js';
import { InventoryPage } from '../pages/InventoryPage.js';
import { ProductDetailPage } from '../pages/ProductDetailPage.js';
import { ProductFormPage } from '../pages/ProductFormPage.js';
import { TransactionsPage } from '../pages/TransactionsPage.js';
import { CategoriesPage } from '../pages/CategoriesPage.js';
import { ReportsPage } from '../pages/ReportsPage.js';
import { SettingsPage } from '../pages/SettingsPage.js';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'inventory',
        element: <InventoryPage />,
      },
      {
        path: 'inventory/new',
        element: <ProductFormPage />,
      },
      {
        path: 'inventory/:id',
        element: <ProductDetailPage />,
      },
      {
        path: 'inventory/:id/edit',
        element: <ProductFormPage />,
      },
      {
        path: 'transactions',
        element: <TransactionsPage />,
      },
      {
        path: 'categories',
        element: <CategoriesPage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: '*',
        element: <Navigate to="/dashboard" replace />,
      },
    ],
  },
]);
