import { AxiosRequestConfig, InternalAxiosRequestConfig } from "axios";
import TenantCache from "flexso-cf-tenantcache";
export declare class FlexsoAxiosCache {
    private cacheFn;
    private defaultAdapter;
    constructor(cacheFn: (config: AxiosRequestConfig) => TenantCache, defaultAdapter?: import("axios").AxiosAdapter);
    adapter(config: InternalAxiosRequestConfig<any>): Promise<import("axios").AxiosResponse<any, any>>;
}
