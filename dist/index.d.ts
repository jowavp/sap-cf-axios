import { AxiosRequestConfig, AxiosResponse, Method } from 'axios';
export default function SapCfAxios(destination: string, instanceConfig?: AxiosRequestConfig, xsrfConfig?: Method | {
    method: Method;
    url: string;
}): <T>(req: AxiosRequestConfig) => Promise<AxiosResponse<T>>;
