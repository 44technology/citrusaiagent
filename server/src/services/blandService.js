const BLAND_API_URL = 'https://api.bland.ai/v1';

/**
 * Build the AI agent prompt based on contact and campaign settings
 */
function buildPrompt(contact, settings) {
  const fruitPitch = settings.fruitPitch || 'Florida Oranges (Sweet & Juicy)';
  const outreach = settings.outreachMethod || 'Voice Call & Follow-up Email';

  return `You are a professional sales agent for Citrus Co., a premium citrus fruit distributor.

Your goal is to reach out to ${contact.name} from ${contact.company || 'their company'} and pitch our product: ${fruitPitch}.

Key talking points:
- We offer the freshest, farm-to-table citrus fruits in the region
- Competitive wholesale pricing with flexible delivery schedules
- ${contact.credit > 0 ? `They have a pre-approved credit line of $${contact.credit.toLocaleString()}` : 'We offer financing options through Capital Box'}
- We ship nationwide with cold-chain logistics

Be friendly, professional, and conversational. If they show interest, ask for their preferred delivery schedule and quantity.
If they are not interested, thank them politely and ask if they'd like to be contacted in the future.

Important: This call is a ${outreach} outreach. Keep the conversation under 3 minutes.`;
}

/**
 * Make a call via Bland.ai API
 */
export async function makeCall(contact, settings = {}) {
  const apiKey = process.env.BLAND_API_KEY;

  if (!apiKey || apiKey === 'your_bland_api_key_here') {
    console.warn('⚠️ Bland.ai API key not configured. Simulating call...');
    return simulateCall(contact);
  }

  const language = settings.agentLanguage === 'Strictly Spanish' ? 'es'
    : settings.agentLanguage === 'Strictly English' ? 'en'
    : (contact.language === 'Spanish' ? 'es' : 'en');

  const body = {
    phone_number: contact.phone,
    task: buildPrompt(contact, settings),
    first_sentence: `Hi, is this ${contact.name}? This is Alex calling from Citrus Co. How are you doing today?`,
    model: 'base',
    language,
    voice: 'matt',
    wait_for_greeting: true,
    max_duration: 3,
    reduce_latency: true,
    metadata: {
      contactId: contact.id
    }
  };

  // Only add webhook if BASE_URL is https (production)
  if (process.env.BASE_URL && process.env.BASE_URL.startsWith('https://')) {
    body.webhook = `${process.env.BASE_URL}/api/campaigns/webhook`;
  }

  const response = await fetch(`${BLAND_API_URL}/calls`, {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Bland.ai API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Get call status from Bland.ai
 */
export async function getCallStatus(callId) {
  const apiKey = process.env.BLAND_API_KEY;

  if (!apiKey || apiKey === 'your_bland_api_key_here') {
    return { status: 'completed', call_id: callId };
  }

  const response = await fetch(`${BLAND_API_URL}/calls/${callId}`, {
    headers: { 'Authorization': apiKey }
  });

  if (!response.ok) {
    throw new Error(`Bland.ai status check failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Simulate a call for development (when no API key is set)
 */
function simulateCall(contact) {
  const fakeCallId = `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  console.log(`📞 SIMULATED CALL to ${contact.name} (${contact.phone}) — Call ID: ${fakeCallId}`);

  setTimeout(async () => {
    try {
      const webhookBody = {
        call_id: fakeCallId,
        status: 'completed',
        call_length: Math.floor(Math.random() * 120) + 30,
        transcripts: [
          { user: 'agent', text: `Hi ${contact.name}, this is Alex from Citrus Co...` },
          { user: 'user', text: 'Oh hi, tell me more about your products.' },
          { user: 'agent', text: 'We offer premium Florida oranges...' },
          { user: 'user', text: 'That sounds interesting, send me more info.' }
        ],
        summary: `Spoke with ${contact.name}. They showed interest in our citrus products and requested more information.`
      };

      await fetch(`${process.env.BASE_URL}/api/campaigns/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookBody)
      });
    } catch (err) {
      console.error('Simulated webhook failed:', err.message);
    }
  }, 3000);

  return { call_id: fakeCallId, status: 'queued' };
}
