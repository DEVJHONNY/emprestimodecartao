// Utilidades de LocalStorage
function salvarLocal() {
    localStorage.setItem('emprestimos', JSON.stringify(listaEmprestimos));
}
function carregarLocal() {
    const dados = localStorage.getItem('emprestimos');
    return dados ? JSON.parse(dados) : [];
}

let listaEmprestimos = carregarLocal();
let indiceEditando = null;

function validarData(data) {
    // Aceita apenas formato ISO (YYYY-MM-DD)
    return /^\d{4}-\d{2}-\d{2}$/.test(data) && !isNaN(Date.parse(data));
}
function dataParaDate(data) {
    // data no formato YYYY-MM-DD
    const [ano, mes, dia] = data.split('-').map(Number);
    return new Date(ano, mes - 1, dia);
}
function formatarDataBR(data) {
    // de YYYY-MM-DD para DD/MM/AAAA
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return data;
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
}
function validarNome(nome) {
    return /^[A-Za-zÀ-ÿ\s]{3,}$/.test(nome);
}

function atualizarLista() {
    const listaDiv = document.getElementById('listaEmprestimos');
    let filtro = document.getElementById('filtroNome').value.trim().toLowerCase();
    let ordenar = document.getElementById('ordenarPor').value;
    let lista = listaEmprestimos.slice();

    // Filtro
    if (filtro) {
        lista = lista.filter(e => e.nome.toLowerCase().includes(filtro));
    }
    // Ordenação
    if (ordenar === "nome") {
        lista.sort((a, b) => a.nome.localeCompare(b.nome));
    } else {
        lista.sort((a, b) => dataParaDate(a.data_saida) - dataParaDate(b.data_saida));
    }

    if (lista.length === 0) {
        listaDiv.innerHTML = "<p>Nenhum empréstimo registrado ainda.</p>";
        return;
    }
    listaDiv.innerHTML = lista.map((e, i) => {
        // Status visual
        let status = e.status || "Pendente";
        let statusClass = status === "Devolvido" ? "btn-status" : "btn-status pendente";
        let hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        let devolucao = dataParaDate(e.data_devolucao);
        let alerta = "";
        if (status !== "Devolvido") {
            if (devolucao < hoje) {
                alerta = `<span class="alerta">Atrasado!</span>`;
            } else if ((devolucao - hoje) / (1000 * 60 * 60 * 24) <= 2) {
                alerta = `<span class="alerta">Devolução próxima</span>`;
            }
        }
        return `
        <div class="emprestimo">
            <b>Empréstimo ${i + 1}</b><br>
            <b>Nome:</b> ${e.nome}<br>
            <b>Data de saída do cartão:</b> ${formatarDataBR(e.data_saida)}<br>
            <b>Data de devolução do cartão:</b> ${formatarDataBR(e.data_devolucao)} ${alerta}<br>
            <b>Limite usado:</b> <span class="limite">R$ ${parseFloat(e.limite_usado).toFixed(2)}</span><br>
            <b>Status:</b> <span>${status}</span><br>
            <b>Observações:</b> ${e.observacoes ? e.observacoes : "-"}
            <div class="botoes-emprestimo">
                <button class="btn-editar" onclick="editarEmprestimo(${i})">Editar</button>
                <button class="btn-remover" onclick="removerEmprestimo(${i})">Remover</button>
                <button class="${statusClass}" onclick="alternarStatus(${i})">${status === "Devolvido" ? "Marcar como Pendente" : "Marcar como Devolvido"}</button>
            </div>
        </div>
        `;
    }).join('');
    atualizarGrafico();
}

function mostrarMensagem(msg, tipo) {
    const div = document.getElementById('mensagem');
    div.textContent = msg;
    div.className = tipo;
    setTimeout(() => { div.textContent = ""; div.className = ""; }, 2500);
}

