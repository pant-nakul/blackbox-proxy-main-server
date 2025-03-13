require('dotenv').config();
const express = require('express');
const axios = require('axios');
const {createServiceOnRender, createCustomDomainRequest, generateCNAMEPointer, generateCNAMEIdentifier, verifyDns} = require("./api")
const {nanoid} = require("nanoid");

const app = express();
const PORT = 4000;
app.use(express.json());

app.post("/", async (req, res) => {
    const { customDomain, appUrl } = req.body;
    const serviceName = nanoid(12);
    // Create the service
    const serviceCreationResponse = await createServiceOnRender(appUrl, serviceName);
    let createCustomDomainResponse = null;
    let response = {}; // Initialize as an empty object to safely spread later
    if (serviceCreationResponse !== null) {
        const serviceId = serviceCreationResponse.service && serviceCreationResponse.service.id;
        if (!serviceId) {
            console.error("Service ID is missing in the creation response");
            return res.status(500).send({ error: "Service creation failed to return a valid service ID." });
        }
        createCustomDomainResponse = await createCustomDomainRequest(serviceId, customDomain);
        if (createCustomDomainResponse !== null && serviceId && createCustomDomainResponse[0]?.id ) {
            response = {
                cnamePointer: generateCNAMEPointer(serviceName),
                cnameIdentifier: generateCNAMEIdentifier(customDomain),
                serviceName: serviceName,
                serviceId: serviceId,
                customDomainId: createCustomDomainResponse[0].id
            };
            res.status(201).json({
                customDomain,
                appUrl,
                ...response,
                createCustomDomainResponse,
                serviceCreationResponse
            });
        } else {
            res.status(11005).json({
                customDomain,
                appUrl,
                ...response,
                createCustomDomainResponse,
                serviceCreationResponse
            });
        }
    }


});

app.post("/verifyDns", async (req, res) => {
    const {serviceId,customDomainId} = req.body;
    const response = await verifyDns(serviceId,customDomainId)
    res.status(200).json({status: response.status, statusText: response.statusText});
})

app.get("/", (req, res) => {
    res.send("Blackbox.ai reverse-proxy-server");
})





app.listen(PORT, () => {
    console.log(`Reverse proxy running on http://localhost:${PORT}`);
})