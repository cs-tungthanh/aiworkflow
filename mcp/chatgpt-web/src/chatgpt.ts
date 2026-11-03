// Drives chatgpt.com in the user's own Chrome (attached over CDP), the way a person would:
// attach files, paste the prompt, press send, wait, read the reply.
// It never logs in or solves challenges; it reports them and stops.
import { chromium, type Browser, type Page } from 'playwright-core';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { htmlToMarkdown } from './markdown.ts';

const CDP_URL = process.env.CHATGPT_CDP_URL ?? 'http://127.0.0.1:9222';
const HOME_URL = 'https://chatgpt.com/';
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 120_000;
const STABLE_MS = 2_500;
const POLL_MS = 1_000;

// The selectors most likely to break when ChatGPT changes its UI (last checked 2026-11-03).
const SEL = {
  composer: 'div.ProseMirror[contenteditable="true"]',
  send: 'form button[aria-label="Send"]',
  stop: 'form button[aria-label^="Stop"]',
  // One turn holds a user message and the assistant reply; each side is marked by a screen-reader heading.
  turn: '[data-talvt-turn-state]',
  assistant: '[data-conversation-role="assistant"]',
  replyBody: '[data-markdown-copy="contents"]',
  replyExclude: '[data-markdown-copy="exclude"]',
  codeBlock: '[data-code-block]',
  codeEditor: '[role="textbox"]',
  fileInput: 'input[type="file"][aria-label="Attach files"], input[type="file"]:not([accept])',
};

export type PageState = 'ready' | 'generating' | 'challenge' | 'login' | 'rate_limited';
export type BlockedReason = 'login_required' | 'challenge' | 'rate_limited' | 'busy' | 'error';

export interface ReplyResult {
  status: 'complete' | 'timeout' | 'blocked';
  reply: string;
  conversation_url: string;
  blocked_reason?: BlockedReason;
  detail?: string;
}

export interface AskOptions {
  prompt: string;
  files: string[];
  mode: 'upload' | 'paste';
  conversationUrl?: string;
  newChat: boolean;
  timeoutMs: number;
}

let browser: Browser | undefined;
let currentPage: Page | undefined;

// On macOS, closing the last window leaves Chrome running with no browser context, and attaching then
// fails ("Browser context management is not supported"). Open a chatgpt.com window first.
async function ensureWindow(): Promise<void> {
  const targets = (await fetch(`${CDP_URL}/json/list`).then((r) => r.json()).catch(() => undefined)) as
    | { type: string }[]
    | undefined;
  if (targets && !targets.some((t) => t.type === 'page')) {
    await fetch(`${CDP_URL}/json/new?${HOME_URL}`, { method: 'PUT' });
  }
}

async function getBrowser(): Promise<Browser> {
  if (browser?.isConnected()) return browser;
  try {
    await ensureWindow();
    browser = await chromium.connectOverCDP(CDP_URL);
  } catch (err) {
    throw new Error(
      `Cannot reach Chrome at ${CDP_URL}. Run ./start-chrome.sh and log in to ChatGPT in that window. (${errorText(err)})`,
    );
  }
  browser.on('disconnected', () => {
    browser = undefined;
    currentPage = undefined;
  });
  return browser;
}

async function getPage(): Promise<Page> {
  if (currentPage && !currentPage.isClosed()) return currentPage;
  const b = await getBrowser();
  const context = b.contexts()[0];
  if (!context) throw new Error('Chrome has no browser context to use.');
  const page = context.pages().find((p) => p.url().startsWith(HOME_URL)) ?? (await context.newPage());
  if (!page.url().startsWith(HOME_URL)) await page.goto(HOME_URL, { waitUntil: 'domcontentloaded' });
  currentPage = page;
  return page;
}

function detectState(page: Page): Promise<PageState> {
  return page.evaluate((sel) => {
    const title = document.title.toLowerCase();
    if (
      title.includes('just a moment') ||
      document.querySelector('iframe[src*="challenges.cloudflare.com"], #challenge-form, #cf-challenge-running')
    ) {
      return 'challenge';
    }
    const loginLink = [...document.querySelectorAll('a, button')].some((e) => /^log in$/i.test(e.textContent?.trim() ?? ''));
    if (location.hostname !== 'chatgpt.com' || loginLink) return 'login';
    // Limit notices show as toasts or as a banner in place of / above the composer, never inside a message.
    const noticeEls = [...document.querySelectorAll('[role="alert"], [data-testid*="toast"]')];
    const composerArea = document.querySelector(sel.composer)?.closest('form')?.parentElement;
    if (composerArea) noticeEls.push(composerArea);
    const notices = noticeEls.map((e) => e.textContent ?? '').join(' ');
    if (/(reached|hit) (your|the) .{0,40}limit|usage (cap|limit)|too many requests/i.test(notices)) {
      return 'rate_limited';
    }
    const turns = document.querySelectorAll(sel.turn);
    const turnState = turns[turns.length - 1]?.getAttribute('data-talvt-turn-state');
    if (document.querySelector(sel.stop) || (turnState && turnState !== 'complete')) return 'generating';
    return 'ready';
  }, SEL);
}

