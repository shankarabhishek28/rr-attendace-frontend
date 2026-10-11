import { useState, useEffect, useCallback } from 'react';
import api from '../api/auth';
import API_URL from '../config';
import styles from './AttendanceHistory.module.css';

function getDefaultFrom() {
  const d = new Date(); d.setDate(1);
  return d.toISOString().slice(0, 10);
}
function getDefaultTo() { return new Date().toISOString().slice(0, 10); }

function formatHours(h) {
  if (h == null || h === 0) return '0h';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export default function AdminSummary() {
  const [from, setFrom] = useState(getDefaultFrom);
  const [to, setTo] = useState(getDefaultTo);
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/api/admin/summary', {
        params: { from, to, page, pageSize: 20 }
      });
      setData(res.data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load summary.');
    } finally {
      setLoading(false);
    }
  }, [from, to, page]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  const handleExport = () => {
    const params = new URLSearchParams({ type: 'summary', from, to });
    const token = localStorage.getItem('rr_token');
    fetch(`${API_URL}/api/admin/export?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `summary_${from}_to_${to}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      });
  };

  return (
    <section className={styles.section} aria-label="Employee summary">
      <div className={styles.sectionHeader}>
        <div className={styles.sectionIcon} style={{ background: 'rgba(167,139,250,0.12)', color: '#a78bfa' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <div>
          <h2 className={styles.sectionTitle}>Employee Summary</h2>
          <p className={styles.sectionSub}>Attendance and leave aggregation per employee</p>
        </div>
      </div>

      <div className={styles.filters}>
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
            <button className={styles.retryBtn} onClick={fetchSummary} type="button">Retry</button>
          </div>
        )}

        {!loading && !error && data.rows.length === 0 && (
          <p className={styles.emptyText}>No employee data for this date range.</p>
        )}

        {!loading && !error && data.rows.length > 0 && (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th style={{ textAlign: 'center' }}>Full Days</th>
                    <th style={{ textAlign: 'center' }}>Half Days</th>
                    <th style={{ textAlign: 'center' }}>Absent</th>
                    <th style={{ textAlign: 'center' }}>Days Marked</th>
                    <th style={{ textAlign: 'right' }}>Total Hours</th>
                    <th style={{ textAlign: 'center' }}>Approved Leave</th>
                    <th style={{ textAlign: 'center' }}>Pending Leave</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.employeeId}>
                      <td data-label="Employee">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                          <span className={styles.empName}>{r.name}</span>
                          <span className={styles.empId}>{r.employeeId}</span>
                        </div>
                      </td>
                      <td data-label="Full Days" style={{ textAlign: 'center' }}>
                        <span style={{ color: '#6ee7b7', fontWeight: 700 }}>{r.fullDays}</span>
                      </td>
                      <td data-label="Half Days" style={{ textAlign: 'center' }}>
                        <span style={{ color: '#fcd34d', fontWeight: 700 }}>{r.halfDays}</span>
                      </td>
                      <td data-label="Absent" style={{ textAlign: 'center' }}>
                        <span style={{ color: '#fca5a5', fontWeight: 700 }}>{r.absentDays}</span>
                      </td>
                      <td data-label="Days Marked" style={{ textAlign: 'center' }}>
                        <span style={{ color: '#94a3b8', fontWeight: 600 }}>{r.daysMarked}</span>
                      </td>
                      <td data-label="Total Hours" style={{ textAlign: 'right' }}>
                        <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{formatHours(r.totalHours)}</span>
                      </td>
                      <td data-label="Approved Leave" style={{ textAlign: 'center' }}>
                        <span style={{ color: '#6ee7b7', fontWeight: 600 }}>{r.approvedLeaveDays}</span>
                      </td>
                      <td data-label="Pending Leave" style={{ textAlign: 'center' }}>
                        <span style={{ color: '#fcd34d', fontWeight: 600 }}>{r.pendingLeaveDays}</span>
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
