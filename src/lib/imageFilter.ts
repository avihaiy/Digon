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
        const padding = baseFontSize * 1.2;
        
        let gradientHeight = Math.max(canvas.height * 0.3, baseFontSize * 6);
        if (options.aiDetails) {
            gradientHeight = Math.max(canvas.height * 0.55, baseFontSize * 16);
        }
        
        const gradient = ctx.createLinearGradient(0, canvas.height - gradientHeight, 0, canvas.height);
        gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        gradient.addColorStop(0.2, "rgba(0, 0, 0, 0.7)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.95)");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, canvas.height - gradientHeight, canvas.width, gradientHeight);

        // Footer Y level
        const footerY = canvas.height - padding;

        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        // Draw Left Side Footer (DIGON PRO)
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        
        ctx.font = `900 ${baseFontSize * 1.3}px sans-serif`;
        ctx.fillStyle = "#f97316"; 
        ctx.fillText("DIGON", padding, footerY - baseFontSize * 0.8);
        
        const textWidth = ctx.measureText("DIGON ").width;
        ctx.fillStyle = "#ffffff";
        ctx.fillText("PRO", padding + textWidth, footerY - baseFontSize * 0.8);

        ctx.font = `600 ${baseFontSize * 0.6}px sans-serif`;
        ctx.fillStyle = "#cbd5e1"; 
        ctx.fillText("https://digon.vercel.app", padding, footerY);

        // Draw Right Side Footer (Location / Weather)
        ctx.textAlign = "right";
        ctx.font = `normal ${baseFontSize * 0.75}px sans-serif`;
        let weatherStr = options.location.split('|||')[0].trim() || 'ללא מיקום מוגדר';
        
        if (options.marineData) {
           const wave = options.marineData.waveHeight ? `גלים: ${options.marineData.waveHeight}m` : '';
           const temp = options.marineData.temperature ? `טמפ': ${options.marineData.temperature}°C` : '';
           if (wave || temp) {
               weatherStr += ` • ${wave} ${temp}`;
           }
        }
        
        ctx.fillStyle = "#cbd5e1";
        ctx.fillText(weatherStr, canvas.width - padding, footerY);

        // Draw Main Content (Bottom to Top)
        let contentY = footerY - baseFontSize * 2.5;

        // Draw AI Details if exist
        if (options.aiDetails) {
            ctx.font = `normal ${baseFontSize * 0.75}px sans-serif`;
            ctx.fillStyle = "#f8fafc"; // Very light text
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
            
            const lineHeight = baseFontSize * 1.1;
            // Draw lines from bottom to top so it perfectly stacks
            for (let i = lines.length - 1; i >= 0; i--) {
                ctx.fillText(lines[i], canvas.width - padding, contentY - (lines.length - 1 - i) * lineHeight);
            }
            
            // Move contentY up for the Title
            contentY = contentY - (lines.length * lineHeight) - baseFontSize * 0.8;
        }

        // Draw Title (Fish/Gear Name)
        let titleFontSize = baseFontSize * 1.4;
        ctx.font = `900 ${titleFontSize}px sans-serif`;
        
        let fishText = `${options.fishType || 'לא זוהה מין דג'}`;
        if (options.weight && options.weight !== "זיהוי AI") {
            fishText += ` | ${options.weight}`;
        }
        
        // Scale down title if it's too wide
        const maxTitleWidth = canvas.width - padding * 2;
        while (ctx.measureText(fishText).width > maxTitleWidth && titleFontSize > baseFontSize * 0.8) {
            titleFontSize -= 1;
            ctx.font = `900 ${titleFontSize}px sans-serif`;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillText(fishText, canvas.width - padding, contentY);
        
        // Optional Label for AI (if it was an AI scan)
        if (options.weight === "זיהוי AI") {
            ctx.font = `bold ${baseFontSize * 0.7}px sans-serif`;
            ctx.fillStyle = "#facc15"; // Yellow
            ctx.fillText("DIGON AI זיהוי אוטומטי", canvas.width - padding, contentY - titleFontSize * 1.2);
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error("Failed to create blob from canvas"));
            }
            const filteredFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + "_digon.jpg", {
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
