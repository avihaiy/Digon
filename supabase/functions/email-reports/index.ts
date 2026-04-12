import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) throw new Error('RESEND_API_KEY is not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const email = 'britakko12@gmail.com';
    const now = new Date();
    const timestamp = now.toISOString().split('T')[0];

    // 1. Debts report
    const { data: debts } = await supabase
      .from('member_charges')
      .select('id, member_id, description, amount, remaining_balance, charge_date')
      .gt('remaining_balance', 0)
      .order('charge_date', { ascending: false });

    const memberIds = [...new Set((debts || []).map(d => d.member_id))];
    const { data: members } = memberIds.length > 0
      ? await supabase.from('members').select('id, full_name').in('id', memberIds)
      : { data: [] };
    const membersMap = new Map((members || []).map(m => [m.id, m.full_name]));

    const debtsWithNames = (debts || []).map(d => ({
      ...d,
      member_name: membersMap.get(d.member_id) || 'לא ידוע',
    }));

    const totalDebt = debtsWithNames.reduce((s, d) => s + Number(d.remaining_balance), 0);

    // Group by member
    const memberDebts: Record<string, { name: string; total: number; count: number }> = {};
    for (const d of debtsWithNames) {
      if (!memberDebts[d.member_name]) memberDebts[d.member_name] = { name: d.member_name, total: 0, count: 0 };
      memberDebts[d.member_name].total += Number(d.remaining_balance);
      memberDebts[d.member_name].count++;
    }
    const memberSummary = Object.values(memberDebts).sort((a, b) => b.total - a.total);

    // 2. Payments report (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: payments } = await supabase
      .from('payments')
      .select('id, member_id, amount, method, payment_type, status, created_at, notes')
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false });

    const paymentMemberIds = [...new Set((payments || []).map(p => p.member_id))];
    const { data: paymentMembers } = paymentMemberIds.length > 0
      ? await supabase.from('members').select('id, full_name').in('id', paymentMemberIds)
      : { data: [] };
    const payMembersMap = new Map((paymentMembers || []).map(m => [m.id, m.full_name]));

    const totalPayments = (payments || []).reduce((s, p) => s + Number(p.amount), 0);
    const confirmedPayments = (payments || []).filter(p => p.status === 'confirmed');
    const totalConfirmed = confirmedPayments.reduce((s, p) => s + Number(p.amount), 0);

    // 3. Expenses report (last 30 days)
    const { data: expenses } = await supabase
      .from('expenses')
      .select('id, amount, expense_date, supplier, notes, category_id')
      .gte('expense_date', thirtyDaysAgo.split('T')[0])
      .order('expense_date', { ascending: false });

    const totalExpenses = (expenses || []).reduce((s, e) => s + Number(e.amount), 0);

    // Format currency
    const fmt = (n: number) => `₪${n.toLocaleString('he-IL')}`;
    const fmtDate = (d: string) => {
      try { return new Date(d).toLocaleDateString('he-IL'); } catch { return d; }
    };
    const methodMap: Record<string, string> = { cash: 'מזומן', bit: 'ביט', check: "צ'ק", bank_transfer: 'העברה' };

    // Build HTML
    const html = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: linear-gradient(135deg, #7c2d12 0%, #c2410c 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">בס"ד</h1>
        <h2 style="color: white; margin: 10px 0 0; font-size: 20px;">בית הכנסת ברית שלום — דוחות מפורטים</h2>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">הופק בתאריך ${fmtDate(now.toISOString())}</p>
      </div>

      <div style="background: #fafafa; padding: 30px; border-radius: 0 0 10px 10px;">

        <!-- Summary Cards -->
        <div style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 140px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; text-align: center;">
            <div style="font-size: 12px; color: #991b1b;">סה״כ חובות</div>
            <div style="font-size: 22px; font-weight: bold; color: #dc2626;">${fmt(totalDebt)}</div>
            <div style="font-size: 11px; color: #666;">${memberSummary.length} חברים | ${debtsWithNames.length} חיובים</div>
          </div>
          <div style="flex: 1; min-width: 140px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; text-align: center;">
            <div style="font-size: 12px; color: #166534;">הכנסות (30 יום)</div>
            <div style="font-size: 22px; font-weight: bold; color: #16a34a;">${fmt(totalConfirmed)}</div>
            <div style="font-size: 11px; color: #666;">${confirmedPayments.length} תשלומים מאושרים</div>
          </div>
          <div style="flex: 1; min-width: 140px; background: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; text-align: center;">
            <div style="font-size: 12px; color: #92400e;">הוצאות (30 יום)</div>
            <div style="font-size: 22px; font-weight: bold; color: #d97706;">${fmt(totalExpenses)}</div>
            <div style="font-size: 11px; color: #666;">${(expenses || []).length} הוצאות</div>
          </div>
        </div>

        <!-- Debts by Member -->
        <h3 style="color: #7c2d12; border-bottom: 2px solid #fecaca; padding-bottom: 6px; margin: 24px 0 12px;">📋 דוח חובות — סיכום לפי חבר</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr style="background: #7c2d12; color: white;">
            <th style="padding: 8px; text-align: right;">#</th>
            <th style="padding: 8px; text-align: right;">שם חבר</th>
            <th style="padding: 8px; text-align: right;">מס׳ חיובים</th>
            <th style="padding: 8px; text-align: right;">סה״כ חוב</th>
          </tr>
          ${memberSummary.map((m, i) => `
            <tr style="background: ${i % 2 === 0 ? '#fff' : '#fafafa'}; border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 7px 8px;">${i + 1}</td>
              <td style="padding: 7px 8px; font-weight: 500;">${m.name}</td>
              <td style="padding: 7px 8px;">${m.count}</td>
              <td style="padding: 7px 8px; color: #dc2626; font-weight: 600;">${fmt(m.total)}</td>
            </tr>
          `).join('')}
          <tr style="background: #fef2f2; font-weight: bold; border-top: 2px solid #7c2d12;">
            <td colspan="2" style="padding: 8px;">סה״כ</td>
            <td style="padding: 8px;">${debtsWithNames.length}</td>
            <td style="padding: 8px; color: #dc2626;">${fmt(totalDebt)}</td>
          </tr>
        </table>

        <!-- Detailed Debts -->
        <h3 style="color: #7c2d12; border-bottom: 2px solid #fecaca; padding-bottom: 6px; margin: 28px 0 12px;">📄 פירוט חיובים פתוחים</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr style="background: #7c2d12; color: white;">
            <th style="padding: 6px; text-align: right;">שם חבר</th>
            <th style="padding: 6px; text-align: right;">תיאור</th>
            <th style="padding: 6px; text-align: right;">סכום חיוב</th>
            <th style="padding: 6px; text-align: right;">יתרה</th>
            <th style="padding: 6px; text-align: right;">תאריך</th>
          </tr>
          ${debtsWithNames.slice(0, 100).map((d, i) => `
            <tr style="background: ${i % 2 === 0 ? '#fff' : '#fafafa'}; border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 5px 6px;">${d.member_name}</td>
              <td style="padding: 5px 6px; color: #666;">${d.description || '-'}</td>
              <td style="padding: 5px 6px;">${fmt(Number(d.amount))}</td>
              <td style="padding: 5px 6px; color: #dc2626; font-weight: 600;">${fmt(Number(d.remaining_balance))}</td>
              <td style="padding: 5px 6px; color: #666;">${fmtDate(d.charge_date)}</td>
            </tr>
          `).join('')}
          ${debtsWithNames.length > 100 ? `<tr><td colspan="5" style="padding: 8px; text-align: center; color: #888;">... ועוד ${debtsWithNames.length - 100} חיובים נוספים</td></tr>` : ''}
        </table>

        <!-- Recent Payments -->
        <h3 style="color: #166534; border-bottom: 2px solid #bbf7d0; padding-bottom: 6px; margin: 28px 0 12px;">💰 תשלומים אחרונים (30 יום)</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr style="background: #166534; color: white;">
            <th style="padding: 6px; text-align: right;">שם חבר</th>
            <th style="padding: 6px; text-align: right;">סכום</th>
            <th style="padding: 6px; text-align: right;">אמצעי</th>
            <th style="padding: 6px; text-align: right;">סוג</th>
            <th style="padding: 6px; text-align: right;">סטטוס</th>
            <th style="padding: 6px; text-align: right;">תאריך</th>
          </tr>
          ${(payments || []).slice(0, 50).map((p, i) => `
            <tr style="background: ${i % 2 === 0 ? '#fff' : '#fafafa'}; border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 5px 6px;">${payMembersMap.get(p.member_id) || 'לא ידוע'}</td>
              <td style="padding: 5px 6px; font-weight: 600; color: #16a34a;">${fmt(Number(p.amount))}</td>
              <td style="padding: 5px 6px;">${methodMap[p.method] || p.method}</td>
              <td style="padding: 5px 6px;">${p.payment_type || '-'}</td>
              <td style="padding: 5px 6px;">${p.status === 'confirmed' ? '✅' : '⏳'}</td>
              <td style="padding: 5px 6px; color: #666;">${p.created_at ? fmtDate(p.created_at) : '-'}</td>
            </tr>
          `).join('')}
          ${(payments || []).length > 50 ? `<tr><td colspan="6" style="padding: 8px; text-align: center; color: #888;">... ועוד ${(payments || []).length - 50} תשלומים נוספים</td></tr>` : ''}
        </table>

        <!-- Expenses -->
        <h3 style="color: #92400e; border-bottom: 2px solid #fde68a; padding-bottom: 6px; margin: 28px 0 12px;">🧾 הוצאות אחרונות (30 יום)</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
          <tr style="background: #92400e; color: white;">
            <th style="padding: 6px; text-align: right;">ספק</th>
            <th style="padding: 6px; text-align: right;">סכום</th>
            <th style="padding: 6px; text-align: right;">הערות</th>
            <th style="padding: 6px; text-align: right;">תאריך</th>
          </tr>
          ${(expenses || []).slice(0, 50).map((e, i) => `
            <tr style="background: ${i % 2 === 0 ? '#fff' : '#fafafa'}; border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 5px 6px;">${e.supplier || '-'}</td>
              <td style="padding: 5px 6px; font-weight: 600; color: #d97706;">${fmt(Number(e.amount))}</td>
              <td style="padding: 5px 6px; color: #666;">${e.notes || '-'}</td>
              <td style="padding: 5px 6px; color: #666;">${fmtDate(e.expense_date)}</td>
            </tr>
          `).join('')}
        </table>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="color: #888; font-size: 11px; text-align: center;">
          נוצר אוטומטית ע"י מערכת ניהול בית הכנסת ברית שלום<br>
          ${fmtDate(now.toISOString())} ${now.toLocaleTimeString('he-IL')}
        </p>
      </div>
    </div>`;

    // Send email
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'בית הכנסת ברית שלום <onboarding@resend.dev>',
        to: [email],
        subject: `דוחות מפורטים — בית הכנסת ברית שלום — ${timestamp}`,
        html,
      }),
    });

    const emailResult = await emailResponse.json();
    if (!emailResponse.ok) {
      throw new Error(`Failed to send email: ${JSON.stringify(emailResult)}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Reports email sent' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error sending reports:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
