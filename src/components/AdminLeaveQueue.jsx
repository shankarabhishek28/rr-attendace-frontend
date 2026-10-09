import { useState, useEffect, useCallback } from 'react';
import api from '../api/auth';
import styles from './AdminLeaveQueue.module.css';

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

function portionLabel(dp) {
  if (dp === 'first_half') return '1st Half';
  if (dp === 'second_half') return '2nd Half';
  return 'Full Day';
}

export default function AdminLeaveQueue() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deciding, setDeciding] = useState({});

  const fetchLeaves = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/leave');
      setLeaves(res.data);
    } catch {
      setError('Failed to load leave requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const handleDecide = async (id, decision) => {
    setDeciding((prev) => ({ ...prev, [id]: decision }));
    try {
      const res = await api.post(`/api/leave/${id}/decide`, { decision });
      setLeaves((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: res.data.leave.status } : l))
      );
    } catch {
      await fetchLeaves();
    } finally {
      setDeciding((prev) => ({ ...prev, [id]: null }));
    }
  };

  return (
    <section className={styles.section} aria-label="Admin leave approval queue">
      <div className={styles.sectionHeader}>
        <div className={styles.sectionIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
        </div>
        <div>
          <h2 className={styles.sectionTitle}>Leave Approval Queue</h2>
          <p className={styles.sectionSub}>Review and decide on all employee leave requests</p>
        </div>
      </div>

      <div className={styles.body}>
        {loading && (
          <div className={styles.loadingRow}>
            <span className={styles.spinnerSm} />
            <span className={styles.loadingText}>Loading requests&hellip;</span>
          </div>
        )}

        {!loading && error && (
          <div className={styles.errorRow}>
            <p className={styles.errorText}>{error}</p>
            <button className={styles.retryBtn} onClick={fetchLeaves} type="button">Retry</button>
          </div>
        )}

        {!loading && !error && leaves.length === 0 && (
          <p className={styles.emptyText}>No leave requests to review.</p>
        )}

        {!loading && !error && leaves.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Type</th>
                  <th>Duration</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map((l) => {
                  const isDeciding = !!deciding[l.id];
                  return (
                    <tr key={l.id} data-status={l.status}>
                      <td data-label="Employee">
                        <div className={styles.empCell}>
                          <span className={styles.empName}>{l.employee?.name ?? '-'}</span>
                          <span className={styles.empId}>{l.employee?.employeeId ?? ''}</span>
                        </div>
                      </td>
                      <td data-label="Type">{l.leaveType}</td>
                      <td data-label="Duration">{portionLabel(l.dayPortion)}</td>
                      <td data-label="Start">{formatDate(l.startDate)}</td>
                      <td data-label="End">{formatDate(l.endDate)}</td>
                      <td data-label="Days">{l.numberOfDays}</td>
                      <td data-label="Status"><StatusBadge status={l.status} /></td>
                      <td data-label="Action">
                        {l.status === 'pending' ? (
                          <div className={styles.actionBtns}>
                            <button
                              id={`approveBtn-${l.id}`}
                              className={styles.approveBtn}
                              onClick={() => handleDecide(l.id, 'approved')}
                              disabled={isDeciding}
                              type="button"
                            >
                              {isDeciding && deciding[l.id] === 'approved' ? (
                                <span className={styles.btnSpinner} />
                              ) : (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                              )}
                              Approve
                            </button>
                            <button
                              id={`rejectBtn-${l.id}`}
                              className={styles.rejectBtn}
                              onClick={() => handleDecide(l.id, 'rejected')}
                              disabled={isDeciding}
                              type="button"
                            >
                              {isDeciding && deciding[l.id] === 'rejected' ? (
                                <span className={styles.btnSpinner} />
                              ) : (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                              )}
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className={styles.noAction}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
