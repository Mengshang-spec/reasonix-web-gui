/* ================================================================
   Reasonix Web App — Faithful replica of real Reasonix Desktop
   Based on App.tsx, ToolCard.tsx, Message.tsx, StatusBar.tsx
   ================================================================ */
(function() {
"use strict";

// ===== API CONFIG =====
// Key is stored in browser localStorage via Settings page.
// No key is embedded in source — user must configure it on first use.
var AppConfig = {
  DEEPSEEK_API_KEY: ''  // populated from localStorage at boot
};

// ===== LOAD SAVED KEY =====
function loadApiKey() {
  var saved = localStorage.getItem('reasonix_api_key');
  if (saved) {
    AppConfig.DEEPSEEK_API_KEY = saved;
    return true;
  }
  return false;
}

// ===== STATE =====
var state = {
  page: 'chat',
  session: 'current',
  mode: 'auto',       // auto | plan | yolo
  dockOpen: true,
  dockTab: 'context',
  paletteOpen: false,
  turnCount: 5,
  sessionCounter: 5   // for generating unique session IDs
};

// ===== SESSION ORDER (for sidebar display) =====
var sessionOrder = ['current', 'api', 'auth', 'test'];

// ===== CREATE SESSION =====
function createSession(name) {
  state.sessionCounter++;
  var id = 'session-' + state.sessionCounter;
  var label = name || ('New session ' + state.sessionCounter);
  sessions[id] = [
    { role:'system', text:'Session started — Reasonix v4.2.1 · deepseek-v4-flash · ' + label }
  ];
  sessionLabels[id] = label;
  sessionIcons[id] = '💬';
  sessionOrder.unshift(id);
  state.session = id;
  rebuildSidebar();
  navigate('chat', id);
  return id;
}

// ===== DELETE SESSION =====
function deleteSession(id) {
  if (sessionOrder.length <= 1) return;
  delete sessions[id];
  sessionOrder = sessionOrder.filter(function(s) { return s !== id; });
  if (state.session === id) {
    state.session = sessionOrder[0];
  }
  rebuildSidebar();
  navigate('chat', state.session);
}

// ===== SESSION DATA =====
var sessions = {};
sessions['current'] = [
  { role:'system', text:'Session started — Reasonix v4.2.1 · deepseek-v4-flash · Graphite' },
  { role:'user', text:'帮我分析这个项目的架构' },
  { role:'agent', text:'探索项目架构...\n\n核心模块:\n\n- **internal/control** — 传输无关内核控制器，TUI/HTTP/Wails 三前端共用\n- **internal/codegraph** — 代码智能索引，支持符号搜索、调用链追踪\n- **internal/skill** — Skill 系统，支持 **inline** / **subagent** 两种运行模式\n- **internal/agent** — Agent 循环引擎，DeepSeek prefix-cache 优化\n- **desktop/** — Wails 桌面端 (Go + React/TS + WebView)', tools:[
    { name:'codegraph__context', status:'ok', output:'Found 15 symbols across 8 files.\nEntry point: control.Controller\nRelated: boot.Build, event.Sink, skill.Store, agent.Loop' },
    { name:'bash', status:'ok', output:'$ ls internal/\nacp/  agent/  boot/  codegraph/  control/\nskill/  tool/  memory/  checkpoint/\n$ wc -l internal/**/*.go\n  12417 total' }
  ]},
  { role:'user', text:'能用 codegraph 追踪调用链吗？' },
  { role:'agent', text:'`codegraph__trace` 可以追踪任意两个符号之间的完整调用路径。\n\n追踪 **main → add**:', tools:[
    { name:'codegraph__trace', status:'ok', output:'Trace: main → add\n────────────────────\n1. main (line 11)\n   result = calculate_sum(3, 4)\n   │\n2. calculate_sum (line 1)\n   return add(a, b)\n   │\n3. add (line 6)\n   return x + y\n\n3 hops. Full path resolved.' }
  ]},
  { role:'agent', text:'调用链路追踪完毕。**3 跳**从 `main()` 到 `add()`。\n\n需要进一步查看某个符号的详情吗？' }
];

sessions['api'] = [
  { role:'system', text:'Session: API refactor · deepseek-v4-flash' },
  { role:'user', text:'Refactor the user API to use the new validation middleware' },
  { role:'agent', text:'分析 `internal/api/user.go`。当前验证逻辑分散在 3 个 handler 中。可以提取到共享中间件 `internal/middleware/validation.go`，减少 ~120 行重复代码。', tools:[
    { name:'read_file', status:'ok', output:'// internal/api/user.go\nfunc (h *UserHandler) CreateUser(w, r) {\n  // 45 lines of inline validation...\n  if err := validateEmail(req.Email); err != nil { ... }\n  if err := validatePassword(req.Password); err != nil { ... }\n}' },
    { name:'write_file', status:'ok', output:'Created: internal/middleware/validation.go\n+ ValidateUserInput middleware\n+ Email, Password, Username validators\n+ 85 lines' }
  ]},
  { role:'agent', text:'重构完成。`ValidateUserInput` 中间件提取了共享验证逻辑，3 个 handler 各自减少 ~40 行。测试通过 ✓' }
];

sessions['auth'] = [
  { role:'system', text:'Session: Fix auth bug · deepseek-v4-pro' },
  { role:'user', text:'JWT token 刷新失败，返回 401' },
  { role:'agent', text:'定位到 `internal/auth/refresh.go:42`。`expiresAt` 比较使用 `time.Now()` 而非 `time.Now().UTC()`，导致时区不一致。', tools:[
    { name:'codegraph__search', status:'ok', output:'Symbol: refreshToken\nLocation: internal/auth/refresh.go:42\nCallers: AuthMiddleware, LoginHandler' },
    { name:'bash', status:'ok', output:'$ go test ./internal/auth/... -run TestRefresh\n--- FAIL: TestRefresh/expired_token\n    refresh_test.go:67: expected 200, got 401\nFAIL' }
  ]},
  { role:'agent', text:'修复：`time.Now()` → `time.Now().UTC()`。所有测试通过 ✓' }
];

sessions['test'] = [
  { role:'system', text:'Session: Add tests · deepseek-v4-flash' },
  { role:'user', text:'Add unit tests for the skill loader' },
  { role:'agent', text:'为 `internal/skill/skill.go` 添加测试覆盖。测试项目:\n- Skill 解析 (parse)\n- Scope 优先级\n- Frontmatter 解析\n- Subagent 检测', tools:[
    { name:'write_file', status:'ok', output:'Created: internal/skill/skill_test.go\n+ 8 test cases:\n  - parse() with/without frontmatter\n  - runAs detection (inline vs subagent)\n  - name validation\n  - scope priority resolution' },
    { name:'bash', status:'ok', output:'$ go test ./internal/skill/ -v -cover\n=== RUN   TestParse\n--- PASS: TestParse (0.00s)\n...\ncoverage: 78.3% of statements\nok      reasonix/internal/skill  0.123s' }
  ]}
];

// ===== SKILL DATA =====
var skills = [
  { name:'frontend-design', run:'inline', desc:'Create distinctive, production-grade frontend interfaces with high design quality.', body:'# frontend-design\n\nThis skill guides creation of distinctive, production-grade frontend interfaces.\n\n## Design Thinking\nBefore coding, understand the context and commit to a BOLD aesthetic:\n- Purpose: What problem does this interface solve?\n- Tone: Pick an extreme direction\n- Differentiator: What makes this UNFORGETTABLE?\n\n## Implementation\n- Typography: Beautiful, unique fonts — avoid Arial/Inter\n- Color & Theme: CSS variables, committed palette\n- Motion: CSS-only animations, staggered reveals\n- Spatial: Asymmetry, overlap, generous negative space' },
  { name:'explore', run:'subagent', desc:'Explore the codebase in an isolated subagent — wide-net read-only investigation.', body:'# explore (subagent)\n\nRuns in an isolated subagent loop — tool calls and reasoning never enter parent context.\n\n**Allowed tools:** read_file, grep, glob, lsp_*\n\nReturn one distilled answer with file:line citations.' },
  { name:'review', run:'subagent', desc:'Review pending changes (current branch diff) — correctness, security, tests.', body:'# review (subagent)\n\nFlags: correctness, security, missing tests, hidden behavior.\n\nRead-only per file:line. You decide what to act on.' },
  { name:'test', run:'inline', desc:'Run the project test suite, diagnose failures, propose+apply fixes until green.', body:'# test\n\n1. Run tests\n2. Diagnose failures\n3. Apply minimal fix\n4. Re-run\n\nStop after 2 attempts on the same failure — ask the user.' },
  { name:'security-review', run:'subagent', desc:'Security-focused review: injection, authz, secrets, deserialization.', body:'# security-review (subagent)\n\nFlags: injection, authz, secrets, deserialization, path-traversal, crypto.\n\nSeverity-tagged. Read-only.' },
  { name:'systematic-debugging', run:'inline', desc:'Use when encountering any bug, test failure, or unexpected behavior.', body:'# systematic-debugging\n\nBefore proposing fixes:\n1. Reproduce\n2. Isolate root cause\n3. Write failing test\n4. Apply minimal fix\n5. Verify' },
  { name:'brainstorming', run:'inline', desc:'Use before any creative work — features, components, functionality.', body:'# brainstorming\n\nGenerate 3-5 diverse approaches. For each:\n- Pros / cons\n- Complexity\n- Risk\n\nRecommend one with rationale.' },
  { name:'executing-plans', run:'inline', desc:'Execute an approved implementation plan with review checkpoints.', body:'# executing-plans\n\nExecute plan steps in a separate session. Each step requires evidence before advancing.' },
  { name:'requesting-code-review', run:'inline', desc:'Use when completing tasks or before merging to verify work.', body:'# requesting-code-review\n\nPrepare review request with:\n- Summary of changes\n- Key decisions\n- Focus areas' },
  { name:'subagent-driven-development', run:'inline', desc:'Execute implementation plans by dispatching independent tasks to parallel subagents.', body:'# subagent-driven-development\n\nDispatch independent tasks to parallel subagents. Merge results after all complete.' },
  { name:'canvas-design', run:'inline', desc:'Create beautiful visual art in .png and .pdf documents using design philosophy.', body:'# canvas-design\n\nCreate visual art outputting .png or .pdf.\n\nUse p5.js for algorithmic art with seeded randomness.' },
  { name:'doc-coauthoring', run:'inline', desc:'Guide users through a structured workflow for co-authoring documentation.', body:'# doc-coauthoring\n\nStructured workflow:\n1. Outline → 2. Draft → 3. Review → 4. Polish' }
];

// ===== PALETTE COMMANDS =====
var paletteCommands = [
  { icon:'🔍', name:'/review', desc:'Code review current changes', action:function(){ closePalette(); alert('Running code review on current changes...'); }},
  { icon:'🧪', name:'/test', desc:'Run project test suite', action:function(){ closePalette(); alert('Running test suite...'); }},
  { icon:'📝', name:'/init', desc:'Generate AGENTS.md project memory', action:function(){ closePalette(); alert('Generating AGENTS.md...'); }},
  { icon:'↩️', name:'/rewind', desc:'Rewind last turn', action:function(){ closePalette(); alert('Rewinding last turn...'); }},
  { icon:'🩺', name:'/doctor', desc:'System diagnostics check', action:function(){ closePalette(); alert('Running diagnostics...\n\n✓ codegraph daemon: running\n✓ MCP bridges: 3 connected\n✓ Skills: 12 loaded\n✓ Tools: 14 available'); }},
  { icon:'🆕', name:'/skill new', desc:'Create a new skill', action:function(){ closePalette(); navigate('skills'); }},
  { icon:'🧠', name:'/memory', desc:'View and edit project memory', action:function(){ closePalette(); alert('Project Memory (REASONIX.md):\n\n- Hierarchical docs loaded\n- 3 facts in auto-memory store\n- Prefix cache: warm'); }},
  { icon:'⚙️', name:'Settings', desc:'Open settings panel', action:function(){ closePalette(); navigate('settings'); }}
];

// ===== DOM REFS =====
var $ = function(id) { return document.getElementById(id); };
var root = $('root');

// ===== BUILD HTML =====
function buildHTML() {
  var h = '';
  h += '<div id="app">';

  // SIDEBAR
  h += '<aside class="sidebar">';
  h += '<div class="sidebar__head"><div class="sidebar__logo">◆</div><div><div class="sidebar__title">Reasonix</div><div class="sidebar__ver">v4.2.1 · Graphite</div></div></div>';
  h += '<div class="sidebar__sec">';
  h += '<div class="sidebar__label">Navigate</div>';
  h += '<div class="sidebar__item sidebar__item--active" data-nav="chat"><span class="sb-ico">💬</span> Chat</div>';
  h += '<div class="sidebar__item" data-nav="sessions"><span class="sb-ico">📋</span> All Sessions</div>';
  h += '<div class="sidebar__item" data-nav="skills"><span class="sb-ico">🧩</span> Skills<span class="sb-tag">12</span></div>';
  h += '</div>';
  h += '<div class="sidebar__sec">';
  h += '<div class="sidebar__label" style="display:flex;justify-content:space-between;align-items:center">Sessions <span style="cursor:pointer;font-size:14px;color:var(--fg-dim);padding:0 4px;border-radius:4px" onclick="App.createSession()" title="New Session">＋</span></div>';
  h += '<div id="sidebarSessions"></div>';
  h += '</div>';
  h += '<div class="sidebar__spacer"></div>';
  h += '<div class="sidebar__sec"><div class="sidebar__item" data-nav="settings"><span class="sb-ico">⚙️</span> Settings</div></div>';
  h += '</aside>';

  // MAIN
  h += '<div class="main">';
  // Topicbar
  h += '<div class="topicbar">';
  h += '<span class="topicbar__title" id="pageTitle">Chat</span>';
  h += '<span class="topicbar__cwd" id="pageSub"></span>';
  h += '<span class="topicbar__spacer"></span>';
  h += '<button class="topicbar__btn topicbar__btn--new-session" onclick="App.createSession()" title="New Session">＋ New</button>';
  h += '<button class="topicbar__btn" onclick="App.toggleDock()">📊 Context</button>';
  h += '<button class="topicbar__btn topicbar__btn--accent" onclick="App.openPalette()">⌘K</button>';
  h += '</div>';

  // Pages
  h += '<div class="page-container" id="pageContainer">';
  // Chat page
  h += '<div class="page page--active" id="page-chat">';
  h += '<div class="transcript" id="transcript"><div class="transcript__inner" id="transcriptInner"></div></div>';
  h += '<div class="composer-wrap"><div class="composer" id="composer">';
  h += '<div class="composer__row">';
  h += '<span class="mode-chip" id="modeChip" onclick="App.cycleMode()">AUTO</span>';
  h += '<span style="font-size:10px;color:var(--fg-faint)">Tools: all enabled</span>';
  h += '<span class="composer__model"><span class="composer__model-dot"></span> deepseek-v4-flash</span>';
  h += '</div>';
  h += '<textarea class="composer__textarea" id="composerInput" placeholder="Message Reasonix..." rows="2"></textarea>';
  h += '<div class="composer__row">';
  h += '<span class="composer__hint">@file · /command · Esc-Esc rewind</span>';
  h += '<button class="composer__send" id="sendBtn" title="Send (Enter)">↑</button>';
  h += '</div>';
  h += '</div></div>';
  h += '</div>';

  // Sessions page
  h += '<div class="page page--sessions" id="page-sessions">';
  h += '<h2>All Sessions</h2>';
  h += '<div id="sessionsList"></div>';
  h += '</div>';

  // Skills page
  h += '<div class="page page--skills" id="page-skills">';
  h += '<h2>Loaded Skills</h2><p style="color:var(--fg-faint);font-size:12px;margin-bottom:18px">12 skills loaded from project and global scopes</p>';
  h += '<div id="skillsList"></div>';
  h += '</div>';

  // Skill detail page
  h += '<div class="page page--skills" id="page-skill-detail"><div id="skillDetail"></div></div>';

  // Settings page
  h += '<div class="page page--settings" id="page-settings">';
  h += '<h2>Settings</h2>';
  h += '<div class="set-group"><h3>Model</h3>';
  h += '<div class="set-row"><div><div class="lbl">Default Model</div><div class="desc">Provider + model for new sessions</div></div><select><option>deepseek-v4-flash</option><option>deepseek-v4-pro</option><option>mimo-pro</option></select></div>';
  h += '<div class="set-row"><div><div class="lbl">Effort</div><div class="desc">Reasoning depth</div></div><select><option>medium</option><option>low</option><option>high</option></select></div>';
  h += '</div>';
  h += '<div class="set-group"><h3>API</h3>';
  h += '<div class="set-row"><div style="flex:1"><div class="lbl">DeepSeek API Key</div><div class="desc">Stored locally in browser. Get one at platform.deepseek.com</div></div><input type="password" id="apiKeyInput" style="width:260px;font-family:var(--font-mono);font-size:11px" placeholder="sk-..."></div>';
  h += '<div class="set-row"><div><div class="lbl">Save Key</div><div class="desc">Persists in browser localStorage</div></div><button class="topicbar__btn topicbar__btn--accent" onclick="App.saveApiKey()" style="padding:6px 16px">Save</button></div>';
  h += '</div>';
  h += '<div class="set-group"><h3>Interface</h3>';
  h += '<div class="set-row"><div><div class="lbl">Theme</div></div><select><option>Graphite</option><option>Aurora</option><option>Slate</option><option>Carbon</option></select></div>';
  h += '<div class="set-row"><div><div class="lbl">Font Size</div></div><select><option>13px</option><option>14px</option><option>12px</option></select></div>';
  h += '<div class="set-row"><div><div class="lbl">Context Panel</div></div><span class="toggle-sw toggle-sw--on" id="toggleDock" onclick="this.classList.toggle(\'toggle-sw--on\');App.toggleDock()"></span></div>';
  h += '</div>';
  h += '<div class="set-group"><h3>Agent</h3>';
  h += '<div class="set-row"><div><div class="lbl">Approval Mode</div><div class="desc">Tool call approval</div></div><select><option>Auto (default)</option><option>Plan mode</option><option>Manual</option></select></div>';
  h += '<div class="set-row"><div><div class="lbl">Sandbox</div></div><span class="toggle-sw" onclick="this.classList.toggle(\'toggle-sw--on\')"></span></div>';
  h += '<div class="set-row"><div><div class="lbl">Anonymous usage ping</div></div><span class="toggle-sw toggle-sw--on" onclick="this.classList.toggle(\'toggle-sw--on\')"></span></div>';
  h += '</div></div>';
  h += '</div>'; // page-container

  // STATUS BAR
  h += '<div class="statusbar" id="statusbar">';
  h += '<div class="statusbar__group">';
  h += '<span class="stat"><span class="statusbar__dot" id="sysDot"></span> <span class="stat__label">SYS:</span> <b>nominal</b></span>';
  h += '<span class="stat"><span class="stat__label">Context:</span> <b id="ctxVal">2.4k</b>/64k</span>';
  h += '<span class="stat"><span class="stat__label">Turns:</span> <b id="turnVal">5</b></span>';
  h += '</div>';
  h += '<div class="statusbar__group">';
  h += '<span class="stat"><span class="stat__label">Cache:</span> <b style="color:var(--ok)">87%</b></span>';
  h += '<span class="stat"><span class="stat__label">Cost:</span> <b>$0.0023</b></span>';
  h += '</div>';
  h += '<span class="statusbar__spacer"></span>';
  h += '<span class="stat"><b>0xd085-bb5c</b></span>';
  h += '<span class="stat"><b id="clockVal">00:00:00</b></span>';
  h += '</div>';
  h += '</div>'; // main

  // RIGHT DOCK
  h += '<aside class="rightdock" id="rightdock">';
  h += '<div class="rightdock__tabs">';
  h += '<span class="rightdock__tab rightdock__tab--active" data-docktab="context">Context</span>';
  h += '<span class="rightdock__tab" data-docktab="files">Files</span>';
  h += '<span class="rightdock__tab" data-docktab="changes">Changes</span>';
  h += '</div>';
  h += '<div class="rightdock__body">';
  // Context
  h += '<div id="dock-context">';
  h += '<div class="rightdock__sec"><div class="rightdock__sec-title">Token Usage</div><div class="ctx-gauge"><div class="ctx-gauge__fill" id="ctxGauge" style="width:3.8%"></div></div><div class="ctx-stats"><span>System: 1.8k</span><span>Memory: 0.3k</span><span>Chat: 0.3k</span><span>Free: 61.6k</span></div></div>';
  h += '<div class="rightdock__sec"><div class="rightdock__sec-title">Active Tools</div><span class="tool-tag" style="color:var(--ok)">bash ✓</span><span class="tool-tag">read_file</span><span class="tool-tag">edit_file</span><span class="tool-tag">write_file</span><span class="tool-tag" style="color:#c678dd">codegraph</span><span class="tool-tag">grep</span><span class="tool-tag">glob</span><span class="tool-tag">task</span><span class="tool-tag">web_fetch</span></div>';
  h += '<div class="rightdock__sec"><div class="rightdock__sec-title">Session Cost</div><div style="font-size:12px;font-family:var(--font-mono)">Session: <span style="color:var(--fg)">$0.0023</span><br>Last turn: 0.8k tokens · <span style="color:var(--fg-faint)">~$0.0001</span></div></div>';
  h += '</div>';
  // Files
  h += '<div id="dock-files" style="display:none"><div class="rightdock__sec"><div class="rightdock__sec-title">Workspace Files</div><div class="file-row">📄 reasonix-gui.html</div><div class="file-row">📄 reasonix-gui-plan.md</div><div class="file-row">📄 test_graph.py</div><div class="file-row">📜 analyze.ps1</div><div class="file-row">📜 strings.ps1</div></div></div>';
  // Changes
  h += '<div id="dock-changes" style="display:none"><div class="rightdock__sec"><div class="rightdock__sec-title">Modified</div><div class="file-row">M reasonix-gui.html<span class="fr-add">+798</span><span class="fr-del">-0</span></div><div class="file-row">M reasonix-gui-plan.md<span class="fr-add">+145</span></div></div></div>';
  h += '</div></aside>';

  // PALETTE OVERLAY
  h += '<div class="palette-overlay" id="paletteOverlay">';
  h += '<div class="palette"><div class="palette__input"><input type="text" placeholder="Type a command..." id="paletteInput"></div><div class="palette__list" id="paletteList"></div></div>';
  h += '</div>';

  h += '</div>'; // app
  root.innerHTML = h;
}

// ===== RENDER =====
function esc(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function mdToHTML(s) {
  var h = esc(s);
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/`([^`]+)`/g, '<code>$1</code>');
  h = h.replace(/```([\s\S]*?)```/g, function(_, c) {
    return '<pre><code>' + c.trim() + '</code></pre>';
  });
  h = h.replace(/\n\n/g, '</p><p>');
  h = h.replace(/\n/g, '<br>');
  h = '<p>' + h + '</p>';
  h = h.replace(/<p><\/p>/g, '');
  return h;
}

function renderChat() {
  var msgs = sessions[state.session] || sessions['current'];
  var h = '';
  for (var i = 0; i < msgs.length; i++) {
    var m = msgs[i];
    if (m.role === 'system') {
      h += '<div class="msg--system">— ' + esc(m.text) + ' —</div>';
    } else if (m.role === 'user') {
      h += '<div class="msg--user"><div class="msg__body"><div class="msg__text">' + esc(m.text) + '</div></div></div>';
    } else {
      h += '<div class="msg--assistant"><div class="msg__body">' + mdToHTML(m.text) + '</div>';
      if (m.tools) {
        for (var j = 0; j < m.tools.length; j++) {
          var t = m.tools[j];
          var icon = t.name.indexOf('codegraph') === 0 ? '◈' : t.name === 'bash' ? '&gt;' : '✓';
          var statusIcon = t.status === 'ok' ? '<span class="tool__status-icon tool__status-icon--ok">✓</span>' :
                           t.status === 'err' ? '<span class="tool__status-icon tool__status-icon--err">✗</span>' : '';
          h += '<div class="tool">';
          h += '<button class="tool__head" onclick="var b=this.nextElementSibling;b.style.display=b.style.display===\'block\'?\'none\':\'block\';this.querySelector(\'.tool__chevron\').classList.toggle(\'tool__chevron--open\')">';
          h += statusIcon;
          h += '<span class="tool__name">' + esc(t.name) + '</span>';
          h += '<span class="tool__duration">&nbsp;</span>';
          h += '<span class="tool__chevron">▶</span>';
          h += '</button>';
          h += '<div class="tool__body"><div class="code-block">' + esc(t.output) + '</div></div>';
          h += '</div>';
        }
      }
      h += '</div>';
    }
  }
  $('transcriptInner').innerHTML = h;
  var ts = $('transcript');
  ts.scrollTop = ts.scrollHeight;
  state.turnCount = msgs.filter(function(m){ return m.role === 'user'; }).length;
  $('turnVal').textContent = state.turnCount;
}

// ===== REBUILD SIDEBAR SESSIONS =====
var sessionIcons = { 'current':'💬', 'api':'📋', 'auth':'🐛', 'test':'📦' };
var sessionLabels = { 'current':'Current session', 'api':'API refactor', 'auth':'Fix auth bug', 'test':'Add tests' };

function rebuildSidebar() {
  var container = document.getElementById('sidebarSessions');
  if (!container) return;
  var h = '';
  for (var i = 0; i < sessionOrder.length; i++) {
    var id = sessionOrder[i];
    var msgs = sessions[id] || [];
    var turnCount = msgs.filter(function(m){ return m.role === 'user'; }).length;
    var active = (id === state.session) ? ' sidebar__item--active' : '';
    var icon = sessionIcons[id] || '💬';
    var label = sessionLabels[id] || (id.replace('session-', 'New session '));
    var tag = turnCount > 0 ? '<span class="sb-tag">' + turnCount + '</span>' : '';
    h += '<div class="sidebar__item' + active + '" data-nav="chat" data-session="' + id + '"><span class="sb-ico">●</span> ' + esc(label) + tag;
    if (sessionOrder.length > 1) {
      h += '<span class="sb-del-btn" data-del="' + id + '" onclick="event.stopPropagation();App.deleteSession(\'' + id + '\')" title="Delete session">✕</span>';
    }
    h += '</div>';
  }
  container.innerHTML = h;

  // Rebind sidebar item clicks via delegation is already set up
}

function renderSessions() {
  var h = '';
  // New session card first
  h += '<div class="sess-card" style="border-color:var(--ok);border-style:dashed" onclick="App.createSession()"><div class="sess-card__av" style="background:rgba(58,209,126,0.12);color:var(--ok)">＋</div><div class="sess-card__info"><div class="sess-card__name" style="color:var(--ok)">New Session</div><div class="sess-card__sub">Start a fresh conversation</div></div></div>';
  for (var i = 0; i < sessionOrder.length; i++) {
    var id = sessionOrder[i];
    var msgs = sessions[id] || [];
    var turns = msgs.filter(function(m){ return m.role === 'user'; }).length;
    var label = sessionLabels[id] || id.replace('session-', 'New session ');
    var icon = sessionIcons[id] || '💬';
    var sub = (id === 'current') ? 'reasonix-platform/ · deepseek-v4-flash' :
              (id === 'api') ? 'backend/ · deepseek-v4-flash' :
              (id === 'auth') ? 'auth-service/ · deepseek-v4-pro' :
              (id === 'test') ? 'core/ · deepseek-v4-flash' :
              'New session · deepseek-v4-flash';
    var meta = turns + ' turns';
    h += '<div class="sess-card" data-goto="chat" data-session="' + id + '"><div class="sess-card__av">' + icon + '</div><div class="sess-card__info"><div class="sess-card__name">' + esc(label) + '</div><div class="sess-card__sub">' + esc(sub) + '</div></div><div class="sess-card__meta">' + esc(meta) + '</div></div>';
  }
  $('sessionsList').innerHTML = h;
  bindSessionCards();
}

function renderSkills() {
  var h = '';
  for (var i = 0; i < skills.length; i++) {
    var s = skills[i];
    var tag = s.run === 'subagent' ? '<span class="skill-tag-sub">🧬 subagent</span>' : '<span class="skill-tag-inline">📄 inline</span>';
    h += '<div class="sess-card" data-skill-idx="' + i + '"><div class="sess-card__av">' + (s.run==='subagent'?'🧬':'📄') + '</div><div class="sess-card__info"><div class="sess-card__name">' + esc(s.name) + tag + '</div><div class="sess-card__sub">' + esc(s.desc) + '</div></div></div>';
  }
  $('skillsList').innerHTML = h;
  bindSkillCards();
}

function renderSkillDetail(idx) {
  var s = skills[idx];
  var tag = s.run === 'subagent' ? 'skill-tag-sub' : 'skill-tag-inline';
  var label = s.run === 'subagent' ? '🧬 subagent' : '📄 inline';
  var h = '<div style="padding:30px 40px;max-width:700px">';
  h += '<h2>' + esc(s.name) + '</h2>';
  h += '<div style="margin-bottom:16px"><span class="' + tag + '">' + label + '</span> <span style="font-size:11px;color:var(--fg-faint);margin-left:8px">Scope: project</span></div>';
  h += '<div style="font-size:13px;line-height:1.6;color:var(--fg-dim);margin-bottom:20px">' + esc(s.desc) + '</div>';
  h += '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--fg-faint);margin-bottom:10px;font-weight:600">Body</div>';
  h += '<pre style="background:var(--bg-soft);border:1px solid var(--border);border-radius:8px;padding:16px;font-family:var(--font-mono);font-size:12px;line-height:1.6;color:var(--fg-dim);overflow-x:auto;white-space:pre-wrap">' + esc(s.body) + '</pre>';
  h += '<button style="margin-top:20px;padding:8px 16px;border-radius:7px;border:1px solid var(--border);background:var(--bg-soft);color:var(--fg-dim);cursor:pointer;font-family:var(--font-ui);font-size:12px" onclick="App.navigate(\'skills\')">← Back to Skills</button>';
  h += '</div>';
  $('skillDetail').innerHTML = h;
}

// ===== BINDINGS =====
function bindSessionCards() {
  var cards = document.querySelectorAll('#sessionsList .sess-card');
  for (var i = 0; i < cards.length; i++) {
    cards[i].addEventListener('click', function() {
      var s = this.dataset.session;
      if (s) { navigate('chat', s); return; }
    });
  }
}

function bindSkillCards() {
  var cards = document.querySelectorAll('#skillsList .sess-card');
  for (var i = 0; i < cards.length; i++) {
    cards[i].addEventListener('click', function() {
      var idx = parseInt(this.dataset.skillIdx);
      showSkillDetail(idx);
    });
  }
}

function showSkillDetail(idx) {
  renderSkillDetail(idx);
  showPage('page-skill-detail');
  document.getElementById('pageTitle').textContent = skills[idx].name;
  document.getElementById('pageSub').textContent = 'Skill Detail';
  showComposer(false);
  updateSidebarActive('skills');
}

// ===== NAVIGATION =====
function navigate(page, session) {
  state.page = page;
  if (session) state.session = session;
  rebuildSidebar();
  updateSidebarActive(page, session);
  var pageId = 'page-' + page;
  showPage(pageId);
  document.getElementById('pageTitle').textContent =
    { chat:'Chat', sessions:'All Sessions', skills:'Skills', settings:'Settings' }[page] || page;
  var sub = '';
  if (page === 'chat' && state.session !== 'current') {
    sub = sessionLabels[state.session] || state.session;
  }
  document.getElementById('pageSub').textContent = sub;
  showComposer(page === 'chat');
  if (page === 'chat') renderChat();
  if (page === 'sessions') renderSessions();
  if (page === 'skills') renderSkills();
  if (page === 'settings') {
    var keyInput = document.getElementById('apiKeyInput');
    if (keyInput) {
      keyInput.value = localStorage.getItem('reasonix_api_key') || AppConfig.DEEPSEEK_API_KEY || '';
    }
  }
}

function showPage(id) {
  var pages = document.querySelectorAll('.page');
  for (var i = 0; i < pages.length; i++) pages[i].classList.remove('page--active');
  var target = document.getElementById(id);
  if (target) target.classList.add('page--active');
}

function showComposer(show) {
  var cw = document.querySelector('.composer-wrap');
  if (cw) cw.style.display = show ? '' : 'none';
}

function updateSidebarActive(page, session) {
  var items = document.querySelectorAll('.sidebar__item');
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var nav = it.dataset.nav;
    var ses = it.dataset.session;
    it.classList.remove('sidebar__item--active');
    if (nav === page && (!ses || ses === (session || state.session))) {
      it.classList.add('sidebar__item--active');
    }
  }
}

// ===== MODE =====
function cycleMode() {
  var modes = ['auto', 'plan', 'yolo'];
  var idx = modes.indexOf(state.mode);
  state.mode = modes[(idx + 1) % 3];
  var chip = $('modeChip');
  chip.textContent = state.mode.toUpperCase();
  chip.className = 'mode-chip mode-chip--' + state.mode;
}

// ===== SEND =====
function send() {
  var ta = $('composerInput');
  var txt = ta.value.trim();
  if (!txt || state.page !== 'chat') return;
  if (!sessions[state.session]) sessions[state.session] = [];
  sessions[state.session].push({ role:'user', text:txt });
  ta.value = ''; ta.style.height = 'auto';
  renderChat();

  // Thinking indicator
  var inner = $('transcriptInner');
  var dot = document.createElement('div');
  dot.className = 'msg--assistant';
  dot.innerHTML = '<div class="msg__body"><p style="color:var(--fg-faint)">Thinking<span class="dot1">.</span><span class="dot2">.</span><span class="dot3">.</span></p></div>';
  inner.appendChild(dot);
  var ts = $('transcript');
  ts.scrollTop = ts.scrollHeight;
  var d1 = dot.querySelector('.dot1'), d2 = dot.querySelector('.dot2'), d3 = dot.querySelector('.dot3');
  var dotAnim = setInterval(function() {
    d1.style.opacity = d1.style.opacity === '1' ? '0.3' : '1';
    setTimeout(function(){ d2.style.opacity = d2.style.opacity === '1' ? '0.3' : '1'; }, 200);
    setTimeout(function(){ d3.style.opacity = d3.style.opacity === '1' ? '0.3' : '1'; }, 400);
  }, 600);

  // Build messages array from session history
  var apiMessages = [];
  var history = sessions[state.session] || [];
  for (var i = 0; i < history.length; i++) {
    var msg = history[i];
    if (msg.role === 'system') {
      apiMessages.push({ role: 'system', content: msg.text });
    } else if (msg.role === 'user') {
      apiMessages.push({ role: 'user', content: msg.text });
    } else if (msg.role === 'agent') {
      apiMessages.push({ role: 'assistant', content: msg.text });
    }
  }

  // Call real DeepSeek API
  var apiKey = AppConfig.DEEPSEEK_API_KEY;
  if (!apiKey) {
    clearInterval(dotAnim);
    dot.remove();
    sessions[state.session].push({
      role:'agent',
      text:'⚠️ **API Key 未配置**\n\n请在 Settings 页面输入你的 DeepSeek API Key，或在 `.env` 文件中设置 `DEEPSEEK_API_KEY`。\n\n获取 Key: [platform.deepseek.com](https://platform.deepseek.com)'
    });
    renderChat();
    updateContext();
    return;
  }

  fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      model: 'deepseek-v4-flash',
      messages: apiMessages,
      max_tokens: 4096,
      temperature: 0.0
    })
  })
  .then(function(res) {
    if (!res.ok) {
      return res.json().then(function(err) {
        throw new Error('API Error ' + res.status + ': ' + (err.error && err.error.message || res.statusText));
      });
    }
    return res.json();
  })
  .then(function(data) {
    clearInterval(dotAnim);
    dot.remove();
    var reply = data.choices && data.choices[0] && data.choices[0].message;
    if (reply && reply.content) {
      sessions[state.session].push({
        role:'agent',
        text: reply.content
      });
    } else {
      sessions[state.session].push({
        role:'agent',
        text:'(Empty response from API)'
      });
    }
    // Update context usage if available
    if (data.usage) {
      var total = data.usage.total_tokens || 0;
      document.getElementById('ctxVal').textContent = (total / 1000).toFixed(1) + 'k';
    }
    renderChat();
    updateContext();
  })
  .catch(function(err) {
    clearInterval(dotAnim);
    dot.remove();
    sessions[state.session].push({
      role:'agent',
      text:'❌ **API 调用失败**\n\n```\n' + err.message + '\n```\n\n请检查:\n- API Key 是否正确\n- 网络连接是否正常\n- 是否需要配置代理'
    });
    renderChat();
    updateContext();
  });
}

// ===== DOCK =====
function switchDockTab(tab) {
  state.dockTab = tab;
  var tabs = document.querySelectorAll('.rightdock__tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.toggle('rightdock__tab--active', tabs[i].dataset.docktab === tab);
  }
  $('dock-context').style.display = tab === 'context' ? '' : 'none';
  $('dock-files').style.display = tab === 'files' ? '' : 'none';
  $('dock-changes').style.display = tab === 'changes' ? '' : 'none';
}

function toggleDock() {
  state.dockOpen = !state.dockOpen;
  $('rightdock').style.display = state.dockOpen ? '' : 'none';
}

// ===== PALETTE =====
function openPalette() {
  state.paletteOpen = true;
  $('paletteOverlay').classList.add('palette-overlay--open');
  $('paletteInput').value = '';
  $('paletteInput').focus();
  renderPalette('');
}

function closePalette() {
  state.paletteOpen = false;
  $('paletteOverlay').classList.remove('palette-overlay--open');
}

function renderPalette(query) {
  var h = '';
  var lq = query.toLowerCase();
  for (var i = 0; i < paletteCommands.length; i++) {
    var c = paletteCommands[i];
    if (query && c.name.toLowerCase().indexOf(lq) === -1 && c.desc.toLowerCase().indexOf(lq) === -1) continue;
    h += '<div class="palette__item" data-pidx="' + i + '"><span class="palette__item-icon">' + c.icon + '</span><div><div class="palette__item-name">' + esc(c.name) + '</div><div class="palette__item-desc">' + esc(c.desc) + '</div></div><kbd>⏎</kbd></div>';
  }
  $('paletteList').innerHTML = h;
  var items = document.querySelectorAll('#paletteList .palette__item');
  for (var j = 0; j < items.length; j++) {
    items[j].addEventListener('click', function() {
      paletteCommands[parseInt(this.dataset.pidx)].action();
    });
  }
}

// ===== CONTEXT =====
function updateContext() {
  var t = Math.floor(2000 + Math.random() * 3000);
  $('ctxVal').textContent = (t / 1000).toFixed(1) + 'k';
  $('ctxGauge').style.width = (t / 64000 * 100) + '%';
}

// ===== CLOCK =====
function tick() { $('clockVal').textContent = new Date().toTimeString().slice(0, 8); }

// ===== EVENT SETUP =====
function setupEvents() {
  // Send button
  $('sendBtn').addEventListener('click', send);

  // Composer keyboard
  $('composerInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    var self = this;
    setTimeout(function() {
      self.style.height = 'auto';
      self.style.height = Math.min(self.scrollHeight, 200) + 'px';
    }, 0);
  });

  // Sidebar clicks — use event delegation since items rebuild dynamically
  document.querySelector('.sidebar').addEventListener('click', function(e) {
    var item = e.target.closest('.sidebar__item');
    if (!item) return;
    // Ignore if clicking delete button
    if (e.target.closest('.sb-del-btn')) return;
    var nav = item.dataset.nav;
    var ses = item.dataset.session;
    if (nav) navigate(nav, ses || 'current');
  });

  // Dock tabs
  var dockTabs = document.querySelectorAll('.rightdock__tab');
  for (var j = 0; j < dockTabs.length; j++) {
    dockTabs[j].addEventListener('click', function() {
      switchDockTab(this.dataset.docktab);
    });
  }

  // Palette
  $('paletteOverlay').addEventListener('click', function(e) {
    if (e.target === this) closePalette();
  });
  $('paletteInput').addEventListener('input', function() {
    renderPalette(this.value);
  });
  $('paletteInput').addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closePalette();
    if (e.key === 'Enter') {
      var first = document.querySelector('#paletteList .palette__item');
      if (first) paletteCommands[parseInt(first.dataset.pidx)].action();
    }
  });

  // Global keyboard
  document.addEventListener('keydown', function(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openPalette(); }
    if ((e.metaKey || e.ctrlKey) && e.key === 'n') { e.preventDefault(); createSession(); }
    if (e.key === 'Escape' && state.paletteOpen) closePalette();
  });
}

// ===== PUBLIC API =====
window.App = {
  navigate: navigate,
  cycleMode: cycleMode,
  toggleDock: toggleDock,
  openPalette: openPalette,
  closePalette: closePalette,
  send: send,
  createSession: function(name) { createSession(name); },
  deleteSession: function(id) { deleteSession(id); },
  saveApiKey: function() {
    var key = document.getElementById('apiKeyInput').value.trim();
    if (key) {
      localStorage.setItem('reasonix_api_key', key);
      AppConfig.DEEPSEEK_API_KEY = key;
      hideKeyBanner();
      alert('API Key saved ✓');
    }
  }
};

// ===== BOOT =====
try {
  loadApiKey();
  buildHTML();
  setupEvents();
  rebuildSidebar();
  navigate('chat', 'current');
  renderSessions();
  renderSkills();
  updateContext();
  setInterval(tick, 1000);
  tick();
  // Show key prompt if no key configured
  if (!AppConfig.DEEPSEEK_API_KEY) {
    showKeyBanner();
  }
} catch(e) {
  document.getElementById('root').innerHTML = '<div style="padding:40px;color:#f0573f;font-family:monospace"><h2>Boot Error</h2><pre>' + e.message + '\n\n' + e.stack + '</pre></div>';
  console.error(e);
}

// ===== KEY BANNER =====
function showKeyBanner() {
  var banner = document.createElement('div');
  banner.id = 'key-banner';
  banner.innerHTML = '<div style="margin:16px 20px;max-width:820px;padding:16px 20px;background:rgba(255,106,61,0.08);border:1px solid rgba(255,106,61,0.25);border-radius:10px;display:flex;align-items:center;gap:14px">' +
    '<span style="font-size:24px">🔑</span>' +
    '<div style="flex:1"><b style="color:var(--accent)">API Key 未配置</b><br><span style="font-size:12px;color:var(--fg-dim))">在 Settings 页面输入 DeepSeek API Key 后即可使用。获取: platform.deepseek.com</span></div>' +
    '<button onclick="App.navigate(\'settings\')" style="padding:8px 16px;border-radius:7px;border:1px solid var(--accent);background:var(--accent-soft);color:var(--accent);cursor:pointer;font-family:inherit;font-size:12px;white-space:nowrap;font-weight:600">Configure →</button>' +
    '</div>';
  var wrap = document.querySelector('.transcript__inner');
  if (wrap) wrap.insertBefore(banner, wrap.firstChild);
}

// ===== HIDE KEY BANNER =====
function hideKeyBanner() {
  var b = document.getElementById('key-banner');
  if (b) b.remove();
}

})();
