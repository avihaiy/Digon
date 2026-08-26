export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  const endpoint = process.env.VITE_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
  const projectId = process.env.VITE_APPWRITE_PROJECT_ID;
  const dbId = process.env.VITE_APPWRITE_DATABASE_ID;

  if (!projectId || !dbId) {
    return res.status(500).json({ error: "Missing Appwrite Env Vars" });
  }

  try {
    const fetchUrl = `${endpoint}/databases/${dbId}/collections/locations/documents?queries[]=limit(1)`;
    
    const appwriteRes = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': projectId
      }
    });

    // We don't even need to parse the json, just hitting it is enough to register activity.
    return res.status(200).json({ 
      success: true, 
      message: "Appwrite Pinged Successfully!",
      status: appwriteRes.status 
    });

  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}