document.addEventListener('DOMContentLoaded', () => {
    // URL base da API 
    const BASE_URL = ''; 
    
    // Elementos do Formulário e Divs
    const registerForm = document.getElementById('register-form');
    const verifyForm = document.getElementById('verify-form');
    const step1Div = document.getElementById('step-1');
    const step2Div = document.getElementById('step-2');
    
    // Inputs
    const nomeInput = document.getElementById('nome');
    const emailInput = document.getElementById('email');
    const cpfInput = document.getElementById('cpf');
    const dateInput = document.getElementById('dt_nascimento');
    const passwordInput = document.getElementById('senha');
    const confirmPasswordInput = document.getElementById('confirmar_senha');
    const codeInput = document.getElementById('verification_code');
    const emailInputStep2 = document.getElementById('email_step2');

    // Variável de estado para o email
    let currentRegistrationEmail = '';

    // Checagem de segurança
    if (!registerForm || !verifyForm || !step1Div || !step2Div || !cpfInput) {
        console.error("ERRO CRÍTICO NO DOM: Um ou mais elementos principais do formulário não foram encontrados.");
        return; 
    }

    // --- Funções de Utility ---

    const validatePassword = (password, confirmPassword) => {
        const errors = [];
        if (password.length < 6) errors.push('<li>A senha deve ter pelo menos 6 caracteres.</li>');
        if (!/[A-Z]/.test(password)) errors.push('<li>A senha deve conter pelo menos 1 letra maiúscula.</li>');
        if (!/[a-z]/.test(password)) errors.push('<li>A senha deve conter pelo menos 1 letra minúscula.</li>');
        if (!/[0-9]/.test(password)) errors.push('<li>A senha deve conter pelo menos 1 número.</li>');
        if (password !== confirmPassword) errors.push('<li>A senha e a confirmação de senha não são iguais.</li>');
        return errors;
    };
    
    const validateCpfFormat = (cpf) => {
        // Verifica se tem exatamente 11 dígitos
        const cleanCpf = cpf.replace(/\D/g, '');
        return cleanCpf.length === 11;
    };

    // Função de máscara de CPF
    const maskCpf = (value) => {
        let cleanValue = value.replace(/\D/g, '');
        if (cleanValue.length > 11) {
            cleanValue = cleanValue.substring(0, 11);
        }

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
            // Exibe modal de carregamento
            Swal.fire({
                title: 'Processando...',
                text: 'Aguarde um momento.',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            const response = await fetch(`${BASE_URL}${path}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const textResponse = await response.text();
            Swal.close(); // Fecha o modal de carregamento

            let json;
            try {
                json = JSON.parse(textResponse);
            } catch (e) {
                console.error("Erro de Parsing JSON. Resposta do servidor:", textResponse);
                Swal.fire({
                    icon: 'error',
                    title: 'Erro Crítico de Servidor',
                    text: 'O servidor retornou uma resposta inválida. Verifique o console.'
                });
                return null;
            }

            if (!response.ok) {
                Swal.fire({
                    icon: 'error',
                    title: 'Falha na Requisição',
                    text: json.message || 'Ocorreu um erro desconhecido no servidor.'
                });
                return null;
            }

            return json;

        } catch (error) {
            Swal.close();
            console.error('Erro de Rede:', error);
            Swal.fire({
                icon: 'error',
                title: 'Erro de Conexão',
                text: 'Não foi possível conectar ao servidor. Verifique sua rede e se a API está ativa.'
            });
            return null;
        }
    };


    // --- PASSO 1: Enviar Código ---
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nome = nomeInput.value;
        const email = emailInput.value;
        const cpfComMascara = cpfInput.value;
        const dt_nascimento = dateInput.value;
        const senha = passwordInput.value;
        const confirmar_senha = confirmPasswordInput.value;

        // Limpa o CPF (remove a máscara)
        const cpf = cpfComMascara.replace(/\D/g, ''); 

        let validationErrors = validatePassword(senha, confirmar_senha);

        // Validação de CPF no Frontend
        if (!validateCpfFormat(cpf)) {
             validationErrors.push('<li>O CPF deve conter exatamente 11 dígitos numéricos.</li>');
        }

        if (validationErrors.length > 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Preenchimento Inválido',
                html: `
                    <p class="font-bold text-lg mb-2 text-red-600">Verifique os seguintes campos:</p>
                    <ul class="list-disc list-inside text-sm text-gray-700 text-left mx-auto max-w-xs">
                        ${validationErrors.join('')}
                    </ul>
                `
            });
            return;
        }

        // 2. Requisição para Enviar o Código
        const userData = { nome, email, senha, dt_nascimento, cpf };
        const result = await postData('/users/send-code', userData);

        if (result) {
            // Sucesso: Transiciona para o Passo 2
            currentRegistrationEmail = email;
            if (emailInputStep2) emailInputStep2.textContent = email;
            
            step1Div.classList.add('hidden');
            step2Div.classList.remove('hidden');
            if (codeInput) codeInput.focus();

            Swal.fire({
                icon: 'info',
                title: 'Código Enviado',
                text: 'Verifique sua caixa de entrada para o código de 6 dígitos.'
            });
        }
        // Se falhar, o postData já exibiu o Swal de erro.
    });

    // --- PASSO 2: Verificar Código e Finalizar Registro ---
    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const code = codeInput.value;

        if (!code || code.length !== 6) {
            Swal.fire({
                icon: 'warning',
                title: 'Código Inválido',
                text: 'O código de verificação deve ter 6 dígitos.'
            });
            return;
        }

        const verifyData = { email: currentRegistrationEmail, code };
        const result = await postData('/users/verify-register', verifyData);

        if (result) {
            // Sucesso no Cadastro
            Swal.fire({
                icon: 'success',
                title: 'Conta Criada!',
                text: result.message + ' Redirecionando para o login...',
                showConfirmButton: false,
                timer: 3000
            }).then(() => {
                window.location.href = '/html/login.html';
            });
        } else {
            if (codeInput) codeInput.value = '';
        }
    });
});