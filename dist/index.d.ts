import { AxiosRequestConfig, AxiosResponse } from 'axios';
export declare function SapCfAxios(destination: string, instanceConfig?: AxiosRequestConfig): <T>(req: AxiosRequestConfig) => Promise<AxiosResponse<T>>;
