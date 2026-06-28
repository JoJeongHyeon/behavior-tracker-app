export const mealKeys = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "lateNightSnack",
] as const;

export type MealKey = (typeof mealKeys)[number];

export const mealLabels: Record<MealKey, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
  lateNightSnack: "야식",
};

export type MealEntry = {
  checked: boolean;
  food: string;
};

export type ExerciseItem = {
  id: string;
  name: string;
  minutes: string;
  count: string;
  sets: string;
  note: string;
};

export type DailyRecord = {
  date: string;
  mood: string;
  weight: {
    done: boolean;
    value: string;
  };
  meals: {
    done: boolean;
    items: Record<MealKey, MealEntry>;
    score: number;
    praise: string;
  };
  exercise: {
    done: boolean;
    items: ExerciseItem[];
    note: string;
  };
  study: {
    done: boolean;
    subject: string;
    minutes: string;
    note: string;
  };
  poetry: {
    done: boolean;
    title: string;
    body: string;
    link: string;
  };
  reading: {
    done: boolean;
    bookTitle: string;
    startPage: string;
    endPage: string;
    totalPages: string;
    pagesRead: number;
    progress: number;
    note: string;
  };
  extraNote: string;
  dailyNote: string;
  updatedAt: string;
};

export type MonthlySummary = {
  recordDays: number;
  weightChange: number | null;
  latestWeight: number | null;
  exerciseMinutes: number;
  exerciseCount: number;
  studyMinutes: number;
  readingPages: number;
  poetryDays: number;
  averageMealScore: number;
};

export function getTodayInSeoul() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function createEmptyMeals(): Record<MealKey, MealEntry> {
  return {
    breakfast: { checked: false, food: "" },
    lunch: { checked: false, food: "" },
    dinner: { checked: false, food: "" },
    snack: { checked: false, food: "" },
    lateNightSnack: { checked: false, food: "" },
  };
}

export function createEmptyExerciseItem(): ExerciseItem {
  return {
    id: crypto.randomUUID(),
    name: "",
    minutes: "",
    count: "",
    sets: "",
    note: "",
  };
}

export function createEmptyRecord(date = getTodayInSeoul()): DailyRecord {
  return normalizeRecord({
    date,
    mood: "보통",
    weight: { done: false, value: "" },
    meals: { done: false, items: createEmptyMeals(), score: 0, praise: "" },
    exercise: { done: false, items: [createEmptyExerciseItem()], note: "" },
    study: { done: false, subject: "", minutes: "", note: "" },
    poetry: { done: false, title: "", body: "", link: "" },
    reading: {
      done: false,
      bookTitle: "",
      startPage: "",
      endPage: "",
      totalPages: "",
      pagesRead: 0,
      progress: 0,
      note: "",
    },
    extraNote: "",
    dailyNote: "",
    updatedAt: new Date().toISOString(),
  });
}

export function toNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateMealScore(items: Record<MealKey, MealEntry>, done: boolean) {
  if (!done) return { score: 0, praise: "" };

  const mainMeals: MealKey[] = ["breakfast", "lunch", "dinner"];
  const recordedMainMeals = mainMeals.filter((key) => {
    const item = items[key];
    return item.checked || item.food.trim().length > 0;
  }).length;
  const noSnack = !items.snack.checked;
  const noLateNightSnack = !items.lateNightSnack.checked;

  let score = 1 + recordedMainMeals;
  if (noSnack) score += 2;
  if (noLateNightSnack) score += 3;
  if (noSnack && noLateNightSnack) score += 2;

  let praise = "기록한 건 좋았어";
  if (noSnack && noLateNightSnack) praise = "계속 그렇게 가보자";
  else if (!noSnack && noLateNightSnack) praise = "야식은 잘 넘겼어";
  else if (noSnack && !noLateNightSnack) praise = "간식은 잘 참았어";
  else if (recordedMainMeals === 0) praise = "이 정도면 충분해";

  return { score, praise };
}

export function calculateReading(startPage: string, endPage: string, totalPages: string) {
  const start = toNumber(startPage);
  const end = toNumber(endPage);
  const total = toNumber(totalPages);
  const pagesRead = start > 0 && end >= start ? end - start + 1 : 0;
  const progress = total > 0 && end > 0 ? Math.min(100, Math.round((end / total) * 1000) / 10) : 0;
  return { pagesRead, progress };
}

export function normalizeRecord(record: DailyRecord): DailyRecord {
  const meals = calculateMealScore(record.meals.items, record.meals.done);
  const reading = calculateReading(
    record.reading.startPage,
    record.reading.endPage,
    record.reading.totalPages,
  );

  return {
    ...record,
    meals: {
      ...record.meals,
      score: meals.score,
      praise: meals.praise,
    },
    reading: {
      ...record.reading,
      pagesRead: reading.pagesRead,
      progress: reading.progress,
    },
    updatedAt: record.updatedAt || new Date().toISOString(),
  };
}

export function sortRecords(records: DailyRecord[]) {
  return [...records].sort((a, b) => b.date.localeCompare(a.date));
}

export function summarizeMonth(records: DailyRecord[], month: string): MonthlySummary {
  const monthRecords = records.filter((record) => record.date.startsWith(month));
  const sortedAsc = [...monthRecords].sort((a, b) => a.date.localeCompare(b.date));
  const weights = sortedAsc
    .filter((record) => record.weight.done)
    .map((record) => toNumber(record.weight.value))
    .filter((value) => value > 0);

  const exerciseMinutes = monthRecords.reduce((total, record) => {
    if (!record.exercise.done) return total;
    return total + record.exercise.items.reduce((sum, item) => sum + toNumber(item.minutes), 0);
  }, 0);

  const exerciseCount = monthRecords.reduce((total, record) => {
    if (!record.exercise.done) return total;
    return total + record.exercise.items.reduce((sum, item) => sum + toNumber(item.count), 0);
  }, 0);

  const studyMinutes = monthRecords.reduce((total, record) => {
    return total + (record.study.done ? toNumber(record.study.minutes) : 0);
  }, 0);

  const readingPages = monthRecords.reduce((total, record) => {
    return total + (record.reading.done ? record.reading.pagesRead : 0);
  }, 0);

  const mealScores = monthRecords
    .filter((record) => record.meals.done)
    .map((record) => record.meals.score);

  return {
    recordDays: monthRecords.length,
    weightChange:
      weights.length >= 2 ? Math.round((weights[weights.length - 1] - weights[0]) * 10) / 10 : null,
    latestWeight: weights.length > 0 ? weights[weights.length - 1] : null,
    exerciseMinutes,
    exerciseCount,
    studyMinutes,
    readingPages,
    poetryDays: monthRecords.filter((record) => record.poetry.done).length,
    averageMealScore:
      mealScores.length > 0
        ? Math.round((mealScores.reduce((sum, score) => sum + score, 0) / mealScores.length) * 10) / 10
        : 0,
  };
}
