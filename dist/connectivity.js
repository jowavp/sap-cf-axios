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
const axios_1 = __importDefault(require("axios"));
const xsenv = __importStar(require("@sap/xsenv"));
function readConnectivity(locationId, principalToken) {
    return __awaiter(this, void 0, void 0, function* () {
        const connectivityService = getService();
        const access_token = yield createToken(connectivityService, principalToken);
        const proxy = {
            host: connectivityService.onpremise_proxy_host,
            port: parseInt(connectivityService.onpremise_proxy_port, 10),
            protocol: 'http'
        };
        const result = {
            proxy,
            headers: {
                'Proxy-Authorization': `Bearer ${access_token}`
            }
        };
        if (locationId) {
            result.headers["SAP-Connectivity-SCC-Location_ID"] = locationId;
        }
        return result;
    });
}
exports.readConnectivity = readConnectivity;
function createToken(service, principalToken) {
    return __awaiter(this, void 0, void 0, function* () {
        if (principalToken) {
            const refreshToken = (yield axios_1.default({
                url: `${service.url}/oauth/token`,
                method: 'POST',
                responseType: 'json',
                params: {
                    grant_type: 'user_token',
                    response_type: 'token',
                    client_id: service.clientid
                },
                headers: {
                    'Accept': 'application/json',
                    'Authorization': principalToken
                },
            })).data.refresh_token;
            return (yield axios_1.default({
                url: `${service.url}/oauth/token`,
                method: 'POST',
                responseType: 'json',
                params: {
                    grant_type: 'refresh_token',
                    refresh_token: refreshToken
                },
                headers: {
                    'Accept': 'application/json'
                },
                auth: {
                    username: service.clientid,
                    password: service.clientsecret
                }
            })).data.access_token;
        }
        return (yield axios_1.default({
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
    });
}
;
function getService() {
    const { connectivity } = xsenv.getServices({
        connectivity: {
            tag: 'connectivity'
        }
    });
    if (!connectivity) {
        throw ('No connectivity service available');
    }
    return connectivity;
}
