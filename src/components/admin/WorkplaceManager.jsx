import React, { useState, useEffect } from 'react';
import { getWorkplaces, updateWorkplace, addWorkplace } from '../../store/database';
import { MapPin, Clock, Save, Loader2 } from 'lucide-react';

const WorkplaceManager = () => {
  const [workplaceId, setWorkplaceId] = useState(null);
  const [workplace, setWorkplace] = useState({ 
    name: '', latitude: '', longitude: '', radiusMeters: 500,
    timeConfig: { morningStart: 8, morningEnd: 10, eveningStart: 16, eveningEnd: 18, minGapHours: 6 }
  });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      const wps = await getWorkplaces();
      if (!active) return;
      
      if (wps.length > 0) {
        setWorkplaceId(wps[0].id);
        setWorkplace(wps[0]);
      } else {
        const defaultWp = {
          name: 'Main Office',
          latitude: 17.5388,
          longitude: 78.3863,
          radiusMeters: 500,
          timeConfig: { morningStart: 8, morningEnd: 10, eveningStart: 16, eveningEnd: 18, minGapHours: 6 }
        };
        await addWorkplace(defaultWp);
        if (!active) return; 
        const updatedWps = await getWorkplaces();
        if (updatedWps.length > 0) {
           setWorkplaceId(updatedWps[0].id);
           setWorkplace(updatedWps[0]);
        }
      }
      setLoading(false);
    };
    fetchData();
    
    return () => {
      active = false;
    };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (workplaceId) {
      await updateWorkplace(workplaceId, {
        name: workplace.name,
        latitude: parseFloat(workplace.latitude),
        longitude: parseFloat(workplace.longitude),
        radiusMeters: parseInt(workplace.radiusMeters, 10),
        timeConfig: workplace.timeConfig
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const updateTimeConfig = (field, value) => {
    setWorkplace(prev => ({
      ...prev,
      timeConfig: {
        ...prev.timeConfig,
        [field]: parseInt(value, 10) || 0
      }
    }));
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Workplace Settings</h1>
        <p className="text-slate-500 mt-1">Configure geo-fencing borders and attendance time windows.</p>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-200">
        <form onSubmit={handleSave} className="space-y-8">
          {/* General Info */}
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><MapPin className="text-blue-500" size={18}/> Location Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Workplace Name</label>
                <input 
                  required type="text" value={workplace.name} onChange={e => setWorkplace({...workplace, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-medium" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Center Latitude</label>
                <input 
                  required type="number" step="any" value={workplace.latitude} onChange={e => setWorkplace({...workplace, latitude: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Center Longitude</label>
                <input 
                  required type="number" step="any" value={workplace.longitude} onChange={e => setWorkplace({...workplace, longitude: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Allowed Radius (Meters)</label>
                <div className="flex items-center gap-4">
                  <input 
                    required type="range" min="50" max="2000" step="10" value={workplace.radiusMeters} onChange={e => setWorkplace({...workplace, radiusMeters: e.target.value})}
                    className="flex-1 accent-blue-600" 
                  />
                  <span className="w-20 text-center font-bold text-slate-700 bg-slate-100 py-2 rounded-lg">{workplace.radiusMeters}m</span>
                </div>
              </div>
            </div>
          </div>

          {/* Time Restrictions */}
          <div className="pt-6 border-t border-slate-100">
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Clock className="text-indigo-500" size={18}/> Time Slots (24H Format)</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100">
                  <h4 className="font-semibold text-blue-900 mb-3">Morning Punch-In</h4>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs text-blue-700 mb-1">Start Hour</label>
                      <input required type="number" min="0" max="23" value={workplace.timeConfig?.morningStart ?? 8} onChange={e => updateTimeConfig('morningStart', e.target.value)} className="w-full bg-white border border-blue-200 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500 font-mono" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-blue-700 mb-1">End Hour</label>
                      <input required type="number" min="0" max="23" value={workplace.timeConfig?.morningEnd ?? 10} onChange={e => updateTimeConfig('morningEnd', e.target.value)} className="w-full bg-white border border-blue-200 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-500 font-mono" />
                    </div>
                  </div>
                </div>

                <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100">
                  <h4 className="font-semibold text-indigo-900 mb-3">Evening Punch-Out</h4>
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs text-indigo-700 mb-1">Start Hour</label>
                      <input required type="number" min="0" max="23" value={workplace.timeConfig?.eveningStart ?? 16} onChange={e => updateTimeConfig('eveningStart', e.target.value)} className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500 font-mono" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-indigo-700 mb-1">End Hour</label>
                      <input required type="number" min="0" max="23" value={workplace.timeConfig?.eveningEnd ?? 18} onChange={e => updateTimeConfig('eveningEnd', e.target.value)} className="w-full bg-white border border-indigo-200 rounded-xl px-4 py-2 focus:outline-none focus:border-indigo-500 font-mono" />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-emerald-900">Minimum Gap Requirement</h4>
                    <p className="text-sm text-emerald-700 mt-1">Hours required between morning and evening punches to be valid.</p>
                  </div>
                  <div className="w-32">
                    <div className="flex items-center gap-2">
                      <input required type="number" min="0" max="24" value={workplace.timeConfig?.minGapHours ?? 6} onChange={e => updateTimeConfig('minGapHours', e.target.value)} className="w-full bg-white border border-emerald-200 text-emerald-900 rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500 font-bold text-center text-lg" />
                      <span className="text-emerald-800 font-medium">Hrs</span>
                    </div>
                  </div>
                </div>
             </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-4">
            {saved && <span className="text-emerald-600 font-medium flex items-center gap-2">Settings Saved Successfully!</span>}
            <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-8 py-3 rounded-xl shadow-lg shadow-slate-900/20 transition-all flex items-center gap-2">
              <Save size={18}/> Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkplaceManager;
