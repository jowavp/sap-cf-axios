import { AxiosInstance } from "axios";
export { AxiosInstance, AxiosResponse } from "axios";
export interface IBatchRequestBodyRequest {
    method?: string;
    url: string;
    userid?: string;
    body?: string;
}
interface IBatchRequest {
    contentType: string;
    payload: string;
}
export declare function chunkArray<T>(arr: T[], size?: number): T[][];
export default class BatchRequest {
    private logger;
    batchRequests: IBatchRequest[];
    requests: IBatchRequestBodyRequest[][];
    constructor(reqs: IBatchRequestBodyRequest[], logger: any, size?: number);
    private generateBatchRequests;
    doBatchRequests<T>(url: string, axiosInstance: AxiosInstance, // <T>(req: AxiosRequestConfig) => Promise<AxiosResponse<T>>,
    doWait?: boolean, additionalHeaders?: {
        [key: string]: string;
    }): Promise<Map<IBatchRequestBodyRequest, T>>;
    doBatchRequestsParallel<T>(url: string, axiosInstance: AxiosInstance, additionalHeaders?: {
        [key: string]: string;
    }): Promise<Map<IBatchRequestBodyRequest, T>>;
    private getBatchResponses;
}
