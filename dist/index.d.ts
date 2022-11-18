import { AxiosInstance, AxiosRequestConfig, AxiosResponse, Method } from 'axios';
declare module 'axios' {
    interface AxiosRequestConfig {
        skipCache?: boolean;
        localDebug?: boolean;
        subscribedDomain?: string;
        logger?: any;
    }
}
export interface SapCFAxiosRequestConfig extends AxiosRequestConfig {
    interceptors?: {
        request?: ((config: AxiosRequestConfig<any>) => AxiosRequestConfig<any>)[];
        response?: ((config: AxiosResponse<any>) => AxiosResponse<any>)[];
    };
}
export { AxiosInstance, AxiosPromise, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
export { FlexsoAxiosCache } from './cache/axiosCache';
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
export declare function logAxiosError(error: any, logger1: any): void;
