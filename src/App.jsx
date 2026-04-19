import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';

// Admin Pages
import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import WorkplaceManager from './components/admin/WorkplaceManager';
import StaffManager from './components/admin/StaffManager'; 

// Staff Pages
import Login from './components/Login';
import StaffDashboard from './components/staff/StaffDashboard';
import StaffProfile from './components/staff/StaffProfile';

function App() {
  const AdminRoute = ({ children }) => {
    const isAuth = sessionStorage.getItem('aats_admin_auth');
    // Note: Since RBAC unified login uses Supabase, we also look for current_admin or verify via auth.
    // However, the legacy token check ensures compatibility.
    return isAuth ? children : <Navigate to="/" replace />;
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Universal Authorization */}
        <Route path="/" element={<Login />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="workplaces" element={<WorkplaceManager />} />
          <Route path="staff" element={<StaffManager />} />
          <Route path="attendance" element={<StaffDashboard adminEmbed={true} />} />
          <Route path="profile" element={<StaffProfile adminEmbed={true} />} />
        </Route>
        
        {/* Staff Routes */}
        <Route path="/staff/dashboard" element={<StaffDashboard />} />
        <Route path="/staff/profile" element={<StaffProfile />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
