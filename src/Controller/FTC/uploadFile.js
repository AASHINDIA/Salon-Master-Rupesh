import csv from 'csv-parser';
import fs from 'fs';
import Franchisee from '../../Modal/FTC/Franchisee.js';
import Academy from '../../Modal/FTC/Academy.js';
import Classified from '../../Modal/FTC/Classified.js';
// Generic function to process CSV and import data
const processCSVImport = (filePath, model, mapping, callback) => {
  const results = [];
  
  fs.createReadStream(filePath)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      try {
        const documents = results.map(row => {
          const document = {};
          
          // Map CSV columns to model fields
          for (const [csvField, modelField] of Object.entries(mapping)) {
            if (row[csvField] !== undefined && row[csvField] !== '') {
              // Handle array fields (like image_academy)
              if (Array.isArray(model.schema.paths[modelField]?.instance)) {
                document[modelField] = row[csvField].split(',').map(item => item.trim());
              } else {
                document[modelField] = row[csvField];
              }
            }
          }
          
          return document;
        });
        
        // Insert into database
        const result = await model.insertMany(documents, { ordered: false });
        callback(null, { success: true, count: result.length });
      } catch (error) {
        callback(error, null);
      } finally {
        // Delete the uploaded file after processing
        fs.unlinkSync(filePath);
      }
    })
    .on('error', (error) => {
      callback(error, null);
    });
};

// Academy CSV Import
export const importAcademyCSV = (req, res) => {
    const  user_id=req.user.id;
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Define mapping between CSV columns and model fields
  const fieldMapping = {
    'user_id': 'user_id',
    'image_academy': 'image_academy',
    'leflate_image': 'leflate_image',
    'title': 'title',
    'address': 'address',
    'social_media_url': 'social_media_url',
    'website_url': 'website_url'
  };
  
  processCSVImport(req.file.path, Academy, fieldMapping, (error, result) => {
    if (error) {
      return res.status(500).json({ 
        error: 'Failed to import CSV', 
        details: error.message 
      });
    }
    
    res.json({ 
      message: 'Academy data imported successfully', 
      ...result 
    });
  });
};

// Classified CSV Import
export const importClassifiedCSV = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const fieldMapping = {
    'user_id': 'user_id',
    'image_academy': 'image_academy',
    'title': 'title',
    'type_of_classified': 'type_of_classified',
    'address': 'address',
    'social_media_url': 'social_media_url',
    'website_url': 'website_url'
  };
  
  processCSVImport(req.file.path, Classified, fieldMapping, (error, result) => {
    if (error) {
      return res.status(500).json({ 
        error: 'Failed to import CSV', 
        details: error.message 
      });
    }
    
    res.json({ 
      message: 'Classified data imported successfully', 
      ...result 
    });
  });
};

// Franchisee CSV Import
export const importFranchiseeCSV = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const fieldMapping = {
    'user_id': 'user_id',
    'image_academy': 'image_academy',
    'title': 'title',
    'address': 'address',
    'social_media_url': 'social_media_url',
    'website_url': 'website_url'
  };
  
  processCSVImport(req.file.path, Franchisee, fieldMapping, (error, result) => {
    if (error) {
      return res.status(500).json({ 
        error: 'Failed to import CSV', 
        details: error.message 
      });
    }
    
    res.json({ 
      message: 'Franchisee data imported successfully', 
      ...result 
    });
  });
};