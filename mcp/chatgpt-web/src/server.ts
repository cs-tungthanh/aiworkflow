#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ask, errorText, readLastReply, status, type ReplyResult } from './chatgpt.ts';

const server = new McpServer({ name: 'chatgpt-web', version: '0.1.0' });

// Every tool drives the same Chrome tab, so calls run one at a time.
let queue: Promise<unknown> = Promise.resolve();
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => {});
  return run;
}

// The reply goes out as plain markdown under a short header, so the caller reads it directly.
function replyContent(result: ReplyResult) {
  const header = [
    `status: ${result.status}`,
    `conversation_url: ${result.conversation_url}`,
    result.blocked_reason && `blocked_reason: ${result.blocked_reason}`,
    result.detail && `detail: ${result.detail}`,
  ].filter(Boolean);
  const text = result.reply ? `${header.join('\n')}\n\n---\n\n${result.reply}` : header.join('\n');
  return { content: [{ type: 'text' as const, text }], isError: result.status === 'blocked' };
}

function failure(err: unknown) {
  return { content: [{ type: 'text' as const, text: `error: ${errorText(err)}` }], isError: true };
}

server.registerTool(
  'chatgpt_ask',
  {
    title: 'Ask ChatGPT web',
    description:
      'Send a prompt, optionally with files, to ChatGPT in the user\'s logged-in Chrome window, wait for the answer and return it as markdown. ' +
      'Uses whatever model is selected in the ChatGPT UI. Pass the returned conversation_url to continue the same chat.',
    inputSchema: {
      prompt: z.string().min(1).describe('The instruction, e.g. "Review this plan for gaps and risks".'),
      files: z.array(z.string()).default([]).describe('Absolute paths of files to include.'),
      mode: z
        .enum(['upload', 'paste'])
        .default('upload')
        .describe('upload: attach the files. paste: put their contents in the message as fenced blocks.'),
      conversation_url: z.string().optional().describe('A chatgpt.com conversation URL to continue.'),
      new_chat: z
        .boolean()
        .default(true)
        .describe('Without conversation_url: true starts a new chat, false continues the chat open in the tab.'),
      timeout_s: z.number().int().min(10).max(3600).default(600).describe('How long to wait for the answer.'),
    },
  },
  (args) =>
    serial(() =>
      ask({
        prompt: args.prompt,
        files: args.files,
        mode: args.mode,
        conversationUrl: args.conversation_url,
        newChat: args.new_chat,
        timeoutMs: args.timeout_s * 1000,
      }),
    ).then(replyContent, failure),
);

server.registerTool(
  'chatgpt_read_last_reply',
  {
    title: 'Read last ChatGPT reply',
    description:
      'Return the latest assistant reply from a ChatGPT conversation without sending anything. ' +
      'Use after chatgpt_ask timed out, or to read an answer the user got in the window.',
    inputSchema: {
      conversation_url: z.string().optional().describe('Conversation to read. Defaults to the chat open in the tab.'),
      wait: z.boolean().default(true).describe('If ChatGPT is still answering, wait for it to finish.'),
      timeout_s: z.number().int().min(10).max(3600).default(300).describe('How long to wait.'),
    },
    annotations: { readOnlyHint: true },
  },
  (args) =>
    serial(() => readLastReply(args.conversation_url, args.wait, args.timeout_s * 1000)).then(replyContent, failure),
);

server.registerTool(
  'chatgpt_status',
  {
    title: 'ChatGPT web status',
    description:
      'Check whether Chrome is reachable, ChatGPT is logged in, the page state (ready, generating, challenge, login, rate_limited) and the selected model.',
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  () =>
    serial(status).then(
      (value) => ({ content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }] }),
      failure,
    ),
);

await server.connect(new StdioServerTransport());
