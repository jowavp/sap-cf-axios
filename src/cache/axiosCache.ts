import axios, { AxiosPromise, AxiosRequestConfig } from "axios";
import TenantCache from "flexso-cf-tenantcache";
import objectHash from "object-hash";

function isRunningLocal(localdebug: boolean) {
    return localdebug && process.env.NODE_ENV === 'local';
}

export class FlexsoAxiosCache {

    constructor(private cacheFn: (config: AxiosRequestConfig) => TenantCache, private defaultAdapter = axios.defaults.adapter) {
    }

    async adapter(config: AxiosRequestConfig<any>) {

        const localDebug = config.localDebug || false;
        // check if this config is available in the cahe.
        let saveToCache = (res: AxiosPromise<any>) => res;
        let start = new Date().getTime();

        if (!config.skipCache && config.method?.toLocaleLowerCase() === "get") {
            const cache = this.cacheFn(config);
            // metadata is the same for all users.
            const cacheKey = config.url?.includes("$metadata") ? <string>objectHash(axios.getUri(config)) : <string>objectHash(config);

            saveToCache = (res: AxiosPromise<any>) => {
                cache.set(config.subscribedDomain || "default", cacheKey, res);
                return res;
            }

            if (cache) {
                const resultPromise = cache.getSync<AxiosPromise<any>>(config.subscribedDomain || "default", cacheKey);
                if (resultPromise) {
                    const result = await resultPromise;
                    if (result.status > 199 && result.status < 300) {
                        if (isRunningLocal(localDebug)) {
                            const end = new Date().getTime();
                            console.info(`Cached request: ${config.url}: ${end - start} ms`)
                        }
                        return resultPromise;
                    }
                }
            }
        }
        // nothing in the cache, continue with de default adapter.
        try {
            if (this.defaultAdapter) {
                const result = this.defaultAdapter(config);
                return saveToCache(result).then(
                    result => {
                        if (isRunningLocal(localDebug)) {
                            const end = new Date().getTime()
                            // const url =  axios.getUri(config);
                            console.info(`${config.method} request: ${config.url}: ${end - start} ms`)
                        }
                        return result;
                    },
                    (error) => {
                        console.error(`Error request: ${config.url}`)
                        throw error;
                    }
                );
            }
            else {
                throw ('No default adapter');
            }
        } catch (err) {
            throw err
        }

    }
}