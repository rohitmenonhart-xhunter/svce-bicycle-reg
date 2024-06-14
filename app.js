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
let map;
let userMarker;
let route;
let markers = [];
const customMarkers = [
    { lat:12.984534, lng: 79.973497, title: 'Marker 1', icon: 'stand1.png' },
    { lat:12.987377, lng: 79.970702, title: 'Marker 2', icon: 'stand2.png' },
    { lat:12.988415, lng: 79.970793, title: 'Marker 3', icon: 'stand3.png' },
    { lat:12.988805, lng: 79.974440, title: 'Marker 4', icon: 'stand4.png' }
];
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
    map = L.map('map').setView([12.986123, 79.972028], 17);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    // Add custom markers to the map
    customMarkers.forEach(marker => {
        const customIcon = L.icon({
        iconUrl: marker.icon,
        iconSize: [69, 69],
        iconAnchor: [19, 38],
        popupAnchor: [0, -38]
    });
    
    
        const customMarker = L.marker([marker.lat, marker.lng], { icon: customIcon })
            .addTo(map)
            .bindPopup(marker.title);
        markers.push(customMarker);
    });

    // Get user's live location
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(position => {
            const { latitude, longitude } = position.coords;
            const userLatLng = L.latLng(latitude, longitude);

            if (!userMarker) {
                userMarker = L.marker(userLatLng, { icon: L.icon({
                    iconUrl: 'icon.png', // Provide a path to your custom icon if needed
                    iconSize: [79, 79],
                    iconAnchor: [50, 55]
                })}).addTo(map).bindPopup('You are here');
            } else {
                userMarker.setLatLng(userLatLng);
            }

            map.setView(userLatLng);

            // Find the nearest custom marker
            let nearestMarker = markers[0];
            let minDistance = userLatLng.distanceTo(nearestMarker.getLatLng());

            markers.forEach(marker => {
                const distance = userLatLng.distanceTo(marker.getLatLng());
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestMarker = marker;
                }
            });

            // Draw route to the nearest marker
            if (route) {
                map.removeControl(route);
            }
            route = L.Routing.control({
                waypoints: [userLatLng, nearestMarker.getLatLng()],
            createMarker: () => null,
            routeWhileDragging: false,
            addWaypoints: false,
            draggableWaypoints: false,
            show: false, // Suppresses the routing panel display
            }).addTo(map);
        }, error => {
            console.error(error);
        });
    } else {
        console.error('Geolocation is not supported by this browser.');
    }
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
            }
        );
    } catch (err) {
        console.error('Failed to start QR code scanner:', err);
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

        // Get user's current location
        let userLatLng;
        if (userMarker) {
            userLatLng = userMarker.getLatLng();
        } else {
            console.error('User location not available.');
            return;
        }

        const locationUrl = `https://google.com/maps?q=${userLatLng.lat},${userLatLng.lng}`;

        // Push user details and pass info as a new entry under 'passes'
        await database.ref('passes/' + userName).push({
            displayName: userDisplayName,
            email: userEmail,
            registerNumber: registerNumber,
            bicycle: `bicycle${bicycleNumber}`,
            time: currentTime, // Time of getting the pass
            status: status, // Issue or return status
            location: locationUrl // User's current location
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
    const userDisplayName = localStorage.getItem('userDisplayName');

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
    const audioMessage = `${message}successfully username is${userDisplayName}event occured at${currentTime}`;
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