function blockedFor(state: PageState): BlockedReason | undefined {
  if (state === 'login') return 'login_required';
  if (state === 'challenge') return 'challenge';
  if (state === 'rate_limited') return 'rate_limited';
  return undefined;
}

const BLOCKED_DETAIL: Record<BlockedReason, string> = {
  login_required: 'ChatGPT is not logged in. Log in in the Chrome window, then retry.',
  challenge: 'ChatGPT is showing a verification check. Complete it in the Chrome window, then retry.',
  rate_limited: 'ChatGPT reports a usage limit. Wait for it to reset or switch model in the Chrome window.',
  busy: 'ChatGPT is still answering in this conversation. Use chatgpt_read_last_reply to wait for it.',
  error: 'ChatGPT returned an error.',
};

function blocked(page: Page, reason: BlockedReason, reply = '', detail = BLOCKED_DETAIL[reason]): ReplyResult {
  return { status: 'blocked', reply, conversation_url: page.url(), blocked_reason: reason, detail };
}

async function validateFiles(files: string[]): Promise<void> {
  for (const file of files) {
    if (!path.isAbsolute(file)) throw new Error(`File path must be absolute: ${file}`);
    const info = await stat(file).catch(() => undefined);
    if (!info?.isFile()) throw new Error(`Not a readable file: ${file}`);
    if (info.size > MAX_UPLOAD_BYTES) throw new Error(`File is over 25 MB: ${file}`);
  }
}

async function openConversation(page: Page, conversationUrl: string | undefined, newChat: boolean): Promise<void> {
  if (conversationUrl) {
    if (!conversationUrl.startsWith(HOME_URL)) throw new Error(`Not a chatgpt.com URL: ${conversationUrl}`);
    if (page.url() !== conversationUrl) await page.goto(conversationUrl, { waitUntil: 'domcontentloaded' });
  } else if (newChat) {
    await page.goto(HOME_URL, { waitUntil: 'domcontentloaded' });
  }
}

