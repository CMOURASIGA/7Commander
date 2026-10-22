export type RiskDraft = { title: string; description: string; selected: boolean };

/** Extract discrete risks from Kairos Markdown, stopping at actions/next steps. */
export function parseRiskDrafts(markdown: string): RiskDraft[] {
  const out: RiskDraft[] = [];
  let current: RiskDraft | null = null;
  let inRiskBlock = false;
  const clean = (s: string) => s.replace(/\*\*/g, "").replace(/^[-*+]\s*/, "").trim();
  const flush = () => { if (current?.title && current.description.trim()) out.push({ ...current, description: current.description.trim() }); current = null; };
  const section = /^(?:#{1,6}\s*)?(?:\*\*)?(diagnóstico|riscos? identificados?|próximos passos|recomendações|ações recomendadas|conclusão|contexto)(?:\*\*)?\s*:?[\s]*$/i;
  for (const raw of markdown.replace(/\r/g, "").split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const sec = clean(line).match(section);
    if (sec) {
      const name = sec[1].toLowerCase();
      if (/próximos passos|recomendações|ações recomendadas|conclusão/.test(name)) { flush(); break; }
      if (/riscos? identificados?/.test(name)) { flush(); inRiskBlock = true; }
      continue;
    }
    if (/^\s*(?:título|impacto|probabilidade|mitigação|responsável)\s*:/i.test(clean(line)) && !inRiskBlock) continue;
    // **Risk title**: Explanation, including list markers.
    let match = line.match(/^(?:[-*+]\s+|\d+[.)]\s+)?\*\*(.{3,110}?)\*\*\s*:\s*(.+)$/);
    if (!match) match = line.match(/^(?:[-*+]\s+|\d+[.)]\s+)?([^:*]{3,110}):\s+(.+)$/);
    if (match) {
      const title = clean(match[1]);
      if (/^(?:risco identificado|diagnóstico|contexto|título|próximos passos)$/i.test(title)) continue;
      flush();
      current = { title, description: clean(match[2]), selected: true };
      continue;
    }
    const heading = line.match(/^(?:[-*+]\s+|\d+[.)]\s+)?\*\*(.{3,110}?)\*\*\s*:\s*$/);
    if (heading && !/^(?:diagnóstico|contexto|próximos passos)$/i.test(clean(heading[1]))) {
      flush(); current = { title: clean(heading[1]), description: "", selected: true }; continue;
    }
    if (current && !/^(?:#{1,6}\s+|\*\*[^*]+\*\*\s*$)/.test(line)) current.description += " " + clean(line);
  }
  flush();
  // Keep single-risk parsing as well; the caller can review the result before saving.
  return out.slice(0, 50);
}
