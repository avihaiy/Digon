export default async function handler(req: Request) {
  if (req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const endpoint = process.env.VITE_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
  const projectId = process.env.VITE_APPWRITE_PROJECT_ID;
  const dbId = process.env.VITE_APPWRITE_DATABASE_ID;

  if (!projectId || !dbId) {
    return new Response(JSON.stringify({ error: "Missing Appwrite Env Vars" }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const fetchUrl = `${endpoint}/databases/${dbId}/collections/locations/documents?queries[]=limit(1)`;
    
    const res = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': projectId
      }
    });

    const data = await res.json();

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Appwrite Pinged Successfully!",
      status: res.status 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}