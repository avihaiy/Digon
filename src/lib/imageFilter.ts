export interface FilterOptions {
  fishType: string;
  weight: string;
  location: string;
  marineData?: any;
  aiDetails?: string; // Long text for AI identification
}

export async function applyDigonFilter(file: File, options: FilterOptions): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image element"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          return reject(new Error("Failed to get canvas context"));
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const baseFontSize = Math.max(18, Math.floor(Math.min(canvas.width, canvas.height) * 0.045));
        
        let gradientHeight = Math.max(canvas.height * 0.25, baseFontSize * 6);
        if (options.aiDetails) {
            gradientHeight = Math.max(canvas.height * 0.45, baseFontSize * 15);
        }
        
        const gradient = ctx.createLinearGradient(0, canvas.height - gradientHeight, 0, canvas.height);
        gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        gradient.addColorStop(0.3, "rgba(0, 0, 0, 0.6)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.95)");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, canvas.height - gradientHeight, canvas.width, gradientHeight);

        const padding = baseFontSize;

        // Draw Left Side (DIGON PRO)
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.font = `900 ${baseFontSize * 1.5}px sans-serif`;
        
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.fillStyle = "#f97316"; 
        ctx.fillText("DIGON", padding, canvas.height - padding - baseFontSize * 0.9);
        
        const textWidth = ctx.measureText("DIGON ").width;
        ctx.fillStyle = "#ffffff";
        ctx.fillText("PRO", padding + textWidth, canvas.height - padding - baseFontSize * 0.9);

        ctx.font = `600 ${baseFontSize * 0.65}px sans-serif`;
        ctx.fillStyle = "#cbd5e1"; 
        ctx.fillText("https://digon.vercel.app", padding, canvas.height - padding + 2);

        ctx.shadowBlur = 5;

        // Draw Right Side (RTL)
        ctx.textAlign = "right";
        ctx.fillStyle = "#ffffff";
        
        ctx.font = `bold ${baseFontSize * 1.2}px sans-serif`;
        const fishText = `${options.fishType || 'לא זוהה מין דג'} ${options.weight ? '| ' + options.weight : ''}`;
        
        let rightStartY = canvas.height - padding - baseFontSize * 2.2;
        
        // Wrap AI Details if they exist
        if (options.aiDetails) {
            ctx.font = `normal ${baseFontSize * 0.75}px sans-serif`;
            ctx.fillStyle = "#e2e8f0";
            const maxWidth = canvas.width - padding * 2;
            const words = options.aiDetails.split(' ');
            let line = '';
            const lines = [];

            for(let n = 0; n < words.length; n++) {
              const testLine = line + words[n] + ' ';
              const metrics = ctx.measureText(testLine);
              if (metrics.width > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
              } else {
                line = testLine;
              }
            }
            lines.push(line);
            
            // Draw lines from bottom to top so it anchors above the fishText
            const lineHeight = baseFontSize * 1.1;
            for (let i = lines.length - 1; i >= 0; i--) {
                ctx.fillText(lines[i], canvas.width - padding, rightStartY - (lines.length - 1 - i) * lineHeight);
            }
            
            // Adjust title Y to be above the tips
            rightStartY = rightStartY - (lines.length * lineHeight) - baseFontSize * 0.5;
            
            ctx.font = `bold ${baseFontSize * 1.2}px sans-serif`;
            ctx.fillStyle = "#ffffff";
        }
        
        ctx.fillText(fishText, canvas.width - padding, rightStartY);

        ctx.font = `normal ${baseFontSize * 0.8}px sans-serif`;
        let weatherStr = options.location.split('|||')[0].trim() || 'ללא מיקום מוגדר';
        
        if (options.marineData) {
           const wave = options.marineData.waveHeight ? `גלים: ${options.marineData.waveHeight}m` : '';
           const temp = options.marineData.temperature ? `טמפ': ${options.marineData.temperature}°C` : '';
           if (wave || temp) {
               weatherStr += ` • ${wave} ${temp}`;
           }
        }
        
        ctx.fillStyle = "#cbd5e1";
        ctx.fillText(weatherStr, canvas.width - padding, canvas.height - padding - baseFontSize * 0.9);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error("Failed to create blob from canvas"));
            }
            const filteredFile = new File([blob], file.name.replace(/\\.[^/.]+$/, "") + "_digon.jpg", {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(filteredFile);
          },
          "image/jpeg",
          0.9
        );
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  });
}
