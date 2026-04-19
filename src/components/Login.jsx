import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [userId, setUserId] = useState(''); // email or empId
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    
    // Direct DB verification (No Supabase Auth API)
    // Matches if input equals Email OR Employee ID (case insensitive using ilike)
    const { data: profile, error } = await supabase
       .from('staff')
       .select('*')
       .or(`email.ilike.${userId},employee_id.ilike.${userId}`)
       .eq('password', password)
       .single();

    if (error || !profile) {
       setErrorMsg('Invalid login credentials or account not found.');
       setLoading(false);
       return;
    }

    const mappedProfile = {
      id: profile.id,
      createdAt: profile.created_at,
      authId: profile.auth_id,
      employeeId: profile.employee_id,
      email: profile.email,
      password: profile.password,
      name: profile.name,
      department: profile.department,
      workplaceId: profile.workplace_id,
      role: profile.role,
      photoBase64: profile.photo_base64,
      faceDescriptor: profile.face_descriptor
    };

    // Role-based routing
    if (profile.role === 'admin') {
      sessionStorage.setItem('aats_admin_auth', 'true'); 
      sessionStorage.setItem('aats_current_admin', JSON.stringify(mappedProfile));
      navigate('/admin');
    } else {
      sessionStorage.setItem('aats_current_staff', JSON.stringify(mappedProfile));
      navigate('/staff/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8 border border-slate-100">
        <img src="/images/logo.png" alt="College Logo" className=" w-auto object-contain drop-shadow-md m-auto pb-5" />
        <h2 className="text-3xl font-bold text-center text-slate-900 mb-2">AATS Portal</h2>
        <p className="text-center text-slate-500 mb-8">Sign in with your Email or Employee ID</p>
        
        {errorMsg && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4">{errorMsg}</div>}
        
        <form onSubmit={handleLogin} className="space-y-5">
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email or Employee ID</label>
              <input type="text" required value={userId} onChange={e => setUserId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 outline-none"
                  placeholder="name@vnrvjiet.in or CSE-01" />
           </div>
           <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 outline-none"
                  placeholder="••••••••" />
           </div>
           
           <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors flex justify-center items-center gap-2">
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'Sign In'}
           </button>
        </form>
      </div>
    </div>
  );
};
export default Login;
