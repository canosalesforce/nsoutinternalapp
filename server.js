const express = require('express');
const fs = require('fs');
const ejs = require('ejs');
const app = express();
const axios = require('axios');
const port = 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Initialize loggedInUserEmail
let loggedInUserEmail = '';

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const users = JSON.parse(fs.readFileSync('users.json', 'utf-8'));

    const user = users.find(user => user.username === username && user.password === password);
    if (user) {
        loggedInUserEmail = user.email;
        res.redirect(`/home?username=${user.username}&email=${user.email}`);
    } else {
        res.send('Invalid credentials. Please try again.');
    }
});

app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/public/register.html');
});

app.post('/register', (req, res) => {
    const { username, password, email } = req.body;
    const users = JSON.parse(fs.readFileSync('users.json', 'utf-8'));

    if (!username || !password || !email) {
        res.send('All fields are required.');
        return;
    }

    const existingUser = users.find(user => user.username === username);
    if (existingUser) {
        res.send('Username already exists. Please choose a different username.');
        return;
    }

    users.push({ username, password, email });
    fs.writeFileSync('users.json', JSON.stringify(users, null, 2), 'utf-8');

    res.send('Registration successful! You can now login with your new account.');
});

app.get('/home', (req, res) => {
    const { username, email } = req.query;

    ejs.renderFile(__dirname + '/public/home.ejs', { username, email }, (err, data) => {
        if (err) {
            console.error('Error rendering EJS template:', err);
            res.sendStatus(500);
        } else {
            res.send(data);
        }
    });
});

app.get('/fetch-salesforce-data', async (req, res) => {
    try {
        // Step 1: Fetch OAuth token
        const oauthResponse = await axios.post('https://test.salesforce.com/services/oauth2/token', 
            new URLSearchParams({
                grant_type: 'password',
                client_id: '3MVG9rnryk9FxFMUAB0es3e1_J._ZQJobzNb.leaekgN9Zvsh8rCFmQe5RyZYR0FCJLyP.ilnSqhNqnqLe1TO',
                client_secret: '50899A48AE53C03C0699760844EE066F8D551D4230927A4B114838A7CEE35856',
                username: 'api@naturalchemist.com.au.sand1',
                password: 'LoH@s2071'
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            });

        const accessToken = oauthResponse.data.access_token;

        console.log('@oauthResponse.data ' , oauthResponse.data);
        // Step 2: Fetch user info from userinfo endpoint
        
        console.log('@; ' + `${ oauthResponse.data.instance_url } /services/apexrest/internalapp`);

        // Step 2: Fetch user info from userinfo endpoint
        const requestBody = { uniqueId: loggedInUserEmail }; // Use the email as uniqueId
        console.log('2requestBody" ' , requestBody);
        const apiResponse = await axios.post(`${ oauthResponse.data.instance_url }/services/apexrest/internalapp`, requestBody, {
            headers: {
                Authorization: `Bearer ${oauthResponse.data.access_token}`,
                'Content-Type': 'application/json'
            }
        });

        // You can access the response data from the Salesforce service call if needed
        console.log('API Response:', apiResponse.data);

        res.json({ data: apiResponse.data });
    } catch (error) {
        console.error('Error:', error.message);
        res.sendStatus(500);
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
