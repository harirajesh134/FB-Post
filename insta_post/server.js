const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Configure Cloudinary
cloudinary.config({
    cloud_name: 'dpx8dzmw3', // Replace with your Cloudinary cloud name
    api_key: '942365597528861',       // Replace with your Cloudinary API key
    api_secret: 'Fv1_AMr1F7N2IWAP7zpUD_DyGlY'  // Replace with your Cloudinary API secret
});

// Configure Cloudinary storage for multer
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'instagram_uploads', // Optional folder name in Cloudinary
        format: async (req, file) => 'jpg', // Supports promises as well
        public_id: (req, file) => Date.now(), // Public ID (optional)
    },
});
const upload = multer({ storage: storage });

// Serve the HTML form at the root URL
app.get('/', (req, res) => {
    res.send(`
        <h2>Upload Image to Instagram</h2>
        <form action="/post-to-instagram" method="POST" enctype="multipart/form-data">
            <input type="file" name="image" accept="image/*" required><br><br>
            <input type="text" name="caption" placeholder="Enter caption" required><br><br>
            <button type="submit">Upload and Post</button>
        </form>
    `);
});

// POST endpoint to upload image to Instagram
app.post('/post-to-instagram', upload.single('image'), async (req, res) => {
    const accessToken = 'EAAx2dIZAYixcBO2erCq1un2ElvzZAUyKNDQmYUDqUxPncYxV0RK2BorLCLAEu6bX34ZB5OZAoH8BVzZALBaDAeILVSJFoA4rehzF1I9wp62ZCepHZABE5Aw2tO4BH4mKAWZAvlkQOM6PHKLWzsdn7Elp5ESX0NoVL5LYIV7XCxR3DrvBtBLSrBNOHQBCf14NZBiNq';  // Replace with your Access Token
    const instagramAccountId = '17841468119882244';  // Replace with your Instagram Account ID

    try {
        // Get the uploaded image's URL from Cloudinary
        const imageUrl = req.file.path;

        // Step 1: Upload image to Instagram as a media object using image_url
        const mediaObjectResponse = await axios.post(
            `https://graph.facebook.com/v17.0/${instagramAccountId}/media`,
            {
                image_url: imageUrl,
                caption: req.body.caption,
                access_token: accessToken
            }
        );

        const mediaObjectId = mediaObjectResponse.data.id;

        // Step 2: Publish the media object
        await axios.post(
            `https://graph.facebook.com/v17.0/${instagramAccountId}/media_publish`,
            {
                creation_id: mediaObjectId,
                access_token: accessToken
            }
        );

        res.send('Image posted successfully!');
    } catch (error) {
        console.error('Error posting to Instagram:', error.response ? error.response.data : error.message);
        res.status(500).send('Failed to post image.');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
