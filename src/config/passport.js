const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// ✅ รายชื่อคนที่มีสิทธิ์เข้าใช้งาน
const ALLOWED_USERS = [
    'trinyah@bicchemical.com',
    'teerayut@jbf.co.th',
    'pakon@jbf.co.th',
    'napat@bicchemical.com',
    'chotchayanon@bicchemical.com'

];

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // ✅ เปลี่ยนเป็น Relative Path เพื่อรองรับทั้ง Localhost และ Server Domain
    callbackURL: '/auth/google/callback', 
    proxy: true // ✅ เพิ่มบรรทัดนี้เพื่อให้ทำงานผ่าน Docker/Proxy ได้ถูกต้อง
},
(accessToken, refreshToken, profile, done) => {
    const email = profile.emails[0].value;

    if (ALLOWED_USERS.includes(email)) {
        const user = {
            email: email,
            name: profile.displayName,
            photo: profile.photos ? profile.photos[0].value : null,
            role: 'staff'
        };
        return done(null, user);
    } else {
        console.log(`[Auth] Blocked access attempt from: ${email}`);
        return done(null, false, { message: 'อีเมลของคุณไม่มีสิทธิ์เข้าใช้งานระบบนี้' });
    }
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

module.exports = passport;