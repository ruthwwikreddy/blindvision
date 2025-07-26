import { useState, useRef, useEffect } from 'react';
import { pipeline, env } from '@huggingface/transformers';

// Configure transformers to use webgpu if available
env.allowLocalModels = false;
env.useBrowserCache = true;

export interface ClassificationResult {
  label: string;
  score: number;
}

export const useImageClassification = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const classifierRef = useRef<any>(null);

  // Initialize the model
  useEffect(() => {
    const initializeModel = async () => {
      try {
        console.log('Loading image classification model...');
        classifierRef.current = await pipeline(
          'image-classification',
          'Xenova/vit-base-patch16-224',
          { device: 'webgpu' }
        );
        setIsModelLoaded(true);
        console.log('Image classification model loaded successfully');
      } catch (error) {
        console.error('Failed to load image classification model:', error);
        // Fallback to CPU if WebGPU fails
        try {
          classifierRef.current = await pipeline(
            'image-classification',
            'Xenova/vit-base-patch16-224'
          );
          setIsModelLoaded(true);
          console.log('Image classification model loaded successfully (CPU fallback)');
        } catch (fallbackError) {
          console.error('Failed to load model even with CPU fallback:', fallbackError);
        }
      }
    };

    initializeModel();
  }, []);

  const classifyImage = async (imageDataUrl: string): Promise<ClassificationResult[]> => {
    if (!classifierRef.current) {
      throw new Error('Model not loaded yet');
    }

    setIsLoading(true);
    try {
      console.log('Classifying image...');
      const results = await classifierRef.current(imageDataUrl);
      console.log('Classification results:', results);
      
      // Return top 5 results
      return results.slice(0, 5).map((result: any) => ({
        label: result.label,
        score: result.score
      }));
    } catch (error) {
      console.error('Error classifying image:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const generateQuickDescription = (results: ClassificationResult[], language: string = 'en'): string => {
    if (!results || results.length === 0) {
      return language === 'hi' ? 'कोई वस्तु नहीं मिली' : 
             language === 'te' ? 'ఏ వస్తువు కనిపించలేదు' : 
             'No objects detected';
    }

    const topResult = results[0];
    const confidence = Math.round(topResult.score * 100);
    
    if (language === 'hi') {
      return `मुख्य वस्तु: ${topResult.label} (${confidence}% विश्वास)`;
    } else if (language === 'te') {
      return `ప్రధాన వస్తువు: ${topResult.label} (${confidence}% నమ్మకం)`;
    } else {
      return `Main object: ${topResult.label} (${confidence}% confidence)`;
    }
  };

  return {
    classifyImage,
    generateQuickDescription,
    isLoading,
    isModelLoaded
  };
};