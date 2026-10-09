import { useState, useEffect, useCallback } from 'react';
import api from '../api/auth';
import styles from './AdminAttendance.module.css';

function formatDate(isoStr) {
  if (!isoStr) return '-';
  return new Date(isoStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(isoStr) {
  if (!isoStr) return null;
  return new Date(isoStr).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatHours(h) {
  if (h == null) return null;
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

const STATUS_META = {
  present:    { label: 'Present',    cls: 'present' },
  half_day:   { label: 'Half Day',   cls: 'halfDay' },
  absent:     { label: 'Absent',     cls: 'absent' },
  not_marked: { label: 'Not Marked', cls: 'notMarked' },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? STATUS_META.not_marked;
  return (
    <span className={`${styles.badge} ${styles[meta.cls]}`}>
      <span className={styles.dot} />
      {meta.label}
    </span>
  );
}

function SummaryPill({ label, count, variant }) {
  return (
    <div className={`${styles.pill} ${styles[variant]}`}>
      <span className={styles.pillCount}>{count}</span>
      <span className={styles.pillLabel}>{label}</span>
    </div>
  );
}

export default function AdminAttendance() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchAttendance = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/admin/attendance');
      setData(res.data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load attendance data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAttendance(); }, [fetchAttendance]);

  const counts = (data?.employees ?? []).reduce(
    (acc, e) => { acc[e.status] = (acc[e.status] ?? 0) + 1; return acc; },
    {}
  );

  return (
    <section className={styles.section} aria-label="Today's attendance overview">
      <div className={styles.sectionHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.sectionIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <h2 className={styles.sectionTitle}>Today's Attendance</h2>
            <p className={styles.sectionSub}>
              {data ? formatDate(data.date) : 'Loading\u2026'}
            </p>
          </div>
        </div>

        <button
          id="refreshAttendanceBtn"
          type="button"
          className={styles.refreshBtn}
          onClick={() => fetchAttendance(true)}
          disabled={loading || refreshing}
          aria-label="Refresh attendance"
        >
          <svg
            width="14" height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={refreshing ? styles.spinning : ''}
          >
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          {refreshing ? 'Refreshing\u2026' : 'Refresh'}
        </button>
      </div>

      {data && !loading && (
        <div className={styles.summaryRow}>
          <SummaryPill label="Present"    count={counts.present    ?? 0} variant="pillPresent"    />
          <SummaryPill label="Half Day"   count={counts.half_day   ?? 0} variant="pillHalfDay"   />
          <SummaryPill label="Absent"     count={counts.absent     ?? 0} variant="pillAbsent"     />
          <SummaryPill label="Not Marked" count={counts.not_marked ?? 0} variant="pillNotMarked" />
        </div>
      )}

      <div className={styles.body}>
        {loading && (
          <div className={styles.skeletonWrap} aria-busy="true" aria-label="Loading attendance">
            {[...Array(4)].map((_, i) => (
              <div key={i} className={styles.skeletonRow}>
                <div className={styles.skeletonCell} style={{ width: '80px' }} />
                <div className={styles.skeletonCell} style={{ width: '140px' }} />
                <div className={styles.skeletonCell} style={{ width: '90px' }} />
                <div className={styles.skeletonCell} style={{ width: '70px' }} />
                <div className={styles.skeletonCell} style={{ width: '70px' }} />
                <div className={styles.skeletonCell} style={{ width: '60px' }} />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className={styles.errorRow} role="alert">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className={styles.errorText}>{error}</p>
            <button className={styles.retryBtn} onClick={() => fetchAttendance()} type="button">Retry</button>
          </div>
        )}

        {!loading && !error && data?.employees?.length === 0 && (
          <p className={styles.emptyText}>No employee records found.</p>
        )}

        {!loading && !error && data?.employees?.length > 0 && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Punch In</th>
                  <th>Punch Out</th>
                  <th>Hours</th>
                </tr>
              </thead>
              <tbody>
                {data.employees.map((emp) => (
                  <tr key={emp.employeeId} data-status={emp.status}>
                    <td data-label="Employee ID">
                      <span className={styles.empId}>{emp.employeeId || '\u2014'}</span>
                    </td>
                    <td data-label="Name">
                      <span className={styles.empName}>{emp.name || '\u2014'}</span>
                    </td>
                    <td data-label="Status">
                      <StatusBadge status={emp.status} />
                    </td>
                    <td data-label="Punch In">
                      <span className={styles.punchTime}>
                        {formatTime(emp.punchInTime) ?? <span className={styles.noData}>&mdash;</span>}
                      </span>
                    </td>
                    <td data-label="Punch Out">
                      <span className={styles.punchTime}>
                        {formatTime(emp.punchOutTime) ?? <span className={styles.noData}>&mdash;</span>}
                      </span>
                    </td>
                    <td data-label="Hours">
                      <span className={styles.punchTime}>
                        {formatHours(emp.workedHours) ?? <span className={styles.noData}>&mdash;</span>}
                      </span>
                    </td>
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
