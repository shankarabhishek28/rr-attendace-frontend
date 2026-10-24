import { useState, useEffect, useCallback } from 'react';
import api from '../api/auth';
import styles from './AttendanceSection.module.css';

function formatTime(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatHours(h) {
  if (h == null) return '';
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

function statusLabel(status) {
  if (status === 'present') return 'Full Day';
  if (status === 'half_day') return 'Half Day';
  if (status === 'absent') return 'Absent';
  return status;
}

function ElapsedTime({ since }) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const update = () => {
      const diff = Date.now() - new Date(since).getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setElapsed(`${h}h ${m}m`);
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [since]);
  return <span>{elapsed}</span>;
}

export default function AttendanceSection() {
  const [geoState, setGeoState] = useState('loading');
  const [geoError, setGeoError] = useState('');
  const [coords, setCoords] = useState(null);
  // today's attendance state: null | { punchInTime, punchOutTime?, ... }
  const [todayRecord, setTodayRecord] = useState(null);
  const [todayLoading, setTodayLoading] = useState(true);
  const [punchState, setPunchState] = useState('idle');
  const [punchError, setPunchError] = useState('');
  const [punchData, setPunchData] = useState(null);
  // punch-out
  const [punchOutState, setPunchOutState] = useState('idle');
  const [punchOutError, setPunchOutError] = useState('');

  // Fetch today's attendance on mount
  useEffect(() => {
    const fetchToday = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const res = await api.get(`/api/attendance/history?from=${today}&to=${today}`);
        if (res.data.rows && res.data.rows.length > 0) {
          setTodayRecord(res.data.rows[0]);
        }
      } catch {
        // Silently fail - user just hasn't punched in yet
      } finally {
        setTodayLoading(false);
      }
    };
    fetchToday();
  }, []);

  const requestLocation = useCallback(() => {
    setGeoState('loading');
    setGeoError('');
    if (!navigator.geolocation) {
      setGeoState('unsupported');
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setGeoState('granted');
      },
      (err) => {
        if (err.code === 1) {
          setGeoState('denied');
          setGeoError('Location permission is required to mark attendance. Please allow location access and try again.');
        } else if (err.code === 2) {
          setGeoState('denied');
          setGeoError('Location unavailable. Please ensure GPS is enabled and try again.');
        } else if (err.code === 3) {
          setGeoState('denied');
          setGeoError('Location request timed out. Please try again.');
        } else {
          setGeoState('denied');
          setGeoError('Could not retrieve your location. Please try again.');
        }
      }
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const handlePunch = async () => {
    if (!coords || punchState === 'loading') return;
    setPunchState('loading');
    setPunchData(null);
    setPunchError('');
    try {
      const res = await api.post('/api/attendance/punch', coords);
      setPunchData(res.data.attendance);
      setPunchState('success');
      setTodayRecord(res.data.attendance);
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      if (status === 409) {
        setPunchData(data.attendance);
        setPunchState('duplicate');
        setTodayRecord(data.attendance);
      } else if (status === 403) {
        setPunchData({ distanceMeters: data.distanceMeters });
        setPunchState('geofence');
        setPunchError(data.error || 'You are outside the permitted attendance location.');
      } else if (status === 400) {
        setPunchState('nolocation');
        setPunchError(data.error || 'No attendance location assigned to you yet.');
      } else {
        setPunchState('error');
        setPunchError('Something went wrong. Please try again.');
      }
    }
  };

  const handlePunchOut = async () => {
    if (!coords || punchOutState === 'loading') return;
    setPunchOutState('loading');
    setPunchOutError('');
    try {
      const res = await api.post('/api/attendance/punch-out', coords);
      setPunchOutState('success');
      setTodayRecord(res.data.attendance);
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      if (status === 409) {
        setPunchOutState('already');
        setTodayRecord(data.attendance);
      } else if (status === 403) {
        setPunchOutState('geofence');
        setPunchOutError(data.error || 'You are outside the permitted attendance location.');
      } else if (status === 400) {
        setPunchOutState('error');
        setPunchOutError(data.error || 'You haven\'t punched in today.');
      } else {
        setPunchOutState('error');
        setPunchOutError('Something went wrong. Please try again.');
      }
    }
  };

  const hasPunchedIn = todayRecord?.punchInTime != null;
  const hasPunchedOut = todayRecord?.punchOutTime != null;

  return (
    <section className={styles.section} aria-label="Attendance">
      <div className={styles.sectionHeader}>
        <div className={styles.sectionIcon} data-color="blue">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        </div>
        <div>
          <h2 className={styles.sectionTitle}>Today's Attendance</h2>
          <p className={styles.sectionSub}>Mark your presence with GPS verification</p>
        </div>
      </div>

      <div className={styles.body}>
        {geoState === 'loading' && (
          <div className={styles.statusRow}>
            <span className={`${styles.dot} ${styles.dotPulse}`} />
            <span className={styles.statusText}>Acquiring your location&hellip;</span>
          </div>
        )}

        {(geoState === 'denied' || geoState === 'unsupported') && (
          <div className={styles.alertBox} data-variant="warn" role="alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span>{geoError}</span>
            {geoState === 'denied' && (
              <button className={styles.retryBtn} onClick={requestLocation} type="button">Retry</button>
            )}
          </div>
        )}

        {geoState === 'granted' && (
          <>
            <div className={styles.gpsRow}>
              <span className={`${styles.dot} ${styles.dotGreen}`} />
              <span className={styles.gpsText}>
                GPS locked &mdash; {coords.latitude.toFixed(5)}&deg;N, {coords.longitude.toFixed(5)}&deg;E
              </span>
            </div>

            {/* Punch-out completed: show final summary */}
            {hasPunchedOut && (
              <div className={styles.summaryCard}>
                <div className={styles.summaryHeader}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>Day Completed</span>
                </div>
                <div className={styles.summaryGrid}>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Punch In</span>
                    <span className={styles.summaryValue}>{formatTime(todayRecord.punchInTime)}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Punch Out</span>
                    <span className={styles.summaryValue}>{formatTime(todayRecord.punchOutTime)}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Hours Worked</span>
                    <span className={styles.summaryValue}>{formatHours(todayRecord.workedHours)}</span>
                  </div>
                  <div className={styles.summaryItem}>
                    <span className={styles.summaryLabel}>Status</span>
                    <span className={`${styles.summaryValue} ${styles.statusVal}`} data-status={todayRecord.status}>
                      {statusLabel(todayRecord.status)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Punched in but not out: show punch-out button */}
            {hasPunchedIn && !hasPunchedOut && (
              <>
                <div className={styles.alertBox} data-variant="success" role="status">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span>
                    <strong>Punched in</strong> at <strong>{formatTime(todayRecord.punchInTime)}</strong>
                    {' '}&mdash; Elapsed: <ElapsedTime since={todayRecord.punchInTime} />
                  </span>
                </div>

                <div className={styles.alertBox} data-variant="info" role="note">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  <span>
                    <strong>8.5h</strong> = Full Day &bull; <strong>4.5h</strong> = Half Day &bull; under 4.5h = Absent.
                    {' '}Ensure you punch out before leaving &mdash; unpunched records are marked <strong>Absent</strong> at midnight.
                  </span>
                </div>

                {punchOutError && (
                  <div className={styles.alertBox} data-variant="warn" role="alert">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>{punchOutError}</span>
                  </div>
                )}

                <button
                  id="punchOutBtn"
                  className={styles.punchOutBtn}
                  onClick={handlePunchOut}
                  disabled={punchOutState === 'loading'}
                  type="button"
                >
                  {punchOutState === 'loading' ? (
                    <><span className={styles.btnSpinner} />Punching out&hellip;</>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      Punch Out
                    </>
                  )}
                </button>
              </>
            )}

            {/* Punch-in states (only when not yet punched in today) */}
            {!hasPunchedIn && !todayLoading && (
              <>
                {punchState === 'success' && (
                  <div className={styles.alertBox} data-variant="success" role="status">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    <span>
                      <strong>Attendance marked &mdash; Present</strong>
                      {' '}Punched in at <strong>{formatTime(punchData?.punchInTime)}</strong>
                      {punchData?.distanceMeters != null && <> &bull; {Math.round(punchData.distanceMeters)} m from office</>}
                    </span>
                  </div>
                )}

                {punchState === 'geofence' && (
                  <div className={styles.alertBox} data-variant="warn" role="alert">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>
                      You are <strong>{punchData?.distanceMeters ?? '?'} m</strong> from the office &mdash; outside the permitted radius. Move closer and try again.
                    </span>
                  </div>
                )}

                {punchState === 'nolocation' && (
                  <div className={styles.alertBox} data-variant="warn" role="alert">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                    <span>{punchError}</span>
                  </div>
                )}

                {punchState === 'error' && (
                  <div className={styles.alertBox} data-variant="warn" role="alert">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    <span>{punchError}</span>
                  </div>
                )}

                {punchState !== 'success' && punchState !== 'duplicate' && (
                  <button
                    id="punchBtn"
                    className={styles.punchBtn}
                    onClick={handlePunch}
                    disabled={punchState === 'loading' || punchState === 'nolocation'}
                    type="button"
                  >
                    {punchState === 'loading' ? (
                      <><span className={styles.btnSpinner} />Marking attendance&hellip;</>
                    ) : punchState === 'geofence' ? (
                      'Try Again'
                    ) : (
                      <>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        Punch Attendance
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
