const express = require('express');
const path = require('path');
const cron = require('node-cron');
const nodemailer = require('nodemailer'); // <--- THIS IS THE MISSING LINE!

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); 
app.use(express.static(__dirname));

// --- 1. DATABASES ---
let appointments = [
    { id: 1, type: "appointment", customer: "Jessica T.", contact: "jessica@email.com", date: "2026-05-02", time: "09:00", duration: 90, service: "Volume Lashes", worker: "Sarah" }
];

let workers = [
    { id: 1, name: "Sarah" }, { id: 2, name: "Mia" }, { id: 3, name: "Chloe" },
    { id: 4, name: "Trinh" }, { id: 5, name: "Tram" }, { id: 6, name: "Niko" }
];

// --- 2. THE REAL POST OFFICE ---

// A. Set up the connection to Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: '',      // ⬅️ Put your real Gmail address here
        pass: '' // ⬅️ Put your Google App Password here (no spaces)
    }
});

// B. The Upgraded Function!
function sendNotification(contact, subject, message) {
    // If they didn't provide an email, skip it so the app doesn't crash
    if (!contact || !contact.includes('@')) {
        console.log(`⚠️ Skipped sending email: No valid email provided for ${contact}`);
        return; 
    }

    // Package the email up
    const mailOptions = {
        from: 'nikodang98@gmail.com', // ⬅️ Put your email here again
        to: contact,                  // The customer's email from the form
        subject: subject,
        text: message
    };

    // Hand it to the mail carrier
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.log("❌ Email Failed:", error.message);
        } else {
            console.log(`✅ REAL EMAIL SENT TO: ${contact}`);
        }
    });
}

// --- 3. FRONT DOOR & LOGIN ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.post('/login-endpoint', (req, res) => {
    if (req.body.username === "LashQueen99" && req.body.password === "Lashes123") {
        res.sendFile(path.join(__dirname, 'dashboard.html'));
    } else {
        res.send(`<h1>Access Denied</h1><a href="/">Try again</a>`);
    }
});

// --- 4. WORKER ENDPOINTS ---
app.get('/api/workers', (req, res) => res.json(workers));
app.post('/api/workers', (req, res) => {
    workers.push({ id: Date.now(), name: req.body.name });
    res.json({ message: "Worker added!" });
});
app.delete('/api/workers/:id', (req, res) => {
    workers = workers.filter(w => w.id !== parseInt(req.params.id));
    res.json({ message: "Worker removed." });
});

// --- 5. APPOINTMENT ENDPOINTS ---
app.get('/api/appointments', (req, res) => res.json(appointments));

app.post('/api/book', (req, res) => {
    const newAppointment = {
        id: Date.now(),
        type: req.body.type,
        customer: req.body.customer,
        contact: req.body.contact,
        date: req.body.date,
        time: req.body.time,
        duration: parseInt(req.body.duration),
        service: req.body.service,
        worker: req.body.worker
    };
    appointments.push(newAppointment); 

    // AUTOMATION: Send instant confirmation!
    if (newAppointment.type === 'appointment') {
        sendNotification(
            newAppointment.contact, 
            "Booking Confirmed! ✨", 
            `Hi ${newAppointment.customer}, your ${newAppointment.service} appointment with ${newAppointment.worker} is confirmed for ${newAppointment.date} at ${newAppointment.time}! We are really to choose us for your new Lashes. See you Soon ❤️`
        );
    }

    res.json({ message: "Schedule updated!" });
});

app.put('/api/appointments/:id', (req, res) => {
    const idToUpdate = parseInt(req.params.id);
    const index = appointments.findIndex(appt => appt.id === idToUpdate);
    if (index !== -1) {
        appointments[index] = { id: idToUpdate, ...req.body, duration: parseInt(req.body.duration) };
        res.json({ message: "Schedule updated!" });
    } else {
        res.status(404).json({ message: "Not found" });
    }
});

app.delete('/api/appointments/:id', (req, res) => {
    appointments = appointments.filter(appt => appt.id !== parseInt(req.params.id));
    res.json({ message: "Canceled." });
});

// --- 6. THE ALARM CLOCK (Cron Job) ---
// Note: Running every minute ('* * * * *') for easy testing right now!
cron.schedule('* * * * *', () => {
    console.log("⏰ [SYSTEM ALARM] Checking for upcoming appointments...");

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split('T')[0];

    const upcoming = appointments.filter(appt => appt.date === tomorrowString && appt.type === 'appointment');

    upcoming.forEach(appt => {
        sendNotification(
            appt.contact,
            "Reminder: Appointment Tomorrow! 💖",
            `Hi ${appt.customer}, we can't wait to see you tomorrow (${appt.date}) at ${appt.time} for your ${appt.service} with ${appt.worker}!`
        );
    });
});

app.listen(3000, () => console.log('✨ Server running! http://localhost:3000 ✨'));