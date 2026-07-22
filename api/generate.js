export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const { goalWeight, healthGoals, medicalHistory, digestiveIssues, dailySchedule, mealPrep, diet, groceryBudget, calorieGoal } = req.body;

  // Build restriction warnings to inject into prompt
  const restrictions = [];
  if (medicalHistory && medicalHistory.toLowerCase() !== 'none' && medicalHistory.trim()) {
    restrictions.push(`ALLERGY/MEDICAL: "${medicalHistory}" — NEVER include any of these foods or ingredients anywhere in the meal plan. Check every single meal.`);
  }
  if (digestiveIssues && digestiveIssues.toLowerCase() !== 'none' && digestiveIssues.trim()) {
    restrictions.push(`DIGESTIVE ISSUES: "${digestiveIssues}" — avoid all known trigger foods for this condition. For bloating: no raw onions, no excess beans, no carbonated drinks, no cruciferous vegetables in large amounts. For IBS: no high-FODMAP foods. For acid reflux: no spicy food, no citrus, no caffeine.`);
  }
  if (diet && diet.toLowerCase() !== 'no restrictions' && diet.trim()) {
    restrictions.push(`DIET: "${diet}" — strictly follow this. Vegan = zero meat/fish/dairy/eggs. Vegetarian = zero meat/fish. Gluten-free = zero wheat/barley/rye. Keto = under 30g carbs/day, high fat. Paleo = no grains/legumes/dairy. Halal = no pork/alcohol. Kosher = no pork/shellfish, no mixing meat and dairy.`);
  }
  if (mealPrep && mealPrep.trim()) {
    restrictions.push(`MEAL PREP: "${mealPrep}" — match recipe complexity to this. If they rarely cook: simple 15-min meals. If they meal prep weekly: include batch-cookable meals.`);
  }
  if (groceryBudget && groceryBudget.trim()) {
    restrictions.push(`BUDGET: "${groceryBudget}" — keep ingredients affordable and within this budget. Avoid expensive ingredients if budget is tight.`);
  }
  if (dailySchedule && dailySchedule.trim()) {
    restrictions.push(`SCHEDULE: "${dailySchedule}" — match workout duration and timing to fit their daily life. If busy: shorter workouts. If flexible: longer sessions okay.`);
  }
  if (calorieGoal && calorieGoal.trim()) {
    restrictions.push(`CALORIE GOAL: ${calorieGoal} calories/day — design each day's meals to hit this target. Show calorie count in parentheses after each meal.`);
  }

  const restrictionBlock = restrictions.length > 0
    ? `\nCRITICAL PERSONALIZATION RULES — follow every single one:\n${restrictions.map((r,i) => `${i+1}. ${r}`).join('\n')}\n`
    : '';

  const goalLower = (healthGoals || '').toLowerCase();
  const calorieNote = goalLower.includes('muscle') || goalLower.includes('gain')
    ? 'Target 2500-3000 calories/day. High protein every meal (chicken, beef, eggs, Greek yogurt, legumes).'
    : goalLower.includes('loss') || goalLower.includes('lose') || goalLower.includes('weight')
    ? 'Target 1400-1600 calories/day. High fiber, high protein, low calorie density foods.'
    : 'Use appropriate calories for their goals.';

  const prompt = `You are a certified nutritionist and personal trainer creating a fully personalized wellness plan.
${restrictionBlock}
Person profile:
- Goal weight/body type: ${goalWeight}
- Health goals: ${healthGoals}
- Calorie guidance: ${calorieNote}

CRITICAL FORMAT RULES:
1. Each day name must be on its OWN LINE
2. Each meal must be on its OWN LINE
3. Each exercise must be on its OWN LINE
4. Each tip must be on its OWN LINE
5. NO sentences that combine multiple days together
6. Use EXACTLY the markers MEAL_START, MEAL_END, WORKOUT_START, WORKOUT_END, TIPS_START, TIPS_END

MEAL_START
MONDAY
Breakfast: [food specific to their goals and restrictions]
Lunch: [food specific to their goals and restrictions]
Dinner: [food specific to their goals and restrictions]
Snack: [food specific to their goals and restrictions]
TUESDAY
Breakfast: [food]
Lunch: [food]
Dinner: [food]
Snack: [food]
WEDNESDAY
Breakfast: [food]
Lunch: [food]
Dinner: [food]
Snack: [food]
THURSDAY
Breakfast: [food]
Lunch: [food]
Dinner: [food]
Snack: [food]
FRIDAY
Breakfast: [food]
Lunch: [food]
Dinner: [food]
Snack: [food]
SATURDAY
Breakfast: [food]
Lunch: [food]
Dinner: [food]
Snack: [food]
SUNDAY
Breakfast: [food]
Lunch: [food]
Dinner: [food]
Snack: [food]
MEAL_END
WORKOUT_START
MONDAY
Focus: [workout type matching their goals and schedule]
Exercise 1: [name] - [sets x reps or duration]
Exercise 2: [name] - [sets x reps or duration]
Exercise 3: [name] - [sets x reps or duration]
TUESDAY
Focus: [workout type]
Exercise 1: [name] - [sets x reps or duration]
Exercise 2: [name] - [sets x reps or duration]
WEDNESDAY
Focus: [workout type or rest]
Exercise 1: [name] - [sets x reps or duration]
THURSDAY
Focus: [workout type]
Exercise 1: [name] - [sets x reps or duration]
Exercise 2: [name] - [sets x reps or duration]
Exercise 3: [name] - [sets x reps or duration]
FRIDAY
Focus: [workout type]
Exercise 1: [name] - [sets x reps or duration]
Exercise 2: [name] - [sets x reps or duration]
SATURDAY
Focus: [workout type]
Exercise 1: [name] - [sets x reps or duration]
Exercise 2: [name] - [sets x reps or duration]
SUNDAY
Focus: Rest or light activity
WORKOUT_END
TIPS_START
NUTRITION
Tip: [specific tip based on their goals and dietary restrictions]
Tip: [specific tip based on their goals and dietary restrictions]
DIGESTION
Tip: [specific tip based on their digestive issues or general gut health]
Tip: [specific tip]
FITNESS
Tip: [specific tip based on their schedule and fitness goals]
Tip: [specific tip]
MINDSET
Tip: [specific tip]
Tip: [specific tip]
TIPS_END`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'API error');
    const text = data.content?.[0]?.text;
    if (!text) throw new Error('No response from AI');

    // Extract sections using markers
    const mealMatch = text.match(/MEAL_START([\s\S]*?)MEAL_END/);
    const workoutMatch = text.match(/WORKOUT_START([\s\S]*?)WORKOUT_END/);
    const tipsMatch = text.match(/TIPS_START([\s\S]*?)TIPS_END/);

    let meal = mealMatch ? mealMatch[1].trim() : '';
    let workout = workoutMatch ? workoutMatch[1].trim() : '';
    let tips = tipsMatch ? tipsMatch[1].trim() : '';

    // Fallback: force line breaks if AI ignored format
    function forceLineBreaks(raw) {
      if (!raw) return '';
      const days = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY'];
      const categories = ['NUTRITION','DIGESTION','FITNESS','MINDSET'];
      const keywords = ['Breakfast','Lunch','Dinner','Snack','Exercise 1','Exercise 2','Exercise 3','Focus','Tip'];
      let r = raw;
      days.forEach(d => { r = r.replace(new RegExp('(.)('+d+')', 'g'), '$1\n$2'); });
      categories.forEach(c => { r = r.replace(new RegExp('(.)('+c+')', 'g'), '$1\n$2'); });
      keywords.forEach(k => { r = r.replace(new RegExp('(.)(' + k + ':)', 'g'), '$1\n$2'); });
      return r.trim();
    }

    if (!meal && !workout && !tips) {
      meal = forceLineBreaks(text);
    } else {
      meal = forceLineBreaks(meal);
      workout = forceLineBreaks(workout);
      tips = forceLineBreaks(tips);
    }

    res.status(200).json({ meal, workout, tips });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
