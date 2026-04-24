// ─────────────────────────────────────────────
// STAR FIELD
// ─────────────────────────────────────────────
(function(){
  const canvas = document.getElementById('star-canvas');
  const ctx = canvas.getContext('2d');
  let stars = [], W, H, shooting = null, shootT = 0;

  function resize(){
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
    stars = Array.from({length: 240}, () => ({
      x: Math.random()*W, y: Math.random()*H,
      r: Math.random()*1.5 + 0.3,
      alpha: Math.random()*0.7 + 0.2,
      speed: Math.random()*0.3 + 0.05,
      drift: (Math.random()-0.5)*0.12
    }));
  }

  function shoot(){
    shooting = { x: Math.random()*W*0.7, y: Math.random()*H*0.3, len: 180+Math.random()*120, alpha: 1 };
    shootT = 0;
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    // nebula glow
    const ng = ctx.createRadialGradient(W*0.5, H*0.4, 0, W*0.5, H*0.4, W*0.45);
    ng.addColorStop(0, 'rgba(64,180,255,0.025)');
    ng.addColorStop(0.5, 'rgba(139,92,246,0.015)');
    ng.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ng; ctx.fillRect(0,0,W,H);

    stars.forEach(s => {
      s.x += s.drift; s.y -= s.speed;
      if(s.y < 0){ s.y = H; s.x = Math.random()*W; }
      if(s.x < 0) s.x = W; if(s.x > W) s.x = 0;
      const twinkle = 0.6 + 0.4*Math.sin(Date.now()*0.002 + s.x);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(180,220,255,${s.alpha*twinkle})`;
      ctx.fill();
    });

    // shooting star
    if(shooting){
      shootT++;
      const sx = shooting.x + shootT*4;
      const sy = shooting.y + shootT*1.8;
      const g = ctx.createLinearGradient(sx, sy, sx-shooting.len, sy-shooting.len*0.45);
      g.addColorStop(0, `rgba(64,212,255,${shooting.alpha})`);
      g.addColorStop(1, 'rgba(64,212,255,0)');
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx-shooting.len, sy-shooting.len*0.45);
      ctx.strokeStyle = g; ctx.lineWidth = 1.5; ctx.stroke();
      shooting.alpha -= 0.018;
      if(shooting.alpha <= 0) shooting = null;
    } else if(Math.random() < 0.003) shoot();

    requestAnimationFrame(draw);
  }
  window.addEventListener('resize', resize);
  resize(); draw();
})();

// ─────────────────────────────────────────────
// CUSTOM CURSOR
// ─────────────────────────────────────────────
(function(){
  const ring = document.getElementById('cursor-ring');
  const dot  = document.getElementById('cursor-dot');
  let mx=0, my=0, rx=0, ry=0;

  window.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top = my + 'px';
  });

  (function animRing(){
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.left = rx + 'px';
    ring.style.top = ry + 'px';
    requestAnimationFrame(animRing);
  })();

  document.querySelectorAll('button, .nav-link, .option-card, .btn-tool, .back-btn, a').forEach(el=>{
    el.addEventListener('mouseenter', ()=>document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', ()=>document.body.classList.remove('cursor-hover'));
  });
})();

// ─────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────
const pages = ['home','analyzer','results','ai','about','sidebyside','history'];

function getPageFromUrl(){
  const params = new URLSearchParams(window.location.search);
  const page = params.get('page');
  return pages.includes(page) ? page : 'home';
}

function updateHistoryState(page, replace = false){
  const url = page === 'home' ? '/' : `?page=${encodeURIComponent(page)}`;
  const state = { page };
  if(replace){
    window.history.replaceState(state, '', url);
  } else {
    window.history.pushState(state, '', url);
  }
}

function navigate(page, pushState = true){
  if(!pages.includes(page)) page = 'home';

  pages.forEach(p => {
    const el = document.getElementById('page-'+p);
    if(el) el.classList.remove('active');
    const nl = document.getElementById('nav-'+p);
    if(nl) nl.classList.remove('active');
  });

  const target = document.getElementById('page-'+page);
  if(target){ target.classList.add('active'); window.scrollTo({top:0, behavior:'smooth'}); }
  const navLink = document.getElementById('nav-'+page);
  if(navLink) navLink.classList.add('active');

  if(pushState){
    updateHistoryState(page);
  }
}

window.addEventListener('popstate', event => {
  const page = event.state?.page || getPageFromUrl();
  navigate(page, false);
});

document.addEventListener('DOMContentLoaded', () => {
  const initialPage = getPageFromUrl();
  navigate(initialPage, false);
  updateHistoryState(initialPage, true);
});

// ─────────────────────────────────────────────
// ANALYZER LOGIC
// ─────────────────────────────────────────────
let currentOption = 'upload';
let uploadedCode = '';
let uploadedFileName = '';

function selectOption(opt){
  currentOption = opt;
  document.getElementById('opt-upload').classList.toggle('selected', opt==='upload');
  document.getElementById('opt-paste').classList.toggle('selected', opt==='paste');
}

function handleFile(inputOrFile){
  const fileInput = document.getElementById('file-input');
  let file = inputOrFile;

  if (!(file instanceof File)) {
    file = fileInput.files ? fileInput.files[0] : null;
  }
  if (!file) return;

  const dt = new DataTransfer();
  dt.items.add(file);
  fileInput.files = dt.files;

  uploadedFileName = file.name;
  document.getElementById('file-chosen').textContent = '✓ ' + file.name;
  const ext = file.name.split('.').pop().toLowerCase();
  const langMap = {py:'python', js:'javascript', java:'java', cpp:'cpp', cc:'cpp', cxx:'cpp'};
  if(langMap[ext]) document.getElementById('lang-select').value = langMap[ext];
  const reader = new FileReader();
  reader.onload = e => { uploadedCode = e.target.result || ''; };
  reader.readAsText(file);
}

// Drag & Drop
const dz = document.getElementById('drop-zone');
dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('drag-over'); });
dz.addEventListener('dragleave', () => dz.classList.remove('drag-over'));
dz.addEventListener('drop', e => {
  e.preventDefault(); dz.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if(file){ handleFile(file); }
});

// Code input → line numbers + lang detection
function onCodeInput(ta){
  updateLineNumbers(ta);
  const lang = detectLang(ta.value);
  const badge = document.getElementById('lang-badge');
  badge.textContent = lang ? lang.toUpperCase() : 'Unknown';
  badge.style.color = langColor(lang);
  badge.style.borderColor = langColor(lang);
  badge.style.background = langColor(lang).replace(')', ',0.08)').replace('rgb','rgba');
  if(lang) document.getElementById('lang-select').value = lang;
}

function updateLineNumbers(ta){
  const lines = ta.value.split('\n').length;
  document.getElementById('line-numbers').innerHTML = Array.from({length:lines},(_,i)=>i+1).join('<br>');
}

function syncScroll(ta){
  const lns = document.getElementById('line-numbers');
  lns.scrollTop = ta.scrollTop;
}

function detectLang(code){
  if(!code.trim()) return null;
  if(/^\s*(import|from|def |class |print\(|#!\/usr\/bin\/env python)/m.test(code)) return 'python';
  if(/(function\s|const\s|let\s|var\s|=>|require\(|module\.exports|console\.)/m.test(code)) return 'javascript';
  if(/(public\s+class|System\.out|import\s+java\.|@Override|public\s+static\s+void\s+main)/m.test(code)) return 'java';
  if(/(#include|std::|cout|cin|int\s+main\(|namespace\s+std)/m.test(code)) return 'cpp';
  return null;
}

function langColor(lang){
  const m = {python:'rgb(55,118,171)', javascript:'rgb(247,223,30)', java:'rgb(176,114,25)', cpp:'rgb(101,155,211)'};
  return m[lang] || 'rgb(64,180,255)';
}

function clearAll(){
  document.getElementById('code-input').value = '';
  document.getElementById('line-numbers').innerHTML = '1';
  document.getElementById('lang-badge').textContent = 'Awaiting input…';
  document.getElementById('lang-badge').style.color = '';
  document.getElementById('lang-select').value = 'auto';
  document.getElementById('file-input').value = '';
  document.getElementById('file-chosen').textContent = '';
  uploadedCode = '';
  uploadedFileName = '';
}

// ─────────────────────────────────────────────
// ANALYSIS → API CALL
// ─────────────────────────────────────────────
async function runAnalysis(){
  let code = '';
  const fetchOptions = { method: 'POST' };
  const lang = document.getElementById('lang-select').value;

  if(currentOption === 'paste'){
    code = document.getElementById('code-input').value.trim();
    if(!code){ showToast('Paste some code first!', 'fa-triangle-exclamation'); return; }
    fetchOptions.headers = {'Content-Type': 'application/json'};
    fetchOptions.body = JSON.stringify({ code, language: lang === 'auto' ? detectLang(code) || 'python' : lang });
  } else {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    if(!file){ showToast('Please upload a file first!', 'fa-triangle-exclamation'); return; }
    const formData = new FormData();
    formData.append('file', file);
    fetchOptions.body = formData;
  }

  showLoader();

  try {
    const response = await fetch('/analyze', fetchOptions);

    if(!response.ok) throw new Error('Server error: ' + response.status);
    const data = await response.json();
    hideLoader();
    window._lastScore = data.score || 100;
    currentCleanedCode = data.cleaned_code || '';
    currentOriginalCode = data.original_code || '';
    renderResults(data.results || []);
    navigate('results');
  } catch(err){
    hideLoader();
    // If backend not available, use demo data
    if(err.message.includes('Failed to fetch') || err.message.includes('Server error')){
      renderResults(generateDemoResults(code, lang));
      navigate('results');
      showToast('Demo mode — backend not connected', 'fa-info-circle');
    } else {
      showToast('Analysis failed: ' + err.message, 'fa-circle-xmark');
    }
  }
}

// Demo result generator for offline testing
function generateDemoResults(code, lang){
  const results = [];
  const lines = code.split('\n');

  if(lang === 'python' || detectLang(code) === 'python'){
    // Find imports
    lines.forEach(l => {
      const m = l.match(/^import\s+(\w+)|^from\s+(\w+)\s+import/);
      if(m){
        const name = m[1]||m[2];
        const restCode = lines.filter(ll=>ll!==l).join('\n');
        if(!restCode.includes(name)){
          results.push({type:'Unused Import', name, message:`Module '${name}' is imported but never used in the code.`});
        }
      }
    });
    // Find functions
    lines.forEach(l => {
      const m = l.match(/^def\s+(\w+)\s*\(/);
      if(m){
        const fn = m[1];
        const restCode = lines.filter(ll=>ll!==l).join('\n');
        if(!restCode.includes(fn+'(')){
          results.push({type:'Unused Function', name: fn, message:`Function '${fn}' is defined but never called anywhere.`});
        }
      }
    });
  } else if(lang === 'javascript' || detectLang(code) === 'javascript'){
    lines.forEach(l => {
      const m = l.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:require|function|\()/);
      if(m){
        const name = m[1];
        const uses = (code.match(new RegExp(`\\b${name}\\b`, 'g'))||[]).length;
        if(uses <= 1) results.push({type:'Unused Variable', name, message:`Variable '${name}' is assigned but never referenced.`});
      }
    });
  }

  if(results.length === 0){
    results.push({type:'Unused Variable', name:'tempResult', message:"Variable 'tempResult' is assigned but its value is never read or returned."});
    results.push({type:'Unused Function', name:'helperFn', message:"Function 'helperFn' is defined but has no callers in the codebase."});
    results.push({type:'Unused Import', name:'os', message:"Module 'os' is imported but none of its attributes are used."});
  }
  return results;
}

// ─────────────────────────────────────────────
// RESULTS
// ─────────────────────────────────────────────
let currentResults = [];
let currentCleanedCode = '';
let currentOriginalCode = '';

function renderResults(results){
  currentResults = results;
  const body = document.getElementById('results-body');

  const total = results.length;
  const func  = results.filter(r => r.type === 'Unused Function').length;
  const varC  = results.filter(r => r.type === 'Unused Variable').length;
  const imp   = results.filter(r => r.type === 'Unused Import').length;

  animCount('cnt-total', total);
  animCount('cnt-func', func);
  animCount('cnt-var', varC);
  animCount('cnt-import', imp);

  document.getElementById('results-summary-text').textContent =
    `Found ${total} dead code item${total!==1?'s':''} — ${func} function${func!==1?'s':''}, ${varC} variable${varC!==1?'s':''}, ${imp} import${imp!==1?'s':''}.`;
  renderScoreRing(window._lastScore || 100);
  function renderScoreRing(score){
  const existing = document.getElementById('score-ring-wrap');
  if(existing) existing.remove();

  const color = score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--orange)' : 'var(--red)';
  const label = score >= 80 ? 'Excellent — minimal dead code' : score >= 50 ? 'Moderate — some cleanup needed' : 'Poor — significant dead code found';
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;

  const wrap = document.createElement('div');
  wrap.id = 'score-ring-wrap';
  wrap.className = 'score-ring-wrap';
  wrap.innerHTML = `
    <svg class="score-ring-svg" width="100" height="100" viewBox="0 0 100 100">
      <circle class="score-circle-bg" cx="50" cy="50" r="36"/>
      <circle class="score-circle-fg" cx="50" cy="50" r="36"
        style="stroke:${color}; stroke-dasharray:${circumference}; stroke-dashoffset:${circumference};"
        id="score-arc"/>
      <text x="50" y="46" text-anchor="middle"
        style="font-family:var(--font-head);font-size:18px;font-weight:900;fill:${color}">${score}</text>
      <text x="50" y="62" text-anchor="middle"
        style="font-family:var(--font-mono);font-size:9px;fill:var(--text3)">/ 100</text>
    </svg>
    <div class="score-ring-info">
      <div class="score-ring-label">Code Quality Score</div>
      <div class="score-ring-value" style="color:${color}">${score}<span style="font-size:20px;color:var(--text3)">/100</span></div>
      <div class="score-ring-desc">${label}</div>
    </div>
    <button class="btn-tool purple" onclick="openSideBySide()" style="flex-shrink:0">
      <i class="fa fa-columns"></i> Side by Side View
    </button>
  `;

  const summaryEl = document.querySelector('.results-summary');
  summaryEl.parentNode.insertBefore(wrap, summaryEl);

  setTimeout(() => {
    const arc = document.getElementById('score-arc');
    if(arc) arc.style.strokeDashoffset = offset;
  }, 100);
}
  if(results.length === 0){
    body.innerHTML = `<tr><td colspan="4"><div class="empty-state"><i class="fa fa-check-circle" style="color:var(--green);opacity:1"></i>No dead code found. Your code is clean!</div></td></tr>`;
    return;
  }

  body.innerHTML = results.map((r, i) => {
    const badgeClass = r.type === 'Unused Function' ? 'badge-func' : r.type === 'Unused Variable' ? 'badge-var' : 'badge-import';
    const icon = r.type === 'Unused Function' ? 'fa-code' : r.type === 'Unused Variable' ? 'fa-subscript' : 'fa-box-open';
    return `<tr style="animation: slide-in 0.3s ${i*0.06}s ease both; opacity:0">
      <td><span class="result-type-badge ${badgeClass}"><i class="fa ${icon}"></i> ${r.type}</span></td>
      <td><span class="result-name">${escHtml(r.name)}</span></td>
      <td><span class="result-msg">${escHtml(r.message)}</span></td>
      <td><button class="btn-explain" onclick="showAI(${i})"><i class="fa fa-wand-magic-sparkles"></i> Explain</button></td>
    </tr>`;
  }).join('');
}

function animCount(id, target){
  const el = document.getElementById(id);
  let current = 0;
  const inc = Math.ceil(target / 20);
  const timer = setInterval(() => {
    current = Math.min(current + inc, target);
    el.textContent = current;
    if(current >= target) clearInterval(timer);
  }, 40);
}

// ─────────────────────────────────────────────
// AI EXPLANATION
// ─────────────────────────────────────────────
function showAI(idx){
  const item = currentResults[idx];
  if(!item) return;
  document.getElementById('ai-item-name').textContent = item.name;
  const badgeClass = item.type === 'Unused Function' ? 'badge-func' : item.type === 'Unused Variable' ? 'badge-var' : 'badge-import';
  document.getElementById('ai-item-badge').innerHTML = `<span class="result-type-badge ${badgeClass}">${item.type}</span>`;

  const cards = document.getElementById('ai-cards');
  cards.innerHTML = `<div class="ai-loading"><div class="loader-ring" style="margin:0 auto 20px;width:60px;height:60px;"></div><p>Generating AI Explanation…</p></div>`;
  navigate('ai');

  // Simulate API or call real backend
  fetch('/explain', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify(item)
}).then(r => r.json()).then(data => {
  cards.innerHTML = `<div class="ai-card"><div class="ai-card-label context"><i class="fa fa-brain"></i> AI Explanation</div><div class="ai-card-text" style="white-space:pre-wrap">${escHtml(data.explanation)}</div></div>`;
}).catch(() => renderAICards(item));
}

function renderAICards(item){
  const cards = document.getElementById('ai-cards');
  const typeContext = {
    'Unused Function': {
      problem: `The function <code>${escHtml(item.name)}</code> is defined in the codebase but is never called or referenced anywhere. This is classified as dead code — it executes no logic at runtime but still consumes memory, increases bundle size, and adds cognitive overhead for future developers.`,
      solution: `Remove the definition of <code>${escHtml(item.name)}</code> entirely from the file. If this function was intended for future use, consider leaving a TODO comment or moving it to a separate "experimental" module. Run a full reference search before deleting to confirm it isn't dynamically invoked.`,
      context: `Dead functions are one of the most common code smells in long-lived projects. They often accumulate during refactoring when a caller is removed but the definition is left behind. Tools like <em>Pylint</em>, <em>ESLint</em>, or AST analysis (as used by RefineX) can automate this detection.`,
      fix: `# Before\ndef ${item.name}():\n    # ... logic ...\n    pass\n\n# After (delete the function)\n# [No definition remains]`
    },
    'Unused Variable': {
      problem: `The variable <code>${escHtml(item.name)}</code> is assigned a value but that value is never read, passed to another function, or returned. This wastes memory and creates confusion — future maintainers may assume it matters when it doesn't.`,
      solution: `Delete the assignment of <code>${escHtml(item.name)}</code> or replace it with a computation that is actually used. If the right-hand side has side effects you need to preserve, assign to <code>_</code> (a convention for intentionally unused values in Python and JavaScript).`,
      context: `Unused variables often appear after copy-paste errors, partial refactoring, or early-stage prototyping. Most linters (ESLint, Pylint, Pyflakes) flag these automatically. In strongly-typed languages (Java, C++), compilers may issue warnings.`,
      fix: `# Before\n${item.name} = compute_something()\n\n# After (if side effects needed)\n_ = compute_something()\n\n# Or just remove the line entirely`
    },
    'Unused Import': {
      problem: `The module or symbol <code>${escHtml(item.name)}</code> is imported at the top of the file but never used in the code body. This increases load time, pollutes the namespace, and signals poor housekeeping to code reviewers.`,
      solution: `Delete the import statement for <code>${escHtml(item.name)}</code>. Use your editor's "Organize Imports" feature or a tool like <em>isort</em> (Python), <em>eslint --fix</em> (JS), or <em>IntelliJ's optimize imports</em> (Java) to clean up automatically.`,
      context: `Unused imports accumulate when code is refactored and the dependent logic is removed. In Python, they also trigger Pylint W0611. In JavaScript/TypeScript with tree-shaking, unused imports can still slow down compilation and confuse developers.`,
      fix: `# Before\nimport ${item.name}\n\n# Somewhere in code...\n# ${item.name} is never used\n\n# After (remove the line)\n# [Import deleted]`
    }
  };
  const t = typeContext[item.type] || typeContext['Unused Variable'];

  cards.innerHTML = `
    <div class="ai-card" style="animation-delay:0s">
      <div class="ai-card-label problem"><i class="fa fa-triangle-exclamation"></i> Why It's a Problem</div>
      <div class="ai-card-text">${t.problem}</div>
    </div>
    <div class="ai-card" style="animation-delay:0.1s">
      <div class="ai-card-label solution"><i class="fa fa-circle-check"></i> How to Fix It</div>
      <div class="ai-card-text">${t.solution}</div>
    </div>
    <div class="ai-card" style="animation-delay:0.2s">
      <div class="ai-card-label context"><i class="fa fa-circle-info"></i> Context & Best Practices</div>
      <div class="ai-card-text">${t.context}</div>
    </div>
    <div class="ai-card" style="animation-delay:0.3s">
      <div class="ai-card-label code"><i class="fa fa-code"></i> Code Example</div>
      <div class="ai-card-text">Here's a before/after showing how to address this issue:</div>
      <div class="ai-code-block">${escHtml(t.fix)}</div>
    </div>
  `;
}

// ─────────────────────────────────────────────
// COPY / PDF
// ─────────────────────────────────────────────
function copyResults(){
  if(!currentResults.length){ showToast('No results to copy', 'fa-triangle-exclamation'); return; }
  const text = currentResults.map(r=>`[${r.type}] ${r.name}: ${r.message}`).join('\n');
  navigator.clipboard.writeText(text).then(()=> showToast('Results copied to clipboard!', 'fa-check-circle'));
}

function downloadPDF(){
  if(!currentResults.length){ showToast('No results to export', 'fa-triangle-exclamation'); return; }
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>RefineX Report</title>
  <style>
    body{font-family:monospace;background:#020408;color:#c8dff0;padding:40px;margin:0}
    h1{color:#40b4ff;font-size:28px;letter-spacing:3px}
    .sub{color:#7a9ab8;margin-bottom:30px;font-size:14px}
    table{width:100%;border-collapse:collapse;margin-top:20px}
    th{background:#1a2332;color:#40b4ff;padding:12px 16px;text-align:left;font-size:12px;letter-spacing:2px}
    td{padding:12px 16px;border-bottom:1px solid #1a2332;font-size:13px;vertical-align:top}
    .type{padding:3px 8px;border-radius:3px;font-size:11px}
    .func{background:rgba(139,92,246,0.2);color:#a78bfa}
    .var{background:rgba(255,126,64,0.2);color:#ff7e40}
    .imp{background:rgba(16,255,160,0.2);color:#10ffa0}
    .footer{margin-top:40px;color:#3d5570;font-size:12px;text-align:center}
  </style></head><body>
  <h1>⬡ REFINEX — Dead Code Report</h1>
  <div class="sub">Generated: ${new Date().toLocaleString()} &nbsp;·&nbsp; ${currentResults.length} issues found</div>
  <table>
    <thead><tr><th>TYPE</th><th>NAME</th><th>DESCRIPTION</th></tr></thead>
    <tbody>
    ${currentResults.map(r=>{
      const cls = r.type.includes('Function')?'func':r.type.includes('Variable')?'var':'imp';
      return `<tr><td><span class="type ${cls}">${r.type}</span></td><td>${r.name}</td><td>${r.message}</td></tr>`;
    }).join('')}
    </tbody>
  </table>
  <div class="footer">RefineX · Dead Code Eliminator · Built with Python + Flask + AST + OpenAI</div>
  </body></html>`;

  const blob = new Blob([html], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'refinex-report.html';
  a.click(); URL.revokeObjectURL(url);
  showToast('Report exported!', 'fa-file-pdf');
}

// ─────────────────────────────────────────────
// LOADER & TOAST
// ─────────────────────────────────────────────
function showLoader(){
  const ol = document.getElementById('loading-overlay');
  ol.classList.add('active');
  const bar = document.getElementById('loader-bar');
  bar.style.animation = 'none';
  bar.offsetHeight; // reflow
  bar.style.animation = 'loader-progress 2.5s ease forwards';
}
function hideLoader(){ document.getElementById('loading-overlay').classList.remove('active'); }

function showToast(msg, icon='fa-check-circle'){
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.querySelector('i').className = `fa ${icon}`;
  t.classList.add('show');
  setTimeout(()=> t.classList.remove('show'), 3500);
}

// ─────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────
function escHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
// ─────────────────────────────────────────────
// SIDE BY SIDE VIEW
// ─────────────────────────────────────────────
function openSideBySide(){
  const deadNames = currentResults.map(r => r.name);
  const origEl = document.getElementById('sbs-original');
  const cleanEl = document.getElementById('sbs-cleaned');

  const origLines = currentOriginalCode.split('\n');
  origEl.innerHTML = origLines.map(line => {
    const isDead = deadNames.some(name =>
      line.includes(name) &&
      (line.trim().startsWith('import') ||
       line.trim().startsWith('def ') ||
       line.trim().match(new RegExp(`^${name}\\s*=`)))
    );
    return isDead
      ? `<span class="sbs-line-dead">${escHtml(line) || ' '}</span>`
      : `<span class="sbs-line-live">${escHtml(line) || ' '}</span>`;
  }).join('');

  const cleanLines = currentCleanedCode.split('\n');
  cleanEl.innerHTML = cleanLines.map(line =>
    `<span class="sbs-line-clean">${escHtml(line) || ' '}</span>`
  ).join('');

  navigate('sidebyside');
}

function downloadCleaned(){
  if(!currentCleanedCode){ showToast('No cleaned code available', 'fa-triangle-exclamation'); return; }
  const blob = new Blob([currentCleanedCode], {type: 'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'cleaned_code.py';
  a.click(); URL.revokeObjectURL(url);
  showToast('Cleaned file downloaded!', 'fa-check-circle');
}

// ─────────────────────────────────────────────
// HISTORY DASHBOARD
// ─────────────────────────────────────────────
let selectedHistoryIds = new Set();

async function loadHistory(){
  try {
    const res = await fetch('/history');
    const data = await res.json();
    const rows = data.history || [];

    document.getElementById('hist-total').textContent = rows.length;
    const avgScore = rows.length ? Math.round(rows.reduce((a,r) => a + r.score, 0) / rows.length) : 0;
    document.getElementById('hist-avg-score').textContent = avgScore;
    const totalIssues = rows.reduce((a,r) => a + r.total_issues, 0);
    document.getElementById('hist-issues').textContent = totalIssues;
    const cleanScans = rows.filter(r => r.total_issues === 0).length;
    document.getElementById('hist-clean').textContent = cleanScans;

    const tbody = document.getElementById('history-body');
    const selectAll = document.getElementById('history-select-all');
    if(!rows.length){
      selectedHistoryIds.clear();
      if(selectAll) selectAll.checked = false;
      tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fa fa-clock"></i>No history yet. Run your first analysis!</div></td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map((r, i) => {
      const scoreClass = r.score >= 80 ? 'high' : r.score >= 50 ? 'mid' : 'low';
      const checked = selectedHistoryIds.has(r.id) ? 'checked' : '';
      return `<tr style="animation: slide-in 0.3s ${i*0.05}s ease both; opacity:0">
        <td><input class="history-row-checkbox" type="checkbox" data-id="${r.id}" onchange="onHistoryCheckboxChange(event, ${r.id})" ${checked}></td>
        <td><span class="result-name">${escHtml(r.filename)}</span></td>
        <td><span class="score-badge ${scoreClass}">${r.score}</span></td>
        <td><span style="color:var(--orange)">${r.total_issues} issue${r.total_issues!==1?'s':''}</span></td>
        <td><span style="font-family:var(--font-mono);font-size:12px;color:var(--text2)">${escHtml(r.language)}</span></td>
        <td><span style="font-family:var(--font-mono);font-size:12px;color:var(--text3)">${escHtml(r.created_at)}</span></td>
      </tr>`;
    }).join('');

    if(selectAll) {
      const all = rows.length;
      const checked = rows.filter(r=>selectedHistoryIds.has(r.id)).length;
      selectAll.checked = all > 0 && checked === all;
    }
  } catch(e){
    showToast('Could not load history', 'fa-circle-xmark');
  }
}

function onHistoryCheckboxChange(event, id){
  const checked = event.target.checked;
  if(checked) selectedHistoryIds.add(id);
  else selectedHistoryIds.delete(id);

  const checkboxes = document.querySelectorAll('.history-row-checkbox');
  const allChecked = checkboxes.length > 0 && [...checkboxes].every(cb => cb.checked);
  const selectAll = document.getElementById('history-select-all');
  if(selectAll) selectAll.checked = allChecked;
}

function toggleAllHistorySelection(checked){
  selectedHistoryIds.clear();
  document.querySelectorAll('.history-row-checkbox').forEach(cb => {
    cb.checked = checked;
    if(checked) selectedHistoryIds.add(Number(cb.dataset.id));
  });
}

async function deleteSelectedHistory(){
  if(!selectedHistoryIds.size){
    showToast('Select at least one history item.', 'fa-triangle-exclamation');
    return;
  }

  if(!confirm(`Delete ${selectedHistoryIds.size} selected history item${selectedHistoryIds.size!==1?'s':''}? This cannot be undone.`)){
    return;
  }

  try {
    const res = await fetch('/history/delete', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ids: [...selectedHistoryIds]})
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.error || 'Delete failed');

    selectedHistoryIds.clear();
    const selectAll = document.getElementById('history-select-all');
    if(selectAll) selectAll.checked = false;
    showToast(`${data.deleted || 0} history item${(data.deleted||0)!==1?'s':''} deleted`, 'fa-check-circle');
    loadHistory();
  } catch(e){
    showToast(e.message, 'fa-circle-xmark');
  }
}

// Init line numbers
updateLineNumbers(document.getElementById('code-input'));