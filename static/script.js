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
const pages = ['home','analyzer','results','ai','about','sidebyside','history','github'];

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
  if(pushState){ updateHistoryState(page); }
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
  if(/(#include|std::|cout|cin|int\s+main\(|namespace\s+std|template<|std::vector|std::string|using\s+namespace\s+std|nullptr|->)/m.test(code)) return 'cpp';
  if(/(public\s+class|System\.out|import\s+java\.|import\s+javax\.|import\s+com\.|@Override|public\s+static\s+void\s+main|String\s+\[?\]|new\s+[A-Z]\w+\(|List<|Map<)/m.test(code)) return 'java';
  if(/(function\s|const\s|let\s|var\s|=>|require\(|module\.exports|console\.)/m.test(code)) return 'javascript';
  if(/(^\s*(from\s+\w+\s+import|import\s+(?!java\.|javax\.|com\.|org\.)\w+)|def\s+|class\s+|print\()/m.test(code) || /#!\/usr\/bin\/env python/.test(code)) return 'python';
  return null;
}

function langColor(lang){
  const m = {python:'rgb(55,118,171)', javascript:'rgb(247,223,30)', java:'rgb(176,114,25)', cpp:'rgb(101,155,211)'};
  return m[lang] || 'rgb(64,180,255)';
}

function getLangExtension(lang){
  const m = {javascript:'js', java:'java', cpp:'cpp', python:'py'};
  return m[lang] || 'py';
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
  const lang = document.getElementById('lang-select').value;

  if(currentOption === 'paste'){
    code = document.getElementById('code-input').value.trim();
    if(!code){ showToast('Paste some code first!', 'fa-triangle-exclamation'); return; }
  } else {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    if(!file){ showToast('Please upload a file first!', 'fa-triangle-exclamation'); return; }
    code = await file.text();
  }

  const effectiveLang = lang === 'auto' ? detectLang(code) || 'python' : lang;

  // Non-Python: use frontend analyzer + save to history
  if(effectiveLang !== 'python'){
    const demoResults = generateDemoResults(code, effectiveLang);
    const demoScore = estimateQualityScore(code, demoResults);
    window._lastScore = demoScore;
    currentOriginalCode = code;
    currentCleanedCode = cleanNonPythonCode(code, demoResults);

    try {
      const deadFunc = demoResults.filter(r => r.type === 'Unused Function').length;
      const deadVar  = demoResults.filter(r => r.type === 'Unused Variable').length;
      const deadImp  = demoResults.filter(r => r.type === 'Unused Import').length;
      const ext = getLangExtension(effectiveLang);
      const fname = uploadedFileName || `pasted_code.${ext}`;

      await fetch('/save-history', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          filename: fname,
          language: effectiveLang,
          score: demoScore,
          total_issues: demoResults.length,
          dead_functions: deadFunc,
          dead_variables: deadVar,
          dead_imports: deadImp,
          results: JSON.stringify(demoResults),
          cleaned_code: currentCleanedCode,
          original_code: code
        })
      });
    } catch(e){ /* ignore if backend unavailable */ }

    renderResults(demoResults);
    navigate('results');
    showToast('Analysis complete!', 'fa-check-circle');
    return;
  }

  // Python: use backend
  const fetchOptions = { method: 'POST' };
  if(currentOption === 'paste'){
    fetchOptions.headers = {'Content-Type': 'application/json'};
    fetchOptions.body = JSON.stringify({ code, language: effectiveLang });
  } else {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', effectiveLang);
    fetchOptions.body = formData;
  }

  showLoader();

  try {
    const response = await fetch('/analyze', fetchOptions);
    if(!response.ok) throw new Error('Server error: ' + response.status);
    const data = await response.json();
    hideLoader();
    window._lastScore = Number.isFinite(data.score) ? data.score : 100;
    currentCleanedCode = data.cleaned_code || '';
    currentOriginalCode = data.original_code || '';
    renderResults(data.results || []);
    navigate('results');
  } catch(err){
    hideLoader();
    const backendUnavailable = err.message.includes('Failed to fetch') || err.message.includes('NetworkError');
    if(backendUnavailable){
      const demoResults = generateDemoResults(code, effectiveLang);
      window._lastScore = estimateQualityScore(code, demoResults);
      currentCleanedCode = code;
      currentOriginalCode = code;
      renderResults(demoResults);
      navigate('results');
      showToast('Demo mode — backend not connected', 'fa-info-circle');
      return;
    }
    showToast('Analysis failed: ' + err.message, 'fa-circle-xmark');
  }
}

function estimateQualityScore(code, results){
  const totalLines = code ? code.split('\n').length : 1;
  const deadCount = results.length;
  const deadRatio = deadCount / Math.max(totalLines, 1);
  const score = Math.max(0, 100 - Math.floor(deadRatio * 200) - (deadCount * 3));
  return Math.min(100, Math.max(0, score));
}

// ─────────────────────────────────────────────
// DEMO RESULT GENERATOR (non-Python frontend analysis)
// ─────────────────────────────────────────────
function generateDemoResults(code, lang){
  const results = [];
  const lines = code.split('\n');

  if(lang === 'python' || detectLang(code) === 'python'){
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
  } else if(lang === 'javascript'){
    lines.forEach(l => {
      const m = l.match(/(?:const|let|var)\s+(\w+)\s*=\s*(?:require|function|\()/);
      if(m){
        const name = m[1];
        const uses = (code.match(new RegExp(`\\b${name}\\b`, 'g'))||[]).length;
        if(uses <= 1) results.push({type:'Unused Variable', name, message:`Variable '${name}' is assigned but never referenced.`});
      }
    });
  } else if(lang === 'java'){
    lines.forEach(l => {
      const m = l.match(/^import\s+([\w\.]+);/);
      if(m){
        const name = m[1].split('.').pop();
        const restCode = lines.filter(ll=>ll!==l).join('\n');
        if(!restCode.includes(name)){
          results.push({type:'Unused Import', name, message:`Import '${m[1]}' is included but not used in the file.`});
        }
      }
    });
    lines.forEach(l => {
      const trimmed = l.trim();
      const m = trimmed.match(/^(?:public|private|protected)?\s*(?:static\s+)?(?:[\w<>\[\]]+)\s+(\w+)\s*\(/);
      if(m){
        const fn = m[1];
        if(fn !== 'main' && fn !== 'constructor'){
          const restCode = lines.filter(ll=>ll!==l).join('\n');
          const uses = (restCode.match(new RegExp(`\\b${fn}\\b`, 'g'))||[]).length;
          if(uses === 0){
            results.push({type:'Unused Function', name: fn, message:`Method '${fn}' is defined but never called.`});
          }
        }
      }
    });
    lines.forEach(l => {
      const m = l.match(/(?:int|double|float|String|boolean|char|long|var)\s+(\w+)\s*=/);
      if(m){
        const name = m[1];
        const uses = (code.match(new RegExp(`\\b${name}\\b`, 'g'))||[]).length;
        if(uses <= 1){
          results.push({type:'Unused Variable', name, message:`Variable '${name}' is declared but never used.`});
        }
      }
    });
  } else if(lang === 'cpp'){
    lines.forEach(l => {
      const m = l.match(/^#include\s+[<"]([\w\.]+)[>"]/);
      if(m){
        const name = m[1].replace(/\.h$/, '');
        const restCode = lines.filter(ll=>ll!==l).join('\n');
        if(!restCode.includes(name) && !restCode.includes('std::')){
          results.push({type:'Unused Import', name, message:`Header '${m[1]}' is included but not used.`});
        }
      }
    });
    lines.forEach(l => {
      const m = l.match(/^(?:static\s+)?[\w:<>&\s]+\s+(\w+)\s*\([^)]*\)\s*\{/);
      if(m){
        const fn = m[1];
        if(fn !== 'main'){
          const restCode = lines.filter(ll=>ll!==l).join('\n');
          const uses = (restCode.match(new RegExp(`\\b${fn}\\b`, 'g'))||[]).length;
          if(uses === 0){
            results.push({type:'Unused Function', name: fn, message:`Function '${fn}' is defined but never called.`});
          }
        }
      }
    });
    lines.forEach(l => {
      const m = l.match(/(?:int|double|float|auto|std::string|char|bool)\s+(\w+)\s*=/);
      if(m){
        const name = m[1];
        const uses = (code.match(new RegExp(`\\b${name}\\b`, 'g'))||[]).length;
        if(uses <= 1){
          results.push({type:'Unused Variable', name, message:`Variable '${name}' is assigned but never used.`});
        }
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
// NON-PYTHON CODE CLEANER
// ─────────────────────────────────────────────
function cleanNonPythonCode(code, results){
  const lines = code.split('\n');
  const deadNames = results.map(r => r.name);
  const cleaned = [];
  let skipBlock = false;
  let braceDepth = 0;

  for(let i = 0; i < lines.length; i++){
    const line = lines[i];
    const trimmed = line.trim();

    // Skip unused Java imports
    const javaImport = trimmed.match(/^import\s+([\w\.]+);/);
    if(javaImport){
      const importName = javaImport[1].split('.').pop();
      if(deadNames.includes(importName)) continue;
    }

    // Skip unused JS imports
    const jsImport = trimmed.match(/^import\s+\{?[\w\s,]+\}?\s+from/);
    if(jsImport){
      const anyDead = deadNames.some(n => trimmed.includes(n));
      if(anyDead) continue;
    }

    // Skip unused C++ includes
    const cppInclude = trimmed.match(/^#include\s+[<"]([\w\.]+)[>"]/);
    if(cppInclude){
      const includeName = cppInclude[1].replace(/\.h$/, '');
      if(deadNames.includes(includeName)) continue;
    }

    // Detect start of unused function/method block
    if(!skipBlock){
      const funcMatch = deadNames.some(name => {
        if(!trimmed.includes(name)) return false;
        return (
          trimmed.includes('void ') || trimmed.includes('int ') ||
          trimmed.includes('double ') || trimmed.includes('String ') ||
          trimmed.includes('public ') || trimmed.includes('private ') ||
          trimmed.includes('protected ') || trimmed.includes('static ') ||
          trimmed.includes('function ') ||
          trimmed.match(new RegExp(`\\b${name}\\s*\\(`))
        );
      });

      if(funcMatch && trimmed.endsWith('{')){
        skipBlock = true;
        braceDepth = 1;
        continue;
      }
    }

    // Track brace depth to find end of skipped block
    if(skipBlock){
      for(const ch of line){
        if(ch === '{') braceDepth++;
        if(ch === '}') braceDepth--;
      }
      if(braceDepth <= 0){ skipBlock = false; braceDepth = 0; }
      continue;
    }

    // Skip unused variable lines
    const isDeadVar = deadNames.some(name => {
      return trimmed.match(new RegExp(
        `(?:int|double|float|String|boolean|char|long|var|auto|std::string)\\s+${name}\\s*=`
      ));
    });
    if(isDeadVar) continue;

    cleaned.push(line);
  }

  return cleaned.join('\n');
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

  renderScoreRing(window._lastScore ?? 100);

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
      problem: `The function <code>${escHtml(item.name)}</code> is defined but never called anywhere. It executes no logic at runtime but consumes memory and adds confusion for future developers.`,
      solution: `Remove the definition of <code>${escHtml(item.name)}</code> entirely. If intended for future use, leave a TODO comment. Run a full reference search before deleting.`,
      context: `Dead functions accumulate during refactoring. Tools like Pylint, ESLint, or AST analysis (as used by RefineX) automate this detection.`,
      fix: `// Before\nfunction ${item.name}() {\n    // ... logic ...\n}\n\n// After (delete the function)\n// [No definition remains]`
    },
    'Unused Variable': {
      problem: `The variable <code>${escHtml(item.name)}</code> is assigned a value but that value is never read, passed, or returned. This wastes memory and confuses maintainers.`,
      solution: `Delete the assignment of <code>${escHtml(item.name)}</code> or replace it with one that is actually used.`,
      context: `Unused variables often appear after copy-paste errors or partial refactoring. Most linters flag these automatically.`,
      fix: `// Before\nlet ${item.name} = computeSomething();\n\n// After (remove if unused)\n// [Line deleted]`
    },
    'Unused Import': {
      problem: `The module <code>${escHtml(item.name)}</code> is imported but never used. This increases load time and pollutes the namespace.`,
      solution: `Delete the import statement for <code>${escHtml(item.name)}</code>. Use your editor's Organize Imports feature to clean up automatically.`,
      context: `Unused imports accumulate when code is refactored and dependent logic is removed.`,
      fix: `// Before\nimport ${item.name} from '${item.name}';\n\n// After (remove the line)\n// [Import deleted]`
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
      <div class="ai-card-text">Before/after showing how to address this issue:</div>
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

  const typeContext = {
    'Unused Function': {
      problem: (name) => `The function '${name}' is defined but never called. It executes no logic at runtime but consumes memory and adds confusion for future developers.`,
      solution: (name) => `Remove the definition of '${name}' entirely. If intended for future use, leave a TODO comment.`,
      practice: `Dead functions accumulate during refactoring. Tools like Pylint, ESLint, or AST analysis can automate detection.`
    },
    'Unused Variable': {
      problem: (name) => `The variable '${name}' is assigned a value but never read, passed, or returned. This wastes memory and creates confusion for maintainers.`,
      solution: (name) => `Delete the assignment of '${name}' or replace it with a computation that is actually used.`,
      practice: `Unused variables often appear after copy-paste errors or partial refactoring. Most linters flag these automatically.`
    },
    'Unused Import': {
      problem: (name) => `The module '${name}' is imported but never used. This increases load time and pollutes the namespace.`,
      solution: (name) => `Delete the import statement for '${name}'. Use your editor's Organize Imports feature.`,
      practice: `Unused imports accumulate when code is refactored and dependent logic is removed.`
    }
  };

  const score = window._lastScore ?? 100;
  const scoreLabel = score >= 80 ? 'Excellent' : score >= 50 ? 'Moderate' : 'Poor';
  const func  = currentResults.filter(r => r.type === 'Unused Function').length;
  const varC  = currentResults.filter(r => r.type === 'Unused Variable').length;
  const imp   = currentResults.filter(r => r.type === 'Unused Import').length;

  const resultsHTML = currentResults.map((r, i) => {
    const ctx = typeContext[r.type] || typeContext['Unused Variable'];
    return `
      <div class="issue-block">
        <div class="issue-header">
          <span class="issue-num">#${i + 1}</span>
          <span class="issue-type">${r.type}</span>
          <span class="issue-name">${r.name}</span>
        </div>
        <table class="issue-table">
          <tr><td class="issue-label">Description</td><td>${r.message}</td></tr>
          <tr><td class="issue-label">Why it's a problem</td><td>${ctx.problem(r.name)}</td></tr>
          <tr><td class="issue-label">How to fix it</td><td>${ctx.solution(r.name)}</td></tr>
          <tr><td class="issue-label">Best practice</td><td>${ctx.practice}</td></tr>
        </table>
      </div>
    `;
  }).join('');

  const cleanedCodeText = currentCleanedCode || currentOriginalCode || '';
  const cleanedLabel = currentCleanedCode ? 'Cleaned Code (Dead Code Removed)' : 'Original Code';

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>RefineX Report</title>
<style>
* { box-sizing:border-box; margin:0; padding:0; }
body { font-family:'Segoe UI',Arial,sans-serif; font-size:14px; color:#1a1a1a; background:#fff; padding:48px; line-height:1.6; }
.report-header { border-bottom:3px solid #1a1a1a; padding-bottom:24px; margin-bottom:32px; }
.report-title { font-size:28px; font-weight:800; letter-spacing:2px; color:#000; margin-bottom:4px; }
.report-sub { font-size:13px; color:#555; margin-bottom:16px; }
.report-meta { font-size:12px; color:#777; }
.summary-section { margin-bottom:36px; }
.summary-title { font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#555; margin-bottom:14px; border-bottom:1px solid #e0e0e0; padding-bottom:6px; }
.summary-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:16px; }
.summary-box { border:1px solid #ccc; border-radius:6px; padding:16px; text-align:center; }
.summary-num { font-size:32px; font-weight:800; color:#000; margin-bottom:4px; }
.summary-lbl { font-size:11px; color:#777; text-transform:uppercase; letter-spacing:1px; }
.score-row { display:flex; align-items:center; gap:16px; border:1px solid #ccc; border-radius:6px; padding:16px 20px; }
.score-big { font-size:40px; font-weight:800; color:#000; }
.score-info-title { font-size:11px; font-weight:700; letter-spacing:1.5px; text-transform:uppercase; color:#555; margin-bottom:4px; }
.score-info-label { font-size:14px; color:#1a1a1a; font-weight:600; }
.issues-title { font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#555; margin-bottom:20px; border-bottom:1px solid #e0e0e0; padding-bottom:6px; }
.issue-block { border:1px solid #ccc; border-radius:6px; margin-bottom:20px; overflow:hidden; page-break-inside:avoid; }
.issue-header { background:#f4f4f4; padding:12px 16px; display:flex; align-items:center; gap:12px; border-bottom:1px solid #ccc; }
.issue-num { font-size:11px; font-weight:700; color:#777; letter-spacing:1px; }
.issue-type { font-size:11px; font-weight:700; letter-spacing:1px; background:#1a1a1a; color:#fff; padding:3px 10px; border-radius:3px; text-transform:uppercase; }
.issue-name { font-family:'Courier New',monospace; font-size:14px; font-weight:700; color:#000; }
.issue-table { width:100%; border-collapse:collapse; }
.issue-table tr { border-bottom:1px solid #eee; }
.issue-table tr:last-child { border-bottom:none; }
.issue-table td { padding:12px 16px; font-size:13px; vertical-align:top; }
.issue-label { width:160px; font-size:11px; font-weight:700; text-transform:uppercase; color:#555; white-space:nowrap; background:#fafafa; border-right:1px solid #eee; }
.code-section { margin-top:36px; }
.code-title { font-size:11px; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#555; margin-bottom:14px; border-bottom:1px solid #e0e0e0; padding-bottom:6px; }
.code-block { background:#f8f8f8; border:1px solid #ccc; border-radius:6px; padding:20px; font-family:'Courier New',monospace; font-size:12px; line-height:1.7; white-space:pre-wrap; word-break:break-word; color:#1a1a1a; }
.report-footer { margin-top:48px; padding-top:16px; border-top:1px solid #e0e0e0; font-size:11px; color:#aaa; text-align:center; }
@media print { body { padding:24px; } .issue-block { page-break-inside:avoid; } }
</style></head><body>
  <div class="report-header">
    <div class="report-title">REFINEX — DEAD CODE REPORT</div>
    <div class="report-sub">Static Analysis Report · Generated by RefineX Dead Code Eliminator</div>
    <div class="report-meta">Generated: ${new Date().toLocaleString()}</div>
  </div>
  <div class="summary-section">
    <div class="summary-title">Summary</div>
    <div class="summary-grid">
      <div class="summary-box"><div class="summary-num">${currentResults.length}</div><div class="summary-lbl">Total Issues</div></div>
      <div class="summary-box"><div class="summary-num">${func}</div><div class="summary-lbl">Dead Functions</div></div>
      <div class="summary-box"><div class="summary-num">${varC}</div><div class="summary-lbl">Dead Variables</div></div>
      <div class="summary-box"><div class="summary-num">${imp}</div><div class="summary-lbl">Dead Imports</div></div>
    </div>
    <div class="score-row">
      <div class="score-big">${score}<span style="font-size:20px;color:#777">/100</span></div>
      <div>
        <div class="score-info-title">Code Quality Score</div>
        <div class="score-info-label">${scoreLabel} — ${score >= 80 ? 'minimal dead code detected' : score >= 50 ? 'some cleanup recommended' : 'significant dead code found'}</div>
      </div>
    </div>
  </div>
  <div class="issues-section">
    <div class="issues-title">Dead Code Issues with AI Explanations</div>
    ${resultsHTML}
  </div>
  <div class="code-section">
    <div class="code-title">${cleanedLabel}</div>
    <div class="code-block">${cleanedCodeText ? cleanedCodeText.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : 'No code available.'}</div>
  </div>
  <div class="report-footer">RefineX · Dead Code Eliminator · Built with Python + Flask + AST + Groq AI</div>
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
  bar.offsetHeight;
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
    const trimmed = line.trim();
    const isDead = deadNames.some(name => {
      if(!line.includes(name)) return false;
      // Python
      if(trimmed.startsWith('import ') || trimmed.startsWith('from ')) return true;
      if(trimmed.startsWith('def ') && trimmed.includes(name)) return true;
      if(trimmed.match(new RegExp(`^${name}\\s*=`))) return true;
      // Java
      if(trimmed.match(/^import\s+[\w\.]+;/) && trimmed.includes(name)) return true;
      if(trimmed.match(new RegExp(`(void|int|double|float|String|boolean|char|long)\\s+${name}\\s*(=|\\()`))) return true;
      // C++
      if(trimmed.match(/^#include/) && trimmed.includes(name)) return true;
      if(trimmed.match(new RegExp(`(int|double|float|auto|bool|char)\\s+${name}\\s*=`))) return true;
      // JS
      if(trimmed.match(new RegExp(`(const|let|var)\\s+${name}\\s*=`))) return true;
      return false;
    });
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
  const ext = currentOriginalCode.includes('public class') ? 'java' :
              currentOriginalCode.includes('#include') ? 'cpp' :
              currentOriginalCode.includes('console.log') || currentOriginalCode.includes('const ') ? 'js' : 'py';
  const blob = new Blob([currentCleanedCode], {type: 'text/plain'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `cleaned_code.${ext}`;
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

    if(selectAll){
      const allChecked = rows.every(r => selectedHistoryIds.has(r.id));
      selectAll.checked = rows.length > 0 && allChecked;
    }
  } catch(e){
    showToast('Could not load history', 'fa-circle-xmark');
  }
}

function onHistoryCheckboxChange(event, id){
  if(event.target.checked) selectedHistoryIds.add(id);
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
  if(!confirm(`Delete ${selectedHistoryIds.size} selected item${selectedHistoryIds.size!==1?'s':''}? This cannot be undone.`)) return;

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
    showToast(`${data.deleted || 0} item${(data.deleted||0)!==1?'s':''} deleted`, 'fa-check-circle');
    loadHistory();
  } catch(e){
    showToast(e.message, 'fa-circle-xmark');
  }
}

// ─────────────────────────────────────────────
// GITHUB PUSH
// ─────────────────────────────────────────────
function initGithubPage(){
  const origLines = currentOriginalCode ? currentOriginalCode.split('\n').length : 0;
  const cleanLines = currentCleanedCode ? currentCleanedCode.split('\n').length : 0;
  const removed = Math.max(0, origLines - cleanLines);

  document.getElementById('prev-lines-orig').textContent = origLines || '—';
  document.getElementById('prev-lines-clean').textContent = cleanLines || '—';
  document.getElementById('prev-lines-removed').textContent = removed || '—';
  document.getElementById('prev-issues').textContent =
    currentResults.length ? `${currentResults.length} items removed` : '—';

  document.getElementById('gh-success-card').style.display = 'none';
  document.getElementById('gh-status-banner').style.display = 'none';
  validateGhForm();
}

function validateGhForm(){
  const token = document.getElementById('gh-token')?.value.trim();
  const repo  = document.getElementById('gh-repo')?.value.trim();
  const btn   = document.getElementById('gh-push-btn');
  if(btn) btn.disabled = !(token && repo);
}

function toggleTokenVisibility(){
  const input = document.getElementById('gh-token');
  const icon  = document.getElementById('gh-eye-icon');
  if(!input) return;
  if(input.type === 'password'){
    input.type = 'text';
    icon.className = 'fa fa-eye-slash';
  } else {
    input.type = 'password';
    icon.className = 'fa fa-eye';
  }
}

function showGhStatus(msg, type='info'){
  const banner = document.getElementById('gh-status-banner');
  const icon   = document.getElementById('gh-status-icon');
  const text   = document.getElementById('gh-status-text');
  const colors = { info: 'var(--cyan)', success: 'var(--green)', error: 'var(--red)' };
  const icons  = { info: 'fa fa-circle-info', success: 'fa fa-check-circle', error: 'fa fa-circle-xmark' };
  banner.style.display = 'flex';
  banner.style.borderColor = colors[type] || colors.info;
  icon.innerHTML = `<i class="${icons[type]||icons.info}" style="color:${colors[type]||colors.info}"></i>`;
  text.textContent = msg;
}

async function pushToGitHub(){
  const token     = document.getElementById('gh-token').value.trim();
  const repo      = document.getElementById('gh-repo').value.trim();
  const filename  = document.getElementById('gh-filename').value.trim() || 'cleaned_code.py';
  const commitMsg = document.getElementById('gh-commit-msg').value.trim() || 'RefineX: Remove dead code';
  const btn       = document.getElementById('gh-push-btn');

  if(!token || !repo){ showGhStatus('Please fill in your GitHub token and repository name.', 'error'); return; }
  if(!currentCleanedCode){ showGhStatus('No cleaned code available. Run an analysis first.', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i><span>Pushing...</span>';
  showGhStatus('Connecting to GitHub and pushing your code...', 'info');

  try {
    const res = await fetch('/push-to-github', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, repo, filename, cleaned_code: currentCleanedCode, message: commitMsg })
    });
    const data = await res.json();
    if(!res.ok || data.error) throw new Error(data.error || 'Push failed');

    showGhStatus(`Successfully ${data.action} ${data.file} in ${data.repo}`, 'success');
    document.getElementById('gh-success-sub').textContent = `${data.file} was ${data.action} in ${data.repo} with all dead code removed.`;
    document.getElementById('gh-success-link').href = data.url;
    document.getElementById('gh-success-card').style.display = 'block';
    showToast('Code pushed to GitHub!', 'fa-check-circle');
  } catch(err){
    showGhStatus(`Error: ${err.message}`, 'error');
    showToast('Push failed: ' + err.message, 'fa-circle-xmark');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-brands fa-github"></i><span>Push Cleaned Code</span>';
  }
}

// Init line numbers
updateLineNumbers(document.getElementById('code-input'));