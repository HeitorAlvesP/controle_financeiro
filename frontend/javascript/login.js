const BASE_URL = 'http://localhost:3000/users'; 

async function postData(url, data, messageElement) {
    messageElement.textContent = 'Carregando...';
    messageElement.className = 'mt-4 text-center text-sm text-blue-500';
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
            const welcomeMessage = `Login realizado com sucesso! Bem-vindo(a) ${result.user.nome}!`;
            messageElement.textContent = welcomeMessage;
            messageElement.className = 'mt-4 text-center text-sm font-semibold text-green-600';
            console.log('Login bem-sucedido. Usuário logado:', result.user);
            return result;
        } else {
            messageElement.textContent = `Erro: ${result.message || 'Email ou senha inválidos.'}`;
            messageElement.className = 'mt-4 text-center text-sm font-semibold text-red-600';
            return null;
        }

    } catch (error) {
        console.error('Erro na requisição:', error);
        messageElement.textContent = 'Erro de conexão com o servidor. Verifique se o Node está rodando na porta 3000.';
        messageElement.className = 'mt-4 text-center text-sm font-semibold text-red-600';
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginMessage = document.getElementById('loginMessage');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('log-email').value;
            const senha = document.getElementById('log-senha').value;

            const data = { email, senha };

            // Chama a rota POST /users/login
            await postData(`${BASE_URL}/login`, data, loginMessage);
        });
    }
});
