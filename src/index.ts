import { readDestination, IHTTPDestinationConfiguration } from 'sap-cf-destconn'
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import * as tough from 'tough-cookie';
import enhanceConfig from './configEnhancer';

declare var exports: any;

export function SapCfAxios(destination: string, instanceConfig?: AxiosRequestConfig) {
    const instance = createInstance(destination, instanceConfig);
    return async<T>(req: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
        if (req.xsrfHeaderName) {
            // handle x-csrf-Token
            var tokenReq: AxiosRequestConfig = {
                url: req.url || "",
                method: "options",
                headers: {
                    [req.xsrfHeaderName]: "Fetch"
                }
            };
            var { headers } = await (await instance)(tokenReq);
            // req.headers = {...req.headers, [req.xsrfHeaderName]: headers[req.xsrfHeaderName]}
            if (!req.headers) req.headers = {};
            req.headers[req.xsrfHeaderName] = headers[req.xsrfHeaderName];
        }
        return (await instance)(req)
    }
}
exports = SapCfAxios;

async function createInstance(destinationName: string, instanceConfig?: AxiosRequestConfig) {

    // we will add an interceptor to axios that will take care of the destination configuration
    const instance = axios.create(instanceConfig);

    // set cookiesupport to enable X-CSRF-Token requests
    axiosCookieJarSupport(instance);
    instance.defaults.jar = new tough.CookieJar();
    instance.defaults.withCredentials = true;

    // we return the destination configuration in the response.
    instance.interceptors.request.use(
        async (config) => {
            // enhance config object with destination information
            const auth = config.headers.Authorization || config.headers.authorization;
            const destination = await readDestination<IHTTPDestinationConfiguration>(destinationName, auth);
            return enhanceConfig(config, destination);
        }
    );

    return instance;

}
