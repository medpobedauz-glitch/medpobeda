#!/usr/bin/env python3
"""Conservative, resumable PDF-to-Qbank extraction. No medical text is generated.
Page extraction is checkpointed in SQLite; parsing and exports stream from disk.
Usage: main.py input.pdf --output out --start-page 5 --end-page 12
"""
import argparse
import collections
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import sys
import fitz

VERSION = 6
QUESTION = re.compile(r'^(?:(?:Q(?:uestion)?)[.\s:]*)?(\d{1,6})\s*[.):\-]\s*(.+)$', re.I)
OPTION = re.compile(r'^\(?([A-Ha-h])\s*[).:\-]\s*(.+)$')
ANSWER = re.compile(r'^(?:correct\s+)?(?:ans(?:wer)?|correct option)\s*[.:\-]?\s*\(?([A-H])[).]?(?:[.\s:\-]+(.*))?$', re.I)
KEY_PAIR = re.compile(r'(?<!\w)(\d{1,6})\s*[.):\-]?\s*\(?([A-H])\)?(?=\s|[,;.]|$)', re.I)
SECTION = re.compile(r'^(?:chapter|unit|section|topic)\s+(.+)$', re.I)
SOLUTION_HEAD = re.compile(r'^(?:answers?\s*(?:and|&)\s*)?(?:solutions?|explanations?|rationales?)(?:\s*[:\-].*)?$', re.I)
KEY_HEAD = re.compile(r'^(?:correct\s+answers?|answer\s*key|answers?)(?:\s*[:\-].*)?$', re.I)
EXPLANATION = re.compile(r'^(?:explanation|solution|rationale)\s*[:.\-]\s*(.*)$', re.I)


def emit(**data):
    print(json.dumps(data), flush=True)


def dump_atomic(path, value):
    tmp = Path(str(path) + '.tmp')
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf8')
    os.replace(tmp, path)


def stream_json(path, items):
    tmp = Path(str(path) + '.tmp')
    with tmp.open('w', encoding='utf8') as f:
        f.write('[\n')
        first = True
        for item in items:
            if not first: f.write(',\n')
            json.dump(item, f, ensure_ascii=False)
            first = False
        f.write('\n]\n')
    os.replace(tmp, path)


def extract_page(doc, number, output, ocr=False):
    page = doc[number - 1]
    events, issues = [], []
    textpage = None
    if len(page.get_text().strip()) < 20:
        if ocr:
            try: textpage = page.get_textpage_ocr(full=True)
            except Exception: issues.append('ocr_unavailable')
        else: issues.append('scanned_or_empty_page_requires_ocr')
    # Exclude binary image data; images are extracted independently below.
    data = page.get_text('dict', flags=fitz.TEXTFLAGS_DICT & ~fitz.TEXT_PRESERVE_IMAGES, textpage=textpage)
    for block in data.get('blocks', []):
        for line in block.get('lines', []):
            text = ''.join(s.get('text', '') for s in line.get('spans', [])).strip()
            if not text: continue
            bbox = list(line['bbox'])
            if (bbox[1] < page.rect.height * .035 or bbox[3] > page.rect.height * .97) and re.fullmatch(r'(?:page\s*)?\d+', text, re.I): continue
            events.append({'kind':'text', 'text':text, 'bbox':bbox, 'page':number, 'page_height':page.rect.height, 'bold':any(s.get('flags',0)&16 for s in line.get('spans',[])), 'size':max((s.get('size',0) for s in line.get('spans',[])),default=0)})
    # Detect separated columns geometrically, never by fixed page numbers.
    left = [e for e in events if e['bbox'][0] < page.rect.width * .4 and e['bbox'][2] < page.rect.width * .58]
    right = [e for e in events if e['bbox'][0] > page.rect.width * .46]
    columns = len(left) >= 4 and len(right) >= 4 and not any(KEY_HEAD.fullmatch(e['text']) for e in events)
    if columns: issues.append('multi_column_reading_order_verify')
    for image in page.get_image_info(xrefs=True):
        bbox = list(image['bbox'])
        area = max(0,bbox[2]-bbox[0]) * max(0,bbox[3]-bbox[1])
        if area > page.rect.width * page.rect.height * .85:
            issues.append('full_page_image_not_attached'); continue
        if area < 300 or not image.get('xref'): continue
        if image.get('width',0)*image.get('height',0)>30000000:
            issues.append('image_too_large');continue
        try:
            pix = fitz.Pixmap(doc, image['xref'])
            if pix.width * pix.height > 30000000:
                issues.append('image_too_large'); continue
            if pix.n - pix.alpha > 3: pix = fitz.Pixmap(fitz.csRGB, pix)
            content = pix.tobytes('png')
            digest = hashlib.sha256(content).hexdigest()
            key = digest + '.png'
            dest = output / 'images' / key
            if not dest.exists(): dest.write_bytes(content)
            events.append({'kind':'image', 'key':key, 'bbox':bbox, 'page':number})
        except Exception: issues.append('image_extraction_failed')
    if any(len(d.get('items',[]))>5 for d in page.get_drawings()): issues.append('vector_graphics_present_verify_source')
    def order(e):
        col = 1 if columns and e['bbox'][0] > page.rect.width * .46 else 0
        return (col, round(e['bbox'][1],1), e['bbox'][0])
    events.sort(key=order)
    return events, list(dict.fromkeys(issues))


