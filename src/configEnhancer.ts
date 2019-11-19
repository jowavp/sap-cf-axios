
import axios, { AxiosRequestConfig } from 'axios';
import { IDestinationConfiguration, IDestinationData } from './destination';
import { readConnectivity } from './connectivity';

export default async function enhanceConfig(config: AxiosRequestConfig, destination: IDestinationData) {
    
   // add auth header
   const {destinationConfiguration} = destination;
   if (destination.authTokens && destination.authTokens[0]){
       if(destination.authTokens[0].error){
           throw( new Error(destination.authTokens[0].error) );
       }
        config.headers = {
            ...config.headers,
            Authorization: `${destination.authTokens[0].type} ${destination.authTokens[0].value}`
        }
    }

    if( destinationConfiguration.ProxyType.toLowerCase() === "onpremise" ){
        // connect over the cloud connector
        const connectivityValues = 
        destinationConfiguration.Authentication === "PrincipalPropagation" ? 
            await readConnectivity(destinationConfiguration.CloudConnectorLocationId, config.headers['Authorization']) :
            await readConnectivity(destinationConfiguration.CloudConnectorLocationId);
        config = {
            ...config,
            proxy: connectivityValues.proxy,
            headers: {
                ...config.headers,
                ...connectivityValues.headers
            }
        }
        // if it is principal propagation ... remove the original authentication header ...
        if(destinationConfiguration.Authentication === "PrincipalPropagation"){
            delete config.headers.Authorization;
            delete config.headers.authorization;
        }
    }

    return {
        ...config,
        baseURL: destinationConfiguration.URL
    }
}