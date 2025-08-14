export type Difficulty = "Easy" | "Medium" | "Hard";

export function nextInterval({
  easeFactor,
  intervalDays,
  repetitions,
  q,
  difficulty,
  tags,
}: {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  q: number; // 0-5
  difficulty: Difficulty;
  tags: string[];
}) {
  let ef = easeFactor;
  let reps = repetitions;
  let interval = intervalDays;

  if (q < 3) {
    reps = 0;
    interval = 1;
    ef = Math.max(1.3, ef - 0.2);
  } else {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 3;
    else interval = Math.round(interval * ef);
    ef = Math.max(1.3, ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    reps += 1;
  }

  if (difficulty === "Hard") interval = Math.ceil(interval * 0.8);
  if (tags.includes("Graph")) interval = Math.ceil(interval * 0.9);

  return { easeFactor: ef, repetitions: reps, intervalDays: interval };
}


