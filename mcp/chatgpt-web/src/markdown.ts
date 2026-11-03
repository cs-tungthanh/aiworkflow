import TurndownService from 'turndown';
import gfmPlugin from 'turndown-plugin-gfm';

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
  emDelimiter: '*',
});
turndown.use(gfmPlugin.gfm);

// ChatGPT wraps each list item's text in divs and a <p>, which the default rule turns into a loose
// list with blank lines between items. Keep items tight.
turndown.addRule('tightListItem', {
  filter: 'li',
  replacement(content, node, options) {
    const item = node as HTMLElement;
    const list = item.parentElement;
    let prefix = `${options.bulletListMarker} `;
    if (list?.nodeName === 'OL') {
      const start = Number(list.getAttribute('start') ?? 1);
      // turndown's server-side DOM has no iterable HTMLCollection.
      prefix = `${start + Array.prototype.indexOf.call(list.children, item)}. `;
    }
    const body = content.trim().replace(/\n{3,}/g, '\n\n').replace(/\n/g, `\n${' '.repeat(prefix.length)}`);
    return prefix + body + (item.nextElementSibling ? '\n' : '');
  },
});

// Expects HTML already normalized in the page: each code block as <pre><code class="language-x">.
export function htmlToMarkdown(html: string): string {
  return turndown
    .turndown(html)
    .replace(/[ \t]+$/gm, '')
    .trim();
}
