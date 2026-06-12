export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  const { goalWeight, healthGoals, medicalHistory, digestiveIssues, dailySchedule, mealPrep, diet, groceryBudget } = req.body;
  const prompt = `You are a certified nutritionist and personal trainer. Create a fully personalized wellness plan. IMPORTANT: If goal includes weight loss give fat-burning low-calorie foods. If muscle gain give high-protein foods. NEVER include anything they are allergic to. If bloating issues avoid onions, beans, carbonated drinks.\n\nProfile:\n- Goal: ${goalWeight}\n- Health goals: ${healthGoals}\n- Allergies/medical: ${medicalHistory||'None'}\n- Digestive issues: ${digestiveIssues||'None'}\n- Schedule: ${dailySchedule||'Not specified'}\n- Meal prep: ${mealPrep||'Not specified'}\n- Diet: ${diet||'No restrictions'}\n- Budget: ${groceryBudget||'Not specified'}\n\nRespond ONLY with valid JSON, no markdown:\n{"meal":"7-day meal plan text","workout":"weekly workout text","tips":"8 personalized tips"}`;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'API error');
    const text = data.content?.[0]?.text;
    if (!text) throw new Error('No response');
    let parsed;
    try { parsed = JSON.parse(text.replace(/```json|```/g,'').trim()); }
    catch(e) { parsed = { meal: text, workout: '', tips: '' }; }
    res.status(200).json(parsed);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
