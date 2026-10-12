import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// Funções de validação de regras de negócio
interface ValidacaoTransferenciaInput {
  patrimonioStatus: 'ativo' | 'desativado' | 'arquivado';
  empresaOrigemId: string;
  setorOrigemId: string | null;
  empresaDestinoId: string;
  setorDestinoId: string | null;
  usuarioRole: 'ADMINISTRADOR' | 'OPERADOR' | 'VISUALIZADOR';
  empresasPermitidasUsuario: string[];
}

function validarTransferencia(input: ValidacaoTransferenciaInput): { valida: boolean; erro?: string } {
  // 1. Patrimônio ativo
  if (input.patrimonioStatus !== 'ativo') {
    return { valida: false, erro: 'Patrimônio desativado ou arquivado não pode ser transferido' };
  }

  // 2. Perfil de usuário
  if (input.usuarioRole === 'VISUALIZADOR') {
    return { valida: false, erro: 'Usuários com perfil VISUALIZADOR não possuem permissão para transferir bens' };
  }

  // 3. Acesso à empresa de origem
  if (!input.empresasPermitidasUsuario.includes(input.empresaOrigemId)) {
    return { valida: false, erro: 'Usuário não possui acesso autorizado à empresa de origem' };
  }

  // 4. Acesso à empresa de destino
  if (!input.empresasPermitidasUsuario.includes(input.empresaDestinoId)) {
    return { valida: false, erro: 'Usuário não possui acesso autorizado à empresa de destino' };
  }

  // 5. Destino igual à origem
  const mesmaEmpresa = input.empresaOrigemId === input.empresaDestinoId;
  const mesmoSetor = input.setorOrigemId === input.setorDestinoId;
  if (mesmaEmpresa && mesmoSetor) {
    return { valida: false, erro: 'O setor ou empresa de destino deve ser diferente da localização atual' };
  }

  return { valida: true };
}

function validarCadastroPatrimonio(dados: {
  codigo?: string;
  nome?: string;
  empresa_id?: string;
  categoria_id?: string;
}): { valida: boolean; erro?: string } {
  if (!dados.codigo || !dados.codigo.trim()) {
    return { valida: false, erro: 'Código patrimonial é obrigatório' };
  }
  if (!dados.nome || !dados.nome.trim()) {
    return { valida: false, erro: 'Nome do patrimônio é obrigatório' };
  }
  if (!dados.empresa_id) {
    return { valida: false, erro: 'Empresa inicial é obrigatória' };
  }
  if (!dados.categoria_id) {
    return { valida: false, erro: 'Categoria do patrimônio é obrigatória' };
  }
  return { valida: true };
}

function gerarCsvInventario(itens: Array<{ codigo: string; nome: string; empresa: string }>): string {
  let csv = '\uFEFFCODIGO;NOME;EMPRESA\r\n';
  for (const item of itens) {
    const nomeEscapado = `"${item.nome.replace(/"/g, '""')}"`;
    csv += `${item.codigo};${nomeEscapado};${item.empresa}\r\n`;
  }
  return csv;
}

describe('Regras de Negócio - Cadastro e Validação de Patrimônio', () => {
  test('Deve aprovar cadastro de patrimônio com todos os campos obrigatórios', () => {
    const res = validarCadastroPatrimonio({
      codigo: 'PAT-001',
      nome: 'Notebook Dell Latitude 5420',
      empresa_id: 'emp-1',
      categoria_id: 'cat-1',
    });
    assert.equal(res.valida, true);
    assert.equal(res.erro, undefined);
  });

  test('Deve rejeitar cadastro com código em branco', () => {
    const res = validarCadastroPatrimonio({
      codigo: '   ',
      nome: 'Notebook Dell',
      empresa_id: 'emp-1',
      categoria_id: 'cat-1',
    });
    assert.equal(res.valida, false);
    assert.match(res.erro!, /Código patrimonial é obrigatório/);
  });

  test('Deve rejeitar cadastro sem empresa vinculada', () => {
    const res = validarCadastroPatrimonio({
      codigo: 'PAT-002',
      nome: 'Mesa Escritório',
      categoria_id: 'cat-2',
    });
    assert.equal(res.valida, false);
    assert.match(res.erro!, /Empresa inicial é obrigatória/);
  });
});

