export interface Message {
  id: string;
  role: "user" | "bot";
  text: string;
  time: number;
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export type ChatHistory = Record<string, Chat>;
