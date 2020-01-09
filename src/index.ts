import { readDestination, IHTTPDestinationConfiguration } from 'sap-cf-destconn'
import axios, { AxiosRequestConfig, AxiosResponse, Method } from 'axios';
// import axiosCookieJarSupport from 'axios-cookiejar-support';
// import * as tough from 'tough-cookie';
import enhanceConfig from './configEnhancer';

declare var exports: any;

export default function SapCfAxios(destination: string, instanceConfig?: AxiosRequestConfig, xsrfConfig: Method | {method: Method, url: string} = 'options') {
    const instance = createInstance(destination, instanceConfig);
    return async<T>(req: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
        if (req.xsrfHeaderName && req.xsrfHeaderName !== 'X-XSRF-TOKEN') {
            // handle x-csrf-Token
            const csrfMethod = typeof xsrfConfig === 'string' ? xsrfConfig : (xsrfConfig.method || 'options');
            const csrfUrl = typeof xsrfConfig === 'string' ? req.url : xsrfConfig.url;

            var tokenReq: AxiosRequestConfig = {
                url: csrfUrl,
                method: csrfMethod,
                headers: {
                    [req.xsrfHeaderName]: "Fetch"
                }
            };
            try{
                const { headers } = await (await instance)(tokenReq);
                const cookies = headers["set-cookie"]; // get cookie from request
    
                // req.headers = {...req.headers, [req.xsrfHeaderName]: headers[req.xsrfHeaderName]}
                if (headers) {
                    if (!req.headers) req.headers = {};
                    if (cookies) req.headers.cookie = cookies.join('; ');;
                    req.headers[req.xsrfHeaderName] = headers[req.xsrfHeaderName];
                }
            } catch (err) {
                console.log(err);
            }
            
        }
        return (await instance)(req)
    }
}
// exports = SapCfAxios;

async function createInstance(destinationName: string, instanceConfig?: AxiosRequestConfig) {

    // we will add an interceptor to axios that will take care of the destination configuration
    const instance = axios.create(instanceConfig);

    // set cookiesupport to enable X-CSRF-Token requests
    // axiosCookieJarSupport(instance);
    // instance.defaults.jar = new tough.CookieJar();
    // instance.defaults.withCredentials = true;

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
