import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AttendanceSection from '../components/AttendanceSection';
import LeaveSection from '../components/LeaveSection';
import AttendanceHistory from '../components/AttendanceHistory';
import AdminLeaveQueue from '../components/AdminLeaveQueue';
import AdminAttendance from '../components/AdminAttendance';
import AdminAttendanceHistory from '../components/AdminAttendanceHistory';
import AdminSummary from '../components/AdminSummary';
import CreateEmployee from '../components/CreateEmployee';
import styles from './Dashboard.module.css';

const ROLE_LABELS = {
  admin: 'Administrator',
  hr: 'HR Manager',
  employee: 'Employee',
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const roleLabel = ROLE_LABELS[user?.role] ?? user?.role;
  const isAdmin = user?.role === 'admin';

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.headerBrand}>R&amp;R Attendance</span>
        <button
          id="logoutBtn"
          className={styles.logoutBtn}
          onClick={handleLogout}
          type="button"
        >
          Sign Out
        </button>
      </header>

      <main className={styles.main}>
        <div className={styles.welcomeCard}>
          <div className={styles.avatar}>{user?.name?.[0] ?? '?'}</div>
          <div className={styles.welcomeText}>
            <p className={styles.greeting}>Welcome back,</p>
            <h1 className={styles.userName}>{user?.name}</h1>
          </div>
        </div>

        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <span className={styles.infoLabel}>Employee ID</span>
            <span className={styles.infoValue}>{user?.employeeId}</span>
          </div>
          <div className={styles.infoCard}>
            <span className={styles.infoLabel}>Role</span>
            <span className={`${styles.infoValue} ${styles.roleBadge}`} data-role={user?.role}>
              {roleLabel}
            </span>
          </div>
        </div>

        {/* Employee/HR: Punch In/Out section */}
        {!isAdmin && <AttendanceSection />}

        {/* Employee/HR: Leave application */}
        {!isAdmin && <LeaveSection />}

        {/* Employee/HR: Own attendance history */}
        {!isAdmin && <AttendanceHistory />}

        {/* Admin: Today's attendance snapshot */}
        {isAdmin && <AdminAttendance />}

        {/* Admin: Attendance history (all employees) */}
        {isAdmin && <AdminAttendanceHistory />}

        {/* Admin: Employee summary */}
        {isAdmin && <AdminSummary />}

        {/* Admin: Leave approval queue */}
        {isAdmin && <AdminLeaveQueue />}

        {/* Admin: Create employee */}
        {isAdmin && <CreateEmployee />}
      </main>
    </div>
  );
}
