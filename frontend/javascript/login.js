document.addEventListener('DOMContentLoaded', () => {
    // Se estiver executando localmente, use http://localhost:3000
    const BASE_URL = 'http://localhost:3000/users'; 

    // --- Função de Utility para Requisições ---
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
                // Se o resultado for login, adiciona a data/hora do login
                const welcomeMessage = result.user.ultimo_login 
                    ? `Login realizado com sucesso! Bem-vindo(a) ${result.user.nome}!`
                    : `Sucesso no Registro! Bem-vindo(a) ${result.user.nome}!`;

                messageElement.textContent = welcomeMessage;
                messageElement.className = 'mt-4 text-center text-sm font-semibold text-green-600';
                return result;
            } else {
                messageElement.textContent = `Erro: ${result.message || 'Ocorreu um erro na requisição.'}`;
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

    // --- Lógica de Registro ---
    const registerForm = document.getElementById('registerForm');
    const registerMessage = document.getElementById('registerMessage');

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
            loadUsers();
        }
    });

    // --- Lógica de Login ---
    const loginForm = document.getElementById('loginForm');
    const loginMessage = document.getElementById('loginMessage');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('log-email').value;
        const senha = document.getElementById('log-senha').value;

        const data = { email, senha };

        const result = await postData(`${BASE_URL}/login`, data, loginMessage);
        if (result) {
            // Login bem-sucedido: aqui você prosseguiria para a tela principal
            console.log('Login bem-sucedido. Usuário logado:', result.user);
        }
    });

    // --- Lógica de Carregamento de Usuários (Teste) ---
    const loadUsersBtn = document.getElementById('loadUsersBtn');
    const usersList = document.getElementById('usersList');

    async function loadUsers() {
        usersList.innerHTML = '<p class="text-gray-500">Carregando...</p>';
        try {
            const response = await fetch(BASE_URL);
            const users = await response.json();

            usersList.innerHTML = '';
            
            if (users.length === 0) {
                usersList.innerHTML = '<p class="text-gray-500">Nenhum usuário registrado ainda.</p>';
                return;
            }

            users.forEach(user => {
                const div = document.createElement('div');
                div.className = 'bg-gray-50 p-3 rounded-lg border border-gray-200';
                div.innerHTML = `
                    <p class="font-semibold text-gray-800">${user.nome} (${user.email})</p>
                    <p class="text-xs text-gray-600">ID: ${user.id} | Login: ${user.ultimo_login ? new Date(user.ultimo_login).toLocaleString() : 'Nunca'}</p>
                `;
                usersList.appendChild(div);
            });

        } catch (error) {
            usersList.innerHTML = '<p class="text-red-500">Erro ao carregar a lista de usuários.</p>';
            console.error('Erro ao carregar usuários:', error);
        }
    }

    loadUsersBtn.addEventListener('click', loadUsers);
    loadUsers(); // Carrega lista ao iniciar
});
