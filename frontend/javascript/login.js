document.addEventListener('DOMContentLoaded', () => {
    // URL base da API (mantido '' pois userRoutes.js usa app.use('/users', ...))
    const BASE_URL = ''; 
    
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('log-email');
    const passwordInput = document.getElementById('log-senha');
    const messageElement = document.getElementById('loginMessage');

    // Checagem de segurança
    if (!loginForm || !emailInput || !passwordInput) {
        console.error("ERRO CRÍTICO NO DOM: Um ou mais elementos do formulário de login não foram encontrados.");
        return;
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value;
        const senha = passwordInput.value;

        // Limpa a mensagem anterior
        messageElement.textContent = '';
        messageElement.className = '';

        try {
            // Exibe o modal de carregamento (Opcional, mas melhora UX)
            Swal.fire({
                title: 'Aguarde...',
                text: 'Verificando credenciais.',
                allowOutsideClick: false,
                didOpen: () => {
                    Swal.showLoading();
                }
            });

            const response = await fetch(`${BASE_URL}/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, senha })
            });

            const textResponse = await response.text();
            
            let json;
            try {
                json = JSON.parse(textResponse);
            } catch (e) {
                // Se a resposta não for JSON (ex: HTML de erro do Express), assume erro de servidor
                Swal.fire({
                    icon: 'error',
                    title: 'Erro de Servidor',
                    text: 'Resposta inválida do servidor. Verifique o console para detalhes.'
                });
                console.error("Erro de Parsing JSON. Resposta do servidor:", textResponse);
                return;
            } finally {
                Swal.close(); // Fecha o modal de carregamento
            }


            if (response.ok) {
                // Login bem-sucedido
                Swal.fire({
                    icon: 'success',
                    title: 'Login bem-sucedido!',
                    text: `Bem-vindo(a), ${json.user.nome}. Redirecionando...`,
                    showConfirmButton: false,
                    timer: 2000
                }).then(() => {
                    // TODO: Redirecionar para a tela principal da aplicação
                    // Por enquanto, apenas loga o sucesso
                    console.log('Dados do Usuário:', json.user);
                    // Exemplo de redirecionamento:
                    window.location.href = '/html/dashboard.html'; 
                });
            } else {
                // Erro de credenciais (401 Unauthorized) ou outro erro de API
                Swal.fire({
                    icon: 'error',
                    title: 'Falha no Login',
                    text: json.message || 'Email e/ou Senha incorretos. Tente novamente.'
                });
                // Limpa a senha para segurança
                passwordInput.value = '';
            }

        } catch (error) {
            Swal.close(); // Fecha o modal de carregamento, se ainda estiver aberto
            console.error('Erro na requisição (Rede ou Servidor):', error);
            Swal.fire({
                icon: 'error',
                title: 'Erro de Conexão',
                text: 'Não foi possível conectar ao servidor. Verifique se a API está ativa.'
            });
        }
    });
});