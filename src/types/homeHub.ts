export type HomeHubWhisperTone = "warm" | "thanks" | "miss" | "cheer";

export type HomeHubWhisper = {
  id: string;
  familyId: string;
  authorUid: string;
  authorName: string;
  message: string;
  tone: HomeHubWhisperTone;
  createdAt: string;
  updatedAt: string;
};

export type HomeHubPollOption = {
  id: string;
  label: string;
};

export type HomeHubPoll = {
  id: string;
  familyId: string;
  createdByUid: string;
  createdByName: string;
  question: string;
  options: HomeHubPollOption[];
  optionIds: string[];
  votes: Record<string, string>;
  status: "open" | "closed";
  createdAt: string;
  updatedAt: string;
};

export type HomeKitchenRecipe = {
  id: string;
  title: string;
  subtitle: string;
  minutes: number;
  servings: number;
  difficulty: "Dễ" | "Vừa";
  icon: "restaurant-outline" | "leaf-outline" | "fish-outline" | "flame-outline" | "cafe-outline";
  ingredients: string[];
  steps: string[];
  tip: string;
};
