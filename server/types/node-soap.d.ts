declare module 'node-soap' {
  export interface IOptions {
    wsdl_options?: Record<string, unknown>;
    wsdl_headers?: Record<string, string>;
    [key: string]: unknown;
  }

  export class ClientSSLSecurity {
    constructor(key: Buffer, cert: Buffer, ca?: Buffer, options?: Record<string, unknown>);
  }

  export interface Client {
    setSecurity(security: ClientSSLSecurity): void;
    [method: string]: unknown;
  }

  export function createClient(url: string, options: IOptions, callback: (err: Error | null, client: Client) => void): void;
  export function createClientAsync(url: string, options?: IOptions): Promise<Client>;
}
