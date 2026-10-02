import React, { useState } from 'react';
import { Shield, Database, Coins, Layers, CheckCircle2 } from 'lucide-react';
import { UserRole } from '../types/index.js';
import { Button } from '../components/ui/Button.js';
import { useToast } from '../hooks/useToast.js';

export const SettingsPage: React.FC = () => {
  const { success } = useToast();
  const currentRole = (localStorage.getItem('brajmart_role') as UserRole) || 'ADMIN';
  const currentName = localStorage.getItem('brajmart_user_name') || 'Admin Staff';

  const [role, setRole] = useState<UserRole>(currentRole);
  const [userName, setUserName] = useState(currentName);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('brajmart_role', role);
    localStorage.setItem('brajmart_user_name', userName.trim() || 'Admin');
    success('Settings updated. Refreshing context...');
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">
          System Settings & Policies
        </h1>
        <p className="mt-1 text-xs md:text-sm text-neutral-500 font-normal">
          Staff session identity, access control roles, and business invariants
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Session / Role Config */}
        <div className="md:col-span-2 space-y-6">
          <form
            onSubmit={handleSave}
            className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-4"
          >
            <h2 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-600" />
              Active Operator Session
            </h2>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-700">
                Staff / Operator Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full text-sm bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Enter staff name"
              />
              <p className="text-[11px] text-neutral-400">
                Recorded on all stock transaction audits (Created By field)
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-neutral-700">
                Access Control Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full text-sm bg-white border border-neutral-300 rounded-lg px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="ADMIN">ADMIN — Full management, archive, adjust, reports</option>
                <option value="MANAGER">MANAGER — Product edits, stock operations, reports</option>
                <option value="STAFF">STAFF — Stock-in & stock-out dispatch operations</option>
                <option value="VIEWER">VIEWER — Read-only observation</option>
              </select>
            </div>

            <div className="pt-2">
              <Button type="submit" variant="primary">
                Save Operator Profile
              </Button>
            </div>
          </form>

          {/* Business Invariants Card (Rule #99) */}
          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-neutral-900 border-b border-neutral-100 pb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Verified Invariants (Rule #99)
            </h2>
            <ul className="text-xs text-neutral-600 space-y-2 leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>
                  <strong>Non-Negative Stock:</strong> Database forbids quantity &lt; 0. Atomic <code>$gte</code> guards block concurrent overdrafts.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>
                  <strong>Database Only:</strong> Dashboard totals come from saved MongoDB records.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                <span>
                  <strong>Immutable Audit Trail:</strong> Every stock alteration produces a timestamped transaction with snapshot prices and user attribution.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Financial & Architectural Policies */}
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-neutral-900 font-bold text-xs">
              <Coins className="w-4 h-4 text-brand-600" />
              Financial Precision
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              All currency is stored in <strong>integer paise</strong> (1 Rupee = 100 Paise) to eliminate JavaScript floating-point rounding errors.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-neutral-900 font-bold text-xs">
              <Database className="w-4 h-4 text-brand-600" />
              Valuation Standard (Rule #52)
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              BrajMart V1 uses <strong>Current Cost Valuation</strong> (Quantity × Current Cost per Unit). This represents current stock investment and not formal FIFO or weighted-average accounting.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-neutral-900 font-bold text-xs">
              <Layers className="w-4 h-4 text-brand-600" />
              Idempotency (Rule #21)
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Mutation requests automatically send unique <code>Idempotency-Key</code> headers, preventing accidental double-stock submissions on network glitches or rapid double clicks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
