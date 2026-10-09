import { useState } from 'react';
import api from '../api/auth';
import styles from './CreateEmployee.module.css';

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Employee' },
  { value: 'hr', label: 'HR Manager' },
  { value: 'admin', label: 'Administrator' },
];

function SuccessBanner({ result, password, onDismiss }) {
  const [copied, setCopied] = useState(false);

  const credentials = `Employee ID: ${result.employeeId}\nPassword: ${password}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(credentials);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: do nothing
    }
  };

  return (
    <div className={styles.successBanner} role="status" aria-live="polite">
      <div className={styles.successIcon}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <div className={styles.successBody}>
        <p className={styles.successHeadline}>
          Employee account created!
        </p>
        <p className={styles.successSub}>
          Share these credentials with <strong>{result.name}</strong> — this is the only time they appear.
        </p>
        <div className={styles.credBox}>
          <div className={styles.credRow}>
            <span className={styles.credLabel}>Employee ID</span>
            <span className={styles.credValue} id="createdEmployeeId">{result.employeeId}</span>
          </div>
          <div className={styles.credRow}>
            <span className={styles.credLabel}>Password</span>
            <span className={styles.credValue}>{password}</span>
          </div>
          <div className={styles.credRow}>
            <span className={styles.credLabel}>Role</span>
            <span className={styles.credValue} style={{ textTransform: 'capitalize' }}>{result.role}</span>
          </div>
        </div>
        <div className={styles.successActions}>
          <button
            id="copyCredentialsBtn"
            type="button"
            className={styles.copyBtn}
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copy Credentials
              </>
            )}
          </button>
          <button
            id="createAnotherBtn"
            type="button"
            className={styles.anotherBtn}
            onClick={onDismiss}
          >
            Create Another
          </button>
        </div>
      </div>
    </div>
  );
}

const INITIAL_FORM = { name: '', email: '', role: 'employee', password: '' };

export default function CreateEmployee() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [successResult, setSuccessResult] = useState(null); // { employeeId, name, role }
  const [lastPassword, setLastPassword] = useState('');

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address';
    if (!form.role) errs.role = 'Role is required';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    return errs;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post('/api/admin/employees', {
        name: form.name.trim(),
        email: form.email.trim(),
        role: form.role,
        password: form.password,
      });
      setLastPassword(form.password);
      setSuccessResult(res.data.employee);
      setForm(INITIAL_FORM);
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error;
      if (status === 409) {
        setError(msg || 'An account with this email already exists');
      } else if (status === 400) {
        setError(msg || 'Please fill in all required fields');
      } else if (status === 403) {
        setError(msg || 'Only admins can create employee accounts');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDismiss = () => {
    setSuccessResult(null);
    setLastPassword('');
  };

  return (
    <section className={styles.section} aria-label="Create employee account">
      <div className={styles.sectionHeader}>
        <div className={styles.sectionIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <line x1="19" y1="8" x2="19" y2="14" />
            <line x1="22" y1="11" x2="16" y2="11" />
          </svg>
        </div>
        <div>
          <h2 className={styles.sectionTitle}>Create Employee Account</h2>
          <p className={styles.sectionSub}>Add a new employee, HR, or admin account to the system</p>
        </div>
      </div>

      <div className={styles.body}>
        {successResult ? (
          <SuccessBanner result={successResult} password={lastPassword} onDismiss={handleDismiss} />
        ) : (
          <form
            id="createEmployeeForm"
            className={styles.form}
            onSubmit={handleSubmit}
            noValidate
          >
            {error && (
              <div className={styles.formError} role="alert" id="createEmployeeError">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="emp-name">Full Name</label>
                <input
                  id="emp-name"
                  name="name"
                  type="text"
                  className={`${styles.input} ${fieldErrors.name ? styles.inputError : ''}`}
                  placeholder="e.g. Priya Singh"
                  value={form.name}
                  onChange={handleChange}
                  autoComplete="off"
                  disabled={submitting}
                />
                {fieldErrors.name && <span className={styles.fieldError}>{fieldErrors.name}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="emp-email">Work Email</label>
                <input
                  id="emp-email"
                  name="email"
                  type="email"
                  className={`${styles.input} ${fieldErrors.email ? styles.inputError : ''}`}
                  placeholder="e.g. priya@restonroute.com"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="off"
                  disabled={submitting}
                />
                {fieldErrors.email && <span className={styles.fieldError}>{fieldErrors.email}</span>}
              </div>
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="emp-role">Role</label>
                <div className={styles.selectWrap}>
                  <select
                    id="emp-role"
                    name="role"
                    className={`${styles.input} ${styles.select} ${fieldErrors.role ? styles.inputError : ''}`}
                    value={form.role}
                    onChange={handleChange}
                    disabled={submitting}
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <span className={styles.selectChevron}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </div>
                {fieldErrors.role && <span className={styles.fieldError}>{fieldErrors.role}</span>}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="emp-password">
                  Temporary Password
                  <span className={styles.labelHint}>(share with employee)</span>
                </label>
                <input
                  id="emp-password"
                  name="password"
                  type="text"
                  className={`${styles.input} ${fieldErrors.password ? styles.inputError : ''}`}
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="off"
                  disabled={submitting}
                />
                {fieldErrors.password && <span className={styles.fieldError}>{fieldErrors.password}</span>}
              </div>
            </div>

            <div className={styles.formFooter}>
              <p className={styles.footerNote}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                The Employee ID is generated automatically — copy it from the confirmation screen.
              </p>
              <button
                id="submitCreateEmployeeBtn"
                type="submit"
                className={styles.submitBtn}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className={styles.btnSpinner} />
                    Creating
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    Create Account
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
