// config/googleAuth.js - FIXED VERSION
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ✅ FIX: Terima ACCESS TOKEN (bukan ID token)
export const verifyGoogleToken = async (accessToken) => {
    try {
        // ✅ PAKAI ACCESS TOKEN untuk get user info
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch user info from Google');
        }

        const payload = await response.json();

        return {
            google_id: payload.sub,
            name: payload.name,
            email: payload.email,
            photo_url: payload.picture
        };
    } catch (error) {
        console.error('Google token verification failed:', error);
        throw new Error('Invalid Google token: ' + error.message);
    }
};

export default client;