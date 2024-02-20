# Automate environment setup

[![Setup Envhub](https://github.com/tsirysndr/setup-envhub/actions/workflows/setup.yml/badge.svg)](https://github.com/tsirysndr/setup-envhub/actions/workflows/setup.yml)
[![GitHub marketplace](https://img.shields.io/badge/marketplace-setup--envhub-blue?logo=github&style)](https://github.com/marketplace/actions/setup-envhub)

Download, install, and setup [Envhub](https://github.com/tsirysndr/envhub) in GitHub Actions.

## 🚀 Usage

```yaml
- name: Setup Envhub
  uses: tsirysndr/setup-envhub@v1
  with:
    version: v0.2.11
    dotfiles: github:tsirysndr/dotfiles-example
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```
