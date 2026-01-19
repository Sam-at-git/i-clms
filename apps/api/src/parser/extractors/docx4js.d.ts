declare module 'docx4js' {
  export default class Docx4js {
    static load(buffer: Buffer): Promise<any>;
    document?: any;
    content?: any;
  }
}
