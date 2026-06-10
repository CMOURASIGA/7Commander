import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { listKnowledge, saveKnowledge } from "@/services/knowledge-layer";

type CreateKnowledgePayload = {
  title: string;
  content: string;
  category?: string;
  source?: string;
  projectId?: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId")?.trim() || null;
    const items = await listKnowledge(auth.context.userId, projectId);
    return NextResponse.json({ data: items });
  } catch (error) {
    console.error("[/api/knowledge] GET error", error);
    return NextResponse.json({ error: "Erro ao listar conhecimento." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as CreateKnowledgePayload;
    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Campo 'title' obrigatorio." }, { status: 400 });
    }
    if (!body.content?.trim()) {
      return NextResponse.json({ error: "Campo 'content' obrigatorio." }, { status: 400 });
    }

    const item = await saveKnowledge({
      userId: auth.context.userId,
      projectId: body.projectId ?? null,
      title: body.title.trim(),
      content: body.content.trim(),
      category: body.category?.trim(),
      source: body.source?.trim(),
    });

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (error) {
    console.error("[/api/knowledge] POST error", error);
    return NextResponse.json({ error: "Erro ao salvar conhecimento." }, { status: 500 });
  }
}

