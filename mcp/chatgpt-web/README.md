# chatgpt-web-mcp

MCP server that uses ChatGPT **web** (not the API) as a reviewer. It drives your own logged-in Chrome the way you would: attach the files, paste the prompt, press send, wait for the answer, and return it as markdown.

It never logs in, and never gets past verification checks or usage limits. When it hits one, it stops and tells you to deal with it in the Chrome window.

> Automating the ChatGPT website goes against OpenAI's terms of use, and your account could be flagged. Use a personal account, and don't send material you aren't allowed to share.

## Setup

```bash
npm install
./start-chrome.sh          # opens a separate Chrome profile on port 9222; log in to ChatGPT there once
claude mcp add chatgpt-web --scope user -- node "$PWD/src/server.ts"
```

You need Node 23.6 or later, which runs the `.ts` sources directly with no build step. Keep that Chrome window open while you use the tools. The profile lives in `~/.chatgpt-web-mcp/chrome-profile`.

Long answers can take several minutes. If Claude Code cuts off the call, raise its MCP tool timeout, for example `MCP_TOOL_TIMEOUT=900000 claude`, or call `chatgpt_read_last_reply` afterwards.

## Tools

| Tool | What it does |
|---|---|
| `chatgpt_ask` | Sends `prompt` and `files` (absolute paths), waits, and returns the reply. `mode`: `upload` (attach the files, the default) or `paste` (put their contents in the message). Continue a chat by passing `conversation_url`, or `new_chat: false` for the chat open in the tab. `timeout_s` defaults to 600. |
| `chatgpt_read_last_reply` | Reads the latest reply without sending anything. With `wait: true` it waits until ChatGPT finishes. |
| `chatgpt_status` | Reports whether Chrome is reachable, whether you're logged in, the page state, and whether the "Think" toggle is on. |

`chatgpt_ask` and `chatgpt_read_last_reply` return a header followed by the reply:

```
status: complete | timeout | blocked
conversation_url: https://chatgpt.com/c/…
blocked_reason: login_required | challenge | rate_limited | busy | error
```

Your ChatGPT plan caps file attachments. Over the cap, `chatgpt_ask` sends nothing and returns `blocked_reason: rate_limited` with ChatGPT's own notice. `mode: "paste"` doesn't count against the cap.

The tool doesn't choose a model. It uses whatever ChatGPT is set to, so turn "Think" on or off in the window yourself. Your ChatGPT custom instructions and memory also apply to every reply.

## Environment

| Variable | Default | Used by |
|---|---|---|
| `CHATGPT_CDP_URL` | `http://127.0.0.1:9222` | the server |
| `CHATGPT_CDP_PORT` | `9222` | `start-chrome.sh` |
| `CHATGPT_CHROME_PROFILE` | `~/.chatgpt-web-mcp/chrome-profile` | `start-chrome.sh` |

Anything on this machine can control that Chrome profile through the debugging port, so close the window when you aren't using it.

## When it breaks

ChatGPT's page changes without notice. All the selectors are in `SEL` at the top of `src/chatgpt.ts`; update them there.
