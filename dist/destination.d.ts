export declare function readDestination(destinationName: string, authorizationHeader: string): Promise<IDestinationData>;
export interface IDestinationData {
    "owner": {
        "SubaccountId": string;
        "InstanceId": string;
    };
    "destinationConfiguration": IDestinationConfiguration;
    "authTokens": {
        type: string;
        value: string;
        expires_in: string;
        error: string;
    }[];
}
export interface IDestinationConfiguration {
    Name: string;
    Type: string;
    URL: string;
    Authentication: "NoAuthentication" | "BasicAuthentication" | "OAuth2UserTokenExchange" | "OAuth2SAMLBearerAssertion" | "PrincipalPropagation" | "OAuth2ClientCredentials";
    ProxyType: string;
    CloudConnectorLocationId: string;
    Description: string;
    User: string;
    Password: string;
    tokenServiceURLType: string;
    clientId: string;
    saml2_audience: string;
    tokenServiceURL: string;
    clientSecret: string;
    WebIDEUsage: string;
    WebIDEEnabled: string;
}
