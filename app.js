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

let lastScanTime = null;
let issuedBicycleKey = null; // Store the key of the issued bicycle

qrScanButton.addEventListener('click', async () => {
    const currentTime = new Date().getTime();
    const returnThreshold = 40000; // 40 seconds
    if (lastScanTime && (currentTime - lastScanTime < returnThreshold)) {
        // User scans within 40 seconds, issue bicycle
        const issuedWithinThreshold = await issueBicycle();
        if (issuedWithinThreshold) {
            displaySuccessMessage("Bicycle Issued");
        } else {
            console.log('Failed to issue bicycle.');
        }
    } else {
        // User scans after 40 seconds, return bicycle
        if (issuedBicycleKey) {
            await returnBicycle();
            displaySuccessMessage("Bicycle Returned");
            issuedBicycleKey = null; // Reset issued bicycle key
        } else {
            console.log('No bicycle issued to return.');
        }
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

    // Generate a random 5-digit number
    const randomKey = Math.floor(10000 + Math.random() * 90000);

    // Push user details and bicycle issued info as a new entry under 'rides'
    await database.ref('rides/' + userName + '/' + randomKey).set({
        displayName: userDisplayName,
        email: userEmail,
        registerNumber: registerNumber,
        bicycle: 'bicycle2', // Assuming bicycle2 is issued
        issueTime: issueTime // Issue time
    });

    issuedBicycleKey = randomKey; // Update issued bicycle key
    lastScanTime = new Date().getTime(); // Update last scan time

    return true;
}

async function returnBicycle() {
    console.log('Returning bicycle');
    // Get user details from local storage
    const userEmail = localStorage.getItem('userEmail');
    const userName = userEmail.split('@')[0];

    // Update the returned time for the issued bicycle
    await database.ref('rides/' + userName + '/' + issuedBicycleKey).update({
        returnTime: new Date().toLocaleString()
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