const axios = require("axios");
const {nanoid} = require('nanoid');
const token = process.env.RENDER_API_KEY;
module.exports = {
    createServiceOnRender: async (appUrl, serviceName) => {
        if (!token) {
            throw new Error('RENDER_API_KEY environment variable is not set.');
        }

        const endpoint = 'https://api.render.com/v1/services';

        const options = {
            method: 'POST',
            url: endpoint,
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                authorization: `Bearer ${token}`,
            },
            data: {
                type: 'web_service',
                autoDeploy: 'yes',
                serviceDetails: {
                    pullRequestPreviewsEnabled: 'no',
                    previews: { generation: 'off' },
                    runtime: 'node',
                    envSpecificDetails: {
                        buildCommand: 'yarn install',
                        startCommand: 'node server.js',
                    },
                    plan: 'starter',
                    region: 'oregon',
                },
                envVars: [{ key: 'CUSTOM_URL', value: appUrl },{ key: 'PORT', value: 7777 }],
                name: serviceName,
                ownerId: process.env.RENDER_OWNER_ID,
                repo: 'https://github.com/pant-nakul/blackbox-proxy-process',
                branch: 'master',
            },
        };

        try {
            const res = await axios.request(options);
            // Assuming res.data contains the service object with property `service`
            return res.data;
        } catch (error) {
            console.error(
                'Error creating service on Render:',
                error.response ? error.response.data : error.message
            );
            return null;
        }
    },

    createCustomDomainRequest: async (serviceId, customDomainName) => {
        const options = {
            method: 'POST',
            url: `https://api.render.com/v1/services/${serviceId}/custom-domains`,
            headers: {
                accept: 'application/json',
                'content-type': 'application/json',
                authorization: `Bearer ${token}`,
            },
            data: { name: customDomainName },
        };

        try {
            const res = await axios.request(options);
            return res.data;
        } catch (err) {
            console.error("Error occurred: ", err.response ? err.response.data : err.message);
            return null;
        }
    },
    generateCNAMEPointer: (serviceName) => {
        return `${serviceName}.onrender.com`
    },
    generateCNAMEIdentifier: (customDomainName) => {
        return customDomainName.split('.')[0];
    },
    verifyDns : async (serviceId,customDomainId) => {
        let response = null;
        const options = {
            method: 'POST',
            url: `https://api.render.com/v1/services/${serviceId}/custom-domains/${customDomainId}/verify`,
            headers: {
                accept: 'application/json',
                authorization: `Bearer ${token}`
            }
        };

        await axios
            .request(options)
            .then(res => {
                console.log("Response received: ", res);
                response = res
            })
            .catch(err => console.error(err));
        console.log("Response : ", response);
        return response;
    }

}