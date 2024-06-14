const auth = firebase.auth();
const database = firebase.database();

const googleSigninButton = document.getElementById('google-signin');
const submitRegisterNumberButton = document.getElementById('submit-register-number');
const landingPage = document.getElementById('landing-page');
const registerNumberPage = document.getElementById('register-number-page');
const dashboard = document.getElementById('dashboard');
const userNameSpan = document.getElementById('user-name');
const userRegisterNumberSpan = document.getElementById('user-register-number');
const userDisplayNameSpan = document.getElementById('user-displayName');
const qrScanButton = document.getElementById('qr-scan-btn');
const qrResultDiv = document.getElementById('qr-result');
const qrCameraDiv = document.getElementById('qr-camera');
const getPassButton = document.getElementById('get-pass-button');

const successPopup = document.getElementById('success-popup');
const closePopup = document.getElementById('close-popup');
const stopAudioButton = document.getElementById('stop-audio-button');

const errorMessage = document.getElementById('error-message');

let synth;
let utterance;
let repeat = 0;
let scannedQrCode = "";

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
    userDisplayNameSpan.textContent = userDisplayName;

    landingPage.style.display = 'none';
    registerNumberPage.style.display = 'none';
    dashboard.style.display = 'block';

    // Initialize Leaflet map
    const map = L.map('map').setView([12.986123, 79.972028], 17);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
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
    // Show the "Get the Pass" button
    getPassButton.style.display = 'block';

    const html5QrCode = new Html5Qrcode('qr-camera');

    try {
        await html5QrCode.start(
            { facingMode: 'environment' }, // Use rear camera by default
            {
                fps: 10,    // Optional. Default is 10.
                qrbox: 250  // Optional. Default is 250px.
            },
            qrCodeMessage => {
                console.log('QR Code detected:', qrCodeMessage.trim());
                scannedQrCode = qrCodeMessage.trim();

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

getPassButton.addEventListener('click', async () => {
    const bicycleMatch = scannedQrCode.match(/bicycle(\d+)(out)?/);
    if (bicycleMatch) {
        const bicycleNumber = bicycleMatch[1];
        const isReturning = Boolean(bicycleMatch[2]);
        const userEmail = localStorage.getItem('userEmail');
        const registerNumber = localStorage.getItem('registerNumber');
        const userName = userEmail.split('@')[0];
        const userDisplayName = localStorage.getItem('userDisplayName');
        const currentTime = new Date().toLocaleString();
        const status = isReturning ? "returned" : "issued";

        // Push user details and pass info as a new entry under 'passes'
        await database.ref('passes/' + userName).push({
            displayName: userDisplayName,
            email: userEmail,
            registerNumber: registerNumber,
            bicycle: `bicycle${bicycleNumber}`,
            time: currentTime, // Time of getting the pass
            status: status // Issue or return status
        });

        // Display success message
        displaySuccessMessage(`Bicycle ${bicycleNumber} ${status.charAt(0).toUpperCase() + status.slice(1)}`, status);

        // Hide the "Get the Pass" button
        getPassButton.style.display = 'none';
        scannedQrCode = ""; // Reset scanned QR code
    } else {
        displaySuccessMessage("Invalid QR Code", "error");
    }
});

function displaySuccessMessage(message, status) {
    const userEmail = localStorage.getItem('userEmail');
    const registerNumber = localStorage.getItem('registerNumber');
    const currentTime = new Date().toLocaleString();

    document.getElementById('popup-user-name').textContent = userEmail.split('@')[0];
    document.getElementById('popup-user-register-number').textContent = registerNumber;
    document.getElementById('popup-message').textContent = message;
    document.getElementById('popup-time').textContent = currentTime;

    // Set background color based on status
    if (status === "issued") {
        successPopup.style.backgroundColor = 'red';
    } else if (status === "returned") {
        successPopup.style.backgroundColor = 'green';
    } else {
        successPopup.style.backgroundColor = 'gray'; // Default color for errors or other messages
    }

    successPopup.style.display = 'block';
    stopAudioButton.style.display = 'block';

    // Play audio message
    const audioMessage = `${message} at ${currentTime}`;
    playAudioMessage(audioMessage, 1); // Play once
}

function playAudioMessage(message, repeatCount) {
    if ('speechSynthesis' in window) {
        synth = window.speechSynthesis;
        utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'en-US';

        repeat = 0;
        utterance.onend = () => {
            repeat += 1;
            if (repeat < repeatCount) {
                synth.speak(utterance);
            } else {
                stopAudioButton.style.display = 'none'; // Hide the button once done
            }
        };

        // Start the first utterance
        synth.speak(utterance);
    } else {
        console.error('Speech Synthesis API is not supported in this browser.');
    }
}

stopAudioButton.addEventListener('click', () => {
    if (synth) {
        synth.cancel();
        stopAudioButton.style.display = 'none'; // Hide the button after stopping audio
    }
});

closePopup.addEventListener('click', () => {
    successPopup.style.display = 'none';
});

window.onload = () => {
    if (localStorage.getItem('userEmail') && localStorage.getItem('registerNumber')) {
        displayDashboard();
    }
};
