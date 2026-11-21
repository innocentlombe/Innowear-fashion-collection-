import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { AttendanceStatus } from '../types';
import { useInnoWear } from '../store/useInnoWearStore';
import { Modal } from '../components/Modal';
import { DeleteButton } from '../components/DeleteButton';

export const StaffView: React.FC = () => {
  const { state, updateStaffAttendance, addStaffMember, deleteStaffMember } = useInnoWear();
  const c = state.settings.currencySymbol;

  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [role, setRole] = useState('Retail Stylist');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [shift, setShift] = useState('09:00 – 17:30');
  const [monthlyTarget, setMonthlyTarget] = useState('4500');
  const [commissionRate, setCommissionRate] = useState('4');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addStaffMember({
      name: name.trim(),
      role: role.trim(),
      email: email.trim() || 'team@innowear.co',
      phone: phone.trim() || '+260 97 000 0000',
      shift,
      attendance: 'Present',
      checkInTime: new Date().toTimeString().slice(0, 5),
      monthlyTarget: parseFloat(monthlyTarget) || 4000,
      commissionRate: parseFloat(commissionRate) || 3,
    });
    setName('');
    setEmail('');
    setPhone('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">
            Staff & Performance Management
          </h1>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Manage boutique team duties, daily attendance check-in, sales targets, and commissions
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Staff Member
        </button>
      </div>

      {/* Team Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <p className="text-xs text-[var(--text-muted)]">Present On Duty</p>
          <p className="font-mono-tabular text-xl font-semibold text-[var(--status-positive)] mt-1">
            {state.staff.filter((s) => s.attendance === 'Present').length} / {state.staff.length}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <p className="text-xs text-[var(--text-muted)]">Team Monthly Sales</p>
          <p className="font-mono-tabular text-xl font-semibold text-[var(--accent)] mt-1">
            {c}
            {state.staff.reduce((s, m) => s + m.salesAchieved, 0).toLocaleString()}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          <p className="text-xs text-[var(--text-muted)]">Accrued Commissions</p>
          <p className="font-mono-tabular text-xl font-semibold text-[var(--text-primary)] mt-1">
            {c}
            {state.staff
              .reduce((s, m) => s + (m.salesAchieved * m.commissionRate) / 100, 0)
              .toFixed(2)}
          </p>
        </div>
      </div>

      {/* Staff Roster Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {state.staff.map((member) => {
          const pct = Math.min(
            100,
            Math.round((member.salesAchieved / Math.max(1, member.monthlyTarget)) * 100)
          );
          const commission = (member.salesAchieved * member.commissionRate) / 100;

          return (
            <div
              key={member.id}
              className="p-5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-[var(--text-primary)]">
                    {member.name}
                  </h2>
                  <p className="text-xs text-[var(--text-secondary)] mt-0.5">{member.role}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    Shift {member.shift} · {member.phone}
                  </p>
                </div>
                <div className="flex items-start gap-2.5 shrink-0">
                  <div className="text-right text-xs">
                    <span
                      className={`font-medium ${
                        member.attendance === 'Present'
                          ? 'text-[var(--status-positive)]'
                          : member.attendance === 'On Leave'
                          ? 'text-[var(--status-warning)]'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {member.attendance}
                    </span>
                    {member.checkInTime && (
                      <p className="font-mono-tabular text-[var(--text-muted)] mt-0.5">
                        In {member.checkInTime}
                      </p>
                    )}
                  </div>
                  <DeleteButton
                    onConfirm={() => deleteStaffMember(member.id)}
                    ariaLabel={`Delete staff member ${member.name}`}
                  />
                </div>
              </div>

              {/* Attendance Segmented Controls */}
              <div className="flex items-center gap-1.5">
                {(['Present', 'Off Shift', 'On Leave'] as AttendanceStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => updateStaffAttendance(member.id, status)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      member.attendance === status
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                        : 'bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>

              {/* Target Progress */}
              <div className="pt-3 border-t border-[var(--border-hairline)] space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--text-muted)]">Monthly Sales Target</span>
                  <span className="font-mono-tabular text-[var(--text-primary)]">
                    {c}
                    {member.salesAchieved.toLocaleString()} / {c}
                    {member.monthlyTarget.toLocaleString()} ({pct}%)
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: 'var(--accent)' }}
                  />
                </div>
                <div className="flex justify-between text-xs text-[var(--text-muted)]">
                  <span>Commission Rate: {member.commissionRate}%</span>
                  <span className="font-mono-tabular text-[var(--text-secondary)]">
                    Earned {c}
                    {commission.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Staff Modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Staff Member"
        subtitle="Available immediately for POS sales attribution and shift tracking"
      >
        <form onSubmit={handleAdd} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Full Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Role / Duties</label>
              <input
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Shift Hours</label>
              <input
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Target ({c})</label>
              <input
                type="number"
                value={monthlyTarget}
                onChange={(e) => setMonthlyTarget(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-[var(--text-secondary)] mb-1">Commission %</label>
              <input
                type="number"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                className="w-full px-3 py-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border-hairline)] text-[var(--text-primary)] font-mono-tabular"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 rounded-md border border-[var(--border-strong)] text-[var(--text-secondary)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold rounded-md bg-[var(--accent)] text-[var(--accent-fg)]"
            >
              Save Staff
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
