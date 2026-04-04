// data/db/postgres.db.js

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import pg from 'pg';

const { Pool } = pg;

class PostgresDBService {
    constructor() {
        this.initialized = false;
        this.pool = null;
        this.connected = false;
        this.sslRetried = false;
        this.connectionPromise = null;
    }

    normalizeConnectionStringSSLMode(connectionString) {
        if (!connectionString || !connectionString.includes('sslmode=')) {
            return connectionString;
        }

        return connectionString.replace(/sslmode=(prefer|require|verify-ca)(?=&|$)/gi, 'sslmode=verify-full');
    }

    // Parse connection configuration from environment variables
    getConnectionConfig() {
        // Support multiple environment variable formats
        const connectionString = 
            process.env.POSTGRES_URL || 
            process.env.DATABASE_URL || 
            process.env.POSTGRESQL_URL ||
            process.env.PG_CONNECTION_STRING;

        if (!connectionString) {
            // Check for individual connection parameters
            const host = process.env.POSTGRES_HOST || process.env.PGHOST;
            const port = parseInt(process.env.POSTGRES_PORT || process.env.PGPORT || '5432', 10);
            const database = process.env.POSTGRES_DATABASE || process.env.PGDATABASE;
            const user = process.env.POSTGRES_USER || process.env.PGUSER;
            const password = process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD;

            if (!host || !database || !user || !password) {
                throw new Error('PostgreSQL connection configuration not found. Please set POSTGRES_URL or individual connection parameters.');
            }

            return {
                host,
                port,
                database,
                user,
                password,
                ...this.getSSLConfig()
            };
        }

        return {
            connectionString: this.normalizeConnectionStringSSLMode(connectionString),
            ...this.getSSLConfig()
        };
    }

    // Check if insecure connections are explicitly allowed
    isInsecureConnectionAllowed() {
        const allowInsecure = process.env.POSTGRES_ALLOW_INSECURE;
        return allowInsecure === 'true' || allowInsecure === 'TRUE' || allowInsecure === '1';
    }

    // Determine SSL configuration based on environment
    getSSLConfig() {
        const sslMode = process.env.POSTGRES_SSL_MODE || process.env.PGSSLMODE;
        const sslCert = process.env.POSTGRES_SSL_CERT || process.env.PGSSLCERT;
        const sslKey = process.env.POSTGRES_SSL_KEY || process.env.PGSSLKEY;
        const sslRootCert = process.env.POSTGRES_SSL_ROOT_CERT || process.env.PGSSLROOTCERT;

        // Explicit SSL mode configuration - only allow disable if insecure is explicitly allowed
        if (sslMode === 'disable' || sslMode === 'false') {
            if (!this.isInsecureConnectionAllowed()) {
                console.warn('⚠️ SSL disabled in config but POSTGRES_ALLOW_INSECURE not set. Enforcing SSL...');
                return { ssl: { rejectUnauthorized: false } };
            }
            return { ssl: false };
        }

        // Custom SSL certificate configuration
        if (sslCert || sslKey || sslRootCert) {
            return {
                ssl: {
                    rejectUnauthorized: sslMode !== 'allow' && sslMode !== 'prefer',
                    cert: sslCert,
                    key: sslKey,
                    ca: sslRootCert
                }
            };
        }

        // Auto-detect SSL requirements based on provider
        const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';
        
        // Vercel Postgres always requires SSL
        if (connectionString.includes('vercel-storage.com') || 
            connectionString.includes('vercel.app')) {
            return { ssl: { rejectUnauthorized: false } };
        }

        // Cloudflare D1/Postgres
        if (connectionString.includes('cloudflare.com') || 
            connectionString.includes('.workers.dev')) {
            return { ssl: { rejectUnauthorized: false } };
        }

        // Supabase
        if (connectionString.includes('supabase.co') || 
            connectionString.includes('supabase.com')) {
            return { ssl: { rejectUnauthorized: false } };
        }

        // Neon
        if (connectionString.includes('neon.tech') || 
            connectionString.includes('neon.cloud')) {
            return { ssl: { rejectUnauthorized: false } };
        }

        // Railway
        if (connectionString.includes('railway.app')) {
            return { ssl: { rejectUnauthorized: false } };
        }

        // DigitalOcean Managed Databases
        if (connectionString.includes('db.ondigitalocean.com')) {
            return { ssl: { rejectUnauthorized: false } };
        }

        // Hetzner Cloud (usually no SSL by default, but can be configured)
        if (connectionString.includes('hetzner.cloud') || 
            connectionString.includes('.hetzner.')) {
            return sslMode === 'require' ? { ssl: { rejectUnauthorized: false } } : { ssl: false };
        }

        // AWS RDS
        if (connectionString.includes('.rds.amazonaws.com')) {
            return { ssl: { rejectUnauthorized: false } };
        }

        // Google Cloud SQL
        if (connectionString.includes('cloudsql.com')) {
            return { ssl: { rejectUnauthorized: false } };
        }

        // Azure Database for PostgreSQL
        if (connectionString.includes('postgres.database.azure.com')) {
            return { ssl: { rejectUnauthorized: false } };
        }

        // Default: Try SSL first, fallback handled in connection
        if (sslMode === 'require' || sslMode === 'verify-ca' || sslMode === 'verify-full') {
            return { ssl: { rejectUnauthorized: sslMode === 'verify-full' } };
        }

        // Default for local development (localhost/127.0.0.1) - only if insecure is allowed
        const host = process.env.POSTGRES_HOST || process.env.PGHOST || '';
        if (host === 'localhost' || host === '127.0.0.1' || connectionString.includes('localhost')) {
            if (this.isInsecureConnectionAllowed()) {
                return { ssl: false };
            }
            // Even for localhost, require SSL if insecure is not explicitly allowed
            console.warn('⚠️ Localhost connection detected but POSTGRES_ALLOW_INSECURE not set. Using SSL...');
            return { ssl: { rejectUnauthorized: false } };
        }

        // Default: enforce SSL with flexible certificate validation
        return { ssl: { rejectUnauthorized: false } };
    }

