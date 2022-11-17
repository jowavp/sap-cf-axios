import { AxiosRequestConfig } from 'axios';
import { IDestinationData, IHTTPDestinationConfiguration } from 'sap-cf-destconn';
export default function enhanceConfig(config: AxiosRequestConfig, destination: IDestinationData<IHTTPDestinationConfiguration>): Promise<AxiosRequestConfig<any>>;
