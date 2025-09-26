import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';
import PyqDocument from './models/PyqDocument';

interface CloudinaryResource {
  public_id: string;
  secure_url: string;
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const runFinalUpload = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is not defined in .env file");
    }
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully!');

    console.log('Fetching all recent image files from Cloudinary...');
    
    // Step 1: Fetch all recent images, without the folder filter
    const { resources } = await cloudinary.api.resources({
      type: 'upload',
      resource_type: 'image',
      max_results: 500, // Fetch up to 500 recent images
    });

    // Step 2: Filter the results in our code to get only the GATE CSE files
    const gateCseResources = resources.filter((file: CloudinaryResource) => 
      file.public_id.startsWith('GATE_CSE')
    );

    console.log(`${gateCseResources.length} GATE CSE files found. Preparing for database...`);

    const pyqDocuments = gateCseResources.map((file: CloudinaryResource) => {
      const parts = file.public_id.split('_'); // e.g., ['GATE', 'CSE', '2024']
      
      const exam = parts[0]?.toLowerCase() || 'unknown';
      let subjectCode = parts[1] || 'unknown';
      const year = parseInt(parts[2]) || new Date().getFullYear();

      if (subjectCode === 'CSE') {
        subjectCode = 'CS';
      }

      return {
        title: file.public_id.replace(/_/g, ' '),
        exam: exam,
        subject: 'Computer Science',
        subjectCode: subjectCode,
        year: year,
        fileUrl: file.secure_url,
        uploader: new mongoose.Types.ObjectId("68d27197fa04430da0dd8fa3"),
      };
    });

    if (pyqDocuments.length > 0) {
      console.log('Deleting old documents...');
      await PyqDocument.deleteMany({ exam: 'gate', subjectCode: 'CS' });

      console.log(`Inserting ${pyqDocuments.length} new documents...`);
      await PyqDocument.insertMany(pyqDocuments);
      console.log('All documents from Cloudinary have been inserted!');
    } else {
      console.log('No relevant GATE_CSE files were found in your Cloudinary account.');
    }

  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('Database connection closed.');
    }
  }
};

runFinalUpload();

// npx ts-node src/bulkUpload.ts