// Validação interativa dos campos
if (document.getElementById('nome')) {
    document.getElementById('nome').addEventListener('input', function () {
        if (!validarNome(this.value.trim())) {
            this.style.borderColor = "#c0392b";
        } else {
            this.style.borderColor = "#4b86b4";
        }
    });
}
// Removido: Validação que impede data de saída retroativa
// if (document.getElementById('data_saida')) {
//     document.getElementById('data_saida').addEventListener('blur', function () {
//         const valor = this.value.trim();
//         if (!validarData(valor)) {
//             this.style.borderColor = "#c0392b";
//             mostrarMensagem("Data de saída inválida!", "erro");
//         } else {
//             const hoje = new Date();
//             hoje.setHours(0, 0, 0, 0);
//             const data = dataParaDate(valor);
//             if (data < hoje) {
//                 this.style.borderColor = "#c0392b";
//                 mostrarMensagem("Data de saída não pode ser anterior a hoje.", "erro");
//             } else {
//                 this.style.borderColor = "#4b86b4";
//             }
//         }
//     });
// }
if (document.getElementById('data_saida')) {
    document.getElementById('data_saida').addEventListener('blur', function () {
        const valor = this.value.trim();
        if (!validarData(valor)) {
            this.style.borderColor = "#c0392b";
            mostrarMensagem("Data de saída inválida!", "erro");
        } else {
            this.style.borderColor = "#4b86b4";
        }
    });
}
if (document.getElementById('data_devolucao')) {
    document.getElementById('data_devolucao').addEventListener('blur', function () {
        const valor = this.value.trim();
        const data_saida = document.getElementById('data_saida').value.trim();
        if (!validarData(valor)) {
            this.style.borderColor = "#c0392b";
            mostrarMensagem("Data de devolução inválida!", "erro");
        } else if (validarData(data_saida)) {
            const d1 = dataParaDate(data_saida);
            const d2 = dataParaDate(valor);
            if (d2 < d1) {
                this.style.borderColor = "#c0392b";
                mostrarMensagem("Data de devolução não pode ser anterior à data de saída.", "erro");
            } else {
                this.style.borderColor = "#4b86b4";
            }
        } else {
            this.style.borderColor = "#4b86b4";
        }
    });
}
if (document.getElementById('limite_usado')) {
    document.getElementById('limite_usado').addEventListener('input', function () {
        if (parseFloat(this.value) <= 0 || isNaN(parseFloat(this.value))) {
            this.style.borderColor = "#c0392b";
        } else {
            this.style.borderColor = "#4b86b4";
        }
    });
}

// Busca/filtro e ordenação
if (document.getElementById('filtroNome')) {
    document.getElementById('filtroNome').addEventListener('input', atualizarLista);
}
if (document.getElementById('ordenarPor')) {
    document.getElementById('ordenarPor').addEventListener('change', atualizarLista);
}

// Tema claro/escuro
const temaBtn = document.getElementById('temaBtn');
temaBtn.onclick = function () {
    document.body.classList.toggle('dark');
    temaBtn.textContent = document.body.classList.contains('dark') ? "☀️ Tema claro" : "🌙 Tema escuro";
};

