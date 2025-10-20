document.addEventListener('DOMContentLoaded', () => {
    const BASE_URL = ''; 
    
    const checkAuthAndGetUser = () => {
        const userJson = sessionStorage.getItem('user');
        if (!userJson) { return null; }
        try {
            const user = JSON.parse(userJson);
            if (user && user.id && user.nome) { return user; }
            return null;
        } catch (e) {
            console.error("Erro ao fazer parse do JSON do usuário:", e);
            return null;
        }
    };

    const loggedUser = checkAuthAndGetUser();
    
    if (!loggedUser) {
        sessionStorage.removeItem('user');
        window.location.href = '/html/login.html';
        return;
    }
    
    // --- Elementos de Senha ---
    const currentPasswordInput = document.getElementById('currentPassword');
    const newPasswordInput = document.getElementById('newPassword');
    const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
    const updatePasswordButton = document.getElementById('updatePasswordButton');
    const newPasswordFieldset = document.getElementById('new-password-fields');

    // --- Elementos do Dashboard ---
    const navLinks = document.querySelectorAll('#main-nav-links .menu-link-item');
    const contentDivs = document.querySelectorAll('.content-div');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const displayEmail = document.getElementById('displayEmail');
    const displayCpf = document.getElementById('displayCpf');
    const displayDtNascimento = document.getElementById('displayDtNascimento');
    const logoutButton = document.getElementById('logoutButton');
    const updateNameForm = document.getElementById('updateNameForm');
    const updatePasswordForm = document.getElementById('updatePasswordForm');
    const requestEmailChangeForm = document.getElementById('requestEmailChangeForm');
    const verifyEmailChangeForm = document.getElementById('verifyEmailChangeForm');
    const emailStep1 = document.getElementById('email-step-1');
    const emailStep2 = document.getElementById('email-step-2');
    const newEmailInput = document.getElementById('newEmail');
    const pendingNewEmailSpan = document.getElementById('pendingNewEmail');
    let pendingEmailData = null; 

    // --- SETUP INICIAL DE SEGURANÇA ---
    if (newPasswordInput) newPasswordInput.disabled = true;
    if (confirmNewPasswordInput) confirmNewPasswordInput.disabled = true;
    if (updatePasswordButton) updatePasswordButton.disabled = true;

    // --- NOVO: Função de Validação de Senha ---
    const validateNewPasswordRules = (password) => {
        const errors = [];
        if (password.length < 6) errors.push('<li>A senha deve ter pelo menos 6 caracteres.</li>');
        if (!/[A-Z]/.test(password)) errors.push('<li>A senha deve conter pelo menos 1 letra maiúscula.</li>');
        if (!/[a-z]/.test(password)) errors.push('<li>A senha deve conter pelo menos 1 letra minúscula.</li>');
        if (!/[0-9]/.test(password)) errors.push('<li>A senha deve conter pelo menos 1 número.</li>');
        return errors;
    };
    
    // --- Funções de Navegação e PostData (Mantidas) ---
    const switchContent = (targetId) => {
        contentDivs.forEach(div => { div.classList.add('hidden'); });
        const targetDiv = document.getElementById(targetId);
        if (targetDiv) { targetDiv.classList.remove('hidden'); }

        navLinks.forEach(link => {
            link.classList.remove('link-active', 'text-white', 'bg-indigo-600', 'text-gray-700');
            link.classList.add('text-gray-700');
            if (link.getAttribute('data-target') === targetId) {
                link.classList.add('link-active', 'text-white', 'bg-indigo-600');
                link.classList.remove('text-gray-700');
            }
        });
    };

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetId = link.getAttribute('data-target');
            switchContent(targetId);
        });
    });

    const postData = async (path, method, data) => {
        const body = data ? JSON.stringify({ userId: loggedUser.id, ...data }) : JSON.stringify({ userId: loggedUser.id });
        
        try {
            const isValidation = path.includes('/password/validate');
            if (!isValidation) {
                Swal.fire({
                    title: 'Processando...',
                    text: 'Aguarde um momento.',
                    allowOutsideClick: false,
                    didOpen: () => { Swal.showLoading(); }
                });
            }

            const response = await fetch(`${BASE_URL}${path}`, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: body
            });

            const textResponse = await response.text();
            if (!isValidation) Swal.close(); 
            
            let json;
            try {
                json = JSON.parse(textResponse);
            } catch (e) {
                console.error("Erro de Parsing JSON. Resposta do servidor:", textResponse);
                if (!isValidation) Swal.fire({ icon: 'error', title: 'Erro de Servidor', text: 'Resposta inválida.' });
                return null;
            }

            if (!response.ok) {
                if (response.status !== 401) { 
                    Swal.fire({ icon: 'error', title: 'Falha na Operação', text: json.message || 'Ocorreu um erro desconhecido.' });
                }
                return null;
            }

            return json;

        } catch (error) {
            Swal.close();
            console.error('Erro de Rede:', error);
            Swal.fire({ icon: 'error', title: 'Erro de Conexão', text: 'Não foi possível conectar ao servidor.' });
            return null;
        }
    };


    const renderUserProfile = (user) => {
        if (!user) return;
        
        const formattedCpf = user.cpf ? user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : 'N/A';
        const formattedDtNasc = user.dt_nascimento ? new Date(user.dt_nascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A';

        userNameDisplay.textContent = user.nome || 'Usuário';
        displayEmail.textContent = user.email || 'N/A';
        displayCpf.textContent = formattedCpf;
        displayDtNascimento.textContent = formattedDtNasc;
        
        document.getElementById('newName').value = user.nome || '';
    };

    renderUserProfile(loggedUser);
    
    // --- LÓGICA DE VALIDAÇÃO DE SENHA ATUAL (NOVA IMPLEMENTAÇÃO) ---

    const toggleNewPasswordFields = (enable) => {
        newPasswordInput.disabled = !enable;
        confirmNewPasswordInput.disabled = !enable;
        updatePasswordButton.disabled = !enable;

        if (!enable) {
            newPasswordInput.value = '';
            confirmNewPasswordInput.value = '';
        }

        if (enable) {
            newPasswordFieldset.classList.remove('opacity-50');
            currentPasswordInput.classList.remove('border-red-500');
            currentPasswordInput.classList.add('border-green-500');
        } else {
            newPasswordFieldset.classList.add('opacity-50');
            currentPasswordInput.classList.remove('border-green-500');
        }
    };
    
    currentPasswordInput.addEventListener('keyup', async (e) => {
        const password = e.target.value;
        if (password.length >= 6) {
            const result = await postData('/users/management/password/validate', 'POST', { currentPassword: password });
            
            if (result) {
                toggleNewPasswordFields(true);
                newPasswordInput.focus();
            } else {
                toggleNewPasswordFields(false);
            }
        } else {
            toggleNewPasswordFields(false);
        }
    });


    // --- 2. Alterar Senha (APLICANDO REGRAS) ---
    updatePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = currentPasswordInput.value;
        const newPassword = newPasswordInput.value;
        const confirmNewPassword = confirmNewPasswordInput.value;

        // 1. Validação de Regras de Segurança
        const validationErrors = validateNewPasswordRules(newPassword);

        if (validationErrors.length > 0) {
            Swal.fire({
                icon: 'warning',
                title: 'Nova Senha Inválida',
                html: `
                    <p class="font-bold text-lg mb-2 text-red-600">A nova senha deve atender aos seguintes critérios:</p>
                    <ul class="list-disc list-inside text-sm text-gray-700 text-left mx-auto max-w-xs">
                        ${validationErrors.join('')}
                    </ul>
                `
            });
            return;
        }

        // 2. Validação de Confirmação
        if (newPassword !== confirmNewPassword) {
            Swal.fire({ icon: 'warning', title: 'Senhas Diferentes', text: 'A nova senha e a confirmação de senha não coincidem.' });
            return;
        }
        
        // 3. Verifica se a senha nova é igual à atual
        if (newPassword === currentPassword) {
             Swal.fire({ icon: 'warning', title: 'Senhas Iguais', text: 'A nova senha não pode ser igual à senha atual.' });
            return;
        }


        const result = await postData('/users/management/password', 'PUT', { currentPassword, newPassword });
        
        if (result) {
            Swal.fire({ icon: 'success', title: 'Sucesso!', text: result.message });
            
            updatePasswordForm.reset();
            toggleNewPasswordFields(false);
            currentPasswordInput.classList.remove('border-green-500');
        }
    });

    // --- Outras Funções (MANTIDAS) ---
    // ... (Restante do código: updateNameForm, requestEmailChangeForm, verifyEmailChangeForm, logoutButton)
    
    updateNameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('newName').value;
        
        const result = await postData('/users/management/name', 'PUT', { newName });
        
        if (result) {
            Swal.fire({ icon: 'success', title: 'Sucesso!', text: result.message });
            loggedUser.nome = newName;
            sessionStorage.setItem('user', JSON.stringify(loggedUser));
            renderUserProfile(loggedUser);
        }
    });

    requestEmailChangeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newEmail = newEmailInput.value;
        
        const result = await postData('/users/management/email/request-code', 'POST', { newEmail });

        if (result) {
            pendingEmailData = { newEmail: newEmail };
            pendingNewEmailSpan.textContent = newEmail;
            
            emailStep1.classList.add('hidden');
            emailStep2.classList.remove('hidden');
            
            Swal.fire({ icon: 'info', title: 'Código Enviado', text: result.message });
        }
    });

    verifyEmailChangeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('emailCode').value;
        
        if (!pendingEmailData) {
            Swal.fire({ icon: 'error', title: 'Erro de Processo', text: 'Processo de alteração de email não iniciado.' });
            return;
        }

        const result = await postData('/users/management/email/verify-change', 'PUT', { 
            newEmail: pendingEmailData.newEmail, 
            code 
        });

        if (result) {
            Swal.fire({ icon: 'success', title: 'E-mail Alterado!', text: result.message });
            
            loggedUser.email = pendingEmailData.newEmail;
            sessionStorage.setItem('user', JSON.stringify(loggedUser));
            renderUserProfile(loggedUser);

            emailStep2.classList.add('hidden');
            emailStep1.classList.remove('hidden');
            requestEmailChangeForm.reset();
        }
    });
    
    logoutButton.addEventListener('click', () => {
        sessionStorage.removeItem('user');
        Swal.fire({
            icon: 'info',
            title: 'Sessão Encerrada',
            text: 'Você foi desconectado. Redirecionando...',
            showConfirmButton: false,
            timer: 1500
        }).then(() => {
            window.location.href = '/html/login.html';
        });
    });

});