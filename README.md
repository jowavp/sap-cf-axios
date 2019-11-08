# sap-cf-axios

Create an axios instance for destinations in cloud foundry.
The destination will override the baseURL and authentication header in a request interceptor.

currently only authorizationtypes BasicAuthentication and OAuth2UserTokenExchange are supported.

## Usage
    import SapCfAxios from 'sap-cf-axios'

    const axios = SapCfAxios("<destinationName>");
    axios({ ...axiosRequestConfig });