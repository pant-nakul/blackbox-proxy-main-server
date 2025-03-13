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
    console.log("serviceCreationResponse", serviceCreationResponse);

    let createCustomDomainResponse = null;
    let response = {}; // Initialize as an empty object to safely spread later

    if (serviceCreationResponse !== null) {
        // If the response object directly contains the service ID, use that.
        const serviceId = serviceCreationResponse.service && serviceCreationResponse.service.id;
        if (!serviceId) {
            console.error("Service ID is missing in the creation response");
            return res.status(500).send({ error: "Service creation failed to return a valid service ID." });
        }
        createCustomDomainResponse = await createCustomDomainRequest(serviceId, customDomain);
        if (createCustomDomainResponse !== null) {
            response = {
                cnamePointer: generateCNAMEPointer(serviceName),
                cnameIdentifier: generateCNAMEIdentifier(customDomain),
                serviceName: serviceName,
                serviceId: serviceId,
                customDomainId: createCustomDomainResponse[0].id
            };
        }
    }

    res.status(201).send({
        customDomain,
        appUrl,
        ...response,
        createCustomDomainResponse,
        serviceCreationResponse
    });
});

app.post("/verifyDns", async (req, res) => {
    const {serviceId,customDomainId} = req.body;
    const response = await verifyDns(serviceId,customDomainId)
    res.status(200).json({status: response.data})
})

app.get("/", (req, res) => {
    res.send("Blackbox.ai reverse-proxy-server");
})





app.listen(PORT, () => {
    console.log(`Reverse proxy running on http://localhost:${PORT}`);
})