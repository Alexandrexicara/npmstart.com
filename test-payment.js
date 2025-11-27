const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testPayment() {
  try {
    // Primeiro, vamos registrar um usuário de teste
    const registerResponse = await fetch('http://localhost:3003/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Usuário Teste',
        emailLocal: 'teste123',
        password: 'senha123'
      })
    });
    
    const registerData = await registerResponse.json();
    console.log('Registro:', registerData);
    
    // Fazer login
    const loginResponse = await fetch('http://localhost:3003/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        emailLocal: 'teste123',
        password: 'senha123'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('Login:', loginData);
    
    if (!loginData.token) {
      console.error('Falha no login');
      return;
    }
    
    const token = loginData.token;
    
    // Criar um app de teste
    const appResponse = await fetch('http://localhost:3003/api/apps', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'App de Teste',
        description: 'App para testar pagamento',
        price: 20.00,
        platform: 'android'
      })
    });
    
    const appData = await appResponse.json();
    console.log('App criado:', appData);
    
    if (!appData.id) {
      console.error('Falha ao criar app');
      return;
    }
    
    // Tentar fazer o pagamento
    const paymentResponse = await fetch(`http://localhost:3003/api/pay/${appData.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const paymentData = await paymentResponse.json();
    console.log('Pagamento:', paymentData);
    
    if (paymentData.ok) {
      console.log('Pagamento criado com sucesso!');
      console.log('URL de pagamento:', paymentData.paymentUrl);
    } else {
      console.error('Erro no pagamento:', paymentData.error);
    }
  } catch (error) {
    console.error('Erro durante o teste:', error);
  }
}

testPayment();