describe('Regras de Negócio - Transferências e Controle de Acesso Multiempresa', () => {
  test('Deve permitir transferência válida entre setores da mesma empresa para OPERADOR autorizado', () => {
    const res = validarTransferencia({
      patrimonioStatus: 'ativo',
      empresaOrigemId: 'coopercar',
      setorOrigemId: 'ti',
      empresaDestinoId: 'coopercar',
      setorDestinoId: 'financeiro',
      usuarioRole: 'OPERADOR',
      empresasPermitidasUsuario: ['coopercar'],
    });
    assert.equal(res.valida, true);
  });

  test('Deve permitir transferência entre empresas distintas para ADMINISTRADOR', () => {
    const res = validarTransferencia({
      patrimonioStatus: 'ativo',
      empresaOrigemId: 'coopercar',
      setorOrigemId: 'ti',
      empresaDestinoId: 'cooperauto',
      setorDestinoId: 'oficina',
      usuarioRole: 'ADMINISTRADOR',
      empresasPermitidasUsuario: ['coopercar', 'cooperauto', 'coopercar_store'],
    });
    assert.equal(res.valida, true);
  });

  test('Deve rejeitar transferência quando perfil for VISUALIZADOR', () => {
    const res = validarTransferencia({
      patrimonioStatus: 'ativo',
      empresaOrigemId: 'coopercar',
      setorOrigemId: 'ti',
      empresaDestinoId: 'cooperauto',
      setorDestinoId: 'oficina',
      usuarioRole: 'VISUALIZADOR',
      empresasPermitidasUsuario: ['coopercar', 'cooperauto'],
    });
    assert.equal(res.valida, false);
    assert.match(res.erro!, /VISUALIZADOR não possuem permissão/);
  });

  test('Deve rejeitar transferência de patrimônio desativado', () => {
    const res = validarTransferencia({
      patrimonioStatus: 'desativado',
      empresaOrigemId: 'coopercar',
      setorOrigemId: 'ti',
      empresaDestinoId: 'coopercar',
      setorDestinoId: 'almoxarifado',
      usuarioRole: 'OPERADOR',
      empresasPermitidasUsuario: ['coopercar'],
    });
    assert.equal(res.valida, false);
    assert.match(res.erro!, /Patrimônio desativado ou arquivado/);
  });

  test('Deve rejeitar transferência para outra empresa se o usuário não possuir acesso a ela', () => {
    const res = validarTransferencia({
      patrimonioStatus: 'ativo',
      empresaOrigemId: 'coopercar',
      setorOrigemId: 'ti',
      empresaDestinoId: 'cooperauto',
      setorDestinoId: 'oficina',
      usuarioRole: 'OPERADOR',
      empresasPermitidasUsuario: ['coopercar'], // Apenas Coopercar, sem Cooperauto!
    });
    assert.equal(res.valida, false);
    assert.match(res.erro!, /não possui acesso autorizado à empresa de destino/);
  });

  test('Deve rejeitar transferência para exatamente o mesmo setor e empresa', () => {
    const res = validarTransferencia({
      patrimonioStatus: 'ativo',
      empresaOrigemId: 'coopercar',
      setorOrigemId: 'ti',
      empresaDestinoId: 'coopercar',
      setorDestinoId: 'ti',
      usuarioRole: 'ADMINISTRADOR',
      empresasPermitidasUsuario: ['coopercar'],
    });
    assert.equal(res.valida, false);
    assert.match(res.erro!, /setor ou empresa de destino deve ser diferente/);
  });
});

describe('Relatórios e Exportação CSV', () => {
  test('Deve formatar CSV com delimitador correto e escape de aspas', () => {
    const dados = [
      { codigo: 'PAT-001', nome: 'Monitor 24" Dell', empresa: 'Coopercar' },
      { codigo: 'PAT-002', nome: 'Teclado Mecânico; USB', empresa: 'Cooperauto' },
    ];
    const csv = gerarCsvInventario(dados);

    assert.ok(csv.startsWith('\uFEFFCODIGO;NOME;EMPRESA\r\n'));
    assert.ok(csv.includes('PAT-001;"Monitor 24"" Dell";Coopercar'));
    assert.ok(csv.includes('PAT-002;"Teclado Mecânico; USB";Cooperauto'));
  });
});
