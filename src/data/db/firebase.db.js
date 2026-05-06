// data/db/firebase.db.js

/* 
==========================
firebase.db.js (alternative, using realtime db and app hosting)
==========================
*/

/* 
import { initializeApp } from 'firebase/app';
import { equalTo, get, getDatabase, orderByChild, push, query, ref, remove, update } from 'firebase/database';
import { deleteObject, getDownloadURL, getStorage, ref as storageRef, uploadBytes } from 'firebase/storage';

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    databaseURL: process.env.FIREBASE_DATABASE_URL,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};

let app;
let db;
let storage;

const firebaseUrl = firebaseConfig.databaseURL;
if (firebaseUrl && firebaseUrl.trim() !== '') {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
    storage = getStorage(app);
}

class FirebaseDBService {
    // Get multiple items by a specific key-value pair
    async readByAll(key, value, table) {
        try {
            const itemsRef = ref(db, `/${table}`);
            const q = query(itemsRef, orderByChild(key), equalTo(value));

            const snapshot = await get(q);
            if (snapshot.exists()) {
                return snapshot.val();
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error in readByAll:', error);
            throw error;
        }
    }

    // Get a single item by a specific key-value pair
    async readBy(key, value, table) {
        try {
            const itemsRef = ref(db, `/${table}`);
            const q = query(itemsRef, orderByChild(key), equalTo(value));

            const snapshot = await get(q);
            if (snapshot.exists()) {
                const snapshotValue = snapshot.val();
                const userObj = Object.keys(snapshotValue);
                const getUserId = userObj[0];

                return {
                    key: getUserId,
                    ...snapshotValue[getUserId]
                };
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error in readBy:', error);
            throw error;
        }
    }

    // Get the key of an item by a specific key-value pair
    async getItemKey(key, value, table) {
        try {
            const itemsRef = ref(db, `/${table}`);
            const q = query(itemsRef, orderByChild(key), equalTo(value));

            const snapshot = await get(q);
            if (snapshot.exists()) {
                const snapshotValue = snapshot.val();
                const userObj = Object.keys(snapshotValue);
                const getUserId = userObj[0];

                return getUserId;
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error in getItemKey:', error);
            throw error;
        }
    }

    // Get an item by ID
    async read(key, table) {
        try {
            const itemsRef = ref(db, `/${table}/${key}`);
            const q = query(itemsRef);

            const snapshot = await get(q);
            if (snapshot.exists()) {
                const snapshotValue = snapshot.val();
                return snapshotValue;
            } else {
                const resultFix = await this.readBy('id', key, table);
                if (resultFix && resultFix.key) {
                    return resultFix;
                }
                return null;
            }
        } catch (error) {
            try {
                const resultFix = await this.readBy('id', key, table);
                if (resultFix && resultFix.key) {
                    return resultFix;
                }
                return null;
            } catch (innerErr) {
                console.error(`❌ readBy fallback error:`, innerErr.message);
                throw new Error(`Find failed for ${key}: ${error.message}`);
            }
        }
    }

    // Read all items from a table
    async readAll(table) {
        try {
            const requestRef = ref(db, `/${table}`);
            const snapshot = await get(requestRef);

            if (snapshot.exists()) {
                return snapshot.val();
            } else {
                return {};
            }
        } catch (error) {
            console.error('Error in readAll:', error);
            return {};
        }
    }

    // Create a new item
    async create(data, table) {
        try {
            const requestRef = ref(db, `/${table}`);
            const result = await push(requestRef, data);
            return { key: result.key, ref: result };
        } catch (error) {
            console.error('Error in create:', error);
            throw error;
        }
    }

    // Update an existing item
    async update(key, updateData, table) {
        let dataKey = key;
        try {
            // Get existing data first
            let existing = await this.read(key, table);
            if (!existing) {
                existing = await this.readBy('id', key, table);
                if (existing) {
                    dataKey = existing.key;
                } else {
                    throw new Error(`Item with id ${key} not found in table ${table}`);
                }
            }

            // Merge data
            const updatedData = {
                ...existing,
                ...updateData,
                updatedAt: new Date().toISOString()
            };

            const requestRef = ref(db, `/${table}/${dataKey}`);
            await update(requestRef, updatedData);
            return updatedData;
        } catch (error) {
            console.error(`❌ update error:`, error.message);
            throw new Error(`Update failed for ${dataKey}: ${error.message}`);
        }
    }

    // Delete an item by key
    async delete(key, table) {
        try {
            const requestRef = ref(db, `/${table}/${key}`);
            await remove(requestRef);
            return true;
        } catch (error) {
            console.error('Error in delete:', error);
            throw error;
        }
    }

    // Delete all items from a table
    async deleteAll(table) {
        try {
            const requestRef = ref(db, `/${table}`);
            await remove(requestRef);
            return true;
        } catch (error) {
            console.error('Error in deleteAll:', error);
            throw error;
        }
    }

    // Upload a file and return the download URL
    async upload(file, path) {
        try {
            const cleanPath = path.startsWith('/') ? path.slice(1) : path;
            const fileRef = storageRef(storage, cleanPath);
            
            // Extract file buffer/data
            let fileData;
            if (file.buffer) {
                fileData = file.buffer;
            } else if (Buffer.isBuffer(file)) {
                fileData = file;
            } else {
                fileData = file;
            }
            
            // Set metadata for proper download handling
            const metadata = {
                contentType: file.mimetype || file.type || 'application/octet-stream',
                contentDisposition: `attachment; filename="${file.originalname || file.filename || cleanPath}"`
            };
            
            const snapshot = await uploadBytes(fileRef, fileData, metadata);
            const url = await getDownloadURL(snapshot.ref);
            
            // Ensure originalPath has proper protocol
            let originalPathUrl = url;
            if (!originalPathUrl.startsWith('http://') && !originalPathUrl.startsWith('https://')) {
                originalPathUrl = `https://${originalPathUrl.replace(/^\/+/, '')}`;
            }
            
            return {
                url,
                publicUrl: url,
                path: cleanPath,
                size: snapshot.metadata.size || file.size,
                metadata: {
                    originalPath: originalPathUrl,
                    uploadedAt: new Date().toISOString(),
                    contentType: snapshot.metadata.contentType || file.mimetype || file.type || 'application/octet-stream',
                    originalName: file.originalname || file.filename || cleanPath,
                    fullPath: snapshot.metadata.fullPath
                }
            };
        } catch (error) {
            console.error('Error in upload:', error);
            throw error;
        }
    }

    // Delete file method - Supports S3/R2 Storage and Firebase Storage fallback
    async deleteFile(filePath) {
        try {
            // First, try Firebase Storage if the URL indicates it's from Firebase
            if (filePath.includes('firebasestorage.googleapis.com')) {
                // We attempt to parse the path from the Firebase URL
                // A typical firebase URL: https://firebasestorage.googleapis.com/v0/b/bucket-name/o/path%2Fto%2Ffile?alt=...
                let cleanPath = filePath;
                try {
                    const url = new URL(filePath);
                    const pathParts = url.pathname.split('/o/');
                    if (pathParts.length > 1) {
                        cleanPath = decodeURIComponent(pathParts[1].split('?')[0]);
                    }
                } catch (e) {
                    // Ignore URL parsing errors and try with the raw string
                }
                const fileRef = storageRef(storage, cleanPath);
                await deleteObject(fileRef);
                return {
                    success: true,
                    path: cleanPath,
                    provider: 'firebase_storage',
                    deletedAt: new Date().toISOString()
                };
            }

            // Otherwise, fallback to S3/R2 deletion logic (same as PostgresDBService)
            let s3Endpoint = process.env.S3_ENDPOINT;
            let s3AccessKey = process.env.S3_ACCESS_KEY;
            let s3SecretKey = process.env.S3_SECRET_KEY;
            let s3Bucket = process.env.S3_BUCKET;
            let s3Region = process.env.S3_REGION || 'auto';

            // If env vars are not available, try to get from settings
            if (!s3Endpoint || !s3AccessKey || !s3SecretKey || !s3Bucket) {
                try {
                    const { getSettings } = await import('@/lib/server/settings.js');
                    const settingsData = await getSettings();
                    const s3Settings = settingsData?.adminSiteSettings?.s3;

                    if (s3Settings) {
                        s3Endpoint = s3Endpoint || s3Settings.endpoint;
                        s3AccessKey = s3AccessKey || s3Settings.accessKey;
                        s3SecretKey = s3SecretKey || s3Settings.secretKey;
                        s3Bucket = s3Bucket || s3Settings.bucket;
                        s3Region = s3Region || s3Settings.region || 'auto';
                    }
                } catch (error) {
                    console.error('Failed to load S3 settings from database:', error);
                }
            }

            if (!s3Endpoint || !s3AccessKey || !s3SecretKey || !s3Bucket) {
                throw new Error(
                    'S3 deletion requires S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, and S3_BUCKET to be configured in environment variables or database settings.'
                );
            }

            // Extract path from URL if full URL is provided
            let cleanPath = filePath;
            if (filePath.startsWith('http')) {
                const url = new URL(filePath);
                cleanPath = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
                if (cleanPath.startsWith(`${s3Bucket}/`)) {
                    cleanPath = cleanPath.replace(`${s3Bucket}/`, '');
                }
            } else {
                cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
            }

            // Initialize S3 client dynamically
            const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
            const s3Client = new S3Client({
                endpoint: s3Endpoint,
                region: s3Region,
                credentials: {
                    accessKeyId: s3AccessKey,
                    secretAccessKey: s3SecretKey
                }
            });

            // Delete from S3/R2
            const command = new DeleteObjectCommand({
                Bucket: s3Bucket,
                Key: cleanPath
            });

            const response = await s3Client.send(command);

            return {
                success: true,
                path: cleanPath,
                provider: 's3',
                deletedAt: new Date().toISOString(),
                response: response
            };
        } catch (error) {
            console.error('Error in deleteFile:', error);
            throw error;
        }
    }
}

export default new FirebaseDBService();

*/