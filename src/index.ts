import { readDestination, IHTTPDestinationConfiguration } from 'sap-cf-destconn'
import axios, { AxiosRequestConfig, AxiosResponse, Method } from 'axios';
// import axiosCookieJarSupport from 'axios-cookiejar-support';
// import * as tough from 'tough-cookie';
import enhanceConfig from './configEnhancer';

declare var exports: any;

export default function SapCfAxios(destination: string, instanceConfig?: AxiosRequestConfig, xsrfConfig: Method | {method: Method, url: string, params: object} = 'options') {
    const instanceProm = createInstance(destination, instanceConfig);
    return async<T>(req: AxiosRequestConfig): Promise<AxiosResponse<T>> => {
        if (req.xsrfHeaderName && req.xsrfHeaderName !== 'X-XSRF-TOKEN') {
            // handle x-csrf-Token
            const csrfMethod = typeof xsrfConfig === 'string' ? xsrfConfig : (xsrfConfig.method || 'options');
            const csrfUrl = typeof xsrfConfig === 'string' ? req.url : xsrfConfig.url;
            const csrfParams = typeof xsrfConfig === 'string' ? {} : xsrfConfig.params;

            var tokenReq: AxiosRequestConfig = {
                url: csrfUrl,
                method: csrfMethod,
                headers: {
                    [req.xsrfHeaderName]: "Fetch"
                },
                params: csrfParams
            };
            try{
                const { headers } = await (await instanceProm)(tokenReq);
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
        return (await instanceProm)(req)
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
            try{
                const destination = await readDestination<IHTTPDestinationConfiguration>(destinationName, auth);
                return await enhanceConfig(config, destination);
            } catch( e) {
                console.error('unable to connect to the destination', e)
                throw e;
            }
        }
    );

    return instance;

}
