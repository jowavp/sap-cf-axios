
import axios from 'axios';
import * as xsenv from '@sap/xsenv';

export async function readDestination(destinationName: string) {

    const access_token = await createToken(getDestinationService());
    return getDestination(access_token, getDestinationService());

}

export interface IDestinationConfiguration {
    Name: string;
    Type: string;
    URL: string;
    Authentication: "BasicAuthentication" | "OAuth2UserTokenExchange";
    ProxyType: string;
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
}

interface IDestinationService {
    name: string;
    // url for authentication
    url: string;
    // url for destination configuration
    uri: string;
    clientid: string;
    clientsecret: string;
}

async function getDestination (access_token: string, ds: IDestinationService): Promise<IDestinationConfiguration> {
    const response = await axios({
        url: `${ds.uri}/destination-configuration/v1/destinations/${ds.name}`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${access_token}` },
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

function getDestinationService(): IDestinationService{
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