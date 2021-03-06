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
exports.logAxiosError = exports.flushCache = exports.getSapCfAxiosInstance = void 0;
const sap_cf_destconn_1 = require("sap-cf-destconn");
const axios_1 = __importDefault(require("axios"));
const node_cache_1 = __importDefault(require("node-cache"));
const configEnhancer_1 = __importDefault(require("./configEnhancer"));
const instanceCache = new node_cache_1.default({ stdTTL: 12 * 60 * 60, checkperiod: 60 * 60 });
function getSapCfAxiosInstance(destination, instanceConfig, xsrfConfig = 'options') {
    const cacheKey = `${instanceConfig && instanceConfig.subscribedDomain}_$$_${destination}`;
    if (!instanceCache.has(cacheKey)) {
        instanceCache.set(cacheKey, SapCfAxios(destination, instanceConfig, xsrfConfig));
    }
    const instance = instanceCache.get(cacheKey);
    if (!instance) {
        const cfErr = {
            message: 'unable to get the destination instance',
        };
        throw cfErr;
        //throw 'unable to get the destination instance';
    }
    return instance;
}
exports.getSapCfAxiosInstance = getSapCfAxiosInstance;
function flushCache() {
    return instanceCache.flushAll();
}
exports.flushCache = flushCache;
function SapCfAxios(destination, instanceConfig, xsrfConfig = 'options') {
    const instanceProm = createInstance(destination, instanceConfig);
    return (req) => __awaiter(this, void 0, void 0, function* () {
        if (req.xsrfHeaderName && req.xsrfHeaderName !== 'X-XSRF-TOKEN') {
            // handle x-csrf-Token
            const csrfMethod = typeof xsrfConfig === 'string' ? xsrfConfig : (xsrfConfig.method || 'options');
            const csrfUrl = typeof xsrfConfig === 'string' ? req.url : xsrfConfig.url;
            const csrfParams = typeof xsrfConfig === 'string' ? {} : xsrfConfig.params;
            var tokenReq = {
                url: csrfUrl,
                method: csrfMethod,
                headers: {
                    [req.xsrfHeaderName]: "Fetch"
                },
                params: csrfParams
            };
            try {
                const { headers } = yield (yield instanceProm)(tokenReq);
                const cookies = headers["set-cookie"]; // get cookie from request
                console.log("GOT COOKIES:");
                console.log(cookies);
                console.log(headers);
                // req.headers = {...req.headers, [req.xsrfHeaderName]: headers[req.xsrfHeaderName]}
                if (headers) {
                    if (!req.headers)
                        req.headers = {};
                    if (cookies)
                        req.headers.cookie = cookies.join('; ');
                    if (headers[req.xsrfHeaderName]) {
                        req.headers[req.xsrfHeaderName] = headers[req.xsrfHeaderName];
                    }
                }
            }
            catch (err) {
                logAxiosError(err);
                const cfErr = Object.assign(Object.assign({}, err), { 'sap-cf-axios': {
                        message: 'sap-cf-axios: Error while getting token',
                        tokenMethod: tokenReq.method,
                        tokenUrl: tokenReq.url
                    } });
                throw cfErr;
            }
        }
        try {
            return (yield instanceProm)(req);
        }
        catch (err) {
            logAxiosError(err);
            console.error(`sap-cf-axios: Error in request ${req.method} ${req.url}`);
            throw err;
        }
    });
}
exports.default = SapCfAxios;
// exports = SapCfAxios;
function createInstance(destinationName, instanceConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        // we will add an interceptor to axios that will take care of the destination configuration
        const instance = axios_1.default.create(instanceConfig);
        // set cookiesupport to enable X-CSRF-Token requests
        // axiosCookieJarSupport(instance);
        // instance.defaults.jar = new tough.CookieJar();
        // instance.defaults.withCredentials = true;
        // we return the destination configuration in the response.
        instance.interceptors.request.use((config) => __awaiter(this, void 0, void 0, function* () {
            // enhance config object with destination information
            const auth = config.headers.Authorization || config.headers.authorization;
            try {
                const destination = yield sap_cf_destconn_1.readDestination(destinationName, auth, (instanceConfig || {}).subscribedDomain);
                return yield configEnhancer_1.default(config, destination);
            }
            catch (e) {
                console.error('unable to connect to the destination', e);
                throw e;
            }
        }));
        return instance;
    });
}
function logAxiosError(error) {
    if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error(error.response.data);
        console.error(error.response.status);
        console.error(error.response.headers);
    }
    else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.error(JSON.parse(error.request));
    }
    else if (error.message) {
        // Something happened in setting up the request that triggered an Error
        console.error('Error', error.message);
    }
    else {
        try {
            console.error(JSON.parse(error));
        }
        catch (err) {
            console.error(error);
        }
    }
    if (error.config) {
        console.error(error.config);
    }
}
exports.logAxiosError = logAxiosError;
