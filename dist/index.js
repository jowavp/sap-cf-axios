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
exports.flushCache = exports.getSapCfAxiosInstance = void 0;
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
        throw 'unable to get the destination instance';
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
            var tokenReq = {
                url: csrfUrl,
                method: csrfMethod,
                headers: {
                    [req.xsrfHeaderName]: "Fetch"
                }
            };
            try {
                const { headers } = yield (yield instanceProm)(tokenReq);
                const cookies = headers["set-cookie"]; // get cookie from request
                // req.headers = {...req.headers, [req.xsrfHeaderName]: headers[req.xsrfHeaderName]}
                if (headers) {
                    if (!req.headers)
                        req.headers = {};
                    if (cookies)
                        req.headers.cookie = cookies.join('; ');
                    ;
                    req.headers[req.xsrfHeaderName] = headers[req.xsrfHeaderName];
                }
            }
            catch (err) {
                console.log(err);
            }
        }
        return (yield instanceProm)(req);
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
