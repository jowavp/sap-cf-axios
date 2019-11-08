import {readDestination, IDestinationConfiguration} from './destination'
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import * as tough from 'tough-cookie';
import enhanceConfig from './configEnhancer';

export default function SapCfAxios(destination: string) {
    const instance = createInstance(destination);
    return async<T>(req:AxiosRequestConfig): Promise<AxiosResponse<T>> => { 
        if(req.xsrfHeaderName){
            // handle x-csrf-Token
            var tokenReq:AxiosRequestConfig = {
                url: req.url || "",
                method: "options",
                headers: {
                    [req.xsrfHeaderName]: "Fetch"
                }
            };
            var {headers} = await(await instance)(tokenReq);
            if(!req.headers) req.headers = {};
			req.headers['x-csrf-token'] = headers['x-csrf-token'];
			return (await instance)(req) 	
        }
        return (await instance)(req) 
    }
}

async function createInstance(destination: string) {

    // we will add an interceptor to axios that will take care of the destination configuration
    const destinationConfiguration = await readDestination(destination);

    const instance = axios.create();

    // set cookiesupport to enable X-CSRF-Token requests
    axiosCookieJarSupport(instance);
    instance.defaults.jar = new tough.CookieJar();
    instance.defaults.withCredentials = true;
       
    // we return the destination configuration in the response.
    instance.interceptors.request.use(
        async (config) => {
            // enhance config object with destination information
            return enhanceConfig(config, destinationConfiguration);
        }
    );    

    return instance;
    
}
