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
    const icon1 = L.icon({
        iconUrl: 'icon1.png', // Replace 'icon1.png' with your custom icon URL
        iconSize: [32, 32], // Size of the icon
        iconAnchor: [16, 32], // Point of the icon which will correspond to marker's location
        popupAnchor: [0, -32] // Point from which the popup should open relative to the iconAnchor
    });

    const icon2 = L.icon({
        iconUrl: 'icon2.png', // Replace 'icon2.png' with your custom icon URL
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });

    const icon3 = L.icon({
        iconUrl: 'icon3.png', // Replace 'icon3.png' with your custom icon URL
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32]
    });

    // Add markers with custom icons
    L.marker([13.0827, 80.2707], { icon: icon1 }).addTo(map)
        .bindPopup('SVCE Campus')
        .openPopup();

    L.marker([13.07, 80.27], { icon: icon2 }).addTo(map)
        .bindPopup('Location 2')
        .openPopup();

    L.marker([13.09, 80.26], { icon: icon3 }).addTo(map)
        .bindPopup('Location 3')
        .openPopup();
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

window.onload = () => {
    if (localStorage.getItem('userEmail') && localStorage.getItem('registerNumber')) {
        displayDashboard();
    }
};
