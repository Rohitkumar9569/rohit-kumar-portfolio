import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // 1. Import auth hooks
import ExamManager from '../components/admin/ExamManager';
import SubjectManager from '../components/admin/SubjectManager';
import PyqManager from '../components/admin/PyqManager';

const AdminPage: React.FC = () => {
  const { logout } = useAuth(); // 2. Get the logout function
  const navigate = useNavigate();

  // 3. Create the logout handler
  const handleLogout = () => {
    logout();
    navigate('/'); // Redirect to homepage after logout
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-cyan-400">Admin Dashboard</h1>
            <p className="text-slate-400 mt-2">Manage all aspects of the Study Hub from here.</p>
          </div>
          {/* 4. Add the Logout button */}
          <button
            onClick={handleLogout}
            className="bg-slate-700 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-md transition-colors"
          >
            Logout
          </button>
        </header>

        <main className="space-y-8">
          <ExamManager />
          <SubjectManager />
          <PyqManager />
        </main>
      </div>
    </div>
  );
};

export default AdminPage;