require('dotenv').config();

async function testSumUpAPI() {
  try {
    console.log('Testing SumUp API integration...');
    console.log('API Key exists:', !!process.env.SUMUP_API_KEY);
    console.log('Merchant Code:', process.env.SUMUP_MERCHANT_CODE);
    
    if (!process.env.SUMUP_API_KEY) {
      console.log('❌ SUMUP_API_KEY not configured in .env file');
      return;
    }
    
    if (!process.env.SUMUP_MERCHANT_CODE) {
      console.log('❌ SUMUP_MERCHANT_CODE not configured in .env file');
      return;
    }
    
    // Test 1: Get merchant info
    console.log('\n--- Test 1: Get Merchant Info ---');
    const merchantResponse = await fetch('https://api.sumup.com/v0.1/me', {
      headers: {
        'Authorization': `Bearer ${process.env.SUMUP_API_KEY}`
      }
    });
    
    const merchantData = await merchantResponse.json();
    console.log('Merchant API Response Status:', merchantResponse.status);
    console.log('Merchant API Response:', JSON.stringify(merchantData, null, 2));
    
    if (merchantResponse.ok) {
      console.log('✅ SumUp API key is valid!');
      console.log('Merchant ID:', merchantData.id);
      console.log('Merchant Name:', merchantData.name);
    } else {
      console.log('❌ SumUp API key is invalid or there was an error:');
      console.log('Status:', merchantResponse.status);
      console.log('Error:', merchantData);
      return;
    }
    
    // Test 2: Create a test checkout
    console.log('\n--- Test 2: Create Test Checkout ---');
    const checkoutData = {
      checkout_reference: 'test_' + Date.now(),
      amount: 1.00,
      currency: 'BRL',
      pay_to_email: 'santossilvac991@gmail.com', // Usar o e-mail correto da conta SumUp
      merchant_reference: 'test_checkout',
      description: 'Test checkout from npm-start',
      return_url: 'http://localhost:3000/payment-return.html',
      callback_url: 'http://localhost:3000/api/webhook/sumup',
      hosted_checkout: { enabled: true } // Habilitar Hosted Checkout
    };
    
    console.log('Sending checkout data:', JSON.stringify(checkoutData, null, 2));
    
    const checkoutResponse = await fetch('https://api.sumup.com/v0.1/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUMUP_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkoutData)
    });
    
    const checkoutDataResponse = await checkoutResponse.json();
    console.log('Checkout API Response Status:', checkoutResponse.status);
    console.log('Checkout API Response:', JSON.stringify(checkoutDataResponse, null, 2));
    
    if (checkoutResponse.ok) {
      console.log('✅ SumUp Checkout created successfully!');
      console.log('Checkout ID:', checkoutDataResponse.id);
      console.log('Hosted Checkout URL:', checkoutDataResponse.hosted_checkout_url);
      
      if (checkoutDataResponse.hosted_checkout_url) {
        console.log('✅ Hosted Checkout está habilitado e a URL está disponível!');
      } else {
        console.log('⚠️  Hosted Checkout URL não está disponível na resposta');
      }
    } else {
      console.log('❌ Failed to create SumUp checkout:');
      console.log('Status:', checkoutResponse.status);
      console.log('Error:', checkoutDataResponse);
    }
  } catch (error) {
    console.error('Error testing SumUp API:', error);
  }
}

testSumUpAPI();