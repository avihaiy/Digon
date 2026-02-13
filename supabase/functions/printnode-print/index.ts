import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ESC/POS helper: encode text to ESC/POS binary with Hebrew support
function buildEscPosReceipt(receipt: {
  receipt_number: number | null;
  created_at: string;
  total_amount: number;
  description?: string | null;
  member_name?: string | null;
  payment_method?: string | null;
  greg_date?: string;
  hebrew_date?: string;
}): Uint8Array {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];

  const push = (data: number[] | Uint8Array) => {
    parts.push(data instanceof Uint8Array ? data : new Uint8Array(data));
  };

  const pushText = (text: string) => {
    push(encoder.encode(text));
  };

  const ESC = 0x1B;
  const GS = 0x1D;
  const LF = 0x0A;

  // Initialize printer
  push([ESC, 0x40]); // ESC @ - Initialize

  // Center alignment
  push([ESC, 0x61, 1]); // ESC a 1 - Center

  // Bold ON
  push([ESC, 0x45, 1]); // ESC E 1 - Bold on

  // בס"ד
  pushText('בס"ד');
  push([LF]);

  // Synagogue name (double height for emphasis)
  push([ESC, 0x21, 0x10]); // Double height
  pushText('בית כנסת "ברית שלום" עכו');
  push([LF]);
  push([ESC, 0x21, 0x00]); // Normal size
  push([ESC, 0x45, 1]); // Bold back on

  // Address
  pushText('רח\' קדושי קהיר 16, עכו');
  push([LF, LF]);

  // Receipt number
  pushText(`קבלה מספר: ${receipt.receipt_number || ''}`);
  push([LF]);

  // Dates
  if (receipt.greg_date || receipt.hebrew_date) {
    pushText(`${receipt.greg_date || ''} • ${receipt.hebrew_date || ''}`);
    push([LF]);
  }

  // Separator
  pushText('--------------------------------');
  push([LF]);

  // Details
  pushText(`התקבל מאת: ${receipt.member_name || '-'}`);
  push([LF]);

  pushText(`עבור: ${receipt.description || 'תרומה'}`);
  push([LF]);

  const methodMap: Record<string, string> = {
    bit: 'ביט',
    cash: 'מזומן',
    check: 'צ׳ק',
    bank_transfer: 'העברה בנקאית',
  };
  pushText(`אמצעי תשלום: ${methodMap[receipt.payment_method || ''] || receipt.payment_method || '-'}`);
  push([LF]);

  // Separator
  pushText('--------------------------------');
  push([LF]);

  // Total - large and bold
  pushText('סה״כ שולם');
  push([LF]);

  // Double width + double height for amount
  push([ESC, 0x21, 0x30]); // Double width + double height
  const amount = new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(receipt.total_amount);
  pushText(amount);
  push([LF]);
  push([ESC, 0x21, 0x00]); // Normal size
  push([ESC, 0x45, 1]); // Bold back on

  // Separator
  pushText('--------------------------------');
  push([LF]);

  // Footer
  pushText('תודה על תרומתכם!');
  push([LF]);
  pushText('בית כנסת "ברית שלום" עכו');
  push([LF]);
  pushText('רח\' קדושי קהיר 16 עכו');
  push([LF]);
  pushText('טלפון: 050-5768723');
  push([LF, LF, LF]);

  // Cut paper
  push([GS, 0x56, 1]); // GS V 1 - Partial cut

  // Combine all parts
  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}

// Convert Uint8Array to base64
function uint8ToBase64(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('PRINTNODE_API_KEY');
    const printerId = Deno.env.get('PRINTNODE_PRINTER_ID');

    if (!apiKey || !printerId) {
      return new Response(
        JSON.stringify({ error: 'PrintNode credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { receipt } = body;

    if (!receipt) {
      return new Response(
        JSON.stringify({ error: 'Receipt data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build ESC/POS binary
    const escposData = buildEscPosReceipt(receipt);
    const base64Content = uint8ToBase64(escposData);

    // Send to PrintNode
    const printJobPayload = {
      printerId: parseInt(printerId, 10),
      title: `Receipt #${receipt.receipt_number || 'N/A'}`,
      contentType: 'raw_base64',
      content: base64Content,
      source: 'Brit Shalom Receipt System',
    };

    const printResponse = await fetch('https://api.printnode.com/printjobs', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(apiKey + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(printJobPayload),
    });

    if (!printResponse.ok) {
      const errorText = await printResponse.text();
      console.error('PrintNode API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'PrintNode API error', details: errorText }),
        { status: printResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const printResult = await printResponse.json();
    console.log('PrintNode job created:', printResult);

    return new Response(
      JSON.stringify({ success: true, jobId: printResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in printnode-print:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
