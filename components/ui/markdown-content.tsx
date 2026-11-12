"use client";

type MarkdownContentProps = {
  content: string;
  className?: string;
};

type Block =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "unordered-list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "blockquote"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] };

function renderInline(text: string) {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g);

  return tokens.map((token, index) => {
    if (!token) return null;

    const boldMatch = token.match(/^\*\*([^*]+)\*\*$/);
    if (boldMatch) {
      return <strong key={index}>{boldMatch[1]}</strong>;
    }

    const italicMatch = token.match(/^\*([^*\n]+)\*$/);
    if (italicMatch) {
      return <em key={index}>{italicMatch[1]}</em>;
    }

    const codeMatch = token.match(/^`([^`]+)`$/);
    if (codeMatch) {
      return (
        <code key={index} className="workspace-inline-code">
          {codeMatch[1]}
        </code>
      );
    }

    const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch && /^https?:\/\//i.test(linkMatch[2])) {
      return (
        <a
          key={index}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="workspace-markdown-link"
        >
          {linkMatch[1]}
        </a>
      );
    }

    return <span key={index}>{token}</span>;
  });
}

function tableCells(line:string):string[]{
  return line.trim().replace(/^\\?\|/,"").replace(/\\?\|$/,"")
    .split(/(?<!\\)\|/).map(cell=>cell.replace(/\\\|/g,"|").trim());
}
function tableDivider(line:string):boolean{
  const cells=tableCells(line);
  return cells.length>1&&cells.every(cell=>/^:?-{3,}:?$/.test(cell));
}
function tableRow(line:string,width:number):string[]|null{
  const cells=tableCells(line);
  return cells.length===width&&line.includes("|")?cells:null;
}

function parseMarkdown(content: string): Block[] {
  const normalized = content.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const blocks: Block[] = [];
  let paragraphBuffer: string[] = [];
  let unorderedItems: string[] = [];
  let orderedItems: string[] = [];

  function flushParagraph() {
    if (!paragraphBuffer.length) return;
    blocks.push({ type: "paragraph", text: paragraphBuffer.join(" ").trim() });
    paragraphBuffer = [];
  }

  function flushUnorderedList() {
    if (!unorderedItems.length) return;
    blocks.push({ type: "unordered-list", items: unorderedItems });
    unorderedItems = [];
  }

  function flushOrderedList() {
    if (!orderedItems.length) return;
    blocks.push({ type: "ordered-list", items: orderedItems });
    orderedItems = [];
  }

  function flushAll() {
    flushParagraph();
    flushUnorderedList();
    flushOrderedList();
  }

  for (let lineIndex=0;lineIndex<lines.length;lineIndex++) {
    const rawLine=lines[lineIndex];
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushAll();
      continue;
    }

    if(lineIndex+1<lines.length&&trimmed.includes("|")&&tableDivider(lines[lineIndex+1])){
      const headers=tableCells(trimmed);
      if(headers.length>1&&tableCells(lines[lineIndex+1]).length===headers.length){
        flushAll();
        const rows:string[][]=[];
        lineIndex+=1;
        while(lineIndex+1<lines.length){
          const row=tableRow(lines[lineIndex+1],headers.length);
          if(!row)break;
          rows.push(row);
          lineIndex+=1;
        }
        blocks.push({type:"table",headers,rows});
        continue;
      }
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      flushAll();
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      continue;
    }

    const blockquoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (blockquoteMatch) {
      flushAll();
      blocks.push({
        type: "blockquote",
        text: blockquoteMatch[1].trim(),
      });
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*]\s+(.*)$/);
    if (unorderedMatch) {
      flushParagraph();
      flushOrderedList();
      unorderedItems.push(unorderedMatch[1].trim());
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (orderedMatch) {
      flushParagraph();
      flushUnorderedList();
      orderedItems.push(orderedMatch[1].trim());
      continue;
    }

    paragraphBuffer.push(trimmed);
  }

  flushAll();
  return blocks;
}

export function MarkdownContent({ content, className }: MarkdownContentProps) {
  const blocks = parseMarkdown(content);

  return (
    <div className={["workspace-markdown", className].filter(Boolean).join(" ")}>
      {blocks.map((block, index) => {
        if(block.type==="table"){
          return <div key={index} className="workspace-markdown-table-wrap">
            <table className="workspace-markdown-table">
              <thead><tr>{block.headers.map((header,column)=><th key={column} scope="col">{renderInline(header)}</th>)}</tr></thead>
              <tbody>{block.rows.map((row,rowIndex)=><tr key={rowIndex}>{row.map((cell,column)=><td key={column}>{renderInline(cell)}</td>)}</tr>)}</tbody>
            </table>
          </div>;
        }

        if (block.type === "heading") {
          const headingLevel = Math.min(block.level + 2, 5);
          const HeadingTag = (
            {
              3: "h3",
              4: "h4",
              5: "h5",
              6: "h6",
            } as const
          )[headingLevel] ?? "h6";
          return <HeadingTag key={index}>{renderInline(block.text)}</HeadingTag>;
        }

        if (block.type === "unordered-list") {
          return (
            <ul key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "ordered-list") {
          return (
            <ol key={index}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </ol>
          );
        }

        if (block.type === "blockquote") {
          return <blockquote key={index}>{renderInline(block.text)}</blockquote>;
        }

        return <p key={index}>{renderInline(block.text)}</p>;
      })}
    </div>
  );
}
