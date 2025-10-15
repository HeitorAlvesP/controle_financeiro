document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('register-form');
    const verifyForm = document.getElementById('verify-form');
    const messageElement = document.getElementById('message-area');
    const passwordInput = document.getElementById('senha');
    const confirmPasswordInput = document.getElementById('confirmar_senha');
    const step1Div = document.getElementById('step-1');
    const step2Div = document.getElementById('step-2');
    const codeInput = document.getElementById('verification_code');
    const emailInputStep2 = document.getElementById('email_step2');

    // Variável para armazenar o email temporariamente
    let currentRegistrationEmail = '';

    // Função para exibir o modal
    const showModal = (message) => {
        const modal = document.getElementById('error-modal');
        const modalMessage = document.getElementById('modal-message');
        modalMessage.innerHTML = message;
        modal.classList.remove('hidden');
        document.getElementById('modal-close-button').onclick = () => {
            modal.classList.add('hidden');
        };
    };

    // Função para validação de senha
    const validatePassword = (password, confirmPassword) => {
        const errors = [];
        if (password.length < 6) {
            errors.push('<li>A senha deve ter pelo menos 6 caracteres.</li>');
        }
        if (!/[A-Z]/.test(password)) {
            errors.push('<li>A senha deve conter pelo menos 1 letra maiúscula.</li>');
        }
        if (!/[a-z]/.test(password)) {
            errors.push('<li>A senha deve conter pelo menos 1 letra minúscula.</li>');
        }
        if (!/[0-9]/.test(password)) {
            errors.push('<li>A senha deve conter pelo menos 1 número.</li>');
        }
        if (password !== confirmPassword) {
            errors.push('<li>A senha e a confirmação de senha não são iguais.</li>');
        }
        return errors;
    };

    // Função genérica para POST na API
    const postData = async (url, data) => {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            // Se a resposta não for um JSON válido, mas sim um HTML (erro de rota), isso será capturado
            const textResponse = await response.text();
            
            // Tenta parsear como JSON. Se falhar, é HTML (o erro que estávamos vendo)
            let json;
            try {
                json = JSON.parse(textResponse);
            } catch (e) {
                console.error("Erro de Parsing JSON: Resposta recebida não é JSON.", textResponse);
                messageElement.textContent = 'Erro de servidor: Resposta inválida. Verifique se o servidor está rodando corretamente na porta 3000.';
                messageElement.className = 'mt-4 text-center text-sm font-semibold text-red-600';
                return null;
            }

            if (!response.ok) {
                // Se o status HTTP for de erro (4xx, 5xx), exibe a mensagem do backend
                messageElement.textContent = json.message || 'Ocorreu um erro no servidor.';
                messageElement.className = 'mt-4 text-center text-sm font-semibold text-red-600';
                return null;
            }

            return json;

        } catch (error) {
            console.error('Erro na requisição:', error);
            messageElement.textContent = 'Erro de conexão com o servidor.';
            messageElement.className = 'mt-4 text-center text-sm font-semibold text-red-600';
            return null;
        }
    };

    // --- PASSO 1: Enviar Código ---
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Limpa mensagens anteriores
        messageElement.textContent = '';
        messageElement.className = '';

        const nome = document.getElementById('nome').value;
        const email = document.getElementById('email').value;
        const dt_nascimento = document.getElementById('dt_nascimento').value;
        const senha = passwordInput.value;
        const confirmar_senha = confirmPasswordInput.value;

        // 1. Validação de Senha no Frontend
        const validationErrors = validatePassword(senha, confirmar_senha);
        if (validationErrors.length > 0) {
            showModal(`
                <p class="font-bold text-lg mb-2 text-red-600">Requisitos de Senha Não Atendidos:</p>
                <ul class="list-disc list-inside text-sm text-gray-700">
                    ${validationErrors.join('')}
                </ul>
            `);
            return;
        }

        // 2. Requisição para Enviar o Código
        const userData = { nome, email, senha, dt_nascimento };
        const result = await postData('/users/send-code', userData);

        if (result) {
            // Sucesso: Transiciona para o Passo 2
            currentRegistrationEmail = email;
            emailInputStep2.textContent = email;
            
            messageElement.textContent = result.message;
            messageElement.className = 'mt-4 text-center text-sm font-semibold text-green-600';
            
            step1Div.classList.add('hidden');
            step2Div.classList.remove('hidden');
            codeInput.focus();
        }
    });

    // --- PASSO 2: Verificar Código e Finalizar Registro ---
    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Limpa mensagens anteriores
        messageElement.textContent = '';
        messageElement.className = '';
        
        const code = codeInput.value;

        if (code.length !== 6) {
            messageElement.textContent = 'O código de verificação deve ter 6 dígitos.';
            messageElement.className = 'mt-4 text-center text-sm font-semibold text-red-600';
            return;
        }

        const verifyData = { email: currentRegistrationEmail, code };
        const result = await postData('/users/verify-register', verifyData);

        if (result) {
            // Sucesso no Cadastro
            messageElement.textContent = result.message + ' Redirecionando para o login...';
            messageElement.className = 'mt-4 text-center text-sm font-semibold text-green-600';
            
            // Redireciona para a tela de login
            setTimeout(() => {
                window.location.href = '/html/login.html';
            }, 3000);
        } else {
            // Limpa o campo de código e permite que o usuário tente novamente
            codeInput.value = '';
        }
    });
});