// Função para escapar HTML
function escapeHTML(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Exportar XLS (Excel)
document.getElementById('exportarXLS').onclick = function () {
    if (listaEmprestimos.length === 0) {
        mostrarMensagem(textos[idiomaAtual].nadaExportar, "erro");
        return;
    }
    let xls = `<table border="1"><tr>
        <th>Nome</th>
        <th>Data Saída</th>
        <th>Data Devolução</th>
        <th>Limite Usado</th>
        <th>Status</th>
        <th>Observações</th>
    </tr>`;
    listaEmprestimos.forEach(e => {
        xls += `<tr>
            <td>${escapeHTML(e.nome)}</td>
            <td>${escapeHTML(formatarDataBR(e.data_saida))}</td>
            <td>${escapeHTML(formatarDataBR(e.data_devolucao))}</td>
            <td>${parseFloat(e.limite_usado).toFixed(2)}</td>
            <td>${escapeHTML(e.status || "Pendente")}</td>
            <td>${escapeHTML(e.observacoes ? e.observacoes : "")}</td>
        </tr>`;
    });
    xls += `</table>`;
    // Adiciona BOM para UTF-8
    const blob = new Blob(
        ['\ufeff' + xls],
        { type: "application/vnd.ms-excel;charset=utf-8;" }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "emprestimos.xls";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Exportar PDF
document.getElementById('exportarPDF').onclick = function () {
    if (listaEmprestimos.length === 0) {
        mostrarMensagem(textos[idiomaAtual].nadaExportar, "erro");
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(textos[idiomaAtual].lista, 10, 10);
    let y = 20;
    listaEmprestimos.forEach((e, i) => {
        doc.text(`${i + 1}. ${e.nome} | ${e.data_saida} - ${e.data_devolucao} | R$ ${parseFloat(e.limite_usado).toFixed(2)} | ${e.status || "Pendente"}`, 10, y);
        if (e.observacoes) doc.text(`Obs: ${e.observacoes}`, 10, y + 6);
        y += e.observacoes ? 16 : 10;
        if (y > 270) { doc.addPage(); y = 10; }
    });
    doc.save("emprestimos.pdf");
};

// Ajuda interativa
document.getElementById('ajuda').onclick = function () {
    const modal = document.getElementById('ajudaModal');
    modal.style.display = "flex";
    modal.focus();
};
document.getElementById('ajudaModal').addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        this.style.display = 'none';
    }
});

// Gráfico de uso do limite
function atualizarGrafico() {
    const ctxId = "graficoCanvas";
    let graficoDiv = document.getElementById('grafico');
    graficoDiv.innerHTML = `<canvas id="${ctxId}" width="400" height="180" aria-label="Gráfico de uso do limite"></canvas>`;
    let total = listaEmprestimos.reduce((s, e) => s + parseFloat(e.limite_usado), 0);
    let devolvido = listaEmprestimos.filter(e => e.status === "Devolvido").reduce((s, e) => s + parseFloat(e.limite_usado), 0);
    let pendente = total - devolvido;
    new Chart(document.getElementById(ctxId), {
        type: 'doughnut',
        data: {
            labels: [idiomaAtual === "pt" ? "Devolvido" : "Returned", idiomaAtual === "pt" ? "Pendente" : "Pending"],
            datasets: [{
                data: [devolvido, pendente],
                backgroundColor: ['#27ae60', '#c0392b']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { position: 'bottom' } }
        }
    });
}

// Histórico de alterações (simples, local)
let historico = [];
function registrarHistorico(acao, emprestimo) {
    historico.push({ data: new Date().toLocaleString(), acao, emprestimo });
    if (historico.length > 50) historico.shift();
}
// Exibir histórico (opcional: botão ou console)
window.mostrarHistorico = function () {
    alert(historico.map(h => `[${h.data}] ${h.acao}: ${JSON.stringify(h.emprestimo)}`).join('\n\n'));
};

// Internacionalização (pt/en)
const textos = {
    pt: {
        registrar: "Registrar",
        limpar: "Limpar Lista",
        exportarCSV: "Exportar CSV",
        exportarXLS: "Exportar XLS",
        exportarPDF: "Exportar PDF",
        backup: "Backup JSON",
        restaurar: "Restaurar JSON",
        imprimir: "Imprimir",
        ajuda: "Ajuda",
        buscar: "Buscar por nome...",
        ordenarData: "Ordenar por Data de Saída",
        ordenarNome: "Ordenar por Nome",
        lista: "Lista de Empréstimos",
        sucesso: "Empréstimo registrado com sucesso!",
        removido: "Removido com sucesso!",
        editado: "Edite e salve para atualizar o empréstimo.",
        limpo: "Lista limpa com sucesso!",
        restaurado: "Backup restaurado!",
        backupFeito: "Backup salvo!",
        nadaExportar: "Nada para exportar.",
        listaVazia: "Nenhum empréstimo registrado ainda.",
        erroNome: "Nome inválido. Use apenas letras e mínimo 3 caracteres.",
        erroSaida: "Data de saída inválida!",
        erroSaidaHoje: "Data de saída não pode ser anterior a hoje.",
        erroDevolucao: "Data de devolução inválida!",
        erroDevolucaoAntes: "Data de devolução não pode ser anterior à data de saída.",
        erroLimite: "Limite deve ser maior que zero.",
        erroListaVazia: "A lista já está vazia.",
        confirmLimpar: "Tem certeza que deseja limpar toda a lista de empréstimos?",
        confirmRemover: "Remover este empréstimo?",
        atrasado: "Atrasado!",
        devolucaoProxima: "Devolução próxima"
    },
    en: {
        registrar: "Register",
        limpar: "Clear List",
        exportarCSV: "Export CSV",
        exportarXLS: "Export XLS",
        exportarPDF: "Export PDF",
        backup: "Backup JSON",
        restaurar: "Restore JSON",
        imprimir: "Print",
        ajuda: "Help",
        buscar: "Search by name...",
        ordenarData: "Sort by Start Date",
        ordenarNome: "Sort by Name",
        lista: "Loans List",
        sucesso: "Loan registered successfully!",
        removido: "Removed successfully!",
        editado: "Edit and save to update the loan.",
        limpo: "List cleared successfully!",
        restaurado: "Backup restored!",
        backupFeito: "Backup saved!",
        nadaExportar: "Nothing to export.",
        listaVazia: "No loans registered yet.",
        erroNome: "Invalid name. Use only letters and at least 3 characters.",
        erroSaida: "Invalid start date!",
        erroSaidaHoje: "Start date cannot be before today.",
        erroDevolucao: "Invalid return date!",
        erroDevolucaoAntes: "Return date cannot be before start date.",
        erroLimite: "Limit must be greater than zero.",
        erroListaVazia: "The list is already empty.",
        confirmLimpar: "Are you sure you want to clear the entire loan list?",
        confirmRemover: "Remove this loan?",
        atrasado: "Overdue!",
        devolucaoProxima: "Return soon"
    }
};
let idiomaAtual = "pt";
function traduzir() {
    document.querySelector('button[type="submit"]').textContent = textos[idiomaAtual].registrar;
    document.getElementById('limparLista').textContent = textos[idiomaAtual].limpar;
    document.getElementById('exportarXLS').textContent = textos[idiomaAtual].exportarXLS;
    document.getElementById('exportarPDF').textContent = textos[idiomaAtual].exportarPDF;
    document.getElementById('backupJSON').textContent = textos[idiomaAtual].backup;
    document.getElementById('restaurarJSON').textContent = textos[idiomaAtual].restaurar;
    document.getElementById('ajuda').textContent = textos[idiomaAtual].ajuda;
    document.getElementById('filtroNome').placeholder = textos[idiomaAtual].buscar;
    document.getElementById('ordenarPor').options[0].text = textos[idiomaAtual].ordenarData;
    document.getElementById('ordenarPor').options[1].text = textos[idiomaAtual].ordenarNome;
    document.getElementById('listaTitulo').textContent = textos[idiomaAtual].lista;
}
if (document.getElementById('idioma')) {
    document.getElementById('idioma').onchange = function () {
        idiomaAtual = this.value;
        traduzir();
        atualizarLista();
    };
}
traduzir();

if (document.getElementById('formEmprestimo')) {
    document.getElementById('formEmprestimo').onsubmit = function (event) {
        event.preventDefault();
        const nome = document.getElementById('nome').value.trim();
        const data_saida = document.getElementById('data_saida').value.trim();
        const data_devolucao = document.getElementById('data_devolucao').value.trim();
        const limite_usado = parseFloat(document.getElementById('limite_usado').value);
        const observacoes = document.getElementById('observacoes').value.trim();

        if (!validarNome(nome)) {
            mostrarMensagem(textos[idiomaAtual].erroNome, "erro");
            document.getElementById('nome').focus();
            return;
        }
        if (!validarData(data_saida)) {
            mostrarMensagem(textos[idiomaAtual].erroSaida, "erro");
            document.getElementById('data_saida').focus();
            return;
        }
        // REMOVIDO: Restrição de data de saída não poder ser retroativa
        if (!validarData(data_devolucao)) {
            mostrarMensagem(textos[idiomaAtual].erroDevolucao, "erro");
            document.getElementById('data_devolucao').focus();
            return;
        }
        const dataSaidaDate = dataParaDate(data_saida);
        const dataDevolucaoDate = dataParaDate(data_devolucao);
        if (dataDevolucaoDate < dataSaidaDate) {
            mostrarMensagem(textos[idiomaAtual].erroDevolucaoAntes, "erro");
            document.getElementById('data_devolucao').focus();
            return;
        }
        if (isNaN(limite_usado) || limite_usado <= 0) {
            mostrarMensagem(textos[idiomaAtual].erroLimite, "erro");
            document.getElementById('limite_usado').focus();
            return;
        }
        if (indiceEditando !== null) {
            listaEmprestimos[indiceEditando] = { nome, data_saida, data_devolucao, limite_usado, observacoes, status: listaEmprestimos[indiceEditando].status || "Pendente" };
            registrarHistorico("Editado", listaEmprestimos[indiceEditando]);
            indiceEditando = null;
        } else {
            listaEmprestimos.push({ nome, data_saida, data_devolucao, limite_usado, observacoes, status: "Pendente" });
            registrarHistorico("Adicionado", { nome, data_saida, data_devolucao, limite_usado, observacoes, status: "Pendente" });
        }
        salvarLocal();
        atualizarLista();
        this.reset();
        document.getElementById('nome').style.borderColor = "#b0b0b0";
        document.getElementById('data_saida').style.borderColor = "#b0b0b0";
        document.getElementById('data_devolucao').style.borderColor = "#b0b0b0";
        document.getElementById('limite_usado').style.borderColor = "#b0b0b0";
        mostrarMensagem(textos[idiomaAtual].sucesso, "sucesso");
    };
}

if (document.getElementById('limparLista')) {
    document.getElementById('limparLista').onclick = function () {
        if (listaEmprestimos.length === 0) {
            mostrarMensagem(textos[idiomaAtual].erroListaVazia, "erro");
            return;
        }
        if (confirm(textos[idiomaAtual].confirmLimpar)) {
            listaEmprestimos.length = 0;
            salvarLocal();
            atualizarLista();
            mostrarMensagem(textos[idiomaAtual].limpo, "sucesso");
        }
    };
}

// Editar empréstimo
window.editarEmprestimo = function (idx) {
    const e = listaEmprestimos[idx];
    document.getElementById('nome').value = e.nome;
    document.getElementById('data_saida').value = e.data_saida;
    document.getElementById('data_devolucao').value = e.data_devolucao;
    document.getElementById('limite_usado').value = e.limite_usado;
    document.getElementById('observacoes').value = e.observacoes || "";
    indiceEditando = idx;
    mostrarMensagem(textos[idiomaAtual].editado, "sucesso");
};

// Remover empréstimo
window.removerEmprestimo = function (idx) {
    if (confirm(textos[idiomaAtual].confirmRemover)) {
        registrarHistorico("Removido", listaEmprestimos[idx]);
        listaEmprestimos.splice(idx, 1);
        salvarLocal();
        atualizarLista();
        mostrarMensagem(textos[idiomaAtual].removido, "sucesso");
    }
};

// Alternar status devolvido/pendente
window.alternarStatus = function (idx) {
    let e = listaEmprestimos[idx];
    e.status = (e.status === "Devolvido") ? "Pendente" : "Devolvido";
    registrarHistorico("Status alterado", e);
    salvarLocal();
    atualizarLista();
};

// Backup JSON
document.getElementById('backupJSON').onclick = function () {
    if (listaEmprestimos.length === 0) {
        mostrarMensagem(textos[idiomaAtual].erroListaVazia, "erro");
        return;
    }
    const blob = new Blob([JSON.stringify(listaEmprestimos, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "emprestimos-backup.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    mostrarMensagem(textos[idiomaAtual].backupFeito, "sucesso");
};

// Input oculto para restaurar
const inputRestaurar = document.createElement('input');
inputRestaurar.type = 'file';
inputRestaurar.accept = 'application/json';
inputRestaurar.style.display = 'none';
document.body.appendChild(inputRestaurar);

document.getElementById('restaurarJSON').onclick = function () {
    inputRestaurar.click();
};
inputRestaurar.onchange = function (e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (evt) {
        try {
            const dados = JSON.parse(evt.target.result);
            if (Array.isArray(dados)) {
                listaEmprestimos = dados;
                salvarLocal();
                atualizarLista();
                mostrarMensagem(textos[idiomaAtual].restaurado, "sucesso");
            } else {
                mostrarMensagem("Arquivo inválido!", "erro");
            }
        } catch {
            mostrarMensagem("Arquivo inválido!", "erro");
        }
    };
    reader.readAsText(file);
    inputRestaurar.value = "";
};

// Inicialização
document.addEventListener('DOMContentLoaded', function () {
    atualizarLista();
    atualizarGrafico();
}); 