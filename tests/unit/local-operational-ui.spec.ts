import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "app/projects/page.tsx"), "utf8");

test("documents upload is visible in Documents tab but locked during local read-only", () => {
  expect(source).toContain('activeTab==="documents"');
  expect(source).toContain("Documentos do projeto");
  expect(source).toContain("Adicionar documento");
  expect(source).toContain('disabled={documentWriteBlocked || !activeProjectId}');
  expect(source).toContain('disabled={!ingestFile || ingesting}');
  expect(source).not.toContain('title="Ingestao de arquivos"');
});

test("processed knowledge is not mistaken for downloadable originals", () => {
  expect(source).toContain("O arquivo original ainda não fica disponível para download.");
  expect(source).toContain('aria-label="Conteúdo processado dos documentos"');
  expect(source).toContain("Processado");
  expect(source).toContain('disabled={documentWriteBlocked || deletingKnowledgeId === item.id}');
});

test("local project selection never writes active project to production", () => {
  expect(source).toContain('if (localReadOnly) return;');
  expect(source).toContain('const response = await measuredFetch("/api/projects/active"');
});

test("risk and decision changes remain disabled when local read-only", () => {
  expect(source).toContain('disabled={documentWriteBlocked || updatingRiskId === risk.id}');
  expect(source).toContain('disabled={documentWriteBlocked || updatingId === decision.id}');
  expect(source).toContain('readOnly={documentWriteBlocked}');
});
