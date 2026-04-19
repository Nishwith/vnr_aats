import * as faceapi from 'face-api.js';

export const loadModels = async () => {
  const MODEL_URL = '/models';
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
    return true;
  } catch (err) {
    console.error("Error loading face-api models:", err);
    return false;
  }
};

export const getFaceDescriptorFromImage = async (imgElement) => {
  try {
    const detection = await faceapi.detectSingleFace(imgElement).withFaceLandmarks().withFaceDescriptor();
    return detection ? detection.descriptor : null;
  } catch (err) {
    console.error("Error extracting descriptor from image", err);
    return null;
  }
};

export const calculateEAR = (eye) => {
  // calculate euclidean distance between standard 6 point eye landmarks from face-api
  // eye is an array of 6 points [{x, y}, ... ]
  const euclideanDist = (p1, p2) => Math.sqrt(Math.pow((p1.x - p2.x), 2) + Math.pow((p1.y - p2.y), 2));
  
  // vertical distances
  const v1 = euclideanDist(eye[1], eye[5]);
  const v2 = euclideanDist(eye[2], eye[4]);
  // horizontal distance
  const h = euclideanDist(eye[0], eye[3]);
  
  return (v1 + v2) / (2.0 * h);
};

/**
 * Validates a live video feed against a reference descriptor
 * @param {HTMLVideoElement} videoElement
 * @param {Float32Array} referenceDescriptor - From the student's reference photo
 * @param {Function} onBlinkDetected - Callback when EAR goes below threshold indicating a blink
 * @param {Function} onMatchDetected - Callback when distance to reference is low
 * @returns {Promise<Object>} Detection results for drawing box
 */
export const processVideoFrame = async (videoElement, referenceDescriptor, blinkThreshold = 0.28, matchThreshold = 0.43) => {
  try {
     const detection = await faceapi.detectSingleFace(videoElement, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
                                   .withFaceLandmarks()
                                   .withFaceDescriptor();
     
     if (!detection) return null;

     const result = {
       detection,
       isMatch: false,
       distance: 1,
       ear: 0,
       isBlinking: false
     };

     // Compute Matching
     if (referenceDescriptor) {
        // lower distance is better match. Typically < 0.6 is a match, but 0.43 is much stricter for higher security
        const distance = faceapi.euclideanDistance(detection.descriptor, new Float32Array(Object.values(referenceDescriptor)));
        result.distance = distance;
        result.isMatch = distance <= matchThreshold;
     }

     // Compute Liveness (Blink via EAR)
     const landmarks = detection.landmarks;
     const leftEye = landmarks.getLeftEye();
     const rightEye = landmarks.getRightEye();

     const leftEAR = calculateEAR(leftEye);
     const rightEAR = calculateEAR(rightEye);
     const avgEAR = (leftEAR + rightEAR) / 2;
     
     result.ear = avgEAR;
     result.isBlinking = avgEAR < blinkThreshold;

     return result;

  } catch (err) {
    console.error("Frame processing error:", err);
    return null;
  }
};
