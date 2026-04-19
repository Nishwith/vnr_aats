import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Building2, Users, LayoutDashboard, LogOut, Menu, X, ScanFace } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const AdminLayout = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 flex justify-between items-start">
          <div className="flex items-center gap-3 mb-4 flex-col">
             <img src="/images/logo-w.png" alt="Logo" className="object-contain" />
             <div>
               <h2 className="text-xl font-bold text-white tracking-tight">AATS Admin</h2>
               <p className="text-xs text-slate-500 mt-0.5">Management Console</p>
             </div>
          </div>
          <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
          <NavLink 
            to="/admin" 
            end
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-blue-600 text-white font-medium shadow-lg shadow-blue-500/20' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard size={20} /> Dashboard
          </NavLink>
          <NavLink 
            to="/admin/workplaces" 
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-blue-600 text-white font-medium shadow-lg shadow-blue-500/20' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <Building2 size={20} /> Workplaces
          </NavLink>
          <NavLink 
            to="/admin/staff" 
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-blue-600 text-white font-medium shadow-lg shadow-blue-500/20' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <Users size={20} /> Staff
          </NavLink>
          
          <div className="my-2 border-t border-slate-800"></div>

          <NavLink 
            to="/admin/attendance" 
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all shadow-md border ${isActive ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 border-emerald-500/20'}`}
          >
            <ScanFace size={20} /> My Attendance
          </NavLink>
          <NavLink 
            to="/admin/profile" 
            className={({isActive}) => `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive ? 'bg-blue-600 text-white font-medium shadow-lg shadow-blue-500/20' : 'hover:bg-slate-800 hover:text-white'}`}
          >
            <Users size={20} /> My Profile
          </NavLink>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={() => { sessionStorage.clear(); navigate('/'); }} 
            className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-colors"
          >
            <LogOut size={20} /> Logout Admin
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-50 w-full relative">
        <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
           <div className="flex items-center justify-between gap-2">
              <img src="/images/logo-w.png" alt="Logo" className="object-contain h-30 w-28" />
              <span className="font-bold tracking-tight">AATS Admin</span>
           </div>
           <button onClick={() => setIsSidebarOpen(true)} className="p-1">
             <Menu size={24} />
           </button>
        </div>
        <div className="max-w-6xl mx-auto p-4 sm:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
