import { AxiosRequestConfig, AxiosResponse, Method } from 'axios';
interface SapCFAxiosRequestConfig extends AxiosRequestConfig {
    subscribedDomain?: string;
}
export default function SapCfAxios(destination: string, instanceConfig?: SapCFAxiosRequestConfig, xsrfConfig?: Method | {
    method: Method;
    url: string;
}): <T>(req: AxiosRequestConfig) => Promise<AxiosResponse<T>>;
export {};
