// note editor helpers (2026-10-21). Paste the whole file into the editor.note.com/notes/<key>/edit/ tab with javascript_tool.
// A reload or a full page change loses them: check `typeof __nBody` and paste again when it is 'undefined'.
// Files come from the picker (note_pick.js) through IndexedDB '__n_uploads' → await __nLoad().
// Enter makes a <br> inside a paragraph in this editor: never use Enter to make paragraphs.

window.__nSleep = ms => new Promise(r => setTimeout(r, ms));
window.__nKey = () => (location.pathname.match(/\/notes\/([^/]+)\/edit/) || [])[1] || null;
window.__nVis = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 };
window.__nXY = el => { el.scrollIntoView({ block: 'center' }); const r = el.getBoundingClientRect(); const k = (window.__nFrameW || innerWidth) / innerWidth; return [Math.round((r.left + r.width / 2) * k), Math.round((r.top + r.height / 2) * k)] };

// ---- files from the picker
window.__nIDB = () => new Promise((res, rej) => { const rq = indexedDB.open('__n_uploads', 1); rq.onupgradeneeded = () => { if (!rq.result.objectStoreNames.contains('files')) rq.result.createObjectStore('files') }; rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error) });
window.__nLoad = () => __nIDB().then(d => new Promise(res => { const os = d.transaction('files', 'readonly').objectStore('files'); const q = os.getAllKeys(); q.onsuccess = () => { const keys = q.result; const q2 = os.getAll(); q2.onsuccess = () => { window.__nFiles = window.__nFiles || {}; keys.forEach((k, i) => window.__nFiles[k] = q2.result[i]); d.close(); res(keys.map((k, i) => k + ':' + q2.result[i].size)) } } }));

// ---- body
window.__nEd = () => { const eds = [...document.querySelectorAll('[contenteditable="true"]')].filter(__nVis); eds.sort((a, b) => b.innerText.length - a.innerText.length); return eds[0] || null };
window.__nIsEmbed = c => !!(c.matches('figure, [embedded-service]') || c.querySelector('iframe, figure, [embedded-service]'));
window.__nBody = () => {
  const ed = __nEd(); if (!ed) return 'no editor';
  const q = s => ed.querySelectorAll(s).length;
  return { key: __nKey(), title: document.querySelector('textarea[placeholder="記事タイトル"]')?.value || '', blocks: ed.children.length,
    h2: q('h2'), h3: q('h3'), ul: q('ul'), li: q('li'), a: q('a[href]'), strong: q('strong, b'), iframes: q('iframe'),
    embeds: [...ed.children].filter(__nIsEmbed).length, ytText: [...ed.querySelectorAll('p')].filter(p => /^https:\/\/youtu\.be\//.test(p.innerText.trim())).length,
    emptyP: __nEmpties(), len: ed.innerText.length, first: ed.innerText.trim().slice(0, 24), last: ed.innerText.trim().slice(-24) };
};
// one line per top-level block: index, tag, [embed], first characters
window.__nOutline = (from = 0, to = 999) => { const ed = __nEd(); return [...ed.children].slice(from, to).map((c, i) => (i + from) + ' ' + c.tagName + (__nIsEmbed(c) ? '[embed]' : '') + ' ' + (c.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 22)) };
window.__nEmpties = () => { const ed = __nEd(); const out = []; [...ed.children].forEach((c, i) => { if (c.tagName === 'P' && !c.innerText.trim() && !__nIsEmbed(c) && !c.querySelector('img')) out.push(i) }); return out };
window.__nP = start => [...__nEd().querySelectorAll('p')].find(p => p.innerText.trim().startsWith(start)) || null;
window.__nCaretEnd = el => { const ed = __nEd(); ed.focus(); const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return 'caret at end of "' + (el.innerText || '').trim().slice(-16) + '"' };
// caret into top-level block i (for a real BackSpace on an empty paragraph: one BackSpace per empty paragraph, then check again)
window.__nCaretIn = i => { const ed = __nEd(); const el = ed.children[i]; if (!el) return 'no block ' + i; el.scrollIntoView({ block: 'center' }); ed.focus(); const r = document.createRange(); r.selectNodeContents(el); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r); return 'caret in block ' + i + ' <' + el.tagName + '> "' + el.innerText.trim().slice(0, 20) + '" (prev: ' + (el.previousElementSibling ? el.previousElementSibling.tagName + (__nIsEmbed(el.previousElementSibling) ? '[embed]' : '') : '-') + ')' };

