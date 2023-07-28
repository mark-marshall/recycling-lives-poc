// Import packages
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sdk = require('api')('@samsara-dev-rel/v2019.01.01#bz2k28lk313y4u');
sdk.auth('');
sdk.server('https://api.samsara.com');

// App init
const api = express();
api.use(express.json());
api.use(bodyParser.urlencoded({ extended: false }));
api.use(cors())

// Fake DB Consts
const documentTypes = [{
    documentTypeId: 1,
    name: "Police Collection",
    instructions: "Please complete the Police Collection Document",
    samsaraID: "2769cb52-d8fa-4bd9-90e9-982867327947"
},
{
    documentTypeId: 2,
    name: "Standard Collection",
    instructions: "Please complete the Standard Collection Document",
    samsaraID: "2769cb52-d8fa-4bd9-90e9-982867327947"
}, {
    documentTypeId: 3,
    name: "Commercial Collection",
    instructions: "Please complete the Commercial Collection Document",
    samsaraID: "2769cb52-d8fa-4bd9-90e9-982867327947"
}]

const vehicleInventory = [
    {
        vehicleId: 1234,
        documentType: 1
    }, {
        vehicleId: 5678,
        documentType: 2
    },
    {
        vehicleId: 9112,
        documentType: 1
    }, {
        vehicleId: 3456,
        documentType: 3
    }, {
        vehicleId: 7891,
        documentType: 2
    }, {
        vehicleId: 0123,
        documentType: 1
    }
]

// ======= EP1: Sense check endpoint =======
api.get('/', (req, res) => {
    const response = { "Status": "Alive 🪄" }
    res.json(response);
});

// ======= EP2: Receive driver message =======
api.post('/driverMessage', async (req, res) => {
    const { details, driver } = req.body.event;
    const driverMessage = details.split("Message: ")
    const vehicleId = driverMessage[1].split(" ")[0]
    const driverId = driver.id;
    let replyMessage = '';

    console.log(`= Received Driver Message, lookup request for ${vehicleId}`)

    if (vehicleId?.length !== 4) {
        replyMessage = 'Invalid vehicle id. ID should be 4 characters'
    } else {
        const vehicleFound = vehicleInventory.find(vehicle => vehicle.vehicleId === parseInt(vehicleId))
        if (vehicleFound) {
            console.log("= Vehicle found")
            const { instructions } = documentTypes.find(documentType => documentType.documentTypeId === vehicleFound.documentType)
            replyMessage = instructions;
        } else {
            console.log("= Unable to find vehicle")
            replyMessage = 'Unable to find vehicle. Please call the office on +447338338338'
        }
    }

    console.log('= Sending message through Driver App')
    await sdk.v1createMessages({ driverIds: [driverId], text: replyMessage })

    console.log("COMPLETE")
    res.status(200);
});

// ======= EP2: Receive document submission =======
api.post('/driverDocument', async (req, res) => {

    const { details } = req.body.event;
    const documentId = details.split("(ID: ")[1].slice(0, -1)
    // Fetch the document
    const document = await sdk.getDocument({ id: documentId })
    // Parse response
    const documentData = document.data.data;
    const { documentType, driver, fields, routeStop } = documentData;
    // Check if it is a vehicle lookup document
    if (documentType.id === 'f431bd17-9d78-4d6f-bd15-433e8837ccf7') {
        const vehicleId = fields[0].value.stringValue
        const vehicleFound = vehicleInventory.find(vehicle => vehicle.vehicleId === parseInt(vehicleId))
        // Lookup the vehicle to determine which doc type to dynamically render
        if (vehicleFound) {
            console.log("VEHICLE FOUND")
            const { samsaraID } = documentTypes.find(documentType => documentType.documentTypeId === vehicleFound.documentType)
            // Create new route stop task
            await sdk.postDocument({
                fields: [{ type: 'number', label: 'Vehicle ID', value: { numberValue: parseInt(vehicleId) } },
                { type: 'photo', label: 'Photo number 1' },
                { type: 'photo', label: 'Photo number 2' },
                { type: 'photo', label: 'Photo number 3' },
                { type: 'photo', label: 'Photo number 4' }
                ],
                documentTypeId: samsaraID,
                driverId: driver.id,
                routeStopId: routeStop.id
            })

        }
    }
    else {
        // Create new placeholder document lookup in case needed
        sdk.postDocument({
            fields: [{ type: 'string', label: 'Please enter the ID of the vehicle' },
            {
                type: 'multipleChoice', label: 'Are you going to load this vehicle?', value: {
                    multipleChoiceValue: [{ selected: false, value: 'Yes' }, { selected: false, value: 'No' }]
                },
            }
            ],
            documentTypeId: "f431bd17-9d78-4d6f-bd15-433e8837ccf7",
            driverId: driver.id,
            routeStopId: routeStop.id
        })
    }

    console.log("COMPLETE")
    res.status(200);
});

module.exports = api;
