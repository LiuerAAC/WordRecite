# Daily News Reading Workflow

这个目录用于每天自动生成一篇德语、瑞典语或英文新闻阅读笔记。核心脚本在：

```sh
node work/daily_news_reading.mjs
```

## Recommended Workflow

1. 运行脚本生成当天新闻笔记。
2. 打开笔记里的 source link 阅读原文，或使用 AI 模式生成分级阅读文本。
3. 阅读时高亮生词。
4. 在 `Vocabulary Log` 里记录 5-10 个真正想复用的词。
5. 用 `Retrieval Practice` 写 3-4 个主动回忆答案。
6. 第二天复习昨天的 note，再进入新文章。

## Commands

瑞典语，默认 A2：

```sh
node work/daily_news_reading.mjs --lang sv
```

德语，B1：

```sh
node work/daily_news_reading.mjs --lang de --level B1
```

英文，按关键词筛选：

```sh
node work/daily_news_reading.mjs --lang en --topic climate
```

如果网络或 RSS 不稳定，可以手动传入新闻标题和链接：

```sh
node work/daily_news_reading.mjs --lang sv --title "Nyhetstitel" --url "https://example.com/news"
```

## AI Mode

默认模式只保存 RSS 摘要、原文链接和学习模板，不复制整篇新闻原文。

如果你希望 Obsidian 里直接出现一篇原创分级阅读文章，先设置：

```sh
export OPENAI_API_KEY="your_api_key"
```

然后运行：

```sh
node work/daily_news_reading.mjs --lang de --level B1 --mode ai
```

AI 模式会基于 RSS 标题和摘要生成一篇新的学习文章，包含：

- 阅读文本
- 中文摘要
- 重点词汇
- 语法焦点
- 阅读理解问题
- 简短写作任务

可以用 `OPENAI_MODEL` 覆盖默认模型：

```sh
OPENAI_MODEL="gpt-4.1-mini" node work/daily_news_reading.mjs --lang sv --mode ai
```

## Obsidian Setup

### Shell Commands Plugin

如果你使用 Obsidian 的 Shell Commands 插件：

1. 安装并启用 Shell Commands。
2. 新建命令，working directory 设为这个 vault 根目录。
3. Command 填：

```sh
node work/daily_news_reading.mjs --lang sv
```

4. 为德语、瑞典语、英文各建一个命令，分别绑定快捷键。

### Templater Plugin

如果你使用 Templater，可以创建一个模板，内容类似：

```js
<%*
const { execSync } = require("child_process");
const output = execSync("node work/daily_news_reading.mjs --lang sv", {
  cwd: app.vault.adapter.basePath
}).toString().trim();
new Notice(`Created: ${output}`);
%>
```

## Suggested Rotation

- Monday: German
- Tuesday: Swedish
- Wednesday: English
- Thursday: German
- Friday: Swedish
- Saturday: English
- Sunday: review only

如果某一种语言更弱，把它安排到一周 3 次，另一种语言只保留维护阅读。
