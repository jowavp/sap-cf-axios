# sap-cf-axios
A library that creates an axios instance for destinations in SAP cloud foundry.

You can address destinations pointing to Internet and onPremise systems. The library will handle the authentication and proxy configuration. 

If you want to connect with the current user (e.g. with principal propagation) just send the JWT token to the destination in the authorization header.

## Installation
using npm:

```bash
$ npm install -s sap-cf-axios
```

## Example

### None or Basic Authentication
The most simple example with a destination pointing to a service with no authentication or with basic authentication.

```js    
const {SapCfAxios} = require('sap-cf-axios');

const axios = SapCfAxios("<destinationName>");
axios({
    method: 'POST',
    url: '/BookSet',
    data: {
        title: "Using Axios in SAP Cloud Foundry",
        author: "Joachim Van Praet"
    },
    headers: {
        "content-type": "application/json"
    }
});
```

### OAuth2* and Principal Propagation

For connecting to a destination as the current user, we send the current JWT token in the authorization header of the request.
```js
    const {SapCfAxios} = require('sap-cf-axios');
    const axios = SapCfAxios("<destinationName>");
    
    var authorization = req.headers.authorization;
    
    const response = await axios({
            method: 'GET',
            url: '/iwfnd/catalogservice/',
            params: {
                "$format": 'json'
            },
            headers: {
                "content-type": "application/json",
                authorization 
            }
        });
```
> **NOTE:** The JWT Token sent to the backend does not contain the properties name, login_name or mail. If you use principal propagation in the cloud connector you have to use ${email} or ${user_name} in the client certificate template 

### Handle X-CSRF-Token
To handle a POST request to for example CPI you can just set the name of the CSRF-Token header and the library will first do an OPTIONS call to the same URL to fetch the token and will add it to the request.
```js
const {SapCfAxios} = require('sap-cf-axios');
const cpi = SapCfAxios("cpi_destination_name");

var authorization = req.headers.authorization;

const response = await cpi({
        method: 'POST',
        url: '/Bookset',
        headers: {
            "content-type": "application/json"
        },
            data: {
            title: "Using Axios in SAP Cloud Foundry",
            author: "Joachim Van Praet"
        }
        xsrfHeaderName: "x-csrf-token",
        data: {vatNumber},
    });
```
