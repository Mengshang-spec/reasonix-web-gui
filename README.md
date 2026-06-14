# Reasonix Web GUI

> 基于 [DeepSeek-Reasonix](https://github.com/esengine/DeepSeek-Reasonix) 桌面端源码的 **Web 复刻版本**，忠实还原 Graphite 主题、三栏布局和交互模式。

![theme](https://img.shields.io/badge/theme-Graphite-ff6a3d) ![license](https://img.shields.io/badge/license-MIT-green) ![standalone](https://img.shields.io/badge/build-standalone-blue)

## 预览

打开 `reasonix-standalone.html` 即可在浏览器中直接使用，无需安装任何依赖。

## 功能

### 多会话管理
- **新建对话** — 顶部绿色 `＋ New` 按钮 / 侧边栏 `＋` / `Ctrl+N` 快捷键
- **切换会话** — 侧边栏点击任意 Session，对话历史完整保留
- **删除会话** — 鼠标悬停侧边栏 Session → 点 `✕` 删除（至少保留一个）
- **All Sessions** — 会话列表页，查看所有历史对话

### 真实 API 调用
- 直接调用 **DeepSeek API** (`api.deepseek.com/v1/chat/completions`)
- 支持多轮对话上下文传递
- API Key 通过 Settings 页面输入，存储在浏览器 `localStorage`
- **源码中不含任何硬编码密钥**

### Skills 系统
- 12 个已加载 Skills 列表，标注 `inline` / `subagent` 运行模式
- 点击任意 Skill 查看完整 Body 源码
- 真实复刻 Reasonix 的 Skill 架构（`internal/skill/skill.go`）

### 命令面板
- `Ctrl+K` / `⌘K` 打开
- 支持 `/review` `/test` `/init` `/rewind` `/doctor` `/skill new` `/memory`
- 搜索过滤，回车执行

### 右侧面板
- **Context** — Token 使用量仪表、活跃工具列表、Session 费用统计
- **Files** — 工作区文件树
- **Changes** — 已修改文件 Diff 统计

### Settings
- Model 选择（deepseek-v4-flash / pro / mimo-pro）
- Effort 调节
- Theme 切换（Graphite / Aurora / Slate / Carbon）
- API Key 配置（加密输入，持久化存储）
- Sandbox / Approval Mode 开关

## 架构

```
reasonix-web/
├── index.html                  # 分文件入口（开发用）
├── reasonix-standalone.html    # 单文件版本（生产用，CSS+JS 内联）
├── src/
│   ├── styles.css              # 基于真实 Reasonix styles.css（498KB）的 Graphite 主题
│   └── app.js                  # 应用逻辑（~800 行）
└── .gitignore
```

### 技术栈

| 层 | 选择 |
|----|------|
| **UI** | 原生 HTML/CSS/JS（零框架依赖） |
| **主题** | CSS 自定义属性，Graphite 配色（复刻自真实 `styles.css:root[data-theme-style="graphite"]`） |
| **API** | `fetch()` 直接调用 DeepSeek API（OpenAI 兼容） |
| **存储** | `localStorage`（API Key + 会话持久化预案） |
| **构建** | Node.js 脚本拼接 standalone 单文件 |

### 设计复刻对照

| 真实组件 | 来源 | 复刻 |
|----------|------|------|
| `.tool` / `.tool__head` / `.tool__body` | `ToolCard.tsx:117` | ✅ |
| `.msg--user` / `.msg--assistant` | `Message.tsx:107` | ✅ |
| `.statusbar` / `.stat` / `.stat__label` | `StatusBar.tsx` | ✅ |
| `.composer` / mode-chip | `Composer.tsx` | ✅ |
| Graphite 配色 `#ff6a3d` accent | `styles.css:root[data-theme-style="graphite"]` | ✅ |
| 三栏布局（Sidebar + Chat + Right Dock） | `App.tsx` | ✅ |
| Command Palette | `CommandPalette.tsx` | ✅ |

## 使用方式

### 快速开始

1. 用浏览器打开 `reasonix-standalone.html`
2. 点击 `Settings` → 粘贴你的 [DeepSeek API Key](https://platform.deepseek.com/api_keys) → `Save`
3. 回到 Chat，输入消息，Enter 发送

### 开发

```bash
# 分文件模式（VSCode 编辑）
open index.html

# 构建 standalone
node -e "
var fs = require('fs');
var css = fs.readFileSync('src/styles.css', 'utf8');
var js = fs.readFileSync('src/app.js', 'utf8');
var html = '<!DOCTYPE html>...<style>' + css + '</style>...<script>' + js + '</script>...';
fs.writeFileSync('reasonix-standalone.html', html);
"
```

### 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+N` | 新建会话 |
| `Ctrl+K` | 命令面板 |
| `Enter` | 发送消息 |
| `Shift+Enter` | 换行 |
| `Esc` | 关闭弹窗 |

## 隐私 & 安全

- ✅ **无硬编码密钥** — `AppConfig.DEEPSEEK_API_KEY` 初始化为空字符串
- ✅ **用户自主配置** — API Key 通过 Settings 页面输入，仅存于浏览器 `localStorage`
- ✅ **无数据外传** — 除 DeepSeek API 调用外，不向任何第三方发送数据
- ✅ **演示数据均为虚构** — 预置 Session 内容为模拟的开发场景，不含真实对话
- ✅ **输入转义** — 所有用户输入和 API 响应均经过 `esc()` HTML 转义

## 依赖

**零外部运行时依赖**。仅需：
- 现代浏览器（Chrome / Firefox / Edge / Safari）
- DeepSeek API Key（可选，不配置也能浏览 Demo 内容）

## 参考

- [esengine/DeepSeek-Reasonix](https://github.com/esengine/DeepSeek-Reasonix) — 原始开源项目（22k+ stars）
- 复刻了其 `desktop/frontend/src/` 下的核心组件和样式系统

## License

MIT
