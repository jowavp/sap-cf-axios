import { AxiosRequestConfig, AxiosResponse } from 'axios';
export default function SapCfAxios(destination: string): <T>(req: AxiosRequestConfig) => Promise<AxiosResponse<T>>;
