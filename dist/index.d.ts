import { AxiosRequestConfig, AxiosResponse } from 'axios';
export declare function SapCfAxios(destination: string): <T>(req: AxiosRequestConfig) => Promise<AxiosResponse<T>>;
