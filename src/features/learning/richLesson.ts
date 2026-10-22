/**
 * Safe offline lesson formatting: Markdown subset + explicit Bloom callouts.
 * No WebView, HTML execution, remote scripts, or schema migration.
 * Source Markdown is preserved exactly in lesson_contents.body.
 */
export type InlineToken = {text:string; style:'text'|'strong'|'emphasis'|'highlight'|'code'};
export type LessonBlock =
  | {kind:'heading'; level:1|2|3; text:string}
  | {kind:'paragraph'; text:string}
  | {kind:'list'; ordered:boolean; items:string[]}
  | {kind:'table'; headers:string[]; rows:string[][]}
  | {kind:'callout'; tone:'story'|'activity'|'remember'|'tip'|'challenge'|'example'; blocks:LessonBlock[]}
  | {kind:'quote'; text:string}
  | {kind:'image'; alt:string; url:string}
  | {kind:'divider'};

export function inlineTokens(source:string):InlineToken[] {
  const output:InlineToken[]=[];
  const parts=source.split(/(\*\*[^*\n]+\*\*|==[^\n]+?==|`[^`\n]+`|\*[^*\n]+\*)/g);
  for(const part of parts){
    if(!part)continue;
    if(part.startsWith('**')&&part.endsWith('**'))output.push({text:part.slice(2,-2),style:'strong'});
    else if(part.startsWith('==')&&part.endsWith('=='))output.push({text:part.slice(2,-2),style:'highlight'});
    else if(part.startsWith('`')&&part.endsWith('`'))output.push({text:part.slice(1,-1),style:'code'});
    else if(part.startsWith('*')&&part.endsWith('*'))output.push({text:part.slice(1,-1),style:'emphasis'});
    else output.push({text:part,style:'text'});
  }
  return output;
}
const listPattern=/^(?:[-*]\s+|\d+[.)]\s+)/;
const imagePattern=/^!\[([^\]]*)\]\((https:\/\/[^\s)]+)\)$/;
const calloutPattern=/^:::(story|activity|remember|tip|challenge|example)$/;
const isTableRow=(s:string)=>/^\|.+\|$/.test(s);
const isSeparator=(s:string)=>/^\|[\s:\-|]+\|$/.test(s)&&s.includes('-');
const cells=(s:string)=>s.replace(/^\||\|$/g,'').split('|').map(x=>x.trim());
function special(s:string):boolean {
  return /^#{1,3}\s+/.test(s)||/^>\s?/.test(s)||/^(?:---+|\*\*\*+)\s*$/.test(s)||listPattern.test(s)||isTableRow(s)||!!s.match(imagePattern)||!!s.match(calloutPattern);
}
export function parseLessonBlocks(markdown:string, maxBlocks=350):LessonBlock[] {
  const lines=markdown.replace(/\r\n?/g,'\n').split('\n');
  const blocks:LessonBlock[]=[];let i=0;
  while(i<lines.length && blocks.length<maxBlocks){
    const raw=lines[i].trim();
    if(!raw){i++;continue;}
    const co=raw.match(calloutPattern);
    if(co){
      const body:string[]=[];i++;
      while(i<lines.length && lines[i].trim()!==':::'){body.push(lines[i]);i++;}
      if(i<lines.length)i++;
      blocks.push({kind:'callout',tone:co[1] as 'story',blocks:parseLessonBlocks(body.join('\n'),Math.max(1,maxBlocks-blocks.length))});continue;
    }
    const heading=raw.match(/^(#{1,3})\s+(.*)$/);
    if(heading){blocks.push({kind:'heading',level:heading[1].length as 1|2|3,text:heading[2]});i++;continue;}
    const pic=raw.match(imagePattern);
    if(pic){blocks.push({kind:'image',alt:pic[1],url:pic[2]});i++;continue;}
    if(/^(?:---+|\*\*\*+)\s*$/.test(raw)){blocks.push({kind:'divider'});i++;continue;}
    if(raw.startsWith('>')){
      const quotes:string[]=[];
      while(i<lines.length&&lines[i].trim().startsWith('>')){quotes.push(lines[i].trim().replace(/^>\s?/,''));i++;}
      blocks.push({kind:'quote',text:quotes.join(' ')});continue;
    }
    if(isTableRow(raw)&&i+1<lines.length&&isSeparator(lines[i+1].trim())){
      const headers=cells(raw);const rows:string[][]=[];i+=2;
      while(i<lines.length&&isTableRow(lines[i].trim())){rows.push(cells(lines[i].trim()));i++;}
      blocks.push({kind:'table',headers,rows});continue;
    }
    if(listPattern.test(raw)){
      const ordered=/^\d+[.)]\s+/.test(raw);const items:string[]=[];
      while(i<lines.length&&listPattern.test(lines[i].trim())&&/^\d+[.)]\s+/.test(lines[i].trim())===ordered){items.push(lines[i].trim().replace(listPattern,''));i++;}
      blocks.push({kind:'list',ordered,items});continue;
    }
    const paragraph=[raw];i++;
    while(i<lines.length&&lines[i].trim()&&!special(lines[i].trim())){paragraph.push(lines[i].trim());i++;}
    blocks.push({kind:'paragraph',text:paragraph.join(' ')});
  }
  return blocks;
}
