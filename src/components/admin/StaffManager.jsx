import React, { useState, useEffect } from 'react';
import { getStaff, addStaff, deleteStaff, getWorkplaces, updateStaff, getAttendanceHistory, updateAttendanceRecord, getTodaysAttendanceRecords, getAllAttendanceLogs } from '../../store/database';
import { UserPlus, Image as ImageIcon, Camera, Trash2, UserMinus, Edit, Calendar, X, Save, Search, Loader2, Download } from 'lucide-react';

const StaffManager = () => {
  const [staff, setStaff] = useState([]);
  const [workplaces, setWorkplaces] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [attendanceViewRow, setAttendanceViewRow] = useState(null); 
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [todayRecords, setTodayRecords] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({});
  
  const [formState, setFormState] = useState({ employeeId: '', name: '', email: '', department: '', workplaceId: '', role: 'staff' });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterAttendance, setFilterAttendance] = useState('all'); // 'all', 'present', 'absent'
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 29);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const branches = ["CIVIL", "CSE", "CSBS", "AIDS", "CYS", "CSE-DS", "ECE", "EEE", "EIE", "ME", "AE", "CSE-IOT"];

  useEffect(() => {
    refreshData();
  }, [startDate, endDate]);

  const refreshData = async () => {
    setLoading(true);
    const [fetchedStaff, fetchedWorkplaces, todaysAtt, allAtt] = await Promise.all([
      getStaff(), 
      getWorkplaces(),
      getTodaysAttendanceRecords(),
      getAllAttendanceLogs()
    ]);
    
    setStaff(fetchedStaff);
    setWorkplaces(fetchedWorkplaces);
    setTodayRecords(todaysAtt);
    
    if (!formState.workplaceId && fetchedWorkplaces.length > 0) {
      setFormState(prev => ({...prev, workplaceId: fetchedWorkplaces[0].id}));
    }

    // Calculate Global Attendance Percentage & Today's presence dynamically based on custom date range
    const stats = {};
    const startTs = new Date(startDate).setHours(0,0,0,0);
    const endTs = new Date(endDate).setHours(23,59,59,999);
    const windowDays = Math.max(1, Math.floor((endTs - startTs) / (1000 * 60 * 60 * 24)) + 1);

    fetchedStaff.forEach(s => {
       const userLogs = allAtt.filter(a => {
           if (a.staff_id !== s.id) return false;
           const logTime = new Date(a.date).getTime();
           return logTime >= startTs && logTime <= endTs;
       });
       
       let daysScore = 0;
       userLogs.forEach(l => {
          if (l.morning) daysScore += 0.5;
          if (l.evening) daysScore += 0.5;
       });
       
       const percentage = Math.round((daysScore / windowDays) * 100) || 0;
       
       const todaysLog = todaysAtt.find(r => r.staffId === s.id);
       let todayAttScore = 0;
       if (todaysLog) {
           if (todaysLog.morning) todayAttScore += 0.5;
           if (todaysLog.evening) todayAttScore += 0.5;
       }
       stats[s.id] = { percentage, daysPresent: daysScore, todayAttScore, windowDays };
    });
    setAttendanceStats(stats);
    
    setLoading(false);
  };

  const openAdd = () => {
    setIsAdding(true);
    setEditingStaff(null);
    setFormState({ employeeId: '', name: '', email: '', department: '', workplaceId: workplaces[0]?.id || '', role: 'staff' });
  };

  const openEdit = (staffMember) => {
    setIsAdding(false);
    setEditingStaff(staffMember);
    setFormState({
      employeeId: staffMember.employeeId,
      name: staffMember.name,
      email: staffMember.email || '',
      department: staffMember.department,
      workplaceId: staffMember.workplaceId,
      role: staffMember.role || 'staff'
    });
  };

  const closeForm = () => {
    setIsAdding(false);
    setEditingStaff(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formState.workplaceId) {
      alert("Please select an Assigned Workplace! If the list is empty, navigate to 'Workplace Settings' to create one first.");
      return;
    }
    if (editingStaff) {
      await updateStaff(editingStaff.id, formState);
    } else {
      await addStaff({
        ...formState,
        photoBase64: null,
        faceDescriptor: null
      });
    }
    await refreshData();
    closeForm();
  };

  const handlePhotoUpload = (e, staffId) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        await updateStaff(staffId, { photoBase64: reader.result });
        await refreshData();
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = async (staffId) => {
    await updateStaff(staffId, { photoBase64: null, faceDescriptor: null });
    await refreshData();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this staff member permanently?")) {
      await deleteStaff(id);
      await refreshData();
    }
  };

  const openAttendance = (staffMember) => {
    setAttendanceViewRow(staffMember);
    loadAttendanceHistory(staffMember.id);
  };

  const loadAttendanceHistory = async (staffId) => {
    const hist = await getAttendanceHistory(staffId, 30);
    const generated = [];
    for(let i=0; i<30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const existing = hist.find(h => h.date === dateStr);
        generated.push({
            date: dateStr,
            morning: existing?.morning || null,
            evening: existing?.evening || null
        });
    }
    setAttendanceRecords(generated);
  };

  const toggleAttendance = async (dateStr, slot, currentValue) => {
    const newValue = currentValue ? null : new Date().toISOString(); 
    await updateAttendanceRecord(attendanceViewRow.id, dateStr, { [slot]: newValue });
    await loadAttendanceHistory(attendanceViewRow.id); // Reload individual stats
    await refreshData(); // Refresh global stats silently
  };

  const filteredStaff = staff.filter(s => {
    const matchDept = filterDepartment ? s.department === filterDepartment : true;
    const searchLower = searchQuery.toLowerCase();
    const matchSearch = s.name.toLowerCase().includes(searchLower) || s.employeeId.toLowerCase().includes(searchLower);
    
    let matchAtt = true;
    if (filterAttendance === 'absent') matchAtt = (attendanceStats[s.id]?.todayAttScore || 0) === 0;
    if (filterAttendance === 'present') matchAtt = (attendanceStats[s.id]?.todayAttScore || 0) > 0;

    return matchDept && matchSearch && matchAtt;
  });

  const handleExportCSV = () => {
    if (staff.length === 0) return;
    let csvContent = "Employee Name,Employee ID,Role,Branch,Date Range Tracking Days,Days Present,Overall Percentage\n";
    
    filteredStaff.forEach(s => {
       const stat = attendanceStats[s.id] || { daysPresent: 0, percentage: 0, windowDays: 0 };
       csvContent += `"${s.name}","${s.employeeId}","${s.role}","${s.department}","${stat.windowDays}","${stat.daysPresent}","${stat.percentage}%"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.setAttribute("download", `AATS_Export_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && staff.length === 0) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Staff Management</h1>
          <p className="text-slate-500 mt-1">Manage personnel, roles, and attendance records.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={handleExportCSV} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-5 py-2.5 rounded-xl transition-all font-bold border border-emerald-200">
            <Download size={18} /> Export CSV
          </button>
          <button 
            onClick={openAdd}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl transition-all shadow-md shadow-slate-900/10 font-medium"
          >
            <UserPlus size={18} /> Add Staff
          </button>
        </div>
      </div>

      {(isAdding || editingStaff) && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative mb-8">
          <button onClick={closeForm} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700">
             <X size={20} />
          </button>
          <h2 className="text-xl font-bold text-slate-800 mb-6 tracking-tight flex items-center gap-2">
            {isAdding ? <UserPlus className="text-blue-600"/> : <Edit className="text-blue-600"/>}
            {isAdding ? 'Register New Staff' : `Edit Staff: ${editingStaff.name}`}
          </h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input 
                  required type="text" value={formState.name} onChange={e => setFormState({...formState, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company Email</label>
                <input 
                  required type="email" value={formState.email} onChange={e => setFormState({...formState, email: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 lowercase" 
                  placeholder="name@vnrvjiet.in"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Employee ID</label>
                <input 
                  required type="text" value={formState.employeeId} onChange={e => setFormState({...formState, employeeId: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 uppercase" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                <select 
                  required value={formState.department} onChange={e => setFormState({...formState, department: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" 
                >
                  <option value="">Select Branch</option>
                  {branches.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">System Role</label>
                <select 
                  required value={formState.role} onChange={e => setFormState({...formState, role: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" 
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Assigned Workplace</label>
                <select 
                  required value={formState.workplaceId} onChange={e => setFormState({...formState, workplaceId: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" 
                >
                  <option value="">Select a Workplace</option>
                  {workplaces.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            </div>
            {isAdding && (
               <div className="bg-amber-50 text-amber-800 p-3 rounded-xl border border-amber-200 text-sm">
                 <strong className="font-semibold text-amber-900">Note:</strong> The default password for new staff is set to <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900 font-mono font-bold">vnrvjiet</code>. They can change it in their profile later.
               </div>
            )}
            <div className="pt-2 flex gap-3">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2">
                <Save size={18}/> {isAdding ? 'Save Staff' : 'Update Staff'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Attendance Modal overlay */}
      {attendanceViewRow && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                   <h2 className="text-xl font-bold flex items-center gap-2"><Calendar className="text-blue-600"/> Attendance History</h2>
                   <p className="text-slate-500 text-sm mt-1">{attendanceViewRow.name} ({attendanceViewRow.employeeId})</p>
                </div>
                <button onClick={() => setAttendanceViewRow(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
             </div>
             <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-3">
                   {attendanceRecords.map((rec, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-blue-300 transition-colors">
                         <span className="font-semibold text-slate-800 w-32 shrink-0">{rec.date}</span>
                         <div className="flex gap-4 mt-3 sm:mt-0">
                            {/* Morning */}
                            <button 
                               onClick={() => toggleAttendance(rec.date, 'morning', rec.morning)}
                               className={`px-4 py-2 rounded-xl text-sm font-medium flex-1 sm:flex-none transition-colors border ${rec.morning ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                               Morning: {rec.morning ? 'Present' : 'Absent'}
                            </button>
                            {/* Evening */}
                            <button 
                               onClick={() => toggleAttendance(rec.date, 'evening', rec.evening)}
                               className={`px-4 py-2 rounded-xl text-sm font-medium flex-1 sm:flex-none transition-colors border ${rec.evening ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                               Evening: {rec.evening ? 'Present' : 'Absent'}
                            </button>
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full relative">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
           <input 
             type="text" 
             placeholder="Search by staff name or employee ID..." 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
           />
        </div>
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-full md:w-auto">
             <span className="text-sm text-slate-500 font-medium shrink-0">Range:</span>
             <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-sm font-medium focus:outline-none w-32" />
             <span className="text-slate-300">-</span>
             <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-sm font-medium focus:outline-none w-32" />
          </div>
          <div className="flex gap-4 w-full md:w-auto">
            <select 
              value={filterAttendance} 
              onChange={e => setFilterAttendance(e.target.value)}
              className="w-full md:w-36 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="all">All Status</option>
              <option value="present">Today Present</option>
              <option value="absent">Today Absent</option>
            </select>
            <select 
              value={filterDepartment} 
              onChange={e => setFilterDepartment(e.target.value)}
              className="w-full md:w-36 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">All Branches</option>
              {branches.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Personnel Info</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600">Reference Photo</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.map(s => {
                const stat = attendanceStats[s.id] || {};
                return (
                 <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-5">
                    <div className="flex flex-col">
                        <div className="font-bold text-lg text-slate-900 flex items-center gap-2">
                           {s.name} 
                           {s.role === 'admin' && <span className="bg-slate-900 text-white text-xs px-2 py-0.5 rounded-full font-medium">Admin</span>}
                        </div>
                        <div className="text-sm font-mono text-slate-500 mt-0.5">{s.employeeId} • Branch: {s.department}</div>
                        <div className="text-xs mt-1.5 font-semibold">
                          Att: <span className={stat.percentage >= 75 ? 'text-emerald-600' : 'text-rose-600'}>{stat.percentage}%</span>
                          <span className="text-slate-300 mx-2">|</span>
                          Today: <span className={stat.todayAttScore === 1 ? 'text-emerald-600' : stat.todayAttScore === 0.5 ? 'text-amber-500' : 'text-rose-500'}>
                             {stat.todayAttScore === 1 ? 'Full Day' : stat.todayAttScore === 0.5 ? 'Half Day' : 'Absent'}
                          </span>
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    {s.photoBase64 ? (
                      <div className="flex items-center gap-3">
                        <img src={s.photoBase64} alt="Reference" className="w-12 h-12 rounded-full object-cover border-2 border-green-200 bg-green-50" />
                        <span className="text-xs font-medium text-green-700 flex items-center gap-1 bg-green-100 px-2 py-1 rounded-lg"><Camera size={12}/> Configured</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400">
                          <ImageIcon size={20} />
                        </div>
                        <span className="text-xs font-medium text-amber-700 flex items-center gap-1 bg-amber-100 px-2 py-1 rounded-lg">Missing</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center justify-end gap-2 flex-wrap max-w-[200px] ml-auto">
                      <button onClick={() => openAttendance(s)} className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium transition flex justify-center items-center gap-1.5 w-[calc(50%-0.25rem)]" title="Attendance">
                        <Calendar size={14}/> Att
                      </button>
                      <button onClick={() => openEdit(s)} className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium transition flex justify-center items-center gap-1.5 w-[calc(50%-0.25rem)]" title="Edit Details">
                        <Edit size={14}/> Edit
                      </button>
                      
                      {s.photoBase64 ? (
                        <button onClick={() => removePhoto(s.id)} className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-sm font-medium transition flex justify-center items-center gap-1.5 w-[calc(50%-0.25rem)]" title="Remove Photo">
                          <Trash2 size={14} /> Pic
                        </button>
                      ) : (
                        <label className="cursor-pointer px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-sm font-medium transition flex justify-center items-center gap-1.5 w-[calc(50%-0.25rem)]" title="Upload Photo">
                           <Camera size={14} /> Pic
                           <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, s.id)} />
                        </label>
                      )}
                      
                      <button onClick={() => handleDelete(s.id)} className="px-3 py-1.5 bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-700 rounded-lg text-sm font-medium transition flex justify-center items-center gap-1.5 w-[calc(50%-0.25rem)]" title="Delete Staff">
                         <UserMinus size={14} /> Del
                      </button>
                    </div>
                  </td>
                 </tr>
                )}
              )}
              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan="3" className="px-6 py-12 text-center text-slate-500 bg-slate-50/50">
                    <UserPlus className="mx-auto h-12 w-12 text-slate-300 mb-3" />
                    {staff.length === 0 ? "No staff registered yet. Add one to get started." : "No staff match your search criteria."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StaffManager;