    async initClient(forceNoSSL = false) {
        if (this.pool) return this.pool;

        try {
            const config = this.getConnectionConfig();
            
            // Override SSL config if forced to disable - but only if insecure is allowed
            if (forceNoSSL) {
                if (!this.isInsecureConnectionAllowed()) {
                    console.warn('⚠️ Attempted to force non-SSL connection but POSTGRES_ALLOW_INSECURE is not set. Enforcing SSL...');
                    // Don't disable SSL
                } else {
                    config.ssl = false;
                    if (config.connectionString) {
                        // Remove sslmode from connection string if present
                        config.connectionString = config.connectionString.replace(/[?&]sslmode=[^&]*/g, '');
                    }
                }
            }
            
            // Create connection pool with optimized settings
            this.pool = new Pool({
                ...config,
                max: parseInt(process.env.POSTGRES_POOL_MAX || '20', 10),
                min: parseInt(process.env.POSTGRES_POOL_MIN || '2', 10),
                idleTimeoutMillis: parseInt(process.env.POSTGRES_IDLE_TIMEOUT || '30000', 10),
                connectionTimeoutMillis: parseInt(process.env.POSTGRES_CONNECTION_TIMEOUT || '10000', 10),
                maxUses: parseInt(process.env.POSTGRES_MAX_USES || '7500', 10),
                allowExitOnIdle: process.env.POSTGRES_ALLOW_EXIT_ON_IDLE === 'true'
            });

            // Handle pool errors
            this.pool.on('error', (err) => {
                // console.error('Unexpected PostgreSQL pool error:', err);
            });

            return this.pool;
        } catch (error) {
            // console.error('Failed to initialize PostgreSQL pool:', error);
            throw error;
        }
    }
    
    // Ensure valid DB connection
    async connect() {
        // If already connected, return immediately
        if (this.connected && this.pool) return true;

        // If a connection attempt is in progress, wait for it
        if (this.connectionPromise) {
            return await this.connectionPromise;
        }

        // Create a new connection promise
        this.connectionPromise = this._performConnect();

        try {
            const result = await this.connectionPromise;
            return result;
        } finally {
            // Clear the connection promise after completion
            this.connectionPromise = null;
        }
    }

