// data/db/firebase.db.js

import { initializeApp } from 'firebase/app';
import { equalTo, get, getDatabase, orderByChild, push, query, ref, remove, update } from 'firebase/database';
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from 'firebase/storage';

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
}

export default new FirebaseDBService();
