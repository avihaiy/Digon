export async function compressVideoLocally(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    // If it's not a video, or if we can't process it, just return the original
    if (!file.type.startsWith('video/')) {
      return resolve(file);
    }

    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    video.onloadedmetadata = () => {
      // Calculate target dimensions (max 720p to save space)
      const MAX_WIDTH = 720;
      const MAX_HEIGHT = 1280;
      let width = video.videoWidth;
      let height = video.videoHeight;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round(height * (MAX_WIDTH / width));
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round(width * (MAX_HEIGHT / height));
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Start recording the canvas
      let stream;
      try {
        stream = canvas.captureStream(30); // 30 FPS
      } catch (e) {
        console.warn("captureStream not supported, falling back to original file");
        return resolve(file);
      }
      
      // Try to attach original audio if AudioContext is supported
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      let audioContext: AudioContext | null = null;
      if (AudioContext) {
        try {
          audioContext = new AudioContext();
          const sourceNode = audioContext.createMediaElementSource(video);
          const destNode = audioContext.createMediaStreamDestination();
          sourceNode.connect(destNode);
          sourceNode.connect(audioContext.destination);
          
          const audioTracks = destNode.stream.getAudioTracks();
          if (audioTracks.length > 0) {
            stream.addTrack(audioTracks[0]);
          }
        } catch (e) {
          console.warn("Could not attach audio track", e);
        }
      }
      
      let mimeType = 'video/webm;codecs=vp8,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4'; // iOS Safari fallback
      }

      let recorder: MediaRecorder;
      try {
         recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 }); // 2.5Mbps
      } catch (e) {
         try {
           recorder = new MediaRecorder(stream);
         } catch (err) {
           console.error("MediaRecorder not supported");
           return resolve(file);
         }
      }

      const chunks: Blob[] = [];
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        // Append .mp4 or .webm based on type
        const extension = mimeType.includes('webm') ? '.webm' : '.mp4';
        const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + "_compressed" + extension, { type: mimeType });
        
        resolve(compressedFile);
        
        // Cleanup
        URL.revokeObjectURL(video.src);
        if (audioContext && audioContext.state !== 'closed') {
          audioContext.close();
        }
      };

      // Draw frames loop
      const drawFrame = () => {
        if (!video.paused && !video.ended) {
          ctx?.drawImage(video, 0, 0, width, height);
          requestAnimationFrame(drawFrame);
        }
      };

      video.onplay = () => {
        try {
          recorder.start();
          drawFrame();
        } catch (e) {
          resolve(file);
        }
      };

      video.onended = () => {
        recorder.stop();
      };
      
      video.play().catch(e => {
        console.error("Video play failed (maybe autoplay blocked)", e);
        resolve(file); // Fallback to original
      });
    };

    video.onerror = (e) => {
      console.error("Video load error", e);
      resolve(file); // Fallback to original
    };
  });
}
