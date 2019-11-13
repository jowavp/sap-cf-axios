# sap-cf-axios

Create an axios instance for destinations in cloud foundry.
The destination will override the baseURL and authentication header in a request interceptor.

currently only authorizationtypes BasicAuthentication and OAuth2UserTokenExchange are supported.

You can address destinations pointing to onPremise systems. The library will handle the proxy configuration.

## Usage
    
    const {SapCfAxios} = require('sap-cf-axios');

    const axios = SapCfAxios("<destinationName>");
    axios({ ...axiosRequestConfig });