// ---- buttons / menu items by visible text or aria-label (prefers real buttons; returns the innermost match)
window.__nFind = (label, root = document) => {
  const m = el => { if (!__nVis(el)) return false; const a = (el.getAttribute('aria-label') || '').trim(); const t = (el.innerText || '').trim(); return a === label || t === label };
  const pri = [...root.querySelectorAll('button, [role="menuitem"], [role="option"], [role="button"], a')].filter(m);
  if (pri.length) return pri[pri.length - 1];
  const rest = [...root.querySelectorAll('li, span, div, p, label')].filter(m);
  return rest.length ? rest[rest.length - 1] : null;
};
window.__nClick = label => { const el = __nFind(label); if (!el) return 'not found: ' + label; el.click(); return 'clicked ' + label + ' <' + el.tagName.toLowerCase() + '>' };

// ---- prefill the empty body from the picked HTML (then reload the page)
window.__nPrefill = async name => { const key = __nKey(); if (!key) return 'not on an edit page'; await __nLoad(); const f = window.__nFiles[name]; if (!f) return 'file not picked: ' + name; const html = await f.text(); sessionStorage.setItem('prefill-note:' + key, html); return 'prefill set for ' + key + ' (' + html.length + ' chars). Reload the page now.' };

// ---- title
window.__nTitle = async text => { const t = document.querySelector('textarea[placeholder="記事タイトル"]'); if (!t) return 'no title box'; t.focus(); t.select(); document.execCommand('insertText', false, text); await __nSleep(500); return t.value };

// ---- 目次 after the paragraph that starts with `start` (caret at its end →「メニューを開く」→「目次」)
window.__nTocAfter = async start => {
  const p = __nP(start); if (!p) return 'no paragraph: ' + start;
  const r1 = __nCaretEnd(p); await __nSleep(700);
  const b = __nFind('メニューを開く'); if (!b) return [r1, 'no メニューを開く button'];
  b.click(); await __nSleep(900);
  const t = __nFind('目次'); if (!t) return [r1, 'menu opened? no 目次 item'];
  t.click(); await __nSleep(1500);
  const i = [...__nEd().children].indexOf(__nP(start));
  return [r1, 'clicked 目次'].concat(__nOutline(Math.max(0, i - 1), i + 4));
};

// ---- YouTube embed: empty the paragraph that holds only the URL, then paste the URL into it
window.__nEmbed = async url => {
  const ed = __nEd(); const p = [...ed.querySelectorAll('p')].find(e => e.innerText.trim() === url); if (!p) return 'no paragraph with ' + url;
  p.scrollIntoView({ block: 'center' }); ed.focus();
  const r = document.createRange(); r.selectNodeContents(p); const s = getSelection(); s.removeAllRanges(); s.addRange(r); await __nSleep(300);
  document.execCommand('delete'); await __nSleep(500);
  const at = s.anchorNode ? (s.anchorNode.nodeType === 1 ? s.anchorNode : s.anchorNode.parentElement) : ed;
  const dt = new DataTransfer(); dt.setData('text/plain', url);
  at.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  await __nSleep(3500);
  const b = __nBody(); return { embeds: b.embeds, iframes: b.iframes, ytText: b.ytText, emptyP: b.emptyP };
};

