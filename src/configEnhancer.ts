
import axios, { AxiosRequestConfig } from 'axios';
import { IDestinationConfiguration } from './destination';
import { readConnectivity } from './connectivity';
// import {https} from 'https';
// import ProxyAgent from 'https-proxy-agent';

export default async function enhanceConfig(config: AxiosRequestConfig, destination: IDestinationConfiguration) {
    
    switch(destination.Authentication){
        case "BasicAuthentication":
            config = { 
                ...config,
                ...(await propertiesForBasicAuthentication(destination))
            }
            break;
        case "OAuth2UserTokenExchange":
            config = { 
                ...config,
                ...(await propertiesForOAuth2UserTokenExchange(destination, config))
            }
            break;
    }

    if( destination.ProxyType.toLowerCase() === "onpremise" ){
        // connect over the cloud connector
        const connectivityValues = await readConnectivity(destination.CloudConnectorLocationId);

        
        /*
        var proxyOpts = url.parse(`http://${connectivityValues.proxy.host}:${}`);
        proxyOpts.headers = {
        'Proxy-Authentication': 'Basic ' + new Buffer('username:password').toString('base64')
        };
        var proxy = new ProxyAgent(proxyOpts);
        */

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
        baseURL: destination.URL
    }
}

async function propertiesForBasicAuthentication(destination: IDestinationConfiguration) {
    return {
        auth: {
            username: destination.User,
            password: destination.Password
        }
    }
}

async function propertiesForOAuth2UserTokenExchange(destination: IDestinationConfiguration, config: AxiosRequestConfig){
    // the current user token should be addad in the original authorization header
    if (!config.headers["Authorization"]){
        throw ('No JWT found in request');
    }

    const refreshTokenResponse = await axios({
        url: destination.tokenServiceURL,
        method: 'POST',
        headers: {
            'Authorization': config.headers["Authorization"],
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: `client_id=${destination.clientId}&grant_type=user_token&scope=openid&token_format=jwt`,
    });
    // Exchange refresh token for access token
    const accessToken = (await axios({
        url: destination.tokenServiceURL,
        method: 'POST',
        auth: {
            username: destination.clientId,
            password: destination.clientSecret
        },
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: `grant_type=refresh_token&refresh_token=${refreshTokenResponse.data.refresh_token}`,
    })).data.access_token;

    return {
        headers: {
            ...config.headers,
            'Authorization': `Bearer ${accessToken}`
        }
    }
}