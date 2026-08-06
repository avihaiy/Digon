const { Client, Storage, InputFile } = require('node-appwrite');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const fs = require('fs');
const path = require('path');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

module.exports = async ({ req, res, log, error }) => {
  // 1. Initialize Appwrite client
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_ENDPOINT)
    .setProject(process.env.APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

  const storage = new Storage(client);

  // 2. Extract Event Data
  // Triggered by: buckets.[REELS_BUCKET_ID].files.*.create
  const fileEvent = req.body;
  if (!fileEvent || !fileEvent.$id) {
    return res.json({ success: false, message: 'No file data found' });
  }

  const bucketId = fileEvent.bucketId;
  const fileId = fileEvent.$id;
  const fileName = fileEvent.name;

  // Prevent infinite loops! If we already compressed this, ignore.
  if (fileName.includes('_optimized')) {
    log(`File ${fileName} is already optimized. Skipping.`);
    return res.json({ success: true, message: 'Already optimized' });
  }

  const inputPath = path.join('/tmp', `input_${fileId}.mp4`);
  const outputPath = path.join('/tmp', `optimized_${fileId}.mp4`);

  try {
    log(`Starting compression for file: ${fileId}`);

    // 3. Download the original file
    const fileBuffer = await storage.getFileDownload(bucketId, fileId);
    fs.writeFileSync(inputPath, fileBuffer);
    log(`File downloaded successfully to ${inputPath}`);

    // 4. Run FFmpeg Compression (Fast Start & Resize/Compress)
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-movflags faststart', // Moves moov atom to the beginning (Crucial for web streaming!)
          '-c:v libx264',        // Standard h264 codec
          '-preset veryfast',    // Fast encoding
          '-crf 28',             // Quality vs File Size (28 is good for mobile)
          '-vf scale=-2:1280',   // Scale down to max 720p/1080p height to save space
          '-c:a aac',            // Audio codec
          '-b:a 128k'            // Audio bitrate
        ])
        .save(outputPath)
        .on('end', () => {
          log('FFmpeg compression completed');
          resolve();
        })
        .on('error', (err) => {
          error(`FFmpeg Error: ${err.message}`);
          reject(err);
        });
    });

    // 5. Upload the optimized file back to Appwrite
    log(`Uploading optimized file...`);
    const optimizedFileName = fileName.replace(/\.[^/.]+$/, "") + "_optimized.mp4";
    
    // We create a new file and then delete the old one to avoid ID conflicts during upload
    const uploadRes = await storage.createFile(
      bucketId,
      'unique()', // Generate new ID
      InputFile.fromPath(outputPath, optimizedFileName)
    );
    
    log(`Optimized file uploaded successfully with ID: ${uploadRes.$id}`);

    // 6. Delete the original massive file
    await storage.deleteFile(bucketId, fileId);
    log(`Original file ${fileId} deleted.`);

    // Note: If you have a Database Collection (like 'reels') that points to the old fileId, 
    // you would also need to update that document here using `databases.updateDocument` 
    // to point to the new `uploadRes.$id`.

    return res.json({ 
      success: true, 
      originalId: fileId, 
      optimizedId: uploadRes.$id 
    });

  } catch (err) {
    error(`Compression failed: ${err.message}`);
    return res.json({ success: false, error: err.message });
  } finally {
    // Cleanup Temp files
    if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
    if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
  }
};
