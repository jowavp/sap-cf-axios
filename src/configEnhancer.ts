
import axios, { AxiosRequestConfig } from 'axios';
import { readConnectivity, IDestinationConfiguration, IDestinationData, IHTTPDestinationConfiguration } from 'sap-cf-destconn';

const tokenCache: {[key: string]: {value: string, expires: Date}} = {

}

export default async function enhanceConfig(config: AxiosRequestConfig, destination: IDestinationData<IHTTPDestinationConfiguration>) {

    // add auth header
    const destinationConfiguration = destination.destinationConfiguration;

    if (destinationConfiguration.Authentication === "OAuth2ClientCredentials") {
        const clientCredentialsToken = await createToken(destinationConfiguration);
        config.headers = {
            ...config.headers,
            Authorization: `Bearer ${clientCredentialsToken}`
        }
        delete config.headers.authorization;
    }

    if (destination.authTokens && destination.authTokens[0] && !destination.authTokens[0].error) {
        if (destination.authTokens[0].error) {
            throw (new Error(destination.authTokens[0].error));
        }
        config.headers = {
            ...config.headers,
            Authorization: `${destination.authTokens[0].type} ${destination.authTokens[0].value}`
        }
        delete config.headers.authorization;
    }

    if (destinationConfiguration.ProxyType.toLowerCase() === "onpremise") {
        // connect over the cloud connector
        const authHeader = config.headers['Authorization'] || config.headers['authorization'];
        const connectivityValues =
            destinationConfiguration.Authentication === "PrincipalPropagation" ?
                await readConnectivity(destinationConfiguration.CloudConnectorLocationId, authHeader) :
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

async function createToken(dc: IHTTPDestinationConfiguration): Promise<string> {
    const scope = convertScope(dc.Scope || dc.scope);
    const audience = dc.oauth_audience;
    let token;

    const cacheKey = `${dc.Name}_${dc.tokenServiceURL}`;
    if( tokenCache[cacheKey] && tokenCache[cacheKey].expires.getTime() > new Date().getTime() ){
        return tokenCache[cacheKey].value;
    }

    if(scope || audience){
        token = (await axios({
            url: `${dc.tokenServiceURL}`,
            method: 'POST',
            responseType: 'json',
            data: {
                "grant_type": "client_credentials",
                scope,
                audience
            },
            headers: { 'Content-Type': 'application/json' },
            auth: {
                username: dc.clientId,
                password: dc.clientSecret
            }
        })).data;
    } else {
        token = (await axios({
            url: `${dc.tokenServiceURL}`,
            method: 'POST',
            responseType: 'json',
            data: `client_id=${encodeURIComponent(dc.clientId)}&client_secret=${encodeURIComponent(dc.clientSecret)}&grant_type=client_credentials`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            auth: {
                username: dc.clientId,
                password: dc.clientSecret
            }
        })).data
    }

    // cache the token
    const timeObject = new Date(); 
    

    tokenCache[cacheKey] = {
        value: token.access_token,
        expires: new Date(timeObject.getTime() + 1000 * token.expires_in)
    }

    return token.access_token;
};

function convertScope (scope?: String) {
    if(!scope) return null;
    return scope.split(" ").map<string[]>(
        (sc) => sc.split(':')
    ).reduce<{[key: string]: string}>(
        (acc, [key, value]) => {
            acc[key] = value;
            return acc;
        }, {}
    )

}
