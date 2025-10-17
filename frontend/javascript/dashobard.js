document.addEventListener('DOMContentLoaded', () => {
    const BASE_URL = ''; 
    const loggedUser = JSON.parse(sessionStorage.getItem('user'));
    
    // --- Elementos do DOM ---
    
    // Navegação
    const navLinks = document.querySelectorAll('#main-nav-links .menu-link-item');
    const contentDivs = document.querySelectorAll('.content-div');
    
    // Exibição de Dados e Ações
    const userNameDisplay = document.getElementById('userNameDisplay');
    const displayEmail = document.getElementById('displayEmail');
    const displayCpf = document.getElementById('displayCpf');
    const displayDtNascimento = document.getElementById('displayDtNascimento');
    const logoutButton = document.getElementById('logoutButton');

    // Formulários
    const updateNameForm = document.getElementById('updateNameForm');
    const updatePasswordForm = document.getElementById('updatePasswordForm');
    const requestEmailChangeForm = document.getElementById('requestEmailChangeForm');
    const verifyEmailChangeForm = document.getElementById('verifyEmailChangeForm');

    // Variáveis de estado do email
    const emailStep1 = document.getElementById('email-step-1');
    const emailStep2 = document.getElementById('email-step-2');
    const newEmailInput = document.getElementById('newEmail');
    const pendingNewEmailSpan = document.getElementById('pendingNewEmail');
    let pendingEmailData = null; // Armazena o novo email temporariamente

    // --- Checagem de Autenticação ---
    if (!loggedUser || !loggedUser.id) {
        window.location.href = '/html/login.html';
        return;
    }

    // --- Funções de Navegação ---

    const switchContent = (targetId) => {
        // Oculta todas as divs de conteúdo
        contentDivs.forEach(div => {
            div.classList.add('hidden');
        });
        // Ativa a div de conteúdo alvo
        const targetDiv = document.getElementById(targetId);
        if (targetDiv) {
            targetDiv.classList.remove('hidden');
        }

        // Atualiza a classe 'active' nos links de navegação
        navLinks.forEach(link => {
            link.classList.remove('link-active', 'text-white', 'bg-indigo-600');
            link.classList.add('text-gray-700');

            if (link.getAttribute('data-target') === targetId) {
                link.classList.add('link-active', 'text-white', 'bg-indigo-600');
                link.classList.remove('text-gray-700');
            }
        });
    };

    // Adiciona event listener para a navegação
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetId = link.getAttribute('data-target');
            switchContent(targetId);
        });
    });


    // --- Funções de Utility (Com Swal) ---

    const postData = async (path, method, data) => {
        // Inclui o userId no corpo da requisição
        const body = data ? JSON.stringify({ userId: loggedUser.id, ...data }) : JSON.stringify({ userId: loggedUser.id });
        
        try {
            Swal.fire({
                title: 'Processando...',
                text: 'Aguarde um momento.',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            const response = await fetch(`${BASE_URL}${path}`, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: body
            });

            const textResponse = await response.text();
            Swal.close(); 
            
            let json;
            try {
                json = JSON.parse(textResponse);
            } catch (e) {
                console.error("Erro de Parsing JSON. Resposta do servidor:", textResponse);
                Swal.fire({ icon: 'error', title: 'Erro de Servidor', text: 'Resposta inválida.' });
                return null;
            }

            if (!response.ok) {
                Swal.fire({ icon: 'error', title: 'Falha na Operação', text: json.message || 'Ocorreu um erro desconhecido.' });
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

    // Função para atualizar a exibição dos dados na tela
    const renderUserProfile = (user) => {
        if (!user) return;
        
        // Formatação do CPF (máscara)
        const formattedCpf = user.cpf ? user.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : 'N/A';
        // Formatação da Data de Nascimento
        const formattedDtNasc = user.dt_nascimento ? new Date(user.dt_nascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A';

        userNameDisplay.textContent = user.nome || 'Usuário';
        displayEmail.textContent = user.email || 'N/A';
        displayCpf.textContent = formattedCpf;
        displayDtNascimento.textContent = formattedDtNasc;
        
        // Preenche o campo de novo nome para conveniência
        document.getElementById('newName').value = user.nome || '';
    };

    // --- Ações de Carregamento e Logout ---

    // Carregar dados do perfil inicial
    renderUserProfile(loggedUser);

    // Logout
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

    // --- 1. Alterar Nome ---
    updateNameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('newName').value;
        
        // Rota: /users/management/name (backend a ser criado)
        const result = await postData('/users/management/name', 'PUT', { newName });
        
        if (result) {
            Swal.fire({ icon: 'success', title: 'Sucesso!', text: result.message });
            
            // Atualiza a sessão e a tela
            loggedUser.nome = newName;
            sessionStorage.setItem('user', JSON.stringify(loggedUser));
            renderUserProfile(loggedUser);
        }
    });

    // --- 2. Alterar Senha ---
    updatePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;

        if (newPassword.length < 6 || newPassword !== confirmNewPassword) {
            Swal.fire({ icon: 'warning', title: 'Erro na Senha', text: 'A nova senha deve ter no mínimo 6 caracteres e coincidir com a confirmação.' });
            return;
        }

        // Rota: /users/management/password (backend a ser criado)
        const result = await postData('/users/management/password', 'PUT', { currentPassword, newPassword });
        
        if (result) {
            Swal.fire({ icon: 'success', title: 'Sucesso!', text: result.message });
            updatePasswordForm.reset();
        }
    });

    // --- 3. Alterar E-mail: Passo 1 (Requisitar Código) ---
    requestEmailChangeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newEmail = newEmailInput.value;
        
        // Rota: /users/management/email/request-code (backend a ser criado)
        const result = await postData('/users/management/email/request-code', 'POST', { newEmail });

        if (result) {
            pendingEmailData = { newEmail: newEmail }; // Armazena o email pendente
            pendingNewEmailSpan.textContent = newEmail;
            
            // Transiciona para o Passo 2
            emailStep1.classList.add('hidden');
            emailStep2.classList.remove('hidden');
            
            Swal.fire({ icon: 'info', title: 'Código Enviado', text: result.message });
        }
    });

    // --- 3. Alterar E-mail: Passo 2 (Verificar Código e Finalizar) ---
    verifyEmailChangeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('emailCode').value;
        
        if (!pendingEmailData) {
            Swal.fire({ icon: 'error', title: 'Erro de Processo', text: 'Processo de alteração de email não iniciado.' });
            return;
        }

        // Rota: /users/management/email/verify-change (backend a ser criado)
        const result = await postData('/users/management/email/verify-change', 'PUT', { 
            newEmail: pendingEmailData.newEmail, 
            code 
        });

        if (result) {
            Swal.fire({ icon: 'success', title: 'E-mail Alterado!', text: result.message });
            
            // Atualiza a sessão e a tela
            loggedUser.email = pendingEmailData.newEmail;
            sessionStorage.setItem('user', JSON.stringify(loggedUser));
            renderUserProfile(loggedUser);

            // Volta para o Passo 1 e limpa
            emailStep2.classList.add('hidden');
            emailStep1.classList.remove('hidden');
            requestEmailChangeForm.reset();
        }
    });
});