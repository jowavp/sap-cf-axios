
import axios, { AxiosRequestConfig } from 'axios';
import { IDestinationConfiguration, IDestinationData } from './destination';
import { readConnectivity } from './connectivity';
// import {https} from 'https';
// import ProxyAgent from 'https-proxy-agent';

export default async function enhanceConfig(config: AxiosRequestConfig, destination: IDestinationData) {
    
   // add auth header
   const {destinationConfiguration} = destination;
   if (destination.authTokens && destination.authTokens[0]){
       if(destination.authTokens[0].error){
           throw( new Error(destination.authTokens[0].error) );
       }
        config.headers = {
            ...config.headers,
            authorization: `${destination.authTokens[0].type} ${destination.authTokens[0].value}`
        }
    }

    if( destinationConfiguration.ProxyType.toLowerCase() === "onpremise" ){
        // connect over the cloud connector
        const connectivityValues = await readConnectivity(destinationConfiguration.CloudConnectorLocationId);

        config = {
            ...config,
            proxy: connectivityValues.proxy,
            headers: {
                ...config.headers,
                ...connectivityValues.headers
            }
        }
    }

    return {
        ...config,
        baseURL: destinationConfiguration.URL
    }
}