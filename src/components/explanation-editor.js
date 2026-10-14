import Quill from 'quill';
import 'quill/dist/quill.core.css';
import '../styles/explanation-editor.css';
import { renderExplanationBlocks, sanitizeExplanationBlocks } from '../../shared/explanations.js';
import { TEXT_COLORS, HIGHLIGHTS, sanitizeDelta } from '../../shared/rich-explanation.js';

const BlockEmbed = Quill.import('blots/block/embed');
// Existing tables and block images remain in their original position and are
// preserved as structured blocks. New images use the existing image fields.
class LegacyBlock extends BlockEmbed {
  static blotName = 'legacyBlock';
  static tagName = 'div';
  static className = 'ex-legacy-block';
  static create(value) {
    const node = super.create();
    const block = sanitizeExplanationBlocks([value]).find(b => ['table','image'].includes(b.type));
    node.dataset.block = JSON.stringify(block || {});
    node.setAttribute('contenteditable', 'false');
    node.innerHTML = renderExplanationBlocks(block ? [block] : []);
    return node;
  }
  static value(node) { try { return JSON.parse(node.dataset.block); } catch { return {}; } }
}
Quill.register(LegacyBlock);
const decode = s => String(s || '').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
export function blocksToDelta(blocks) {
  const ops = [];
  for (const b of sanitizeExplanationBlocks(blocks)) {
    if (b.type === 'rich_text') ops.push(...b.delta.ops);
    else if (b.type === 'paragraph' || b.type === 'heading') {
      ops.push({insert: decode(b.text)}, {insert:'\n', ...(b.type === 'heading' ? {attributes:{header:b.level === 'h2' ? 2 : 3}} : {})});
    } else if (b.type === 'list') {
      for (const item of b.items) ops.push({insert:decode(item)}, {insert:'\n',attributes:{list:b.ordered ? 'ordered' : 'bullet'}});
    } else if (b.type === 'table' || b.type === 'image') ops.push({insert:{legacyBlock:b}});
  }
  if (!ops.length || typeof ops.at(-1).insert !== 'string' || !ops.at(-1).insert.endsWith('\n')) ops.push({insert:'\n'});
  return {ops};
}
export function deltaToBlocks(delta) {
  const blocks = []; let ops = [];
  const flush = () => { if (ops.some(o => typeof o.insert === 'string' && o.insert.trim())) blocks.push({type:'rich_text',delta:sanitizeDelta({ops})}); ops = []; };
  for (const op of delta.ops) {
    if (op.insert?.legacyBlock) { flush(); blocks.push(...sanitizeExplanationBlocks([op.insert.legacyBlock]).filter(b => ['table','image'].includes(b.type))); }
    else ops.push(op);
  }
  flush(); return blocks;
}
const option = (value, label) => '<option value="' + value + '"' + (value === '' ? ' selected' : '') + '>' + label + '</option>';
export function explanationEditorHtml() {
  return '<div class="ex-author"><div class="ex-mode"><button type="button" class="btn" data-ex-mode="edit" aria-pressed="true">Edit</button><button type="button" class="btn" data-ex-mode="preview" aria-pressed="false">Preview</button></div>' +
    '<div class="ex-toolbar" role="toolbar" aria-label="Explanation formatting">' +
    [['bold','B','Bold'],['italic','I','Italic'],['underline','U','Underline']].map(([key,text,label])=>'<button type="button" class="ql-' + key + '" aria-label="' + label + '" title="' + label + '">' + text + '</button>').join('') +
    '<select class="ql-color" aria-label="Text color">' + option('','Default color') + TEXT_COLORS.map((c,i)=>option(c,['Dark blue','Blue','Red','Green','Orange','Gray'][i])).join('') + '</select>' +
    '<select class="ql-background" aria-label="Highlight">' + option('','No highlight') + HIGHLIGHTS.map((c,i)=>option(c,['Soft yellow','Soft blue','Soft green'][i])).join('') + '</select>' +
    '<select class="ql-size" aria-label="Font size">' + option('','Normal size') + option('small','Small') + option('large','Large') + '</select>' +
    '<select class="ql-header" aria-label="Paragraph style">' + option('','Paragraph') + option('2','Heading 2') + option('3','Heading 3') + '</select>' +
    '<button type="button" class="ql-list" value="bullet" aria-label="Bullet list">• List</button><button type="button" class="ql-list" value="ordered" aria-label="Numbered list">1. List</button>' +
    '<select class="ql-align" aria-label="Text alignment">' + option('','Left') + option('center','Center') + option('right','Right') + option('justify','Justify') + '</select>' +
    '<button type="button" data-ex-undo aria-label="Undo">↶</button><button type="button" data-ex-redo aria-label="Redo">↷</button><button type="button" class="ql-clean" aria-label="Clear formatting">Clear</button></div>' +
    '<div id="qs-expl"></div><div class="explanation-content ex-preview" hidden></div></div>';
}
export function mountExplanationEditor(host, {blocks, label, imageId, onChange}) {
  const toolbar = host.querySelector('.ex-toolbar');
  const quill = new Quill(host.querySelector('#qs-expl'), {
    modules:{toolbar,history:{delay:400,userOnly:true}, keyboard:{bindings:{softBreak:{key:'Enter',shiftKey:true,handler(range){this.quill.insertText(range.index,'\u2028','user');this.quill.setSelection(range.index+1,0,'silent');return false;}}}}},
    formats:['bold','italic','underline','color','background','size','header','list','align','legacyBlock'],
    placeholder:'Write the explanation…',
  });
  quill.root.setAttribute('role','textbox'); quill.root.setAttribute('aria-label',label); quill.root.setAttribute('aria-multiline','true');
  quill.setContents(blocksToDelta(blocks),'silent'); quill.history.clear();
  quill.on('text-change', () => onChange(deltaToBlocks(quill.getContents()), quill.getText().trim()));
  host.querySelector('[data-ex-undo]').addEventListener('click',()=>quill.history.undo());
  host.querySelector('[data-ex-redo]').addEventListener('click',()=>quill.history.redo());
  toolbar.querySelectorAll('button').forEach(b => b.addEventListener('mousedown',e=>e.preventDefault()));
  const preview = host.querySelector('.ex-preview');
  host.querySelectorAll('[data-ex-mode]').forEach(button => button.addEventListener('click', () => {
    const isPreview = button.dataset.exMode === 'preview';
    toolbar.hidden = isPreview; quill.container.hidden = isPreview; preview.hidden = !isPreview;
    if (isPreview) preview.innerHTML = renderExplanationBlocks(deltaToBlocks(quill.getContents())) + (imageId ? '<img class="question-media" alt="Explanation image" src="/api/public/media/' + Number(imageId) + '">' : '');
    host.querySelectorAll('[data-ex-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b === button)));
  }));
  return quill;
}
