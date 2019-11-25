
import axios, { AxiosRequestConfig } from 'axios';
import { IDestinationConfiguration, IDestinationData } from './destination';
import { readConnectivity } from './connectivity';

export default async function enhanceConfig(config: AxiosRequestConfig, destination: IDestinationData) {

    // add auth header
    const { destinationConfiguration } = destination;

    if (destinationConfiguration.Authentication === "OAuth2ClientCredentials") {
        const clientCredentialsToken = await createToken(destinationConfiguration);
        config.headers = {
            ...config.headers,
            Authorization: `Bearer ${clientCredentialsToken}`
        }
    }

    if (destination.authTokens && destination.authTokens[0] && !destination.authTokens[0].error) {
        if (destination.authTokens[0].error) {
            throw (new Error(destination.authTokens[0].error));
        }
        config.headers = {
            ...config.headers,
            Authorization: `${destination.authTokens[0].type} ${destination.authTokens[0].value}`
        }
    }

    if (destinationConfiguration.ProxyType.toLowerCase() === "onpremise") {
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
        // for principal propagation, Proxy-Authorization header will be used to generate the logon ticket 
        if (destinationConfiguration.Authentication === "PrincipalPropagation") {
            delete config.headers.Authorization;
            delete config.headers.authorization;
        }
    }

    return {
        ...config,
        baseURL: destinationConfiguration.URL
    }
}


async function createToken(dc: IDestinationConfiguration): Promise<string> {
    return (await axios({
        url: `${dc.tokenServiceURL}`,
        method: 'POST',
        responseType: 'json',
        data: `client_id=${encodeURIComponent(dc.clientId)}&grant_type=client_credentials`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        auth: {
            username: dc.clientId,
            password: dc.clientSecret
        }
    })).data.access_token;
};
