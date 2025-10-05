/**
 * Preprocess image for better OCR and analysis results
 */
export const preprocessImage = async (
  imageData: string,
  options: {
    enhanceContrast?: boolean;
    adjustBrightness?: boolean;
    maxDimension?: number;
  } = {}
): Promise<string> => {
  const {
    enhanceContrast = true,
    adjustBrightness = true,
    maxDimension = 1920,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let width = img.width;
      let height = img.height;
      
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Draw image
      ctx.drawImage(img, 0, 0, width, height);

      // Apply image enhancements
      if (enhanceContrast || adjustBrightness) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Calculate brightness adjustment
        let totalBrightness = 0;
        for (let i = 0; i < data.length; i += 4) {
          totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
        }
        const avgBrightness = totalBrightness / (data.length / 4);
        const brightnessFactor = adjustBrightness ? 128 / avgBrightness : 1;

        // Apply contrast and brightness
        for (let i = 0; i < data.length; i += 4) {
          if (enhanceContrast) {
            // Enhance contrast
            data[i] = ((data[i] - 128) * 1.2 + 128) * brightnessFactor;
            data[i + 1] = ((data[i + 1] - 128) * 1.2 + 128) * brightnessFactor;
            data[i + 2] = ((data[i + 2] - 128) * 1.2 + 128) * brightnessFactor;
          } else if (adjustBrightness) {
            data[i] *= brightnessFactor;
            data[i + 1] *= brightnessFactor;
            data[i + 2] *= brightnessFactor;
          }

          // Clamp values
          data[i] = Math.max(0, Math.min(255, data[i]));
          data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
          data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
        }

        ctx.putImageData(imageData, 0, 0);
      }

      // Convert to base64
      const processedImage = canvas.toDataURL('image/jpeg', 0.9);
      resolve(processedImage);
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageData;
  });
};

/**
 * Compress image to reduce upload size
 */
export const compressImage = async (
  imageData: string,
  quality: number = 0.8
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageData;
  });
};
