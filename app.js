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

const successPopup = document.getElementById('success-popup');
const closePopup = document.getElementById('close-popup');
const stopAudioButton = document.getElementById('stop-audio-button');

const errorMessage = document.getElementById('error-message');

let synth;
let utterance;
let repeat = 0;

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

async function issueBicycle() {
    console.log('Issuing bicycle');
    // Get user details from local storage
    const userEmail = localStorage.getItem('userEmail');
    const registerNumber = localStorage.getItem('registerNumber');
    const userName = userEmail.split('@')[0];
    const userDisplayName = localStorage.getItem('userDisplayName');
    const issueTime = new Date().toLocaleString();

    // Update RTDB with user details and bicycle issued info
    await database.ref('rides/' + userName).set({
        displayName: userDisplayName,
        email: userEmail,
        registerNumber: registerNumber,
        bicycle: 'bicycle2', // Assuming bicycle2 is issued
        issueTime: issueTime // Issue time
    });
}

function displaySuccessMessage(message) {
    const userEmail = localStorage.getItem('userEmail');
    const userDisplayName = localStorage.getItem('userDisplayName');
    const registerNumber = localStorage.getItem('registerNumber');
    const currentTime = new Date().toLocaleString();

    document.getElementById('popup-user-name').textContent = userEmail.split('@')[0];
    document.getElementById('popup-user-register-number').textContent = registerNumber;
    document.getElementById('popup-message').textContent = message;
    document.getElementById('popup-time').textContent = currentTime;

    successPopup.style.display = 'block';
    stopAudioButton.style.display = 'block';

    // Play audio message
    const audioMessage = `Bicycle issued to ${userDisplayName} on ${currentTime}`;
    playAudioMessage(audioMessage, 2); // Repeat twice
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