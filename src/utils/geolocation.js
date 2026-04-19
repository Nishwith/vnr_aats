// Calculate distance using the Haversine formula
const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const R = 6371e3; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

export const verifyGeofence = (collegeLat, collegeLon, collegeRadiusMeters) => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const distance = getDistanceInMeters(latitude, longitude, collegeLat, collegeLon);
        
        if (distance <= collegeRadiusMeters) {
          resolve({ inGeofence: true, distance: Math.round(distance) });
        } else {
          resolve({ 
            inGeofence: false, 
            distance: Math.round(distance),
            message: `You are ${Math.round(distance - collegeRadiusMeters)} meters outside the allowed campus area.`
          });
        }
      },
      (error) => {
        let msg = "Unknown Geolocation error.";
        switch(error.code) {
          case error.PERMISSION_DENIED: msg = "Location permission denied. Please allow it."; break;
          case error.POSITION_UNAVAILABLE: msg = "Location information unavailable."; break;
          case error.TIMEOUT: msg = "Location request timed out."; break;
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
};
