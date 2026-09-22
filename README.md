# Everything MCP Enhanced ⚡

[English](#english) | [简体中文](#简体中文)

---

## 简体中文

适用于 Windows [voidtools Everything](https://www.voidtools.com/) 的高性能 Model Context Protocol (MCP) 服务器，专为大模型 Agent 与 DeepSeek-Harness (DSH) 深度定制优化。

### 💡 为什么为大模型 / Agent 接入 Everything MCP？

传统 AI 编程助手在 Windows 环境下查找文件时，通常依赖终端执行 `dir /s`、PowerShell `Get-ChildItem -Recurse` 或 Python 递归扫描。这种传统方式存在致命痛点：
- **极度耗时 & 易超时**：递归遍历磁盘经常耗时数十秒甚至数分钟，极易触发 MCP / Agent 的执行超时。
- **严重消耗磁盘 I/O**：海量的小文件随机读取会导致磁盘持续高负载甚至系统卡顿。
- **盲人摸象**：如果模型不知道文件在哪一盘符或哪级目录，就必须反复多轮探测，严重消耗思考轮数。

**接入 Everything MCP 后的质变**：
- ⚡ **毫秒级极速检索**：直接读取 Everything 的内存索引数据库（基于 NTFS USN 日志）。面对全盘 **千万级（10,000,000+）** 文件，搜索仅需 **5 ~ 30 毫秒** 即可完成！
- 🌐 **全盘全局视野**：无需预先猜测目录，跨驱动器瞬时定位代码、配置、脚本或文档，大幅提升 Agent 决策与执行效率。
- 🍃 **零磁盘 I/O 磨损**：在内存中完成高速模式匹配，不产生密集磁盘读写，保护固态硬盘寿命。
- 🧩 **大模型专属优化**：结合本增强版提供的**依赖噪音过滤**与**单行紧凑模式**，自动剔除几十万个 `node_modules`/`.venv` 垃圾项，节省 75% 以上的 Token 消耗，让大模型只接收最高价值的上下文信息。

### 🌟 本增强版核心特性

1. **⚡ 毫秒级极速响应**：千万级文件 5~30ms 极速检索，无需等待漫长的递归扫描。
2. **🚀 突破百条硬限制**：单次最高支持返回 5000 条记录（原生社区版硬编码限 100 条），彻底避免分页往返导致模型上下文崩溃。
3. **🎯 专属 `path` 参数支持**：模型可直接传入 `path: "D:\\"` 或 `path: "D:\\Projects"`，服务端自动合成为 Everything 高性能语法，杜绝路径被丢弃误搜 C 盘的问题。
4. **🛡️ 智能噪音过滤 (`exclude_noise: true`)**：默认开启工程依赖过滤（自动排除 `node_modules`、`.git`、`.venv`、`dist`、`build`、`__pycache__` 等），让搜索结果瞬时净化为业务源码文件。
5. **📉 Token 极致节省 (`format: "compact"`)**：默认采用紧凑单行格式输出绝对路径，相比原始 4 行元数据格式节省 **75% 以上的 Token**。亦可通过 `format: "detailed"` 获取大小与修改时间。
6. **🔍 智能端口探测**：支持自动扫描 Everything 常用端口（`8011`、`80`、`8080`、`54321`）及读取 `Everything.ini` 配置，开箱即用。

### 🛠️ 前置条件

1. 操作系统：Windows (x64 / ARM64)。
2. 安装并运行 [Everything](https://www.voidtools.com/)。
3. 开启 Everything 的 HTTP 服务器：
   - 打开 Everything 软件：菜单栏 **工具 (Tools) → 选项 (Options) → HTTP 服务器 (HTTP Server)**；
   - 勾选 **启用 HTTP 服务器**，端口设为 `8011`（或保持默认 `80`）；
   - 确定保存。

### 📦 安装与配置

#### 在 DeepSeek-Harness (DSH) 中使用

在 `~/.dsh/mcp-manager.json`（或 DSH Web 界面 **设置 → MCP**）中添加：

```json
{
  "servers": [
    {
      "id": "everything-search",
      "name": "everything",
      "type": "stdio",
      "command": "node",
      "args": [
        "C:\\path\\to\\everything-mcp\\dist\\index.js"
      ],
      "env": {
        "EVERYTHING_BASE_URL": "http://127.0.0.1:8011"
      }
    }
  ]
}
```

#### 在 Claude Desktop / Cursor 中使用

在配置文件中添加：

```json
{
  "mcpServers": {
    "everything": {
      "command": "node",
      "args": ["C:\\path\\to\\everything-mcp\\dist\\index.js"]
    }
  }
}
```

### 🔧 工具参数说明

#### `everything_search`

| 参数名 | 类型 | 默认值 | 描述 |
| :--- | :--- | :--- | :--- |
| `query` | string | (必填) | 搜索关键词、通配符或扩展名（如 `*.ps1`、`HowToUpdate`） |
| `path` | string | 可选 | 限定搜索盘符或子目录（如 `D:\`、`C:\Projects`） |
| `exclude_noise` | boolean | `true` | 是否自动排除 `node_modules`/`.venv` 等工程依赖噪音 |
| `exclude` | string / string[] | 可选 | 自定义额外排除的关键词或后缀 |
| `count` | number | `100` | 返回结果数量（1~5000） |
| `offset` | number | `0` | 分页偏移量 |
| `format` | string | `"compact"` | 输出格式：`compact`（单行路径，省 Token）或 `detailed`（带大小/时间） |
| `sort` | string | 可选 | 排序字段：`name`、`path`、`date_modified`、`size` |
| `ascending` | boolean | `true` | 是否升序 |

#### `everything_health`
检查本地 Everything HTTP 服务的连通性、响应延迟以及已索引的文件数据库总数。

---

## English

High-performance Model Context Protocol (MCP) server for voidtools Everything on Windows, specifically optimized for AI Agents, DeepSeek-Harness (DSH), Claude, and Cursor.

### 💡 Why Everything MCP for AI Agents?

Traditional AI agents on Windows typically search files using commands like `dir /s`, PowerShell `Get-ChildItem -Recurse`, or recursive directory walks. This suffers from major drawbacks:
- **Painfully slow & error-prone**: Recursive walks through large disks easily take 30+ seconds or time out.
- **Heavy disk I/O**: Scanning millions of small files degrades system responsiveness and wears down SSDs.
- **Blind trial-and-error**: Agents waste multiple round-trips guessing folder locations across drives.

**With Everything MCP:**
- ⚡ **Millisecond-level latency**: Direct access to Everything's memory-indexed database (powered by NTFS USN Journal). Searches across **10,000,000+ files take only 5 ~ 30 ms**!
- 🌐 **Global instant visibility**: Locate any code, config, or script across all mounted drives in a single shot.
- 🍃 **Zero disk thrashing**: All matching happens in RAM—no disk I/O bottlenecks.
- 🧩 **Agent-first enhancements**: Automatic filtering of `node_modules` and virtual environments, plus a 1-line-per-path compact format that cuts token consumption by **over 75%**.

### 🌟 Key Enhancements

- **⚡ Sub-second response**: Instant search across millions of files in 5~30ms.
- **🚀 No 100-item hard limit**: Supports up to 5,000 items in a single query (or custom limit).
- **🎯 Dedicated `path` parameter**: Scopes into folders/drives accurately without Everything syntax confusion.
- **🛡️ Smart noise filtering**: Automatically excludes `node_modules`, `.git`, `.venv`, `dist`, `__pycache__`, etc.
- **📉 Token-optimized compact format**: 1 line per path, saving 75%+ LLM context tokens.
- **🔍 Auto port detection**: Probes ports 8011, 80, 8080, 54321 and inspects `Everything.ini`.

### License

MIT License
