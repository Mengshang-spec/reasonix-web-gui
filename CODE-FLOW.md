# Reasonix Web GUI — 代码流程图

## 1. 启动流程 (Boot Sequence)

```
index.html 加载
  │
  ├─ styles.css ────────────────────────► Graphite 主题变量 + 组件样式
  │
  └─ app.js ──► IIFE 自执行
                  │
                  ├─ AppConfig.DEEPSEEK_API_KEY = ''
                  │
                  ├─ var state = { page, session, mode, ... }
                  │
                  ├─ var sessions = {} ──────► 4 个预置 Session 数据
                  │
                  ├─ var skills = [...] ─────► 12 个 Skill 定义
                  │
                  ├─ var paletteCommands = [...] ─► 命令面板菜单
                  │
                  └─ BOOT (try/catch)
                      │
                      ├─ loadApiKey()
                      │   └─ localStorage.getItem('reasonix_api_key')
                      │
                      ├─ buildHTML()
                      │   └─ root.innerHTML = <div id="app">...</div>
                      │       │
                      │       ├─ .sidebar ──── 导航 + Session 列表
                      │       ├─ .main
                      │       │   ├─ .topicbar ─── 标题 + 按钮
                      │       │   ├─ .page-container
                      │       │   │   ├─ #page-chat ── Chat 页
                      │       │   │   ├─ #page-sessions ── 会话列表页
                      │       │   │   ├─ #page-skills ── 技能列表页
                      │       │   │   ├─ #page-skill-detail ── 技能详情
                      │       │   │   └─ #page-settings ── 设置页
                      │       │   └─ .statusbar ──── 状态栏
                      │       └─ .rightdock ──── Context/Files/Changes
                      │
                      ├─ setupEvents()
                      │   ├─ Sidebar 点击 ──► navigate()
                      │   ├─ Composer Enter ─► send()
                      │   ├─ Dock tabs ──► switchDockTab()
                      │   ├─ Palette Ctrl+K ─► openPalette()
                      │   └─ Global Ctrl+N ──► createSession()
                      │
                      ├─ rebuildSidebar() ──► 动态渲染 Session 列表
                      ├─ navigate('chat', 'current') ──► 显示默认页面
                      ├─ renderChat() ──► 渲染当前 Session 消息
                      │
                      └─ showKeyBanner() ──── 如果无 Key → 显示配置提示
```

## 2. 页面导航流程 (Navigation)

```
用户点击 Sidebar 项目
  │
  └─► navigate(page, session)
      │
      ├─ state.page = page
      ├─ state.session = session
      ├─ rebuildSidebar() ──── 更新侧边栏激活状态
      │   └─ sidebarSessions.innerHTML = ...
      │       └─ 遍历 sessionOrder[] → 渲染 .sidebar__item
      │
      ├─ showPage('page-' + page)
      │   └─ 隐藏所有 .page → 显示目标 .page--active
      │
      ├─ 更新标题 / 副标题
      ├─ showComposer(page === 'chat')
      │
      └─ 按页面类型渲染:
          ├─ chat     → renderChat()
          ├─ sessions → renderSessions()
          ├─ skills   → renderSkills()
          └─ settings → 预填 API Key input
```

## 3. 消息发送 + API 调用流程

```
用户输入 → Enter
  │
  └─► send()
      │
      ├─ 读取 composerInput.value
      ├─ sessions[session].push({ role:'user', text })
      ├─ renderChat() ──── 更新 UI
      │
      ├─ 显示 "Thinking..." 动画
      │
      ├─ 构建 apiMessages[]
      │   └─ 遍历 sessions[session][]
      │       ├─ role:'system'  → { role:'system', content }
      │       ├─ role:'user'    → { role:'user', content }
      │       └─ role:'agent'   → { role:'assistant', content }
      │
      ├─ 检查 API Key
      │   ├─ AppConfig.DEEPSEEK_API_KEY 存在?
      │   │   ├─ YES → 继续
      │   │   └─ NO  → 显示 "⚠ Key 未配置" + return
      │   │
      ├─ fetch('https://api.deepseek.com/v1/chat/completions', {
      │     method: 'POST',
      │     headers: { 'Authorization': 'Bearer ' + key },
      │     body: JSON.stringify({ model, messages, max_tokens, temperature })
      │   })
      │
      ├─ .then(res => res.json())
      │   │
      │   └─► 成功?
      │       ├─ YES → data.choices[0].message.content
      │       │        → sessions[].push({ role:'agent', text })
      │       │        → renderChat() + updateContext()
      │       │
      │       └─ NO  → .catch(err)
      │                → sessions[].push({ role:'agent', text:'❌ ' + err })
      │                → renderChat()
```

## 4. Session 生命周期

```
┌─────────────────────────────────────────────────────┐
│                  createSession()                     │
│                                                     │
│  sessionCounter++ → id = 'session-N'                │
│  sessions[id] = [{ role:'system', text }]           │
│  sessionLabels[id] = label                          │
│  sessionOrder.unshift(id)                           │
│  rebuildSidebar() → navigate('chat', id)            │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│                  deleteSession(id)                   │
│                                                     │
│  sessionOrder.length ≤ 1? → return                  │
│  delete sessions[id]                                │
│  sessionOrder = sessionOrder.filter(s => s !== id)  │
│  state.session = sessionOrder[0]                    │
│  rebuildSidebar() → navigate('chat', state.session) │
└─────────────────────────────────────────────────────┘
```

