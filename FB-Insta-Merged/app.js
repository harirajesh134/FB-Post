const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const port = 3000;

// Middleware to parse the body of POST requests
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Multer configuration for handling file uploads locally
const upload = multer({ dest: 'uploads/' });

// Cloudinary configuration for Instagram uploads
cloudinary.config({
    cloud_name: 'dpx8dzmw3', // Replace with your Cloudinary cloud name
    api_key: '942365597528861', // Replace with your Cloudinary API key
    api_secret: 'Fv1_AMr1F7N2IWAP7zpUD_DyGlY' // Replace with your Cloudinary API secret
});

// Cloudinary storage for Instagram uploads
const cloudinaryStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'social_media_uploads',
        format: async (req, file) => 'jpg',
        public_id: (req, file) => Date.now(),
    },
});
const cloudinaryUpload = multer({ storage: cloudinaryStorage });

// Facebook API credentials
const facebookAppId = '917093633773019'; // Replace with your Facebook App ID
const facebookAppSecret = 'bec250d786c171d90e30ce0266eb7a2c'; // Replace with your Facebook App Secret
const facebookPageId = '370833732785288'; // Replace with your Facebook Page ID
let facebookAccessToken = 'EAANCF4BETdsBOZCLZCpVKjaXq0jcjhkP9pkJUwL3HmjtqeUKewSFY2ZC6imTgYKDO4QLzZBVeYAdV0M1QUdsOar7ZAkoOwedeWt6yd7SZBZBaV8kRLVZAPeOmZAwR843XzYBZCCrhufRT3HlOuZC2sXw47QoTITI353FQOf5TBvauatk4ibTg7LBjfg89V78WzfH3NIMpaMectT'; // Replace with your Facebook Access Token

// Instagram API credentials
const instagramAccessToken = 'EAAx2dIZAYixcBO2erCq1un2ElvzZAUyKNDQmYUDqUxPncYxV0RK2BorLCLAEu6bX34ZB5OZAoH8BVzZALBaDAeILVSJFoA4rehzF1I9wp62ZCepHZABE5Aw2tO4BH4mKAWZAvlkQOM6PHKLWzsdn7Elp5ESX0NoVL5LYIV7XCxR3DrvBtBLSrBNOHQBCf14NZBiNq';  // Replace with your Instagram Access Token
const instagramAccountId = '17841468119882244';  // Replace with your Instagram Account ID

// Route to handle the Facebook OAuth redirection
app.get('/auth', (req, res) => {
    const facebookAuthUrl = `https://www.facebook.com/v17.0/dialog/oauth?client_id=${facebookAppId}&redirect_uri=http://localhost:3000/callback&scope=pages_manage_posts,pages_read_engagement,pages_manage_metadata,pages_manage_engagement`;
    res.redirect(facebookAuthUrl);
});

// OAuth callback route for Facebook
app.get('/callback', async (req, res) => {
    const code = req.query.code;

    try {
        const tokenResponse = await axios.get('https://graph.facebook.com/v17.0/oauth/access_token', {
            params: {
                client_id: facebookAppId,
                client_secret: facebookAppSecret,
                redirect_uri: 'http://localhost:3000/callback',
                code: code
            }
        });

        facebookAccessToken = tokenResponse.data.access_token;

        // Redirect to the form page with the access token as a query parameter
        res.redirect(`/upload?access_token=${facebookAccessToken}`);
    } catch (error) {
        console.error('Error exchanging code for access token:', error.response ? error.response.data : error.message);
        res.status(500).send('Error during authentication');
    }
});

// Serve the combined form page
app.get('/upload', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle the image upload and post to both Facebook and Instagram
app.post('/post-to-social-media', upload.single('photo'), async (req, res) => {
    const caption = req.body.caption;
    const imagePath = req.file.path;
    const postToFacebook = req.body.postToFacebook === 'on'; // Check if Facebook toggle is ON
    const postToInstagram = req.body.postToInstagram === 'on'; // Check if Instagram toggle is ON

    let messages = [];

    try {
        // Post to Facebook if the toggle is ON
        if (postToFacebook) {
            const formData = new FormData();
            formData.append('source', fs.createReadStream(imagePath));
            formData.append('caption', caption);

            const facebookResponse = await axios.post(`https://graph.facebook.com/v17.0/${facebookPageId}/photos`, formData, {
                headers: {
                    ...formData.getHeaders()
                },
                params: {
                    access_token: facebookAccessToken
                }
            });

            const facebookPostId = facebookResponse.data.post_id;
            console.log(`Photo posted to Facebook with Post ID: ${facebookPostId}`);
            messages.push('Photo posted to Facebook successfully!');
        }

        // Upload to Cloudinary and post to Instagram if the toggle is ON
        if (postToInstagram) {
            const uploadedImage = await cloudinary.uploader.upload(imagePath, {
                folder: 'social_media_uploads'
            });

            const instagramMediaResponse = await axios.post(
                `https://graph.facebook.com/v17.0/${instagramAccountId}/media`,
                {
                    image_url: uploadedImage.secure_url,
                    caption: caption,
                    access_token: instagramAccessToken
                }
            );

            const instagramMediaId = instagramMediaResponse.data.id;

            await axios.post(
                `https://graph.facebook.com/v17.0/${instagramAccountId}/media_publish`,
                {
                    creation_id: instagramMediaId,
                    access_token: instagramAccessToken
                }
            );

            console.log('Image posted successfully to Instagram!');
            messages.push('Photo posted to Instagram successfully!');
        }

        // Redirect to the success page with messages
        res.redirect(`/success?messages=${encodeURIComponent(messages.join(' | '))}`);
    } catch (error) {
        console.error('Error posting to social media:', error.response ? error.response.data : error.message);
        res.status(500).send('Failed to post image to social media.');
    } finally {
        // Delete the uploaded file after posting
        fs.unlink(imagePath, (err) => {
            if (err) console.error('Error deleting uploaded file:', err);
        });
    }
});

// Serve the success page
app.get('/success', (req, res) => {
    const messages = req.query.messages;
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Post Success</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 50px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    flex-direction: column;
                }
                h1 {
                    color: green;
                    margin-bottom: 20px;
                }
                p {
                    font-size: 18px;
                    color: #444;
                }
                .container {
                    text-align: center;
                    padding: 20px;
                    border: 1px solid #ddd;
                    border-radius: 10px;
                    background-color: #f9f9f9;
                }
                button {
                    margin-top: 20px;
                    padding: 10px 20px;
                    font-size: 16px;
                    background-color: #007BFF;
                    color: white;
                    border: none;
                    cursor: pointer;
                    border-radius: 5px;
                }
                button:hover {
                    background-color: #0056b3;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Success!</h1>
                <p>${messages}</p>
                <button onclick="window.location.href='/upload'">Back to Upload</button>
            </div>
        </body>
        </html>
    `);
});

// Start the server
app.listen(port, () => {
    console.log(`App running at http://localhost:${port}`);
});
