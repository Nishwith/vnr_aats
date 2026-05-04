import React, { useEffect, useState } from 'react';
import { getStaffStats, getWorkplaces, getTodaysAttendanceCount } from '../../store/database';
import { Users, Building2, CheckCircle2, Clock } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState({ totalStaff: 0, photosUploaded: 0, todaysAttendance: 0, absentsToday: 0, todaysPercentage: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const { totalStaff, photosUploaded } = await getStaffStats();
      const todayAttendanceCount = await getTodaysAttendanceCount();
      
      const absents = totalStaff - todayAttendanceCount;
      const percentage = totalStaff > 0 ? Math.round((todayAttendanceCount / totalStaff) * 100) : 0;

      setStats({
        totalStaff: totalStaff,
        photosUploaded: photosUploaded,
        todaysAttendance: todayAttendanceCount,
        absentsToday: absents < 0 ? 0 : absents,
        todaysPercentage: percentage
      });
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
        <p className="text-slate-500 mt-1">System status and key metrics at a glance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stat Cards */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform">
            <Users size={80} className="text-blue-500" />
          </div>
          <div className="flex flex-col relative z-10">
            <span className="text-sm font-medium text-slate-500">Total Staff</span>
            <span className="text-4xl font-bold text-slate-900 mt-2">{stats.totalStaff}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform">
            <Clock size={80} className="text-emerald-500" />
          </div>
          <div className="flex flex-col relative z-10">
            <span className="text-sm font-medium text-slate-500">Today Present</span>
            <span className="text-4xl font-bold text-emerald-600 mt-2">{stats.todaysAttendance}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform">
            <Clock size={80} className="text-rose-500" />
          </div>
          <div className="flex flex-col relative z-10">
            <span className="text-sm font-medium text-slate-500">Today Absent</span>
            <span className="text-4xl font-bold text-rose-600 mt-2">{stats.absentsToday}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-1/4 -translate-y-1/4 group-hover:scale-110 transition-transform">
            <CheckCircle2 size={80} className="text-indigo-500" />
          </div>
          <div className="flex flex-col relative z-10">
            <span className="text-sm font-medium text-slate-500">Attendance %</span>
            <span className="text-4xl font-bold text-indigo-600 mt-2">{stats.todaysPercentage}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
