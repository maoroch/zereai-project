import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json({ success: false, error: "Вопрос не задан" }, { status: 400 });
    }

    // TODO: Replace with your actual AI logic / API call
    // Example: OpenAI, Anthropic, or your own model
    // const answer = await callYourAI(question);

    // Placeholder response:
    const answer = `Вы спросили: "${question}". Здесь будет ответ вашего AI-сервиса.`;

    return NextResponse.json({ success: true, answer });
  } catch (err) {
    console.error("[/ai] Error:", err);
    return NextResponse.json(
      { success: false, error: "Внутренняя ошибка сервера" },
      { status: 500 }
    );
  }
}
