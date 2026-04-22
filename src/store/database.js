import { supabase } from '../lib/supabase.js';

// --- Workplaces (formerly colleges) ---
export const getWorkplaces = async () => {
  const { data, error } = await supabase.from('workplaces').select('*');
  if (error) {
    console.error('Error fetching workplaces:', error);
    return [];
  }
  return data.map(c => ({
    id: c.id,
    name: c.name,
    latitude: c.latitude,
    longitude: c.longitude,
    radiusMeters: c.radius_meters,
    timeConfig: {
      morningStart: c.morning_start,
      morningEnd: c.morning_end,
      eveningStart: c.evening_start,
      eveningEnd: c.evening_end,
      minGapHours: c.min_gap_hours
    }
  }));
};

export const addWorkplace = async (workplace) => {
  const { error } = await supabase.from('workplaces').insert({
    name: workplace.name,
    latitude: workplace.latitude,
    longitude: workplace.longitude,
    radius_meters: workplace.radiusMeters,
    morning_start: workplace.timeConfig.morningStart,
    morning_end: workplace.timeConfig.morningEnd,
    evening_start: workplace.timeConfig.eveningStart,
    evening_end: workplace.timeConfig.eveningEnd,
    min_gap_hours: workplace.timeConfig.minGapHours
  });
  if (error) console.error('Error adding workplace:', error);
};

export const deleteWorkplace = async (workplaceId) => {
  const { error } = await supabase.from('workplaces').delete().eq('id', workplaceId);
  if (error) console.error('Error deleting workplace:', error);
};

export const updateWorkplace = async (workplaceId, updates) => {
  const payload = {};
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.latitude !== undefined) payload.latitude = updates.latitude;
  if (updates.longitude !== undefined) payload.longitude = updates.longitude;
  if (updates.radiusMeters !== undefined) payload.radius_meters = updates.radiusMeters;
  if (updates.timeConfig) {
    if (updates.timeConfig.morningStart !== undefined) payload.morning_start = updates.timeConfig.morningStart;
    if (updates.timeConfig.morningEnd !== undefined) payload.morning_end = updates.timeConfig.morningEnd;
    if (updates.timeConfig.eveningStart !== undefined) payload.evening_start = updates.timeConfig.eveningStart;
    if (updates.timeConfig.eveningEnd !== undefined) payload.evening_end = updates.timeConfig.eveningEnd;
    if (updates.timeConfig.minGapHours !== undefined) payload.min_gap_hours = updates.timeConfig.minGapHours;
  }

  const { error } = await supabase.from('workplaces').update(payload).eq('id', workplaceId);
  if (error) console.error('Error updating workplace:', error);
};

// --- Staff ---
export const getStaff = async () => {
  const { data, error } = await supabase.from('staff').select('*');
  if (error) {
    console.error('Error fetching staff:', error);
    return [];
  }
  return data.map(mapStaff);
};

export const addStaff = async (staffData) => {
  let faceDescriptor = staffData.faceDescriptor;
  if (faceDescriptor instanceof Float32Array) {
    faceDescriptor = Array.from(faceDescriptor);
  }

  // Note: Since auth_id is tied to Supabase Auth, you normally let the edge function 
  const { error } = await supabase.from('staff').insert({
    employee_id: staffData.employeeId,
    name: staffData.name,
    email: staffData.email ? staffData.email : null,
    password: 'vnrvjiet',
    department: staffData.department,
    workplace_id: staffData.workplaceId,
    role: staffData.role || 'staff',
    photo_base64: staffData.photoBase64,
    face_descriptor: faceDescriptor
  });
  if (error) console.error('Error adding staff:', error);
};

export const deleteStaff = async (staffId) => {
  const { error } = await supabase.from('staff').delete().eq('id', staffId);
  if (error) console.error('Error deleting staff:', error);
};

export const getStaffByEmployeeId = async (employeeId) => {
  const { data, error } = await supabase.from('staff').select('*').eq('employee_id', employeeId).single();
  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('Error fetching staff:', error);
    }
    return null;
  }
  return mapStaff(data);
};

export const updateStaff = async (staffId, updates) => {
  const payload = {};
  if (updates.employeeId !== undefined) payload.employee_id = updates.employeeId;
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.email !== undefined) payload.email = updates.email ? updates.email : null;
  if (updates.password !== undefined) payload.password = updates.password;
  if (updates.department !== undefined) payload.department = updates.department;
  if (updates.workplaceId !== undefined) payload.workplace_id = updates.workplaceId;
  if (updates.role !== undefined) payload.role = updates.role;
  if (updates.photoBase64 !== undefined) payload.photo_base64 = updates.photoBase64;
  if (updates.faceDescriptor !== undefined) {
    payload.face_descriptor = updates.faceDescriptor instanceof Float32Array 
      ? Array.from(updates.faceDescriptor) 
      : updates.faceDescriptor;
  }

  const { error } = await supabase.from('staff').update(payload).eq('id', staffId);
  if (error) console.error('Error updating staff:', error);
};


