// Sample data for the pilot UI. Later this comes from the server function
// that sends the fridge photo to Claude and returns the same shapes.

export type ItemStatus = 'have' | 'expiring' | 'missing';

export type Item = {
  name: string;
  status: ItemStatus;
  note?: string;
};

export type Step = {
  text: string;
  tip?: string;
  timerSec?: number;
};

export type Recipe = {
  id: string;
  title: string;
  minutes: number;
  extraCost: number;
  level: string;
  emoji: string;
  items: Item[];
  steps: Step[];
};

export const RECIPES: Recipe[] = [
  {
    id: 'shakshuka',
    title: 'שקשוקה עם פטה ותרד',
    minutes: 20,
    extraCost: 0,
    level: 'קל',
    emoji: '🍳',
    items: [
      { name: 'תרד', status: 'expiring', note: 'עוד יומיים' },
      { name: 'ביצים', status: 'have' },
      { name: 'עגבניות', status: 'have' },
      { name: 'פטה', status: 'have' },
      { name: 'בצל', status: 'have' },
      { name: 'כמון', status: 'missing', note: 'אפשר בלי' },
    ],
    steps: [
      { text: 'מטגנים בצל ושום 3 דקות', tip: 'אש בינונית, עד שהבצל שקוף.', timerSec: 180 },
      { text: 'מוסיפים עגבניות ובצל, ומבשלים 8 דקות', tip: 'מערבבים מדי פעם כדי שלא יידבק.', timerSec: 480 },
      { text: 'מוסיפים את התרד ושוברים 4 ביצים לתוך הרוטב', tip: 'עושים גומות קטנות בכף לכל ביצה.' },
      { text: 'מכסים ומבשלים 5 דקות, ומפזרים פטה', tip: 'החלבון לבן והחלמון עדיין רך.', timerSec: 300 },
    ],
  },
  {
    id: 'pasta',
    title: 'פסטה עגבניות ופטה בתנור',
    minutes: 15,
    extraCost: 0,
    level: 'קל מאוד',
    emoji: '🍝',
    items: [
      { name: 'פסטה', status: 'have' },
      { name: 'עגבניות', status: 'have' },
      { name: 'פטה', status: 'have' },
      { name: 'שום', status: 'have' },
      { name: 'בזיליקום', status: 'missing', note: 'אפשר בלי' },
    ],
    steps: [
      { text: 'מבשלים פסטה במים רותחים עם מלח', timerSec: 600 },
      { text: 'מחממים עגבניות, שום ופטה במחבת גדולה עם שמן זית', timerSec: 300 },
      { text: 'מועכים הכל לרוטב ומערבבים עם הפסטה', tip: 'כף ממי הבישול עוזרת לרוטב להיצמד.' },
    ],
  },
  {
    id: 'omelette',
    title: 'חביתת תרד ופטה בפיתה',
    minutes: 10,
    extraCost: 0,
    level: 'קל מאוד',
    emoji: '🥙',
    items: [
      { name: 'ביצים', status: 'have' },
      { name: 'תרד', status: 'expiring', note: 'עוד יומיים' },
      { name: 'פטה', status: 'have' },
      { name: 'פיתות', status: 'have' },
    ],
    steps: [
      { text: 'מקציפים 3 ביצים עם קורט מלח' },
      { text: 'מטגנים תרד דקה, מוסיפים את הביצים ומפזרים פטה', timerSec: 180 },
      { text: 'מקפלים, חותכים ומכניסים לפיתה חמה' },
    ],
  },
];

// One question per session, asked inside the recipe screen.
export const PREF_QUESTIONS = [
  { id: 'meat', q: 'שאלה קטנה, רק פעם אחת: אתה אוכל בשר?', answers: ['כן, הכל', 'רק עוף', 'צמחוני'] },
  { id: 'spicy', q: 'אוהב חריף?', answers: ['מאוד', 'קצת', 'בלי'] },
  { id: 'time', q: 'כמה זמן יש לך בדרך כלל לבשל בערב?', answers: ['10 דקות', '20 דקות', 'כמה שצריך'] },
];

export const REASONS = ['בלי ביצים', 'יותר מהר', 'משהו חם', 'משהו קליל', 'בלי לבשל', 'משהו מתוק'];

export const STAPLES = [
  'חלב', 'ביצים', 'לחם', 'פסטה', 'אורז', 'עגבניות', 'מלפפונים', 'בצל',
  'שום', 'גבינה צהובה', "קוטג'", 'שמן זית', 'טונה', 'יוגורט', 'פיתות', 'קפה',
];

export const DEFAULT_STAPLES = ['חלב', 'ביצים', 'לחם', 'פסטה', 'עגבניות', 'מלפפונים', 'בצל', "קוטג'", 'שמן זית', 'פיתות'];

// What the photo shows right now, used to build the shopping list.
export const IN_FRIDGE_NOW = ['ביצים', 'עגבניות', 'פטה', 'בצל', 'פסטה', 'פיתות', 'שום', 'תרד'];

export const HOME_CARDS = [
  { icon: '!', tone: 'warn' as const, title: 'התרד שלך נגמר מחר', sub: 'נכין ממנו שקשוקה הערב? צלם ונראה.' },
  { icon: '₪', tone: 'fresh' as const, title: 'השבוע: 2 ארוחות, חסכת ₪120', sub: 'עוד אחת ושברת שיא.' },
  { icon: '↺', tone: 'accent' as const, title: 'פעם שעברה הכנת שקשוקה', sub: 'אהבת. רוצה משהו דומה?' },
];
