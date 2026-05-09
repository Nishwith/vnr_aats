/**
 * Time Window Rules logic now depends on College configuration:
 */

export const SLOT_MORNING = 'morning';
export const SLOT_EVENING = 'evening';

// Helper function to check if current hour is within a start/end window that might span midnight
const isHourInRange = (hour, start, end) => {
  if (start === end) return false;
  if (start < end) {
    return hour >= start && hour < end;
  } else {
    // Spans midnight (e.g., 23 to 1)
    return hour >= start || hour < end;
  }
};

// Check which slot is currently active based on system time and the specific college config
export const getActiveSlot = (timeConfig) => {
  const currentHour = new Date().getHours();

  if (isHourInRange(currentHour, timeConfig.morningStart, timeConfig.morningEnd)) {
    return SLOT_MORNING;
  }
  if (isHourInRange(currentHour, timeConfig.eveningStart, timeConfig.eveningEnd)) {
    return SLOT_EVENING;
  }
  return null;
};

// Check if a student can mark attendance right now
export const isAttendanceAllowed = (attendanceRecord, timeConfig) => {
  if (!timeConfig) {
     return { allowed: false, reason: 'College time configuration missing.' };
  }

  const activeSlot = getActiveSlot(timeConfig);

  // Format hours nicely for user messaging
  const formatTime = (hour) => {
    const ampm = hour >= 12 && hour < 24 ? 'PM' : 'AM';
    const h = hour % 12 || 12;
    return `${h}:00 ${ampm}`;
  };

  if (!activeSlot) {
    return { 
      allowed: false, 
      reason: `Outside allowed time windows. Allowed slots: ${formatTime(timeConfig.morningStart)}-${formatTime(timeConfig.morningEnd)} & ${formatTime(timeConfig.eveningStart)}-${formatTime(timeConfig.eveningEnd)}.` 
    };
  }

  // If Morning slot is active
  if (activeSlot === SLOT_MORNING) {
    if (attendanceRecord && attendanceRecord.morning) {
      return { allowed: false, reason: 'Morning attendance already marked today.' };
    }
    return { allowed: true, slot: SLOT_MORNING };
  }

  // If Evening slot is active
  if (activeSlot === SLOT_EVENING) {
    if (attendanceRecord && attendanceRecord.evening) {
      return { allowed: false, reason: 'Evening attendance already marked today.' };
    }
    
    // We no longer require morning attendance or a gap to mark evening attendance
    return { allowed: true, slot: SLOT_EVENING };
  }

  return { allowed: false, reason: 'Unknown error evaluating time window.' };
};
