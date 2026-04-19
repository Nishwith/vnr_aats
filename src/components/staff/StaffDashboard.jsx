import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWorkplaces, getStaffAttendanceToday, markAttendance, getStaffByEmployeeId } from '../../store/database';
import { isAttendanceAllowed, SLOT_MORNING, SLOT_EVENING } from '../../utils/timeWindow';
import { verifyGeofence } from '../../utils/geolocation';
import { loadModels, getFaceDescriptorFromImage, processVideoFrame } from '../../utils/faceAuth';
import * as faceapi from 'face-api.js';
import { supabase } from '../../lib/supabase';
import { Clock, MapPin, ScanFace, CheckCircle2, ChevronRight, Loader2, AlertTriangle, ShieldCheck, User } from 'lucide-react';

const StaffDashboard = ({ adminEmbed = false }) => {
  const navigate = useNavigate();
  const [staff, setStaff] = useState(null);
  const [workplace, setWorkplace] = useState(null);
  const [attendanceToday, setAttendanceToday] = useState(null);
  const [step, setStep] = useState(1); // 1: Time, 2: Geo, 3: Face
  
  // State for modules
  const [timeStatus, setTimeStatus] = useState({ loading: true, allowed: false, slot: null, reason: '' });
  const [geoStatus, setGeoStatus] = useState({ loading: false, allowed: false, distance: null, message: '' });
  
  // Face API State
  const [faceStatus, setFaceStatus] = useState({ loading: false, modelsLoaded: false, step: 'init', message: 'Loading Face AI...' });
  const [blinkDetected, setBlinkDetected] = useState(false);
  const [faceMatched, setFaceMatched] = useState(false);
  const [finalSuccess, setFinalSuccess] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const requestRef = useRef(null);
  const referenceDescriptorRef = useRef(null);

  // Initialization
  useEffect(() => {
    const initData = async () => {
      // Allow fallback to admin session if being embedded in admin view
      let staffDataStr = sessionStorage.getItem('aats_current_staff');
      if (!staffDataStr && adminEmbed) {
         staffDataStr = sessionStorage.getItem('aats_current_admin');
      }
      
      if (!staffDataStr) {
        navigate('/');
        return;
      }
      const staffData = JSON.parse(staffDataStr);
      
      // We fetch fresh staff data to get updated photo descriptors
      const freshStaffData = await getStaffByEmployeeId(staffData.employeeId);
      setStaff(freshStaffData);
      
      const workplaces = await getWorkplaces();
      const staffWorkplace = workplaces.find(w => w.id === staffData.workplaceId);
      setWorkplace(staffWorkplace);

      const record = await getStaffAttendanceToday(staffData.id);
      setAttendanceToday(record);

      // Initial Time Check passing the specific workplace config
      const timeCheck = isAttendanceAllowed(record, staffWorkplace?.timeConfig);
      setTimeStatus({
        loading: false,
        allowed: timeCheck.allowed,
        slot: timeCheck.slot,
        reason: timeCheck.reason
      });
    };
    initData();
  }, [navigate]);

  // Handle Geo Verification
  const runGeoVerification = async () => {
    if (!workplace) return;
    setStep(2);
    setGeoStatus({ loading: true, allowed: false, message: 'Verifying location via GPS...' });
    
    try {
      const result = await verifyGeofence(workplace.latitude, workplace.longitude, workplace.radiusMeters);
      setGeoStatus({
        loading: false,
        allowed: result.inGeofence,
        distance: result.distance,
        message: result.inGeofence ? `Verified. You are ${result.distance}m from campus center.` : result.message
      });
      if (result.inGeofence) {
        setTimeout(() => prepareFaceVerification(), 1500);
      }
    } catch (err) {
      setGeoStatus({ loading: false, allowed: false, message: err.message });
    }
  };

  // Handle Face Verification Setup
  const prepareFaceVerification = async () => {
    setStep(3);
    setFaceStatus({ loading: true, modelsLoaded: false, step: 'loading_models', message: 'Loading Neural Networks...' });
    
    const modelsLoaded = await loadModels();
    if (!modelsLoaded) {
      setFaceStatus({ loading: false, modelsLoaded: false, step: 'error', message: 'Failed to load face detection models. Are they placed in /public/models?' });
      return;
    }

    if (!staff.photoBase64) {
      setFaceStatus({ loading: false, modelsLoaded: true, step: 'error', message: 'No reference photo found. Admin must configure your reference photo.' });
      return;
    }

    setFaceStatus(prev => ({ ...prev, message: 'Processing your reference photo...'}));
    
    // Extract descriptor from saved base64 image (since mockDB doesn't persist Float32Arrays well)
    const img = new Image();
    img.src = staff.photoBase64;
    await new Promise(r => { img.onload = r });
    const descriptor = await getFaceDescriptorFromImage(img);
    
    if (!descriptor) {
      setFaceStatus({ loading: false, modelsLoaded: true, step: 'error', message: 'Could not detect a clear face in your reference photo. Admin must re-upload.' });
      return;
    }
    
    referenceDescriptorRef.current = descriptor;
    setFaceStatus({ loading: false, modelsLoaded: true, step: 'ready', message: 'Ready for Live Verification' });
    startCamera();
  };

  const startCamera = async () => {
    try {
      // Lowering the video resolution significantly improves face-api.js scanning speed
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (err) {
      setFaceStatus(prev => ({...prev, step: 'error', message: 'Camera access denied or unavailable.'}));
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
  };

  // The rendering frame loop
  const handleVideoPlay = () => {
    setFaceStatus(prev => ({...prev, step: 'analyzing', message: 'Please face the camera and blink once.'}));
    
    let isCurrentlyMatching = false;
    let hasBlinkedWhileMatching = false;

    const analyzeFrame = async () => {
      if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended && canvasRef.current && referenceDescriptorRef.current) {
        
        // Ensure canvas matches video dims
        const videoDims = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
        if (canvasRef.current.width !== videoDims.width) {
          faceapi.matchDimensions(canvasRef.current, videoDims);
        }

        const result = await processVideoFrame(videoRef.current, referenceDescriptorRef.current);
        
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        if (result && result.detection) {
           const resizedDets = faceapi.resizeResults(result.detection, videoDims);
           
           if (result.isMatch) {
              isCurrentlyMatching = true;
              setFaceMatched(true);
              
              if (result.isBlinking) {
                 hasBlinkedWhileMatching = true;
                 setBlinkDetected(true);
              }
           } else {
              isCurrentlyMatching = false;
              hasBlinkedWhileMatching = false;
              setFaceMatched(false);
              setBlinkDetected(false);
           }
           
           // Draw bounding box
           const boxColor = result.isMatch ? (hasBlinkedWhileMatching ? 'rgba(16, 185, 129, 0.8)' : 'rgba(59, 130, 246, 0.8)') : 'rgba(239, 68, 68, 0.8)';
           const drawBox = new faceapi.draw.DrawBox(resizedDets.detection.box, { boxColor, lineWidth: 3 });
           drawBox.draw(canvasRef.current);

           // Completion Logic - Needs both Match AND Blink History securely tracked
           if (isCurrentlyMatching && hasBlinkedWhileMatching) {
             stopCamera();
             finalizeAttendance();
             return; // Stop loop
           }
        } else {
           isCurrentlyMatching = false;
           hasBlinkedWhileMatching = false;
           setFaceMatched(false);
           setBlinkDetected(false);
        }
      }
      
      // Re-queue with a small delay to prevent CPU pegging and UI freeze
      setTimeout(() => {
        requestRef.current = requestAnimationFrame(analyzeFrame);
      }, 150);
    };

    analyzeFrame();
  };

  useEffect(() => {
    return () => stopCamera(); // Cleanup unmount
  }, []);

  const finalizeAttendance = async () => {
     setFaceStatus(prev => ({...prev, step: 'success', message: 'Identity & Liveness Verified!'}));
     setFinalSuccess(true);
     await markAttendance(staff.id, timeStatus.slot);
     const updatedRecord = await getStaffAttendanceToday(staff.id);
     setAttendanceToday(updatedRecord);
  };

  if (!staff) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={32} /></div>;

  return (
    <div className={`${adminEmbed ? 'pb-10 pt-2 w-full' : 'min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8'}`}>
      <div className={`${adminEmbed ? 'w-full' : 'max-w-5xl mx-auto'} space-y-10`}>
        
        {/* Header Branding */}
        {!adminEmbed && (
          <div className='flex flex-col md:flex-row justify-around items-center gap-5'>
            <img src="/images/logo.png" alt="College Logo" className="w-auto object-contain drop-shadow-md pb-5" />
            <span className="font-bold text-slate-800 text-xl tracking-tight">AATS Portal</span>
          </div>
        )}

        {/* Hero Section */}
        <div className={`relative overflow-hidden bg-slate-900 ${adminEmbed ? 'rounded-3xl p-6 lg:p-8 shadow-md' : 'rounded-[2.5rem] p-8 md:p-10 shadow-xl'} flex flex-col md:flex-row md:items-center justify-between gap-6`}>
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-6 relative z-10 w-full md:w-auto">
             {staff.photoBase64 ? (
                <div className="relative shrink-0">
                  <img src={staff.photoBase64} alt="Profile" className="w-24 h-24 min-w-[6rem] min-h-[6rem] rounded-full object-cover border-4 border-slate-800 shadow-2xl" />
                  <div className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 border-[3px] border-slate-900 rounded-full"></div>
                </div>
             ) : (
                <div className="w-24 h-24 min-w-[6rem] min-h-[6rem] shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-3xl uppercase tracking-wider shadow-2xl border-4 border-slate-800">
                  {staff.name.substring(0,2)}
                </div>
             )}
             <div>
              <p className="text-blue-400 font-bold mb-1 tracking-wide uppercase text-sm">
                {new Date().getHours() < 12 ? "Good Morning" : new Date().getHours() < 17 ? "Good Afternoon" : "Good Evening"},
              </p>
              <h1 className="text-4xl font-black text-white tracking-tight">{staff.name}</h1>
              <div className="flex flex-wrap gap-2 mt-3">
                 <span className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold font-mono border border-slate-700">ID: {staff.employeeId}</span>
                 <span className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-700">Branch: {staff.department}</span>
              </div>
            </div>
          </div>
          
          {!adminEmbed && (
             <div className="flex flex-wrap items-center gap-3 relative z-10 w-full md:w-auto">
                {staff.role === 'admin' && (
                  <button onClick={() => navigate('/admin')} className="flex-1 md:flex-none px-6 py-3 text-sm font-bold text-slate-900 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
                    Admin Dashboard
                  </button>
                )}
                <button onClick={() => navigate('/staff/profile')} className="flex-1 md:flex-none px-6 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2">
                  <User size={18} /> My Profile
                </button>
                <button onClick={() => { sessionStorage.clear(); navigate('/'); }}
                  className="flex-1 md:flex-none px-6 py-3 text-sm font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  Sign Out
                </button>
             </div>
          )}
        </div>

        {finalSuccess && (
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-8 rounded-3xl text-white shadow-xl shadow-emerald-500/20 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
            <ShieldCheck size={64} className="mx-auto text-emerald-100 mb-4 drop-shadow-md" />
            <h2 className="text-3xl font-bold tracking-tight mb-2">Attendance Marked!</h2>
            <p className="text-emerald-100 text-lg">Your {timeStatus.slot === SLOT_MORNING ? 'Morning' : 'Evening'} slot attendance was successfully recorded.</p>
          </div>
        )}

        {/* Verification Pipeline */}
        {!finalSuccess && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. Time Check */}
            <div className={`col-span-1 rounded-[2rem] border p-8 transition-all duration-500 hover:-translate-y-1 ${step === 1 ? 'bg-white border-blue-500 shadow-xl shadow-blue-500/10 ring-4 ring-blue-50' : step > 1 ? 'bg-slate-50 border-emerald-200 opacity-80' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
               <div className="flex justify-between items-start mb-6">
                 <div className={`p-4 rounded-2xl ${step === 1 ? 'bg-blue-50 text-blue-600' : step > 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                   {step > 1 ? <CheckCircle2 size={26} /> : <Clock size={26} />}
                 </div>
                 <span className="text-slate-400 font-bold text-xs uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full">Step 1</span>
               </div>
               <h3 className="font-black text-slate-900 text-xl mb-3 tracking-tight">Time Restriction</h3>
               
               {timeStatus.loading ? (
                  <p className="text-slate-500 text-sm flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Checking active slot...</p>
               ) : !timeStatus.allowed ? (
                  <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl text-sm leading-relaxed border border-rose-100 flex items-start gap-3">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <p className="font-medium">{timeStatus.reason}</p>
                  </div>
               ) : (
                  <div>
                    <p className="text-emerald-600 text-sm font-bold mb-5 flex items-center gap-2"><CheckCircle2 size={18}/> {timeStatus.slot === SLOT_MORNING ? 'Morning' : 'Evening'} Slot Active</p>
                    {step === 1 && (
                      <button onClick={runGeoVerification} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                        Verify Location <ChevronRight size={18} />
                      </button>
                    )}
                  </div>
               )}
            </div>

            {/* 2. Geo Check */}
            <div className={`col-span-1 rounded-[2rem] border p-8 transition-all duration-500 hover:-translate-y-1 ${step === 2 ? 'bg-white border-blue-500 shadow-xl shadow-blue-500/10 ring-4 ring-blue-50' : step > 2 ? 'bg-slate-50 border-emerald-200 opacity-80' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
               <div className="flex justify-between items-start mb-6">
                 <div className={`p-4 rounded-2xl ${step === 2 && !geoStatus.loading ? 'bg-blue-50 text-blue-600' : step > 2 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                   {geoStatus.loading ? <Loader2 size={26} className="animate-spin" /> : step > 2 ? <CheckCircle2 size={26} /> : <MapPin size={26} />}
                 </div>
                 <span className="text-slate-400 font-bold text-xs uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full">Step 2</span>
               </div>
               <h3 className="font-black text-slate-900 text-xl mb-3 tracking-tight">Geo-Fencing</h3>
               
               {step >= 2 && (
                 geoStatus.loading ? (
                    <p className="text-blue-600 text-sm font-medium">{geoStatus.message}</p>
                 ) : !geoStatus.allowed ? (
                    <div className="bg-rose-50 text-rose-700 p-4 rounded-2xl text-sm leading-relaxed border border-rose-100">
                      <p className="font-medium">{geoStatus.message || 'Location access required'}</p>
                      <button onClick={runGeoVerification} className="mt-3 text-rose-800 underline font-bold block w-full text-left focus:outline-none">Retry Location Request</button>
                    </div>
                 ) : (
                    <p className="text-emerald-600 text-sm font-bold flex items-center gap-2"><CheckCircle2 size={18}/> {geoStatus.message}</p>
                 )
               )}
               {step < 2 && <p className="text-sm font-medium text-slate-400 mt-2">Awaiting time verification.</p>}
            </div>

            {/* 3. Face Auth */}
            <div className={`col-span-1 rounded-[2rem] border p-8 transition-all duration-500 hover:-translate-y-1 ${step === 3 ? 'bg-white border-blue-500 shadow-xl shadow-blue-500/10 ring-4 ring-blue-50' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
               <div className="flex justify-between items-start mb-6">
                 <div className={`p-4 rounded-2xl ${step === 3 ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                   {faceStatus.loading ? <Loader2 size={26} className="animate-spin" /> : <ScanFace size={26} />}
                 </div>
                 <span className="text-slate-400 font-bold text-xs uppercase tracking-wider bg-slate-100 px-3 py-1 rounded-full">Step 3</span>
               </div>
               <h3 className="font-black text-slate-900 text-xl mb-3 tracking-tight">Identity & Liveness</h3>
               
               {step === 3 && (
                 <>
                  {faceStatus.step === 'error' ? (
                     <div className="bg-rose-50 text-rose-700 font-medium p-4 rounded-2xl text-sm border border-rose-100">{faceStatus.message}</div>
                  ) : (
                     <div className="text-sm text-blue-600 font-bold">{faceStatus.message}</div>
                  )}

                  <div className="relative mt-5 bg-slate-900 rounded-[1.5rem] overflow-hidden aspect-[3/4] border-4 border-slate-800 group shadow-inner">
                    {(faceStatus.step === 'analyzing' || faceStatus.step === 'ready') && (
                      <>
                        <video ref={videoRef} onPlay={handleVideoPlay} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"></video>
                        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full transform scale-x-[-1] pointer-events-none" />
                        
                        {/* Overlay scanline effect */}
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/30 to-transparent h-12 w-full mt-[-3rem] animate-[scan_3s_ease-in-out_infinite]"></div>

                        {/* Status overlays inside video */}
                        <div className="absolute top-4 left-4 flex flex-col gap-2">
                           <span className={`text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg border font-black backdrop-blur-md transition-colors ${faceMatched ? 'bg-emerald-500/90 text-white border-emerald-400' : 'bg-slate-900/70 text-slate-200 border-slate-700'}`}>
                             {faceMatched ? 'Identity Match' : 'Scanning Face'}
                           </span>
                           <span className={`text-[10px] uppercase tracking-wider px-3 py-1.5 rounded-lg border font-black backdrop-blur-md transition-colors ${blinkDetected ? 'bg-emerald-500/90 text-white border-emerald-400' : 'bg-slate-900/70 text-slate-200 border-slate-700'}`}>
                             {blinkDetected ? 'Liveness Confirmed' : 'Blink Required'}
                           </span>
                        </div>
                      </>
                    )}
                    {(faceStatus.step === 'loading_models' || faceStatus.loading) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900 flex-col gap-4">
                        <Loader2 className="animate-spin text-blue-500" size={40} />
                        <span className="text-xs text-slate-400 font-bold tracking-widest uppercase">Initializing AI</span>
                      </div>
                    )}
                  </div>
                 </>
               )}
            </div>
            
          </div>
        )}

      </div>
      
      {/* Scanline Animation utility for Tailwind */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan { 
          0% { transform: translateY(0); } 
          100% { transform: translateY(300px); } 
        }
      `}} />
    </div>
  );
};

export default StaffDashboard;
