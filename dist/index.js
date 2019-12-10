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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const destination_1 = require("./destination");
const axios_1 = __importDefault(require("axios"));
const axios_cookiejar_support_1 = __importDefault(require("axios-cookiejar-support"));
const tough = __importStar(require("tough-cookie"));
const configEnhancer_1 = __importDefault(require("./configEnhancer"));
function SapCfAxios(destination) {
    const instance = createInstance(destination);
    return (req) => __awaiter(this, void 0, void 0, function* () {
        if (req.xsrfHeaderName) {
            // handle x-csrf-Token
            var tokenReq = {
                url: req.url || "",
                method: "options",
                headers: {
                    [req.xsrfHeaderName]: "Fetch"
                }
            };
            var { headers } = yield (yield instance)(tokenReq);
            // req.headers = {...req.headers, [req.xsrfHeaderName]: headers[req.xsrfHeaderName]}
            if (!req.headers)
                req.headers = {};
            req.headers[req.xsrfHeaderName] = headers[req.xsrfHeaderName];
        }
        return (yield instance)(req);
    });
}
exports.default = SapCfAxios;
exports = SapCfAxios;
function createInstance(destinationName, instanceConfig) {
    return __awaiter(this, void 0, void 0, function* () {
        // we will add an interceptor to axios that will take care of the destination configuration
        const instance = axios_1.default.create(instanceConfig);
        // set cookiesupport to enable X-CSRF-Token requests
        axios_cookiejar_support_1.default(instance);
        instance.defaults.jar = new tough.CookieJar();
        instance.defaults.withCredentials = true;
        // we return the destination configuration in the response.
        instance.interceptors.request.use((config) => __awaiter(this, void 0, void 0, function* () {
            // enhance config object with destination information
            const auth = config.headers.Authorization || config.headers.authorization;
            const destination = yield destination_1.readDestination(destinationName, auth);
            return configEnhancer_1.default(config, destination);
        }));
        return instance;
    });
}
