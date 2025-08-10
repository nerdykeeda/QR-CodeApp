const axios = require('axios');

async function testLogin() {
    try {
        console.log('🧪 Testing User Registration...');
        
        // Test registration
        const registerResponse = await axios.post('http://localhost:3002/api/auth/register', {
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
            password: 'password123',
            enable2FA: false
        });
        
        console.log('✅ Registration successful:', registerResponse.data);
        
        console.log('\n🧪 Testing User Login...');
        
        // Test login
        const loginResponse = await axios.post('http://localhost:3002/api/auth/login', {
            email: 'test@example.com',
            password: 'password123'
        });
        
        console.log('✅ Login successful:', loginResponse.data);
        
        // Test health endpoint to see user count
        const healthResponse = await axios.get('http://localhost:3002/health');
        console.log('\n📊 Health check:', healthResponse.data);
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testLogin();
