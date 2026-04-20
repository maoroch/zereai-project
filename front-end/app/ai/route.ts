import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(/\/$/, "");

export async function POST(req: NextRequest) {
  try {
    const { question } = await req.json();

    if (!question || typeof question !== "string") {
      return NextResponse.json({ success: false, error: "Вопрос не задан" }, { status: 400 });
    }

    const backendRes = await fetch(`${BACKEND_URL}/ai`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });

    const data = await backendRes.json();

    if (!backendRes.ok) {
      return NextResponse.json(
        { success: false, error: data.message ?? "Ошибка бэкенда" },
        { status: backendRes.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error("[/ai] Proxy error:", err);
    return NextResponse.json(
      { success: false, error: "Нет связи с сервером" },
      { status: 502 }
    );
  }
}
