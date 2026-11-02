import React, { useState, useEffect } from 'react';
import { useErp } from '../context/ErpContext';
import {
  OWNER_EMAIL,
  approveAdminRequest,
  rejectAdminRequest,
  revokeOrSuspendAdmin,
  db,
} from '../firebase';
import { TeamMember, AuditLogEntry } from '../types/erp';
import {
  ShieldCheck,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  History,
  CheckCircle2,
  XCircle,
  ShieldAlert,
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

export const TeamRolesPage: React.FC = () => {
  const { teamMembers, user, showToast, busy, setBusy } = useErp();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Real-time listener for audit logs
  useEffect(() => {
    try {
      const q = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(50));
      const unsub = onSnapshot(
        q,
        (snap) => {
          const logs = snap.docs.map((d) => d.data() as AuditLogEntry);
          setAuditLogs(logs);
        },
        (err) => {
          console.warn('Audit logs read notice:', err);
        }
      );
      return () => unsub();
    } catch {
      // Offline fallback
    }
  }, []);

  const pendingRequests = teamMembers.filter(
    (m) => m.status === 'pending' || (!m.active && m.status !== 'rejected' && m.status !== 'suspended')
  );

  const activeAdmins = teamMembers.filter(
    (m) => m.active && (m.status === 'approved' || m.email.toLowerCase() === OWNER_EMAIL.toLowerCase())
  );

  const suspendedOrRejected = teamMembers.filter(
    (m) => m.status === 'rejected' || m.status === 'suspended'
  );

  const handleApprove = async (member: TeamMember) => {
    setBusy(true);
    try {
      await approveAdminRequest(member, user?.email || 'admin');
      showToast(`Approved ${member.displayName} (${member.email}) as Admin.`);
    } catch (err: any) {
      showToast(err?.message || 'Approval failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async (member: TeamMember) => {
    if (!window.confirm(`Reject admin access request from ${member.displayName} (${member.email})?`)) {
      return;
    }
    setBusy(true);
    try {
      await rejectAdminRequest(member, user?.email || 'admin');
      showToast(`Rejected request from ${member.displayName}.`);
    } catch (err: any) {
      showToast(err?.message || 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleSuspend = async (member: TeamMember) => {
    if (activeAdmins.length <= 1) {
      showToast('Action blocked: Cannot suspend the last active Admin of the workspace.');
      return;
    }
    if (!window.confirm(`Suspend admin access for ${member.displayName} (${member.email})?`)) {
      return;
    }
    setBusy(true);
    try {
      await revokeOrSuspendAdmin(member, teamMembers, user?.email || 'admin');
      showToast(`Admin access suspended for ${member.displayName}.`);
    } catch (err: any) {
      showToast(err?.message || 'Suspension failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-emerald-600 text-white shadow-md shadow-emerald-600/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold font-display text-slate-900 dark:text-white">
                  Admin Access & Workspace Security
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Single-Role Architecture
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                There is only one role in Shoukhin ERP: <strong>Admin</strong>. Every approved account holds identical full permissions. New requests remain pending until approved by an existing Admin.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{activeAdmins.length} Active Admins</span>
            </div>
            {pendingRequests.length > 0 && (
              <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-2 animate-pulse">
                <Clock className="w-3.5 h-3.5" />
                <span>{pendingRequests.length} Pending Approval</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 1: Pending Admin Access Requests */}
      <div className="rounded-2xl border border-amber-300 dark:border-amber-800/80 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-amber-200 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Admin Access Requests ({pendingRequests.length})
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Pending users cannot access or view protected ERP data until an Admin approves them.
              </p>
            </div>
          </div>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
            <UserCheck className="w-8 h-8 text-emerald-600/50 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">No pending requests</p>
            <p className="text-[11px] text-slate-400 mt-0.5">All submitted access applications have been reviewed.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-800/40">
                  <th className="py-3 px-5 font-semibold">Applicant Name</th>
                  <th className="py-3 px-5 font-semibold">Email</th>
                  <th className="py-3 px-5 font-semibold">Requested Date</th>
                  <th className="py-3 px-5 font-semibold">Status</th>
                  <th className="py-3 px-5 font-semibold text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {pendingRequests.map((m) => (
                  <tr key={m.uid} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-5 font-semibold text-slate-900 dark:text-white">
                      {m.displayName}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-slate-600 dark:text-slate-300">
                      {m.email}
                    </td>
                    <td className="py-3.5 px-5 text-slate-500">
                      {m.requestedAt ? new Date(m.requestedAt).toLocaleString() : 'Recent'}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                        Pending Approval
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right space-x-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleApprove(m)}
                        className="min-h-[34px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Approve as Admin</span>
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleReject(m)}
                        className="min-h-[34px] px-3 rounded-xl border border-rose-300 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-600 dark:text-rose-400 font-semibold text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECTION 2: Active Workspace Admins */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Active Admins ({activeAdmins.length})
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Each approved Admin possesses equal operational rights across Inventory, Orders, Finances, and Courier sync.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-800/40">
                <th className="py-3 px-5 font-semibold">Admin Name</th>
                <th className="py-3 px-5 font-semibold">Email</th>
                <th className="py-3 px-5 font-semibold">Role</th>
                <th className="py-3 px-5 font-semibold">Approved Date</th>
                <th className="py-3 px-5 font-semibold text-right">Access Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {activeAdmins.map((m) => {
                const isOnlyAdmin = activeAdmins.length <= 1;
                return (
                  <tr key={m.uid} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-5 font-semibold text-slate-900 dark:text-white">
                      {m.displayName}
                    </td>
                    <td className="py-3.5 px-5 font-mono text-slate-600 dark:text-slate-300">
                      {m.email}
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                        Admin
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-slate-500">
                      {m.approvedAt ? new Date(m.approvedAt).toLocaleDateString() : 'System Bootstrap'}
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      {isOnlyAdmin ? (
                        <span
                          title="Protected: Cannot remove or suspend the last active Admin of the workspace."
                          className="text-[11px] font-medium text-slate-400 italic cursor-not-allowed"
                        >
                          Sole Workspace Admin
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleSuspend(m)}
                          className="min-h-[32px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-300 text-slate-600 hover:text-rose-600 text-xs font-medium transition-colors cursor-pointer"
                        >
                          Suspend Access
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: Suspended or Rejected Accounts (if any) */}
      {suspendedOrRejected.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Suspended or Rejected Accounts ({suspendedOrRejected.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-800/40">
                  <th className="py-2.5 px-5 font-medium">Name</th>
                  <th className="py-2.5 px-5 font-medium">Email</th>
                  <th className="py-2.5 px-5 font-medium">Status</th>
                  <th className="py-2.5 px-5 font-medium text-right">Reactivate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {suspendedOrRejected.map((m) => (
                  <tr key={m.uid}>
                    <td className="py-2.5 px-5 font-medium">{m.displayName}</td>
                    <td className="py-2.5 px-5 font-mono text-slate-500">{m.email}</td>
                    <td className="py-2.5 px-5">
                      <span className="capitalize text-slate-500 font-medium">{m.status}</span>
                    </td>
                    <td className="py-2.5 px-5 text-right">
                      <button
                        type="button"
                        onClick={() => handleApprove(m)}
                        className="text-emerald-600 font-semibold hover:underline"
                      >
                        Re-Approve as Admin
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 4: Account Action Audit Log */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <History className="w-5 h-5 text-slate-500" />
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Admin Access Audit Log
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Immutable historical record of access requests, approvals, rejections, and suspensions.
            </p>
          </div>
        </div>

        {auditLogs.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No audit log entries recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 bg-slate-50/50 dark:bg-slate-800/40">
                  <th className="py-2.5 px-5 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-5 font-semibold">Action</th>
                  <th className="py-2.5 px-5 font-semibold">Target Account</th>
                  <th className="py-2.5 px-5 font-semibold">Performed By</th>
                  <th className="py-2.5 px-5 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-5 text-slate-500 font-sans">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-5 font-sans font-bold">
                      {log.action === 'ADMIN_APPROVED' ? (
                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                        </span>
                      ) : log.action === 'ADMIN_REJECTED' ? (
                        <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> Rejected
                        </span>
                      ) : log.action === 'ADMIN_SUSPENDED' ? (
                        <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> Suspended
                        </span>
                      ) : (
                        <span className="text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Requested
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-5 text-slate-800 dark:text-slate-200">
                      {log.targetEmail}
                    </td>
                    <td className="py-2.5 px-5 text-slate-500">
                      {log.performedBy}
                    </td>
                    <td className="py-2.5 px-5 text-slate-500 font-sans">
                      {log.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
