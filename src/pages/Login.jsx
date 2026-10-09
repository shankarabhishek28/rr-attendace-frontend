import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginRequest } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import styles from './Login.module.css';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await loginRequest(employeeId.trim(), password);
      const { token, user } = res.data;
      login(token, user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err.response?.status === 401) {
        setError(err.response.data?.error || 'Invalid credentials');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>RR</span>
          <h1 className={styles.brandName}>R&amp;R Attendance</h1>
          <p className={styles.brandSub}>Reston Route Internal Portal</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label htmlFor="employeeId" className={styles.label}>
              Employee ID
            </label>
            <input
              id="employeeId"
              type="text"
              className={styles.input}
              placeholder="e.g. R&R001"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              autoComplete="username"
              required
              disabled={loading}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              type="password"
              className={styles.input}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              disabled={loading}
            />
          </div>

          {error && (
            <div className={styles.errorBanner} role="alert" aria-live="polite">
              <span className={styles.errorIcon}>&#x26A0;</span>
              {error}
            </div>
          )}

          <button
            id="loginSubmitBtn"
            type="submit"
            className={styles.submitBtn}
            disabled={loading || !employeeId || !password}
          >
            {loading ? (
              <span className={styles.spinner} aria-label="Signing in…" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className={styles.footNote}>
          For account issues, contact your HR administrator.
        </p>
      </div>
    </div>
  );
}
