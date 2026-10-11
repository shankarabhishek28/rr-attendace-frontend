import { useState, useEffect, useCallback } from 'react';
import api from '../api/auth';
import API_URL from '../config';
import styles from './AttendanceHistory.module.css';

function formatDate(isoStr) {
  if (!isoStr) return '\u2014';
  return new Date(isoStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function formatTime(isoStr) {
  if (!isoStr) return '\u2014';
  return new Date(isoStr).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}
function formatHours(h) {
  if (h == null) return '\u2014';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

const STATUS_META = {
  present: { label: 'Present', cls: 'present' },
  half_day: { label: 'Half Day', cls: 'halfDay' },
  absent: { label: 'Absent', cls: 'absent' },
};

function getDefaultFrom() {
  const d = new Date(); d.setDate(1);
  return d.toISOString().slice(0, 10);
}
function getDefaultTo() { return new Date().toISOString().slice(0, 10); }

export default function AdminAttendanceHistory() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [from, setFrom] = useState(getDefaultFrom);
  const [to, setTo] = useState(getDefaultTo);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, pageSize: 30 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch employee list for dropdown
  useEffect(() => {
    api.get('/api/admin/employees').then(r => setEmployees(r.data)).catch(() => {});
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { from, to, page, pageSize: 30 };
      if (selectedEmp) params.employeeId = selectedEmp;
      const res = await api.get('/api/attendance/history', { params });
      setData(res.data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load attendance history.');
    } finally {
      setLoading(false);
    }
  }, [from, to, page, selectedEmp]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  const handleExport = () => {
    const params = new URLSearchParams({ type: 'attendance', from, to });
    if (selectedEmp) params.set('employeeId', selectedEmp);
    const token = localStorage.getItem('rr_token');
    // Use a hidden link to trigger download with auth
    const url = `${API_URL}/api/admin/export?${params}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `attendance_${from}_to_${to}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  };

  return (
    <section className={styles.section} aria-label="Attendance history (admin)">
      <div className={styles.sectionHeader}>
        <div className={styles.sectionIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div>
          <h2 className={styles.sectionTitle}>Attendance History</h2>
          <p className={styles.sectionSub}>Browse attendance records for all employees</p>
        </div>
      </div>

      <div className={styles.filters}>
        <div className={styles.dateGroup}>
          <label className={styles.filterLabel}>Employee</label>
          <select className={styles.selectInput} value={selectedEmp}
            onChange={(e) => { setSelectedEmp(e.target.value); setPage(1); }}>
            <option value="">All Employees</option>
            {employees.map(e => (
              <option key={e.employeeId} value={e.employeeId}>{e.name} ({e.employeeId})</option>
            ))}
          </select>
        </div>
        <div className={styles.dateGroup}>
          <label className={styles.filterLabel}>From</label>
          <input type="date" className={styles.dateInput} value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </div>
        <div className={styles.dateGroup}>
          <label className={styles.filterLabel}>To</label>
          <input type="date" className={styles.dateInput} value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </div>
        <button type="button" className={styles.exportBtn} onClick={handleExport}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Export CSV
        </button>
      </div>

      <div className={styles.body}>
        {loading && (
          <div className={styles.loadingRow}>
            <span className={styles.spinnerSm} />
            <span className={styles.loadingText}>Loading&hellip;</span>
          </div>
        )}

        {!loading && error && (
          <div className={styles.errorRow}>
            <p className={styles.errorText}>{error}</p>
            <button className={styles.retryBtn} onClick={fetchHistory} type="button">Retry</button>
          </div>
        )}

        {!loading && !error && data.rows.length === 0 && (
          <p className={styles.emptyText}>No attendance records for this date range.</p>
        )}

        {!loading && !error && data.rows.length > 0 && (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Date</th>
                    <th>Punch In</th>
                    <th>Punch Out</th>
                    <th>Hours</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r, i) => (
                    <tr key={i} data-status={r.status}>
                      <td data-label="Employee">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                          <span className={styles.empName}>{r.name}</span>
                          <span className={styles.empId}>{r.employeeId}</span>
                        </div>
                      </td>
                      <td data-label="Date">{formatDate(r.date)}</td>
                      <td data-label="Punch In">{formatTime(r.punchInTime)}</td>
                      <td data-label="Punch Out">{formatTime(r.punchOutTime)}</td>
                      <td data-label="Hours">{formatHours(r.workedHours)}</td>
                      <td data-label="Status">
                        <span className={`${styles.badge} ${styles[STATUS_META[r.status]?.cls ?? 'absent']}`}>
                          {STATUS_META[r.status]?.label ?? r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button className={styles.pageBtn} disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)} type="button">&laquo; Prev</button>
                <span className={styles.pageInfo}>Page {page} of {totalPages}</span>
                <button className={styles.pageBtn} disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)} type="button">Next &raquo;</button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
