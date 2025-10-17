document.addEventListener('DOMContentLoaded', () => {
    // URL base da API (mantido /users pois userRoutes.js usa app.use('/users', ...))
    const BASE_URL = ''; 
    
    // Elementos do Formulário e Divs
    const registerForm = document.getElementById('register-form');
    const verifyForm = document.getElementById('verify-form');
    const messageElement = document.getElementById('message-area');
    const step1Div = document.getElementById('step-1');
    const step2Div = document.getElementById('step-2');
    
    // Inputs
    const nomeInput = document.getElementById('nome');
    const emailInput = document.getElementById('email');
    const cpfInput = document.getElementById('cpf'); // Input CPF
    const dateInput = document.getElementById('dt_nascimento');
    const passwordInput = document.getElementById('senha');
    const confirmPasswordInput = document.getElementById('confirmar_senha');
    const codeInput = document.getElementById('verification_code');
    const emailInputStep2 = document.getElementById('email_step2');

    // Modal elements
    const modal = document.getElementById('error-modal');
    const modalCloseButton = document.getElementById('modal-close-button');
    const modalCloseButtonFooter = document.getElementById('modal-close-button-footer');

    // Variável de estado para o email
    let currentRegistrationEmail = '';

    // Checagem de segurança (garante que os elementos existem)
    if (!registerForm || !verifyForm || !step1Div || !step2Div) {
        console.error("ERRO CRÍTICO NO DOM: Um ou mais elementos principais do formulário não foram encontrados.");
        return; 
    }
    if (!cpfInput) {
        console.error("ERRO CRÍTICO NO DOM: Input CPF não encontrado. Verifique se o ID é 'cpf'.");
        return;
    }


    // Adiciona listener nos botões de fechar modal
    if (modalCloseButton) modalCloseButton.addEventListener('click', () => modal.classList.add('hidden'));
    if (modalCloseButtonFooter) modalCloseButtonFooter.addEventListener('click', () => modal.classList.add('hidden'));


    // --- Funções de Utility ---

    const showModal = (message) => {
        const modalMessage = document.getElementById('modal-message');
        if (modal && modalMessage) {
            modalMessage.innerHTML = message;
            modal.classList.remove('hidden');
        }
    };

    const validatePassword = (password, confirmPassword) => {
        const errors = [];
        if (password.length < 6) errors.push('<li>A senha deve ter pelo menos 6 caracteres.</li>');
        if (!/[A-Z]/.test(password)) errors.push('<li>A senha deve conter pelo menos 1 letra maiúscula.</li>');
        if (!/[a-z]/.test(password)) errors.push('<li>A senha deve conter pelo menos 1 letra minúscula.</li>');
        if (!/[0-9]/.test(password)) errors.push('<li>A senha deve conter pelo menos 1 número.</li>');
        if (password !== confirmPassword) errors.push('<li>A senha e a confirmação de senha não são iguais.</li>');
        return errors;
    };
    
    // Validação de formato (limpa a máscara e verifica se tem 11 dígitos)
    const validateCpfFormat = (cpf) => {
        const cleanCpf = cpf.replace(/\D/g, '');
        return cleanCpf.length === 11;
    };

    // Função de máscara de CPF (adiciona pontuações em tempo real)
    const maskCpf = (value) => {
        // 1. Limpa o valor, mantendo apenas dígitos
        let cleanValue = value.replace(/\D/g, '');
        
        // 2. Limita a 11 dígitos para a formatação
        if (cleanValue.length > 11) {
            cleanValue = cleanValue.substring(0, 11);
        }

        // 3. Aplica a máscara: XXX.XXX.XXX-XX
        cleanValue = cleanValue.replace(/(\d{3})(\d)/, '$1.$2');
        cleanValue = cleanValue.replace(/(\d{3})(\d)/, '$1.$2');
        cleanValue = cleanValue.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        
        return cleanValue;
    };

    // Event listener para aplicar a máscara no input do CPF
    cpfInput.addEventListener('input', (e) => {
        e.target.value = maskCpf(e.target.value);
    });

    const postData = async (path, data) => {
        try {
            messageElement.textContent = 'Processando...';
            messageElement.className = 'mt-4 text-center text-sm font-semibold text-blue-500';

            const response = await fetch(`${BASE_URL}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const textResponse = await response.text();
            
            let json;
            try {
                json = JSON.parse(textResponse);
            } catch (e) {
                console.error("Erro de Parsing JSON: Resposta recebida não é JSON. Resposta do servidor:", textResponse);
                messageElement.textContent = 'Erro de servidor: Resposta inválida. Verifique se o servidor está rodando corretamente.';
                messageElement.className = 'mt-4 text-center text-sm font-semibold text-red-600';
                return null;
            }

            if (!response.ok) {
                messageElement.textContent = json.message || 'Ocorreu um erro no servidor.';
                messageElement.className = 'mt-4 text-center text-sm font-semibold text-red-600';
                return null;
            }

            return json;

        } catch (error) {
            console.error('Erro na requisição (Rede ou Servidor):', error);
            messageElement.textContent = 'Erro de conexão com o servidor. Verifique se o servidor está ativo.';
            messageElement.className = 'mt-4 text-center text-sm font-semibold text-red-600';
            return null;
        }
    };


    // --- PASSO 1: Enviar Código ---
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        messageElement.textContent = '';
        messageElement.className = '';

        const nome = nomeInput.value;
        const email = emailInput.value;
        const cpfComMascara = cpfInput.value;
        const dt_nascimento = dateInput.value;
        const senha = passwordInput.value;
        const confirmar_senha = confirmPasswordInput.value;

        // Limpa o CPF para o backend (apenas números)
        const cpf = cpfComMascara.replace(/\D/g, ''); 

        let validationErrors = validatePassword(senha, confirmar_senha);

        // Validação de CPF no Frontend (Formato básico sem máscara)
        if (!validateCpfFormat(cpf)) {
             validationErrors.push('<li>O CPF deve conter exatamente 11 dígitos numéricos.</li>');
        }

        if (validationErrors.length > 0) {
            showModal(`
                <p class="font-bold text-lg mb-2 text-red-600">Verifique os seguintes campos:</p>
                <ul class="list-disc list-inside text-sm text-gray-700">
                    ${validationErrors.join('')}
                </ul>
            `);
            return;
        }

        // 2. Requisição para Enviar o Código
        const userData = { nome, email, senha, dt_nascimento, cpf };
        // Rota: /users/send-code
        const result = await postData('/users/send-code', userData);

        if (result) {
            // Sucesso: Transiciona para o Passo 2
            currentRegistrationEmail = email;
            if (emailInputStep2) emailInputStep2.textContent = email;
            
            step1Div.classList.add('hidden');
            step2Div.classList.remove('hidden');
            if (codeInput) codeInput.focus();
        }
    });

    // --- PASSO 2: Verificar Código e Finalizar Registro ---
    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        messageElement.textContent = '';
        messageElement.className = '';
        
        const code = codeInput.value;

        if (!code || code.length !== 6) {
            messageElement.textContent = 'O código de verificação deve ter 6 dígitos.';
            messageElement.className = 'mt-4 text-center text-sm font-semibold text-red-600';
            return;
        }

        const verifyData = { email: currentRegistrationEmail, code };
        // Rota: /users/verify-register
        const result = await postData('/users/verify-register', verifyData);

        if (result) {
            // Sucesso no Cadastro
            messageElement.textContent = result.message + ' Redirecionando para o login...';
            messageElement.className = 'mt-4 text-center text-sm font-semibold text-green-600';
            
            setTimeout(() => {
                window.location.href = '/html/login.html';
            }, 3000);
        } else {
            if (codeInput) codeInput.value = '';
        }
    });
});