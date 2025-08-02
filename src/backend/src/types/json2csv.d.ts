declare module 'json2csv' {
  export interface ParseOptions {
    fields?: string[] | { label?: string; value: string }[];
    delimiter?: string;
    eol?: string;
    quote?: string;
    header?: boolean;
    includeEmptyRows?: boolean;
    withBOM?: boolean;
  }

  export class Parser {
    constructor(options?: ParseOptions);
    parse(data: any[]): string;
  }
}