import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout(): void {
    logout();
    navigate('/login');
  }

  return (
    <nav className="bg-blue-700 text-white px-4 py-3 flex items-center justify-between shadow">
      <Link to="/dashboard" className="text-lg font-bold tracking-tight">
        Submission Tracker
      </Link>
      {user && (
        <div className="flex items-center gap-4">
          <span className="text-sm opacity-80 hidden sm:block">{user.name}</span>
          <button
            onClick={handleLogout}
            className="text-sm bg-blue-800 hover:bg-blue-900 px-3 py-1 rounded"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
