# Pyxis Protocol: Guia de Build e Deploy Estável

Este documento descreve o processo robusto para compilar e implantar o Pyxis Protocol, evitando conflitos de dependências (como o erro `edition2024`) e incompatibilidades de compilador.

## 🏗 Ambiente de Build Isolado

Para garantir a estabilidade, utilizamos sempre o container Docker `backpackapp/build:v0.30.1`.

### 1. Iniciar o Container de Build
Mantenha um container rodando para executar os comandos de estabilização de dependências:

```bash
docker run -d --name pyxis-builder -v $(pwd):/workdir -w /workdir backpackapp/build:v0.30.1 tail -f /dev/null
```

### 2. Estabilizar Dependências (Crucial)
Devido a mudanças globais no ecossistema Rust/Solana, certas dependências devem ser fixadas manualmente para evitar a necessidade do Rust experimental (`edition2024`):

```bash
# Purga os conflitos do toml_edit e wit-bindgen
docker exec pyxis-builder cargo update -p cc --precise 1.0.98
docker exec pyxis-builder cargo update -p jobserver --precise 0.1.32
docker exec pyxis-builder cargo update -p proc-macro-crate@3.4.0 --precise 3.1.0

# Purga os conflitos do borsh (requer Rust 1.77+)
docker exec pyxis-builder cargo update -p borsh@1.6.0 --precise 1.5.1

# Ajusta o indexmap para compatibilidade com o compilador 1.75.0
docker exec pyxis-builder cargo update -p indexmap@2.13.0 --precise 2.5.0

# Fixa o blake3 e constant_time_eq
docker exec pyxis-builder cargo update -p blake3 --precise 1.5.0
docker exec pyxis-builder cargo update -p constant_time_eq --precise 0.3.0
```

### 3. Compilar o Programa
```bash
docker exec pyxis-builder anchor build
```

## 🚀 Deployment na Devnet

### 1. Verificar Autoridade e Saldo
Certifique-se de que a carteira `target/deploy/authority.json` tenha saldo (mínimo ~3.5 SOL para um deploy do zero).

```bash
docker exec pyxis-builder solana balance --keypair target/deploy/authority.json --url devnet
```

### 2. Executar Upgrade/Deploy
Sempre use a flag `--arch sbfv1` (ou deixe como default se o compilador for estável) para garantir compatibilidade com a rede atual.

```bash
docker exec pyxis-builder solana program deploy \
    target/deploy/pyxis.so \
    --program-id EC62edGAHGf6tNA7MnKpJ3Bebu8XAwMmuQvN94N62i8Q \
    --keypair target/deploy/authority.json \
    --url devnet
```

## ⚠️ Solução de Problemas Comuns

- **Erro `edition2024`**: Ocorreu porque o Cargo tentou baixar uma versão muito nova de uma biblioteca base. Repita os passos da seção "Estabilizar Dependências".
- **Erro `DeclaredProgramIdMismatch`**: Verifique se o ID em `Anchor.toml` e `programs/pyxis/src/lib.rs` é exatamente o mesmo que o carregado na rede.
- **Erro de SBPF Version**: Garanta que o build foi feito dentro do container `backpackapp/build:v0.30.1`, que gera binários compatíveis.

---
*Este guia foi gerado pelo Antigravity em 03/02/2026 após o deploy bem-sucedido do Pyxis Protocol.*