    async _performConnect() {
        try {
            const pool = await this.initClient();

            // Test connection
            const client = await pool.connect();
            await client.query('SELECT 1');
            client.release();

            this.connected = true;
            console.log('✅ Postgres connected');
            return true;

        } catch (error) {
            // Check if error is SSL-related
            const isSSLError = 
                error.message?.includes('SSL') || 
                error.message?.includes('ssl') ||
                error.message?.includes('does not support SSL') ||
                error.code === 'EPROTO' ||
                error.code === 'ERR_SSL_WRONG_VERSION_NUMBER';

            // If SSL error and haven't tried without SSL yet, retry ONLY if insecure is explicitly allowed
            if (isSSLError && !this.sslRetried && this.isInsecureConnectionAllowed()) {
                console.log('⚠️ SSL connection failed, retrying without SSL (POSTGRES_ALLOW_INSECURE is set)...');
                
                // Clean up failed pool
                if (this.pool) {
                    try {
                        await this.pool.end();
                    } catch (_e) {
                        // Ignore cleanup errors
                    }
                }
                
                // Reset pool to null before retry
                this.pool = null;
                this.sslRetried = true;
                this.connected = false;
                
                // Retry without SSL
                try {
                    const pool = await this.initClient(true);
                    const client = await pool.connect();
                    await client.query('SELECT 1');
                    client.release();
                    
                    this.connected = true;
                    console.log('✅ Postgres connected (without SSL)');
                    return true;
                } catch (retryError) {
                    this.connected = false;
                    this.pool = null;
                    console.error('❌ Postgres connection failed (no SSL retry):', retryError.message);
                    throw retryError;
                }
            } else if (isSSLError && !this.sslRetried && !this.isInsecureConnectionAllowed()) {
                console.error('❌ SSL connection failed. Set POSTGRES_ALLOW_INSECURE=TRUE to allow non-SSL connections.');
            }
            
            this.connected = false;
            this.pool = null;
            console.error('❌ Postgres connection failed:', error.message);
            throw error;
        }
    }

