// fetch já está disponível no Node.js moderno

async function createAdmin() {
  try {
    const response = await globalThis.fetch('http://localhost:3003/api/create-admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Admin',
        emailLocal: 'admin',
        password: 'admin'
      }),
    });

    const data = await response.json();
    console.log('Resposta:', data);
  } catch (error) {
    console.error('Erro:', error);
  }
}

createAdmin();