async function buildPasteMessage(prompt: string, files: string[]): Promise<string> {
  const parts = [prompt];
  for (const file of files) {
    const content = await readFile(file, 'utf8');
    const longestRun = Math.max(0, ...(content.match(/`+/g) ?? []).map((run) => run.length));
    const fence = '`'.repeat(Math.max(3, longestRun + 1));
    parts.push(`### ${path.basename(file)}\n\n${fence}${path.extname(file).slice(1)}\n${content}\n${fence}`);
  }
  return parts.join('\n\n');
}

interface AttachmentState {
  allShown: boolean;
  uploading: boolean;
  limitNotice: string;
}

function attachmentState(page: Page, names: string[]): Promise<AttachmentState> {
  return page.evaluate(
    ({ sel, names }) => {
      const form = document.querySelector(sel)?.closest('form');
      const text = form?.textContent ?? '';
      const lines = (form?.innerText ?? '').split('\n');
      return {
        allShown: names.every((n) => text.includes(n)),
        uploading: !!form?.querySelector('[role="progressbar"], circle'),
        limitNotice: lines.filter((l) => /reached the limit|try again/i.test(l)).join(' ').trim(),
      };
    },
    { sel: SEL.composer, names },
  );
}

// Attaches the files and waits until ChatGPT has settled on them. A chip appears at once even when
// ChatGPT then rejects the file (for example over the plan's attachment limit), so a chip alone is
// not proof. Returns ChatGPT's limit notice when it refuses the files.
async function uploadFiles(page: Page, names: string[], files: string[]): Promise<string | undefined> {
  await page.locator(SEL.fileInput).first().setInputFiles(files);
  const deadline = Date.now() + UPLOAD_TIMEOUT_MS;
  let settledPolls = 0;
  while (Date.now() < deadline) {
    await page.waitForTimeout(500);
    const state = await attachmentState(page, names);
    if (state.limitNotice) return state.limitNotice;
    settledPolls = state.allShown && !state.uploading ? settledPolls + 1 : 0;
    if (settledPolls >= 3) return undefined;
  }
  throw new Error(`Attachments did not finish uploading within ${UPLOAD_TIMEOUT_MS / 1000}s.`);
}

function attachmentLimit(page: Page, notice: string): ReplyResult {
  return blocked(page, 'rate_limited', '', `${notice} Use mode "paste" to send the files as text instead.`);
}

function sendEnabled(page: Page): Promise<boolean> {
  return page.evaluate((sel) => {
    const button = document.querySelector<HTMLButtonElement>(sel);
    return !!button && !button.disabled;
  }, SEL.send);
}

async function fillComposer(page: Page, text: string): Promise<void> {
  const composer = page.locator(SEL.composer);
  await composer.click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Backspace');
  // A synthetic paste is fast for long text and keeps line breaks as paragraphs.
  await page.evaluate(
    ({ sel, text }) => {
      const el = document.querySelector<HTMLElement>(sel);
      if (!el) return;
      el.focus();
      const data = new DataTransfer();
      data.setData('text/plain', text);
      el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    },
    { sel: SEL.composer, text },
  );
  await page.waitForTimeout(500);
  // Very long pastes become an attachment chip, so an empty composer alone does not mean the paste failed.
  if (!(await composer.innerText()).trim() && !(await sendEnabled(page))) {
    await page.keyboard.insertText(text);
  }
}

async function send(page: Page): Promise<void> {
  // The send button stays disabled while attachments are still uploading.
  await page.waitForFunction(
    (sel) => {
      const button = document.querySelector<HTMLButtonElement>(sel);
      return !!button && !button.disabled;
    },
    SEL.send,
    { timeout: UPLOAD_TIMEOUT_MS },
  );
  await page.locator(SEL.send).click();
}

function assistantCount(page: Page): Promise<number> {
  return page.evaluate((sel) => document.querySelectorAll(sel).length, SEL.assistant);
}

function lastTurnText(page: Page): Promise<string> {
  return page.evaluate((sel) => {
    const all = document.querySelectorAll(sel.assistant);
    return all[all.length - 1]?.closest(sel.turn)?.textContent ?? '';
  }, SEL);
}

// Returns the reply in the last assistant turn as HTML that turndown handles: code blocks become
// <pre><code class="language-x">, table cells lose their <p> wrappers, and UI controls are dropped.
function lastTurnHtml(page: Page): Promise<string> {
  return page.evaluate((sel) => {
    const all = document.querySelectorAll(sel.assistant);
    const turn = all[all.length - 1]?.closest(sel.turn);
    if (!turn) return '';
    return [...turn.querySelectorAll<HTMLElement>(sel.replyBody)]
      .map((body) => {
        // A code block is either an editor (one element per line, so read innerText on the live node to keep
        // line breaks) or a static <pre>. The language is on the editor, or else in the header's label.
        const codes = [...body.querySelectorAll<HTMLElement>(sel.codeBlock)].map((block) => {
          const editor = block.querySelector<HTMLElement>(sel.codeEditor);
          const header = block.querySelector(sel.replyExclude);
          const label = [...(header?.children ?? [])].find((c) => c.tagName === 'DIV' && !c.querySelector('button'));
          const lang = editor?.getAttribute('data-language') ?? label?.textContent?.trim().toLowerCase() ?? '';
          const text = editor ? editor.innerText : (block.querySelector('pre')?.textContent ?? '');
          return { lang, text: text.replace(/\n$/, '') };
        });
        const root = body.cloneNode(true) as HTMLElement;
        root.querySelectorAll(sel.codeBlock).forEach((block, i) => {
          const pre = document.createElement('pre');
          const code = document.createElement('code');
          if (codes[i]?.lang) code.className = `language-${codes[i].lang}`;
          code.textContent = codes[i]?.text ?? '';
          pre.append(code);
          block.replaceWith(pre);
        });
        root.querySelectorAll('th > p, td > p').forEach((p, i, list) => {
          const next = list[i + 1];
          p.replaceWith(...p.childNodes, ...(next && next.parentElement === p.parentElement ? [document.createElement('br')] : []));
        });
        // Bold lead-ins ("Risk: ...") are styled spans rather than <strong>.
        root.querySelectorAll('[data-d-default-strong]').forEach((span) => {
          const strong = document.createElement('strong');
          strong.append(...span.childNodes);
          span.replaceWith(strong);
        });
        root.querySelectorAll(`${sel.replyExclude}, button, svg`).forEach((e) => e.remove());
        return root.innerHTML;
      })
      .join('\n<hr>\n');
  }, SEL);
}

async function readReply(page: Page): Promise<string> {
  return htmlToMarkdown(await lastTurnHtml(page));
}

// Waits for an assistant turn after `previousCount` to appear and stop changing.
async function waitForReply(page: Page, previousCount: number, timeoutMs: number): Promise<ReplyResult> {
  const deadline = Date.now() + timeoutMs;
  let lastText = '';
  let stableSince = Date.now();
  while (Date.now() < deadline) {
    await page.waitForTimeout(POLL_MS);
    const state = await detectState(page);
    const reason = blockedFor(state);
    const started = (await assistantCount(page)) > previousCount;
    if (reason === 'login_required' || reason === 'challenge') return blocked(page, reason);
    if (!started) {
      if (reason) return blocked(page, reason);
      continue;
    }
    const text = await lastTurnText(page);
    if (state === 'generating' || text !== lastText) {
      lastText = text;
      stableSince = Date.now();
      continue;
    }
    if (Date.now() - stableSince < STABLE_MS) continue;
    const reply = await readReply(page);
    if (reason) return blocked(page, reason, reply);
    if (!reply) return blocked(page, 'error', '', `ChatGPT finished with an empty reply. Last turn text: ${text.slice(0, 300)}`);
    return { status: 'complete', reply, conversation_url: page.url() };
  }
  return {
    status: 'timeout',
    reply: await readReply(page),
    conversation_url: page.url(),
    detail: 'Still answering. Call chatgpt_read_last_reply with this conversation_url to get the rest.',
  };
}

export async function ask(opts: AskOptions): Promise<ReplyResult> {
  await validateFiles(opts.files);
  const message = opts.mode === 'paste' ? await buildPasteMessage(opts.prompt, opts.files) : opts.prompt;
  const page = await getPage();
  await openConversation(page, opts.conversationUrl, opts.newChat);
  // A login page or a challenge has no composer; detectState below reports those.
  await page.locator(SEL.composer).waitFor({ timeout: 30_000 }).catch(() => {});

  const state = await detectState(page);
  const reason = state === 'generating' ? 'busy' : blockedFor(state);
  if (reason) return blocked(page, reason);

  const previousCount = await assistantCount(page);
  const uploading = opts.mode === 'upload' && opts.files.length > 0;
  const names = opts.files.map((f) => path.basename(f));
  if (uploading) {
    const notice = await uploadFiles(page, names, opts.files);
    if (notice) return attachmentLimit(page, notice);
  }
  await fillComposer(page, message);
  if (uploading) {
    // Never send the prompt without its files.
    const state = await attachmentState(page, names);
    if (state.limitNotice) return attachmentLimit(page, state.limitNotice);
    if (!state.allShown) return blocked(page, 'error', '', 'The attached files disappeared from the message before sending.');
  }
  await send(page);
  return waitForReply(page, previousCount, opts.timeoutMs);
}

export async function readLastReply(conversationUrl: string | undefined, wait: boolean, timeoutMs: number): Promise<ReplyResult> {
  const page = await getPage();
  await openConversation(page, conversationUrl, false);
  await page.locator(SEL.assistant).last().waitFor({ timeout: 30_000 }).catch(() => {});
  const state = await detectState(page);
  const reason = blockedFor(state);
  if (reason === 'login_required' || reason === 'challenge') return blocked(page, reason);
  if (wait && state === 'generating') return waitForReply(page, (await assistantCount(page)) - 1, timeoutMs);
  const reply = await readReply(page);
  if (state === 'generating') {
    return { status: 'timeout', reply, conversation_url: page.url(), detail: 'ChatGPT is still answering.' };
  }
  return { status: 'complete', reply, conversation_url: page.url() };
}

export async function status(): Promise<Record<string, unknown>> {
  try {
    const page = await getPage();
    await page.locator(SEL.composer).waitFor({ timeout: 15_000 }).catch(() => {});
    const state = await detectState(page);
    // The page no longer names the model; the only model control is the "Think" toggle.
    const think = page.locator('form button', { hasText: /^Think$/ }).first();
    const thinkMode = (await think.count()) ? (await think.getAttribute('aria-pressed')) === 'true' : null;
    return {
      browser_connected: true,
      logged_in: state !== 'login',
      page_state: state,
      current_url: page.url(),
      think_mode: thinkMode,
    };
  } catch (err) {
    return { browser_connected: false, error: errorText(err) };
  }
}

export function errorText(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
