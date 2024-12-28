const cors = require('cors');

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Check if origin is from our extension
        if (origin.startsWith('chrome-extension://')) {
            const extensionId = origin.split('//')[1];
            if (validExtensionIds.includes(extensionId)) {
                return callback(null, true);
            }
        }
        
        callback(new Error('Not allowed by CORS'));
    },
    methods: ['POST'],
    allowedHeaders: ['Content-Type', 'X-API-Key', 'X-Extension-ID']
})); 