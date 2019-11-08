import axios, { AxiosProxyConfig } from 'axios';
import * as xsenv from '@sap/xsenv';

export async function readConnectivity() {
    const connectivityService = getService();
    const access_token = await createToken(connectivityService);
    const proxy: AxiosProxyConfig = {
        host: connectivityService.onpremise_proxy_host,
        port: parseInt(connectivityService.onpremise_proxy_port, 10)
    };
    
    return {
        proxy,
        headers: {
            'Proxy-Authorization': `Bearer ${access_token}`
        }
    }

}

async function createToken (service: IConnectivityService): Promise<string> {
    return (await axios({
        url: `${service.url}/oauth/token`,
        method: 'POST',
        responseType: 'json',
        data: `client_id=${encodeURIComponent(service.clientid)}&grant_type=client_credentials`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        auth: {
            username: service.clientid,
            password: service.clientsecret
        }
    })).data.access_token;
};

function getService(): IConnectivityService{
    const {connectivity} = xsenv.getServices({
        destination: {
            tag: 'connectivity'
        }
    });

    if (!connectivity) {
        throw ('No connectivity service available');
    }

    return connectivity;
}

interface IConnectivityService {
    // url for authentication
    url: string;
    // url for destination configuration
    uri: string;
    clientid: string;
    clientsecret: string;

    onpremise_proxy_host: string;
    onpremise_proxy_port: string;
    onpremise_proxy_ldap_port: string;
    onpremise_proxy_rfc_port: string;
    onpremise_socks5_proxy_port: string;
}