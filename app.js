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
const stopAudioButton = document.getElementById('stop-audio');

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
    userDisplayNameSpan.textContent = userDisplayName;

    landingPage.style.display = 'none';
    registerNumberPage.style.display = 'none';
    dashboard.style.display = 'block';

    const map = L.map('map').setView([12.986123, 79.972028], 17); // Centered on Chennai, adjust as needed

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
            { facingMode: 'environment' },
            {
                fps: 10,
                qrbox: 250
            },
            async qrCodeMessage => {
                console.log('QR Code detected:', qrCodeMessage.trim());

                if (qrCodeMessage.trim() === "bicycle2") {
                    console.log('Bicycle detected');
                    await handleBicycleTransaction();
                } else {
                    console.log('Not bicycle2');
                }

                html5QrCode.stop();
            },
            errorMessage => {
                console.error(errorMessage);
                qrResultDiv.innerHTML = `<p>Error: ${errorMessage}</p>`;
            }
        );
    } catch (err) {
        console.error('Failed to start QR code scanner:', err);
        qrResultDiv.innerHTML = `<p>Error: ${err.message}</p>`;
    }
});

async function handleBicycleTransaction() {
    const userEmail = localStorage.getItem('userEmail');
    const registerNumber = localStorage.getItem('registerNumber');
    const userName = userEmail.split('@')[0];
    const userDisplayName = localStorage.getItem('userDisplayName');

    const ridesRef = database.ref('rides/' + userName);
    const rideSnapshot = await ridesRef.once('value');
    const rideData = rideSnapshot.val();

    const currentTime = Date.now();
    const lastScanTime = rideData ? rideData.lastScanTime : 0;
    const timeElapsed = (currentTime - lastScanTime) / 1000;

    if (timeElapsed >= 40) {
        await ridesRef.remove();
        displayReturnMessage();
    } else {
        await ridesRef.set({
            displayName: userDisplayName,
            email: userEmail,
            registerNumber: registerNumber,
            bicycle: 'bicycle2',
            lastScanTime: currentTime
        });
        displaySuccessMessage("Bicycle Issued");
    }
}

function displaySuccessMessage(message) {
    const userEmail = localStorage.getItem('userEmail');
    const userDisplayName = localStorage.getItem('userDisplayName');
    const registerNumber = localStorage.getItem('registerNumber');
    const currentTime = new Date().toLocaleString();

    document.getElementById('popup-user-name').textContent = userDisplayName;
    document.getElementById('popup-user-register-number').textContent = registerNumber;
    document.getElementById('popup-message').textContent = message;
    document.getElementById('popup-time').textContent = currentTime;

    successPopup.style.display = 'block';
    stopAudioButton.style.display = 'block';

    const audioMessage = `Bicycle issued to ${userDisplayName} on ${currentTime}`;
    playAudioMessage(audioMessage, 2);
}

function displayReturnMessage() {
    const userEmail = localStorage.getItem('userEmail');
    const userDisplayName = localStorage.getItem('userDisplayName');
    const registerNumber = localStorage.getItem('registerNumber');
    const currentTime = new Date().toLocaleString();

    document.getElementById('popup-user-name').textContent = userDisplayName;
    document.getElementById('popup-user-register-number').textContent = registerNumber;
    document.getElementById('popup-message').textContent = "Bicycle Returned";
    document.getElementById('popup-time').textContent = currentTime;

    successPopup.style.display = 'block';
    stopAudioButton.style.display = 'block';

    const audioMessage = `Bicycle returned by ${userDisplayName} on ${currentTime}`;
    playAudioMessage(audioMessage, 2);
}

function playAudioMessage(message, repeat) {
    const msg = new SpeechSynthesisUtterance(message);
    window.speechSynthesis.speak(msg);

    msg.onend = () => {
        if (repeat > 1) {
            playAudioMessage(message, repeat - 1);
        }
    };
}

stopAudioButton.addEventListener('click', () => {
    window.speechSynthesis.cancel();
    successPopup.style.display = 'none';
    stopAudioButton.style.display = 'none';
});

window.onload = () => {
    if (localStorage.getItem('userEmail') && localStorage.getItem('registerNumber')) {
        displayDashboard();
    }
};
