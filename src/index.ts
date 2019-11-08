import {readDestination, IDestinationConfiguration} from './destination'
import axios from 'axios';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import * as tough from 'tough-cookie';
import enhanceConfig from './configEnhancer';

export default async function sapCfAxios(destination: string | IDestinationConfiguration) {

    // we will add an interceptor to axios that will take care of the destination configuration
    const destinationConfiguration = typeof destination === 'string' ? await readDestination(destination): destination;

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


