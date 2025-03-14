require('dotenv').config();
const express = require('express');
const {createServiceOnRender, createCustomDomainRequest, generateCNAMEPointer, generateCNAMEIdentifier, verifyDns} = require("./api")
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const {promises: dns} = require("dns");

const app = express();
const PORT = 4000;
app.use(express.json());
app.use(cors({
    origin: '*', // Change * to specific domain for security
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.options('*', cors());

app.post("/verify", async (req, res) => {
    try {
        console.log(req.body)
        const { domainName, cnamePointer } = req.body;
        console.log(domainName)
        const records = await dns.resolveCname(domainName);
        console.log(records)
        const verified = records.includes(cnamePointer);
        res.status(200).json({ verified });
    } catch (error) {
        console.error("DNS verification error:", error);
        res.status(200).json({ verified: false });
    }
});


app.post("/", async (req, res) => {
    console.log(req.body)
    try {
        const { customDomain, appUrl } = req.body;
        const serviceName = uuidv4();

        // Create the service
        const serviceCreationResponse = await createServiceOnRender(appUrl, serviceName);
        let createCustomDomainResponse = null;
        let responseData = {}; // Initialize as an empty object to safely spread later

        if (serviceCreationResponse === null) {
            return res.status(500).json({ error: "Service creation failed." });
        }

        const serviceId = serviceCreationResponse.service && serviceCreationResponse.service.id;
        if (!serviceId) {
            console.error("Service ID is missing in the creation response");
            return res.status(500).json({ error: "Service creation failed to return a valid service ID." });
        }

        createCustomDomainResponse = await createCustomDomainRequest(serviceId, customDomain);
        if (createCustomDomainResponse !== null && createCustomDomainResponse[0]?.id) {
            responseData = {
                cnamePointer: serviceCreationResponse.service.serviceDetails.url.split("https://")[1],
                cnameIdentifier: generateCNAMEIdentifier(customDomain),
                serviceName: serviceName,
                serviceId: serviceId,
                customDomainId: createCustomDomainResponse[0].id
            };
            return res.status(201).json({
                customDomain,
                appUrl,
                ...responseData,
                createCustomDomainResponse,
                serviceCreationResponse
            });
        } else {
            return res.status(400).json({
                customDomain,
                appUrl,
                ...responseData,
                createCustomDomainResponse,
                serviceCreationResponse,
                error: "Custom domain creation failed."
            });
        }
    } catch (error) {
        console.error("Error in POST /:", error);
        return res.status(500).json({ error: "Internal server error" });
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