# WhatsApp Cloud API Migration Guide

## Overview

Switch from Twilio WhatsApp to Meta's Cloud API directly. This eliminates Twilio's $0.005/message markup and gives you free service replies (your main use case).

The code migration is already done in `app/api/whatsapp/route.ts`. This guide covers the Meta side setup.

---

## Step 1: Create a Meta Developer Account

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Log in with your personal Facebook account (or create one)
3. Click "My Apps" → "Create App"
4. Select "Other" as use case → "Business" as app type
5. Name it something like "Biashara WhatsApp Bot"
6. You now have an App ID and App Dashboard

## Step 2: Set Up WhatsApp in the App

1. In your App Dashboard, click "Add Product" in the left sidebar
2. Find "WhatsApp" and click "Set Up"
3. You'll land on the WhatsApp > Getting Started page
4. Meta gives you a free test phone number and a test recipient allowlist
5. Note down:
   - **Phone Number ID** — shown under "From" dropdown (this is `WHATSAPP_PHONE_ID`)
   - **Temporary Access Token** — shown on the page (valid 24hrs, we'll make it permanent later)

## Step 3: Test With the Sandbox Number

Before going production, verify the flow works:

1. Add your personal WhatsApp number to the test recipients list (button on the Getting Started page)
2. Send yourself a test message using the "Send Message" button on the dashboard
3. Confirm you receive it on WhatsApp

## Step 4: Configure the Webhook

1. In the App Dashboard, go to WhatsApp > Configuration
2. Under "Webhook", click "Edit"
3. Enter:
   - **Callback URL**: `https://your-domain.com/api/whatsapp`
   - **Verify Token**: any secret string you choose (this is `WHATSAPP_VERIFY_TOKEN`)
4. Click "Verify and Save" — Meta will send a GET request to your endpoint
5. Your app's GET handler will respond with the challenge (already implemented)
6. After verification, click "Manage" next to Webhook fields
7. Subscribe to the **messages** field (this is the only one you need)

## Step 5: Generate a Permanent Access Token

The temporary token from Step 2 expires in 24 hours. For production:

1. Go to [business.facebook.com](https://business.facebook.com) → Settings → Business Settings
2. Under "Users" → "System Users", create a new System User
   - Name: "whatsapp-bot"
   - Role: Admin
3. Click on the system user → "Add Assets"
   - Select your App → toggle "Full Control"
4. Click "Generate New Token"
   - Select your App
   - Check these permissions:
     - `whatsapp_business_messaging`
     - `whatsapp_business_management`
   - Token expiration: "Never" (permanent)
5. Copy the token — this is your `WHATSAPP_TOKEN`

**Store this securely. You won't see it again.**

## Step 6: Set Environment Variables

Add to your `.env`:

```
WHATSAPP_TOKEN=<permanent token from Step 5>
WHATSAPP_PHONE_ID=<phone number ID from Step 2>
WHATSAPP_VERIFY_TOKEN=<the secret string you chose in Step 4>
```

## Step 7: Register a Real Business Number (Production)

The sandbox number is fine for testing but has limitations. For production:

1. In WhatsApp > Getting Started, click "Add Phone Number"
2. You'll need:
   - A phone number that can receive SMS or voice calls for verification
   - This number must NOT already be registered on WhatsApp (personal or business app)
   - If it is, remove WhatsApp from that number first
3. Enter your business phone number and verify via SMS/call
4. Update `WHATSAPP_PHONE_ID` in `.env` with the new number's ID
5. Your users will now message this number instead of the sandbox one

**Tip:** If you want to use a number currently on WhatsApp Business app, you must delete the app from that phone first. The number can only be on one platform at a time.

## Step 8: Complete Business Verification

Meta requires business verification for:
- Sending messages to users who haven't messaged you first (template messages)
- Higher messaging limits (beyond 250 unique users/day)

1. Go to Business Settings → Security Center → "Start Verification"
2. You'll need:
   - Business name and address
   - Business registration documents (or utility bill, bank statement)
   - A business website or social media page
3. Verification typically takes 2-5 business days
4. Once verified, your messaging limit increases progressively:
   - Unverified: 250 unique users/24hrs
   - Verified: 1,000 → 10,000 → 100,000 (auto-scales based on quality)

## Step 9: Set Up Message Templates (Optional)

You only need templates if you want to message users OUTSIDE the 24-hour service window (e.g., reminders, notifications). For your current flow (user sends message → bot replies), templates are not needed.

If you want them later:
1. Go to WhatsApp > Message Templates
2. Create a template (e.g., "payment_reminder")
3. Submit for Meta approval (usually takes minutes to hours)
4. Use the template API endpoint to send

---

## Pricing Summary (Post-Migration)

| Scenario | Cost |
|---|---|
| User sends message, bot replies within 24hrs | **Free** (service conversation) |
| Bot sends template message outside 24hrs | ~$0.003-0.01 per message (Rest of Africa rate) |
| Twilio markup | **$0** (eliminated) |

Your core flow (M-Pesa forward → bot reply, Job/Bal commands) is entirely within the 24hr service window = **$0 per message from Meta**.

---

## Checklist

- [ ] Meta Developer account created
- [ ] App created with WhatsApp product added
- [ ] Test message sent successfully from dashboard
- [ ] Webhook URL configured and verified
- [ ] Subscribed to `messages` webhook field
- [ ] Permanent System User token generated
- [ ] `.env` updated with `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`
- [ ] Deploy app with new env vars
- [ ] Test end-to-end: send WhatsApp message → receive reply
- [ ] (Production) Real business phone number registered
- [ ] (Production) Business verification submitted
- [ ] (Cleanup) Remove old Twilio env vars and account if no longer needed

---

## Troubleshooting

**Webhook verification fails:**
- Make sure your app is deployed and the `/api/whatsapp` endpoint is publicly accessible
- Check that `WHATSAPP_VERIFY_TOKEN` in `.env` matches what you entered in Meta's dashboard
- Check server logs for the GET request

**Messages received but no reply:**
- Check server logs for errors in `processAndReply`
- Verify `WHATSAPP_TOKEN` is valid (not the expired temporary one)
- Verify `WHATSAPP_PHONE_ID` matches the number receiving messages
- Test the token manually: `curl -H "Authorization: Bearer YOUR_TOKEN" https://graph.facebook.com/v21.0/YOUR_PHONE_ID`

**"Phone number not registered" error when sending:**
- Meta sends phone numbers without `+` prefix (e.g., `254712345678`)
- The `sendWhatsAppReply` function uses this format directly — this is correct
- Make sure you're not accidentally adding `+` or `whatsapp:` prefix

**Rate limited (error 130429):**
- You've hit the messaging limit for your tier
- Complete business verification to increase limits
- Check your quality rating in WhatsApp Manager
