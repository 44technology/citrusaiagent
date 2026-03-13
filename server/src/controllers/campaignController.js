import { PrismaClient } from '@prisma/client';
import { makeCall, getCallStatus } from '../services/blandService.js';

const prisma = new PrismaClient();

/**
 * Poll Bland.ai for call completion and update DB
 */
async function pollCallCompletion(callId, contactId, callLogId) {
  const maxAttempts = 60; // Poll for up to 5 minutes (every 5 seconds)
  let attempts = 0;

  const poll = async () => {
    attempts++;
    if (attempts > maxAttempts) {
      console.log(`⏰ Polling timeout for call ${callId}`);
      return;
    }

    try {
      const statusData = await getCallStatus(callId);
      console.log(`📊 Poll #${attempts} for call ${callId}: status=${statusData.status || statusData.queue_status}`);

      const isCompleted = statusData.status === 'completed' || statusData.completed === true;
      const isFailed = statusData.status === 'failed' || statusData.status === 'error';

      if (isCompleted || isFailed) {
        // Build transcript
        const transcripts = statusData.transcripts || statusData.concatenated_transcript || '';
        const transcript = Array.isArray(transcripts)
          ? transcripts.map(t => `${t.user}: ${t.text}`).join('\n')
          : (typeof transcripts === 'string' ? transcripts : '');

        // Update call log
        await prisma.callLog.update({
          where: { id: callLogId },
          data: {
            status: isCompleted ? 'completed' : 'failed',
            duration: statusData.call_length || statusData.duration || null,
            transcript: transcript || null,
            summary: statusData.summary || statusData.analysis || null
          }
        });

        // Update contact status
        const newStatus = isCompleted ? 'Completed (Call & Email Sent)' : 'Completed (Not Interested)';
        await prisma.contact.update({
          where: { id: contactId },
          data: { status: newStatus }
        });

        // Add system note
        const duration = statusData.call_length || statusData.duration || 0;
        const summary = statusData.summary || statusData.analysis || '';
        await prisma.note.create({
          data: {
            text: `AI Call ${isCompleted ? 'completed' : 'failed'}. Duration: ${duration}s. ${summary}`,
            isSystem: true,
            contactId
          }
        });

        console.log(`✅ Call ${callId} finished: ${newStatus}`);
        return;
      }

      // Not done yet, poll again in 5 seconds
      setTimeout(poll, 5000);
    } catch (err) {
      console.error(`Polling error for call ${callId}:`, err.message);
      setTimeout(poll, 5000);
    }
  };

  // Start polling after 10 seconds (give call time to connect)
  setTimeout(poll, 10000);
}

// POST /api/campaigns/call — Start AI call for a single contact
export const startCall = async (req, res) => {
  try {
    const { contactId, settings } = req.body;
    if (!contactId) return res.status(400).json({ error: 'contactId is required' });

    const contact = await prisma.contact.findUnique({ where: { id: contactId } });
    if (!contact) return res.status(404).json({ error: 'Contact not found' });

    // Update contact status
    await prisma.contact.update({
      where: { id: contactId },
      data: { status: 'Calling / Emailing' }
    });

    // Make the Bland.ai call
    const callResult = await makeCall(contact, settings || {});

    // Log the call
    const callLog = await prisma.callLog.create({
      data: {
        blandCallId: callResult.call_id || null,
        status: 'in_progress',
        contactId
      }
    });

    // Add system note
    await prisma.note.create({
      data: {
        text: `AI Call initiated. Call ID: ${callResult.call_id || 'N/A'}`,
        isSystem: true,
        contactId
      }
    });

    // Start polling for call completion (only for real calls, not simulated)
    if (callResult.call_id && !callResult.call_id.startsWith('sim_')) {
      pollCallCompletion(callResult.call_id, contactId, callLog.id);
    }

    res.json({ success: true, callId: callResult.call_id, callLogId: callLog.id });
  } catch (error) {
    console.error('Error starting call:', error);
    res.status(500).json({ error: 'Failed to start call', details: error.message });
  }
};

// POST /api/campaigns/bulk — Start bulk campaign
export const startBulkCampaign = async (req, res) => {
  try {
    const { contactIds, settings } = req.body;
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return res.status(400).json({ error: 'contactIds array is required' });
    }

    const results = [];

    for (const contactId of contactIds) {
      try {
        const contact = await prisma.contact.findUnique({ where: { id: contactId } });
        if (!contact) continue;

        await prisma.contact.update({
          where: { id: contactId },
          data: { status: 'Calling / Emailing' }
        });

        const callResult = await makeCall(contact, settings || {});

        const callLog = await prisma.callLog.create({
          data: {
            blandCallId: callResult.call_id || null,
            status: 'in_progress',
            contactId
          }
        });

        await prisma.note.create({
          data: {
            text: `AI Call initiated (Bulk Campaign). Call ID: ${callResult.call_id || 'N/A'}`,
            isSystem: true,
            contactId
          }
        });

        // Start polling for each call
        if (callResult.call_id && !callResult.call_id.startsWith('sim_')) {
          pollCallCompletion(callResult.call_id, contactId, callLog.id);
        }

        results.push({ contactId, success: true, callId: callResult.call_id });
      } catch (err) {
        results.push({ contactId, success: false, error: err.message });
      }
    }

    res.json({ total: contactIds.length, results });
  } catch (error) {
    console.error('Error starting bulk campaign:', error);
    res.status(500).json({ error: 'Failed to start bulk campaign' });
  }
};

// POST /api/campaigns/webhook — Webhook receiver for Bland.ai call results (production)
export const handleBlandWebhook = async (req, res) => {
  try {
    const { call_id, status, transcripts, summary, call_length } = req.body;
    console.log('📞 Bland.ai webhook received:', { call_id, status });

    if (!call_id) return res.status(400).json({ error: 'call_id is required' });

    const callLog = await prisma.callLog.findFirst({
      where: { blandCallId: call_id }
    });

    if (!callLog) {
      console.warn('No call log found for call_id:', call_id);
      return res.status(404).json({ error: 'Call log not found' });
    }

    const isCompleted = status === 'completed';
    const transcript = Array.isArray(transcripts) 
      ? transcripts.map(t => `${t.user}: ${t.text}`).join('\n') 
      : (typeof transcripts === 'string' ? transcripts : '');

    await prisma.callLog.update({
      where: { id: callLog.id },
      data: {
        status: isCompleted ? 'completed' : 'failed',
        duration: call_length || null,
        transcript: transcript || null,
        summary: summary || null
      }
    });

    const newStatus = isCompleted ? 'Completed (Call & Email Sent)' : 'Completed (Not Interested)';
    await prisma.contact.update({
      where: { id: callLog.contactId },
      data: { status: newStatus }
    });

    await prisma.note.create({
      data: {
        text: `AI Call ${isCompleted ? 'completed' : 'failed'}. Duration: ${call_length || 0}s. ${summary || ''}`,
        isSystem: true,
        contactId: callLog.contactId
      }
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
};

// GET /api/campaigns/status/:callId — Check call status
export const checkCallStatus = async (req, res) => {
  try {
    const { callId } = req.params;
    const statusData = await getCallStatus(callId);
    res.json(statusData);
  } catch (error) {
    console.error('Error checking call status:', error);
    res.status(500).json({ error: 'Failed to check call status' });
  }
};
