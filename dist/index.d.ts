import { AxiosInstance, AxiosRequestConfig, Method } from 'axios';
export interface SapCFAxiosRequestConfig extends AxiosRequestConfig {
    subscribedDomain?: string;
}
export { AxiosInstance, AxiosPromise, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
export declare function getSapCfAxiosInstance(destination: string, instanceConfig?: SapCFAxiosRequestConfig, xsrfConfig?: Method | {
    method: Method;
    url: string;
    params: object;
}): AxiosInstance;
export declare function flushCache(): void;
export default function SapCfAxios(destination: string, instanceConfig?: SapCFAxiosRequestConfig, xsrfConfig?: Method | {
    method: Method;
    url: string;
    params: object;
}): AxiosInstance;
export declare function logAxiosError(error: any): void;
