import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

const MODEL_URL = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights";

export const useFaceApi = () => {
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState("");
  const loadingRef = useRef(false);

  useEffect(() => {
    if (loadingRef.current || modelsLoaded) return;
    loadingRef.current = true;

    const loadModels = async () => {
      try {
        setLoadingProgress("Loading face detection model...");
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        setLoadingProgress("Loading face landmark model...");
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        setLoadingProgress("Loading face recognition model...");
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        setModelsLoaded(true);
        setLoadingProgress("");
      } catch (err) {
        console.error("Failed to load face-api models:", err);
        setLoadingProgress("Failed to load models. Please refresh.");
        loadingRef.current = false;
      }
    };

    loadModels();
  }, [modelsLoaded]);

  const detectFace = async (
    video: HTMLVideoElement
  ): Promise<faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>> | null> => {
    const result = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();
    return result || null;
  };

  const matchFace = (
    descriptor: Float32Array,
    storedDescriptors: { user_id: string; descriptor: Float32Array }[],
    threshold = 0.5
  ): { user_id: string; distance: number } | null => {
    let bestMatch: { user_id: string; distance: number } | null = null;

    for (const stored of storedDescriptors) {
      const distance = faceapi.euclideanDistance(
        Array.from(descriptor),
        Array.from(stored.descriptor)
      );
      if (distance < threshold && (!bestMatch || distance < bestMatch.distance)) {
        bestMatch = { user_id: stored.user_id, distance };
      }
    }

    return bestMatch;
  };

  return { modelsLoaded, loadingProgress, detectFace, matchFace };
};
