# Everything MCP Enhanced ⚡

[English](#english) | [简体中文](#简体中文)

---

## 简体中文

适用于 Windows [voidtools Everything](https://www.voidtools.com/) 的高性能 Model Context Protocol (MCP) 服务器，专为大模型 Agent 与 DeepSeek-Harness (DSH) 深度定制优化。

### 🌟 核心特性与改进

1. **🚀 突破百条硬限制**：支持单次最高返回 5000 条记录，彻底避免分页往返导致模型上下文崩溃或超时。
2. **🎯 专属 `path` 参数支持**：模型可直接传入 `path: "D:\\"` 或 `path: "D:\\Projects"`，服务端自动合成为 Everything 高性能语法，杜绝路径被丢弃误搜 C 盘的问题。
3. **🛡️ 智能噪音过滤 (`exclude_noise: true`)**：默认开启依赖库过滤（自动排除 `node_modules`、`.git`、`.venv`、`dist`、`build`、`__pycache__` 等），让搜索结果从近千个依赖脚本瞬时净化为手写业务文件。
4. **📉 Token 极致节省 (`format: "compact"`)**：默认采用紧凑单行格式输出绝对路径，相比原始 4 行元数据格式节省 **75% 以上的 Token**。亦可通过 `format: "detailed"` 获取大小与修改时间。
5. **🔍 智能端口探测**：支持自动扫描 Everything 常用端口（`8011`、`80`、`8080`、`54321`）及读取 `Everything.ini` 配置，开箱即用。

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

### Key Enhancements

- **No 100-item hard limit**: supports up to 5,000 items in a single query.
- **Dedicated `path` parameter**: scopes into folders/drives accurately without query syntax errors.
- **Smart noise filtering**: automatically excludes `node_modules`, `.git`, `.venv`, etc.
- **Token-optimized compact format**: 1 line per path, saving 75%+ tokens.
- **Auto port detection**: probes 8011, 80, 8080, 54321 and reads `Everything.ini`.

### License

MIT License
