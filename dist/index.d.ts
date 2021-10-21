import { AxiosRequestConfig, AxiosResponse, Method } from 'axios';
export interface SapCFAxiosRequestConfig extends AxiosRequestConfig {
    subscribedDomain?: string;
}
export { AxiosResponse, AxiosRequestConfig } from 'axios';
export declare function getSapCfAxiosInstance(destination: string, instanceConfig?: SapCFAxiosRequestConfig, xsrfConfig?: Method | {
    method: Method;
    url: string;
    params: object;
}): <T>(req: AxiosRequestConfig) => Promise<AxiosResponse<T, any>>;
export declare function flushCache(): void;
export default function SapCfAxios(destination: string, instanceConfig?: SapCFAxiosRequestConfig, xsrfConfig?: Method | {
    method: Method;
    url: string;
    params: object;
}): <T>(req: AxiosRequestConfig) => Promise<AxiosResponse<T, any>>;
export declare function logAxiosError(error: any): void;
