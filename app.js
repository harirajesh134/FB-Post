const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');

const app = express();
const port = 3000;

// Middleware to parse the body of POST requests
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Multer configuration to handle file uploads
const upload = multer({ dest: 'uploads/' });

// Replace with your new actual access token
const accessToken = 'EAANCF4BETdsBOZCLZCpVKjaXq0jcjhkP9pkJUwL3HmjtqeUKewSFY2ZC6imTgYKDO4QLzZBVeYAdV0M1QUdsOar7ZAkoOwedeWt6yd7SZBZBaV8kRLVZAPeOmZAwR843XzYBZCCrhufRT3HlOuZC2sXw47QoTITI353FQOf5TBvauatk4ibTg7LBjfg89V78WzfH3NIMpaMectT';

// Route to handle the Facebook OAuth redirection
app.get('/auth', (req, res) => {
    const facebookAuthUrl = `https://www.facebook.com/v17.0/dialog/oauth?client_id=803043432016729&redirect_uri=http://localhost:3000/callback&scope=pages_manage_posts,pages_read_engagement,pages_manage_metadata,pages_manage_engagement`;
    res.redirect(facebookAuthUrl);
});

// OAuth callback route
app.get('/callback', async (req, res) => {
    const code = req.query.code;

    try {
        const tokenResponse = await axios.get('https://graph.facebook.com/v17.0/oauth/access_token', {
            params: {
                client_id: '917093633773019',
                client_secret: 'bec250d786c171d90e30ce0266eb7a2c',
                redirect_uri: 'http://localhost:3000/callback',
                code: code
            }
        });

        const token = tokenResponse.data.access_token;

        // Redirect to the form page with the access token as a query parameter
        res.redirect(`/upload?access_token=${token}`);
    } catch (error) {
        console.error('Error exchanging code for access token:', error.response ? error.response.data : error.message);
        res.status(500).send('Error during authentication');
    }
});

// Serve the form page with access token in the query string
app.get('/upload', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle the image upload and post to Facebook
app.post('/post-image', upload.single('photo'), async (req, res) => {
    const token = req.query.access_token || accessToken; // The token now uses the new access token
    const caption = req.body.caption;
    const imagePath = req.file.path;

    try {
        // Step 1: Directly use the known Page ID
        const pageId = '370833732785288'; // Replace with your actual page ID

        // Log the response for debugging
        const pagesResponse = await axios.get(`https://graph.facebook.com/v17.0/${pageId}`, {
            params: {
                access_token: token
            }
        });
        console.log(pagesResponse.data);

        // Step 2: Upload the photo to the page
        const formData = new FormData();
        formData.append('source', fs.createReadStream(imagePath));
        formData.append('caption', caption);

        const photoUploadResponse = await axios.post(`https://graph.facebook.com/v17.0/${pageId}/photos`, formData, {
            headers: {
                ...formData.getHeaders()
            },
            params: {
                access_token: token
            }
        });

        const postId = photoUploadResponse.data.post_id;

        res.send(`Photo posted to Facebook with Post ID: ${postId}`);
    } catch (error) {
        console.error('Error posting photo to Facebook:', error.response ? error.response.data : error.message);

        // Check for specific error codes and messages
        if (error.response && error.response.data) {
            const errorMessage = error.response.data.error.message;
            if (errorMessage.includes('permissions')) {
                res.status(403).send('Permission error: Ensure you have the correct permissions.');
            } else {
                res.status(500).send('Error posting photo to Facebook');
            }
        } else {
            res.status(500).send('Error posting photo to Facebook');
        }
    } finally {
        // Delete the uploaded file after posting
        fs.unlink(imagePath, (err) => {
            if (err) console.error('Error deleting uploaded file:', err);
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`App running at http://localhost:${port}`);
});
