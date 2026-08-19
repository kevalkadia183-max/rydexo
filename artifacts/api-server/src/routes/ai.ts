import { Router } from 'express';

export const aiRouter = Router();

// ── Helpers ────────────────────────────────────────────────────────────────────

function getOpenAIClient(): { baseUrl: string; apiKey: string } | null {
  const baseUrl = process.env['AI_INTEGRATIONS_OPENAI_BASE_URL'];
  const apiKey  = process.env['AI_INTEGRATIONS_OPENAI_API_KEY'];
  if (!baseUrl || !apiKey) return null;
  return { baseUrl, apiKey };
}

async function callOpenAI(systemPrompt: string, userPrompt: string): Promise<string | null> {
  const client = getOpenAIClient();
  if (!client) return null;

  try {
    const res = await fetch(`${client.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${client.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-5.6-luna',
        max_completion_tokens: 256,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      console.error('[AI] OpenAI request failed:', res.status, await res.text());
      return null;
    }

    const data = await res.json() as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (err) {
    console.error('[AI] OpenAI call error:', err);
    return null;
  }
}

// ── Static fallbacks ───────────────────────────────────────────────────────────

function staticTripCoaching(score: number, speedingCount: number, brakingCount: number, accelCount: number): string[] {
  const tips: string[] = [];

  if (score >= 90) {
    tips.push('Exceptional drive! Your speed discipline and smooth inputs reflect a highly skilled driver.');
    tips.push('Keep maintaining this level — consistent safe driving compounds into significantly lower fuel costs over time.');
  } else if (score >= 75) {
    tips.push('Solid drive overall. A few small tweaks can push you into the top-tier range consistently.');
    if (speedingCount > 0) tips.push(`You had ${speedingCount} speeding event${speedingCount > 1 ? 's' : ''}. Try setting your cruise 5 km/h below the limit to give yourself a natural buffer.`);
    else if (brakingCount > 0) tips.push(`${brakingCount} hard braking event${brakingCount > 1 ? 's' : ''} detected. Increasing your following distance by one extra car length typically eliminates these.`);
  } else if (score >= 55) {
    if (speedingCount > 0) tips.push(`Speeding was your biggest penalty this trip (${speedingCount} event${speedingCount > 1 ? 's' : ''}). Modern speed-camera detection apps can help you stay aware of limits.`);
    if (brakingCount > 0) tips.push(`${brakingCount} hard braking event${brakingCount > 1 ? 's' : ''} suggest following distances could be wider — try the "3-second rule" from the car ahead.`);
    if (tips.length === 0) tips.push('Multiple events this trip. Focus on smooth, predictable inputs — both your score and fuel economy will reward you.');
  } else {
    tips.push('This trip had several safety events. Slowing down by even 10 km/h on faster roads reduces stopping distances dramatically.');
    if (brakingCount > 2) tips.push('Frequent hard braking is hard on brake pads and passengers alike — scan further ahead so you can ease off the throttle early instead.');
  }

  if (tips.length < 2) tips.push('Smooth, consistent driving is the single best habit you can build. Each trip is a chance to improve your personal best.');
  return tips.slice(0, 3);
}

function staticWeeklySummary(score: number, tripCount: number, period: string): string {
  if (tripCount === 0) return `No trips recorded ${period === 'week' ? 'this week' : 'this month'} yet. Start a drive to see your coaching summary.`;
  if (score >= 90) return `Outstanding ${period === 'week' ? 'week' : 'month'}! Your average score of ${score}/100 puts you among the safest drivers on the road. Keep maintaining those smooth, predictable inputs.`;
  if (score >= 75) return `Good ${period === 'week' ? 'week' : 'month'} with an average score of ${score}/100 across ${tripCount} trip${tripCount > 1 ? 's' : ''}. You're driving well — a little more attention to speed limits and following distance will push you into the excellent range.`;
  if (score >= 55) return `Your ${tripCount} trip${tripCount > 1 ? 's' : ''} this ${period === 'week' ? 'week' : 'month'} averaged ${score}/100. There's clear room to improve — focus on reducing speeding events and giving yourself more braking room.`;
  return `Your average score of ${score}/100 this ${period === 'week' ? 'week' : 'month'} highlights some areas to work on. Smoother acceleration, earlier braking, and stricter speed limit adherence will make the biggest difference.`;
}

// ── POST /api/ai/trip-coaching ──────────────────────────────────────────────────
//
// Body: { score, events: { type, severity }[], distance, maxSpeed, duration }
// Returns: { tips: string[], source: 'ai' | 'static' }

aiRouter.post('/trip-coaching', async (req, res) => {
  try {
    const { score = 0, events = [], distance = 0, maxSpeed = 0, duration = 0 } = req.body ?? {};

    const speedingEvents = (events as { type: string; severity: string }[]).filter(e => e.type === 'speeding');
    const brakingEvents  = (events as { type: string; severity: string }[]).filter(e => e.type === 'hard_braking');
    const accelEvents    = (events as { type: string; severity: string }[]).filter(e => e.type === 'rapid_acceleration');

    const systemPrompt = `You are a friendly, expert driving coach providing concise, actionable feedback after a trip. 
Be encouraging but honest. Always give 2–3 short coaching sentences (each under 40 words). 
Return ONLY the sentences separated by the pipe character "|". No lists, no headers, no extra text.
Focus on the most impactful improvement the driver can make, or praise strong performance with a specific tip.`;

    const eventSummary = [
      speedingEvents.length > 0 ? `${speedingEvents.length} speeding event${speedingEvents.length > 1 ? 's' : ''} (${speedingEvents.filter(e => e.severity === 'high').length} high severity)` : 'no speeding',
      brakingEvents.length  > 0 ? `${brakingEvents.length} hard braking event${brakingEvents.length > 1 ? 's' : ''}` : 'no hard braking',
      accelEvents.length    > 0 ? `${accelEvents.length} rapid acceleration event${accelEvents.length > 1 ? 's' : ''}` : 'smooth acceleration',
    ].join(', ');

    const distMin = Math.round(duration / 60);
    const userPrompt = `Trip stats: score ${score}/100, ${distance.toFixed(1)} km, ${distMin} min, max speed ${Math.round(maxSpeed)} km/h. Events: ${eventSummary}.`;

    const aiText = await callOpenAI(systemPrompt, userPrompt);

    if (aiText) {
      const tips = aiText.split('|').map(s => s.trim()).filter(Boolean).slice(0, 3);
      res.json({ tips, source: 'ai' });
      return;
    }

    // Static fallback
    const tips = staticTripCoaching(score, speedingEvents.length, brakingEvents.length, accelEvents.length);
    res.json({ tips, source: 'static' });
  } catch (err) {
    console.error('[AI] trip-coaching error:', err);
    res.status(500).json({ error: 'Failed to generate coaching' });
  }
});

// ── POST /api/ai/weekly-summary ────────────────────────────────────────────────
//
// Body: { avgScore, tripCount, speedingEvents, brakingEvents, totalDistance, period }
// Returns: { summary: string, source: 'ai' | 'static' }

aiRouter.post('/weekly-summary', async (req, res) => {
  try {
    const {
      avgScore = 0, tripCount = 0, speedingEvents = 0, brakingEvents = 0,
      totalDistance = 0, period = 'week',
    } = req.body ?? {};

    if (tripCount === 0) {
      res.json({ summary: staticWeeklySummary(0, 0, period), source: 'static' });
      return;
    }

    const systemPrompt = `You are an expert driving coach writing a brief, motivating weekly summary paragraph for a driver.
Write 2–3 sentences (under 80 words total). Be specific, positive, and actionable.
Return ONLY the paragraph — no labels, no formatting, no extra text.`;

    const userPrompt = `${period === 'week' ? 'Weekly' : 'Monthly'} stats: average score ${avgScore}/100, ${tripCount} trip${tripCount > 1 ? 's' : ''}, ${totalDistance.toFixed(1)} km total. Events: ${speedingEvents} speeding, ${brakingEvents} hard braking.`;

    const aiText = await callOpenAI(systemPrompt, userPrompt);

    if (aiText) {
      res.json({ summary: aiText, source: 'ai' });
      return;
    }

    res.json({ summary: staticWeeklySummary(avgScore, tripCount, period), source: 'static' });
  } catch (err) {
    console.error('[AI] weekly-summary error:', err);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});
