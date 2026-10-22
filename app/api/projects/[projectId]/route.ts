import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/api-auth";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getClientById } from "@/services/client-service";
import { getProjectAccessRole, getProjectById, updateProject } from "@/services/project-service";
import { ProjectStatus } from "@/types/project";

type UpdateProjectPayload = {
  clientId?: string | null;
  name?: string;
  description?: string;
  tags?: string[];
  context?: string;
  objective?: string;
  stakeholders?: string;
  maturity?: string;
  status?: ProjectStatus;
};

function isValidStatus(value?: string): value is ProjectStatus {
  return value === undefined || ["ativo", "pausado", "arquivado"].includes(value);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const { projectId } = await context.params;
    const project = await getProjectById({
      userId: auth.context.userId,
      userEmail: auth.context.userEmail,
      projectId: projectId.trim(),
    });

    if (!project) {
      return NextResponse.json({ error: "Projeto nao encontrado." }, { status: 404 });
    }

    return NextResponse.json({ data: project });
  } catch (error) {
    console.error("[/api/projects/[projectId]] GET error", error);
    return NextResponse.json({ error: "Erro ao carregar projeto." }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ projectId: string }> },
) {
  try {
    const auth = await requireApiAuth(request);
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as UpdateProjectPayload;
    if (!isValidStatus(body.status)) {
      return NextResponse.json({ error: "Status de projeto invalido." }, { status: 400 });
    }
    if (body.clientId !== undefined && body.clientId !== null && body.clientId.trim()) {
      const existingClient = await getClientById({
        userId: auth.context.userId,
        clientId: body.clientId.trim(),
      });
      if (!existingClient) {
        return NextResponse.json({ error: "Cliente nao encontrado para vinculo no projeto." }, { status: 404 });
      }
    }

    const { projectId } = await context.params;
    const accessRole = await getProjectAccessRole({
      userId: auth.context.userId,
      userEmail: auth.context.userEmail,
      projectId: projectId.trim(),
    });
    if (accessRole === "none") {
      return NextResponse.json({ error: "Projeto nao encontrado." }, { status: 404 });
    }
    if (accessRole === "viewer") {
      return NextResponse.json(
        { error: "Sem permissao para editar este projeto. Solicite acesso como editor ou owner." },
        { status: 403 },
      );
    }

    const updated = await updateProject({
      userId: auth.context.userId,
      userEmail: auth.context.userEmail,
      projectId: projectId.trim(),
      patch: {
        clientId: body.clientId === undefined ? undefined : body.clientId?.trim() || null,
        name: body.name,
        description: body.description,
        tags: Array.isArray(body.tags) ? body.tags : undefined,
        context: body.context,
        objective: body.objective,
        stakeholders: body.stakeholders,
        maturity: body.maturity,
        status: body.status,
      },
    });

    if (!updated) {
      return NextResponse.json({ error: "Projeto nao encontrado para atualizacao." }, { status: 404 });
    }

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[/api/projects/[projectId]] PATCH error", error);
    const message = error instanceof Error ? error.message : "Erro ao atualizar projeto.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * Hard delete is restricted to active platform administrators and EMPTY projects.
 * Linked content is never cascaded or detached as a side effect of this endpoint.
 */
export async function DELETE(request: NextRequest, context: { params: Promise<{ projectId: string }> }) {
  const auth = await requireApiAuth(request);
  if (!auth.ok) return auth.response;
  if (auth.context.authMode !== "supabase")
    return NextResponse.json({ error: "Exclusao requer sessao autenticada." }, { status: 403 });
  const db = getSupabaseServerClient();
  if (!db) return NextResponse.json({ error: "Banco indisponivel." }, { status: 503 });
  const { data: admin, error: adminError } = await db.from("platform_admins")
    .select("role").eq("user_id", auth.context.userId).eq("active", true).maybeSingle();
  if (adminError || !admin || !["superadmin", "super_admin", "owner", "admin"].includes(admin.role))
    return NextResponse.json({ error: "Somente administradores podem excluir projetos." }, { status: 403 });
  const { projectId } = await context.params;
  const project = await getProjectById({ userId: auth.context.userId, userEmail: auth.context.userEmail, projectId });
  if (!project) return NextResponse.json({ error: "Projeto inexistente ou sem acesso." }, { status: 404 });
  const body = await request.json().catch(() => ({}));
  if (body.confirmName !== project.name)
    return NextResponse.json({ error: "Informe o nome exato do projeto para confirmar a exclusao." }, { status: 400 });
  const references = ["conversations", "decisions", "knowledge_base", "knowledge_chunks", "knowledge_embeddings",
    "risks", "tasks", "task_boards", "task_members", "task_labels", "project_members", "project_invites", "task_daily_selections"];
  for (const table of references) {
    const { count, error } = await db.from(table).select("id", { head: true, count: "exact" }).eq("project_id", projectId);
    if (error) return NextResponse.json({ error: "Nao foi possivel validar as dependencias do projeto. Exclusao bloqueada." }, { status: 503 });
    if ((count ?? 0) > 0) return NextResponse.json({
      error: `O projeto possui registros vinculados em ${table}. Para proteger seu historico, remova os vinculos ou arquive o projeto.`
    }, { status: 409 });
  }
  const deleted = await db.from("projects").delete().eq("id", projectId).select("id").single();
  if (deleted.error || !deleted.data) return NextResponse.json({
    error: "Nao foi possivel excluir com seguranca. Verifique se surgiram dependencias."
  }, { status: 409 });
  return NextResponse.json({ data: { id: projectId, deleted: true } });
}