// ---- header image (見出し画像): file from the picker →「画像を追加」→「画像をアップロード」→ crop dialog → __nHeaderSave()
window.__nOverride = () => {
  if (!window.__origClick) window.__origClick = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function () {
    if (this.type === 'file' && window.__nFile) { const dt = new DataTransfer(); dt.items.add(window.__nFile); this.files = dt.files; this.dispatchEvent(new Event('change', { bubbles: true })); window.__nUsed = (window.__nUsed || 0) + 1; return }
    return window.__origClick.call(this);
  };
  return 'override on';
};
window.__nHeader = async name => {
  await __nLoad(); const f = window.__nFiles[name]; if (!f) return 'file not picked: ' + name;
  window.__nFile = f; window.__nUsed = 0; __nOverride(); scrollTo(0, 0); await __nSleep(300);
  // 2026-10-27: the button above the title lost its aria-label → fall back to the icon button above the title box
  const tb = document.querySelector('textarea[placeholder="記事タイトル"]');
  const a = __nFind('画像を追加') || [...document.querySelectorAll('button[data-id="ButtonIcon"], button')].filter(__nVis)
    .find(b => { const r = b.getBoundingClientRect(); return r.top > 50 && tb && r.bottom < tb.getBoundingClientRect().top && !(b.innerText || '').trim() });
  if (!a) return 'no 画像を追加 button';
  a.click(); await __nSleep(900);
  // the menu item text is now「画像をアップロード\n推奨サイズ：1280×670px」
  const u = __nFind('画像をアップロード') || [...document.querySelectorAll('button, [role="menuitem"]')].filter(__nVis).find(b => (b.innerText || '').trim().startsWith('画像をアップロード'));
  if (!u) return 'clicked 画像を追加, but no 画像をアップロード item';
  u.click(); await __nSleep(3000);
  return { fileSize: f.size, used: window.__nUsed, cropDialog: !!__nFind('画像のサイズの変更'), saveButton: !!__nFind('保存') };
};
window.__nHeaderSave = async () => { const s = __nFind('保存'); if (!s) return 'no 保存 button'; s.click(); await __nSleep(5000); window.__nFile = null; return { dialogGone: !__nFind('画像のサイズの変更'), bigImages: [...document.querySelectorAll('img')].filter(i => __nVis(i) && i.getBoundingClientRect().width >= 400).map(i => i.src.slice(0, 70)) } };

// ---- publish page: hashtags (type the name, click the candidate with the same name)
window.__nTagInput = () => [...document.querySelectorAll('input, textarea')].find(i => __nVis(i) && /ハッシュタグ/.test((i.placeholder || '') + (i.getAttribute('aria-label') || '')));
window.__nTag = async name => {
  const inp = __nTagInput(); if (!inp) return 'no hashtag input';
  inp.scrollIntoView({ block: 'center' }); inp.focus(); inp.select && inp.select();
  document.execCommand('insertText', false, name); await __nSleep(1500);
  const want = ['#' + name, name];
  const c = [...document.querySelectorAll('button, [role="option"], li, a, span, div')].filter(e => __nVis(e) && want.includes((e.innerText || '').trim()) && !e.contains(inp));
  if (!c.length) return 'no candidate for ' + name + ' (input now: "' + inp.value + '")';
  c[c.length - 1].click(); await __nSleep(900);
  return 'picked ' + name + ' / input now: "' + inp.value + '"';
};

// ---- check through the API (draft=true while it is a draft)
window.__nApi = async (key, draft) => {
  const r = await fetch('https://note.com/api/v3/notes/' + key + (draft ? '?draft=true' : ''), { credentials: 'include' });
  if (!r.ok) return 'HTTP ' + r.status;
  const d = (await r.json()).data; const b = d.body || '';
  return { status: d.status, name: d.name, eyecatch: (d.eyecatch || '').slice(0, 80), hashtags: (d.hashtag_notes || d.hashtags || []).map(h => (h.hashtag && h.hashtag.name) || h.name),
    yt: (b.match(/embedded-service="youtube"/g) || []).length, toc: /table-of-contents/.test(b), h2: (b.match(/<h2/g) || []).length,
    li: (b.match(/<li/g) || []).length, len: b.length, price: d.price, url: d.note_url || ('https://note.com/child_academy00/n/' + key) };
};
'note helpers ready: ' + __nKey();
