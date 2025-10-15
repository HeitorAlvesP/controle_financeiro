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
            const successMessage = `Sucesso no Registro! Bem-vindo(a) ${result.user.nome}! Redirecionando para o login...`;
            messageElement.textContent = successMessage;
            messageElement.className = 'mt-4 text-center text-sm font-semibold text-green-600';
            
            setTimeout(() => {
                window.location.href = 'login.html'; 
            }, 2000);
            return result;
        } else {
            messageElement.textContent = `Erro: ${result.message || 'Ocorreu um erro no registro.'}`;
            messageElement.className = 'mt-4 text-center text-sm font-semibold text-red-600';
            return null;
        }

    } catch (error) {
        console.error('Erro na requisição:', error);
        messageElement.textContent = 'Erro de conexão com o servidor.';
        messageElement.className = 'mt-4 text-center text-sm font-semibold text-red-600';
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const registerMessage = document.getElementById('registerMessage');

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = document.getElementById('reg-nome').value;
            const email = document.getElementById('reg-email').value;
            const senha = document.getElementById('reg-senha').value;
            const dt_nascimento = document.getElementById('reg-data-nasc').value || null;

            const data = { nome, email, senha, dt_nascimento };

            const result = await postData(`${BASE_URL}/register`, data, registerMessage);
            if (result) {
                registerForm.reset();
            }
        });
    }
});
