/**
 * Native, selectable-text A4 report renderer.
 * This consumes the same authorized report HTML as the screen exporter, but
 * composes headings, paragraphs, metrics and tables as PDF text/vector objects.
 * The brand logo is the only raster image. No external conversion service.
 */
const PAGE_W=595.28, PAGE_H=841.89, LEFT=39, RIGHT=39, TOP=42, BOTTOM=50;
const WIDTH=PAGE_W-LEFT-RIGHT;
type Sheet={commands:string[]};
type Logo={bytes:Uint8Array;width:number;height:number};
const escByte=(value:string):number[]=>{
 const map:Record<number,number>={0x2013:150,0x2014:151,0x2018:145,0x2019:146,0x201c:147,0x201d:148,0x2022:149,0x2026:133,0x20ac:128};
 const bytes:number[]=[];
 for(const c of value.replaceAll("→",">").replaceAll("✓","OK")){
  const n=c.codePointAt(0)||32;
  bytes.push(n<256?n:map[n]||63);
 }
 return bytes;
};
const hex=(text:string)=>escByte(text).map(b=>b.toString(16).padStart(2,"0")).join("").toUpperCase();
const pdfColor=(value:string)=>{
 const c=value.replace("#","");return [0,2,4].map(i=>(parseInt(c.slice(i,i+2),16)/255).toFixed(3)).join(" ");
};
function asBytes(parts:Uint8Array[]):Uint8Array{
 const count=parts.reduce((n,p)=>n+p.length,0),result=new Uint8Array(count);
 let offset=0;for(const p of parts){result.set(p,offset);offset+=p.length;}return result;
}
async function loadLogo(doc:Document):Promise<Logo|null>{
 const src=doc.querySelector<HTMLImageElement>("img.logo")?.getAttribute("src");
 if(!src?.startsWith("data:image/"))return null;
 try{
  const img=new Image();img.src=src;await img.decode();
  const canvas=document.createElement("canvas");
  canvas.width=Math.max(1,Math.min(img.naturalWidth,600));canvas.height=Math.max(1,Math.round(canvas.width*img.naturalHeight/img.naturalWidth));
  const ctx=canvas.getContext("2d");if(!ctx)return null;
  ctx.fillStyle="#ffffff";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);
  const binary=atob(canvas.toDataURL("image/jpeg",0.91).split(",")[1]);
  const bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  return {bytes,width:canvas.width,height:canvas.height};
 }catch{return null;}
}
class DocumentComposer{
 sheets:Sheet[]=[{commands:[]}];y=TOP;
 private canvas=document.createElement("canvas").getContext("2d");
 private logo:Logo|null;
 constructor(logo:Logo|null){this.logo=logo;}
 private get sheet(){return this.sheets[this.sheets.length-1];}
 private emit(value:string){this.sheet.commands.push(value);}
 private newPage(){
  this.sheets.push({commands:[]});this.y=TOP;
  this.text(LEFT,this.y,"COMMANDER  /  STATUS REPORT",8,true,"526e85");
  this.rule(this.y+16);this.y+=35;
 }
 private reserve(height:number){if(this.y+height>PAGE_H-BOTTOM)this.newPage();}
 private measure(value:string,size:number,bold=false){
  if(this.canvas){this.canvas.font=(bold?"bold ":"")+size+"px Arial";return this.canvas.measureText(value).width*1.01;}
  return value.length*size*.54;
 }
 private wrap(text:string,maxWidth:number,size:number,bold=false):string[]{
  const result:string[]=[];
  for(const paragraph of String(text||"").replace(/\s+/g," ").trim().split("\n")){
   const words=paragraph.split(" ");let line="";
   for(let word of words){
    if(!word)continue;
    while(this.measure(word,size,bold)>maxWidth&&word.length>2){
     const part=word.slice(0,Math.max(1,Math.floor(maxWidth/(size*.53))-1));
     if(line){result.push(line);line="";}
     result.push(part+"-");word=word.slice(part.length);
    }
    const next=line?line+" "+word:word;
    if(line&&this.measure(next,size,bold)>maxWidth){result.push(line);line=word;}
    else line=next;
   }
   if(line)result.push(line);
  }
  return result.length?result:[""];
 }
 private text(x:number,top:number,text:string,size=10,bold=false,color="173a59"){
  this.emit(pdfColor(color)+" rg BT /"+(bold?"F2":"F1")+" "+size.toFixed(2)+" Tf 1 0 0 1 "+x.toFixed(2)+" "+(PAGE_H-top-size).toFixed(2)+" Tm <"+hex(text)+"> Tj ET\n");
 }
 private rect(x:number,top:number,w:number,h:number,fill:string,border?:string){
  const by=PAGE_H-top-h;
  this.emit(pdfColor(fill)+" rg "+x.toFixed(2)+" "+by.toFixed(2)+" "+w.toFixed(2)+" "+h.toFixed(2)+" re f\n");
  if(border)this.emit(pdfColor(border)+" RG 0.6 w "+x.toFixed(2)+" "+by.toFixed(2)+" "+w.toFixed(2)+" "+h.toFixed(2)+" re S\n");
 }
 private rule(top:number){this.rect(LEFT,top,WIDTH,0.8,"dce6ef");}
 paragraph(value:string,options:{size?:number;bold?:boolean;color?:string;indent?:number;space?:number}={}){
  const {size=9.4,bold=false,color="344a61",indent=0,space=7}=options;
  const lines=this.wrap(value,WIDTH-indent,size,bold);const lineH=size*1.52;
  if(lines.length===1&&lines[0]==="")return;
  for(const line of lines){this.reserve(lineH+3);this.text(LEFT+indent,this.y,line,size,bold,color);this.y+=lineH;}
  this.y+=space;
 }
 heading(value:string,level=2){
  const size=level===1?17:level===2?12.3:8.8;
  this.reserve(level===1?65:50);
  this.y+=level===1?6:8;
  this.paragraph(value,{size,bold:true,color:level===3?"5e8198":"173a59",space:level===3?4:8});
 }
 metrics(root:Element){
  const items=Array.from(root.querySelectorAll(":scope > .metric"));
  if(!items.length){this.paragraph(root.textContent||"");return;}
  const cols=Math.min(items.length,4),gap=7,w=(WIDTH-gap*(cols-1))/cols,h=65;
  for(let start=0;start<items.length;start+=cols){
   this.reserve(h+16);
   for(const [offset,item] of items.slice(start,start+cols).entries()){
    const x=LEFT+offset*(w+gap);
    this.rect(x,this.y,w,h,"f7fafc","dce6ef");
    const label=item.querySelector("small")?.textContent?.trim()||"";
    const val=item.querySelector("strong")?.textContent?.trim()||"";
    for(const [lineNumber,line] of this.wrap(label,w-14,7,true).slice(0,2).entries())this.text(x+8,this.y+8+lineNumber*9,line,7,true,"617a91");
    this.text(x+8,this.y+37,val,18,true,"173a59");
   }
   this.y+=h+12;
  }
 }
 table(table:HTMLTableElement){
  const rawRows=Array.from(table.querySelectorAll("tr")).filter(tr=>!tr.classList.contains("pdf-hide")&&!tr.closest(".pdf-hide"));
  if(!rawRows.length)return;
  const headers=Array.from(rawRows[0].querySelectorAll("th,td")).map(cell=>cell.textContent?.trim()||"");
  if(!headers.length)return;
  const columns=headers.length;
  const widths=columns===6?[.12,.25,.12,.15,.11,.25]:columns===4?[.19,.27,.28,.26]:Array(columns).fill(1/columns);
  const isMatrix=table.classList.contains("risk-matrix");
  const drawRow=(values:string[],header=false,rowIndex=0)=>{
   const size=header?7.7:8.2,pad=6,lineHeight=size*1.4;
   const cells=values.slice(0,columns).map((value,i)=>this.wrap(value,WIDTH*widths[i]-2*pad,size,header));
   const height=Math.max(26,...cells.map(lines=>lines.length*lineHeight+2*pad));
   this.reserve(height+3);
   let x=LEFT;
   cells.forEach((lines,i)=>{
    const w=WIDTH*widths[i];
    const score=isMatrix&&!header&&i>0?(3-rowIndex)*i:0;
    const fill=header?"eaf1f8":score>=6?"fff0e7":score>=3?"fff8e8":score>0?"eff8f5":"ffffff";
    this.rect(x,this.y,w,height,fill,"dce6ef");
    lines.forEach((line,j)=>this.text(x+pad,this.y+pad+j*lineHeight,line,size,header,"173a59"));
    x+=w;
   });
   this.y+=height;
  };
  const rowElements=rawRows.slice(1);
  drawRow(headers,true);
  for(const [rowIndex,row] of rowElements.entries()){
   const values=Array.from(row.querySelectorAll(":scope > th,:scope > td")).map(cell=>cell.textContent?.trim()||"");
   if(!values.length)continue;
   // Page breaks repeat the table heading, never split a compact risk row.
   const est=Math.max(26,...values.map((v,i)=>this.wrap(v,(WIDTH*widths[i])-12,8.2).length*11.5+12));
   if(this.y+est>PAGE_H-BOTTOM-2){this.newPage();drawRow(headers,true);}
   drawRow(values,false,rowIndex);
  }
  this.y+=10;
 }
 imageFirstPage(){if(!this.logo)return;
  const h=54,w=Math.min(86,h*this.logo.width/this.logo.height);
  this.emit("q "+w.toFixed(2)+" 0 0 "+h.toFixed(2)+" "+LEFT+" "+(PAGE_H-this.y-h).toFixed(2)+" cm /Logo Do Q\n");
  this.y+=h+7;
 }
 node(element:Element){
  if(element.matches(".actions,.pdf-hide,.foot,script,style,noscript"))return;
  const tag=element.tagName.toLowerCase();
  if(tag==="img")return;
  if(tag==="table"){this.table(element as HTMLTableElement);return;}
  if(element.classList.contains("metrics")){this.metrics(element);return;}
  if(tag==="h1"||tag==="h2"||tag==="h3"){this.heading(element.textContent?.trim()||"",tag==="h1"?1:tag==="h2"?2:3);return;}
  if(tag==="p"||tag==="small"||tag==="li"||tag==="blockquote"||tag==="summary"){
   this.paragraph(element.textContent?.trim()||"",{size:tag==="small"?8:9.4});return;
  }
  if(tag==="header"&&element.classList.contains("hero")){this.reserve(105);this.imageFirstPage();}
  if(element.classList.contains("panel")){this.reserve(64);this.y+=7;}
  if(element.classList.contains("risk-legend")){
   this.reserve(85);this.rect(LEFT,this.y,WIDTH,3,"d8e8f6");this.y+=9;
  }
  if(element.classList.contains("note")||element.classList.contains("empty")){
   this.reserve(42);this.rect(LEFT,this.y,WIDTH,2,"ecb960");this.y+=8;
  }
  const children=Array.from(element.children);
  if(!children.length){
   const val=element.textContent?.trim()||"";
   if(val)this.paragraph(val,{size:8.5});return;
  }
  for(const child of children)this.node(child);
  if(element.classList.contains("panel"))this.y+=12;
 }
 finish(){
  for(const [index,sheet] of this.sheets.entries()){
   const y=PAGE_H-25;
   sheet.commands.push(pdfColor("617a91")+" rg BT /F1 8 Tf 1 0 0 1 "+LEFT+" "+y+" Tm <"+hex("Commander · Documento institucional")+"> Tj ET\n");
   sheet.commands.push(pdfColor("617a91")+" rg BT /F1 8 Tf 1 0 0 1 "+(PAGE_W-RIGHT-73)+" "+y+" Tm <"+hex("Página "+(index+1)+" de "+this.sheets.length)+"> Tj ET\n");
  }
 }
 toPdf():Blob{
  this.finish();
  const te=new TextEncoder(),chunks:Uint8Array[]=[],offsets:number[]=[0];let total=0;
  const push=(bytes:Uint8Array)=>{chunks.push(bytes);total+=bytes.length;};
  const str=(v:string)=>push(te.encode(v));
  const obj=(n:number,bytes:Uint8Array)=>{offsets[n]=total;str(n+" 0 obj\n");push(bytes);str("\nendobj\n");};
  const fontIds=[3,4],logoId=5,base=6,media="[0 0 "+PAGE_W+" "+PAGE_H+"]";
  str("%PDF-1.4\n%");
  push(new Uint8Array([0xe2,0xe3,0xcf,0xd3,10]));
  obj(1,te.encode("<< /Type /Catalog /Pages 2 0 R >>"));
  obj(2,te.encode("<< /Type /Pages /Count "+this.sheets.length+" /Kids ["+this.sheets.map((_,i)=>(base+i*2)+" 0 R").join(" ")+"] >>"));
  obj(fontIds[0],te.encode("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"));
  obj(fontIds[1],te.encode("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"));
  if(this.logo){
   const h=te.encode("<< /Type /XObject /Subtype /Image /Width "+this.logo.width+" /Height "+this.logo.height+
    " /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length "+this.logo.bytes.length+" >>\nstream\n");
   obj(logoId,asBytes([h,this.logo.bytes,te.encode("\nendstream")]));
  }else obj(logoId,te.encode("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"));
  for(const [i,sheet] of this.sheets.entries()){
   const id=base+i*2,contentId=id+1;
   const resources="<< /Font << /F1 3 0 R /F2 4 0 R >>"+(this.logo?" /XObject << /Logo 5 0 R >>":"")+" >>";
   obj(id,te.encode("<< /Type /Page /Parent 2 0 R /MediaBox "+media+" /Resources "+resources+" /Contents "+contentId+" 0 R >>"));
   const commands=te.encode(sheet.commands.join(""));
   obj(contentId,asBytes([te.encode("<< /Length "+commands.length+" >>\nstream\n"),commands,te.encode("\nendstream")]));
  }
  const firstXref=total,maxObject=base+this.sheets.length*2-1;
  str("xref\n0 "+(maxObject+1)+"\n0000000000 65535 f \n");
  for(let id=1;id<=maxObject;id++)str(String(offsets[id]).padStart(10,"0")+" 00000 n \n");
  str("trailer\n<< /Size "+(maxObject+1)+" /Root 1 0 R >>\nstartxref\n"+firstXref+"\n%%EOF");
  return new Blob(chunks as BlobPart[],{type:"application/pdf"});
 }
}
/** Compose a report-specific PDF with selectable text and semantic A4 pagination. */
export async function downloadReportDocumentPdf(html:string,filename:string):Promise<void>{
 const doc=new DOMParser().parseFromString(html,"text/html");
 const root=doc.querySelector("main.wrap");
 if(!root)throw new Error("Relatório não encontrado para gerar o documento.");
 const composer=new DocumentComposer(await loadLogo(doc));
 for(const child of Array.from(root.children))composer.node(child);
 const pdf=composer.toPdf(),url=URL.createObjectURL(pdf);
 try{
  const link=document.createElement("a");link.href=url;link.download=filename.endsWith(".pdf")?filename:filename+".pdf";
  document.body.appendChild(link);link.click();link.remove();
 }finally{setTimeout(()=>URL.revokeObjectURL(url),5000);}
}
