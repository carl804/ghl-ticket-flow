import formidable from 'formidable';
import fs from 'fs';
import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const INTERCOM_TOKEN = process.env.INTERCOM_ACCESS_TOKEN;
  
  if (!INTERCOM_TOKEN) {
    return res.status(500).json({ error: 'Intercom token not configured' });
  }

  try {
    // Parse the multipart form data
    const form = formidable({
      multiples: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const fileArray = Array.isArray(files.files) ? files.files : [files.files];
    const uploadedUrls = [];

    // Upload each file to Intercom
    for (const file of fileArray) {
      if (!file) continue;

      // Read the file
      const fileBuffer = fs.readFileSync(file.filepath);
      const formData = new FormData();
      
      // Create a blob from the buffer
      const blob = new Blob([fileBuffer], { type: file.mimetype });
      formData.append('file', blob, file.originalFilename || 'image.png');

      // Upload to Intercom
      const uploadResponse = await fetch('https://api.intercom.io/conversations/attachments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${INTERCOM_TOKEN}`,
          'Intercom-Version': '2.11',
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        console.error('Intercom upload error:', errorData);
        throw new Error(`Failed to upload to Intercom: ${errorData.message || 'Unknown error'}`);
      }

      const uploadData = await uploadResponse.json();
      uploadedUrls.push(uploadData.url);

      // Clean up temp file
      fs.unlinkSync(file.filepath);
    }

    return res.status(200).json({
      success: true,
      urls: uploadedUrls,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({
      error: 'Upload failed',
      details: error.message,
    });
  }
}