## 5. 命令面板流程

```
Ctrl+K / 点击 ⌘K 按钮
  │
  └─► openPalette()
      │
      ├─ paletteOverlay.classList.add('open')
      ├─ paletteInput.focus()
      └─ renderPalette('')
          │
          └─ 遍历 paletteCommands[]
              ├─ 过滤: name/desc 匹配 query
              └─ 渲染 .palette__item × N
                  │
                  └─ 点击 → command.action()
                      │
                      ├─ /review    → alert('Running review...')
                      ├─ /test      → alert('Running tests...')
                      ├─ /init      → alert('Generating AGENTS.md...')
                      ├─ /rewind    → alert('Rewinding...')
                      ├─ /doctor    → alert('Diagnostics...')
                      ├─ /skill new → navigate('skills')
                      ├─ /memory    → alert('Opening memory...')
                      └─ Settings   → navigate('settings')
```

## 6. 组件树

```
#app (flex row)
│
├─ .sidebar (240px)
│   ├─ .sidebar__head       → Logo + 版本
│   ├─ .sidebar__sec        → Navigate (Chat / Sessions / Skills)
│   ├─ .sidebar__sec        → Sessions (动态列表 + ＋ 按钮)
│   │   └─ #sidebarSessions → rebuildSidebar() 填充
│   └─ .sidebar__item       → Settings
│
├─ .main (flex:1, column)
│   ├─ .topicbar            → 标题 + ＋New + Context + ⌘K
│   ├─ .page-container
│   │   ├─ #page-chat
│   │   │   ├─ .transcript → #chatWr (消息列表)
│   │   │   │   ├─ .msg--system    (系统消息)
│   │   │   │   ├─ .msg--user      (用户气泡)
│   │   │   │   └─ .msg--assistant (Agent 回复)
│   │   │   │       ├─ .msg__body  (Markdown 渲染)
│   │   │   │       └─ .tool       (Tool Card)
│   │   │   │           ├─ .tool__head    (可折叠)
│   │   │   │           └─ .tool__body    (代码块)
│   │   │   └─ .composer-wrap     → #composer
│   │   │       ├─ .composer__row  → mode-chip + model
│   │   │       ├─ #ta (textarea)
│   │   │       └─ .composer__row  → hint + send-btn
│   │   ├─ #page-sessions  (会话卡片列表)
│   │   ├─ #page-skills    (技能卡片列表)
│   │   ├─ #page-skill-detail (技能详情)
│   │   └─ #page-settings  (设置表单)
│   └─ .statusbar           → SYS / Context / Turns / Cache / Cost
│
└─ .rightdock (320px)
    ├─ .rightdock__tabs     → Context / Files / Changes
    └─ .rightdock__body
        ├─ #dock-context    → Token Gauge + Tools + Cost
        ├─ #dock-files      → 文件树
        └─ #dock-changes    → Diff 统计

.palette-overlay (fixed, z-index:100)
  └─ .palette
      ├─ .palette__input   → 搜索框
      └─ .palette__list    → 命令列表
```

## 7. 数据流

```
                 ┌──────────────┐
                 │ localStorage │
                 │  api_key     │──── loadApiKey() ──► AppConfig
                 └──────────────┘
                        │
                        ▼
┌─────────┐    ┌───────────────┐    ┌──────────────────┐
│  User   │───►│   app.js      │───►│  DeepSeek API     │
│  Input  │    │  send()       │    │  /v1/chat/        │
│         │◄───│  renderChat() │◄───│  completions     │
└─────────┘    └──────┬────────┘    └──────────────────┘
                      │
              ┌───────┴────────┐
              │  sessions[id]  │  ← 内存中保存所有对话
              │  [{role,text}] │
              └────────────────┘
                      │
              ┌───────┴────────┐
              │  sessionOrder  │  ← 侧边栏显示顺序
              │  [id1,id2,...] │
              └────────────────┘
```

## 8. 渲染管线

```
renderChat()
  │
  └─► sessions[state.session][]
      │
      ├─ role:'system' → <div class="msg--system">
      ├─ role:'user'   → <div class="msg--user">
      │                   └─ <div class="msg__body">
      │                       └─ esc(text)
      │
      └─ role:'agent'  → <div class="msg--assistant">
                          ├─ <div class="msg__body">
                          │   └─ mdToHTML(text)
                          │       ├─ **bold**   → <strong>
                          │       ├─ `code`     → <code>
                          │       ├─ ```block``` → <pre><code>
                          │       └─ \n         → <br>
                          │
                          └─ tools[] → <div class="tool">
                              ├─ <button class="tool__head">
                              │   ├─ .tool__status-icon (✓/✗/—)
                              │   ├─ .tool__name
                              │   └─ .tool__chevron ▶
                              └─ <div class="tool__body">
                                  └─ <div class="code-block">
                                      └─ esc(output)
```
