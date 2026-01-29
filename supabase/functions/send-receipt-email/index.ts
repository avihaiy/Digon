import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb } from "https://esm.sh/pdf-lib@1.17.1";
// @deno-types="https://esm.sh/@pdf-lib/fontkit@1.1.1/fontkit.d.ts"
import fontkit from "https://esm.sh/@pdf-lib/fontkit@1.1.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SendReceiptRequest {
  receiptId: string;
  email?: string;
}

function formatCurrency(amount: number): string {
  return `₪${amount.toLocaleString('he-IL')}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('he-IL');
}
async function generateReceiptPDF(receipt: any, member: any, payment: any): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  
  // Register fontkit for custom font support
  pdfDoc.registerFontkit(fontkit);
  
  // Fetch Hebrew font from Google Fonts CDN
  let hebrewFont;
  try {
    // Fetch Alef Hebrew font from Supabase Storage
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const fontUrl = `${supabaseUrl}/storage/v1/object/public/expense-receipts/fonts/Alef-Regular.ttf`;
    console.log('Fetching Alef Hebrew font from Storage');
    const fontResponse = await fetch(fontUrl);
    
    if (!fontResponse.ok) {
      throw new Error(`Failed to fetch font: ${fontResponse.status}`);
    }
    
    const fontBytes = await fontResponse.arrayBuffer();
    hebrewFont = await pdfDoc.embedFont(fontBytes);
    console.log('Alef Hebrew font loaded successfully');
  } catch (error) {
    console.error('Failed to load Hebrew font:', error);
    throw new Error(`Cannot generate PDF without Hebrew font: ${error}`);
  }

  // Create page (80mm x 150mm = ~227 x 425 points)
  const page = pdfDoc.addPage([227, 425]);
  const { width, height } = page.getSize();
  
  const fontSize = 10;
  const smallFontSize = 8;
  const titleFontSize = 12;
  
  let y = height - 20;
  const centerX = width / 2;
  const rightMargin = width - 15;

  // Helper to draw centered text
  const drawCentered = (text: string, yPos: number, size: number = fontSize) => {
    const textWidth = hebrewFont.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: centerX - textWidth / 2,
      y: yPos,
      size,
      font: hebrewFont,
      color: rgb(0, 0, 0),
    });
  };

  // Helper to draw right-aligned text (for Hebrew RTL - text starts from right)
  const drawRight = (text: string, yPos: number, size: number = fontSize) => {
    const textWidth = hebrewFont.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: rightMargin - textWidth,
      y: yPos,
      size,
      font: hebrewFont,
      color: rgb(0, 0, 0),
    });
  };

  // Header
  drawCentered('בס"ד', y, smallFontSize);
  y -= 20;

  drawCentered('בית הכנסת ברית שלום', y, titleFontSize);
  y -= 15;

  drawCentered('עכו, ישראל', y, smallFontSize);
  y -= 25;

  // Receipt title
  drawCentered('קבלה', y, titleFontSize);
  y -= 20;

  // Receipt number
  drawCentered(`#${receipt.receipt_number}`, y, 14);
  y -= 15;

  // Date
  drawCentered(formatDate(receipt.created_at), y, smallFontSize);
  y -= 15;

  // Separator line
  page.drawLine({
    start: { x: 15, y },
    end: { x: width - 15, y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= 20;

  // Details - Hebrew RTL
  const memberName = member?.full_name || 'אנונימי';
  drawRight(`מאת: ${memberName}`, y, smallFontSize);
  y -= 14;

  const description = receipt.description || 'תרומה';
  drawRight(`עבור: ${description}`, y, smallFontSize);
  y -= 14;

  const paymentMethod = payment?.method === 'bit' ? 'ביט' : 'מזומן';
  drawRight(`אמצעי תשלום: ${paymentMethod}`, y, smallFontSize);
  y -= 25;

  // Separator
  page.drawLine({
    start: { x: 15, y },
    end: { x: width - 15, y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= 20;

  // Total label
  drawCentered('סה"כ שולם', y, smallFontSize);
  y -= 25;

  // Amount - big and bold
  const amountText = formatCurrency(Number(receipt.total_amount));
  drawCentered(amountText, y, 20);
  y -= 30;

  // Separator
  page.drawLine({
    start: { x: 15, y },
    end: { x: width - 15, y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  y -= 20;

  // Footer
  drawCentered('תודה על תרומתך!', y, fontSize);
  y -= 15;
  drawCentered('בית הכנסת ברית שלום', y, smallFontSize);
  y -= 12;
  drawCentered('רח\' קדושי כהיר 16, עכו', y, smallFontSize);
  y -= 12;
  drawCentered('טל: 050-5768723', y, smallFontSize);

  return await pdfDoc.save();
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { receiptId, email: providedEmail }: SendReceiptRequest = await req.json();

    if (!receiptId) {
      throw new Error('Receipt ID is required');
    }

    // Get default email from settings if not provided
    let targetEmail = providedEmail;
    if (!targetEmail) {
      const { data: settings } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'receipt_email')
        .maybeSingle();
      
      targetEmail = settings?.value;
    }

    if (!targetEmail) {
      throw new Error('No email address configured for receipt notifications');
    }

    // Fetch receipt with related data
    const { data: receipt, error: receiptError } = await supabase
      .from('receipts')
      .select('*')
      .eq('id', receiptId)
      .single();

    if (receiptError || !receipt) {
      throw new Error(`Failed to fetch receipt: ${receiptError?.message || 'Not found'}`);
    }

    // Fetch member and payment data
    const [memberResult, paymentResult] = await Promise.all([
      receipt.member_id 
        ? supabase.from('members').select('full_name, phone').eq('id', receipt.member_id).single()
        : { data: null },
      receipt.payment_id 
        ? supabase.from('payments').select('method, reference').eq('id', receipt.payment_id).single()
        : { data: null }
    ]);

    const member = memberResult.data;
    const payment = paymentResult.data;

    // Generate PDF
    const pdfBytes = await generateReceiptPDF(receipt, member, payment);
    const pdfBase64 = btoa(String.fromCharCode(...pdfBytes));

    const paymentMethod = payment?.method === 'cash' ? 'מזומן' : payment?.method === 'bit' ? 'ביט' : '';
    const createdAt = new Date(receipt.created_at);
    const formattedDate = createdAt.toLocaleDateString('he-IL');
    const formattedTime = createdAt.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

    // Send email using Resend API with PDF attachment
    // Email HTML supports Hebrew (browser renders it), PDF uses English (standard fonts)
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Brit Shalom Synagogue <onboarding@resend.dev>',
        to: [targetEmail],
        subject: `קבלה חדשה #${receipt.receipt_number} - ${member?.full_name || 'לא ידוע'}`,
        html: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0;">בס"ד</h1>
              <h2 style="color: white; margin: 10px 0 0;">בית הכנסת ברית שלום</h2>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
              <div style="background: #d4edda; color: #155724; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
                <strong>✓ קבלה חדשה נוצרה בהצלחה</strong>
              </div>
              
              <div style="background: white; padding: 25px; border-radius: 8px; border-right: 4px solid #c9a227; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">מספר קבלה:</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold; font-size: 18px;">#${receipt.receipt_number}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">תאריך:</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${formattedDate} ${formattedTime}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">שם המשלם:</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold;">${member?.full_name || 'לא ידוע'}</td>
                  </tr>
                  ${member?.phone ? `
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">טלפון:</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee;" dir="ltr">${member.phone}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">תיאור:</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${receipt.description || '-'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">אמצעי תשלום:</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${paymentMethod || '-'}</td>
                  </tr>
                  ${payment?.reference ? `
                  <tr>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee; color: #666;">אסמכתא:</td>
                    <td style="padding: 10px 0; border-bottom: 1px solid #eee;" dir="ltr">${payment.reference}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 15px 0 0; color: #666; font-size: 16px;">סכום:</td>
                    <td style="padding: 15px 0 0; font-weight: bold; font-size: 24px; color: #1e3a5f;">₪${Number(receipt.total_amount).toLocaleString('he-IL')}</td>
                  </tr>
                </table>
              </div>
              
              <p style="margin-top: 20px; color: #666; text-align: center;">
                📎 קובץ PDF של הקבלה מצורף למייל זה
              </p>
              
              <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
              
              <p style="color: #888; font-size: 12px; text-align: center;">
                הודעה אוטומטית ממערכת ניהול בית הכנסת<br>
                ${formattedDate} ${formattedTime}
              </p>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: `receipt-${receipt.receipt_number}.pdf`,
            content: pdfBase64,
          }
        ],
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      throw new Error(`Failed to send email: ${JSON.stringify(emailResult)}`);
    }

    console.log('Receipt email with PDF sent successfully:', emailResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Receipt email with PDF sent successfully',
        receiptNumber: receipt.receipt_number,
        to: targetEmail
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('Error sending receipt email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
