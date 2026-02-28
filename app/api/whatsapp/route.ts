import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

function twimlResponse(message: string) {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${message}</Message>
</Response>`;
    return new NextResponse(twiml, {
        headers: { "Content-Type": "text/xml" },
    })
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const body = Object.fromEntries(formData.entries())
        const message_text = body["Body"] as string
        const tenant_phone = body["From"]?.toString().replace("whatsapp:", "");

        if (!message_text || !tenant_phone) {
            return twimlResponse("⚠️ Message haikueleweka. Tafadhali tuma tena.")
        }

        // Detect transaction type
        const isDebit = /sent\s+to/i.test(message_text);
        const isCredit = /received.*from/i.test(message_text);

        // Common: Code and Amount
        const code = message_text.match(/([A-Z0-9]{10})\sConfirmed/i)?.[1];
        const amount = message_text.match(/Ksh([\d,.]+)/i)?.[1]?.replace(/,/g, '');

        // Parse transaction date/time: "on 28/2/26 at 8:38 PM"
        let transaction_date: string | null = null;
        const dateTimeMatch = message_text.match(/on\s+(\d{1,2})\/(\d{1,2})\/(\d{2})\s+at\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (dateTimeMatch) {
            const [, day, month, year, hours, minutes, period] = dateTimeMatch;
            let hour24 = parseInt(hours);
            if (period.toUpperCase() === 'PM' && hour24 !== 12) hour24 += 12;
            if (period.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0;
            const fullYear = 2000 + parseInt(year);
            const date = new Date(fullYear, parseInt(month) - 1, parseInt(day), hour24, parseInt(minutes));
            transaction_date = date.toISOString();
        }

        let customer_name: string | null = null;
        let customer_phone: string | null = null;

        if (isCredit) {
            // "received Ksh... from Name Phone on"
            customer_name = message_text.match(/from\s+(.+?)\s+\S+\s+on\s+\d/i)?.[1]?.trim() || null;
            customer_phone = message_text.match(/from\s.+\s(\S+)\s+on\s+\d/i)?.[1] || null;
        } else if (isDebit) {
            // "sent to Name. for account Phone on" or "sent to Name on"
            customer_name = message_text.match(/sent\s+to\s+(.+?)(?:\.\s+for|\s+on\s+\d)/i)?.[1]?.trim() || null;
            customer_phone = message_text.match(/for\s+account\s+(\S+)\s+on/i)?.[1] || null;
        }

        if (!code || !amount || !customer_name || (!isCredit && !isDebit)) {
            return twimlResponse("⚠️ Hatukuweza kusoma M-Pesa message. Tafadhali tuma message kamili.")
        }

        const txType = isDebit ? 'debit' : 'credit';

        // Check for duplicate mpesa code
        const { data: existing } = await supabase
            .from('transactions')
            .select('id')
            .eq('mpesa_code', code)
            .maybeSingle()

        if (existing) {
            return twimlResponse("ℹ️ Payment isha-recordiwa.")
        }

        // upsert tenant
        const { data: tenant, error: tenantError } = await supabase
            .from("tenants")
            .upsert({ owner_phone: tenant_phone }, { onConflict: 'owner_phone' })
            .select("id")
            .single()

        if (tenantError || !tenant) {
            console.error("Tenant upsert failed:", tenantError)
            return twimlResponse("⚠️ Kuna tatizo la system. Tafadhali try tena baadaye.")
        }

        // upsert customer
        const { data: customer, error: customerError } = await supabase
            .from('customers')
            .upsert({ phone: customer_phone, name: customer_name, tenant_id: tenant.id }, { onConflict: "phone,tenant_id" })
            .select("id")
            .single()

        if (customerError || !customer) {
            console.error("Customer upsert failed:", customerError)
            return twimlResponse("⚠️ Kuna tatizo la system. Tafadhali try tena baadaye.")
        }

        // insert transaction
        const { error: txError } = await supabase
            .from('transactions')
            .insert({ mpesa_code: code, amount, type: txType, status: 'paid', raw_text: message_text, tenant_id: tenant.id, customer_id: customer.id, transaction_date })

        if (txError) {
            console.error("Transaction insert failed:", txError)
            return twimlResponse("⚠️ Kuna tatizo la save payment. Tafadhali try tena baadaye.")
        }

        const txLabel = txType === 'credit' ? 'Umepokea' : 'Umetuma';
        return twimlResponse(`✅ Imerekodiwa! ${txLabel} Ksh${amount} ${txType === 'credit' ? 'kutoka kwa' : 'kwa'} ${customer_name}. Angalia records yako hapa: ${process.env.APP_URL}`)

    } catch (error) {
        console.error("Unexpected error:", error)
        return twimlResponse("⚠️ Kuna tatizo. Tafadhali try tena baadaye.")
    }
}
