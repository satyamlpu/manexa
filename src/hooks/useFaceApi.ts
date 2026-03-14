import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

export const useFaceApi = () => {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState("");
  const [loadError, setLoadError] = useState(false);
  const loadingRef = useRef(false);
  const retryCountRef = useRef(0);
  const MAX_RETRIES = 5;

  const loadModels = useCallback(async () => {
    if (loadingRef.current || modelsLoaded) return;
    loadingRef.current = true;
    setLoadError(false);

    try {
      setLoadingProgress("Loading face detection model (1/3)...");
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      setLoadingProgress("Loading face landmark model (2/3)...");
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      setLoadingProgress("Loading face recognition model (3/3)...");
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      setModelsLoaded(true);
      setLoadingProgress("");
      retryCountRef.current = 0;
    } catch (err) {
      console.error("Failed to load face-api models:", err);
      loadingRef.current = false;
      retryCountRef.current += 1;

      if (retryCountRef.current < MAX_RETRIES) {
        const delay = Math.min(2000 * retryCountRef.current, 8000);
        setLoadingProgress(`Retrying... (attempt ${retryCountRef.current + 1}/${MAX_RETRIES})`);
        setTimeout(() => loadModels(), delay);
      } else {
        setLoadingProgress("Failed to load models after multiple attempts.");
        setLoadError(true);
      }
    }
  }, [modelsLoaded]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const retryLoad = useCallback(() => {
    retryCountRef.current = 0;
    loadingRef.current = false;
    setLoadError(false);
    loadModels();
  }, [loadModels]);

  const detectFace = async (
    video: HTMLVideoElement
  ): Promise<faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>> | null> => {
    const result = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    return result || null;
  };

  const detectAllFaces = async (video: HTMLVideoElement) => {
    const results = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptors();
    return results;
  };

  const matchFace = (
    descriptor: Float32Array,
    storedDescriptors: { user_id: string; descriptor: Float32Array }[],
    threshold = 0.5
  ): { user_id: string; distance: number } | null => {
    let bestMatch: { user_id: string; distance: number } | null = null;
    for (const stored of storedDescriptors) {
      const distance = faceapi.euclideanDistance(Array.from(descriptor), Array.from(stored.descriptor));
      if (distance < threshold && (!bestMatch || distance < bestMatch.distance)) {
        bestMatch = { user_id: stored.user_id, distance };
      }
    }
    return bestMatch;
  };

  return { modelsLoaded, loadingProgress, loadError, detectFace, detectAllFaces, matchFace, retryLoad };
};
