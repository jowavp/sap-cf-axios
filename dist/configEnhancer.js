"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const sap_cf_destconn_1 = require("sap-cf-destconn");
const tokenCache = {};
function enhanceConfig(config, destination) {
    return __awaiter(this, void 0, void 0, function* () {
        // add auth header
        const destinationConfiguration = destination.destinationConfiguration;
        if (destinationConfiguration.Authentication === "OAuth2ClientCredentials") {
            const clientCredentialsToken = yield createToken(destinationConfiguration);
            config.headers = Object.assign(Object.assign({}, config.headers), { Authorization: `Bearer ${clientCredentialsToken}` });
            delete config.headers.authorization;
        }
        if (destination.authTokens && destination.authTokens[0] && !destination.authTokens[0].error) {
            if (destination.authTokens[0].error) {
                throw (new Error(destination.authTokens[0].error));
            }
            config.headers = Object.assign(Object.assign({}, config.headers), { Authorization: `${destination.authTokens[0].type} ${destination.authTokens[0].value}` });
            delete config.headers.authorization;
        }
        if (destinationConfiguration.ProxyType.toLowerCase() === "onpremise") {
            // connect over the cloud connector
            const authHeader = config.headers['Authorization'] || config.headers['authorization'];
            const connectivityValues = destinationConfiguration.Authentication === "PrincipalPropagation" ?
                yield sap_cf_destconn_1.readConnectivity(destinationConfiguration.CloudConnectorLocationId, authHeader) :
                yield sap_cf_destconn_1.readConnectivity(destinationConfiguration.CloudConnectorLocationId);
            config = Object.assign(Object.assign({}, config), { proxy: connectivityValues.proxy, headers: Object.assign(Object.assign({}, config.headers), connectivityValues.headers) });
            // if it is principal propagation ... remove the original authentication header ...
            // for principal propagation, Proxy-Authorization header will be used to generate the logon ticket 
            if (destinationConfiguration.Authentication === "PrincipalPropagation") {
                delete config.headers.Authorization;
                delete config.headers.authorization;
            }
        }
        return Object.assign(Object.assign({}, config), { baseURL: destinationConfiguration.URL });
    });
}
exports.default = enhanceConfig;
function createToken(dc) {
    return __awaiter(this, void 0, void 0, function* () {
        const scope = convertScope(dc.Scope || dc.scope);
        const audience = dc.oauth_audience;
        let token;
        const cacheKey = `${dc.Name}_${dc.tokenServiceURL}`;
        if (tokenCache[cacheKey] && tokenCache[cacheKey].expires.getTime() > new Date().getTime()) {
            return tokenCache[cacheKey].value;
        }
        if (scope || audience) {
            token = (yield axios_1.default({
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
        }
        else {
            token = (yield axios_1.default({
                url: `${dc.tokenServiceURL}`,
                method: 'POST',
                responseType: 'json',
                data: `client_id=${encodeURIComponent(dc.clientId)}&grant_type=client_credentials`,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                auth: {
                    username: dc.clientId,
                    password: dc.clientSecret
                }
            })).data;
        }
        // cache the token
        const timeObject = new Date();
        tokenCache[cacheKey] = {
            value: token.access_token,
            expires: new Date(timeObject.getTime() + 1000 * token.expires_in)
        };
        return token.access_token;
    });
}
;
function convertScope(scope) {
    if (!scope)
        return null;
    return scope.split(" ").map((sc) => sc.split(':')).reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
    }, {});
}
