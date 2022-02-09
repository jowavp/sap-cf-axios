import { readDestination, IHTTPDestinationConfiguration } from 'sap-cf-destconn'
import axios, { AxiosPromise, AxiosRequestConfig, AxiosResponse, Method } from 'axios';
import NodeCache from 'node-cache';

import enhanceConfig from './configEnhancer';

declare var exports: any;
const instanceCache = new NodeCache({ stdTTL: 12 * 60 * 60, checkperiod: 60 * 60 });

export interface SapCFAxiosRequestConfig extends AxiosRequestConfig {
    subscribedDomain?: string;
}

export {AxiosResponse, AxiosRequestConfig} from 'axios';

export function getSapCfAxiosInstance (destination: string, instanceConfig?: SapCFAxiosRequestConfig, xsrfConfig: Method | {method: Method, url: string, params: object} = 'options') {
    const cacheKey = `${instanceConfig && instanceConfig.subscribedDomain}_$$_${destination}`;
    if(!instanceCache.has(cacheKey)){
      instanceCache.set(cacheKey, SapCfAxios(destination, instanceConfig, xsrfConfig));
    }
    const instance = instanceCache.get<<T>(req: AxiosRequestConfig) => Promise<AxiosResponse<T>>>(cacheKey);
    if(!instance){
        
        const cfErr = {
            message: 'unable to get the destination instance',
        }
        throw cfErr;
        //throw 'unable to get the destination instance';
    }
    return instance;
  }

  export function flushCache () {
      return instanceCache.flushAll();
  }

export default function SapCfAxios(destination: string, instanceConfig?: SapCFAxiosRequestConfig, xsrfConfig: Method | {method: Method, url: string, params: object} = 'options') {
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
                    if (cookies) req.headers.cookie = cookies.join('; ');
                    if(headers[req.xsrfHeaderName]){
                        req.headers[req.xsrfHeaderName] = headers[req.xsrfHeaderName];
                    }
                }
            } catch (err) {
                logAxiosError(err);
                if (err instanceof Error) {
                    throw {
                        ...err,
                        'sap-cf-axios': {
                            message: 'sap-cf-axios: Error while getting token',
                            tokenMethod: tokenReq.method,
                            tokenUrl: tokenReq.url
                        }
                    }
                }
                throw err;                
            }
            
        }
        try{
            return (await instanceProm)(req) as Promise<AxiosResponse<T>>
        } catch (err) {
            logAxiosError(err);
            console.error(`sap-cf-axios: Error in request ${req.method} ${req.url}`);
            throw err;
        }
    }
}
// exports = SapCfAxios;

async function createInstance(destinationName: string, instanceConfig?: SapCFAxiosRequestConfig) {

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
            const auth = <string | undefined>(config.headers?.Authorization || config.headers?.authorization);
            try{
                const destination = await readDestination<IHTTPDestinationConfiguration>(destinationName, auth, (instanceConfig || {}).subscribedDomain);
                return await enhanceConfig(config, destination);
            } catch( e) {
                console.error('unable to connect to the destination', e)
                throw e;
            }
        }
    );

    return instance;

}

export function logAxiosError (error) {
    if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error(error.response.data);
        console.error(error.response.status);
        console.error(error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.error( JSON.parse(error.request) );
      } else if (error.message) {
        // Something happened in setting up the request that triggered an Error
        console.error('Error', error.message);
      } else {
          try {
            console.error( JSON.parse(error) );
          } catch (err) {
            console.error(error);  
          }
      }
      if (error.config) {
        console.error(error.config);
      }
}