def blank(number, scope, page, source):
    return {'number':number, 'scope':scope, 'question_text':'', 'options':[], 'correct_answer':None,
            'explanation':'', 'images':[], 'source':{'pdf':source,'question_pages':[page], 'answer_pages':[], 'solution_pages':[]}, 'issues':[]}


def add_page(q, kind, page):
    if page not in q['source'][kind]: q['source'][kind].append(page)


def parse_cached(db, filename):
    db.executescript('DELETE FROM records; DELETE FROM answers; DELETE FROM solutions; DELETE FROM diagnostics;')
    current, sol, scope, mode, field, serial = None, None, '', 'questions', 'question', 0
    pending_key = None
    explicit_solutions = False
    current_style = None
    footer_counts = collections.Counter()
    for raw, in db.execute('SELECT events FROM pages'):
        for event in json.loads(raw):
            if event['kind']=='text' and event['bbox'][1] > event.get('page_height',10000)*.88: footer_counts[event['text']]+=1
    footers={text for text,count in footer_counts.items() if count>=3}
    def diagnostic(code, page, **extra):
        db.execute('INSERT INTO diagnostics(data) VALUES(?)', (json.dumps({'code':code,'page':page,**extra}),))
    def flush_question():
        nonlocal current, serial
        if current:
            serial += 1
            db.execute('INSERT INTO records(id,number,scope,data) VALUES(?,?,?,?)',(serial,current['number'],current['scope'],json.dumps(current)))
            current = None
    def flush_solution():
        nonlocal sol
        if sol:
            db.execute('INSERT INTO solutions(number,scope,data) VALUES(?,?,?)',(sol['number'],sol['scope'],json.dumps(sol)))
            sol = None
    def answer(number, key, page):
        db.execute('INSERT INTO answers(number,scope,answer,page) VALUES(?,?,?,?)',(number,scope,key.upper(),page))
    for row in db.execute('SELECT page,events,issues FROM pages ORDER BY page'):
        page, event_json, issue_json = row
        page_issues = json.loads(issue_json)
        for code in page_issues: diagnostic(code,page)
        page_events=json.loads(event_json)
        texts=[e.get('text','') for e in page_events if e['kind']=='text']
        contents_like=sum(bool(QUESTION.match(t)) for t in texts)>=3 and sum(bool(re.fullmatch(r'\d+',t)) for t in texts)>=3 and not any(OPTION.match(t) for t in texts)
        if contents_like or any(t.lower().startswith('contents') for t in texts):
            continue
        sizes=sorted(e.get('size',0) for e in page_events if e['kind']=='text')
        normal_size=sizes[len(sizes)//2] if sizes else 12
        for event_index,e in enumerate(page_events):
            if e['kind'] == 'image':
                target = sol if mode == 'solutions' else current
                # Only place images inside a region already anchored on this page.
                role = 'explanation' if mode == 'solutions' or field == 'explanation' else 'question'
                pages = target['source']['solution_pages' if role == 'explanation' else 'question_pages'] if target else []
                if target and page not in pages and role=='question':
                    following=next((x.get('text','') for x in page_events[event_index+1:] if x['kind']=='text'), '')
                    if OPTION.match(following): add_page(target,'question_pages',page)
                if target and page in pages:
                    target['images'].append({'key':e['key'],'role':role,'page':page,'bbox':e['bbox']})
                    target['issues'].append('image_association_verify')
                else: diagnostic('unassigned_image',page,image=e)
                continue
            text = e['text']
            if text in footers or re.fullmatch(r'Page\s+\d+\s+(?:of|/)\s*\d+',text,re.I): continue
            solution_start=re.match(r'^Solution\s+(?:for\s+)?Question\s+(\d+)\s*[:.]?\s*(.*)$',text,re.I)
            if solution_start:
                flush_question();flush_solution();mode='solutions';explicit_solutions=True
                sol=blank(solution_start.group(1),scope,page,filename)
                sol['source']['question_pages']=[];sol['source']['solution_pages']=[page]
                if solution_start.group(2):sol['explanation']=solution_start.group(2)+'\n'
                continue
            # Large standalone headings define document scopes without fixed pages.
            if e.get('size',0)>normal_size*1.25 and e['bbox'][1]<e.get('page_height',10000)*.2 and not (QUESTION.match(text) or KEY_HEAD.match(text) or SOLUTION_HEAD.match(text)):
                flush_question();flush_solution();scope=text.casefold()+' @'+str(page);mode='questions';explicit_solutions=False;continue
            section = SECTION.match(text)
            if section:
                flush_question(); flush_solution()
                scope = section.group(1).strip().casefold(); mode = 'questions'; explicit_solutions=False; continue
            if mode != 'solutions' and SOLUTION_HEAD.match(text):
                flush_question(); flush_solution(); mode='solutions'; explicit_solutions=False; continue
            if KEY_HEAD.match(text) and not ANSWER.match(text) and mode != 'solutions':
                flush_question(); flush_solution(); mode='answers'; continue
            if re.fullmatch(r'(?:practice\s+)?questions?',text,re.I):
                flush_question(); flush_solution(); mode='questions'; continue
            if mode == 'answers':
                key_question=re.fullmatch(r'Question\s+(\d+)',text,re.I)
                if key_question: pending_key=key_question.group(1);continue
                if pending_key and re.fullmatch('[1-8A-Ha-h]',text):
                    key=chr(64+int(text)) if text.isdigit() else text.upper()
                    answer(pending_key,key,page);pending_key=None;continue
                if text.casefold() in ['question','correct answer']:continue
                pairs = KEY_PAIR.findall(text)
                if pairs:
                    for number,key in pairs: answer(number,key,page)
                else: diagnostic('unmatched_answer_key_text',page,text=text)
                continue
            m = QUESTION.match(text)
            if mode == 'solutions':
                if m and not explicit_solutions:
                    flush_solution(); sol=blank(m.group(1),scope,page,filename)
                    sol['source']['question_pages']=[]; sol['source']['solution_pages']=[page]
                    text=m.group(2)
                if sol:
                    add_page(sol,'solution_pages',page)
                    a=ANSWER.match(text)
                    if not a and m and not explicit_solutions: a=re.match(r'^\(?([A-H])[).](?:\s+(.*))?$',text,re.I)
                    if a:
                        answer(sol['number'],a.group(1),page)
                        if a.group(2): sol['explanation'] += a.group(2)+'\n'
                    elif not EXPLANATION.match(text): sol['explanation'] += text+'\n'
                    elif EXPLANATION.match(text).group(1): sol['explanation'] += EXPLANATION.match(text).group(1)+'\n'
                    sol['issues'].extend(page_issues)
                else: diagnostic('unmatched_solution',page,text=text)
                continue
            a=ANSWER.match(text)
            expl=EXPLANATION.match(text)
            opt=OPTION.match(text)
            if a and current:
                answer(current['number'],a.group(1),page)
                add_page(current,'answer_pages',page)
                if a.group(2): current['explanation'] += a.group(2)+'\n'
                field='explanation'; continue
            if expl and current:
                field='explanation'; current['explanation'] += expl.group(1)+'\n'; add_page(current,'solution_pages',page); continue
            if opt and current and field != 'explanation':
                current['options'].append({'key':opt.group(1).upper(),'text':opt.group(2)})
                field='option'; add_page(current,'question_pages',page); continue
            if m and current and current_style and (e.get('size',0)<current_style[0]*.9 or (current_style[1] and not e.get('bold',False))) and not re.match(r'^Q(?:uestion)?[.\s:]',text,re.I):
                m=None
            if m:
                current_style=(e.get('size',0),e.get('bold',False))
                flush_question(); current=blank(m.group(1),scope,page,filename)
                current['question_text']=m.group(2); field='question'
                current['issues'].extend(page_issues); continue
            if current:
                if field == 'explanation':
                    current['explanation'] += text+'\n'; add_page(current,'solution_pages',page)
                elif field == 'option' and current['options']: current['options'][-1]['text'] += ' '+text; add_page(current,'question_pages',page)
                else: current['question_text'] += ' '+text; add_page(current,'question_pages',page)
                current['issues'].extend(page_issues)
            elif text: diagnostic('unassigned_text',page,text=text)
        # Transactions cap WAL growth and retain completed records on disk.
        db.commit()
    flush_question(); flush_solution(); db.commit()


def export_records(db, output, filename, subject):
    total, review = 0, 0
    def records():
        nonlocal total,review
        for row in db.execute('SELECT id,number,scope,data FROM records ORDER BY id'):
            seq,number,scope,raw=row; q=json.loads(raw)
            duplicates=db.execute('SELECT count(*) FROM records WHERE number=? AND scope=?',(number,scope)).fetchone()[0]
            global_count=db.execute('SELECT count(*) FROM records WHERE number=?',(number,)).fetchone()[0]
            if duplicates>1: q['issues'].append('duplicate_question_number')
            # Match by scope+number, with global fallback ONLY when unambiguous.
            condition, params=('number=? AND scope=?',(number,scope)) if global_count>1 else ('number=?',(number,))
            answers=db.execute('SELECT answer,page FROM answers WHERE '+condition,params).fetchall()
            solutions=db.execute('SELECT data FROM solutions WHERE '+condition,params).fetchall()
            keys=set(a[0] for a in answers)
            if duplicates == 1 and len(keys)==1:
                q['correct_answer']=next(iter(keys)); q['source']['answer_pages']=sorted(set(q['source']['answer_pages']+[a[1] for a in answers]))
            elif keys: q['issues'].append('ambiguous_answer_key')
            if duplicates==1 and len(solutions)==1:
                solution=json.loads(solutions[0][0]); q['explanation'] += solution['explanation'];q['images']+=solution['images'];q['issues']+=solution['issues']
                q['source']['solution_pages']=sorted(set(q['source']['solution_pages']+solution['source']['solution_pages']))
            elif len(solutions)>1: q['issues'].append('ambiguous_solution')
            if '{{' in q['question_text'] or '}}' in q['question_text']:q['issues'].append('source_placeholder_text')
            if not q['question_text'].strip(): q['issues'].append('missing_question_text')
            if len(q['options'])<2: q['issues'].append('missing_options')
            option_keys=[o['key'] for o in q['options']]
            if len(set(option_keys)) != len(option_keys): q['issues'].append('duplicate_option_keys')
            if not q['correct_answer']: q['issues'].append('missing_correct_answer')
            elif q['correct_answer'] not in option_keys: q['issues'].append('invalid_correct_answer')
            if not q['explanation'].strip() and not any(i['role']=='explanation' for i in q['images']): q['issues'].append('missing_explanation')
            if re.search(r'\b(?:image|figure|diagram|shown below)\b',q['question_text'],re.I) and not any(i['role']=='question' for i in q['images']): q['issues'].append('possibly_missing_question_image')
            q['issues']=list(dict.fromkeys(q['issues']))
            q['question_id']=f'PDF-{seq:06d}'; q['subject']=subject; q['topic']=None; q['subtopic']=None
            q['extraction_status']='needs_review' if q['issues'] else 'complete'
            q['classification']={'status':'needs_review','confidence':0}
            total+=1;review+=bool(q['issues'])
            db.execute('UPDATE records SET data=? WHERE id=?',(json.dumps(q),seq))
            yield q
    stream_json(output/'questions.json',records()); db.commit()
    # NDJSON supports bounded-memory ingestion by the web worker.
    with (output/'questions.ndjson').open('w',encoding='utf8') as f:
        for raw, in db.execute('SELECT data FROM records ORDER BY id'): f.write(raw+'\n')
    for table,code in [('answers','unmatched_answer_key'),('solutions','unmatched_solution')]:
        for number,scope in db.execute(f'SELECT DISTINCT number,scope FROM {table} WHERE NOT EXISTS (SELECT 1 FROM records r WHERE r.number={table}.number)'):
            db.execute('INSERT INTO diagnostics(data) VALUES(?)',(json.dumps({'code':code,'number':number,'scope':scope}),))
    def errors():
        for raw, in db.execute('SELECT data FROM diagnostics'): yield json.loads(raw)
        for raw, in db.execute('SELECT data FROM records'):
            q=json.loads(raw)
            if q['issues']: yield {'question_id':q['question_id'],'issues':q['issues'],'source':q['source']}
    stream_json(output/'errors.json',errors())
    diagnostic_count=db.execute('SELECT count(*) FROM diagnostics').fetchone()[0]
    report={'parser_version':VERSION,'source_pdf':filename,'questions_found':total,'questions_needing_review':review,
            'diagnostics':diagnostic_count,'pages_processed':db.execute('SELECT count(*) FROM pages').fetchone()[0],
            'images':len(list((output/'images').glob('*.png'))),'requires_admin_review':True,
            'limitations':['Scanned pages need optional Tesseract OCR.','Ambiguous layouts and image associations require source review.','Unnumbered questions and unfamiliar layouts may require manual entry.']}
    dump_atomic(output/'extraction_report.json',report)
    return report


def run(args):
    output=Path(args.output).resolve(); output.mkdir(parents=True,exist_ok=True); (output/'images').mkdir(exist_ok=True)
    with fitz.open(args.pdf) as doc:
        if doc.needs_pass: raise ValueError('Password-protected PDFs must be unlocked before upload.')
        if args.info:
            emit(page_count=len(doc)); return
        if args.render_page:
            if not 1<=args.render_page<=len(doc): raise ValueError('Invalid page.')
            doc[args.render_page-1].get_pixmap(matrix=fitz.Matrix(min(1.2,2000/max(doc[args.render_page-1].rect.width,doc[args.render_page-1].rect.height)),min(1.2,2000/max(doc[args.render_page-1].rect.width,doc[args.render_page-1].rect.height)))).save(str(output/f'page-{args.render_page}.png'));return
        start=args.start_page;end=args.end_page or len(doc)
        if not 1<=start<=end<=len(doc): raise ValueError('Page range is outside this PDF.')
        db=sqlite3.connect(output/'checkpoint.sqlite')
        db.executescript('''PRAGMA journal_mode=WAL;
          CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY,value TEXT);
          CREATE TABLE IF NOT EXISTS pages(page INTEGER PRIMARY KEY,events TEXT,issues TEXT);
          CREATE TABLE IF NOT EXISTS records(id INTEGER PRIMARY KEY,number TEXT,scope TEXT,data TEXT);
          CREATE INDEX IF NOT EXISTS record_number ON records(number,scope);
          CREATE TABLE IF NOT EXISTS answers(number TEXT,scope TEXT,answer TEXT,page INTEGER);
          CREATE INDEX IF NOT EXISTS answer_number ON answers(number,scope);
          CREATE TABLE IF NOT EXISTS solutions(number TEXT,scope TEXT,data TEXT);
          CREATE INDEX IF NOT EXISTS solution_number ON solutions(number,scope);
          CREATE TABLE IF NOT EXISTS diagnostics(data TEXT);''')
        stat=Path(args.pdf).stat()
        identity=json.dumps([str(Path(args.pdf).resolve()),stat.st_size,stat.st_mtime_ns,start,end,args.ocr,VERSION])
        old=db.execute("SELECT value FROM meta WHERE key='identity'").fetchone()
        if old and old[0]!=identity: raise ValueError('Checkpoint belongs to another PDF/range. Use a new output directory.')
        db.execute("INSERT OR REPLACE INTO meta VALUES('identity',?)",(identity,));db.commit()
        images=0
        for number in range(start,end+1):
            cached=db.execute('SELECT events FROM pages WHERE page=?',(number,)).fetchone()
            if cached: events=json.loads(cached[0])
            else:
                try: events,issues=extract_page(doc,number,output,args.ocr)
                except Exception: events,issues=[],['page_extraction_failed']
                db.execute('INSERT INTO pages VALUES(?,?,?)',(number,json.dumps(events),json.dumps(issues)));db.commit()
            images+=sum(e['kind']=='image' for e in events)
            emit(stage='extracting',page_count=len(doc),pages_processed=number-start+1,current_page=number,images_found=images,resumed=bool(cached))
        emit(stage='matching',page_count=len(doc),pages_processed=end-start+1)
        parse_cached(db,args.source_name or Path(args.pdf).name)
        report=export_records(db,output,args.source_name or Path(args.pdf).name,args.subject)
        emit(stage='completed',page_count=len(doc),**report)
        db.close()


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf');parser.add_argument('--output',required=True)
    parser.add_argument('--start-page',type=int,default=1);parser.add_argument('--end-page',type=int)
    parser.add_argument('--subject',default='');parser.add_argument('--source-name')
    parser.add_argument('--ocr',action='store_true');parser.add_argument('--info',action='store_true');parser.add_argument('--render-page',type=int)
    try: run(parser.parse_args())
    except Exception as exc:
        print(json.dumps({'stage':'failed','error':str(exc)}),flush=True);sys.exit(1)
