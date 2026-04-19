import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getAttendanceHistory, updateStaff } from '../../store/database';
import { ChevronLeft, KeyRound, Loader2, Calendar, Target, Activity, Clock, ShieldAlert } from 'lucide-react';

const StaffProfile = ({ adminEmbed = false }) => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [history, setHistory] = useState([]);
  const [stats, setStats] = useState({ percentage: 0, totalDays: 0, presentDays: 0, absentDays: 0 });
  const [password, setPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    const initProfile = async () => {
      let staffStr = sessionStorage.getItem('aats_current_staff');
      if (!staffStr && adminEmbed) {
         staffStr = sessionStorage.getItem('aats_current_admin');
      }
      
      if (!staffStr) {
        navigate('/');
        return;
      }
      const staffData = JSON.parse(staffStr);
      setStaff(staffData);
      
      const rawHistory = await getAttendanceHistory(staffData.id, 30);
      const generated = [];
      let presentCount = 0;
      
      // Synthesize timeline blocks exactly tied to employment days
      for(let i=0; i<30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        
        const existing = rawHistory.find(h => h.date === dateStr);
        let dayScore = 0;
        if (existing?.morning) dayScore += 0.5;
        if (existing?.evening) dayScore += 0.5;
        
        presentCount += dayScore;
        
        generated.push({
           date: dateStr,
           dateShort: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
           dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
           isPresent: dayScore > 0,
           isFullDay: dayScore === 1,
           isHalfDay: dayScore === 0.5,
           morning: existing?.morning,
           evening: existing?.evening
        });
      }
      
      setHistory(generated);
      setStats({
         percentage: Math.round((presentCount / 30) * 100),
         totalDays: 30,
         presentDays: presentCount,
         absentDays: 30 - presentCount
      });
    };
    initProfile();
  }, [navigate]);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (password.length < 6) return;
    setIsUpdating(true);
    setMessage({ type: '', text: '' });

    try {
      await updateStaff(staff.id, { password });
      
      const updatedStaff = { ...staff, password };
      sessionStorage.setItem('aats_current_staff', JSON.stringify(updatedStaff));
      setStaff(updatedStaff);

      setMessage({ type: 'success', text: 'Password successfully updated!' });
      setPassword('');
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update password.' });
    }
    setIsUpdating(false);
  };

  if (!staff) return <div className="flex h-screen w-screen items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600 mb-4" size={48} /></div>;

  return (
    <div className={`${adminEmbed ? 'pb-10 pt-2 w-full' : 'min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8'}`}>
      <div className={`${adminEmbed ? 'w-full' : 'max-w-4xl mx-auto'} space-y-6`}>
        
        {/* Header navigation */}
        {!adminEmbed && (
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <Link to="/staff/dashboard" className="inline-flex items-center text-slate-500 hover:text-slate-900 font-medium transition-colors bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
              <ChevronLeft size={20} className="mr-1" /> Back to Workspace
            </Link>
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-800 text-lg tracking-tight">AATS Profile</span>
            </div>
          </div>
        )}
        
        {/* Profile Identity Banner */}
        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 flex flex-col md:flex-row items-center gap-8 shadow-sm relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-100 to-transparent rounded-full opacity-50 transform translate-x-1/4 -translate-y-1/4 pointer-events-none"></div>
           
           <div className="relative z-10 shrink-0">
             {staff.photoBase64 ? (
               <div className="relative">
                 <img src={staff.photoBase64} className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl" alt="Profile" />
                 <div className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 border-2 border-white rounded-full"></div>
               </div>
             ) : (
               <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center text-4xl font-bold shadow-xl">
                 {staff.name.substring(0,2)}
               </div>
             )}
           </div>
           
           <div className="text-center md:text-left relative z-10 flex-1">
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">{staff.name}</h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-3">
                 <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-sm font-semibold font-mono border border-slate-200">ID: {staff.employeeId}</span>
                 <span className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-sm font-semibold border border-indigo-100">Branch: {staff.department}</span>
                 <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-sm font-semibold border border-emerald-100 capitalize">Role: {staff.role}</span>
              </div>
           </div>
        </div>

        {/* Analytics Ribbon */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5 hover:-translate-y-1 transition-transform">
              <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><Activity size={28} /></div>
              <div>
                 <p className="text-sm font-bold text-slate-400 tracking-wide uppercase">30-Day Rate</p>
                 <p className="text-3xl font-black text-slate-900 mt-1">{stats.percentage}<span className="text-xl text-slate-400">%</span></p>
              </div>
           </div>
           <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5 hover:-translate-y-1 transition-transform">
              <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><Target size={28} /></div>
              <div>
                 <p className="text-sm font-bold text-slate-400 tracking-wide uppercase">Days Present</p>
                 <p className="text-3xl font-black text-slate-900 mt-1">{stats.presentDays}</p>
              </div>
           </div>
           <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-5 hover:-translate-y-1 transition-transform">
              <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl"><ShieldAlert size={28} /></div>
              <div>
                 <p className="text-sm font-bold text-slate-400 tracking-wide uppercase">Days Absent</p>
                 <p className="text-3xl font-black text-slate-900 mt-1">{stats.absentDays}</p>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* Visualizer Heatmap */}
           <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 flex items-center gap-2"><Calendar className="text-blue-500" size={24}/> Activity Visualizer</h3>
                <span className="text-sm font-medium text-slate-400">Last 30 Days Timeline</span>
             </div>
             
             <div className="grid grid-cols-6 sm:grid-cols-10 gap-3">
               {history.slice().reverse().map((day, idx) => (
                 <div key={idx} className="group relative">
                   {/* Heatmap Block */}
                   <div className={`aspect-square rounded-xl transition-all duration-300 transform group-hover:scale-110 group-hover:shadow-md cursor-pointer border flex flex-col items-center justify-center p-1 
                      ${day.isFullDay ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 border-emerald-600/20' : day.isHalfDay ? 'bg-gradient-to-br from-amber-400 to-amber-500 border-amber-600/20' : 'bg-slate-100 border-slate-200'}`}>
                      <span className={`text-[10px] font-bold ${day.isPresent ? 'text-white/80' : 'text-slate-400'}`}>{day.dateShort.split(' ')[1]}</span>
                   </div>
                   
                   {/* Tooltip */}
                   <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-slate-900 text-white text-xs font-medium px-3 py-2 rounded-lg opacity-0 invisible group-hover:visible group-hover:opacity-100 transition-all z-20 shadow-xl pointer-events-none">
                      <p className="font-bold border-b border-slate-700 pb-1 mb-1">{day.dayName}, {day.dateShort}</p>
                      {day.isPresent ? (
                        <>
                          {day.morning && <p className="text-emerald-300">AM: {new Date(day.morning).toLocaleTimeString()}</p>}
                          {day.evening && <p className="text-blue-300">PM: {new Date(day.evening).toLocaleTimeString()}</p>}
                        </>
                      ) : (
                        <p className="text-rose-300">Absent / No Record</p>
                      )}
                   </div>
                 </div>
               ))}
             </div>
             <div className="mt-8 flex items-center gap-4 text-sm font-medium text-slate-500 border-t border-slate-100 pt-6">
                <span>Legend:</span>
                <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-md bg-gradient-to-br from-emerald-400 to-emerald-500 border border-emerald-600/20"></div> Full Day</div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-md bg-gradient-to-br from-amber-400 to-amber-500 border border-amber-600/20"></div> Half Day</div>
                <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded-md bg-slate-100 border border-slate-200"></div> Absent</div>
             </div>
           </div>

           {/* Security Settings Area */}
           <div className="bg-slate-900 rounded-3xl p-8 shadow-xl text-white relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 opacity-20 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
              
              <div className="relative z-10">
                <h3 className="font-bold text-2xl mb-2 flex items-center gap-3 tracking-tight"><KeyRound className="text-blue-400" size={28}/> Security</h3>
                <p className="text-slate-400 text-sm mb-8">Update your login credentials locally.</p>
                
                <form onSubmit={handlePasswordUpdate}>
                   {message.text && (
                     <div className={`p-4 mb-6 rounded-xl text-sm font-medium border ${message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-200' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'}`}>
                       {message.text}
                     </div>
                   )}
                   <div className="mb-6 space-y-4">
                     <div>
                       <label className="block text-sm font-semibold text-slate-300 mb-2">New Password</label>
                       <input type="password" required value={password} onChange={e => setPassword(e.target.value)} minLength={6} placeholder="Enter at least 6 characters"
                         className="w-full px-5 py-3.5 rounded-xl bg-slate-800/80 border border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 outline-none text-white placeholder-slate-500 transition-all" />
                     </div>
                   </div>
                   <button type="submit" disabled={isUpdating} className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2">
                     {isUpdating ? <Loader2 size={18} className="animate-spin" /> : <ShieldAlert size={18} />} 
                     {isUpdating ? 'Encrypting...' : 'Update Password'}
                   </button>
                </form>
              </div>
           </div>
           
        </div>
      </div>
    </div>
  );
};

export default StaffProfile;