// --- Attendance ---
export const getStaffAttendanceToday = async (staffId) => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase.from('attendance')
    .select('*')
    .eq('staff_id', staffId)
    .eq('date', today)
    .single();

  if (error && error.code === 'PGRST116') { // No rows found
    const newRecord = { staff_id: staffId, date: today, morning: null, evening: null };
    const { data: inserted, error: insertError } = await supabase.from('attendance').insert(newRecord).select().single();
    if (insertError) {
      console.error('Error creating attendance record:', insertError);
      return { staffId, date: today, morning: null, evening: null };
    }
    return mapAttendance(inserted);
  } else if (error) {
    console.error('Error fetching today attendance:', error);
    return null;
  }

  return mapAttendance(data);
};

export const markAttendance = async (staffId, slot) => {
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  
  const { data: record } = await supabase.from('attendance')
    .select('*')
    .eq('staff_id', staffId)
    .eq('date', today)
    .single();
    
  if (record) {
    const { error } = await supabase.from('attendance')
      .update({ [slot]: now })
      .eq('id', record.id);
    if (error) console.error('Error marking attendance:', error);
  } else {
    const payload = { staff_id: staffId, date: today };
    payload[slot] = now;
    const { error } = await supabase.from('attendance').insert(payload);
    if (error) console.error('Error marking attendance (insert):', error);
  }
};

export const getAttendanceHistory = async (staffId, days = 30) => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  
  const { data, error } = await supabase.from('attendance')
    .select('*')
    .eq('staff_id', staffId)
    .gte('date', cutoffStr)
    .order('date', { ascending: false });

  if (error) {
    console.error('Error fetching attendance history:', error);
    return [];
  }
  return data.map(mapAttendance);
};

export const updateAttendanceRecord = async (staffId, date, updates) => {
  const { data: record } = await supabase.from('attendance')
    .select('*')
    .eq('staff_id', staffId)
    .eq('date', date)
    .single();
    
  if (record) {
    const payload = {};
    if (updates.morning !== undefined) payload.morning = updates.morning;
    if (updates.evening !== undefined) payload.evening = updates.evening;
    
    const { error } = await supabase.from('attendance')
      .update(payload)
      .eq('id', record.id);
    if (error) console.error('Error updating attendance record:', error);
  } else {
    const payload = { 
      staff_id: staffId, 
      date: date, 
      morning: updates.morning || null, 
      evening: updates.evening || null 
    };
    const { error } = await supabase.from('attendance').insert(payload);
    if (error) console.error('Error inserting attendance record:', error);
  }
};

export const getTodaysAttendanceCount = async () => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase.from('attendance')
    .select('id, morning, evening')
    .eq('date', today);
  
  if (error) {
    console.error('Error fetching today attendance count:', error);
    return 0;
  }
  return data.filter(a => a.morning !== null || a.evening !== null).length;
};

export const getTodaysAttendanceRecords = async () => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase.from('attendance')
    .select('staff_id, morning, evening')
    .eq('date', today);
  
  if (error) {
    console.error('Error fetching today attendance logs:', error);
    return [];
  }
  return data.map(mapAttendance);
};

export const getAllAttendanceLogs = async () => {
  const { data, error } = await supabase.from('attendance').select('staff_id, date, morning, evening');
  if (error) return [];
  return data;
};

// --- Mappers ---
function mapStaff(s) {
  let faceDescriptorObj = s.face_descriptor;
  if (faceDescriptorObj && Array.isArray(faceDescriptorObj)) {
    faceDescriptorObj = new Float32Array(faceDescriptorObj);
  }
  return {
    id: s.id,
    createdAt: s.created_at,
    authId: s.auth_id,
    employeeId: s.employee_id,
    email: s.email,
    password: s.password,
    name: s.name,
    department: s.department,
    workplaceId: s.workplace_id,
    role: s.role,
    photoBase64: s.photo_base64,
    faceDescriptor: faceDescriptorObj
  };
}

function mapAttendance(a) {
  return {
    id: a.id,
    staffId: a.staff_id,
    date: a.date,
    morning: a.morning,
    evening: a.evening
  };
}
