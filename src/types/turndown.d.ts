declare module 'turndown/lib/turndown.es.js' {
  interface TurndownOptions {
    headingStyle?: 'setext' | 'atx';
    hr?: string;
    bulletListMarker?: '-' | '+' | '*';
    codeBlockStyle?: 'indented' | 'fenced';
    fence?: '```' | '~~~';
    emDelimiter?: '_' | '*';
    strongDelimiter?: '__' | '**';
    linkStyle?: 'inlined' | 'referenced';
    linkReferenceStyle?: 'full' | 'collapsed' | 'shortcut';
  }

  class TurndownService {
    constructor(options?: TurndownOptions);
    turndown(html: string | HTMLElement): string;
    use(plugin: Array<(service: TurndownService) => TurndownService>): TurndownService;
    addRule(key: string, rule: object): TurndownService;
    keep(filter: string | string[] | ((node: HTMLElement) => boolean)): TurndownService;
    remove(filter: string | string[] | ((node: HTMLElement) => boolean)): TurndownService;
    escape(str: string): string;
  }

  export = TurndownService;
}
