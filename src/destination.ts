
import axios from 'axios';
import * as xsenv from '@sap/xsenv';

export async function readDestination(destinationName: string, authorizationHeader: string) {

    const access_token = await createToken(getService());
    
    // if we have a JWT token, we send it to the destination service to generate the new authorization header
    const jwtToken = /bearer /i.test(authorizationHeader) ? authorizationHeader.replace(/bearer /i, "") : null;
    return getDestination(access_token, destinationName, getService(), jwtToken);

}

export interface IDestinationConfiguration {
    Name: string;
    Type: string;
    URL: string;
    Authentication: "BasicAuthentication" | "OAuth2UserTokenExchange";
    ProxyType: string;
    CloudConnectorLocationId: string;
    Description: string;

    User: string;
    Password: string;

    tokenServiceURLType: string;
    clientId: string;
    saml2_audience: string;
    tokenServiceURL: string;
    clientSecret: string;

    WebIDEUsage: string;
    WebIDEEnabled: string;

    authTokens:
        {
            type: string;
            value: string;
            expires_in: string;
            error: string;
        }[]
}

interface IDestinationService {
    // url for authentication
    url: string;
    // url for destination configuration
    uri: string;
    clientid: string;
    clientsecret: string;
}

async function getDestination (access_token: string, destinationName: string, ds: IDestinationService, jwtToken: string | null): Promise<IDestinationConfiguration> {
    const response = await axios({
        url: `${ds.uri}/destination-configuration/v1/destinations/${destinationName}`,
        method: 'GET',
        headers: { 
            'Authorization': `Bearer ${access_token}`,
            'X-user-token':  jwtToken
        },
        responseType: 'json',
    });
    return response.data.destinationConfiguration;
}

async function createToken (ds: IDestinationService): Promise<string> {
    return (await axios({
        url: `${ds.url}/oauth/token`,
        method: 'POST',
        responseType: 'json',
        data: `client_id=${encodeURIComponent(ds.clientid)}&grant_type=client_credentials`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        auth: {
            username: ds.clientid,
            password: ds.clientsecret
        }
    })).data.access_token;
};

function getService(): IDestinationService{
    const {destination} = xsenv.getServices({
        destination: {
            tag: 'destination'
        }
    });

    if (!destination) {
        throw ('No destination service available');
    }

    return destination;
}