import { useState, useEffect, useCallback } from 'react';
import api from '../api/auth';
import styles from './LeaveSection.module.css';

const LEAVE_TYPES = ['Casual Leave', 'Sick Leave', 'Earned Leave', 'Other'];
const DAY_PORTIONS = [
  { value: 'full_day', label: 'Full Day' },
  { value: 'first_half', label: 'First Half' },
  { value: 'second_half', label: 'Second Half' },
];

function formatDate(isoStr) {
  if (!isoStr) return '-';
  return new Date(isoStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function StatusBadge({ status }) {
  return (
    <span className={styles.badge} data-status={status}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function PortionBadge({ dayPortion }) {
  if (!dayPortion || dayPortion === 'full_day') return null;
  const label = dayPortion === 'first_half' ? '1st Half' : '2nd Half';
  return <span className={styles.portionBadge}>{label}</span>;
}

export default function LeaveSection() {
  const [form, setForm] = useState({
    leaveType: 'Casual Leave',
    startDate: '',
    endDate: '',
    reason: '',
    dayPortion: 'full_day',
  });
  const [formError, setFormError] = useState('');
  const [submitState, setSubmitState] = useState('idle');
  const [submitMsg, setSubmitMsg] = useState('');

  const [leaves, setLeaves] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(true);
  const [leavesError, setLeavesError] = useState('');

  const isHalfDay = form.dayPortion !== 'full_day';

  const fetchLeaves = useCallback(async () => {
    setLeavesLoading(true);
    setLeavesError('');
    try {
      const res = await api.get('/api/leave');
      setLeaves(res.data);
    } catch {
      setLeavesError('Failed to load leave requests.');
    } finally {
      setLeavesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      // When switching to half-day, sync endDate to startDate
      if (name === 'dayPortion' && value !== 'full_day') {
        next.endDate = next.startDate;
      }
      if (name === 'startDate' && prev.dayPortion !== 'full_day') {
        next.endDate = value;
      }
      return next;
    });
    setFormError('');
  };

  const validate = () => {
    if (!form.startDate) return 'Please select a start date.';
    if (isHalfDay) {
      // endDate auto-synced to startDate
    } else {
      if (!form.endDate) return 'Please select an end date.';
      if (new Date(form.endDate) < new Date(form.startDate)) return 'End date cannot be before start date.';
    }
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setFormError(err); return; }

    setSubmitState('loading');
    setSubmitMsg('');
    try {
      await api.post('/api/leave/apply', {
        leaveType: form.leaveType,
        startDate: form.startDate,
        endDate: isHalfDay ? form.startDate : form.endDate,
        reason: form.reason,
        dayPortion: form.dayPortion,
      });
      setSubmitState('success');
      setSubmitMsg(`Leave request submitted${isHalfDay ? ' (0.5 day)' : ''}.`);
      setForm({ leaveType: 'Casual Leave', startDate: '', endDate: '', reason: '', dayPortion: 'full_day' });
      await fetchLeaves();
    } catch (err) {
      setSubmitState('error');
      setSubmitMsg(err.response?.data?.error || 'Failed to submit leave request. Please try again.');
    }
  };

  return (
    <section className={styles.section} aria-label="Leave">
      <div className={styles.sectionHeader}>
        <div className={styles.sectionIcon} data-color="violet">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        </div>
        <div>
          <h2 className={styles.sectionTitle}>Apply for Leave</h2>
          <p className={styles.sectionSub}>Submit and track your leave requests</p>
        </div>
      </div>

      {/* Leave Form */}
      <div className={styles.formWrap}>
        <form className={styles.form} onSubmit={handleSubmit} noValidate id="leaveForm">
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="leaveType" className={styles.label}>Leave Type</label>
              <select
                id="leaveType"
                name="leaveType"
                className={styles.select}
                value={form.leaveType}
                onChange={handleChange}
                disabled={submitState === 'loading'}
              >
                {LEAVE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="dayPortion" className={styles.label}>Duration</label>
              <select
                id="dayPortion"
                name="dayPortion"
                className={styles.select}
                value={form.dayPortion}
                onChange={handleChange}
                disabled={submitState === 'loading'}
              >
                {DAY_PORTIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label htmlFor="startDate" className={styles.label}>
                {isHalfDay ? 'Date' : 'Start Date'}
              </label>
              <input
                id="startDate"
                name="startDate"
                type="date"
                className={styles.input}
                value={form.startDate}
                onChange={handleChange}
                disabled={submitState === 'loading'}
                required
              />
            </div>
            {!isHalfDay && (
              <div className={styles.field}>
                <label htmlFor="endDate" className={styles.label}>End Date</label>
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  className={styles.input}
                  value={form.endDate}
                  onChange={handleChange}
                  disabled={submitState === 'loading'}
                  required
                  min={form.startDate || undefined}
                />
              </div>
            )}
            {isHalfDay && (
              <div className={styles.field}>
                <span className={styles.label}>&nbsp;</span>
                <div className={styles.halfDayHint}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                  0.5 day &mdash; {form.dayPortion === 'first_half' ? 'Morning session' : 'Afternoon session'}
                </div>
              </div>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="reason" className={styles.label}>Reason <span className={styles.optional}>(optional)</span></label>
            <textarea
              id="reason"
              name="reason"
              className={styles.textarea}
              value={form.reason}
              onChange={handleChange}
              disabled={submitState === 'loading'}
              rows={3}
              placeholder="Briefly describe the reason for your leave."
            />
          </div>

          {formError && (
            <p className={styles.formError} role="alert">{formError}</p>
          )}

          {submitState === 'success' && (
            <div className={styles.alertBox} data-variant="success" role="status">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span>{submitMsg}</span>
            </div>
          )}

          {submitState === 'error' && (
            <div className={styles.alertBox} data-variant="error" role="alert">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <span>{submitMsg}</span>
            </div>
          )}

          <button
            id="leaveSubmitBtn"
            type="submit"
            className={styles.submitBtn}
            disabled={submitState === 'loading'}
          >
            {submitState === 'loading' ? (
              <><span className={styles.btnSpinner} />Submitting&hellip;</>
            ) : (
              'Submit Leave Request'
            )}
          </button>
        </form>
      </div>

      {/* My Leave Requests */}
      <div className={styles.listSection}>
        <h3 className={styles.listTitle}>My Leave Requests</h3>

        {leavesLoading && (
          <div className={styles.loadingRow}>
            <span className={styles.spinnerSm} />
            <span className={styles.loadingText}>Loading&hellip;</span>
          </div>
        )}

        {!leavesLoading && leavesError && (
          <p className={styles.errorText}>{leavesError}</p>
        )}

        {!leavesLoading && !leavesError && leaves.length === 0 && (
          <p className={styles.emptyText}>No leave requests yet.</p>
        )}

        {!leavesLoading && !leavesError && leaves.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Duration</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Days</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => (
                  <tr key={l.id}>
                    <td data-label="Type">{l.leaveType}</td>
                    <td data-label="Duration">
                      {l.dayPortion === 'first_half' ? '1st Half' :
                       l.dayPortion === 'second_half' ? '2nd Half' : 'Full Day'}
                    </td>
                    <td data-label="Start">{formatDate(l.startDate)}</td>
                    <td data-label="End">{formatDate(l.endDate)}</td>
                    <td data-label="Days">{l.numberOfDays}</td>
                    <td data-label="Status"><StatusBadge status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
