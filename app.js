const auth = firebase.auth();
const database = firebase.database();

const googleSigninButton = document.getElementById('google-signin');
const submitRegisterNumberButton = document.getElementById('submit-register-number');
const landingPage = document.getElementById('landing-page');
const registerNumberPage = document.getElementById('register-number-page');
const dashboard = document.getElementById('dashboard');
const userNameSpan = document.getElementById('user-name');
const userRegisterNumberSpan = document.getElementById('user-register-number');
const userDisplayNameSpan = document.getElementById('user-displayName'); // Changed variable name
const qrScanButton = document.getElementById('qr-scan-btn');
const qrResultDiv = document.getElementById('qr-result');
const qrCameraDiv = document.getElementById('qr-camera');

const errorMessage = document.getElementById('error-message');

googleSigninButton.addEventListener('click', () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ hd: 'svce.ac.in' });
    auth.signInWithPopup(provider)
        .then(result => {
            const user = result.user;
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('userDisplayName', user.displayName);
            if (!localStorage.getItem('registerNumber')) {
                landingPage.style.display = 'none';
                registerNumberPage.style.display = 'block';
            } else {
                displayDashboard();
            }
        })
        .catch(error => {
            errorMessage.textContent = error.message;
            console.error(error);
        });
});

submitRegisterNumberButton.addEventListener('click', () => {
    const registerNumber = document.getElementById('register-number').value;
    localStorage.setItem('registerNumber', registerNumber);
    saveUserInfoToFirebase(registerNumber);
    displayDashboard();
});

function displayDashboard() {
    const userEmail = localStorage.getItem('userEmail');
    const userDisplayName = localStorage.getItem('userDisplayName');
    const registerNumber = localStorage.getItem('registerNumber');
    const userName = userEmail.split('@')[0];

    userNameSpan.textContent = userName;
    userRegisterNumberSpan.textContent = registerNumber;
    userDisplayNameSpan.textContent = userDisplayName; // Update to userDisplayNameSpan

    landingPage.style.display = 'none';
    registerNumberPage.style.display = 'none';
    dashboard.style.display = 'block';

    // Initialize Leaflet map
    const map = L.map('map').setView([12.986123, 79.972028], 17); // Centered on Chennai, adjust as needed

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Custom icons for markers
    // const icon1 = L.icon({
    //     iconUrl: 'icon1.png', // Replace 'icon1.png' with your custom icon URL
    //     iconSize: [32, 32], // Size of the icon
    //     iconAnchor: [16, 32], // Point of the icon which will correspond to marker's location
    //     popupAnchor: [0, -32] // Point from which the popup should open relative to the iconAnchor
    // });

    // const icon2 = L.icon({
    //     iconUrl: 'icon2.png', // Replace 'icon2.png' with your custom icon URL
    //     iconSize: [32, 32],
    //     iconAnchor: [16, 32],
    //     popupAnchor: [0, -32]
    // });

    // const icon3 = L.icon({
    //     iconUrl: 'icon3.png', // Replace 'icon3.png' with your custom icon URL
    //     iconSize: [32, 32],
    //     iconAnchor: [16, 32],
    //     popupAnchor: [0, -32]
    // });

    // // Add markers with custom icons
    // L.marker([13.0827, 80.2707], { icon: icon1 }).addTo(map)
    //     .bindPopup('SVCE Campus')
    //     .openPopup();

    // L.marker([13.07, 80.27], { icon: icon2 }).addTo(map)
    //     .bindPopup('Location 2')
    //     .openPopup();

    // L.marker([13.09, 80.26], { icon: icon3 }).addTo(map)
    //     .bindPopup('Location 3')
    //     .openPopup();
}

function saveUserInfoToFirebase(registerNumber) {
    const userEmail = localStorage.getItem('userEmail');
    const userDisplayName = localStorage.getItem('userDisplayName');
    const userName = userEmail.split('@')[0];

    database.ref('users/' + userName).set({
        displayName: userDisplayName,
        email: userEmail,
        registerNumber: registerNumber
    });
}

qrScanButton.addEventListener('click', async () => {
    const html5QrCode = new Html5Qrcode('qr-camera');

    try {
        await html5QrCode.start(
            { facingMode: 'environment' }, // Use rear camera by default
            {
                fps: 10,    // Optional. Default is 10.
                qrbox: 250  // Optional. Default is 250px.
            },
            async qrCodeMessage => {
                console.log('QR Code detected:', qrCodeMessage.trim());
                
                // Check if QR code message is "bicycle2"
                if (qrCodeMessage.trim() === "bicycle2") {
                    console.log('Bicycle detected');
                    // Trigger the function for issuing bicycle
                    await issueBicycle();
                    // Display success message
                    displaySuccessMessage("Bicycle Issued");
                } else {
                    console.log('Not bicycle2');
                }
                
                // Stop scanning after detecting the QR code
                html5QrCode.stop();
            },
            errorMessage => {
                // Callback when error occurs
                console.error(errorMessage);
                qrResultDiv.innerHTML = `<p>Error: ${errorMessage}</p>`;
            }
        );
    } catch (err) {
        console.error('Failed to start QR code scanner:', err);
        qrResultDiv.innerHTML = `<p>Error: ${err.message}</p>`;
    }
});

// Load the Google API client library
gapiInit();

function gapiInit() {
    gapi.load('client:auth2', () => {
        gapi.client.init({
            apiKey: 'AIzaSyCKuoLKspUfEKdkexgO7HD9yb0C32lFI9I',
            clientId: '415169225788-1uouacid37uceg50k84kf7i6engjoe6p.apps.googleusercontent.com',
            discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
            scope: "https://www.googleapis.com/auth/spreadsheets"
        }).then(() => {
            console.log('GAPI client initialized.');
        });
    });
}

function appendRowToSheet(values) {
    gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: '1LmqPOa0S0KW3AbKGDYuh39syfdH9AY5cph6PzjHCXs8',
        range: 'Sheet1!A1', // Change to your desired range
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
            values: [values]
        }
    }).then(response => {
        console.log('Row added to Google Sheets:', response);
    }, error => {
        console.error('Error adding row to Google Sheets:', error);
    });
}
async function issueBicycle() {
    console.log('Issuing bicycle');
    // Get user details from local storage
    const userEmail = localStorage.getItem('userEmail');
    const registerNumber = localStorage.getItem('registerNumber');
    const userName = userEmail.split('@')[0];
    const userDisplayName = localStorage.getItem('userDisplayName');
    const issueTime = new Date().toISOString();
    
    // Update RTDB with user details and bicycle issued info
    await database.ref('rides/' + userName).set({
        displayName: userDisplayName,
        email: userEmail,
        registerNumber: registerNumber,
        bicycle: 'bicycle2', // Assuming bicycle2 is issued
        issueTime: issueTime // Issue time
    });

    // Update Google Sheets with the same details
    appendRowToSheet([userName, userDisplayName, registerNumber, 'bicycle2', issueTime, 'Issued']);
}

function displaySuccessMessage(message) {
    const successPopup = document.getElementById('success-popup');
    successPopup.textContent = message;
    successPopup.style.display = 'block';
}



window.onload = () => {
    if (localStorage.getItem('userEmail') && localStorage.getItem('registerNumber')) {
        displayDashboard();
    }
};
