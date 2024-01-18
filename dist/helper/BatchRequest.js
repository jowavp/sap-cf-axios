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
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunkArray = void 0;
const uuid_1 = require("uuid");
const maxNumberOfBatchRequests = 40;
function waitFor(milliSeconds) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve) => {
            setTimeout(() => resolve(true), milliSeconds);
        });
    });
}
function chunkArray(arr, size = maxNumberOfBatchRequests) {
    return arr.length > size
        ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)]
        : [arr];
}
exports.chunkArray = chunkArray;
class BatchRequest {
    constructor(reqs, logger, size = maxNumberOfBatchRequests) {
        this.logger = logger;
        this.requests = reqs.length > 0 ? chunkArray(reqs, size) : [];
        this.batchRequests = this.generateBatchRequests();
    }
    generateBatchRequests() {
        return this.requests.map((reqs) => {
            const batchId = (0, uuid_1.v4)();
            // at this point, no changesets are supported, only GET calls.
            const payload = reqs
                .map((r) => `--batch_${batchId}
Content-Type: application/http
Content-Transfer-Encoding:binary

${r.method || "GET"} ${r.url} HTTP/1.1

${r.body || ""}`)
                .join("\n");
            return {
                contentType: `multipart/mixed; boundary=batch_${batchId}`,
                payload: `${payload}
--batch_${batchId}--`,
            };
        });
    }
    doBatchRequests(url, axiosInstance, // <T>(req: AxiosRequestConfig) => Promise<AxiosResponse<T>>,
    doWait = true, additionalHeaders) {
        return __awaiter(this, void 0, void 0, function* () {
            let wait = Promise.resolve(true);
            let responses = new Map();
            for (let i = 0; i < this.batchRequests.length && (yield wait); i++) {
                try {
                    const result = yield axiosInstance({
                        method: "POST",
                        url,
                        data: this.batchRequests[i].payload,
                        headers: Object.assign({ "Content-Type": this.batchRequests[i].contentType }, additionalHeaders),
                    });
                    // next call for LMS can be done in 500 mseconds ... start counting
                    if (doWait)
                        wait = waitFor(500);
                    this.getBatchResponses(result).forEach((resp, idx) => {
                        responses.set(this.requests[i][idx], resp);
                    });
                }
                catch (error) {
                    throw error;
                }
            }
            return responses;
        });
    }
    doBatchRequestsParallel(url, axiosInstance, additionalHeaders) {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            const requests = this.batchRequests.map((b) => axiosInstance({
                method: "POST",
                url,
                data: b.payload,
                headers: Object.assign({ "Content-Type": b.contentType }, additionalHeaders),
            }));
            try {
                return (yield Promise.all(requests)).reduce((acc, resp, i) => {
                    this.getBatchResponses(resp).forEach((resp, idx) => {
                        acc.set(this.requests[i][idx], resp);
                    });
                    return acc;
                }, new Map());
            }
            catch (error) {
                (_b = (_a = this.logger) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.call(_a, error);
                throw error;
            }
        });
    }
    getBatchResponses(resp) {
        var _a;
        const match = (resp.headers["content-type"] || "")
            .replace(/\s/g, "")
            .match(/^multipart\/mixed;boundary=(.*)$/i);
        let boundary = match && match.pop();
        if (!boundary) {
            throw `This is not a response of a batch request`;
        }
        return (_a = resp.data) === null || _a === void 0 ? void 0 : _a.split(`--${boundary}`).filter((t) => t && !t.startsWith("--")).map((t) => t.split(t.includes("\r\n") ? "\r\n" : "\n").filter((t) => t)).map((a) => a.slice(-1)[0]).map((j) => JSON.parse(j));
    }
}
exports.default = BatchRequest;