    // Ensure table exists with better logging
    async ensureTable() {
        if (this.initialized) {
            return;
        }

        await this.connect();

        // Double-check pool is available after connection
        if (!this.pool) {
            throw new Error('Database pool not initialized after connection');
        }

        try {
            await this.pool.query(`
                CREATE TABLE IF NOT EXISTS kv_store (
                    key TEXT PRIMARY KEY,
                    data JSONB NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // Verify table exists
            const tableCheck = await this.pool.query(`
                SELECT table_name
                FROM information_schema.tables
                WHERE table_name = 'kv_store'
            `);

            if (tableCheck.rows.length > 0) {
                this.initialized = true;
            }
        } catch (err) {
            console.error('❌ Failed to create kv_store table:', err.message);
            throw err;
        }
    }

    // Build key for storage
    buildKey(table, id) {
        return `${table}:${id}`;
    }

    // Generate unique ID
    generateId() {
        return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Extract ID from key
    extractIdFromKey(key, table) {
        return key.replace(`${table}:`, '');
    }

    // Ensure pool is available for queries
    async ensurePool() {
        if (!this.pool) {
            await this.connect();
        }
        if (!this.pool) {
            throw new Error('Database pool not available');
        }
        return this.pool;
    }

    // Get multiple items by a specific key-value pair
    async readByAll(key, value, table) {
        try {
            await this.ensureTable();
            const pool = await this.ensurePool();
            const pattern = `${table}:%`;

            const result = await pool.query(
                `SELECT key, data
                FROM kv_store
                WHERE key LIKE $1
                AND data->>$2 = $3`,
                [pattern, key, String(value)]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const results = {};
            result.rows.forEach((row) => {
                const id = this.extractIdFromKey(row.key, table);
                const data = row.data;
                
                // Ensure timestamps exist
                if (data && typeof data === 'object') {
                    if (!data.createdAt) {
                        data.createdAt = row.created_at || new Date().toISOString();
                    }
                    if (!data.updatedAt) {
                        data.updatedAt = row.created_at || new Date().toISOString();
                    }
                }
                
                results[id] = data;
            });

            return results;
        } catch (err) {
            console.error(`❌ readByAll error:`, err.message);
            throw new Error(`Query failed for ${table}: ${err.message}`);
        }
    }

    // Get a single item by a specific key-value pair
    async readBy(key, value, table) {
        try {
            await this.ensureTable();
            const pool = await this.ensurePool();
            const pattern = `${table}:%`;

            const result = await pool.query(
                `SELECT key, data
                FROM kv_store
                WHERE key LIKE $1
                AND data->>$2 = $3
                LIMIT 1`,
                [pattern, key, String(value)]
            );

            if (result.rows.length === 0) {
                return null;
            }
            
            const results = result.rows[0].data;
            const dataKey = this.extractIdFromKey(result.rows[0].key, table);
            
            // Ensure timestamps exist in results
            if (results && typeof results === 'object') {
                if (!results.createdAt) {
                    results.createdAt = new Date().toISOString();
                }
                if (!results.updatedAt) {
                    results.updatedAt = new Date().toISOString();
                }
            }
            
            return {
                key: dataKey,
                ...results
            };
        } catch (err) {
            console.error(`❌ readBy error:`, err.message);
            throw new Error(`Query failed for ${table}: ${err.message}`);
        }
    }

    // Get the key of an item by a specific key-value pair
    async getItemKey(key, value, table) {
        try {
            await this.ensureTable();
            const pool = await this.ensurePool();
            const pattern = `${table}:%`;

            const result = await pool.query(
                `SELECT key
                FROM kv_store
                WHERE key LIKE $1
                AND data->>$2 = $3
                LIMIT 1`,
                [pattern, key, String(value)]
            );

            if (result.rows.length === 0) {
                return null;
            }

            return this.extractIdFromKey(result.rows[0].key, table);
        } catch (err) {
            console.error(`❌ getItemKey error:`, err.message);
            throw new Error(`Query failed for ${table}: ${err.message}`);
        }
    }

    // Get an item by ID
    async read(id, table) {
        try {
            await this.ensureTable();
            const pool = await this.ensurePool();
            const key = this.buildKey(table, id);

            const result = await pool.query(
                'SELECT data FROM kv_store WHERE key = $1',
                [key]
            );

            if (result.rows.length === 0) {
                const resultFix = await this.readBy('id', id, table);
                if (resultFix && resultFix.key) {
                    return resultFix;
                }
                return null;
            }
            
            const data = result.rows[0].data;
            
            // Ensure timestamps exist
            if (data && typeof data === 'object') {
                if (!data.createdAt) {
                    data.createdAt = new Date().toISOString();
                }
                if (!data.updatedAt) {
                    data.updatedAt = new Date().toISOString();
                }
            }
            
            return data;
        } catch (err) {
            try {
                const resultFix = await this.readBy('id', id, table);
                if (resultFix && resultFix.key) {
                    return resultFix;
                }
                return null;
            } catch (innerErr) {
                console.error(`❌ readBy fallback error:`, innerErr.message);
                throw new Error(`Find failed for ${key}: ${err.message}`);
            }
        }
    }

    // Read all items from a table
    async readAll(table) {
        try {
            await this.ensureTable();
            const pool = await this.ensurePool();
            const pattern = `${table}:%`;

            const result = await pool.query(
                `SELECT key, data
                FROM kv_store
                WHERE key LIKE $1
                ORDER BY created_at DESC`,
                [pattern]
            );

            if (result.rows.length === 0) {
                return null;
            }

            const results = {};
            result.rows.forEach((row) => {
                const key = this.extractIdFromKey(row.key, table);
                const data = row.data;
                
                // Ensure timestamps exist
                if (data && typeof data === 'object') {
                    if (!data.createdAt) {
                        data.createdAt = row.created_at || new Date().toISOString();
                    }
                    if (!data.updatedAt) {
                        data.updatedAt = row.created_at || new Date().toISOString();
                    }
                }
                
                results[key] = data;
            });

            return results;
        } catch (err) {
            console.error(`❌ readAll error:`, err.message);
            throw new Error(`Fetch all failed for table ${table}: ${err.message}`);
        }
    }

    // Read ALL records from kv_store table (no table filtering)
    async readAllRecords() {
        try {
            await this.ensureTable();
            const pool = await this.ensurePool();

            const result = await pool.query(
                `SELECT key, data, created_at
                FROM kv_store
                ORDER BY created_at DESC`
            );

            if (result.rows.length === 0) {
                return [];
            }

            return result.rows.map(row => ({
                key: row.key,
                data: row.data,
                created_at: row.created_at
            }));
        } catch (err) {
            console.error(`❌ readAllRecords error:`, err.message);
            throw new Error(`Fetch all records failed: ${err.message}`);
        }
    }

    // Insert a record directly with its original key (for backup restore)
    async insertRecord(record) {
        try {
            await this.ensureTable();
            const pool = await this.ensurePool();

            // Validate record has required fields
            if (!record.key || !record.data) {
                throw new Error('Record must have key and data properties');
            }

            // Use ON CONFLICT to handle duplicates (upsert)
            const result = await pool.query(
                `INSERT INTO kv_store (key, data, created_at)
                VALUES ($1, $2, $3)
                ON CONFLICT (key) DO UPDATE
                SET data = EXCLUDED.data, created_at = EXCLUDED.created_at
                RETURNING *`,
                [
                    record.key,
                    JSON.stringify(record.data),
                    record.created_at || new Date().toISOString()
                ]
            );

            if (!result.rows) {
                return null;
            }
            return result.rows[0].data;
        } catch (err) {
            console.error(`❌ insertRecord error:`, err.message);
            throw new Error(`Insert record failed for key ${record.key}: ${err.message}`);
        }
    }

    // Create a new item
    async create(data, table) {
        try {
            await this.ensureTable();
            const pool = await this.ensurePool();
            const id = this.generateId();
            const key = this.buildKey(table, id);

            // Add metadata
            const dataWithMetadata = {
                ...data,
                key: id,
                createdAt: data.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const result = await pool.query(
                'INSERT INTO kv_store (key, data) VALUES ($1, $2) RETURNING *',
                [key, JSON.stringify(dataWithMetadata)]
            );

            if (!result.rows) {
                return null;
            }
            return result.rows[0].data;
        } catch (err) {
            console.error(`❌ create error:`, err.message);
            throw new Error(`Insert failed for ${table}: ${err.message}`);
        }
    }

    // Update an existing item
    async update(id, updateData, table) {
        try {
            await this.ensureTable();
            const pool = await this.ensurePool();
            let dataKey = id;
            // Get existing data first
            let existing = await this.read(id, table);
            if (!existing) {
                try {
                    existing = await this.readBy('id', id, table);
                    if (existing && existing.key) {
                        dataKey = existing.key;
                    }
                } catch (_e) {
                    throw new Error(`Item with id ${id} not found in table ${table}`);
                }
            }
            // Build key
            const key = this.buildKey(table, dataKey);

            // Merge data and preserve createdAt
            const updatedData = {
                ...existing,
                ...updateData,
                createdAt: existing.createdAt || existing.timestamp || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const result = await pool.query(
                'UPDATE kv_store SET data = $1 WHERE key = $2 RETURNING *',
                [JSON.stringify(updatedData), key]
            );

            if (!result || !result.rows || result.rows.length === 0) {
                throw new Error(`Record not found for key: ${key}`);
            }
            return result.rows[0].data;
        } catch (err) {
            console.error(`❌ update error:`, err.message);
            throw new Error(`Update failed for ${id}: ${err.message}`);
        }
    }

    // Delete an item by ID
    async delete(id, table) {
        try {
            await this.ensureTable();
            const pool = await this.ensurePool();
            let key = this.buildKey(table, id);

            let result = await pool.query(
                'DELETE FROM kv_store WHERE key = $1 RETURNING *',
                [key]
            );

            if (result.rows.length === 0) {
                // Try to find by 'id' field if direct key delete didn't work
                try {
                    const item = await this.readBy('id', id, table);
                    if (item && item.key) {
                        const dataKey = item.key;
                        key = this.buildKey(table, dataKey);
                        result = await pool.query(
                            'DELETE FROM kv_store WHERE key = $1 RETURNING *',
                            [key]
                        );
                    }
                } catch (_e) {
                    throw new Error(`Item with id ${id} not found in table ${table}`);
                }
            }
            return result && result.rows && result.rows.length > 0;
        } catch (err) {
            console.error(`❌ delete error:`, err.message);
            throw new Error(`Delete failed for ${id}: ${err.message}`);
        }
    }

    // Delete all items from a table
    async deleteAll(table) {
        try {
            await this.ensureTable();
            const pool = await this.ensurePool();
            const pattern = `${table}:%`;

            await pool.query(
                'DELETE FROM kv_store WHERE key LIKE $1',
                [pattern]
            );

            return true;
        } catch (err) {
            console.error(`❌ deleteAll error:`, err.message);
            throw new Error(`Delete all failed for table ${table}: ${err.message}`);
        }
    }

    // Delete all records from kv_store table (for backup restore)
    async deleteAllRecords() {
        try {
            await this.ensureTable();
            const pool = await this.ensurePool();

            const result = await pool.query('DELETE FROM kv_store');

            return true;
        } catch (err) {
            console.error(`❌ deleteAllRecords error:`, err.message);
            throw new Error(`Delete all records failed: ${err.message}`);
        }
    }

    // Upload method - Supports S3/R2 Storage
    async upload(file, path) {
        try {
            // Check required S3 environment variables first, then fallback to settings
            let s3Endpoint = process.env.S3_ENDPOINT;
            let s3AccessKey = process.env.S3_ACCESS_KEY;
            let s3SecretKey = process.env.S3_SECRET_KEY;
            let s3Bucket = process.env.S3_BUCKET;
            let s3PublicUrl = process.env.S3_PUBLIC_URL;
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
                        s3PublicUrl = s3PublicUrl || s3Settings.publicUrl;
                        s3Region = s3Region || s3Settings.region || 'auto';
                    }
                } catch (error) {
                    console.error('Failed to load S3 settings from database:', error);
                }
            }

            if (!s3Endpoint || !s3AccessKey || !s3SecretKey || !s3Bucket) {
                throw new Error(
                    'S3 upload requires S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, and S3_BUCKET to be configured in environment variables or database settings.'
                );
            }

            // Ensure path doesn't start with slash
            const cleanPath = path.startsWith('/') ? path.slice(1) : path;

            // Extract the buffer from the file object
            let fileData;
            if (file.buffer) {
                fileData = file.buffer;
            } else if (Buffer.isBuffer(file)) {
                fileData = file;
            } else if (file.stream) {
                // Convert stream to buffer
                const chunks = [];
                for await (const chunk of file.stream) {
                    chunks.push(chunk);
                }
                fileData = Buffer.concat(chunks);
            } else {
                fileData = file;
            }

            // Initialize S3 client
            const s3Client = new S3Client({
                endpoint: s3Endpoint,
                region: s3Region,
                credentials: {
                    accessKeyId: s3AccessKey,
                    secretAccessKey: s3SecretKey
                }
            });

            // Determine content type
            const contentType = file.mimetype || file.type || 'application/octet-stream';
            const originalName = file.originalname || file.filename || cleanPath;

            // Upload to S3/R2
            const command = new PutObjectCommand({
                Bucket: s3Bucket,
                Key: cleanPath,
                Body: fileData,
                ContentType: contentType,
                ContentDisposition: `attachment; filename="${originalName}"`,
                Metadata: {
                    originalName: originalName
                }
            });

            const response = await s3Client.send(command);

            // Construct public URL
            const publicUrl = s3PublicUrl 
                ? `${s3PublicUrl}/${cleanPath}` 
                : `${s3Endpoint}/${s3Bucket}/${cleanPath}`;

            // Calculate file size
            const fileSize = Buffer.isBuffer(fileData) 
                ? fileData.length 
                : file.size || 0;

            // Ensure URL has proper protocol
            let finalUrl = publicUrl;
            if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
                finalUrl = `https://${finalUrl.replace(/^\/+/, '')}`;
            }

            // Store file metadata
            const fileMetadata = {
                originalPath: finalUrl,
                s3Key: cleanPath,
                fileName: cleanPath,
                size: fileSize,
                uploadedAt: new Date().toISOString(),
                contentType: contentType,
                originalName: originalName,
                provider: 's3',
                etag: response.ETag
            };

            return {
                url: finalUrl,
                publicUrl: finalUrl,
                path: cleanPath,
                size: fileSize,
                metadata: fileMetadata
            };
        } catch (error) {
            console.error('S3 error in upload file(s):', error);
            throw error;
        }
    }

    // Delete file method - Supports S3/R2 Storage
    async deleteFile(filePath) {

        try {
            // Check required S3 environment variables first, then fallback to settings
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
                // Extract path from S3 URL
                // Format: https://endpoint/bucket/path/to/file or https://public-url/path/to/file
                const url = new URL(filePath);
                cleanPath = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
                // Remove bucket name if it's in the path
                if (cleanPath.startsWith(`${s3Bucket}/`)) {
                    cleanPath = cleanPath.replace(`${s3Bucket}/`, '');
                }
            } else {
                // Ensure path doesn't start with slash
                cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
            }

            // Initialize S3 client
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
            console.error('S3 error in delete file(s):', error);
            throw error;
        }
    }

    // Disconnect and close all connections in the pool
    async disconnect() {
        if (this.pool) {
            try {
                await this.pool.end();
                this.pool = null;
                this.connected = false;
                this.initialized = false;
                this.sslRetried = false;
                this.connectionPromise = null;
                console.log('✅ Postgres pool disconnected');
            } catch (error) {
                console.error('❌ Error disconnecting Postgres pool:', error.message);
                throw error;
            }
        }
    }
}

export default new PostgresDBService();
