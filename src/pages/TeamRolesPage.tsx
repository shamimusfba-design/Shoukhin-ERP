import React from 'react';
import { useErp } from '../context/ErpContext';
import { OWNER_EMAIL, updateTeamMemberRole } from '../firebase';
import { UserRole } from '../types/erp';

export const TeamRolesPage: React.FC = () => {
  const { teamMembers, isAdminOrOwner, showToast } = useErp();

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-2">
        <h2 className="text-base font-bold font-display">Multi-User Role Management (RBAC)</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Team members who sign in with Google appear below. Owners and Admins can assign roles (`owner`, `admin`, `manager`, `staff`, `viewer`) enforced by Firestore Security Rules.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-800/40">
                <th className="py-3 px-4 font-medium">Name</th>
                <th className="py-3 px-4 font-medium">Email</th>
                <th className="py-3 px-4 font-medium">Role</th>
                <th className="py-3 px-4 font-medium">Permissions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {teamMembers.map((m) => (
                <tr key={m.uid}>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{m.displayName}</td>
                  <td className="py-3 px-4 font-mono">{m.email}</td>
                  <td className="py-3 px-4">
                    {isAdminOrOwner && m.email.toLowerCase() !== OWNER_EMAIL.toLowerCase() ? (
                      <select
                        value={m.role}
                        onChange={async (ev) => {
                          const nextRole = ev.target.value as UserRole;
                          await updateTeamMemberRole(m, nextRole, m.active);
                          showToast(`Updated ${m.displayName} to ${nextRole}`);
                        }}
                        className="min-h-[34px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs capitalize"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="staff">Staff</option>
                        <option value="viewer">Viewer (Read-Only)</option>
                      </select>
                    ) : (
                      <span className="capitalize font-semibold text-emerald-600 dark:text-emerald-400">
                        {m.role}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {m.role === 'owner' || m.role === 'admin'
                      ? 'Full ERP, Month Closing, Settings & Role Management'
                      : m.role === 'manager' || m.role === 'staff'
                      ? 'Orders, Inventory, Expenses & Courier Sync'
                      : 'Read-only access to reports & analytics'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
