const
    { log, logJSON } = require("./util"),

    nconf = require("nconf"),
    oauth2 = require("simple-oauth2"),
    Wreck = require('@hapi/wreck');

const client = nconf.get("client");

const auth = oauth2.create({
    client: nconf.get("client"),
    auth: {
        tokenHost: "https://exist.io",
        tokenPath: "/oauth2/access_token",
        authorizePath: "/oauth2/authorize"
    }
});

const oauthConf = {
    redirect_uri: "https://localhost/",
    scope: "read+write+append"
};

const methods = {};

methods.getCode = () => {
    const authUrl = auth.authorizationCode.authorizeURL(oauthConf);

    log(authUrl);
};

methods.getToken = async () => {
    const code = nconf.get("code")

    const tokenConfig = {
        code,
        ...oauthConf
    };

    try {
        const result = await auth.authorizationCode.getToken(tokenConfig);
        const accessToken = auth.accessToken.create(result);
    } catch (error) {
        log('Access Token Error', error.message);
    }
};

const initExistClient = () =>
    Wreck.defaults({
        baseUrl: "https://exist.io/api/1/",
        headers: {
            "Authorization": `Bearer ${nconf.get("token:access_token")}`
        }
    });

const existRequest = async (method, endpoint, body) => {
    const client = initExistClient();

    const options = {};
    if(body)
        options.payload = body;

    try {
        const response = await client.request(method, endpoint, options);
        const body = await Wreck.read(response, {
            json: true
        });

        return body;
    } catch(e) {
        throw new Error(e);
    }
};

methods.getProfile = async () => {
    const profile = await existRequest("GET", "users/$self/today/");

    logJSON(profile);
};

methods.listOwnedAttributes = async () => {
    const ownedAttrs = await existRequest("GET", "attributes/owned/");

    logJSON(ownedAttrs);
};

methods.acquireAttributes = async () => {
    const attrsToAcquire = nconf.get("attrs").split(',');
    log(attrsToAcquire);

    const body = attrsToAcquire.map(attr => ({
        name: attr,
        active: true
    }));

    logJSON(body);

    const result = await existRequest("POST", "attributes/acquire/", body);

    logJSON(result);
};

methods.appendTags = async () => {
    const tags = nconf.get("tags").split(',');

    const body = tags.map(tag => ({
        value: tag
    }));

    return methods.appendTagsEndpoint(body);
};

methods.appendTagsEndpoint = async tags => {
    const body = await existRequest("POST", "attributes/custom/append/", tags);

    const { failed, success } = body;

    if(!success) {
        logJSON(body);
        throw new Error("Unknown error!");
    }

    log(`Result: ${success.length} suceeded, ${failed.length} failed`);
    if(failed.length)
        logJSON(failed);
};

methods.updateAttributes = async attrs => {
    const body = await existRequest("POST", "attributes/update/", attrs);

    const { failed, success } = body;

    if(!success) {
        logJSON(body);
        throw new Error("Unknown error!");
    }

    log(`Result: ${success.length} suceeded, ${failed.length} failed`);
    if(failed.length)
        logJSON(failed);
};

module.exports = methods;
