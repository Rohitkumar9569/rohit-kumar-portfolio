const fs = require('fs');
const path = require('path');

console.log('--- Starting pre-build script to create .env file ---');

const envContent = `
MONGO_URI=${process.env.MONGO_URI}
JWT_SECRET=${process.env.JWT_SECRET}
GEMINI_API_KEY=${process.env.GEMINI_API_KEY}
CLOUDINARY_CLOUD_NAME=${process.env.CLOUDINARY_CLOUD_NAME}
CLOUDINARY_API_KEY=${process.env.CLOUDINARY_API_KEY}
CLOUDINARY_API_SECRET=${process.env.CLOUDINARY_API_SECRET}
`;

const envFilePath = path.join(__dirname, '.env');

try {
  fs.writeFileSync(envFilePath, envContent.trim());
  console.log('.env file created successfully for the build process.');
} catch (error) {
  console.error('Error creating .env file:', error);
  process.exit(1); 
}

console.log('--- Pre-build script finished ---');