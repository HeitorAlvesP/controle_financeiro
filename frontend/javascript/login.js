document.addEventListener('DOMContentLoaded', () => {
    // URL base da API
    const BASE_URL = ''; 
    
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('log-email');
    const passwordInput = document.getElementById('log-senha');

    // Checagem de segurança
    if (!loginForm || !emailInput || !passwordInput) {
        console.error("ERRO CRÍTICO NO DOM: Um ou mais elementos do formulário de login não foram encontrados.");
        return;
    }
    
    // Se o usuário JÁ estiver logado (e a sessão válida), redireciona direto
    if (sessionStorage.getItem('user')) {
        window.location.href = '/html/dashboard.html';
        return; 
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value;
        const senha = passwordInput.value;

        try {
            // Exibe o modal de carregamento
            Swal.fire({
                title: 'Aguarde...',
                text: 'Verificando credenciais.',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            const response = await fetch(`${BASE_URL}/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });

            const textResponse = await response.text();
            Swal.close(); 
            
            let json;
            try {
                json = JSON.parse(textResponse);
            } catch (e) {
                Swal.fire({
                    icon: 'error',
                    title: 'Erro de Servidor',
                    text: 'Resposta inválida do servidor.'
                });
                console.error("Erro de Parsing JSON. Resposta do servidor:", textResponse);
                return;
            }

            if (response.ok) {
                // EXTREMAMENTE IMPORTANTE: Salvar o objeto user completo e garantir que ele tenha um 'id'.
                // O objeto json.user já vem com todos os campos (id, nome, cpf, etc.)
                sessionStorage.setItem('user', JSON.stringify(json.user));

                // Login bem-sucedido
                Swal.fire({
                    icon: 'success',
                    title: 'Login bem-sucedido!',
                    text: `Bem-vindo(a), ${json.user.nome}. Redirecionando...`,
                    showConfirmButton: false,
                    timer: 1000
                }).then(() => {
                    // Redireciona para o dashboard
                    window.location.href = '/html/dashboard.html'; 
                });
            } else {
                // Erro de credenciais (401 Unauthorized) ou outro erro de API
                Swal.fire({
                    icon: 'error',
                    title: 'Falha no Login',
                    text: json.message || 'Email e/ou Senha incorretos. Tente novamente.'
                });
                passwordInput.value = '';
            }

        } catch (error) {
            Swal.close();
            console.error('Erro na requisição (Rede ou Servidor):', error);
            Swal.fire({
                icon: 'error',
                title: 'Erro de Conexão',
                text: 'Não foi possível conectar ao servidor. Verifique se a API está ativa.'
            });
        }
    });
});