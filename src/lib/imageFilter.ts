export interface FilterOptions {
  fishType: string;
  weight: string;
  location: string;
  marineData?: any;
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

        // Draw original image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Draw dark gradient at the bottom (25% of the height)
        const gradientHeight = Math.max(canvas.height * 0.25, baseFontSize * 6);
        const gradient = ctx.createLinearGradient(0, canvas.height - gradientHeight, 0, canvas.height);
        gradient.addColorStop(0, "rgba(0, 0, 0, 0)");
        gradient.addColorStop(0.5, "rgba(0, 0, 0, 0.6)");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.9)");

        ctx.fillStyle = gradient;
        ctx.fillRect(0, canvas.height - gradientHeight, canvas.width, gradientHeight);

        // Base sizing based on image resolution
        // Use the smaller dimension so portrait images don't get huge fonts
        const baseFontSize = Math.max(18, Math.floor(Math.min(canvas.width, canvas.height) * 0.045));
        const padding = baseFontSize;

        // Draw DIGON PRO Badge
        ctx.textAlign = "left";
        ctx.textBaseline = "bottom";
        ctx.font = `900 ${baseFontSize * 1.5}px sans-serif`;
        
        // Shadow for text
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        ctx.fillStyle = "#f97316"; // Orange 500
        ctx.fillText("DIGON", padding, canvas.height - padding);
        
        const textWidth = ctx.measureText("DIGON ").width;
        ctx.fillStyle = "#ffffff";
        ctx.fillText("PRO", padding + textWidth, canvas.height - padding);

        // Reset shadow for smaller text to keep it crisp
        ctx.shadowBlur = 5;

        // Draw Right Side Data (RTL)
        ctx.textAlign = "right";
        ctx.fillStyle = "#ffffff";
        
        // Fish Info
        ctx.font = `bold ${baseFontSize * 1.2}px sans-serif`;
        const fishText = `${options.fishType || 'דג לא ידוע'} ${options.weight ? '| ' + options.weight : ''}`;
        ctx.fillText(fishText, canvas.width - padding, canvas.height - padding - baseFontSize * 1.8);

        // Weather & Location Info
        ctx.font = `normal ${baseFontSize * 0.8}px sans-serif`;
        let weatherStr = options.location.split('|||')[0].trim() || 'לוקיישן לא ידוע';
        
        if (options.marineData) {
           const wave = options.marineData.waveHeight ? `גלים: ${options.marineData.waveHeight}m` : '';
           const temp = options.marineData.temperature ? `מים: ${options.marineData.temperature}°C` : '';
           if (wave || temp) {
               weatherStr += ` • ${wave} ${temp}`;
           }
        }
        
        ctx.fillStyle = "#cbd5e1"; // Slate 300
        ctx.fillText(weatherStr, canvas.width - padding, canvas.height - padding);

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
